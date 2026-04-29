# Feature: Firepit — Stash

> Status: **Built (basic).** Supabase-backed (`stash_items` table) via `/api/stash` service-role proxy. Frontend keeps an in-memory cache; one-shot `migrateLocalStorageStash()` ports legacy `sc_content_library` rows on first load, then clears localStorage.

## What it does
Library of all content generated in Forge. User can browse, re-open, copy, and (future) push to Trail Map for scheduling.

## Why it exists
Generation without persistence is throwaway. Stash is the bridge between "I made something" and "I'm going to publish it" — the input to Trail Map and to multi-platform distribution.

## Acceptance criteria
- [x] Saves Forge output to library
- [x] Browse / re-open
- [ ] Filter by artist / type / date
- [ ] Push to Trail Map for scheduling
- [x] Migrate from `localStorage` to server-side storage (SaaS prerequisite) — done 2026-04-29

## Dependencies
- `js/firepit.js` (in-memory cache + migration helper)
- `content_api.py` `/api/stash` endpoints (service-role; Phase B replaces with per-user JWT)
- Supabase `stash_items` (RLS scoped on `user_id`)

## Related
- `wiki/features/firepit_forge.md` — produces the content
- `wiki/features/firepit_trail_map.md` — consumes Stash items for scheduling
