# Firepit Forge — Input redesign (RESUME DOC, 2026-05-11/12)

## What state is the work in

**Code is fully written, server is auto-reloaded, NOT visually confirmed, NOT committed.**

The plan that ran this work: `/Users/douglaswoolfenden/.claude/plans/keepers-2-i-ve-deleted-fluffy-meerkat.md` — full file list + verification steps.

## What changed (uncommitted)

| File | Change |
|---|---|
| `index.html` | Voice Profile dropdown → 4 real options (`underground`, `industry`, `hype`, `personal`). Output Mode toggle deleted. New "Reference Images" file picker + thumb container + error div added below Additional Context. |
| `css/style.css` | New `.forge-ref-thumbs` / `.thumb` / `.forge-ref-error` styles. Old `.forge-mode-toggle` rules removed. |
| `js/firepit.js` | `forgeImageMode`/`toggleImageMode` deleted. New `OUTPUT_MEDIA` map (text-only types vs text+image). `_forgeRefImages` array. `handleRefImagesChange` validates count ≤5 + size ≤5MB per file, reads as base64 data URLs. Thumbnail render via `createElement`+`replaceChildren` (XSS-safe). `gatherForgeContext` now sends `voice` + `reference_images` in ctx. `generateContent` auto-fires `generateImage(ctx)` when `OUTPUT_MEDIA[type]==='image'`. |
| `content_api.py` | `VOICE_PROMPTS` dict with 4 preset addenda. `_system_prompt_for(voice)` augments base `SYSTEM_PROMPT`. `_ref_images_to_blocks()` validates + converts data URLs → Anthropic image content blocks. `/api/generate` reads `voice` + `reference_images`, builds multimodal user content when refs present. |
| `media_gen.py` | `_ref_image_blocks()` helper (silent filter). `build_image_prompt()` extended to pass ref images as vision input to Claude, with a "mirror their palette/composition/mood" note appended to the prompt-builder context. |
| `wiki/features/firepit_forge.md` | Documented new voice presets + ref-image flow + known limitations. |
| `wiki/log.md` | Entry for the input redesign at top. |

## What's NOT done

1. **Visual confirmation.** Need to open Forge in a browser, hard-reload, and verify:
   - 4-option voice dropdown
   - No Output Mode toggle
   - Reference Images picker + thumbnails work, × button removes them
   - 6th image / >5MB image → error shown
   - Generate on `social_post` with `hype` voice → text with hype tone + auto-image below
   - Generate on `press_release` with `industry` voice → text only, no image area
   - Generate with 2-3 reference images → output mirrors their mood/style (qualitative)
2. **Commit + push.** Once visually confirmed.

## Out of scope (separate future plans)

- **B. Opus-Clips video clipper** for `social_short`: upload long video → Whisper transcript + frame sampling → Claude clip selection → ffmpeg cuts → N short clips with captions. Multi-day build, needs ffmpeg + Whisper API.
- **C. Multi-image carousel**: today Carousel produces 1 image. Per-slide gen deferred.

## How to resume this task in a new session

1. `cd ~/Documents/dwcw` and open Claude Code.
2. Say: *"Resume the Firepit Forge input redesign — read `projects/thesoundcave/wiki/spec/forge_input_redesign.md` and pick up where it left off."*
3. Claude will read this doc, check `git status` to confirm the same files are still dirty, then:
   - If Playwright MCP is now installed → screenshot Forge itself and report.
   - If not → ask Doug to eyeball.
4. After visual confirm: commit + push the 7 listed files (don't bundle unrelated WIP).

## Playwright MCP install command (run in regular Terminal, not in Claude Code)

```
claude mcp add playwright -s user -- npx @playwright/mcp@latest
```

Then quit and reopen Claude Code. The `browser_take_screenshot` tool will be available.

## Sanity check before declaring done

Run `git status` — expect exactly these 7 files modified (plus whatever unrelated WIP already exists):

- `index.html`
- `css/style.css`
- `js/firepit.js`
- `content_api.py`
- `media_gen.py`
- `wiki/features/firepit_forge.md`
- `wiki/log.md`
