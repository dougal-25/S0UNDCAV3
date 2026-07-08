# Pre-launch full-codebase review — FINDINGS (2026-07-03)

Ran the `prelaunch-review` workflow: 40 agents, ~29 min, 102 raw findings verified and
consolidated. Verdict: **NOT safe to open free public signups yet** until the HIGH items
and the unmetered-inference endpoints are fixed. This is net-new surface — separate from
the morning's hardening batch (`db/0023`, credit debits, webhook idempotency, SSRF guard,
IDOR, scheduled-searches auth, rate limiting).

Fix batches (see `wiki/log.md` for what actually landed):
- **Batch 1 (launch blockers):** HIGH security + unmetered inference + HIGH XSS.
- **Batch 2:** remaining MED/LOW security + 2 HIGH functional bugs + correctness cluster.
- **Batch 3:** de-duplication + dead code.

## Security — HIGH
- `content_api.py:2733` — Stored SSRF in `_ayr_rehost` (scheduled-post executor fetches user-controlled stash `media_url`, no allowlist, follows redirects). Fix: `_assert_safe_storage_url` + `allow_redirects=False`.
- `tracking_api.py:54` — `register_artist` upserts global `tracked_artists` by `artist_key` only, no uid scoping → cross-tenant overwrite + `soundcloud_user_id` repoint. Fix: ownership check.
- `artist_profiles_api.py:178` — `POST /scrape` overwrites claimed profiles, bypassing the claimer-only PATCH guard. Fix: block protected fields when `claimed_by_user_id != uid` and not admin.
- `events_api.py:342` — `/extract-flyer` Sonnet vision call, no credit charge. Fix: `charge()`/`refund()`.
- `js/app.js:1019`, `js/clan.js:75` — `avatar_url` into `<img src>` unescaped → `onerror` breakout XSS. Fix: `esc()` + scheme check.

## Security — MEDIUM
- `campaigns_api.py:368`, `content_api.py:1013` (via `js/forge_refs.js:81`) — unmetered Claude copy/vision per signup.
- `content_api.py:819` — `video_premium` flat 4cr regardless of duration (10s charged as 5s).
- `avatars_api.py:224` — `forge_character` charges but no refund on storage failure.
- Stored/DOM XSS: `js/firepit.js:1446/1496`, `js/trail_map.js:221`, `js/foraging.js:414` (single-quote breakout), `js/footprints.js:167` + `js/app.js:1184` (`javascript:` href), `js/events_detail.js:50` (href + `rel=noopener`), `js/compositor.js:298` + `js/brands.js:141/254` (CSS injection).

## Security — LOW
- `content_api.py:969` (conjure upload no size cap → OOM), `content_api.py:2510`/`:2032` (unauth 16-genre SoundCloud fan-out, bypasses POST throttle), `artist_profiles_api.py:16` (`claimed_by_user_id` leaked to all tenants), `media_gen.py:1465/1494/1385` (shared `DEV_USER_ID` fallback), `scout.py:72`/`scheduled_scout.py:57`/`clan_tracker.py:43` (OAuth `r.text` to logs), `js/clan.js:164` (CSV formula injection).

## De-duplication
- `content_api.py:1317` (MED) — full parallel copy of the `sb_helpers` auth/client/credit stack. Import from `sb_helpers` instead.
- `clan_tracker.py:213` (MED) — `update_manifest()` byte-for-byte dup of `update_manifest.py`.
- Service-role client 3×, Anthropic client 4×, Haiku model-id ~8×, storage upload+path pattern 6×, `get_oauth_token` 3×, plus ~15 smaller JS/Python dups.

## Dead code
- `campaigns_api.py:423` (dead ternary → error campaigns marked `'ready'`), `js/trail_map.js:82` (not IIFE-wrapped, leaks ~30 globals), `js/config.js:26` (dead branch), `media_gen.py:903` (`job_registry` unused), `media_gen.py:18` (dup import), `artist_profiles_api.py:31`, `events_api.py:215`, several vestigial JS fns.

## Launch-relevant functional bugs (outside the 3 buckets)
- `js/foraging.js:46` (HIGH) — scheduled-search fetch omits JWT → every server sync 401s, silently falls back to localStorage. Scheduled scouting is broken.
- `js/trail_map.js:424` (HIGH) — status picker never persists chosen status.
- Correctness cluster: 4:5 portrait rendered square (`media_gen.py:1132`), fake-zero snapshots (`clan_tracker.py:170`), headliner mis-assignment, literal `{{artist}}` on bio posters, edit-form flyer drop, etc.

Full per-agent transcripts: workflow run `wf_30b862a3-2ad`.
