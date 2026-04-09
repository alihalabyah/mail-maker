import { Download } from 'lucide-react';
import { useExportTemplate, useExportComponent } from '@/hooks/useExportImport';

interface Props {
  id: string;
  type: 'template' | 'component';
}

export function ExportButton({ id, type }: Props) {
  const exportMutation = type === 'template' ? useExportTemplate() : useExportComponent();

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${id}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exportMutation.isPending}
      className="p-1.5 text-gray-400 hover:text-primary rounded disabled:opacity-40"
      title={`Export ${type}`}
    >
      <Download className="w-4 h-4" />
    </button>
  );
}
