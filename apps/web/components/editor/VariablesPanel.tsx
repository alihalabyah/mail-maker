"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TemplateVariable } from "@/types";

interface VariablesPanelProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
}

const EMPTY_VAR: TemplateVariable = {
  name: "",
  label: "",
  type: "string",
  required: false,
};

export function VariablesPanel({ variables, onChange }: VariablesPanelProps) {
  const [draft, setDraft] = useState<TemplateVariable>(EMPTY_VAR);

  const add = () => {
    if (!draft.name.trim()) return;
    onChange([...variables, { ...draft }]);
    setDraft(EMPTY_VAR);
  };

  const remove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Template Variables</h3>
      <p className="text-xs text-gray-500">
        Use <code className="bg-gray-100 px-1 rounded">{"{{variableName}}"}</code> in
        text blocks and the subject line.
      </p>

      {variables.length > 0 && (
        <ul className="space-y-1">
          {variables.map((v, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm"
            >
              <div>
                <span className="font-mono text-primary">{`{{${v.name}}}`}</span>
                <span className="ml-2 text-gray-500">{v.label}</span>
                {v.required && (
                  <span className="ml-1 text-red-500 text-xs">*</span>
                )}
              </div>
              <button
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border rounded-md p-3 space-y-2 bg-gray-50">
        <p className="text-xs font-medium text-gray-600">Add variable</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="name (camelCase)"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            placeholder="Label"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as TemplateVariable["type"],
              }))
            }
            className="px-2 py-1 text-xs border rounded focus:outline-none"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="date">date</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) =>
                setDraft((d) => ({ ...d, required: e.target.checked }))
              }
            />
            Required
          </label>
        </div>
        <input
          placeholder="Default value (optional)"
          value={draft.defaultValue ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, defaultValue: e.target.value || undefined }))
          }
          className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={add}
          disabled={!draft.name.trim()}
          className="flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </div>
  );
}
