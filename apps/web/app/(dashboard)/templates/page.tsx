"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useTemplates, useDeleteTemplate, useDuplicateTemplate } from "@/hooks/useTemplates";
import { useDomains } from "@/hooks/useDomains";
import { Header } from "@/components/layout/Header";
import { ImportDialog } from "@/components/import/ImportDialog";
import { TemplateActionsMenu } from "@/components/template/TemplateActionsMenu";
import type { TemplateSummary } from "@/types";

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [domainFilter, setDomainFilter] = useState<string | undefined>();
  const { data, isLoading } = useTemplates(search || undefined, page, domainFilter);
  const { data: domains } = useDomains();
  const deleteMutation = useDeleteTemplate();
  const duplicateMutation = useDuplicateTemplate();

  const handleDelete = async (t: TemplateSummary) => {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(t.id);
  };

  const handleDuplicate = async (t: TemplateSummary) => {
    const result = await duplicateMutation.mutateAsync(t.id);
    // Navigate to the duplicated template
    window.location.href = `/templates/${result.id}`;
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Templates"
        actions={
          <div className="flex items-center gap-2">
            <ImportDialog type="template" />
            <Link
              href={`/templates/new${domainFilter ? `?domain=${domainFilter}` : ''}`}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
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

          <select
            value={domainFilter ?? ""}
            onChange={(e) => {
              setDomainFilter(e.target.value || undefined);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All domains</option>
            {domains?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
        ) : !data?.items.length ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1">Create your first email template to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Locale</th>
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
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {t.domain?.name ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded uppercase ${
                            t.locale === 'ar'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                          aria-label={`Locale: ${t.locale ?? 'en'}`}
                        >
                          {t.locale ?? 'en'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                            t.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                          aria-label={`Status: ${t.status ?? 'draft'}`}
                        >
                          {t.status ?? 'draft'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.slug}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {(t.variables as unknown[]).length} vars
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(t.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <TemplateActionsMenu
                        template={t}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        isDuplicating={duplicateMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                      />
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
