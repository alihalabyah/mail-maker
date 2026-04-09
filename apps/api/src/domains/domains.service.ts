import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.domain.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const domain = await this.prisma.domain.findUnique({ where: { id } });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  async findBySlug(slug: string) {
    const domain = await this.prisma.domain.findUnique({ where: { slug } });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async create(name: string, description?: string) {
    const existing = await this.prisma.domain.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Domain name already exists');

    const slug = this.generateSlug(name);

    // Check if slug already exists
    const existingSlug = await this.prisma.domain.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Domain slug "${slug}" already exists. Please use a different name.`);
    }

    return this.prisma.domain.create({
      data: { name, slug, description },
    });
  }

  async update(id: string, name?: string, description?: string) {
    const domain = await this.findOne(id);

    if (name) {
      const conflict = await this.prisma.domain.findFirst({
        where: { name, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Domain name already exists');

      // Generate new slug if name changed
      const newSlug = this.generateSlug(name);
      if (newSlug !== domain.slug) {
        const existingSlug = await this.prisma.domain.findFirst({
          where: { slug: newSlug, NOT: { id } },
        });
        if (existingSlug) {
          throw new ConflictException(`Domain slug "${newSlug}" already exists. Please use a different name.`);
        }
      }
    }

    const updateData: { name?: string; slug?: string; description?: string } = {
      ...(description !== undefined && { description }),
    };

    if (name && name !== domain.name) {
      updateData.name = name;
      updateData.slug = this.generateSlug(name);
    }

    return this.prisma.domain.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const domain = await this.findOne(id);

    // Check if domain has templates or components
    const templateCount = await this.prisma.template.count({
      where: { domainId: id },
    });
    const componentCount = await this.prisma.component.count({
      where: { domainId: id },
    });

    if (templateCount > 0 || componentCount > 0) {
      throw new ConflictException(
        `Cannot delete domain: ${templateCount} templates and ${componentCount} components are using it`,
      );
    }

    await this.prisma.domain.delete({ where: { id } });
  }
}
