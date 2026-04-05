"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ApiKeySummary } from "@/types";
import type { ApiKeyScope } from "@mail-maker/shared";

const API_KEYS_KEY = "api-keys";

export function useApiKeys() {
  return useQuery<ApiKeySummary[]>({
    queryKey: [API_KEYS_KEY],
    queryFn: () => api.get<ApiKeySummary[]>("/api-keys"),
  });
}

interface CreateApiKeyDto {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string;
}

interface CreatedApiKey extends ApiKeySummary {
  key: string; // raw key, shown once
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateApiKeyDto) =>
      api.post<CreatedApiKey>("/api-keys", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS_KEY] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api-keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [API_KEYS_KEY] }),
  });
}
