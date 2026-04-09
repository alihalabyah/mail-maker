import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const DOMAINS_KEY = ['domains'];

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useDomains() {
  return useQuery({
    queryKey: DOMAINS_KEY,
    queryFn: () => api.get<Domain[]>('/domains'),
  });
}

export function useCreateDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<Domain>('/domains', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOMAINS_KEY }),
  });
}

export function useUpdateDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Domain>) =>
      api.patch<Domain>(`/domains/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOMAINS_KEY }),
  });
}

export function useDeleteDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/domains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOMAINS_KEY }),
  });
}

export function useSetDefaultDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Domain>(`/domains/${id}/set-default`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOMAINS_KEY }),
  });
}
