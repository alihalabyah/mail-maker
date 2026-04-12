import { TemplateVariable } from './template';

export interface ExportMetadata {
  version: string; // "1.0"
  exportedAt: string; // ISO timestamp
  exportedBy: string; // User email
  type: 'template' | 'component';
}

export interface EmbeddedAsset {
  originalUrl: string;
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface TemplateExport {
  _metadata: ExportMetadata;
  _embeddedAssets: Record<string, EmbeddedAsset>; // URL → asset data

  // Core template data
  name: string;
  description?: string;
  subject: string;
  locale: string;
  baseSlug: string;
  status: string;
  variables: TemplateVariable[];
  designJson: object; // Unlayer design with updated URLs
  htmlTemplate: string; // With updated URLs
}

export interface ComponentExport {
  _metadata: ExportMetadata;
  _embeddedAssets: Record<string, EmbeddedAsset>;

  name: string;
  description?: string;
  slug: string;
  variables: TemplateVariable[];
  designJson: object;
  htmlTemplate: string;
}

export interface ImportResult {
  action: 'created' | 'updated';
  id: string;
  name: string;
  slug: string;
}
