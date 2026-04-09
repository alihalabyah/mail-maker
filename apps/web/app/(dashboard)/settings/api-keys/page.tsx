"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@/hooks/useApiKeys";
import { useDomains } from "@/hooks/useDomains";
import { Header } from "@/components/layout/Header";
import { ApiKeyScope } from "@mail-maker/shared";
import type { ApiKeySummary } from "@/types";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.nativeEnum(ApiKeyScope)).min(1, "Select at least one scope"),
  expiresAt: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  [ApiKeyScope.READ_ONLY]: "Read Only",
  [ApiKeyScope.RENDER]: "Render",
  [ApiKeyScope.ADMIN]: "Admin",
};

export default function ApiKeysPage() {
  const { data: keys, isLoading } = useApiKeys();
  const { data: domains } = useDomains();
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();
  const [showForm, setShowForm] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { scopes: [ApiKeyScope.RENDER] },
  });

  const selectedScopes = watch("scopes");

  const toggleScope = (scope: ApiKeyScope) => {
    const current = selectedScopes ?? [];
    setValue(
      "scopes",
      current.includes(scope)
        ? current.filter((s) => s !== scope)
        : [...current, scope],
    );
  };

  const onSubmit = handleSubmit(async (data) => {
    const result = await createMutation.mutateAsync(data);
    setRevealedKey(result.key);
    reset();
    setShowForm(false);
  });

  const handleCopy = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (key: ApiKeySummary) => {
    if (!confirm(`Revoke key "${key.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(key.id);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="API Keys"
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            New API Key
          </button>
        }
      />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* One-time key reveal banner */}
        {revealedKey && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              Copy your API key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono text-gray-800 overflow-x-auto">
                {revealedKey}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="text-xs text-amber-700 underline"
            >
              I&apos;ve saved it, dismiss
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={onSubmit}
            className="bg-white border rounded-lg p-4 space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-700">
              Create API Key
            </h3>

            {createMutation.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
                {(createMutation.error as Error).message}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Name *
              </label>
              <input
                {...register("name")}
                placeholder="e.g. Order Service"
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Scopes *
              </label>
              <div className="flex gap-2">
                {Object.values(ApiKeyScope).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                      selectedScopes?.includes(scope)
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                    }`}
                  >
                    {SCOPE_LABELS[scope]}
                  </button>
                ))}
              </div>
              {errors.scopes && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.scopes.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Expires at (optional)
              </label>
              <input
                type="date"
                {...register("expiresAt")}
                className="px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary-dark disabled:opacity-40"
              >
                {createMutation.isPending ? "Creating…" : "Create Key"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); reset(); }}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Keys list */}
        {isLoading ? (
          <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
        ) : !keys?.length ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">No API keys yet</p>
            <p className="text-sm mt-1">
              Create a key so your backend services can call the render API.
            </p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prefix</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scopes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last used</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {key.prefix}…
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {key.domain?.name ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {key.scopes.map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-primary-light text-primary text-xs rounded"
                          >
                            {SCOPE_LABELS[s as ApiKeyScope]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(key)}
                        className="p-1.5 text-gray-400 hover:text-red-600"
                        title="Revoke"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ApiDocs />
      </div>
    </div>
  );
}

// ─── API quick-reference ────────────────────────────────────────────────────

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ApiDocs() {
  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-5 space-y-5">
        <h3 className="text-sm font-semibold text-gray-800">API Quick Reference</h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-blue-800">🚀 Development with Tunnels</p>
          <p className="text-xs text-blue-700">
            Run <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">npm run tunnel</code> to create public URLs for local development.
            The script will display your tunnel URLs (Web, API, Mailpit).
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Authenticate every request with your API key in the{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">X-API-Key</code> header.
        </p>

        {/* Render */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">POST</span>
            <code className="text-xs font-mono text-gray-700">/v1/render/:templateSlug</code>
            <span className="text-xs text-gray-400">— returns rendered HTML + subject</span>
          </div>
          <p className="text-xs text-gray-500">
            Renders the <strong>published</strong> version of a template. <strong>domainSlug</strong> and <strong>locale</strong> are provided in the request body to specify which environment and language to render from.
          </p>
          <p className="text-xs font-medium text-gray-600">Request body</p>
          <CopyCode code={`{
  "domainSlug": "prod",
  "locale": "en",
  "variables": {
    "first_name": "John",
    "order_number": "ORD-123"
  }
}`} />
          <p className="text-xs font-medium text-gray-600 pt-1">cURL example</p>
          <CopyCode code={`curl -X POST "https://your-api-tunnel-url.trycloudflare.com/v1/render/order-confirmation" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: mk_your_key_here" \\
  -d '{
    "domainSlug": "prod",
    "locale": "en",
    "variables": {
      "first_name": "John",
      "order_number": "ORD-123"
    }
  }'`} />
        </div>

        <hr />

        {/* Send test */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">POST</span>
            <code className="text-xs font-mono text-gray-700">/v1/send-test/:templateSlug</code>
            <span className="text-xs text-gray-400">— render + send to test inbox (Mailpit)</span>
          </div>
          <p className="text-xs text-gray-500">
            Sends to a test inbox accessible via the Mailpit tunnel URL. <strong>domainSlug</strong> and <strong>locale</strong> are provided in the request body.
          </p>
          <p className="text-xs font-medium text-gray-600">Request body</p>
          <CopyCode code={`{
  "to": "test@example.com",
  "domainSlug": "prod",
  "locale": "en",
  "variables": {
    "first_name": "John",
    "order_number": "ORD-123"
  }
}`} />
          <p className="text-xs font-medium text-gray-600">cURL example</p>
          <CopyCode code={`curl -X POST "https://your-api-tunnel-url.trycloudflare.com/v1/send-test/your-template-slug" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: mk_your_key_here" \\
  -d '{
    "to": "test@example.com",
    "domainSlug": "prod",
    "locale": "en",
    "variables": {
      "first_name": "John",
      "order_number": "ORD-123"
    }
  }'`} />
        </div>

        <hr />

        {/* Render response shape */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Render response</p>
          <CopyCode code={`{ "html": "<html>…</html>", "subject": "Welcome John" }`} />
        </div>

        <hr />

        {/* Locale & Versioning info */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">ℹ️ API Request Body Changes</p>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li><strong>domainSlug (required):</strong> Must specify which domain/environment to render from using its slug (e.g., <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">prod</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">uat</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">dev</code>)</li>
            <li><strong>locale (optional):</strong> Template language variant (default: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">en</code>)</li>
            <li><strong>In request body:</strong> Both <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">domainSlug</code> and <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">locale</code> are now sent in the JSON request body, not as query parameters</li>
            <li><strong>Domain slugs are auto-generated:</strong> Created from domain name (lowercase, hyphens for spaces)</li>
            <li><strong>Published versions:</strong> Render API only serves published versions (not drafts)</li>
            <li><strong>Version history:</strong> Each publish creates an immutable version snapshot</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
