# Foraging — two-column rotation/watching layout

> Status: in-flight 2026-05-12. Doug-approved scope, dark palette locked.

## Why
Watching is currently buried under "Previously Discovered" alongside Pending. Doug wants the watching list raised to the top of the page next to This Week's Rotation, so the artists he's actively tracking are visible at a glance.

## Layout
Inside Foraging > Manual Search sub-tab, below the search form:

```
┌──────────────────────────┬──────────────────────────┐
│ THIS WEEK'S ROTATION     │ WATCHING                 │
│ (new tracks not yet      │ (artists user is         │
│  in clan / dismissed /   │  actively monitoring)    │
│  watching)               │                          │
│ - card                   │ - card                   │
│ - card                   │ - card                   │
│ - card                   │                          │
└──────────────────────────┴──────────────────────────┘

PREVIOUSLY DISCOVERED (full width, below)
- Pending list (older discoveries not yet acted on)
```

Live search results override the 2-col layout and render full-width in `#foragingRotation` only (existing behavior preserved).

## Files
- new: `css/foraging.css` — `.forage-top-grid` + responsive collapse
- edit: `index.html` — wrap rotation + new watching div in grid
- edit: `js/foraging.js` — `renderForaging()` writes watching to its own container
- update: `wiki/features/foraging.md`, `wiki/log.md`

## Anti-examples
No Spotify tiled grid, no Bloomberg density. Cards keep the current vertical-block forage-card style, just narrower.

## Constraints
- Dark Sound Cave palette only (standing rule).
- Desktop-first. Collapse to single column under 900px.
- Reuses `getWatching()` / `saveWatching()` / `buildForageCard()` — no new data model.
