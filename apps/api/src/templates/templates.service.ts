import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from '../components/components.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateVariable } from '@mail-maker/shared';
import { registerStandardHelpers } from '../render/handlebars-helpers';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private componentsService: ComponentsService,
  ) {}

  async create(dto: CreateTemplateDto, userId: string) {
    const existing = await this.prisma.template.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);

    return this.prisma.template.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        subject: dto.subject,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        htmlTemplate: this.stripComponentPreviews(dto.htmlTemplate),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables: (dto.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: userId,
        baseSlug: dto.slug,
        locale: 'en',
        status: 'draft',
      },
    });
  }

  async findAll(search?: string, page = 1, limit = 20) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          subject: true,
          variables: true,
          baseSlug: true,
          locale: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, email: true } },
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    const refreshedDesignJson = await this.refreshComponentPreviews(template.designJson);
    return { ...template, designJson: refreshedDesignJson };
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');

    if (dto.slug) {
      const conflict = await this.prisma.template.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    return this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.designJson && {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.htmlTemplate !== undefined && { htmlTemplate: this.stripComponentPreviews(dto.htmlTemplate) }),
        ...(dto.variables && {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          variables: dto.variables as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    await this.prisma.template.delete({ where: { id } });
  }

  private stripComponentPreviews(html: string): string {
    return html.replace(
      /<!-- component:([a-z0-9-]+) -->[\s\S]*?<!-- \/component:\1 -->/g,
      (_, slug) => `{{> ${slug}}}`,
    );
  }

  private async refreshComponentPreviews(designJson: Prisma.JsonValue): Promise<Prisma.JsonValue> {
    const design = designJson as Record<string, unknown>;
    const body = design?.body as Record<string, unknown> | undefined;
    const rows = body?.rows as Array<Record<string, unknown>> | undefined;
    if (!rows) return designJson;

    for (const row of rows) {
      const values = row.values as Record<string, unknown> | undefined;
      if (!values?.locked) continue;

      const columns = row.columns as Array<Record<string, unknown>> | undefined;
      if (!columns) continue;

      for (const col of columns) {
        const contents = col.contents as Array<Record<string, unknown>> | undefined;
        if (!contents) continue;

        for (const block of contents) {
          if (block.type !== 'html') continue;
          const blockValues = block.values as Record<string, unknown>;
          const html = blockValues?.html as string | undefined;
          if (!html) continue;

          const match = html.match(/<!-- component:([a-z0-9-]+) -->/);
          if (!match) continue;
          const slug = match[1];

          const component = await this.prisma.component.findUnique({ where: { slug } });
          if (!component) continue;

          // Use only the component's own default variables for the editor preview.
          // Runtime template variables are not available at editor-open time.
          const freshHtml = this.componentsService.renderHtml(component);
          blockValues.html = `<!-- component:${slug} -->${freshHtml}<!-- /component:${slug} -->`;
        }
      }
    }

    return design as Prisma.JsonValue;
  }

  /** JWT-protected preview endpoint: render with variables, no API key needed. */
  async preview(
    template: {
      htmlTemplate: string;
      subject: string;
      variables: Prisma.JsonValue;
    },
    variables: Record<string, unknown>,
  ) {
    const schema = template.variables as unknown as TemplateVariable[];
    const merged = { ...variables };
    for (const v of schema) {
      if (merged[v.name] === undefined && v.defaultValue !== undefined) {
        merged[v.name] = v.defaultValue;
      }
    }

    const hbs = Handlebars.create();
    registerStandardHelpers(hbs);
    await this.componentsService.resolvePartials(template.htmlTemplate, merged, hbs);

    return {
      html: hbs.compile(template.htmlTemplate)(merged),
      subject: hbs.compile(template.subject)(merged),
    };
  }
}
