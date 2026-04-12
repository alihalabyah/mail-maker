import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { TemplateVariable } from '@mail-maker/shared';

@Injectable()
export class ComponentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComponentDto, userId: string) {
    // Match template behavior: if no domain is provided, use default (or first) domain.
    let domainId = dto.domainId;
    if (!domainId) {
      const defaultDomain = await this.prisma.domain.findFirst({
        where: { isDefault: true },
      });
      domainId =
        defaultDomain?.id ??
        (await this.prisma.domain.findFirst({ orderBy: { name: 'asc' } }))?.id;
    }

    const existing = await this.prisma.component.findFirst({
      where: { slug: dto.slug, domainId },
    });
    if (existing)
      throw new ConflictException(`Slug "${dto.slug}" is already in use in this domain`);
    return this.prisma.component.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        htmlTemplate: dto.htmlTemplate,
        variables: (dto.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: userId,
        domainId,
      },
      include: { domain: { select: { id: true, name: true } } },
    });
  }

  async findAll(domainId?: string) {
    return this.prisma.component.findMany({
      where: { ...(domainId && { domainId }) },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        variables: true,
        createdAt: true,
        updatedAt: true,
        domain: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.component.findUnique({
      where: { id },
      include: { domain: { select: { id: true, name: true } } },
    });
    if (!c) throw new NotFoundException('Component not found');
    return c;
  }

  async update(id: string, dto: UpdateComponentDto) {
    await this.findOne(id);
    if (dto.slug) {
      const conflict = await this.prisma.component.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    return this.prisma.component.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.designJson !== undefined && {
          designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.htmlTemplate !== undefined && {
          htmlTemplate: dto.htmlTemplate,
        }),
        ...(dto.variables !== undefined && {
          variables: dto.variables as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async remove(id: string) {
    const component = await this.findOne(id);

    // Check if component is used in any template in the same domain
    const templates = await this.prisma.template.findMany({
      where: { domainId: component.domainId },
      select: { id: true, name: true, htmlTemplate: true },
    });

    for (const template of templates) {
      if (template.htmlTemplate.includes(`{{> ${component.slug}}}`)) {
        throw new ConflictException(
          `Cannot delete component "${component.name}" - it is used in template "${template.name}"`,
        );
      }
    }

    await this.prisma.component.delete({ where: { id } });
  }

  async duplicate(id: string, userId: string) {
    const component = await this.findOne(id);

    // Generate a unique slug by appending "-copy"
    let counter = 1;
    let newSlug = `${component.slug}-copy`;
    while (
      await this.prisma.component.findFirst({
        where: { slug: newSlug, domainId: component.domainId },
      })
    ) {
      counter++;
      newSlug = `${component.slug}-copy-${counter}`;
    }

    return this.prisma.component.create({
      data: {
        slug: newSlug,
        name: `${component.name} (Copy)`,
        description: component.description,
        designJson: component.designJson as object,
        htmlTemplate: component.htmlTemplate,
        variables: component.variables as object,
        createdById: userId,
        domainId: component.domainId,
      },
    });
  }

  async copyToDomain(id: string, targetDomainId: string, userId: string) {
    const component = await this.prisma.component.findUnique({
      where: { id },
      include: { domain: true },
    });

    if (!component) throw new NotFoundException('Component not found');
    if (component.domainId === targetDomainId) {
      throw new ConflictException('Cannot copy to the same domain');
    }

    // Check if component with same slug exists in target domain
    const existing = await this.prisma.component.findFirst({
      where: {
        slug: component.slug,
        domainId: targetDomainId,
      },
    });

    if (existing) {
      // Update existing
      return this.prisma.component.update({
        where: { id: existing.id },
        data: {
          name: component.name,
          description: component.description,
          designJson: component.designJson as unknown as Prisma.InputJsonValue,
          htmlTemplate: component.htmlTemplate,
          variables: component.variables as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Create new
      return this.prisma.component.create({
        data: {
          slug: component.slug,
          domainId: targetDomainId,
          name: component.name,
          description: component.description,
          designJson: component.designJson as unknown as Prisma.InputJsonValue,
          htmlTemplate: component.htmlTemplate,
          variables: component.variables as unknown as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
    }
  }

  /** Render component HTML with default variables applied. */
  renderHtml(
    component: { htmlTemplate: string; variables: Prisma.JsonValue },
    overrides: Record<string, unknown> = {},
    hbs: typeof Handlebars = Handlebars,
  ) {
    const schema = component.variables as unknown as TemplateVariable[];
    const merged = { ...overrides };
    for (const v of schema) {
      if (merged[v.name] === undefined && v.defaultValue !== undefined) {
        merged[v.name] = v.defaultValue;
      }
    }
    return hbs.compile(component.htmlTemplate)(merged);
  }

  /**
   * Scan htmlTemplate for {{> slug}} patterns, load matching components,
   * and register them as partials on an isolated Handlebars environment.
   * Returns the isolated instance to avoid mutating the global registry.
   */
  async resolvePartials(
    htmlTemplate: string,
    variables: Record<string, unknown> = {},
    hbs?: typeof Handlebars,
  ): Promise<typeof Handlebars> {
    const instance = hbs ?? Handlebars.create();
    const slugs = [
      ...htmlTemplate.matchAll(/\{\{>\s*([a-z0-9-]+)\s*\}\}/g),
    ].map((m) => m[1]);
    if (slugs.length > 0) {
      const components = await this.prisma.component.findMany({
        where: { slug: { in: slugs } },
      });
      const foundSlugs = new Set(components.map((c) => c.slug));
      for (const c of components) {
        const rendered = this.renderHtml(c, variables, instance);
        instance.registerPartial(c.slug, rendered);
      }
      // Register empty string for any slugs not found in the DB (deleted components)
      for (const slug of slugs) {
        if (!foundSlugs.has(slug)) {
          instance.registerPartial(slug, '');
        }
      }
    }
    return instance;
  }
}
