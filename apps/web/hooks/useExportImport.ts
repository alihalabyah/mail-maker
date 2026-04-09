import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useExportTemplate() {
  return useMutation({
    mutationFn: (id: string) => api.exportTemplate(id),
  });
}

export function useImportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.importTemplate(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useExportComponent() {
  return useMutation({
    mutationFn: (id: string) => api.exportComponent(id),
  });
}

export function useImportComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.importComponent(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['components'] }),
  });
}
