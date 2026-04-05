import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateVariable } from '@mail-maker/shared';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

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
        htmlTemplate: dto.htmlTemplate,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        variables: (dto.variables ?? []) as unknown as Prisma.InputJsonValue,
        createdById: userId,
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
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);

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
        ...(dto.htmlTemplate && { htmlTemplate: dto.htmlTemplate }),
        ...(dto.variables && {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          variables: dto.variables as unknown as Prisma.InputJsonValue,
        }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.template.delete({ where: { id } });
  }

  /** JWT-protected preview endpoint: render with variables, no API key needed. */
  preview(
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
    const htmlFn = Handlebars.compile(template.htmlTemplate);
    const subjectFn = Handlebars.compile(template.subject);
    return { html: htmlFn(merged), subject: subjectFn(merged) };
  }
}
