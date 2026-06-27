# Feature: Firepit — Forge

> Status: **Code complete, untested end-to-end.** Image gen layer added 2026-04-03 (commit `0374539`).

## What it does
AI content generator inside the Firepit tab. User toggles between Text mode and Image mode. Backend dispatches to Claude Haiku (text) or Fal AI / Replicate (image).

## Why it exists
Sound Cave's pivot is from pure discovery to content creation. Forge is the entry point for users to actually *produce* content about the artists they discover. Without Forge, the discovery engine has no payoff loop.

## Acceptance criteria
- [ ] User can generate text content from an artist context (artist name, genre, recent releases)
- [ ] User can toggle to image mode and generate cover/promo art
- [ ] Image gen falls back from Fal → Replicate on Fal failure
- [ ] Generated content can be saved to Stash
- [ ] Errors surface clearly in UI (API key missing, rate limit, timeout)

## Dependencies
- `ANTHROPIC_API_KEY` (text)
- `FAL_KEY` (image, primary)
- `REPLICATE_API_TOKEN` (image, fallback)
- `content_api.py` running on port 8000
- `image_gen.py` for image dispatch

## What's left
- **Blocker:** confirm all three API keys are in workspace `.env`
- End-to-end test: artist context → text gen → save to Stash
- End-to-end test: artist context → image gen → fallback path → save to Stash
- Error UI states
- Decide: do we want streaming text output, or wait-for-full-response?

## Content type surface (locked 2026-05-11)

Stripped from 15 types to 7 to remove clutter and focus on the active channels.

**Social** (caption auto-generated, channel tone adapts at schedule time):
- `social_post` — Post (image + caption)
- `social_carousel` — Carousel (multi-slide + caption)
- `social_short` — Short (vertical video + caption + on-screen-text outline)

**Events:**
- `event_promo` — Event Promotion (absorbs old teaser/aftermovie/pre_release)
- `lineup_poster` — Lineup Poster (poster image + supporting copy)

**Editorial:**
- `artist_bio` — Artist Spotlight / Bio
- `press_release` — Press Release (long-form catch-all for editorial/PR)

**Active channels:** Instagram, Facebook, TikTok, Reddit. Reddit allows text-only posts; IG/FB/TikTok require media.

**Killed:** `ig_reel`, `ig_carousel`, `tiktok` (caption), `x_post`, `yt_short`, `lineup_copy`, `aftermovie`, `teaser`, `pre_release`, `premiere`, `dj_support`, `newsletter`, `mix_desc`, `playlist_desc`. Channels removed: X, LinkedIn, YouTube, Pinterest, Threads, Bluesky.

## Input panel (locked 2026-05-11)

**Voice Profile presets** (augment, don't replace, the base SYSTEM_PROMPT):
- `underground` — default. Authentic, scene-literate, British English, no corporate.
- `industry` — measured, professional. Press releases, bios, B2B with labels/promoters/journalists.
- `hype` — high-energy, club-night promo voice. Caps in moderation, no influencer-cringe.
- `personal` — first-person, conversational, like the artist posting from their own account.

**Reference Images:** 1–5 images, JPEG/PNG/WebP, ≤5MB each. Base64-encoded in the browser, sent inline with `/api/generate` (and forwarded to `/api/generate-image`). Claude reads them as vision input — they inform tone, mood, vocabulary, AND the visual style of generated images (palette/composition mirrored). Boundary-validated in `content_api._ref_images_to_blocks`.

**Output Mode toggle removed.** Content type determines media:
- text-only: `artist_bio`, `press_release`
- text + 1 image: `social_post`, `social_carousel`, `social_short`, `event_promo`, `lineup_poster`

**Known limitations:**
- Carousel still produces 1 image. Per-slide generation is a follow-up plan.
- `social_short` produces a still image, not a video clip. The Opus-Clips-style video clipper (upload long video → AI picks clip moments → ffmpeg cuts N short clips with captions) is a separate, larger plan — not yet started.

## Related
- [`wiki/decisions/0013_image_gen_provider.md`](../decisions/0013_image_gen_provider.md) — fal primary, Replicate fallback, and why
- [`wiki/features/firepit_stash.md`](firepit_stash.md) — the Stash content library
- [`wiki/features/firepit_trail_map.md`](firepit_trail_map.md) — the Trail Map content calendar
