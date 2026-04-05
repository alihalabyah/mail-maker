"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Template, TemplateSummary, PaginatedResponse } from "@/types";

const TEMPLATES_KEY = "templates";

export function useTemplates(search?: string, page = 1) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));

  return useQuery<PaginatedResponse<TemplateSummary>>({
    queryKey: [TEMPLATES_KEY, search, page],
    queryFn: () =>
      api.get<PaginatedResponse<TemplateSummary>>(
        `/templates?${params.toString()}`,
      ),
    staleTime: 0,
  });
}

export function useTemplate(id: string) {
  return useQuery<Template>({
    queryKey: [TEMPLATES_KEY, id],
    queryFn: () => api.get<Template>(`/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Template>) =>
      api.post<Template>("/templates", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Template>) =>
      api.patch<Template>(`/templates/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  });
}
