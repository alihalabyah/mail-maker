"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { Header } from "@/components/layout/Header";
import type { TemplateSummary } from "@/types";

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTemplates(search || undefined, page);
  const deleteMutation = useDeleteTemplate();

  const handleDelete = async (t: TemplateSummary) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(t.id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Templates"
        actions={
          <Link
            href="/templates/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
        ) : !data?.items.length ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create your first email template to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Variables</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.slug}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {(t.variables as unknown[]).length} vars
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/templates/${t.id}/preview`}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/templates/${t.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of{" "}
              {data.total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * data.limit >= data.total}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
