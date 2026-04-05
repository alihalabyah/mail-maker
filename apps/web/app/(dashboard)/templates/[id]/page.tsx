'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { useTemplate, useUpdateTemplate } from '@/hooks/useTemplates';
import { Header } from '@/components/layout/Header';
import { VariablesPanel } from '@/components/editor/VariablesPanel';
import type { TemplateVariable } from '@/types';
import type { EmailEditorValues } from '@/components/editor/EmailEditorWrapper';

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
  const updateMutation = useUpdateTemplate(id);

  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [showMeta, setShowMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    }
  }, [template, reset]);

  const handleEditorSave = async (values: EmailEditorValues) => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        designJson: values.design,
        htmlTemplate: values.html,
        variables,
      });
      setSaved(true);
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
      router.refresh();
    } finally {
      setSaving(false);
    }
  });

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

  // Always pass initialValues so the editor can show existing content.
  // The wrapper checks whether designJson is a real Unlayer design or raw HTML.
  const initialValues: EmailEditorValues = {
    design: (template.designJson ?? {}) as Record<string, unknown>,
    html: template.htmlTemplate,
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={template.name}
        actions={
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
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

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-primary text-white text-sm rounded hover:bg-primary-dark disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Update Details'}
              </button>
            </form>

            <div className="border-t">
              <VariablesPanel variables={variables} onChange={setVariables} />
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-hidden">
          <EmailEditorWrapper
            initialValues={initialValues}
            onSave={handleEditorSave}
            saving={saving}
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
