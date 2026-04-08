"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { useComponents, useDeleteComponent, useDuplicateComponent } from "@/hooks/useComponents";
import { Header } from "@/components/layout/Header";
import type { ComponentSummary } from "@/types";

export default function ComponentsPage() {
  const { data, isLoading } = useComponents();
  const deleteMutation = useDeleteComponent();
  const duplicateMutation = useDuplicateComponent();

  const handleDelete = async (c: ComponentSummary) => {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(c.id);
  };

  const handleDuplicate = async (c: ComponentSummary) => {
    const result = await duplicateMutation.mutateAsync(c.id);
    // Navigate to the duplicated component
    window.location.href = `/components/${result.id}`;
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Components"
        actions={
          <Link
            href="/components/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Component
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {isLoading ? (
          <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
        ) : !data?.length ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No components yet</p>
            <p className="text-sm mt-1">Create your first shared component to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Variables</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/components/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{c.description ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {(c.variables as unknown[]).length} vars
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/components/${c.id}`}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(c)}
                          disabled={duplicateMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-primary rounded disabled:opacity-40"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p1.5 text-gray-400 hover:text-red-600 rounded"
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
      </div>
    </div>
  );
}
