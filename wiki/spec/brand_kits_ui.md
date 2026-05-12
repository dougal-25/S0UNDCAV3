# Brand Kits page — UI spec

> Status: **DRAFT — awaiting Doug sign-off, 2026-05-12.** No HTML/CSS/JS until approved.
> Sits inside the Brand Overlay Compositor build: see `wiki/spec/brand_overlay_compositor.md` for the architecture; this is Phase 2 (the *management* surface). The compositor itself is Phase 3.

## Framing (the 5 questions)

**Location:** New top-nav pill `[BRANDS]`, added after `[FIREPIT]` and before `[REFLECTION]`. Same tall-pill geometry as the rest of the header (see `wiki/spec/reflection_tab.md` build notes).

**References:** None external. Stay strictly **in-family** with the rest of the Sound Cave dark theme — same glass panels, same DM Mono / DM Sans, same orange-ember accents from `tokens.css`. The reference *is* the rest of the app.

**Mood/feel:** Designer's toolbox — tactile and crafted. Each brand kit is a substantial card showing logo + palette swatches + font preview at a glance, treated like a creative artefact. Not a settings list, not a portfolio gallery, not a Canva grid.

**Hero moment:** Creating a kit. The moment you upload a logo + font and pick a palette, the kit card *comes alive* — the logo appears, the swatches fill in, the headline text re-renders in the new display font. The build-up of the kit IS the magic, not the management of it.

**Anti-examples:**
- Adobe Creative Cloud — bloated, 47 panels, hostile density.
- Canva — consumer-cute, rounded everything, friendly emoji, bouncy.
- Generic SaaS settings (Stripe, Zendesk) — grey form fields, label-on-top inputs, enterprise admin energy.

**Constraints:** Desktop-first. Dark theme only. All values from `tokens.css` — no hardcoded hex/px in feature CSS where avoidable. UI typography is DM Mono / DM Sans; *uploaded* brand fonts are obviously different and only used inside the preview area of their kit's card. No mobile drag/upload polish in v1.

## Page anatomy

```
┌────────────────────────────────────────────────────────────┐
│ [SOUNDCAVE] [CAVE] [FORAGING] [FIREPIT] [BRANDS] [REFL] 🔊  │ ← shared header
├────────────────────────────────────────────────────────────┤
│                                                            │
│  BRANDS                            [ + New brand kit ]     │ ← page header
│  ──────                                                    │
│                                                            │
│  ┌────────────────────┐  ┌────────────────────┐            │
│  │  [logo]            │  │  [logo]            │            │
│  │  MELOMANIA         │  │  SOUND CAVE        │            │ ← kit cards (grid)
│  │  ● ● ● ●           │  │  ● ● ● ●           │            │
│  │  "Aa" Druk Wide    │  │  "Aa" DM Mono      │            │
│  │  edit ▸  delete    │  │  edit ▸  delete    │            │
│  └────────────────────┘  └────────────────────┘            │
│                                                            │
│  ┌────────────────────┐                                    │
│  │  + Add brand kit   │                                    │ ← empty-add tile
│  └────────────────────┘                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Kit card (collapsed state)

Each card is ~280×320px, glass panel from the existing token system. Contents top-down:

1. **Logo strip** (top, ~80px tall) — the uploaded logo PNG/SVG, centred, on a flat panel-tint background so the logo "sits in" the card rather than floating.
2. **Name** — uppercase, DM Mono, wide tracking, like the existing tab labels.
3. **Palette row** — 4 circular swatches (primary, accent, text, text_stroke). 24px each. Sound Cave–dark border around each so palette is legible against the card background.
4. **Font preview** — `Aa` rendered in the uploaded display font + small caption `"Druk Wide Heavy"` (or whatever the user named it). If no font uploaded yet, falls back to DM Sans and shows `(default)`.
5. **Actions row** — `edit` button (primary), `delete` button (subdued, confirmation needed).

### Empty-add tile

When the user has zero kits OR as the trailing tile when they have ≥1, a dashed-border tile with a single `+ Add brand kit` action. Single click → opens the kit editor in `create` mode.

### Empty state (zero kits)

The grid is replaced by a centred prompt:

> **No brand kits yet.**
> A brand kit holds your logo, fonts, and colours so every poster, lineup, and social post looks like *you*.
> [ Create your first brand kit ]

## Kit editor (create / edit)

Single panel that slides in over the page (NOT a modal — full-page mode swap, same pattern as the Reflection password form reveal). Layout split:

```
┌──────────────────── LEFT (inputs) ──────┬──── RIGHT (live preview) ────┐
│ Name        [ Melomania            ]    │  ┌────────────────────────┐  │
│                                         │  │   [logo]               │  │
│ Logo        [ drag a PNG/SVG, or pick ] │  │   MELOMANIA            │  │
│ Display font[ drag a .woff2/.ttf, or pick ] │  ● ● ● ●            │  │
│ Body font   [ drag a .woff2/.ttf, or pick ] │  Aa Druk Wide       │  │
│                                         │  └────────────────────────┘  │
│ Palette                                 │                              │
│   primary    [#3FB7E9] swatch           │  (live updates as inputs     │
│   accent     [#F5A8C9] swatch           │   change — this is the hero) │
│   text       [#FFFFFF] swatch           │                              │
│   text_strk  [#000000] swatch           │                              │
│                                         │                              │
│ Default logo position                   │                              │
│   ( ) tl  (●) tc  ( ) tr                │                              │
│   ( ) c                                 │                              │
│   ( ) bl  ( ) bc  ( ) br                │                              │
│                                         │                              │
│ Logo scale  [───●──────]  18%           │                              │
│                                         │                              │
│ [ Cancel ]              [ Save kit ]    │                              │
└─────────────────────────────────────────┴──────────────────────────────┘
```

### Hero behaviour — "click into place"

Each time an input changes, the right-hand preview re-renders within ~50ms:

- Upload logo → preview shows it instantly via local `URL.createObjectURL`.
- Upload font → preview's `Aa` swaps fonts via dynamic `@font-face` injection from local object URL.
- Change a palette colour → swatches and "MELOMANIA" headline text re-tint live.
- The preview card visually matches the BRANDS-page kit card design, so what you see on the right is *exactly* what'll sit on the page after you save.

No "preview" / "draft" / "publish" lag. Local-first preview, persisted only on Save.

### Validation

- **Name** required, ≥2 chars, ≤64 chars.
- **Logo** required only on save (allow editor to open without a logo first).
- **Fonts** optional — if absent, brand kit falls back to DM Sans for both display + body.
- **Palette** all four colours required (auto-seeded with sensible defaults on create).
- File size: 5MB per asset (mirrors backend `/api/brand_assets/upload` cap).
- File types: PNG, SVG, JPEG, WebP (logo); woff2, woff, ttf, otf (fonts).

### Save flow

1. Click `Save kit`.
2. For each new file (logo, display_font, body_font) → multipart POST to `/api/brand_assets/upload` → get public URL.
3. If new kit → POST `/api/brand_kits` with `{name, logo_url, ..., palette, defaults}`.
   If editing → PATCH `/api/brand_kits/<id>` with the changed fields only.
4. On success → slide back to grid, new/updated card animates in.
5. On error → inline error in the editor; no partial state (failed uploads are abandoned, kit not saved).

### Delete flow

Click `delete` on a card → confirm dialog (`Delete "Melomania"? This can't be undone.`) → `DELETE /api/brand_kits/<id>` → card fades + grid reflows. Assets are NOT deleted from Storage (cheap, and protects against accidental delete; cleanup is a future janitor job).

## Files this spec will create / modify (Phase 2 only)

**New:**
- `js/brands.js` — page logic: load kits, render grid, open editor, save/delete
- `css/brands.css` — kit card, grid, editor layout (all values via `tokens.css`)
- `wiki/spec/brand_kits_ui.md` — this file

**Modified:**
- `index.html` — `[BRANDS]` pill in header, new `#tab-brands` page section, editor panel inside it
- `js/app.js` — register `'brands'` in `TOP_TABS`, lazy-call `window.refreshBrands()` on tab switch
- `css/style.css` — only if a token is missing; otherwise zero edits here
- `wiki/log.md` — entry after ship

## Out of scope (v1 — explicit)

- Mobile drag-upload polish
- Drag-to-reorder kits
- Duplicating a kit
- Sharing a kit with another user
- More than one display font + one body font per kit
- Editing default layouts beyond logo position + scale (other layer defaults stay in code for v1)
- Importing brand from a website URL (Brandfetch-style)

## Verification

1. Open BRANDS tab — empty state renders, "Create your first brand kit" CTA visible.
2. Create kit "Test Brand" with a logo PNG, no fonts, default palette → save → card appears in grid with logo, default palette swatches, DM Sans `Aa`.
3. Edit kit → swap logo, upload a Druk Wide woff2, change primary colour → preview updates live during edit → save → card re-renders with new logo + new font + new colour.
4. Delete kit → confirm → card disappears, grid reflows. Refresh page → still gone.
5. Same flow, second kit. Both visible side-by-side.
6. Sign out → another user signs in → does NOT see kit 1 (RLS works).

## Related

- `wiki/spec/brand_overlay_compositor.md` — the architecture this is one phase of
- `wiki/spec/reflection_tab.md` — the precedent for tall-pill nav + full-page sections
- `tokens.css` — palette and motion tokens to reuse
