# Forge output column — rework (2026-06-18)

> Status: **DRAFT pending Doug's sign-off.** From his 2026-06-18 brief.
> Area: the Forge OUTPUT column — image preview · action row · caption · beat.
> Sits on [forge_ux_principles](forge_ux_principles.md) · [forge_iteration_loop](forge_iteration_loop.md).

## Why
The flyer is the product, but the column buried it (small preview) and showed an auto-written flowery "post description" ("techno bleeds into house…", "blue hands reach across red voids") that Doug never wanted — for a flyer with text baked into the image, that prose is noise. The caption people actually need is short, factual, editable, and clearly separate from the flyer + the beat.

## Changes

### 1. Bigger output image
The generated flyer is the hero — enlarge the preview (raise `.forge-image-preview` max-height; let it dominate the column).

### 2. Rename input label: "Direction & Mood" → "Direction"
This box is the **context / connector** — it tells the model *what to do with the reference images, and how/why*, regardless of which roles are attached. "Mood" misnames it. Label → **"Direction"**. (Update the field label + [glossary](../glossary.md); leave internal code keys unchanged.)

### 3. Caption box — replaces the flowery auto-description
- **Content = facts only**, assembled from the form fields: event name · lineup · date · location · time · price — then **stop** (nothing below that).
- **Auto-filled on generate, editable** — tweak before saving (Doug's pick: *auto-fill + enhance*).
- **✨ Enhance button** — optional; calls an AI endpoint to expand the concise caption into a fuller one on demand. Most promoters paste their own pre-written copy, so enhance is a nice-to-have, not the default path.
- **Placement:** a dedicated **Caption** box **below** the action row (SAVE TO STASH · REGEN · NEW IMAGE · ✎ REFINE · DOWNLOAD · DISCARD) and **above** the **BEAT** box. Caption and Beat are two separate, clearly-labelled boxes.
- **Implementation:** base caption is assembled **client-side** from the existing form facts (instant, no API call); only **✨ Enhance** hits the model (new lightweight endpoint, e.g. `POST /api/enhance-caption`). The old flowery text-generation path is **dropped for flyers**.

### 4. Kill the silent fallback (safety)
When the model router fails on a **ref-based** generation, **surface the error** instead of silently dropping to text-only `flux-schnell` (which ignores refs + garbles text — the exact bug that hid from Doug on 2026-06-18). No-ref generations may still fall back (nothing to reference, so the cheap model is fine).

## Locked principles (Doug, 2026-06-18)
- **One model for every reference combination.** With any reference images attached, every *still* generation uses `nano-banana-pro/edit`. The ref combination (STYLE/WHO/WHAT/WHERE, person or not) **never** changes the model — role tags shape the *prompt*, not the model. The only model fork is refs-present vs zero-refs, and the studio flow always has ≥1 STYLE ref, so in practice it's always one engine. (Killing the silent fallback removes the last sneaky model switch.)
- **The caption pattern generalises across all formats.** The concise-facts + ✨enhance caption is the *template* for every output format — flyer now; **tour, album release, single, etc. later**, each tailored to its own fact set. Build the caption assembly **per-format-aware** (a fact template keyed by `content_type`), never flyer-hardcoded, so a new format is config, not a rewrite.

## Out of scope (already done / separate)
- Routing rework — done 2026-06-18: every ref-based gen → `nano-banana-pro/edit` (one model; role tags shape the *prompt*, not the *model*).
- The refine loop — [forge_iteration_loop](forge_iteration_loop.md).

## Build order
1. **Kill silent fallback** (backend, small, independent).
2. **Rename label** "Direction & Mood" → "Direction" (trivial).
3. **Enlarge image** (CSS).
4. **Caption box** — facts-assembled + editable + repositioned (below actions, above beat) + **✨ Enhance** endpoint.

Runs `ui-change-protocol` (framing = Doug's brief; matches the existing column styling + palette law).
