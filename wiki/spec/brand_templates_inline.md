# Spec: Brand-bound caption templates (Phase B of Forge text rework)

> Status: **DRAFT, 2026-05-12.** Phase B of the Forge text rework. Phase A (sharper prompts + 3-variant picker + ENHANCE) shipped in commit `ec2896d`.

## 1. Why

Phase A made the AI side of text generation usable. But Doug runs the same kind of event week after week (Sound Cave nights, Melomania nights). The "best" caption for a Friday club night is often a tweak of last week's. Today he'd have to:

- Open last week's Stash entry
- Copy the text manually
- Paste into the Forge textarea
- Edit

That's a usable workaround, but it's friction every single time. The wins:

1. **Save a great caption against a brand once.** Next time he opens that brand, the template is a click away.
2. **Templates are per-brand**, so Sound Cave templates don't pollute Melomania's, and vice versa. The brand selector at the top of the Forge already locks the "current brand" — templates inherit from that.
3. **Plain text starters** — no placeholders, no `{{event}}` substitution. Doug clicks a template, the text lands in the draft area, he edits it. Simplest possible thing.

This is also explicitly the "Phase B" the locked decisions from Phase A planning called out.

## 2. Locked decisions (carried from Phase A planning)

- **Templates store plain text.** No `{{placeholder}}` substitution (deferred to a Phase C if it comes up).
- **Inline management only.** No separate "Templates" tab or section in BRANDS. A small "Save as template" button in Firepit + a dropdown is the entire UI surface.
- **One brand → many templates.** Each brand kit owns its own list, stored as JSON on the kit row.

## 3. Data shape

Add a `templates` jsonb column to `brand_kits`:

```jsonc
brand_kits.templates = [
  {
    "id": "1715520000-a7b3",     // timestamp-suffix-random; client-generated, no real uniqueness needs
    "name": "Friday club night",  // user-supplied, ≤80 chars
    "text": "Doors at 23:00...",   // the caption body
    "content_type": "event_promo", // OPTIONAL — if set, the template only shows for that content type
    "created_at": "2026-05-12T20:30:00Z"
  },
  ...
]
```

Defaults to `[]`. Migration is a single `ALTER TABLE` adding the column with `default '[]'::jsonb`.

`content_type` is optional v1 affordance — templates created in the Forge auto-tag with the currently-selected content type so the dropdown can filter. A template with no `content_type` shows for all types (a "general" template).

## 4. API surface

No new endpoints. The existing `/api/brand_kits/<id>` PATCH endpoint already accepts arbitrary fields from `BRAND_KIT_FIELDS`. We add `'templates'` to that tuple — done.

The frontend reads templates from the in-memory `_brandKits` cache (already populated by `loadBrandKits()` in `js/firepit.js`) and writes them via a single PATCH per save/delete.

## 5. UI

### Top-of-Forge — template picker next to the brand selector

```
┌──── INPUT ────────────────────────────────┐
│ BRAND                                      │
│ ┌─────────────────────────┐ ┌──┐           │
│ │ S0UNDCAV3              ▾│ │⚙│           │
│ └─────────────────────────┘ └──┘           │
│                                            │
│ TEMPLATE                                   │
│ ┌─────────────────────────┐                │
│ │ — None —               ▾│                │
│ └─────────────────────────┘                │
│                                            │
│ CONTENT TYPE                               │
│ ... (existing)                             │
```

- **`#forgeTemplateSelect`** — new `<select>` row directly below the Brand row.
- Repopulates whenever the brand or content type changes.
- Options filtered to: templates tagged with the current content type, plus any general (`content_type: null`) templates.
- Picking a template → loads `template.text` into the draft area.
  - If we're in variant mode and no variant is picked yet → load into a fresh editable textarea (skipping the variant picker for this generation).
  - If a variant is already picked → confirm before clobbering the textarea (same pattern as variant-switch confirm).

### `#forgeActions` — new "SAVE TEMPLATE" button

Add a new button in the actions row alongside ENHANCE / SHORTER / LONGER / CHANGE TONE:

- Disabled unless a brand kit is currently selected at the top of the form.
- On click → prompts for a name (browser `prompt` for v1; no inline form needed), defaults to a sensible suggestion (e.g. the event field or "Untitled template").
- POSTs the new template to the current brand via `PATCH /api/brand_kits/<id>` with the updated full `templates` array.
- Updates the local cache + dropdown immediately.

### Delete

`<option>` items in the picker have no native delete affordance. v1: a single "MANAGE TEMPLATES" link below the dropdown opens a tiny modal listing the brand's templates with a delete icon next to each. Save and dropdown re-render.

Alternative considered + rejected: shift-click to delete. Too undiscoverable.

## 6. Empty / edge states

- **No brand selected** → template row hidden entirely. (No brand = no template list to show.)
- **Brand has no templates** → dropdown shows "— No templates saved yet —", disabled.
- **Save attempted with no brand** → button disabled, tooltip "Pick a brand first."
- **Template name empty or too long** → re-prompt with the error.
- **Template name duplicate** → allow; templates have unique IDs, names are display-only.

## 7. Out of scope

- `{{placeholder}}` substitution (Phase C if requested)
- Drag-to-reorder templates
- Shared templates across brands
- Templates on the BRANDS page (rejected in Phase A planning — inline only)
- Importing templates from existing stash items (interesting but separate plan)

## 8. Verification

1. **Migration applies** in Supabase: `ALTER TABLE brand_kits ADD COLUMN templates jsonb NOT NULL DEFAULT '[]'::jsonb;` runs clean. Existing brand kits get `[]` automatically.
2. **PATCH round-trip**: fetch a brand kit → `templates: []`. PATCH with `{templates: [{...}]}` → next fetch returns the array.
3. **UI smoke**: pick S0UNDCAV3 → template select shows "— No templates saved yet —" disabled. Generate a piece of content, edit it, click SAVE TEMPLATE → prompted for a name → saved. Reload page. Pick S0UNDCAV3 again → template now in dropdown. Pick it → text lands in draft area.
4. **Per-brand isolation**: create a second brand kit, save a different template there. Switch between brands — each shows only its own templates.
5. **Per-content-type filter**: save an event_promo template, then switch to social_post — the event_promo template no longer appears in the picker (filtered out).

## Related

- `wiki/spec/forge_text_rework.md` — Phase A (the parent rework)
- `wiki/spec/brand_overlay_compositor.md` — original brand kit architecture
- `js/firepit.js` `_brandKits` cache + `_selectedBrandKit()` — reuse for template lookups
