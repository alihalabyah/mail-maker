"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, ChevronRight } from "lucide-react";
import type { TemplateSummary } from "@/types";
import { useDomains } from "@/hooks/useDomains";
import { useCopyTemplateToDomain } from "@/hooks/useTemplates";
import { useExportTemplate } from "@/hooks/useExportImport";

interface Props {
  template: TemplateSummary;
  onDuplicate: (template: TemplateSummary) => void;
  onDelete: (template: TemplateSummary) => void;
  isDeleting?: boolean;
  isDuplicating?: boolean;
}

export function TemplateActionsMenu({
  template,
  onDuplicate,
  onDelete,
  isDeleting,
  isDuplicating,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copySubmenuOpen, setCopySubmenuOpen] = useState(false);
  const { data: domains } = useDomains();
  const copyMutation = useCopyTemplateToDomain();
  const exportMutation = useExportTemplate();

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync(template.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${template.slug}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      alert("Export failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleCopyToDomain = async (domainId: string) => {
    try {
      await copyMutation.mutateAsync({ id: template.id, targetDomainId: domainId });
      setOpen(false);
      setCopySubmenuOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Copy failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const toggleCopySubmenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopySubmenuOpen(!copySubmenuOpen);
  };

  const otherDomains = domains?.filter(d => d.id !== template.domain?.id) ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setOpen(false);
              setCopySubmenuOpen(false);
            }}
          />
          <div className="absolute right-0 top-0 z-20 bg-white border rounded-md shadow-lg py-1 min-w-48">
            <Link
              href={`/templates/${template.id}/preview`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Preview
            </Link>
            <Link
              href={`/templates/${template.id}`}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              Edit
            </Link>
            <button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Export
            </button>
            <button
              onClick={() => {
                onDuplicate(template);
                setOpen(false);
              }}
              disabled={isDuplicating}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Duplicate
            </button>
            <div className="relative">
              <button
                onClick={toggleCopySubmenu}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
              >
                Copy to
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              {copySubmenuOpen && otherDomains.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setCopySubmenuOpen(false)}
                  />
                  <div className="absolute right-full top-0 mr-1 bg-white border rounded-md shadow-lg py-1 min-w-48 z-30">
                    {otherDomains.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleCopyToDomain(d.id)}
                        disabled={copyMutation.isPending}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                onDelete(template);
                setOpen(false);
              }}
              disabled={isDeleting}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
