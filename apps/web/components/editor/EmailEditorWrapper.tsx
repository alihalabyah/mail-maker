'use client';

import { useRef, useCallback, useState } from 'react';
import EmailEditor, { EditorRef } from 'react-email-editor';
import { getToken } from '@/lib/auth';

export interface EmailEditorValues {
  design: Record<string, unknown>;
  html: string;
}

interface EmailEditorWrapperProps {
  initialValues?: EmailEditorValues;
  onSave: (values: EmailEditorValues) => Promise<void>;
  saving?: boolean;
}

/** Returns true only if the object is a real Unlayer design JSON (has a body with rows). */
function isUnlayerDesign(design: Record<string, unknown>): boolean {
  return (
    design !== null &&
    typeof design === 'object' &&
    'body' in design &&
    design.body !== null &&
    typeof design.body === 'object'
  );
}

// ─── Raw HTML editor (for templates seeded from HTML files) ──────────────────

function HtmlCodeEditor({
  initialHtml,
  onSave,
  saving,
}: {
  initialHtml: string;
  onSave: (values: EmailEditorValues) => Promise<void>;
  saving: boolean;
}) {
  const [html, setHtml] = useState(initialHtml);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <span className="text-xs text-[#636576]">
          Editing raw HTML — this template was imported from an existing email.
        </span>
        <button
          onClick={() => onSave({ design: {}, html })}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Template'}
        </button>
      </div>
      <textarea
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        spellCheck={false}
        className="flex-1 w-full p-4 font-mono text-xs resize-none outline-none border-0"
        style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          lineHeight: '1.6',
          tabSize: 2,
        }}
      />
    </div>
  );
}

// ─── Unlayer visual editor ────────────────────────────────────────────────────

export function EmailEditorWrapper({
  initialValues,
  onSave,
  saving = false,
}: EmailEditorWrapperProps) {
  const editorRef = useRef<EditorRef>(null);

  const onReady = useCallback(() => {
    if (initialValues?.design && isUnlayerDesign(initialValues.design)) {
      editorRef.current?.editor?.loadDesign(
        initialValues.design as Parameters<typeof editorRef.current.editor.loadDesign>[0],
      );
    }
  }, [initialValues]);

  const handleSave = useCallback(() => {
    editorRef.current?.editor?.exportHtml(async ({ design, html }) => {
      await onSave({
        design: design as unknown as Record<string, unknown>,
        html,
      });
    });
  }, [onSave]);

  const handleImageUpload = useCallback(
    (
      { attachments }: { attachments: File[] },
      done: (result: { progress: number; url?: string }) => void,
    ) => {
      const file = attachments[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      const token = getToken();

      fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
        .then((res) => res.json() as Promise<{ url: string }>)
        .then(({ url }) => done({ progress: 100, url }))
        .catch(() => done({ progress: 0 }));
    },
    [],
  );

  // Raw HTML template — show code editor instead of Unlayer
  if (initialValues && !isUnlayerDesign(initialValues.design)) {
    return (
      <HtmlCodeEditor
        initialHtml={initialValues.html}
        onSave={onSave}
        saving={saving}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-4 py-2 border-b bg-white shrink-0">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Template'}
        </button>
      </div>
      <div className="flex-1">
        <EmailEditor
          ref={editorRef}
          onReady={onReady}
          style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}
          options={{
            features: { imageEditor: true },
          }}
          onLoad={(editor) => {
            editor.registerCallback('image', handleImageUpload);
          }}
        />
      </div>
    </div>
  );
}
