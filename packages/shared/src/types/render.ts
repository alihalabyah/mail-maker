export interface RenderRequest {
  variables: Record<string, unknown>;
}

export interface RenderResponse {
  html: string;
  subject: string;
}
