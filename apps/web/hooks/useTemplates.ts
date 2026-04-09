"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Template, TemplateSummary, PaginatedResponse, TemplateVersion } from "@/types";

const TEMPLATES_KEY = "templates";

export function useTemplates(search?: string, page = 1, domainId?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  if (domainId) params.set("domainId", domainId);

  return useQuery<PaginatedResponse<TemplateSummary>>({
    queryKey: [TEMPLATES_KEY, search, page, domainId],
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

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Template>(`/templates/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  });
}

export function usePublishTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Template>(`/templates/${id}/publish`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, id] });
    },
  });
}

export function useTemplateVersions(id: string) {
  return useQuery<TemplateVersion[]>({
    queryKey: [TEMPLATES_KEY, id, 'versions'],
    queryFn: () => api.get<TemplateVersion[]>(`/templates/${id}/versions`),
    enabled: !!id,
  });
}

export function useRestoreVersion(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      api.post<Template>(`/templates/${templateId}/versions/${versionId}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, templateId] });
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, templateId, 'versions'] });
    },
  });
}

export function useCopyTemplateToDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetDomainId }: { id: string; targetDomainId: string }) =>
      api.post<Template>(`/templates/${id}/copy-to-domain`, { targetDomainId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
    },
  });
}
