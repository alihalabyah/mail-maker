import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useImportTemplate, useImportComponent } from '@/hooks/useExportImport';

interface Props {
  type: 'template' | 'component';
  onSuccess?: () => void;
}

export function ImportDialog({ type, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importMutation = type === 'template' ? useImportTemplate() : useImportComponent();

  const handleImport = async () => {
    if (!file) return;

    setError(null);
    try {
      const result = await importMutation.mutateAsync(file);
      alert(`${type === 'template' ? 'Template' : 'Component'} ${result.action}: ${result.name}`);
      setOpen(false);
      setFile(null);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      setTimeout(() => setError(null), 4000);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Import {type}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select JSON file
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setFile(null);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  disabled={importMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importMutation.isPending}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-40 transition-colors"
                >
                  {importMutation.isPending ? 'Importing…' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
