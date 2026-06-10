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
3. **Post (`social_post`) silently drops reference images at the model.** Refs are shown to Claude when *writing* the prompt ("mirror their palette, composition, mood"), but the image model is Seedream and `_payload_for_seedream` intentionally ignores `image_refs` (and `seed`). The model never sees the image — mirroring is secondhand through a 200-word prompt. (Known from the 2026-06-09 diagnosis; still true; only the restyle path actually fixed it, and only for uploaded-flyer flows.)
4. Minor: `voice` shapes copy only; arguably fine, but "hype vs industry" could legitimately shift image energy. `generated_text` mood cue is backdrop-only.

## Fix direction (NOT yet built — for the review)

- **Restyle = constant skeleton + vibe inputs.** Keep the text-free instruction, append non-renderable style cues from ctx: genre, freeform mood words, voice energy, night name as *theme* (not text). Small `build_restyle_prompt` change.
- **Backdrop prompt gets full ctx.** Add `artist_list` + structured event fields (as scene/mood context, not text to render) to `build_image_prompt`.
- **Brand → image.** Pass brand palette (and maybe logo-free style words) into both prompt builders so the image leans toward the kit's colours.
- **Post refs:** route `social_post` to FLUX.2 when refs are present (same `has_style_refs` trick the restyle uses), or accept Seedream's secondhand mirroring and say so in the UI.
- All contained in `media_gen.py` (+ one routing touch in `content_api.py`). No UI changes required.

## Related, parked
- **Post-generation button reshape** — Doug hates the current 10-button wall but wants to make button decisions after a full live review of everything. Hero moment chosen: **the poster reveal**. Sketch from chat (poster hero w/ Regenerate+Download; caption demoted w/ Tweak ▾ menu; single prominent SAVE TO STASH) — revisit after the review.
- Baked backdrop text: prompt-hardening proven futile; only a deterministic top mask band would hide it (see `compositor_overlay_forge.md`).
