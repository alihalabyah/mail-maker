# Shared Components Design

**Date:** 2026-04-06
**Status:** Approved

## Problem

All email templates need to share common UI blocks (header, footer, etc.) for brand consistency. Currently every template duplicates these blocks. Updating the footer copy requires editing every template individually.

## Requirements

- Components have their own Handlebars variables
- Updating a component automatically reflects in all templates at next render
- Components are editable in the Unlayer visual editor
- Components appear as locked (non-editable) blocks inside template editors

## Approach: Handlebars Partials with Live Preview Injection

Components are first-class DB entities. Inside templates, they are stored as Handlebars partials (`{{> footer}}`). The Unlayer design JSON holds a locked row with a live HTML preview of the component. At render time, partials are resolved fresh from the DB — guaranteeing live updates across all templates.

---

## Data Model

New `Component` model, mirrors `Template` minus `subject`:

```prisma
model Component {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  description  String?
  designJson   Json
  htmlTemplate String   @db.Text
  variables    Json     @default("[]")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  createdById  String
  createdBy    User     @relation(fields: [createdById], references: [id])
}
```

No changes to the `Template` model. Component references are expressed in `htmlTemplate` as `{{> slug}}` — a standard Handlebars partial syntax.

---

## Render Pipeline

Before Handlebars compiles a template:

1. Scan `htmlTemplate` for `{{> slug}}` patterns (regex)
2. `SELECT * FROM Component WHERE slug IN (...)` — single query, no N+1
3. For each component: compile its `htmlTemplate`, render with merged variables, register as a Handlebars partial
4. Compile and render the template `htmlTemplate` — partials now resolve
5. Return `{ html, subject }`

**Variable scoping:** Template call-site variables take precedence over component defaults. Components declare their own variable schema; defaults are applied if the caller doesn't supply them.

**Live updates:** Partials are loaded fresh per render call. No cache invalidation needed.

---

## Editor Integration

### Unlayer constraints (no source editing required)

- `locked: true` on a **row** in Unlayer design JSON is a native feature — the row cannot be moved, deleted, or edited.
- Unlayer has no native custom panel concept — the Components browser lives in our surrounding React UI.
- Component insertion is done programmatically: `exportDesign()` → append locked row → `loadDesign()`. The user then drags the row into position.

### Component block format in design JSON

```json
{
  "type": "row",
  "locked": true,
  "values": {},
  "columns": [{
    "contents": [{
      "type": "html",
      "values": {
        "html": "<!-- component:footer --><div>...live preview HTML...</div>"
      }
    }]
  }]
}
```

The `<!-- component:slug -->` comment is the marker that survives Unlayer's HTML export.

### On template save

Post-process the exported HTML server-side:

```
<!-- component:footer --><div>...preview...</div>
  → {{> footer}}
```

The resulting string is stored as `htmlTemplate`. The raw `designJson` from Unlayer is stored as-is.

### On template open

Before sending `designJson` to the client, refresh each locked component row: replace the stale preview HTML with the component's current `htmlTemplate` rendered with default variables. Editors always see the live state.

---

## API Surface

### New routes — `/components` (JWT-guarded)

| Method | Path | Description |
|---|---|---|
| GET | `/components` | List all components |
| POST | `/components` | Create component |
| GET | `/components/:id` | Get component (includes designJson) |
| PATCH | `/components/:id` | Update component |
| DELETE | `/components/:id` | Delete component |
| POST | `/components/:id/preview` | Preview rendered HTML |

No changes to the external `v1/render` or `v1/send-test` endpoints.

---

## Frontend

### New pages

- `/components` — list page, same layout as `/templates`
- `/components/new` — create form
- `/components/:id` — Unlayer editor (same as template editor, minus subject field)

### Sidebar navigation

Add "Components" link to the sidebar between Templates and Settings.

### Template editor changes

- Add a **Components panel** below the variables panel in the template editor sidebar
- Lists available components with name + description
- "Add to email" button: fetches component preview HTML, appends a locked row to the current Unlayer design, reloads
- Visual indicator on locked rows: a small "Component" badge rendered via Unlayer's `customJS` or as part of the HTML preview itself

---

## Known Tradeoffs

| Tradeoff | Mitigation |
|---|---|
| Inserted component lands at bottom of email | User drags it into position — standard Unlayer row drag UX |
| Design JSON stores stale preview HTML | Preview is refreshed server-side every time the template is opened |
| Deleting a component breaks templates that use it | Warn on delete: show count of templates referencing the component slug |
