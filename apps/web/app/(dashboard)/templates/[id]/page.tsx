'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { useTemplate, useUpdateTemplate, useTemplates, usePublishTemplate, useTemplateVersions, useRestoreVersion } from '@/hooks/useTemplates';
import { useComponents } from '@/hooks/useComponents';
import { Header } from '@/components/layout/Header';
import { VariablesPanel } from '@/components/editor/VariablesPanel';
import { api } from '@/lib/api-client';
import type { TemplateVariable, ComponentSummary } from '@/types';
import type { EmailEditorValues, EmailEditorHandle } from '@/components/editor/EmailEditorWrapper';
import type { JSONTemplate } from '@unlayer/types/editor/design';

const EmailEditorWrapper = dynamic(
  () => import('@/components/editor/EmailEditorWrapper').then((m) => m.EmailEditorWrapper),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

const metaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphens only'),
  description: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
});
type MetaForm = z.infer<typeof metaSchema>;

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(id);
  const { data: allTemplates } = useTemplates();
  const updateMutation = useUpdateTemplate(id);
  const publishMutation = usePublishTemplate(id);
  const { data: versions } = useTemplateVersions(id);
  const restoreMutation = useRestoreVersion(id);

  const editorRef = useRef<EmailEditorHandle>(null);
  const { data: components } = useComponents();

  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [showMeta, setShowMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [refreshedDesign, setRefreshedDesign] = useState<JSONTemplate | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const hasRefreshed = useRef(false);

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<MetaForm>({ resolver: zodResolver(metaSchema) });

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        slug: template.slug,
        description: template.description ?? '',
        subject: template.subject,
      });
      setVariables(template.variables as TemplateVariable[]);

      // Refresh shared components when template changes
      const rawDesign = (template.designJson ?? {}) as Record<string, unknown>;
      if ('body' in rawDesign) {
        console.log('[Template] Refreshing shared components...');
        refreshSharedComponents(rawDesign as JSONTemplate)
          .then((design) => {
            console.log('[Template] Components refreshed successfully');
            setRefreshedDesign(design);
            setEditorKey(prev => prev + 1); // Force editor remount
          })
          .catch((err) => {
            console.error('[Template] Failed to refresh components:', err);
            setRefreshedDesign(rawDesign as JSONTemplate);
          });
      } else {
        setRefreshedDesign(rawDesign as JSONTemplate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]); // Only re-run when template ID changes

  const handleEditorSave = async (values: EmailEditorValues) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        designJson: values.design,
        htmlTemplate: values.html,
        variables,
      });
      setSaved(true);
      setHasUnpublishedChanges(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const submitMeta = handleSubmit(async (meta) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        name: meta.name,
        slug: meta.slug,
        description: meta.description,
        subject: meta.subject,
        variables,
      });
      setHasUnpublishedChanges(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  });

  const refreshSharedComponents = async (design: JSONTemplate): Promise<JSONTemplate> => {
    const body = design.body as Record<string, unknown>;
    const rows = (body.rows as unknown[]) ?? [];

    console.log('[refreshSharedComponents] Starting refresh, rows count:', rows.length);

    if (rows.length === 0) {
      console.log('[refreshSharedComponents] No rows found, returning original design');
      return design;
    }

    // Find all component slugs in the design
    const componentSlugs = new Set<string>();
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const columns = r.columns as unknown[] ?? [];
      for (const column of columns) {
        const col = column as Record<string, unknown>;
        const contents = col.contents as unknown[] ?? [];
        for (const content of contents) {
          const c = content as Record<string, unknown>;
          if (c.type === 'html') {
            const values = c.values as Record<string, unknown>;
            const html = values.html as string ?? '';
            const matches = html.matchAll(/<!-- component:([a-z0-9-]+) -->/g);
            for (const match of matches) {
              componentSlugs.add(match[1]);
            }
          }
        }
      }
    }

    console.log('[refreshSharedComponents] Found component slugs:', Array.from(componentSlugs));

    if (componentSlugs.size === 0) {
      console.log('[refreshSharedComponents] No shared components found in design');
      return design;
    }

    // Fetch fresh HTML for each component
    const componentMap = new Map<string, string>();
    for (const slug of Array.from(componentSlugs)) {
      try {
        // Find component by slug
        const component = components?.find(c => c.slug === slug);
        if (!component) {
          console.warn(`[refreshSharedComponents] Component not found for slug: ${slug}`);
          continue;
        }

        console.log(`[refreshSharedComponents] Fetching fresh HTML for: ${slug} (${component.id})`);
        const { html: previewHtml } = await api.post<{ html: string }>(
          `/components/${component.id}/preview`,
          { variables: {} },
        );
        componentMap.set(slug, previewHtml);
        console.log(`[refreshSharedComponents] Successfully fetched HTML for: ${slug}, length: ${previewHtml.length}`);
      } catch (err) {
        console.error(`[refreshSharedComponents] Failed to refresh component: ${slug}`, err);
      }
    }

    console.log('[refreshSharedComponents] Fetched fresh HTML for components:', Array.from(componentMap.keys()));

    if (componentMap.size === 0) {
      console.log('[refreshSharedComponents] No components were successfully refreshed');
      return design;
    }

    // Update rows with fresh component HTML
    const updatedRows = rows.map((row) => {
      const r = row as Record<string, unknown>;
      const columns = (r.columns as unknown[])?.map((column) => {
        const col = column as Record<string, unknown>;
        const contents = (col.contents as unknown[])?.map((content) => {
          const c = content as Record<string, unknown>;
          if (c.type === 'html') {
            const values = c.values as Record<string, unknown>;
            let html = values.html as string ?? '';

            // Replace component HTML with fresh version
            for (const [slug, freshHtml] of componentMap.entries()) {
              const regex = new RegExp(
                `<!-- component:${slug} -->([\\s\\S]*?)<!-- /component:${slug} -->`,
                'g'
              );
              const matchCount = (html.match(regex) || []).length;
              if (matchCount > 0) {
                console.log(`[refreshSharedComponents] Replacing HTML for ${slug}, found ${matchCount} occurrence(s)`);
                html = html.replace(regex, `<!-- component:${slug} -->${freshHtml}<!-- /component:${slug} -->`);
              }
            }

            return { ...c, values: { ...values, html } };
          }
          return content;
        });
        return { ...col, contents };
      });
      return { ...r, columns };
    });

    console.log('[refreshSharedComponents] Successfully updated design with fresh component HTML');

    return {
      ...design,
      body: {
        ...body,
        rows: updatedRows,
      },
    };
  };

  const handleInsertComponent = async (component: ComponentSummary) => {
    setInsertingId(component.id);
    setInsertError(null);
    try {
      const { html: previewHtml } = await api.post<{ html: string }>(
        `/components/${component.id}/preview`,
        { variables: {} },
      );

      const componentRow = {
        cells: [1],
        columns: [{
          contents: [{
            type: 'html',
            values: {
              html: `<!-- component:${component.slug} -->${previewHtml}<!-- /component:${component.slug} -->`,
            },
          }],
          values: {},
        }],
        values: {},
      };

      editorRef.current?.editor?.saveDesign((design) => {
        const body = design.body as Record<string, unknown>;
        const updatedDesign = {
          ...design,
          body: {
            ...body,
            rows: [...((body.rows as unknown[]) ?? []), componentRow],
          },
        };
        editorRef.current?.editor?.loadDesign(updatedDesign as JSONTemplate);
      });
    } catch {
      setInsertError(`Failed to insert "${component.name}". Please try again.`);
      setTimeout(() => setInsertError(null), 4000);
    } finally {
      setInsertingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading template…
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Template not found.
      </div>
    );
  }

  // Find sibling locale template
  const siblingLocale = template.locale === 'en' ? 'ar' : 'en';
  const siblingTemplate = allTemplates?.items?.find(
    (t) => t.baseSlug === template.baseSlug && t.locale === siblingLocale
  );

  // Always pass initialValues so the editor can show existing content.
  // The wrapper checks whether designJson is a real Unlayer design or raw HTML.
  const designToUse = refreshedDesign ?? (template.designJson ?? {}) as Record<string, unknown>;
  const initialValues: EmailEditorValues = {
    design: 'body' in designToUse ? designToUse : { schemaVersion: 3, body: { rows: [], values: {} } },
    html: template.htmlTemplate,
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={template.name}
        actions={
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}

            {/* Locale tabs */}
            <div className="flex items-center gap-1 border rounded-md overflow-hidden">
              {(['en', 'ar'] as const).map((loc) => {
                const isCurrent = template.locale === loc;
                const siblingId = loc === siblingLocale ? siblingTemplate?.id : template.id;
                return isCurrent ? (
                  <span key={loc} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white uppercase">
                    {loc}
                  </span>
                ) : siblingId ? (
                  <Link key={loc} href={`/templates/${siblingId}`}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 uppercase">
                    {loc}
                  </Link>
                ) : (
                  <Link key={loc}
                    href={`/templates/new?baseSlug=${template.baseSlug}&locale=${loc}`}
                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-primary uppercase">
                    + {loc}
                  </Link>
                );
              })}
            </div>

            <Link
              href={`/templates/${id}/preview`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Link>
            <button
              onClick={() => setShowMeta((s) => !s)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              {showMeta ? 'Hide details' : 'Details'}
            </button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {showMeta && (
          <aside className="w-72 border-r bg-white overflow-y-auto flex-shrink-0">
            <form onSubmit={submitMeta} className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Template Details</h3>

              {updateMutation.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
                  {(updateMutation.error as Error).message}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  {...register('name')}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
                <input
                  {...register('slug')}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.slug && <p className="text-xs text-red-600 mt-1">{errors.slug.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                <input
                  {...register('subject')}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => publishMutation.mutate(undefined, {
                    onSuccess: () => {
                      setHasUnpublishedChanges(false);
                    },
                  })}
                  disabled={publishMutation.isPending || !hasUnpublishedChanges && template.status === 'published'}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  {publishMutation.isPending ? 'Publishing…' : template.status === 'published' && !hasUnpublishedChanges ? 'Published' : 'Publish'}
                </button>
              </div>
            </form>

            <div className="border-t">
              <VariablesPanel variables={variables} onChange={setVariables} />
            </div>

            {components && components.length > 0 && (
              <div className="border-t pt-4 space-y-2 px-4 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  Shared Components
                </h3>
                <p className="text-xs text-gray-400 px-1">
                  Click Add to insert a locked block into the email.
                </p>
                {insertError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                    {insertError}
                  </p>
                )}
                <div className="space-y-2">
                  {components.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-gray-400 truncate">{c.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleInsertComponent(c)}
                        disabled={insertingId === c.id}
                        className="shrink-0 px-2 py-1 text-xs border border-primary text-primary rounded hover:bg-primary-light disabled:opacity-40 transition-colors"
                      >
                        {insertingId === c.id ? '…' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version History */}
            {versions && versions.length > 0 && (
              <div className="border-t pt-4 space-y-2 px-4 pb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  Version History
                </h3>
                <div className="space-y-1">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800">v{v.version}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(v.publishedAt).toLocaleDateString()} · {v.publishedBy.email}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Restore v${v.version} to draft?`)) {
                            restoreMutation.mutate(v.id);
                          }
                        }}
                        disabled={restoreMutation.isPending}
                        className="shrink-0 px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        <div className="flex-1 overflow-hidden">
          <EmailEditorWrapper
            key={editorKey}
            ref={editorRef}
            initialValues={initialValues}
            onSave={handleEditorSave}
            saving={saving}
            locale={template.locale as 'en' | 'ar'}
          />
        </div>
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
      Loading editor…
    </div>
  );
}
