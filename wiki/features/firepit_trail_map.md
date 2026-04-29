# Feature: Firepit — Trail Map

> Status: **UI v1 in progress** on branch `feature/trail-map-ui` (Stream 3). Frontend-only, mock data via `localStorage`. Backend wiring is Stream 1 Phase G (Ayrshare).

## What it does
Content calendar. Schedule Stash items for publication across platforms (Instagram, TikTok, X, LinkedIn) on specific dates/times. Month + Week views, drag-and-drop from a side drawer.

## Why it exists
Bulk content creation without a schedule is just a pile. Trail Map turns Forge output into a publishing plan — and is the **distribution** half of the product's elevator pitch (scout + create + distribute).

## Acceptance criteria
- [x] Calendar UI (month + week views)
- [x] Drag Stash items onto dates
- [x] Per-platform scheduling (IG, TikTok, X, LinkedIn)
- [x] Status: scheduled / posted / failed
- [ ] Platform API integrations for actual publishing — Stream 1 Phase G (Ayrshare)

## UI spec
See `wiki/spec/firepit_trail_map_ui.md` for references, mood, hero moment, anti-examples, constraints.

## Mock data shape (contract for Stream 1)

Stream 3 stores scheduled posts in `localStorage['sc_scheduled_posts']`. Stream 1 Phase G must fulfil this exact shape via `/api/scheduled-posts`:

```js
{
  id: 'sp_<timestamp>_<rand>',
  stash_item_id: 'c_…',          // FK → stash_items.id
  scheduled_for: '2026-05-12T18:00:00Z',
  platforms: ['ig', 'tiktok'],   // subset of: ig, tiktok, x, linkedin
  status: 'scheduled',            // scheduled | posted | failed
  error_message: null,            // populated when failed
  created_at: ISO,
  modified_at: ISO,
}
```

Search `js/trail_map.js` for `// TODO: replace mock store` markers — those are the swap points when the API lands.

## Dependencies
- `wiki/features/firepit_stash.md` — input (live cache via `getContentLibrary()`)
- Stream 1 Phase G Ayrshare integration — for actual publishing
- Backend job runner for scheduled posts (Inngest, per decision 0003)

## Open questions
- Hourly time grid in Week view (like Carjoy reference) — defer until v1 is in Doug's hands
- Recurring posts (weekly/monthly) — out of scope for v1
- Bulk multi-select drag — out of scope for v1

## Related
- `wiki/features/firepit_forge.md`, `wiki/features/firepit_stash.md`
- `wiki/spec/firepit_trail_map_ui.md`
