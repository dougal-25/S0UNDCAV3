# Firepit — Trail Map UI Spec

> Status: **Draft** — UI Change Protocol answers from Doug, 2026-04-29. Awaiting build sign-off after first screenshot.

## 1. References

- **Carjoy active-bookings dashboard** (Doug-supplied): dark week-grid calendar with top-left logo + sidebar nav, Week/Month/Year pill toggle, draggable booking cards in a 7-column × hourly-row grid, blue "+ New booking" CTA top-right. Cards stack vertically per day, show one-line title + venue + small avatar dots.
- Echoes: Linear cycles UI (terse, monochrome), Things 3 (calm density, no chrome).

## 2. Mood / feel

Mind-blowingly simple. Same dark cave aesthetic as the rest of Sound Cave — `--bg #4a4a4a`, `--card #545454`, DM Sans, `--red` only as accent. Monochrome-cool. Drag-and-drop wherever it makes sense, but **never more information on screen than the user is acting on right now**. Use tabs/sub-views to avoid clutter. The vibe is "cool tool, not Buffer."

## 3. Hero moment

**Drag a Stash item onto a date cell.** The card lifts out of the sidebar with a slight scale + shadow, the calendar cell it's hovering glows red-faint, on drop the card snaps into the cell as a compact scheduled-pill with a quick fade-in. That's the moment that has to feel right.

## 4. Anti-examples

- **Buffer / Hootsuite** — too many platform icons, status bars, follower counts on screen at once. Enterprise flat. Avoid.
- **Notion calendar** — dense, every cell screaming for attention. Avoid info-overload.
- **Google Calendar** — corporate, blue, busy. Avoid.

## 5. Constraints

- **Desktop-first**, dark only, reuse existing palette in `css/style.css :root` (no new tokens unless gap identified)
- **Mobile responsive** but secondary — drag-drop is desktop; mobile gets tap-to-schedule
- Monochrome type styling (DM Sans, weights 400/500/700, no decorative fonts)
- Match Carjoy reference for layout density: calendar fills the canvas, sidebar is collapsible, top toolbar is one row

## Interaction spec (v1)

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [◀ April 2026 ▶]  [Week | Month]  [Today]    [Stash ▸] │  toolbar
├─────────────────────────────────────────────────────────┤
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                       │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐                            │
│  │ 1││ 2││ 3││ 4││ 5││ 6││ 7│                            │  month grid
│  │● ││  ││● ││  ││● ││● ││  │                            │  ● = scheduled
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘                            │
└─────────────────────────────────────────────────────────┘
```

### Views
- **Month** (default): 7 × 5–6 day grid. Each cell shows date + up to 3 scheduled-pills, "+N more" if overflow.
- **Week**: 7-column strip, full-height cells, all scheduled items visible without truncation. No hourly rail in v1 — too much on screen. Time-of-day surfaces only inside the schedule modal.
- View toggle: pill button next to date nav.

### Stash sidebar (collapsible drawer, right edge)
- Default collapsed; click "Stash ▸" to slide open
- Lists all draft stash items with thumbnail (if image) + type icon + 2-line preview
- Each item is `draggable="true"`
- Click instead of drag → opens detail in modal with "Schedule…" button

### Drag-drop
- HTML5 drag API. Stash item carries `dataTransfer` with stash_item_id.
- On `dragover` cell: cell gets `.dragging` class (red-faint background).
- On `drop`: create `scheduled_post` mock object with default time = 12:00 of that date, default platforms = `['ig']`, status = `scheduled`. Open the schedule modal pre-filled.

### Schedule modal
- Stash content preview (read-only)
- Date + time picker
- Platform multi-select (IG / TikTok / X / LinkedIn) — pill toggles
- Status (read-only on create; editable on edit: scheduled / posted / failed)
- Save / Delete / Cancel

### Scheduled pill
- Shows: type icon · 1-line title · platform dots
- Click → reopens modal in edit mode
- Status colour: scheduled = neutral grey, posted = green, failed = red

### Mock store
- localStorage key `sc_scheduled_posts` (array of `scheduled_post` objects)
- Stream 1 will swap this for `/api/scheduled-posts` later (`// TODO` marker in code)

## Data shape (mock contract for Stream 1)

```js
{
  id: 'sp_<timestamp>_<rand>',
  stash_item_id: 'c_…',         // FK to stash_items.id
  scheduled_for: '2026-05-12T18:00:00Z',
  platforms: ['ig', 'tiktok'],  // subset of: ig, tiktok, x, linkedin
  status: 'scheduled',           // scheduled | posted | failed
  error_message: null,           // populated on failed
  created_at: ISO,
  modified_at: ISO,
}
```

## Out of scope (v1)

- Hourly time grid (Carjoy's hourly rail) — defer until Doug confirms it's wanted
- Recurring posts
- Bulk multi-select drag
- Mobile drag-drop (tap-to-schedule only on mobile)
- Real publishing (Stream 1 Phase G handles via Ayrshare)
