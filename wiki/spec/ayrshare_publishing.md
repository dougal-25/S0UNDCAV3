# Spec — Ayrshare publishing (Phase G)

> Status: **Drafted 2026-04-29**. Approval pending Doug's E2E test.

## What it does
Wires the Trail Map UI to real social publishing. When a user drags a Stash item onto a date and picks platforms (IG/TikTok/X/LinkedIn), the post is recorded in Supabase `scheduled_posts`. A background job in `content_api.py` polls every 60s for due posts and fires them via Ayrshare's REST API.

## Architecture trade-off (single-account vs multi-tenant)

Ayrshare offers two API models:
1. **Single-account** (Doug's free dev tier) — one Ayrshare account posts to one set of socials. Every Sound Cave user's posts go through Doug's connected accounts. Fine for solo use, demos, and the portfolio version.
2. **Business Plan + User Profiles** — multi-tenant; each end user gets their own Ayrshare profile and connects their own socials. Requires JWT-signed URLs.

**Decision (2026-04-29): ship single-account for Phase G.** Doug is on the free dev tier (20 posts/mo) and is the only user right now. Multi-tenant is deferred to deploy time.

What this means in practice:
- "Connect socials" in the dropdown opens Doug's Ayrshare dashboard in a new tab — he connects there.
- All `scheduled_posts` records still carry `user_id` (their owner), but the actual Ayrshare API call is per-account, not per-user.
- The `connected_accounts` table is unused in Phase G; it's reserved for Phase G-v2 (multi-tenant). Don't drop it — schema cost is zero.

## Lifecycle of a scheduled post

```
[Trail Map: drag → date]
  → POST /api/scheduled_posts  { stash_item_id, platforms, scheduled_for }
  → row inserted, status='scheduled'

[content_api.py background tick, every 60s]
  → SELECT scheduled_posts WHERE status='scheduled' AND scheduled_for <= now()
  → for each due row:
      → POST https://app.ayrshare.com/api/post  { post, mediaUrls, platforms }
      → on success: status='posted', ayrshare_post_id=<id>
      → on error:   status='failed', store error in metadata
```

## Endpoints (in `content_api.py`)

- `GET /api/scheduled_posts` — list user's scheduled posts (Trail Map fetches on load)
- `POST /api/scheduled_posts` — create
- `PATCH /api/scheduled_posts/<id>` — edit (date, platforms)
- `DELETE /api/scheduled_posts/<id>` — cancel (only if status='scheduled')
- `GET /api/ayrshare/profiles` — list which platforms are currently connected (proxies Ayrshare `/user`)
- `GET /api/ayrshare/connect-url` — returns the Ayrshare dashboard URL where Doug connects accounts

## Frontend changes

1. `js/trail_map.js` — swap `localStorage['sc_scheduled_posts']` for `/api/scheduled_posts` (load on render, POST on schedule, DELETE on cancel). Marker `// TODO: replace mock store` is the splice point.
2. Account dropdown — add "Connect socials" link. Opens Ayrshare's hosted dashboard URL in a new tab (no UI we own to build for the connect itself).
3. Optional: tiny "X platforms connected" badge in dropdown — refreshes from `/api/ayrshare/profiles` on hydrate.

## Background job

Use [APScheduler](https://apscheduler.readthedocs.io) inside `content_api.py` (BackgroundScheduler). Tick interval 60s. Single-process is fine — when we move to Railway, we'll either use Railway cron or split into a worker dyno. Inngest is a nice-to-have but APScheduler keeps the stack simple for now.

## Failure modes handled

- **Stash item deleted**: ON DELETE CASCADE drops the scheduled_post. No orphan posts.
- **Stripe-tier-required platforms (e.g. YouTube)**: Ayrshare returns 403 on free; we surface as `status='failed'` with the error in metadata.
- **API down at scheduled time**: row stays `scheduled` past `scheduled_for`; next tick retries (fire-once, not fire-and-mark-attempted; idempotency comes from Ayrshare's `idempotencyKey` field).
- **Multiple Flask instances** (won't happen in dev, watch for prod): the executor uses `SELECT … FOR UPDATE SKIP LOCKED` so two workers can't claim the same row.

## Out of scope (later phases)

- Multi-tenant Ayrshare User Profiles (deploy phase)
- Inngest job scheduling (current single-instance APScheduler is enough)
- Per-platform character/length validation in UI
- Retry-with-backoff on transient Ayrshare errors
- Analytics ingest (Ayrshare exposes per-post stats; defer)

## Verification (don't tick Phase G until done)

1. Doug runs `python content_api.py` (executor starts).
2. Doug connects at least one social via "Connect socials" link.
3. Doug schedules a post for **2 minutes from now** in Trail Map.
4. Within 60-120s the executor fires it; status pill flips `scheduled → posted`.
5. The post appears on the connected social.
6. Doug screenshots the live post; only then mark Phase G done.
