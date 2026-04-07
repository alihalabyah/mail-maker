# i18n (EN/AR) + Template Versioning Design

**Date:** 2026-04-07
**Status:** Approved

## Problem

Templates need to support English and Arabic (RTL) variants, and editors need to iterate on templates safely with a draft/publish lifecycle and version history.

## Requirements

- Each template can have an English and an Arabic variant, editable independently in Unlayer
- Arabic editor renders RTL natively
- Draft/published status — the render API always serves the latest **published** version
- Version history per template with restore capability
- If a requested locale has no published version → 404 (no silent fallback)

## Approach

Locale variants are sibling template rows sharing a `baseSlug`. Versioning is a separate `TemplateVersion` table storing immutable snapshots. The `Template` row is always the working draft; publishing creates a snapshot and updates `currentVersionId`.

---

## Data Model

### Changes to `Template`

| Field | Type | Notes |
|---|---|---|
| `baseSlug` | String | Replaces `slug` as the human-readable identifier. Unique per locale. |
| `locale` | String | `"en"` or `"ar"`, default `"en"` |
| `status` | String | `"draft"` or `"published"` |
| `currentVersionId` | String? | FK → latest published `TemplateVersion`. Null until first publish. |

**Unique constraint:** `(baseSlug, locale)`

The existing `slug` field is kept as a generated `baseSlug-locale` value (e.g. `transaction-successful-ar`) for backwards compatibility. Existing slugs are unchanged for English templates.

### New `TemplateVersion` table

```prisma
model TemplateVersion {
  id           String   @id @default(cuid())
  templateId   String
  template     Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  version      Int
  htmlTemplate String   @db.Text
  designJson   Json
  subject      String
  variables    Json
  publishedAt  DateTime @default(now())
  publishedById String
  publishedBy  User     @relation(fields: [publishedById], references: [id])

  @@unique([templateId, version])
}
```

Versions are immutable — never edited after creation.

---

## Render API

**Endpoint:** `POST /v1/render/:baseSlug?locale=en`

- `locale` defaults to `"en"` if omitted
- Resolution: find `Template` where `baseSlug = :baseSlug AND locale = :locale`
- If not found → **404** `"No :locale version exists for this template"`
- If `currentVersionId` is null → **404** `"Template has no published version"`
- Load `TemplateVersion` by `currentVersionId`, render its `htmlTemplate`
- Response shape unchanged: `{ html, subject }`

**Backwards compatibility:** Existing callers that omit `locale` continue to work — they get the English published version.

---

## Publishing & Versioning

### Publish flow
1. Snapshot current draft (`htmlTemplate`, `designJson`, `subject`, `variables`) into a new `TemplateVersion` row
2. `version` number auto-increments per template (1, 2, 3…)
3. Update `Template.currentVersionId` to the new version ID
4. Draft remains editable — publishing does not lock it

### Version history
- List endpoint returns all versions: version number, publishedAt, publishedBy (no HTML)
- Restore: copies a version's content back into the draft fields — does NOT auto-publish; user reviews and publishes manually

### New API endpoints (JWT-guarded)

| Method | Route | Description |
|---|---|---|
| POST | `/templates/:id/publish` | Snapshot draft → new TemplateVersion |
| GET | `/templates/:id/versions` | List all published versions (summary) |
| POST | `/templates/:id/versions/:versionId/restore` | Copy version content back to draft |

---

## UI Changes

### Template list page
- Locale badge per row: `EN` / `AR`
- Status badge: `Draft` / `Published`
- Templates sharing a `baseSlug` are grouped — EN and AR shown as sibling rows in the same group

### Template editor page
- **Locale tabs** at the top: `EN | AR`
  - Clicking a tab navigates to that locale's editor
  - If the variant doesn't exist: tab shows `+ Create AR version` which pre-fills `baseSlug` and sets `locale: "ar"`
- **Publish button** in the header (alongside Save Draft)
- **Status indicator**: `Draft` (unpublished changes) or `Published`
- **Version history panel** in the sidebar: collapsible, lists versions with publishedAt, publishedBy, and a Restore button per version

### Arabic editor
- Unlayer initialized with `locale: 'ar'` and `textDirection: 'rtl'` in its options — native Unlayer support, no custom code needed

---

## Migration

Existing templates:
- `slug` becomes `baseSlug` (value unchanged)
- `locale` defaults to `"en"`
- `status` defaults to `"draft"`
- `currentVersionId` starts as null — existing templates need a one-time publish action to activate the new render path, OR a migration that creates a v1 snapshot for each existing template

The migration will auto-create a `TemplateVersion` v1 for every existing template so the render API continues to work without any caller changes.
