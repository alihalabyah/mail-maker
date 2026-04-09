import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  TemplateExport,
  ComponentExport,
  ImportResult,
  EmbeddedAsset,
  TemplateVariable,
} from '@mail-maker/shared';

@Injectable()
export class ExportImportService {
  private readonly logger = new Logger(ExportImportService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async exportTemplate(id: string, userEmail: string): Promise<TemplateExport> {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');

    // Extract image URLs from designJson
    const assetUrls = this.extractImageUrls(JSON.stringify(template.designJson));

    // Download and embed assets
    const embeddedAssets = await this.embedAssets(assetUrls);

    // Update designJson and htmlTemplate with placeholder URLs
    const { designJson, htmlTemplate } = this.replaceUrlsWithPlaceholders(
      template,
      embeddedAssets,
    );

    return {
      _metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: userEmail,
        type: 'template',
      },
      _embeddedAssets: this.arrayToMap(embeddedAssets),
      name: template.name,
      description: template.description ?? undefined,
      subject: template.subject,
      locale: template.locale,
      baseSlug: template.baseSlug,
      status: template.status,
      variables: template.variables as unknown as TemplateVariable[],
      designJson: designJson as object,
      htmlTemplate: htmlTemplate,
    };
  }

  async importTemplate(
    data: TemplateExport,
    userId: string,
    options: { updateIfExists?: boolean },
  ): Promise<ImportResult> {
    // Check if template with this baseSlug+locale exists
    const existing = await this.prisma.template.findFirst({
      where: {
        baseSlug: data.baseSlug,
        locale: data.locale,
      },
    });

    let slug = data.baseSlug;
    let baseSlug = data.baseSlug;

    if (existing) {
      if (!options.updateIfExists) {
        // Auto-generate unique slug AND baseSlug
        const timestamp = Date.now();
        baseSlug = `${data.baseSlug}-import-${timestamp}`;
        slug = baseSlug;
      } else {
        // Update existing
        // Re-upload assets and replace URLs
        const { designJson, htmlTemplate } = await this.restoreAssets(data);

        await this.prisma.template.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            description: data.description,
            subject: data.subject,
            designJson: designJson as Prisma.InputJsonValue,
            htmlTemplate,
            variables: data.variables as unknown as Prisma.InputJsonValue,
          },
        });

        return {
          action: 'updated',
          id: existing.id,
          name: data.name,
          slug: existing.slug,
        };
      }
    }

    // Re-upload assets and replace URLs
    const { designJson, htmlTemplate } = await this.restoreAssets(data);

    // Create new template
    const created = await this.prisma.template.create({
      data: {
        slug,
        baseSlug,
        locale: data.locale,
        name: data.name,
        description: data.description,
        subject: data.subject,
        status: data.status as 'draft' | 'published',
        designJson: designJson as Prisma.InputJsonValue,
        htmlTemplate,
        variables: data.variables as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    return {
      action: 'created',
      id: created.id,
      name: created.name,
      slug: created.slug,
    };
  }

  async exportComponent(id: string, userEmail: string): Promise<ComponentExport> {
    const component = await this.prisma.component.findUnique({ where: { id } });
    if (!component) throw new NotFoundException('Component not found');

    // Extract image URLs from designJson
    const assetUrls = this.extractImageUrls(JSON.stringify(component.designJson));

    // Download and embed assets
    const embeddedAssets = await this.embedAssets(assetUrls);

    // Update designJson and htmlTemplate with placeholder URLs
    const { designJson, htmlTemplate } = this.replaceUrlsWithComponentPlaceholders(
      component,
      embeddedAssets,
    );

    return {
      _metadata: {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: userEmail,
        type: 'component',
      },
      _embeddedAssets: this.arrayToMap(embeddedAssets),
      name: component.name,
      description: component.description ?? undefined,
      slug: component.slug,
      variables: component.variables as unknown as TemplateVariable[],
      designJson: designJson as object,
      htmlTemplate: htmlTemplate,
    };
  }

  async importComponent(
    data: ComponentExport,
    userId: string,
    options: { updateIfExists?: boolean },
  ): Promise<ImportResult> {
    // Check if component with this slug exists
    const existing = await this.prisma.component.findFirst({
      where: { slug: data.slug },
    });

    let slug = data.slug;

    if (existing) {
      if (!options.updateIfExists) {
        // Auto-generate unique slug
        slug = `${data.slug}-import-${Date.now()}`;
      } else {
        // Update existing
        // Re-upload assets and replace URLs
        const { designJson, htmlTemplate } = await this.restoreAssets(data);

        await this.prisma.component.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            description: data.description,
            designJson: designJson as Prisma.InputJsonValue,
            htmlTemplate,
            variables: data.variables as unknown as Prisma.InputJsonValue,
          },
        });

        return {
          action: 'updated',
          id: existing.id,
          name: data.name,
          slug: existing.slug,
        };
      }
    }

    // Re-upload assets and replace URLs
    const { designJson, htmlTemplate } = await this.restoreAssets(data);

    // Create new component
    const created = await this.prisma.component.create({
      data: {
        slug,
        name: data.name,
        description: data.description,
        designJson: designJson as Prisma.InputJsonValue,
        htmlTemplate,
        variables: data.variables as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    return {
      action: 'created',
      id: created.id,
      name: created.name,
      slug: created.slug,
    };
  }

  /**
   * Extract image URLs from JSON string
   */
  private extractImageUrls(json: string): string[] {
    const urls: string[] = [];
    const urlPattern = /https?:\/\/[^\s"'}]+\.(?:jpg|jpeg|png|gif|svg|webp)/gi;
    let match;
    while ((match = urlPattern.exec(json)) !== null) {
      urls.push(match[0]);
    }
    return [...new Set(urls)]; // Deduplicate
  }

  /**
   * Download and convert assets to base64
   */
  private async embedAssets(urls: string[]): Promise<EmbeddedAsset[]> {
    const assets: EmbeddedAsset[] = [];

    for (const url of urls) {
      // Only embed our S3 assets (not external URLs)
      if (!this.isOurAsset(url)) continue;

      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(response.data).toString('base64');
        const mimeType = response.headers['content-type'];
        const filename = this.extractFilename(url);

        assets.push({
          originalUrl: url,
          filename,
          mimeType,
          data: base64,
        });
      } catch (err) {
        this.logger.warn(`Failed to embed asset: ${url}`, err instanceof Error ? err.message : String(err));
      }
    }

    return assets;
  }

  /**
   * Check if URL is from our S3 bucket
   */
  private isOurAsset(url: string): boolean {
    const bucket = process.env.S3_BUCKET || 'mail-maker-assets';
    return url.includes(bucket);
  }

  /**
   * Replace URLs with placeholders for templates
   */
  private replaceUrlsWithPlaceholders(
    template: any,
    assets: EmbeddedAsset[],
  ) {
    let designJson = JSON.parse(JSON.stringify(template.designJson));
    let htmlTemplate = template.htmlTemplate;

    for (const asset of assets) {
      const placeholder = `asset://${asset.filename}`;
      const escapedUrl = this.escapeRegex(asset.originalUrl);
      designJson = JSON.parse(
        JSON.stringify(designJson).replace(new RegExp(escapedUrl, 'g'), placeholder),
      );
      htmlTemplate = htmlTemplate.replace(new RegExp(escapedUrl, 'g'), placeholder);
    }

    return { designJson, htmlTemplate };
  }

  /**
   * Replace URLs with placeholders for components
   */
  private replaceUrlsWithComponentPlaceholders(
    component: any,
    assets: EmbeddedAsset[],
  ) {
    let designJson = JSON.parse(JSON.stringify(component.designJson));
    let htmlTemplate = component.htmlTemplate;

    for (const asset of assets) {
      const placeholder = `asset://${asset.filename}`;
      const escapedUrl = this.escapeRegex(asset.originalUrl);
      designJson = JSON.parse(
        JSON.stringify(designJson).replace(new RegExp(escapedUrl, 'g'), placeholder),
      );
      htmlTemplate = htmlTemplate.replace(new RegExp(escapedUrl, 'g'), placeholder);
    }

    return { designJson, htmlTemplate };
  }

  /**
   * Restore assets (re-upload to S3)
   */
  private async restoreAssets(data: TemplateExport | ComponentExport) {
    const assets = Object.values(data._embeddedAssets);
    const urlMap = new Map<string, string>(); // placeholder → new URL

    for (const asset of assets) {
      const buffer = Buffer.from(asset.data, 'base64');
      const newUrl = await this.storageService.uploadFromBuffer(
        buffer,
        asset.filename,
        asset.mimeType,
      );
      urlMap.set(`asset://${asset.filename}`, newUrl);
    }

    // Replace placeholders with new URLs
    let designJson = JSON.parse(JSON.stringify(data.designJson));
    let htmlTemplate = data.htmlTemplate;

    for (const [placeholder, newUrl] of urlMap) {
      const escapedPlaceholder = this.escapeRegex(placeholder);
      designJson = JSON.parse(
        JSON.stringify(designJson).replace(
          new RegExp(escapedPlaceholder, 'g'),
          newUrl,
        ),
      );
      htmlTemplate = htmlTemplate.replace(new RegExp(escapedPlaceholder, 'g'), newUrl);
    }

    return { designJson, htmlTemplate };
  }

  private arrayToMap(assets: EmbeddedAsset[]): Record<string, EmbeddedAsset> {
    const map: Record<string, EmbeddedAsset> = {};
    for (const asset of assets) {
      map[asset.originalUrl] = asset;
    }
    return map;
  }

  private extractFilename(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1];
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
