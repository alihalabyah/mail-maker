'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateComponent } from '@/hooks/useComponents';
import { Header } from '@/components/layout/Header';

const metaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphens only'),
  description: z.string().optional(),
});
type MetaForm = z.infer<typeof metaSchema>;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewComponentPage() {
  const router = useRouter();
  const createMutation = useCreateComponent();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MetaForm>({ resolver: zodResolver(metaSchema) });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('slug', toSlug(e.target.value));
  };

  const onSubmit = handleSubmit(async (meta) => {
    setSaving(true);
    try {
      const result = await createMutation.mutateAsync({
        name: meta.name,
        slug: meta.slug,
        description: meta.description,
        designJson: {},
        htmlTemplate: '',
        variables: [],
      });
      router.push(`/components/${result.id}`);
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="New Component" />

      <div className="p-6 max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          {createMutation.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
              {(createMutation.error as Error).message}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input
              {...register('name', {
                onChange: handleNameChange,
              })}
              placeholder="Header Banner"
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
            <input
              {...register('slug')}
              placeholder="header-banner"
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.slug && <p className="text-xs text-red-600 mt-1">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-primary text-white text-sm rounded hover:bg-primary-dark disabled:opacity-40 transition-colors"
          >
            {saving ? 'Creating…' : 'Create Component'}
          </button>
        </form>
      </div>
    </div>
  );
}
