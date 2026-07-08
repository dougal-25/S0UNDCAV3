# Pre-launch full-codebase review — RUNBOOK (prepped 2026-07-03, to run ~18:00)

Self-contained brief so the review can **set off immediately** without re-discovery,
even from a fresh session that has lost today's context. Goal: review the **entire**
codebase for **security**, **duplication / de-duping**, and **dead code** before going
live with free public signups. Scope: all Python + all frontend JS.

## How to run it (one command)

A ready workflow script is committed at `.claude/workflows/prelaunch-review.js`.
At 6pm just say: **"run the prelaunch review"** — that opts into the workflow, which
runs `Workflow({ name: 'prelaunch-review' })`. Optional: prefix the turn with a token
budget (e.g. "+800k") and the script scales the fan-out to fit.

If running manually instead, follow "Review plan" below.

## Architecture facts the reviewers must know (don't re-derive)

- **Backend**: Flask on Railway, `gunicorn wsgi:app --workers 1 --threads 4 --timeout 120`.
  APScheduler runs in-process on the single worker.
- **DB**: Supabase (Postgres). Migrations in `db/` (numbered, append-only; latest `0023`).
- **Frontend**: static, no build step. Vercel + GitHub Pages. Talks to the backend
  (`js/config.js` → Railway) AND directly to Supabase from the browser
  (`js/lib/supabase.js`, anon key + user JWT).
- **THE load-bearing security fact**: the Flask backend uses the Supabase **service-role
  key** (`sb_helpers.supabase()`), which **bypasses RLS**. So for API endpoints, tenant
  isolation is enforced **in code** — every query must scope by the JWT-resolved
  `require_user()` uid. Direct browser→Supabase calls are guarded by **RLS** instead.
  Both layers must be checked.
- **Credits**: `debit_credits` / `refund_credits` / `grant_credits` are `SECURITY DEFINER`
  SQL fns (row-locked, ledger = source of truth). `content_api._debit` and
  `sb_helpers.charge/refund` wrap them. Admins (`ADMIN_EMAILS`) bypass charges.

## ALREADY FIXED today — DO NOT re-flag (saves budget)

Committed on branch `claude/code-review-d2k2oh` (commit "Pre-launch security hardening"):
1. RLS: client UPDATE on `public.users` removed; `credits_ledger` client read-only (`db/0023`).
2. Credit debits added to previously free paid routes: avatars `generate-v2` + `forge-character`,
   events `generate-flyer`, campaigns `generate-campaign`; generate-v2 width/height clamped.
3. Stripe webhook idempotency (`stripe_events` table + claim/release guard).
4. SSRF guard on `image_composer._fetch_image/_fetch_image_rgba` (`_safe_get`).
5. `artist_profiles` PATCH restricted to claimer/admin (was IDOR on unclaimed profiles).
6. Auth on `/api/scheduled-searches` (admin write, authed read).
7. Coarse per-IP throttle on `POST /api/*` (`before_request`, webhook exempt).

## KNOWN-OPEN — confirm/expand, don't re-discover from scratch

- Storage buckets `brand_assets` / `generated_*` are public-read; app consumes via public
  URLs. Locking reads needs a **signed-URL migration** (deferred — architectural).
- `requirements.txt` fully unpinned (redeploy can pull breaking majors).
- Debit-before-generate vs the 120s gunicorn timeout → user can be charged with no refund
  if a slow provider call kills the worker.
- `generate_campaign` is a long non-transactional multi-step write; regenerate deletes the
  old campaign first (crash → data loss).
- `js/app.js` `esc()` does not escape single quotes → XSS risk in single-quoted inline
  handlers.
- `/api/generate-media` charges flat `video_premium` (4cr) ignoring client `duration_seconds`
  (10s underpriced ~2x).
- Raw exception strings returned to clients across many handlers (info leak).
- `tracking_api` / scout config writes to **global** tables/files without per-user scoping.
- Campaign per-image debit currently also charges on the Pillow (non-Fal) fallback path —
  decide whether to only bill actual Fal spend.

## Review plan (angles × clusters)

Every reviewer tags each finding: **security | duplication | dead-code | correctness**,
with `file:line`, severity, and concrete evidence/exploit. Cross-check against the two
lists above before reporting.

**Python clusters**
- P1 `content_api.py` (2882) — core API; both security + dedupe lenses.
- P2 `media_gen.py` (1542) — generation engine.
- P3 `campaigns_api.py`, `events_api.py`, `artist_profiles_api.py`.
- P4 `avatars_api.py`, `tracking_api.py`, `brand_kits_api.py`, `roster_api.py`.
- P5 `image_composer.py`, `animation_gen.py`, `conjure_gen.py`, `campaign_template.py`.
- P6 pipelines: `scout.py`, `scheduled_scout.py`, `clan_tracker.py`, `tracking_collector.py`,
  `soundcloud_helpers.py`, `update_manifest.py`; + `sb_helpers.py`, `config/voice_presets.py`, `wsgi.py`.

**JS clusters**
- J1 core: `js/app.js`, `js/config.js`, `js/lib/supabase.js`, `js/version.js`.
- J2 `js/firepit.js` (1675) — Forge.
- J3 dashboard/discovery: `cave.js`, `cave_entrance.js`, `foraging.js`, `footprints.js`, `clan.js`.
- J4 events: `events_form/detail/post_editor/list/match/shared`.
- J5 studio: `compositor(+templates)`, `beat_segment`, `stash(+picker)`, `forge_refs`, `spirits`.
- J6 `brands.js`, `trail_map.js`, `roster_sync.js`, `sc_oauth.js`, `icons.js`.

**Then**: (a) one **cross-cutting dedupe** pass with a global view (duplication spans modules
— shared fetch/auth/format helpers, repeated Supabase query patterns, copy-pasted DOM
builders); (b) **adversarial verify** on security findings (recall-biased, kill false
criticals); (c) **synthesize** one prioritized report split into Security / De-dupe /
Dead-code, most-severe first, each with file:line + fix sketch.

## Owner prep checklist before 6pm (no tokens)

- [ ] Apply `db/0023_security_hardening.sql` in Supabase (unblocks the security batch deploy).
- [ ] Confirm which branch Railway deploys from (for merging fixes) + that `ADMIN_EMAILS` is set.
- [ ] Have token budget available; optionally decide a cap (prefix the 6pm turn with "+800k" etc.).
- [ ] Ensure the working tree is clean/committed (it is, as of this runbook) so the review has a stable baseline.
