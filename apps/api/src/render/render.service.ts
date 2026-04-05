import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateVariable } from '@mail-maker/shared';

@Injectable()
export class RenderService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Register useful Handlebars helpers
    Handlebars.registerHelper('upper', (str: unknown) =>
      typeof str === 'string' ? str.toUpperCase() : str,
    );
    Handlebars.registerHelper('lower', (str: unknown) =>
      typeof str === 'string' ? str.toLowerCase() : str,
    );
    Handlebars.registerHelper('formatDate', (date: unknown) => {
      if (!date) return '';
      return new Date(date as string).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });
  }

  async getTemplate(idOrSlug: string) {
    const template =
      (await this.prisma.template.findUnique({ where: { id: idOrSlug } })) ??
      (await this.prisma.template.findUnique({ where: { slug: idOrSlug } }));

    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async render(idOrSlug: string, variables: Record<string, unknown>) {
    const template = await this.getTemplate(idOrSlug);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const schema = template.variables as unknown as TemplateVariable[];
    const merged = this.mergeWithDefaults(schema, variables);
    this.validateVariables(schema, merged);

    const htmlFn = Handlebars.compile(template.htmlTemplate);
    const subjectFn = Handlebars.compile(template.subject);

    return {
      html: htmlFn(merged),
      subject: subjectFn(merged),
    };
  }

  private mergeWithDefaults(
    schema: TemplateVariable[],
    provided: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...provided };
    for (const v of schema) {
      if (result[v.name] === undefined && v.defaultValue !== undefined) {
        result[v.name] = v.defaultValue;
      }
    }
    return result;
  }

  private validateVariables(schema: TemplateVariable[], merged: Record<string, unknown>) {
    const errors: string[] = [];
    for (const v of schema) {
      if (v.required && merged[v.name] === undefined) {
        errors.push(`Missing required variable: "${v.name}" (${v.label})`);
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Missing required variables', errors });
    }
  }
}
