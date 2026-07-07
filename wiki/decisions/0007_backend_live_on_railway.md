# 0007 — Backend live on Railway (content_api deployed)

**Date:** 2026-06-10
**Status:** Accepted (live)
**Closes:** the open consequence of [0006](0006_vercel_static_only.md) — "Forge / scheduling / media-gen remain non-functional in prod until backend is deployed to Railway."

## What shipped
`content_api.py` is deployed and live on Railway, fulfilling the architecture in 0003.

| Thing | Value |
|---|---|
| Railway project | `soundcave-api` (project `1d496daa-…`, env `production`) |
| Service | `soundcave-api`, single worker (gunicorn) |
| Public API URL | `https://soundcave-api-production.up.railway.app` |
| Frontend (prod) | `https://thesoundcave.vercel.app` · `https://s0undcav3.com` (custom domain, added to CORS 2026-07-03) |

## How it runs
- **Entrypoint:** `Procfile` → `gunicorn wsgi:app --workers 1 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT`.
- **`wsgi.py`** imports `app` and calls `_start_executor()` — gunicorn never runs `content_api.py`'s `__main__`, so the APScheduler scheduled-post ticker is started here. **Single worker** so exactly one scheduler ticks (multiple workers = duplicate firing). `_start_executor()` is idempotent.
- **`.railwayignore`** keeps `venv.nosync/` (138M), `.git`, snapshots, tests out of the upload.
- **Env:** 13 vars pushed via Railway CLI from the workspace `.env` (Supabase ×3, Anthropic, SoundCloud ×2, Fal, Replicate, Stripe ×2, Ayrshare, APP_BASE_URL). `SOUNDCLOUD_OAUTH_TOKEN` omitted (optional — client-credentials fallback). `DEV_USER_ID` deliberately NOT set (no dev auth-bypass in prod).

## Frontend wiring
`js/config.js` is the single source of truth for the API base: localStorage `sc_api_url` override → `localhost:8000` in dev → `PROD_API` (Railway) in prod. Replaced 15 duplicated `localhost:8000` fallbacks across 8 JS files. CORS: `content_api` uses `CORS(app)` (open), so the Vercel origin reaches it.

## Verified (2026-06-10)
From `https://thesoundcave.vercel.app` in-browser: `scApiBase()` → Railway URL; `/api/config` 200; `/api/artist/djcarlosmanaca` 200 (follower_count 21,862). CORS works cross-origin. API smoke also confirmed `top_tracks` (5) on a fresh cache miss.

## Open follow-ups (not blocking)
1. ~~**Supabase Auth redirect/Site URL**~~ ✅ Resolved 2026-06-11 — already configured by Doug; verified live (magic link redirected to the Vercel URL, login landed). See log [2026-06-11].
2. **Snapshots not on prod** — `.vercelignore` excludes `data/snapshots/` (0006), so the Cave dashboard charts have no history on prod (degrades to the "tracking builds daily" empty state). Decide: serve snapshots, or have the frontend read them from the API/Supabase.
3. ~~**CORS hardening**~~ ✅ Resolved 2026-06-11 — origins restricted to prod + localhost (`9aa16f9`), deployed via `railway up`, live-verified. See log [2026-06-11].
4. **Cost:** Railway Hobby ~$5/mo (single always-on service). Watch usage.
