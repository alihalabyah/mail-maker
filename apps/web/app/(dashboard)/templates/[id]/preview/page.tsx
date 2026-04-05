"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTemplate } from "@/hooks/useTemplates";
import { api } from "@/lib/api-client";
import { Header } from "@/components/layout/Header";
import type { TemplateVariable, RenderResponse } from "@/types";

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: template, isLoading } = useTemplate(id);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [rendered, setRendered] = useState<RenderResponse | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRender = async () => {
    setRendering(true);
    setError(null);
    try {
      // Use the JWT-authenticated templates endpoint to get the compiled HTML,
      // then do a client-side Handlebars substitution for preview.
      // Alternatively call our own render endpoint via the API — but that requires
      // an API key. Instead we make a POST to a preview endpoint.
      const result = await api.post<RenderResponse>(
        `/templates/${id}/preview`,
        { variables },
      );
      setRendered(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!template) return null;

  const schema = template.variables as TemplateVariable[];

  return (
    <div className="flex flex-col h-full">
      <Header
        title={`Preview: ${template.name}`}
        actions={
          <Link
            href={`/templates/${id}`}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to editor
          </Link>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Variables input panel */}
        <aside className="w-72 border-r bg-white overflow-y-auto flex-shrink-0 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Test Variables</h3>

          {schema.length === 0 ? (
            <p className="text-xs text-gray-400">
              This template has no declared variables.
            </p>
          ) : (
            <div className="space-y-3">
              {schema.map((v) => (
                <div key={v.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {v.label}
                    <span className="ml-1 font-mono text-primary font-normal">
                      {`{{${v.name}}}`}
                    </span>
                    {v.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type={v.type === "number" ? "number" : "text"}
                    value={variables[v.name] ?? v.defaultValue ?? ""}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        [v.name]: e.target.value,
                      }))
                    }
                    placeholder={v.defaultValue ?? `Enter ${v.label}`}
                    className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleRender}
            disabled={rendering}
            className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white text-sm rounded hover:bg-primary-dark disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rendering ? "animate-spin" : ""}`} />
            {rendering ? "Rendering…" : "Render Preview"}
          </button>

          {rendered && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Subject</p>
              <p className="text-sm text-gray-800 bg-gray-50 rounded px-2 py-1.5">
                {rendered.subject}
              </p>
            </div>
          )}
        </aside>

        {/* Preview iframe */}
        <div className="flex-1 bg-gray-200 overflow-auto p-4">
          {rendered ? (
            <iframe
              srcDoc={rendered.html}
              className="w-full h-full bg-white rounded shadow-sm border"
              sandbox="allow-same-origin"
              title="Email preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Fill in variables and click &quot;Render Preview&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
