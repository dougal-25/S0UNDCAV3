# Forge input-usage audit — what each input actually drives

> Status: **Findings, 2026-06-10 (evening).** Read-only audit, no code changed. Evidence base for Doug's full Forge review before making concrete changes to media-gen quality + the post-generation buttons. Doug's hypothesis: "I don't think the inputs we set out are being appropriately used." **Verdict: correct.**

## Why this exists
Doug's concern is media-gen output *quality*, and specifically that the Forge inputs (Additional Context, event details, brand, voice…) don't seem to shape the generated image. Traced every input from the form (`js/firepit.js gatherForgeContext`) through `/api/generate` (copy) and `/api/generate-image` (image) to the actual fal payloads (`media_gen.py`).

## The truth table

There are **three image regimes**, picked automatically:
- **Restyle** — a flyer is uploaded as a Reference Image (and no Spirit): `build_restyle_prompt` → FLUX.2 `/edit`.
- **Backdrop** — no reference uploaded: `build_image_prompt` (Claude Haiku writes the prompt) → Seedream (Post) / FLUX.2 (the rest) / Nano Banana (Spirit).
- **Overlay** — the Konva compositor lays text on top for poster types (brand-less since `9b077d6`).

| Input | Text copy | Image — backdrop | Image — **restyle** | Overlay |
|---|---|---|---|---|
| Brand kit | ❌ | ❌ **never sent to image gen** | ❌ | ✅ fonts/colours/logo |
| Content type | ✅ template | ✅ STYLE_HINTS + dims + model route | route only | ✅ template |
| Artist (dropdown → artist_data) | ✅ | ✅ name + genre | ❌ | — |
| **Lineup (artist_list)** | ✅ | ❌ **never passed** | ❌ | ✅ headline |
| Night name (event) | ✅ | ✅ | ❌ | ✅ |
| **Venue / City / Date / Doors / Curfew / Tickets** | ✅ (since `4078b95`) | ❌ **never passed** | ❌ | ✅ stacked lines |
| **Additional Context (freeform)** | ✅ | ✅ "Context: …" | ❌ **ignored** | — |
| Voice profile | ✅ system-prompt addenda | ❌ | ❌ | — |
| Spirit (avatar) | — | ✅ refs prepended + avatar model route | n/a (avatar excludes restyle) | — |
| Reference images | ✅ Claude vision (tone) | ⚠️ **half** — see finding 3 | ✅ the entire input | — |
| Chosen variant (generated_text) | n/a | ✅ 300-char mood cue | ❌ | caption box only |

## Headline findings

1. **The restyle path uses a CONSTANT prompt.** Since `f5eeebc` (text-free backdrop), `build_restyle_prompt(content_type, ctx, generated_text)` ignores all three arguments — the only input reaching FLUX.2 `/edit` is the uploaded reference image. Genre, artist, Additional Context, voice: all discarded on the flow Doug uses most (poster + flyer ref). How it drifted: `efeff19` rendered the event text → text garbled (browser-proven) → `9b077d6` minimised text → `f5eeebc` stripped everything, including the non-text vibe inputs. The text removal was right; throwing away the *mood* inputs was collateral.
2. **The backdrop path never receives the lineup or the structured event fields.** `build_image_prompt` reads `artist_data` / `event` / `release` / `freeform` only — `artist_list` and the `60d6d0c` fields (venue/city/date/doors/curfew/tickets) were never added. **Brand kit never touches image gen at all** (palette can't influence the image, only the overlay text — and `applyBrandKit` only affects the compositor).
3. **~~Post silently drops reference images~~ — CORRECTED on re-verification:** `job_type_for` routes ANY uploaded ref to JOB_RESTYLE for all content types, so Post+refs already reaches FLUX.2. The *actual* residual hole was narrower: **a Spirit on a non-bio type** (`has_avatar`, no style refs) fell through to Seedream, which drops `image_refs` — spirit references silently ignored on Posts/Promos.
4. Minor: `voice` shapes copy only; arguably fine, but "hype vs industry" could legitimately shift image energy. `generated_text` mood cue is backdrop-only.

## Fixes — SHIPPED 2026-06-10 (evening), live-fire proven

- ✅ **Restyle = skeleton + vibe inputs.** `_vibe_cues(ctx)` appends genre, night-name theme, freeform mood, voice→energy (`_VOICE_IMAGE_ENERGY` map), brand palette hexes — all framed "style only — do NOT render as text". Verified: prompt tail carries `Techno scene; themed around "WAREHOUSE TECHNO"; acid warehouse…; high-energy…; lean toward the brand palette: #0f0d0c, #ff4500, #f5f5f5`.
- ✅ **Backdrop prompt gets full ctx.** `build_image_prompt` now includes lineup (context-only), Setting (venue — city), voice energy, brand palette.
- ✅ **Brand → image.** `gatherForgeContext` sends `ctx.brand = {name, palette}`; both prompt builders consume it. **Visually proven:** same pink flyer + S0UNDCAV3 kit → output came out brand orange-on-black (`scratch/forge_confirm/vibe_poster_v1.png`).
- ✅ **Spirit-on-Post routing.** `job_type_for`: `has_avatar` on non-bio types → JOB_HERO_ART (FLUX.2 accepts refs) instead of falling through to Seedream.
- Observed trade-off: when freeform mood ("toxic green") and brand palette are both present, the brand wins — acceptable (brand should win); revisit only if Doug wants freeform to dominate.

## Related, parked
- **Post-generation button reshape** — Doug hates the current 10-button wall but wants to make button decisions after a full live review of everything. Hero moment chosen: **the poster reveal**. Sketch from chat (poster hero w/ Regenerate+Download; caption demoted w/ Tweak ▾ menu; single prominent SAVE TO STASH) — revisit after the review.
- Baked backdrop text: prompt-hardening proven futile; only a deterministic top mask band would hide it (see `compositor_overlay_forge.md`).
