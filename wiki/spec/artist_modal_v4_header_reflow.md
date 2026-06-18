# Artist Detail Modal v4 — header reflow + curated tracks (UI spec)

> Status: **SHIPPED 2026-06-18** (this pass — reflow + drag-reorder + cut/remove). Playwright-verified on Mural + Clan, 0 console errors. SoundCloud-likes data swap is the NEXT pass (needs Doug's SC URL). Doug-approved via 3-way picker.
> Shared modal `#artistPanel` — one component, opened from Mural (Cave stack), Clan, Foraging, Footprints. Changing it once updates **all** surfaces (satisfies the "consistent on both Mural + Clan" requirement by construction). Builds on [artist_detail_modal.md](artist_detail_modal.md) (centered modal) + [artist_modal_v3_visual_stats.md](artist_modal_v3_visual_stats.md) (metric tiles).

## Why (Doug, 2026-06-18, BLAM! modal screenshot)
Five asks: (1) "Suggested tracks" should be tracks *Doug* has liked of the artist + drag-to-reorder by preference; (2) "Cut from tracking" vs "Remove" look identical — clarify; (3) move Notes up beside the header; (4) add artist location if shared on SoundCloud; (5) replace the "SoundCloud ↗" text link with the SC logo; restructure so Notes sits level with name/details/links.

## Decisions (signed off via picker)
1. **Track list = Doug's real SoundCloud likes of the artist** (`Your real SoundCloud likes`). **Two-pass build:** the data integration (read Doug's public likes via the existing app token, filter by artist) is a *separate* backend pass needing Doug's SoundCloud profile URL. **This pass** ships the reflow + **drag-to-reorder** on the existing track section (the reorder mechanism is data-source-agnostic — carries over). Persist order in the already-existing `favs[username].preferred_tracks`.
2. **Cut vs Remove = keep both, distinct icons.** ✂ **Cut** = scissors → artist leaves the Clan and **goes to the Watch list** (`status='cut'` + added to `sc_watching`; record kept so Restore works). 🗑 **Remove** = bin → permanent delete (existing `removeFavourite`). Both: icon buttons with **orange hover** highlight.
3. **Header = two-column.** Left: avatar, name, genre · location, platform logos (SC logo leads). Right: Notes box, level with the header block. Stats tiles / chart / tracks / actions flow full-width below.

## Scope — THIS pass
- **Two-column header** (`.panel-head` → grid: identity left, notes right; collapses to one column < ~640px).
- **SoundCloud logo** replaces the `SoundCloud ↗` text link (inline SC SVG → `a.artist_url`), led into the platform marks row.
- **Location**: show `genre · City, Country` when present. Backend adds `city`/`country` to the `/api/artist` cache-miss response (from the SC profile, non-upserted → **no DB migration**); `refreshArtistLive` maps it; degrades to just genre when absent.
- **Notes moved** into the header's right column (same `#artistNotes` textarea + `saveNotes()`; clan-only, hidden for read-only views as today).
- **Track list drag-to-reorder**: rows get a `⠿` drag handle (HTML5 draggable, vanilla, no deps); drop reorders + saves `preferred_tracks` (array of track urls); render sorts preferred-first. Heading "Suggested tracks" → "Tracks".
- **Action row** → icon buttons (✂ Cut→Watch / ⤓ Export / 🗑 Remove) with orange-hover; `toggleCut` reworked to move to Watch list; tooltips clarify each.

## Out of scope — NEXT pass (needs Doug's SC URL)
- Backend endpoint reading Doug's public SoundCloud likes (`/users/{id}/likes/tracks`), filtered per artist, feeding the track list. Replaces the current scout+top-plays source. Reorder UI already in place.

## Constraints
Dark Sound Cave palette + mono only (standing rule). Reuse existing modal shell / tokens. Vanilla HTML/CSS/JS, no deps. Read-only (non-clan) views keep notes/platforms/actions hidden (unchanged gating). Caveman/editorial tone.

## Files
- `index.html` — `#artistPanel` header markup → two-column (identity + notes); action row → icon buttons.
- `js/app.js` — `renderPanel` (header reflow, SC logo, location, track drag-reorder via `preferred_tracks`); `refreshArtistLive` (map location); `toggleCut` → cut-to-watchlist; new drag handlers.
- `css/style.css` — `.panel-head` two-column grid; notes-in-header; `.track-row` drag handle; action icon buttons + orange hover.
- `content_api.py` — `artist_stats` returns `city`/`country` (cache-miss response only).
- `wiki/glossary.md` if "Suggested tracks"→"Tracks" label matters; `wiki/log.md`.

## Build notes
- **Shared modal** `#artistPanel` restructured once → Mural + Clan + Foraging + Footprints all inherit (Playwright-confirmed identical on Mural stack and Clan card).
- **Header** `.panel-head` flex-column-centred → `.panel-head-grid` (2-col): `.panel-identity` (avatar + name + `genre · location` + SC logo + platform marks) left, `.panel-head-notes` (#panelNotesSection moved here from body) right. Corner star/✕ stays absolute top-right (`z-index:2`, header `padding-top:34px` clears it). Collapses to 1 col < 640px.
- **SC logo**: `#panelSCLink` text → `scIcon('soundcloud')` (new line-art icon in `icons.js`) linking `a.artist_url`. Always visible (identity, not gated like the platform marks).
- **Location**: backend `artist_stats` returns `city`/`country`/`location` (cache-miss response, **non-upserted → no DB migration**); `refreshArtistLive` maps `live.location`; `renderPanel` shows `[genre, location].filter(Boolean).join(' · ')`. Degrades to genre-only when absent or before the live fetch lands. **Live SC fetch not yet proven** (needs content_api running + a profile with a city set) — only the frontend display path is verified (seeded `location`).
- **Tracks** → `<h3 id="tracksHeading">Tracks`; rows get a `⠿` braille grip (clan only, `draggable`), HTML5 DnD reorder via `wireTrackDrag`/`saveTrackOrder` persisting `preferred_tracks` (urls); `renderPanel` sorts preferred-first. (First tried an SVG grip via `scIcon('grip')` but the hydrated SVG computed 0×0 inside `.track-drag` — root cause not chased; braille glyph is simpler and reliable.)
- **Actions** → `.icon-btn`s: ✂ Cut (`scIcon('cut')`/`restore`) → `toggleCut` now sets `status='cut'` **+ adds to `sc_watching`** (record kept → Restore reverses both); ⤓ Export; 🗑 Remove (`danger`, red hover). Cut/Export = orange hover, Remove = red.
- **Verified** (8 seeded clan, SKH w/ tracks): two-col header, notes-in-header, SC logo, `genre · London, GB`, 7 grip rows, drag→reorder persists + re-applies on re-render, Cut→watchlist + Restore, Clan card opens the same redesigned modal, 0 console errors. Screenshots `scratch/artist_modal_v4*.png`.
- **Dev gotcha:** python `http.server` heuristic-caches JS/CSS with no-revalidate → had to `fetch(file,{cache:'reload'})` then reload to pick up icon/CSS edits.
