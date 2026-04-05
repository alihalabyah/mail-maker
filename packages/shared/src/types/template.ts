export interface TemplateVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface TemplateSummary {
  id: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}
