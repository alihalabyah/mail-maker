"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Component, ComponentSummary } from "@/types";

const COMPONENTS_KEY = "components";

export function useComponents() {
  return useQuery<ComponentSummary[]>({
    queryKey: [COMPONENTS_KEY],
    queryFn: () => api.get<ComponentSummary[]>("/components"),
    staleTime: 0,
  });
}

export function useComponent(id: string) {
  return useQuery<Component>({
    queryKey: [COMPONENTS_KEY, id],
    queryFn: () => api.get<Component>(`/components/${id}`),
    enabled: !!id,
  });
}

export function useCreateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Component>) =>
      api.post<Component>("/components", dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPONENTS_KEY] }),
  });
}

export function useUpdateComponent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<Component>) =>
      api.patch<Component>(`/components/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPONENTS_KEY] });
      qc.invalidateQueries({ queryKey: [COMPONENTS_KEY, id] });
    },
  });
}

export function useDeleteComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/components/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPONENTS_KEY] }),
  });
}

export function useDuplicateComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Component>(`/components/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [COMPONENTS_KEY] }),
  });
}
