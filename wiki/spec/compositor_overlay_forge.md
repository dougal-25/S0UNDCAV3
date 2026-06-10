# Compositor Overlay for Forge posters — UI spec

> Status: **Draft — awaiting Doug's sign-off** (2026-06-10). Closes the open "shippable poster" gap left after the restyle browser-confirm. Related: [forge_output_recipes.md](forge_output_recipes.md), `brand_overlay_compositor.md`, `js/compositor.js`.

## The problem
The Forge restyle path (FLUX.2 `/edit`) clones an uploaded flyer's *style* beautifully but **bakes garbled text into the pixels** — not shippable. The Konva compositor that lays legible text on top already exists and is wired into Forge, but it **only mounts when a brand kit is selected** (`js/firepit.js:795 → if (_brand && …)`). With "— No brand kit —" (the common case) you get the flat garbled image and no overlay.

## The fix (two locked decisions, 2026-06-10)
1. **Clean backdrop + overlay.** `build_restyle_prompt` recreates the flyer's *style / palette / texture / composition* but **minimises or omits large baked text**, leaving clean type zones. The compositor then lays the legible event text on top. (FLUX.2 may not fully obey "no text" — acceptable; the overlay is the source of truth and covers the hero zones.)
2. **Auto-mount with S0UNDCAV3 defaults.** For poster types the compositor mounts **even with no brand kit**, styling text with the locked S0UNDCAV3 palette + fonts (no logo unless a brand is chosen). Selecting a brand still layers logo/fonts/palette on top as today.

---

## 5-question framing

**References:** `wiki/design_references/forge_output_refs.md` (approved per-type boards); the 4 bake-off flyers (riso / grunge / neon / chrome) the restyle already proved against. The compositor's own visual language is locked in `brand_overlay_compositor.md`.

**Mood/feel:** Underground dance flyer — the styled backdrop carries the scene's grit (riso grain, halftone, distress); the overlaid text is the *clean, confident* counterpoint that makes it readable and ownable. Feels like a real promoter's poster, not an AI artefact.

**Hero moment:** One generation → a **shippable poster**: faithfully-styled backdrop with crisp, legible `DATE · VENUE · LINEUP` laid on top, draggable/editable, flattened on SAVE TO STASH. The "wow" is that the garble is gone and the text looks placed, not pasted.

**Anti-examples:** Garbled-text AI posters (the current restyle output). Generic Canva/template overlays (centered white text in a box). Anything that flips the non-negotiable dark palette to light.

**Constraints:** S0UNDCAV3 dark palette is non-negotiable (`--bg #0f0d0c`, accent `--red #ff4500`, heading `#f5f5f5`, body `#e0dcd9`); fonts DM Mono (display) / DM Sans (body). 1080×1350 (4:5). No build step, vanilla JS. Reuse `compositor.js` — do not rebuild. Tokens via CSS vars, no hardcoded hex in new CSS.

---

## Build plan (scoped, reuse-first)

1. **`compositor.js` — brand-less default style.** Add a `DEFAULT_STYLE` constant (S0UNDCAV3 palette + DM Mono/Sans). In `addText`, replace the bare `'#ffffff'`/`'#000000'`/font fallbacks with `currentBrand?.palette || DEFAULT_STYLE`. No logo when brand-less (`addLogo` already returns null without `logo_url`). Net: text renders branded-looking with zero brand selected.
2. **`firepit.js:795` — auto-mount for poster types.** Change the gate to mount when `window.scCompositor && isPosterType(ctx.content_type)` (scope: **`event_poster` + `event_promo`** — the typographic flyer types). Apply the brand kit only if `_brand` is set, else rely on `DEFAULT_STYLE`. Non-poster types keep today's behaviour (overlay only with a brand). One small `isPosterType()` helper.
3. **`firepit.js` `applyContent` wiring.** For posters, pass `headline` = lineup/artist or event name, `supporting` = the key details (date · venue · time) drawn from `ctx.event`, instead of dumping the full generated paragraph. Keeps the overlay poster-like, not caption-like.
4. **`media_gen.py` `build_restyle_prompt` — minimise baked text.** Adjust wording: recreate style/composition/palette/texture; **leave headline + body text areas clean / sparse** so the overlay reads cleanly. Keep the event name only as a small allowance.
5. **Verify (ship-check).** Regenerate `event_poster` with a flyer ref + no brand → compositor mounts, legible text on the styled backdrop, drag/edit/resize works, SAVE TO STASH flattens via `toBlob()` and uploads. Screenshot-confirm with Doug.

## Out of scope (explicit)
- **Campaign-post Konva** (the old "Phase 1c-full" for `image_composer.py`) — different surface, not this task.
- `artist_bio` / `social_post` auto-mount — could follow once posters are proven.
- `composer_state jsonb` non-destructive re-open — later.

## Risks / notes
- FLUX.2 `/edit` may still render *some* text even when asked not to; the overlay covers the hero zones, residual small text in the texture is acceptable.
- `js/firepit.js` is already 1052 lines (>500 guideline) — pre-existing; this change adds only a helper + small edits, no new split now (flag for a later refactor).

## Build notes
- **Built + browser-confirmed 2026-06-10.** All 5 steps shipped: `DEFAULT_STYLE` in `compositor.js`; brand-less auto-mount for `event_poster`/`event_promo` in `firepit.js:795`; poster text wiring (lineup=headline, event=supporting); `build_restyle_prompt` flipped to clean-backdrop/min-text.
- **Result:** with NO brand kit, `event_poster` + flyer ref now mounts the compositor (2 Konva layers, `_compositorActive=true`); `CONCRETE WONDERS` + the event line render crisp + legible over the styled backdrop; `toBlob()` flattens to full 1080×1350. Screenshots in `scratch/forge_confirm/` (gitignored).
- **Known rough edge:** FLUX.2 `/edit` still bakes *some* text despite the min-text prompt — a wrong `SATURDAY OCTOBER 26 2024` header (the source date) + `THE DOME` survived at the top/bottom edges. The body zone is clean; the top header competes with nothing the overlay covers. Follow-up options (not yet done): (a) push the restyle prompt harder / add a negative-style cue; (b) add a top headline band in the `event_poster` template to mask the baked header; (c) lean on the compositor being editable (user drags/edits). Decide with Doug.
