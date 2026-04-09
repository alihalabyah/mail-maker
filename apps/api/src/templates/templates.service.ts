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
    const baseSlug = dto.baseSlug ?? dto.slug;
    const locale = dto.locale ?? 'en';
    const slug = locale === 'en' ? baseSlug : `${baseSlug}-${locale}`;
    const domainId = dto.domainId ?? 'clq0proddefault001';

    // Check baseSlug+locale+domainId uniqueness
    const existing = await this.prisma.template.findFirst({
      where: { baseSlug, locale, domainId },
    });
    if (existing)
      throw new ConflictException(
        `A ${locale} version of "${baseSlug}" already exists in this domain`,
      );

    return this.prisma.template.create({
      data: {
        slug,
        baseSlug,
        locale,
        status: 'draft',
        name: dto.name,
        description: dto.description,
        subject: dto.subject,

        designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        htmlTemplate: this.stripComponentPreviews(dto.htmlTemplate),

        variables: (dto.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: userId,
        domainId,
      },
    });
  }

  async findAll(search?: string, page = 1, limit = 20, domainId?: string) {
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(domainId && { domainId }),
    };

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
          domain: { select: { id: true, name: true } },
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
    const refreshedDesignJson = await this.refreshComponentPreviews(
      template.designJson,
    );
    return { ...template, designJson: refreshedDesignJson };
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');

    if (dto.slug) {
      const conflict = await this.prisma.template.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    return this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.designJson && {
          designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.htmlTemplate !== undefined && {
          htmlTemplate: this.stripComponentPreviews(dto.htmlTemplate),
        }),
        ...(dto.variables && {
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

  async duplicate(id: string, userId: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    // Generate a unique baseSlug by appending "-copy"
    let counter = 1;
    let newBaseSlug = `${template.baseSlug}-copy`;
    while (
      await this.prisma.template.findFirst({
        where: { baseSlug: newBaseSlug, locale: template.locale, domainId: template.domainId },
      })
    ) {
      counter++;
      newBaseSlug = `${template.baseSlug}-copy-${counter}`;
    }

    const newSlug = template.locale === 'en' ? newBaseSlug : `${newBaseSlug}-${template.locale}`;

    return this.prisma.template.create({
      data: {
        slug: newSlug,
        baseSlug: newBaseSlug,
        locale: template.locale,
        status: 'draft',
        name: `${template.name} (Copy)`,
        description: template.description,
        subject: template.subject,
        designJson: template.designJson as object,
        htmlTemplate: template.htmlTemplate,
        variables: template.variables as object,
        createdById: userId,
        domainId: template.domainId,
      },
    });
  }

  async copyToDomain(id: string, targetDomainId: string, userId: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { domain: true },
    });

    if (!template) throw new NotFoundException('Template not found');
    if (template.domainId === targetDomainId) {
      throw new ConflictException('Cannot copy to the same domain');
    }

    // Check if template with same baseSlug+locale exists in target domain
    const existing = await this.prisma.template.findFirst({
      where: {
        baseSlug: template.baseSlug,
        locale: template.locale,
        domainId: targetDomainId,
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.template.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          description: template.description,
          subject: template.subject,
          designJson: template.designJson as unknown as Prisma.InputJsonValue,
          htmlTemplate: template.htmlTemplate,
          variables: template.variables as unknown as Prisma.InputJsonValue,
          status: 'draft',
        },
      });
    } else {
      // Create new
      return this.prisma.template.create({
        data: {
          baseSlug: template.baseSlug,
          locale: template.locale,
          slug:
            template.locale === 'en'
              ? template.baseSlug
              : `${template.baseSlug}-${template.locale}`,
          domainId: targetDomainId,
          name: template.name,
          description: template.description,
          subject: template.subject,
          designJson: template.designJson as unknown as Prisma.InputJsonValue,
          htmlTemplate: template.htmlTemplate,
          variables: template.variables as unknown as Prisma.InputJsonValue,
          status: 'draft',
          createdById: userId,
        },
      });
    }
  }

  async publish(id: string, userId: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.$transaction(async (tx) => {
      const lastVersion = await tx.templateVersion.findFirst({
        where: { templateId: id },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (lastVersion?.version ?? 0) + 1;

      const version = await tx.templateVersion.create({
        data: {
          templateId: id,
          version: nextVersion,
          htmlTemplate: template.htmlTemplate,
          designJson: template.designJson as object,
          subject: template.subject,
          variables: template.variables as object,
          publishedById: userId,
        },
      });

      return tx.template.update({
        where: { id },
        data: { currentVersionId: version.id, status: 'published' },
      });
    });
  }

  async listVersions(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        subject: true,
        publishedAt: true,
        publishedBy: { select: { id: true, email: true } },
      },
    });
  }

  async restoreVersion(id: string, versionId: string) {
    const version = await this.prisma.templateVersion.findFirst({
      where: { id: versionId, templateId: id },
    });
    if (!version) throw new NotFoundException('Version not found');

    return this.prisma.template.update({
      where: { id },
      data: {
        htmlTemplate: version.htmlTemplate,
        designJson: version.designJson as object,
        subject: version.subject,
        variables: version.variables as object,
        status: 'draft',
      },
    });
  }

  private stripComponentPreviews(html: string): string {
    return html.replace(
      /<!-- component:([a-z0-9-]+) -->[\s\S]*?<!-- \/component:\1 -->/g,
      (_, slug) => `{{> ${slug}}}`,
    );
  }

  private async refreshComponentPreviews(
    designJson: Prisma.JsonValue,
  ): Promise<Prisma.JsonValue> {
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
        const contents = col.contents as
          | Array<Record<string, unknown>>
          | undefined;
        if (!contents) continue;

        for (const block of contents) {
          if (block.type !== 'html') continue;
          const blockValues = block.values as Record<string, unknown>;
          const html = blockValues?.html as string | undefined;
          if (!html) continue;

          const match = html.match(/<!-- component:([a-z0-9-]+) -->/);
          if (!match) continue;
          const slug = match[1];

          const component = await this.prisma.component.findFirst({
            where: { slug },
          });
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
    await this.componentsService.resolvePartials(
      template.htmlTemplate,
      merged,
      hbs,
    );

    return {
      html: hbs.compile(template.htmlTemplate)(merged),
      subject: hbs.compile(template.subject)(merged),
    };
  }
}
