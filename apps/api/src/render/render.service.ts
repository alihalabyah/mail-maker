import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from '../components/components.service';
import { TemplateVariable } from '@mail-maker/shared';
import { registerStandardHelpers } from './handlebars-helpers';

@Injectable()
export class RenderService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private componentsService: ComponentsService,
  ) {}

  onModuleInit() {
    // Register useful Handlebars helpers on the global instance
    registerStandardHelpers(Handlebars);
  }

  async getTemplate(idOrSlug: string, locale = 'en') {
    // Try by ID first
    let template = await this.prisma.template.findUnique({
      where: { id: idOrSlug },
    });

    // Then by baseSlug + locale
    if (!template) {
      template = await this.prisma.template.findUnique({
        where: { baseSlug_locale: { baseSlug: idOrSlug, locale } },
      });
    }

    // Legacy: fall back to slug lookup ONLY if using default locale
    // (don't fall back when locale is explicitly specified)
    if (!template && locale === 'en') {
      template = await this.prisma.template.findUnique({
        where: { slug: idOrSlug },
      });
    }

    if (!template)
      throw new NotFoundException(
        `Template "${idOrSlug}" not found for locale "${locale}"`,
      );

    if (!template.currentVersionId) {
      throw new NotFoundException(
        `Template "${idOrSlug}" (${locale}) has no published version`,
      );
    }

    // Load the published version
    const version = await this.prisma.templateVersion.findUnique({
      where: { id: template.currentVersionId },
    });

    if (!version) throw new NotFoundException('Published version not found');

    return {
      ...template,
      htmlTemplate: version.htmlTemplate,
      subject: version.subject,
      variables: version.variables,
      designJson: version.designJson,
    };
  }

  async render(
    idOrSlug: string,
    variables: Record<string, unknown>,
    locale = 'en',
  ) {
    const template = await this.getTemplate(idOrSlug, locale);

    const schema = template.variables as unknown as TemplateVariable[];
    const merged = this.mergeWithDefaults(schema, variables);
    this.validateVariables(schema, merged);

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

  private validateVariables(
    schema: TemplateVariable[],
    merged: Record<string, unknown>,
  ) {
    const errors: string[] = [];
    for (const v of schema) {
      if (v.required && merged[v.name] === undefined) {
        errors.push(`Missing required variable: "${v.name}" (${v.label})`);
      }
    }
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Missing required variables',
        errors,
      });
    }
  }
}
