# Spec: Foraging search redesign (one input, source-tagged review)

> Status: **PROPOSAL — awaiting Doug's approval.** Drafted 2026-06-27 from Doug's
> brief. The count-fix in §3 is already shipped (branch
> `claude/foraging-search-keywords-okv208`); the UX restructure in §1–§2 is not
> yet built.

## Why
Today Foraging has three sub-tabs (Manual / Scheduled / Running) with **two
separate search forms** and **two divergent backends** (`/api/search` in
`content_api.py` for manual, `scheduled_scout.py` for scheduled). That split is
the root of the drift bugs (keyword-never-searched, hidden follower ceiling) and
makes the page confusing: results aren't clearly attributed to the search that
produced them.

## 1. One search input, two outcomes
Collapse the two forms into **one Search form**. The user fills in the same
filters once — genre, keyword, follower range, max results — then picks the
action:

- **Search now** → immediate live results (today's Manual behaviour).
- **Save as scheduled** → a named search that runs on a cadence (today's
  Scheduled behaviour). Naming + frequency fields appear only when this is
  chosen.

One form, no duplicated fields, no chance of the two paths behaving differently.

## 2. One review board, results tagged by origin
A single review surface with three columns:

- **Manual results** — the latest run-now results.
- **Scheduled results** — newest results across all scheduled searches.
- **Watching** — artists the user is actively tracking (unchanged).

**Every artist card carries a source chip** so the user always knows where it
came from:

- `Manual` for run-now results, or
- the **scheduled search's name** (e.g. `UK Techno Hunt`) for scheduled ones.

Clicking the chip (or a per-card disclosure) expands the originating search's
filters — genre/keyword/follower-band/last-run — so a result is never an
orphan. Scheduled cards group under their search name (today's Running tab
already does this; the redesign brings manual into the same board).

### Open questions for Doug
- Do Manual results persist between sessions, or clear on reload? (Today they're
  in-memory only.)
- Should the source chip be clickable-to-filter (click `UK Techno Hunt` → show
  only that search's results), or just informational?
- Keep three sub-tabs, or one board with the three columns side-by-side?

## 3. Result count — search tracks, reverse-engineer artists (SHIPPED)
Confirmed: search is **track-first**, then we reverse-engineer the artist from
each track's embedded `user` object (followers, avatar, profile) — exactly the
intended model. The under-delivery ("asked for 20, got 8") had three causes,
now fixed in `scheduled_scout.py`:

1. **Single-page fetch.** The runner pulled ~`limit×3` tracks in one request and
   stopped. After track→artist dedup + the follower ceiling, that collapsed to a
   handful; the rest of the matching artists were on pages never requested. →
   Now **pages via `linked_partitioning` until `limit` unique eligible artists
   are collected** or a 12-page safety cap is hit.
2. **`hotness` fights low-follower searches.** The hottest tracks skew toward
   bigger artists, so a ≤1k-follower filter discards most of them. → When a
   follower ceiling is set, sort by **`created_at`** and rank survivors by our
   own engagement score (`search_sort_order()`). Mirrored into `/api/search`.
3. **Unbounded re-fetch risk.** Paging deeper means many more tracks seen, so the
   "followers == 0" profile re-fetch is now capped per run
   (`_MAX_FOLLOWER_LOOKUPS = 80`).

## 4. Unify the two backends (FOLLOW-UP, not yet done)
`/api/search` and `scheduled_scout.py` should share one query/filter/paginate
function so fixes land in both at once. Deferred to its own change; called out
here so it isn't forgotten — it's the durable fix for the drift class of bugs.

## Related
- `wiki/features/foraging.md`
- `scheduled_scout.py`, `content_api.py` `/api/search`
- `wiki/log.md` 2026-06-27 entries
