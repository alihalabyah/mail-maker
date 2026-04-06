import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const existing = await this.prisma.component.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    return this.prisma.component.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        designJson: dto.designJson as unknown as Prisma.InputJsonValue,
        htmlTemplate: dto.htmlTemplate,
        variables: (dto.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.component.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, slug: true, name: true, description: true,
        variables: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.component.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Component not found');
    return c;
  }

  async update(id: string, dto: UpdateComponentDto) {
    await this.findOne(id);
    if (dto.slug) {
      const conflict = await this.prisma.component.findFirst({ where: { slug: dto.slug, NOT: { id } } });
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    return this.prisma.component.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.designJson && { designJson: dto.designJson as unknown as Prisma.InputJsonValue }),
        ...(dto.htmlTemplate && { htmlTemplate: dto.htmlTemplate }),
        ...(dto.variables && { variables: dto.variables as unknown as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.component.delete({ where: { id } });
  }

  /** Render component HTML with default variables applied. */
  renderHtml(component: { htmlTemplate: string; variables: Prisma.JsonValue }, overrides: Record<string, unknown> = {}) {
    const schema = component.variables as unknown as TemplateVariable[];
    const merged = { ...overrides };
    for (const v of schema) {
      if (merged[v.name] === undefined && v.defaultValue !== undefined) {
        merged[v.name] = v.defaultValue;
      }
    }
    return Handlebars.compile(component.htmlTemplate)(merged);
  }

  /**
   * Scan htmlTemplate for {{> slug}} patterns, load matching components,
   * and register them as Handlebars partials. Call before any Handlebars compile.
   */
  async resolvePartials(htmlTemplate: string, variables: Record<string, unknown> = {}) {
    const slugs = [...htmlTemplate.matchAll(/\{\{>\s*([a-z0-9-]+)\s*\}\}/g)].map(m => m[1]);
    if (slugs.length === 0) return;

    const components = await this.prisma.component.findMany({ where: { slug: { in: slugs } } });
    for (const c of components) {
      const rendered = this.renderHtml(c, variables);
      Handlebars.registerPartial(c.slug, rendered);
    }
  }
}
