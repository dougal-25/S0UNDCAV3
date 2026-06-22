# Spec — Tracking Health Monitor

**Status:** Built 2026-06-18 (Doug pre-approved). Backend-only; no UI.
**Why:** The 2026-06-13→17 SoundCloud token outage froze the Footprints charts for **5 days and nobody knew** — the Railway cron kept "completing" daily runs while every artist failed. The token bug is fixed ([log 2026-06-18](../log.md)); this exists so the *next* silent failure can't hide. Fixing the bug stops one outage; this stops the silence.

## What it is

Two pieces, no new infrastructure and no new secrets:

1. **`GET /api/tracking/health`** (`tracking_api.py`) — a **public, unauthenticated** read-only endpoint. Reports whether tracking is producing fresh, clean data right now. Returns a `severity` (`ok` / `degraded` / `down`) plus the latest run + data-freshness so a human or machine can see *why*.

2. **`.github/workflows/tracking_health.yml`** — a daily GitHub Action (10:00 UTC, 3h after the 07:00 collector). It curls the health endpoint and **hard-fails the workflow on `severity == 'down'`**, which triggers GitHub's built-in workflow-failure **email to Doug**. It's deliberately *external* to Railway, so it still fires if Railway's own scheduler (or Railway itself) is dead.

## Severity contract

`severity` is computed from the latest `snapshot_runs` row + the most recent `fetch_status='ok'` SoundCloud snapshot:

| severity | meaning | watchdog action |
|---|---|---|
| `down` | No OK snapshot dated **today** (UTC), OR latest run not `completed`, OR `artists_ok == 0` | **Fail workflow → email Doug** |
| `degraded` | Fresh data today, but the latest run had some `failed`/`partial` artists (e.g. one deleted account) | Warn only (no page — avoids alert fatigue) |
| `ok` | Fresh data today, every artist collected cleanly | Pass |

- **Freshness = an OK snapshot dated *today*.** A 1-day gap at 10:00 UTC means the day's run didn't produce data. This is what catches both total scheduler death *and* the "completed-but-all-failed" outage class (the catchup job no-ops once a run row is `completed`, so a failed-but-completed run leaves data stale — exactly the June failure).

## Design decisions

- **Email, not Slack, for v1.** GitHub's failure-email is free, external, and needs no secrets in the repo. `SLACK_BOT_TOKEN` exists in `.env` and an immediate Slack ping is an easy future add (post from the endpoint-check or the collector finalize), but it's not required for the guarantee.
- **Public endpoint is acceptable.** It exposes only aggregate counts + dates (no artist data, no secrets). Keeping it auth-free is what lets the watchdog (and a future UI badge) read it with zero credential handling.
- **`down` pages; `degraded` doesn't.** One flaky artist must not page daily or Doug learns to ignore it — then a real outage hides in the noise. The catastrophic case (the only one that recurs like June) is all/most-failed or stale, which is `down`.
- **Watchdog runs from `main` only.** GitHub runs scheduled workflows from the default branch, so this is inert until merged to `main`.

## Verify

- `curl https://soundcave-api-production.up.railway.app/api/tracking/health` → today shows `severity:"ok"` (21 OK artists, fresh).
- `workflow_dispatch` the watchdog → green when healthy.
- Negative proof (conceptual): during 06-13→17 the latest run had `artists_ok=0` ⇒ `down` ⇒ the watchdog would have failed on day one.

## Related
- [spec/clan_data_tracking_v2.md](clan_data_tracking_v2.md) — the pipeline this guards
- [spec/tracking_metrics_definitions.md](tracking_metrics_definitions.md) — metric contract
- [log.md](../log.md) — 2026-06-18 outage fix + this monitor
