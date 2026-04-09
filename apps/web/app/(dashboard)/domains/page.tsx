"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useDomains, useCreateDomain, useUpdateDomain, useDeleteDomain } from "@/hooks/useDomains";
import { Header } from "@/components/layout/Header";
import type { Domain } from "@/types";

export default function DomainsPage() {
  const { data: domains, isLoading } = useDomains();
  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();
  const deleteMutation = useDeleteDomain();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({ name, description });
    setName("");
    setDescription("");
    setOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await updateMutation.mutateAsync({ id: editing.id, name, description });
    setEditing(null);
    setName("");
    setDescription("");
  };

  const handleDelete = async (domain: Domain) => {
    if (!confirm(`Delete "${domain.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(domain.id);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  const openEdit = (domain: Domain) => {
    setEditing(domain);
    setName(domain.name);
    setDescription(domain.description ?? "");
    setOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Domains"
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Domain
          </button>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-gray-500 py-12 text-center">Loading…</div>
        ) : !domains?.length ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No domains yet</p>
            <p className="text-sm mt-1">Create domains to organize your templates and components.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Default</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {domains.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{d.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      {d.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
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
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editing ? "Edit Domain" : "New Domain"}
            </h2>

            <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., prod, staging, dev"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name || createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-40"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving…"
                    : editing
                    ? "Save"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
