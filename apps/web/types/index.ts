export type {
  TemplateVariable,
  ApiKeySummary,
  RenderRequest,
  RenderResponse,
  UserSummary,
} from "@mail-maker/shared";
export { ApiKeyScope, Role } from "@mail-maker/shared";

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Extend TemplateSummary with locale/status fields
// The shared package will be updated separately, but we need these fields now
export interface TemplateSummary {
  id: string;
  slug: string;
  baseSlug?: string;
  locale?: string;
  status?: string;
  name: string;
  description?: string;
  subject: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  domain?: { id: string; name: string };
}

export interface Template {
  id: string;
  slug: string;
  baseSlug: string;          // new
  locale: string;            // new — "en" | "ar"
  status: string;            // new — "draft" | "published"
  currentVersionId?: string; // new
  name: string;
  description?: string;
  subject: string;
  designJson: Record<string, unknown>;
  htmlTemplate: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  subject: string;
  publishedAt: string;
  publishedBy: { id: string; email: string };
}

export interface Component {
  id: string;
  slug: string;
  name: string;
  description?: string;
  designJson: Record<string, unknown>;
  htmlTemplate: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface ComponentSummary {
  id: string;
  slug: string;
  name: string;
  description?: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  domain?: { id: string; name: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
  };
}
