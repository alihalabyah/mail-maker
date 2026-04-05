export enum ApiKeyScope {
  READ_ONLY = 'READ_ONLY',
  RENDER = 'RENDER',
  ADMIN = 'ADMIN',
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}
