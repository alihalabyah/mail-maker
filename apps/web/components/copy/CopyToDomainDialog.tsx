"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useDomains } from "@/hooks/useDomains";
import { useCopyTemplateToDomain } from "@/hooks/useTemplates";
import { useCopyComponentToDomain } from "@/hooks/useComponents";
import type { Domain } from "@/types";

interface Props {
  id: string;
  type: "template" | "component";
  name: string;
  onSuccess?: () => void;
}

export function CopyToDomainButton({ id, type, name, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [targetDomainId, setTargetDomainId] = useState<string | null>(null);
  const { data: domains } = useDomains();
  const copyTemplateMutation = useCopyTemplateToDomain();
  const copyComponentMutation = useCopyComponentToDomain();

  const copyMutation =
    type === "template" ? copyTemplateMutation : copyComponentMutation;

  const handleCopy = async () => {
    if (!targetDomainId) return;

    try {
      await copyMutation.mutateAsync({ id, targetDomainId });
      alert(`${type === "template" ? "Template" : "Component"} copied successfully`);
      setOpen(false);
      setTargetDomainId(null);
      onSuccess?.();
    } catch (err) {
      alert(
        `Copy failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-gray-400 hover:text-primary rounded"
        title={`Copy ${type} to domain`}
      >
        <Copy className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setTargetDomainId(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Copy {type} to domain
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Copy "{name}" to another domain. If a {type} with the same slug
              exists, it will be updated. Otherwise, a new one will be created.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target domain
                </label>
                <select
                  value={targetDomainId ?? ""}
                  onChange={(e) => setTargetDomainId(e.target.value || null)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a domain...</option>
                  {domains?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setTargetDomainId(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  disabled={copyMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!targetDomainId || copyMutation.isPending}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-40"
                >
                  {copyMutation.isPending ? "Copying…" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
