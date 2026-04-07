# i18n (EN/AR) + Template Versioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add English/Arabic locale variants and a draft/publish versioning system to templates, so the render API always serves the latest published version and callers can request a specific locale.

**Architecture:** The `Template` model gains `baseSlug`, `locale`, `status`, and `currentVersionId`. A new `TemplateVersion` table stores immutable published snapshots. The render API resolves by `baseSlug + locale`, reads from the published version. The UI gets locale tabs in the editor and a publish button + version history panel.

**Tech Stack:** NestJS 11, Prisma v6, PostgreSQL, Next.js 15 App Router, TanStack Query, Unlayer (react-email-editor).

---

## Task 1: Prisma — schema migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Update `Template` model**

Add these fields to the `Template` model and update the `User` relation:

```prisma
model Template {
  id               String            @id @default(cuid())
  slug             String            @unique   // kept for backwards compat, derived as baseSlug[-locale]
  baseSlug         String
  locale           String            @default("en")
  status           String            @default("draft")  // "draft" | "published"
  name             String
  description      String?
  subject          String
  designJson       Json
  htmlTemplate     String            @db.Text
  variables        Json              @default("[]")
  currentVersionId String?
  currentVersion   TemplateVersion?  @relation("CurrentVersion", fields: [currentVersionId], references: [id])
  versions         TemplateVersion[] @relation("AllVersions")
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  createdById      String
  createdBy        User              @relation(fields: [createdById], references: [id])

  @@unique([baseSlug, locale])
}
```

**Step 2: Add `TemplateVersion` model**

```prisma
model TemplateVersion {
  id            String   @id @default(cuid())
  templateId    String
  template      Template @relation("AllVersions", fields: [templateId], references: [id], onDelete: Cascade)
  version       Int
  htmlTemplate  String   @db.Text
  designJson    Json
  subject       String
  variables     Json
  publishedAt   DateTime @default(now())
  publishedById String
  publishedBy   User     @relation(fields: [publishedById], references: [id])

  // Back-reference for currentVersion on Template (one-to-one optional)
  currentFor    Template[] @relation("CurrentVersion")

  @@unique([templateId, version])
}
```

**Step 3: Add `templateVersions` to User model**

In the `User` model, add:
```prisma
templateVersions TemplateVersion[]
```

**Step 4: Run migration**

```bash
cd /home/ali/projects/qashio/mail-maker/apps/api
npx prisma migrate dev --name add_locale_versioning
```

Expected: Migration created and applied, no errors.

**Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

**Step 6: Verify**

```bash
docker exec mail-maker-postgres-1 psql -U mailmaker -d mailmaker -c "\d \"Template\""
docker exec mail-maker-postgres-1 psql -U mailmaker -d mailmaker -c "\d \"TemplateVersion\""
```

Expected: Both tables exist with correct columns.

**Step 7: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/api/prisma/
git commit -m "feat(db): add baseSlug, locale, status, versioning to Template"
```

---

## Task 2: Data migration — seed existing templates with baseSlug + v1 snapshot

Existing templates need `baseSlug` and `locale` populated, and a v1 `TemplateVersion` snapshot so the render API can serve them.

**Files:**
- Create: `apps/api/prisma/migrate-add-versioning.ts`

**Step 1: Create migration script**

```typescript
// apps/api/prisma/migrate-add-versioning.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.template.findMany();
  console.log(`Migrating ${templates.length} templates...`);

  for (const t of templates) {
    // Derive baseSlug: strip trailing "-ar" if present, else use slug as-is
    const baseSlug = t.slug.endsWith('-ar') ? t.slug.slice(0, -3) : t.slug;
    const locale = t.slug.endsWith('-ar') ? 'ar' : 'en';

    // Create v1 snapshot
    const version = await prisma.templateVersion.create({
      data: {
        templateId: t.id,
        version: 1,
        htmlTemplate: t.htmlTemplate,
        designJson: t.designJson as object,
        subject: t.subject,
        variables: t.variables as object,
        publishedById: t.createdById,
      },
    });

    // Update template
    await prisma.template.update({
      where: { id: t.id },
      data: {
        baseSlug,
        locale,
        status: 'published',
        currentVersionId: version.id,
      },
    });

    console.log(`  ✓ ${t.slug} → baseSlug="${baseSlug}" locale="${locale}" v1 created`);
  }

  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Run migration script**

```bash
cd /home/ali/projects/qashio/mail-maker/apps/api
npx ts-node --compiler-options '{"types":["node"]}' prisma/migrate-add-versioning.ts
```

Expected: All templates logged with ✓, no errors.

**Step 3: Verify**

```bash
docker exec mail-maker-postgres-1 psql -U mailmaker -d mailmaker \
  -c 'SELECT slug, "baseSlug", locale, status, "currentVersionId" FROM "Template" LIMIT 5;'
```

Expected: All rows have `baseSlug`, `locale="en"`, `status="published"`, non-null `currentVersionId`.

**Step 4: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/api/prisma/migrate-add-versioning.ts
git commit -m "feat(db): data migration — populate baseSlug, locale, v1 snapshots"
```

---

## Task 3: API — update TemplatesService for locale + versioning

**Files:**
- Modify: `apps/api/src/templates/templates.service.ts`
- Modify: `apps/api/src/templates/dto/create-template.dto.ts`
- Modify: `apps/api/src/templates/dto/update-template.dto.ts`

**Step 1: Update `CreateTemplateDto`**

Add optional `locale` and `baseSlug` fields:

```typescript
@ApiPropertyOptional({ example: 'en', enum: ['en', 'ar'] })
@IsOptional()
@IsString()
locale?: string;

@ApiPropertyOptional({ example: 'welcome-email' })
@IsOptional()
@IsString()
@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Lowercase, hyphens only' })
baseSlug?: string;
```

**Step 2: Update `TemplatesService.create`**

- Derive `baseSlug` from `dto.baseSlug ?? dto.slug`
- Derive `locale` from `dto.locale ?? 'en'`
- Derive `slug` as `locale === 'en' ? baseSlug : \`${baseSlug}-${locale}\``
- Check `@@unique([baseSlug, locale])` conflict in addition to slug conflict
- Set `status: 'draft'`

Updated create data block:
```typescript
const baseSlug = dto.baseSlug ?? dto.slug;
const locale = dto.locale ?? 'en';
const slug = locale === 'en' ? baseSlug : `${baseSlug}-${locale}`;

// Check baseSlug+locale uniqueness
const existing = await this.prisma.template.findUnique({
  where: { baseSlug_locale: { baseSlug, locale } },
});
if (existing) throw new ConflictException(`A ${locale} version of "${baseSlug}" already exists`);

return this.prisma.template.create({
  data: {
    slug,
    baseSlug,
    locale,
    status: 'draft',
    name: dto.name,
    // ... rest of fields
  },
});
```

**Step 3: Add `publish` method to TemplatesService**

```typescript
async publish(id: string, userId: string) {
  const template = await this.prisma.template.findUnique({ where: { id } });
  if (!template) throw new NotFoundException('Template not found');

  // Get next version number
  const lastVersion = await this.prisma.templateVersion.findFirst({
    where: { templateId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const version = await this.prisma.templateVersion.create({
    data: {
      templateId: id,
      version: nextVersion,
      htmlTemplate: template.htmlTemplate,
      designJson: template.designJson as object,
      subject: template.subject,
      variables: template.variables as object,
      publishedById: userId,
    },
  });

  return this.prisma.template.update({
    where: { id },
    data: { currentVersionId: version.id, status: 'published' },
  });
}
```

**Step 4: Add `listVersions` method**

```typescript
async listVersions(id: string) {
  return this.prisma.templateVersion.findMany({
    where: { templateId: id },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      subject: true,
      publishedAt: true,
      publishedBy: { select: { id: true, email: true } },
    },
  });
}
```

**Step 5: Add `restoreVersion` method**

```typescript
async restoreVersion(id: string, versionId: string) {
  const version = await this.prisma.templateVersion.findFirst({
    where: { id: versionId, templateId: id },
  });
  if (!version) throw new NotFoundException('Version not found');

  return this.prisma.template.update({
    where: { id },
    data: {
      htmlTemplate: version.htmlTemplate,
      designJson: version.designJson as object,
      subject: version.subject,
      variables: version.variables as object,
      status: 'draft',
    },
  });
}
```

**Step 6: Update `findAll` to include `baseSlug`, `locale`, `status` in select**

In the `findMany` select block, add:
```typescript
baseSlug: true,
locale: true,
status: true,
```

**Step 7: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/api/src/templates/
git commit -m "feat(api): add locale, publish, versions, restore to TemplatesService"
```

---

## Task 4: API — add publish/versions/restore endpoints to TemplatesController

**Files:**
- Modify: `apps/api/src/templates/templates.controller.ts`

**Step 1: Add three new endpoints**

```typescript
@Post(':id/publish')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Publish current draft as a new version' })
publish(@Param('id') id: string, @CurrentUser() user: User) {
  return this.templatesService.publish(id, user.id);
}

@Get(':id/versions')
@ApiOperation({ summary: 'List all published versions for a template' })
listVersions(@Param('id') id: string) {
  return this.templatesService.listVersions(id);
}

@Post(':id/versions/:versionId/restore')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Restore a version back to draft' })
restoreVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
  return this.templatesService.restoreVersion(id, versionId);
}
```

**Step 2: Build verification**

```bash
cd /home/ali/projects/qashio/mail-maker/apps/api && npm run build 2>&1 | tail -20
```

Fix any TypeScript errors.

**Step 3: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/api/src/templates/templates.controller.ts
git commit -m "feat(api): add publish, listVersions, restoreVersion endpoints"
```

---

## Task 5: API — update render service to use baseSlug + locale + published version

**Files:**
- Modify: `apps/api/src/render/render.service.ts`
- Modify: `apps/api/src/render/render.controller.ts`
- Modify: `apps/api/src/render/dto/render-request.dto.ts`

**Step 1: Update `RenderRequestDto` to include locale**

```typescript
@ApiPropertyOptional({ example: 'en', enum: ['en', 'ar'], default: 'en' })
@IsOptional()
@IsString()
locale?: string;
```

**Step 2: Update `RenderService.getTemplate`**

The method now takes an optional `locale` and resolves by `baseSlug + locale` against the published version:

```typescript
async getTemplate(idOrSlug: string, locale = 'en') {
  // Try by ID first
  let template = await this.prisma.template.findUnique({ where: { id: idOrSlug } });

  // Then by baseSlug + locale
  if (!template) {
    template = await this.prisma.template.findUnique({
      where: { baseSlug_locale: { baseSlug: idOrSlug, locale } },
    });
  }

  // Legacy: fall back to slug lookup
  if (!template) {
    template = await this.prisma.template.findUnique({ where: { slug: idOrSlug } });
  }

  if (!template) throw new NotFoundException(`Template "${idOrSlug}" not found`);

  if (!template.currentVersionId) {
    throw new NotFoundException(
      `Template "${idOrSlug}" (${locale}) has no published version`,
    );
  }

  // Load the published version
  const version = await this.prisma.templateVersion.findUnique({
    where: { id: template.currentVersionId },
  });

  if (!version) throw new NotFoundException('Published version not found');

  return { ...template, htmlTemplate: version.htmlTemplate, subject: version.subject, variables: version.variables, designJson: version.designJson };
}
```

**Step 3: Update `render` method signature to pass locale**

```typescript
async render(idOrSlug: string, variables: Record<string, unknown>, locale = 'en') {
  const template = await this.getTemplate(idOrSlug, locale);
  // ... rest unchanged
}
```

**Step 4: Update `RenderController.render` to pass locale from query param**

```typescript
@Post('render/:idOrSlug')
@ApiOperation({ summary: 'Render a template with variable substitution' })
@ApiQuery({ name: 'locale', required: false, example: 'en' })
render(
  @Param('idOrSlug') idOrSlug: string,
  @Body() dto: RenderRequestDto,
  @Query('locale') locale?: string,
) {
  return this.renderService.render(idOrSlug, dto.variables, locale ?? 'en');
}
```

**Step 5: Build verification**

```bash
cd /home/ali/projects/qashio/mail-maker/apps/api && npm run build 2>&1 | tail -20
```

**Step 6: Smoke test**

```bash
API_KEY="mk_d2bcc471dd7a631a0151e1ddc46c0d28d94ff97b99dd7c7d5b4257ab33959761"

# Should work (published EN version)
curl -s -X POST "http://localhost:3001/v1/render/transaction-successful?locale=en" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"variables":{}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('subject:', d.get('subject','ERR'))"

# Should 404 (no AR version)
curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3001/v1/render/transaction-successful?locale=ar" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"variables":{}}'
```

Expected: first returns `200` with subject, second returns `404`.

**Step 7: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/api/src/render/
git commit -m "feat(api): render resolves by baseSlug+locale from published version"
```

---

## Task 6: Frontend — update types and hooks

**Files:**
- Modify: `apps/web/types/index.ts`
- Modify: `apps/web/hooks/useTemplates.ts`

**Step 1: Add new types to `types/index.ts`**

Update `TemplateSummary` (imported from `@mail-maker/shared`) — we can't change shared but we use the full `Template` interface. Add new fields to the local `Template` interface:

```typescript
export interface Template {
  id: string;
  slug: string;
  baseSlug: string;          // new
  locale: string;            // new — "en" | "ar"
  status: string;            // new — "draft" | "published"
  currentVersionId?: string; // new
  name: string;
  description?: string;
  subject: string;
  designJson: Record<string, unknown>;
  htmlTemplate: string;
  variables: import("@mail-maker/shared").TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersion {
  id: string;
  version: number;
  subject: string;
  publishedAt: string;
  publishedBy: { id: string; email: string };
}
```

**Step 2: Add new hooks to `useTemplates.ts`**

```typescript
export function usePublishTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Template>(`/templates/${id}/publish`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] });
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, id] });
    },
  });
}

export function useTemplateVersions(id: string) {
  return useQuery<TemplateVersion[]>({
    queryKey: [TEMPLATES_KEY, id, 'versions'],
    queryFn: () => api.get<TemplateVersion[]>(`/templates/${id}/versions`),
    enabled: !!id,
  });
}

export function useRestoreVersion(templateId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      api.post<Template>(`/templates/${templateId}/versions/${versionId}/restore`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, templateId] });
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY, templateId, 'versions'] });
    },
  });
}
```

**Step 3: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/web/types/index.ts apps/web/hooks/useTemplates.ts
git commit -m "feat(web): add locale/status types and publish/versions/restore hooks"
```

---

## Task 7: Frontend — update template list page

Show locale badge, status badge, and group sibling variants.

**Files:**
- Modify: `apps/web/app/(dashboard)/templates/page.tsx`

**Step 1: Add locale + status badges to each table row**

After the Name cell, add:

```tsx
<td className="px-4 py-3">
  <div className="flex items-center gap-1.5">
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded uppercase ${
      t.locale === 'ar'
        ? 'bg-purple-100 text-purple-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      {t.locale ?? 'en'}
    </span>
    <span className={`px-1.5 py-0.5 text-xs rounded ${
      t.status === 'published'
        ? 'bg-green-100 text-green-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      {t.status ?? 'draft'}
    </span>
  </div>
</td>
```

Add a "Locale" column header in `<thead>`.

**Step 2: Update `TemplateSummary` usage**

The list page uses `TemplateSummary` from `@mail-maker/shared`. That type doesn't have the new fields yet. Cast via `as unknown as Template` for the badge rendering, or extend the type in `types/index.ts`:

```typescript
export interface TemplateSummary {
  id: string;
  slug: string;
  baseSlug?: string;
  locale?: string;
  status?: string;
  name: string;
  description?: string;
  subject: string;
  variables: unknown[];
  createdAt: string;
  updatedAt: string;
}
```

Override the shared export in `types/index.ts` by re-declaring locally (the shared package type is used elsewhere only for `TemplateVariable`).

**Step 3: Update "New Template" link**

No change needed — `/templates/new` will gain locale selection in Task 8.

**Step 4: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/web/app/\(dashboard\)/templates/page.tsx apps/web/types/index.ts
git commit -m "feat(web): show locale and status badges on template list"
```

---

## Task 8: Frontend — update New Template page with locale selector

**Files:**
- Modify: `apps/web/app/(dashboard)/templates/new/page.tsx`

**Step 1: Add locale field to the form schema**

```typescript
const metaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseSlug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphens only'),
  locale: z.enum(['en', 'ar']).default('en'),
  description: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
});
```

**Step 2: Add locale toggle to the form**

```tsx
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
```

**Step 3: Pass `locale` and `baseSlug` to `createMutation`**

```typescript
const template = await createMutation.mutateAsync({
  name: meta.name,
  slug: meta.baseSlug, // still required by DTO, will be overridden server-side
  baseSlug: meta.baseSlug,
  locale: meta.locale,
  // ...
});
```

**Step 4: Pass `textDirection` to Unlayer when locale is `ar`**

The `EmailEditorWrapper` needs a new optional prop `locale` that configures Unlayer. In the new template page:
```tsx
<EmailEditorWrapper
  onSave={handleEditorSave}
  saving={saving}
  locale={watchLocale}
/>
```

**Step 5: Update `EmailEditorWrapper` to accept and apply `locale` prop**

In `apps/web/components/editor/EmailEditorWrapper.tsx`, add to props:
```typescript
locale?: 'en' | 'ar';
```

Pass to `<EmailEditor>`:
```tsx
<EmailEditor
  ref={emailEditorRef}
  options={{
    locale: locale === 'ar' ? 'ar-AR' : 'en-US',
    textDirection: locale === 'ar' ? 'rtl' : 'ltr',
  }}
  // ...
/>
```

**Step 6: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/web/app/\(dashboard\)/templates/new/page.tsx apps/web/components/editor/EmailEditorWrapper.tsx
git commit -m "feat(web): add locale selector to new template page, RTL support in Unlayer"
```

---

## Task 9: Frontend — locale tabs + publish button + version history in the template editor

This is the largest frontend task. Read `apps/web/app/(dashboard)/templates/[id]/page.tsx` carefully before editing.

**Files:**
- Modify: `apps/web/app/(dashboard)/templates/[id]/page.tsx`

**Step 1: Add locale tabs in the header**

After fetching the template, also fetch its sibling locale variant (if any):

```typescript
// Find AR sibling (or EN sibling if we're on AR)
const siblingLocale = template.locale === 'en' ? 'ar' : 'en';
// We'll look it up via the templates list — find by baseSlug + siblingLocale
```

The simplest approach: add a secondary query that fetches all templates and finds the sibling:

```typescript
const { data: allTemplates } = useTemplates();
const siblingTemplate = allTemplates?.items?.find(
  (t) => t.baseSlug === template?.baseSlug && t.locale !== template?.locale
);
```

Render locale tabs in the header actions area:

```tsx
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
```

**Step 2: Add Publish button to the header**

```typescript
const publishMutation = usePublishTemplate(id);
```

```tsx
<button
  onClick={() => publishMutation.mutate()}
  disabled={publishMutation.isPending || template.status === 'published'}
  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-40 transition-colors"
>
  {publishMutation.isPending ? 'Publishing…' : template.status === 'published' ? 'Published' : 'Publish'}
</button>
```

**Step 3: Add Version History panel in the sidebar**

Below the Shared Components section, add:

```typescript
const { data: versions } = useTemplateVersions(id);
const restoreMutation = useRestoreVersion(id);
```

```tsx
{versions && versions.length > 0 && (
  <div className="border-t pt-4 space-y-2">
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
```

**Step 4: Pass `locale` prop to `EmailEditorWrapper`**

```tsx
<EmailEditorWrapper
  ref={editorRef}
  initialValues={initialValues}
  onSave={handleEditorSave}
  saving={saving}
  locale={template.locale as 'en' | 'ar'}
/>
```

**Step 5: TypeScript check**

```bash
cd /home/ali/projects/qashio/mail-maker/apps/web && npx tsc --noEmit 2>&1 | head -30
```

Fix all errors.

**Step 6: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/web/app/\(dashboard\)/templates/\[id\]/page.tsx
git commit -m "feat(web): locale tabs, publish button, version history in template editor"
```

---

## Task 10: Frontend — pre-fill new template from locale tab link

When the user clicks `+ ar` in the locale tab, they navigate to `/templates/new?baseSlug=...&locale=ar`. The new template page should read these query params and pre-fill the form.

**Files:**
- Modify: `apps/web/app/(dashboard)/templates/new/page.tsx`

**Step 1: Read query params**

```typescript
import { useSearchParams } from 'next/navigation';
const searchParams = useSearchParams();
const defaultBaseSlug = searchParams.get('baseSlug') ?? '';
const defaultLocale = (searchParams.get('locale') ?? 'en') as 'en' | 'ar';
```

**Step 2: Set as form default values**

```typescript
const { register, handleSubmit, ... } = useForm<MetaForm>({
  resolver: zodResolver(metaSchema),
  defaultValues: {
    baseSlug: defaultBaseSlug,
    locale: defaultLocale,
  },
});
```

**Step 3: Commit**

```bash
cd /home/ali/projects/qashio/mail-maker
git add apps/web/app/\(dashboard\)/templates/new/page.tsx
git commit -m "feat(web): pre-fill new template from locale tab link"
```

---

## Task 11: Push and full smoke test

**Step 1: Push all commits**

```bash
git push
```

**Step 2: Smoke test publish flow**

```bash
JWT=$(curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ali@qashio.com","password":"Xw7#kQ2$mP9@vL4n"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

TMPL_ID=$(docker exec mail-maker-postgres-1 psql -U mailmaker -d mailmaker -t -c "SELECT id FROM \"Template\" WHERE \"baseSlug\"='transaction-successful' AND locale='en';" | xargs)

# Publish
curl -s -X POST http://localhost:3001/templates/$TMPL_ID/publish \
  -H "Authorization: Bearer $JWT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('status:', d.get('status'))"

# List versions
curl -s http://localhost:3001/templates/$TMPL_ID/versions \
  -H "Authorization: Bearer $JWT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), 'versions')"

# Render via external API
curl -s -X POST "http://localhost:3001/v1/render/transaction-successful?locale=en" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mk_d2bcc471dd7a631a0151e1ddc46c0d28d94ff97b99dd7c7d5b4257ab33959761" \
  -d '{"variables":{}}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('subject:', d.get('subject','')[:50])"

# 404 for missing AR
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3001/v1/render/transaction-successful?locale=ar" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mk_d2bcc471dd7a631a0151e1ddc46c0d28d94ff97b99dd7c7d5b4257ab33959761" \
  -d '{"variables":{}}')
echo "AR locale returns: $STATUS (expect 404)"
```

**Step 3: Manual UI smoke test checklist**

1. Open `/templates` — verify locale and status badges appear
2. Open a template editor — verify locale tabs (EN active, + AR link)
3. Click "Publish" — verify button changes to "Published", version appears in history
4. Edit something, save draft — verify status shows "Draft" again (draft differs from published)
5. Click "+ AR" tab — verify lands on `/templates/new?baseSlug=...&locale=ar` pre-filled
6. Create AR template — verify Unlayer loads in RTL mode
7. Publish AR template — verify `/v1/render/:baseSlug?locale=ar` returns 200
8. Restore v1 from version history — verify draft content rolls back
