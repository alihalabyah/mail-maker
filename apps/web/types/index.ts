export type {
  TemplateVariable,
  TemplateSummary,
  ApiKeySummary,
  RenderRequest,
  RenderResponse,
  UserSummary,
} from "@mail-maker/shared";
export { ApiKeyScope, Role } from "@mail-maker/shared";

export interface Template {
  id: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  designJson: Record<string, unknown>;
  htmlTemplate: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
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
