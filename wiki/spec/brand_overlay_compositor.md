# Spec: Brand Overlay Compositor for Firepit Forge

> Status: **DRAFT — awaiting Doug sign-off, 2026-05-12.** No code until approved.

## 1. Why

The Forge currently produces "blank canvas" backgrounds. The system prompt in `media_gen.py:112` deliberately strips text from AI output because diffusion models render text badly (FRIDAY → FREIDY). Brand logos also can't be reproduced by diffusion — FLUX would produce a logo-shaped blob, never a real Melomania M.

To ship usable social content, we need a **two-layer model**:

- **Layer 1 — Background (AI, themeable):** Fal/Replicate generates the *backdrop* — crystalline geometry for one night, graffiti scene for another, foggy warehouse for a third. The AI is good at this and stays in its lane.
- **Layer 2 — Brand overlay (code, never AI):** A deterministic compositor draws the user's real logo PNG, headline text in their real brand font, and supporting text on top of the background. Always the same logo. Always the same font. That's what "consistent" means.

Doug runs Melomania (and may run other nights/acts), so the system supports **multiple brand kits per user** — pick one per generation, get that brand's logo + font + palette.

### What this is NOT (anti-scope)

- Not Canva. No clipart library, no shape tool palette, no infinite layer types.
- Not a font picker. One display font + one body font per brand kit, uploaded by the user. No Google Fonts search.
- Not mobile-first. v1 is desktop only.
- Not "AI restyles your logo per night." That's a separate, later spec.

## 2. Brand Kit data shape

A brand kit represents one visual identity (e.g., "Melomania", "Sound Cave", "BLOC Records").

```jsonc
{
  "id": "uuid",
  "user_id": "uuid",                       // owner; RLS-scoped
  "name": "Melomania",                     // display label in the selector
  "logo_url": "https://.../melomania.png", // PNG or SVG, public read
  "display_font_url": "https://.../druk.woff2",  // headline font
  "body_font_url":    "https://.../sans.woff2",  // supporting font (optional — falls back to display)
  "palette": {
    "primary":  "#3FB7E9",                 // dominant brand colour
    "accent":   "#F5A8C9",
    "text":     "#FFFFFF",
    "text_stroke": "#000000"               // outline for the chunky text look
  },
  "defaults": {
    "logo_position": "top_center",         // top_left|top_center|top_right|center|bottom_*
    "logo_scale": 0.18                     // fraction of canvas width
  },
  "created_at": "..."
}
```

## 3. Layer types (the five)

Every composition is built from exactly these five layer types. No others in v1.

| Layer | Source | Properties (v1) |
|---|---|---|
| **background** | Fal/Replicate output | non-draggable (fills canvas), replaceable via "regenerate" |
| **logo** | brand_kit.logo_url | x, y, scale, rotation (snap 0/90/180/270), opacity |
| **headline_text** | user input | text, x, y, font_size, colour (from palette), stroke_colour, stroke_width, font = brand display font |
| **supporting_text** | user input or auto from `ctx.generated_text` | text (multi-line), x, y, font_size, line_height, colour, font = brand body font |
| **accent_shape** | derived from palette | type=rect, x, y, w, h, fill (from palette), opacity, rotation |

All layers: drag with mouse, resize via corner handles, recolour from brand palette swatches. No free colour picker — palette-locked to keep brand consistency.

## 4. Default layouts per content type

Every generation starts with a default layout — user only drags if they want to. Coordinates are fractions of canvas (0.0–1.0) for resolution independence.

```jsonc
{
  "lineup_poster": {  // 1080x1350
    "logo":           { "x": 0.5, "y": 0.10, "scale": 0.20, "anchor": "center" },
    "headline_text":  { "x": 0.5, "y": 0.22, "size": 0.08, "anchor": "center", "text": "SET TIMES" },
    "supporting_text":{ "x": 0.5, "y": 0.55, "size": 0.04, "anchor": "center", "lines": "auto_from_ctx" }
  },
  "event_promo": {  // 1080x1350
    "logo":           { "x": 0.5, "y": 0.10, "scale": 0.18, "anchor": "center" },
    "headline_text":  { "x": 0.5, "y": 0.78, "size": 0.10, "anchor": "center", "text": "{{event}}" },
    "supporting_text":{ "x": 0.5, "y": 0.88, "size": 0.035, "anchor": "center", "text": "{{date_venue}}" }
  },
  "social_post": {  // 1080x1350
    "logo":           { "x": 0.92, "y": 0.92, "scale": 0.10, "anchor": "bottom_right" },
    "headline_text":  { "x": 0.06, "y": 0.08, "size": 0.07, "anchor": "top_left" },
    "supporting_text":{ "x": 0.06, "y": 0.20, "size": 0.035, "anchor": "top_left" }
  },
  "social_carousel": { /* same as social_post for v1 — per-slide overrides v2 */ },
  "social_short":   {  // 1080x1920
    "logo":           { "x": 0.92, "y": 0.08, "scale": 0.10, "anchor": "top_right" },
    "headline_text":  { "x": 0.5, "y": 0.78, "size": 0.10, "anchor": "center" },
    "supporting_text":{ "x": 0.5, "y": 0.88, "size": 0.04, "anchor": "center" }
  }
}
```

Stored in `js/compositor_templates.js` as a const. Tweakable in code without DB migration.

## 5. Forge flow change

**Today:**
1. User picks content type + voice + ref images → `/api/generate`
2. Backend generates text and (for image content types) calls Fal → returns image URL
3. UI shows the image, user saves to Stash

**With compositor:**
1. User picks content type + voice + ref images + **brand kit** (new dropdown) → `/api/generate`
2. Backend generates text + Fal background — same as today
3. UI hands off to **Compositor View**: Konva stage initialised with default layout for the content type, brand kit applied (logo + fonts + palette), headline pre-filled (auto or user input field), supporting text pre-filled from `ctx.generated_text`
4. User can drag/resize/recolour any of the five layers, or just hit save
5. **Save to Stash:** `stage.toDataURL('image/png')` → blob → existing `/api/stash` upload path; final flat PNG persisted

Text-only content types (`artist_bio`, `press_release`) **skip the compositor entirely** — same flow as today.

## 6. Schema

`db/0008_brand_kits.sql`:

```sql
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  display_font_url TEXT,
  body_font_url TEXT,
  palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brand_kits_user_id_idx ON brand_kits(user_id);

ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_kits_owner_all ON brand_kits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## 7. API surface

All endpoints behind `Authorization: Bearer <jwt>`, resolved via existing `_resolve_user_id()`. Service-role client writes; RLS effectively enforced because we pass `user_id` from the JWT.

| Method | Path | Body / Returns |
|---|---|---|
| GET    | `/api/brand_kits` | → `[{...brand_kit}]` for the authed user |
| POST   | `/api/brand_kits` | `{name, logo_url, display_font_url, body_font_url, palette, defaults}` → new kit |
| PATCH  | `/api/brand_kits/:id` | partial → updated kit |
| DELETE | `/api/brand_kits/:id` | 204 |
| POST   | `/api/brand_assets/upload` | multipart file (logo or font) → `{url}` after Supabase Storage upload |

## 8. Storage

New bucket `brand_assets`, mirroring `generated_images`:

- Public read (so the compositor can `<img>` the logo and `@font-face` the font)
- Owner-folder write policy: `<user_id>/...` paths only
- File-type allowlist: `image/png`, `image/svg+xml`, `font/woff2`, `font/ttf`, `font/otf`
- Size cap: 5MB per file (matches existing ref-image cap)

Migration: `db/0009_brand_assets_bucket.sql` creates the bucket + policies.

## 9. Limitations + future scope

**v1 limitations (explicit):**
- Desktop only — no mobile touch drag
- One display + one body font per brand kit
- Five fixed layer types (no clipart, no extra shapes, no extra text blocks)
- Colours locked to brand palette swatches (no free colour picker)
- No undo/redo (a regenerate or page reload resets the canvas)
- `social_carousel` uses the same template for every slide

**Deferred to future specs:**
- **`wiki/spec/compositor_mobile.md`** (TODO) — touch drag, pinch-resize
- **`wiki/spec/compositor_carousel_per_slide.md`** (TODO) — per-slide layout overrides
- **`wiki/spec/brand_logo_restyle.md`** (TODO) — img-to-img diffusion to restyle the logo per night's theme (the "creative replicate" idea Doug raised). Hardest of the three; needs LoRA/InstantID-style conditioning.

## Related

- `wiki/features/firepit_forge.md` — current Forge feature page (update on ship)
- `wiki/decisions/0005_media_gen.md` — media gen architecture
- `wiki/spec/forge_input_redesign.md` — the previous Forge input change (uncommitted, awaiting visual confirm)
- `brand/README.md` — Sound Cave's own brand assets (separate from user-created brand kits)
