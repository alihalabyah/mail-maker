import { getToken, clearToken } from "./auth";

const BASE_URL = "/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = '/login';
      return undefined as T;
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const message =
      (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  // Export/import methods
  async exportTemplate(id: string): Promise<Blob> {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/export-import/templates/${id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, 'Export failed');
    return response.blob();
  },
  async exportComponent(id: string): Promise<Blob> {
    const token = getToken();
    const response = await fetch(`${BASE_URL}/export-import/components/${id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new ApiError(response.status, 'Export failed');
    return response.blob();
  },
  async importTemplate(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const response = await fetch(`${BASE_URL}/export-import/templates/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      const message = (body as { message?: string })?.message ?? `HTTP ${response.status}`;
      throw new ApiError(response.status, message, body);
    }
    return response.json() as Promise<{ action: 'created' | 'updated'; id: string; name: string; slug: string }>;
  },
  async importComponent(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const response = await fetch(`${BASE_URL}/export-import/components/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      const message = (body as { message?: string })?.message ?? `HTTP ${response.status}`;
      throw new ApiError(response.status, message, body);
    }
    return response.json() as Promise<{ action: 'created' | 'updated'; id: string; name: string; slug: string }>;
  },
};

export { ApiError };
