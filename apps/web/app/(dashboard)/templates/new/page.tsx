'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { Header } from '@/components/layout/Header';
import { VariablesPanel } from '@/components/editor/VariablesPanel';
import type { TemplateVariable } from '@/types';
import type { EmailEditorValues } from '@/components/editor/EmailEditorWrapper';

// Unlayer embeds in an iframe — must be client-side only
const EmailEditorWrapper = dynamic(
  () => import('@/components/editor/EmailEditorWrapper').then((m) => m.EmailEditorWrapper),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

const metaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseSlug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphens only'),
  locale: z.enum(['en', 'ar']),
  description: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
});
type MetaForm = z.infer<typeof metaSchema>;

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMutation = useCreateTemplate();
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [showMeta, setShowMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorValues, setEditorValues] = useState<EmailEditorValues | null>(null);

  const defaultBaseSlug = searchParams.get('baseSlug') ?? '';
  const defaultLocale = (searchParams.get('locale') ?? 'en') as 'en' | 'ar';
  const defaultDomain = searchParams.get('domain') ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MetaForm>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      baseSlug: defaultBaseSlug,
      locale: defaultLocale,
    },
  });

  const watchLocale = watch('locale', 'en');

  const handleEditorSave = async (values: EmailEditorValues) => {
    setEditorValues(values);
  };

  const submitAll = handleSubmit(async (meta) => {
    if (!editorValues) {
      alert('Please click "Save Template" in the editor first.');
      return;
    }
    setSaving(true);
    try {
      const template = await createMutation.mutateAsync({
        name: meta.name,
        slug: meta.baseSlug,
        baseSlug: meta.baseSlug,
        locale: meta.locale,
        description: meta.description,
        subject: meta.subject,
        designJson: editorValues.design,
        htmlTemplate: editorValues.html,
        variables,
        domainId: defaultDomain || undefined,
      });
      router.push(`/templates/${template.id}`);
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Template"
        actions={
          <button
            onClick={() => setShowMeta((s) => !s)}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            {showMeta ? 'Hide details' : 'Edit details'}
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {showMeta && (
          <aside className="w-72 border-r bg-white overflow-y-auto flex-shrink-0">
            <form onSubmit={submitAll} className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Template Details</h3>

              {createMutation.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
                  {(createMutation.error as Error).message}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  {...register('name')}
                  placeholder="Welcome Email"
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
                <input
                  {...register('baseSlug')}
                  placeholder="welcome-email"
                  className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {errors.baseSlug && <p className="text-xs text-red-600 mt-1">{errors.baseSlug.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                <div className="flex gap-2">
                  {(['en', 'ar'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setValue('locale', loc)}
                      className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                        watchLocale === loc
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {loc === 'en' ? '🇬🇧 English' : '🇦🇪 Arabic'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
                <input
                  {...register('subject')}
                  placeholder="Welcome, {{firstName}}!"
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
                disabled={saving || !editorValues}
                className="w-full py-2 bg-primary text-white text-sm rounded hover:bg-primary-dark disabled:opacity-40 transition-colors"
              >
                {saving ? 'Creating…' : !editorValues ? 'Save design first →' : 'Create Template'}
              </button>
            </form>

            <div className="border-t">
              <VariablesPanel variables={variables} onChange={setVariables} />
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-hidden">
          <EmailEditorWrapper
            onSave={handleEditorSave}
            saving={saving}
            locale={watchLocale}
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
