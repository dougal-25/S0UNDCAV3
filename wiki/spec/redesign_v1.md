# App-wide redesign v1 — UI spec

**Status:** Shipped 2026-05-08 overnight, Doug-confirmed only on the **home tab + splash**. The other tabs (Cave dashboard, Foraging, Clan, Footprints, Firepit, Trail Map) inherit the same chrome but were not individually visually verified during the overnight run — see "Open verifications" below.

**Surface:** Everything outside the splash — header, nav, tabs, cards, panels, inputs, buttons, badges, billing modal, artist detail panel, account dropdown, scrollbars.

**Predecessor:** [`splash_cave_entrance.md`](./splash_cave_entrance.md) — the splash redesign Doug signed off ("looks fucking awesome. i love."). This pass extends that visual language into the rest of the app.

## Direction (one line)

**Take the splash's KVS-aligned skin (mono type, bracket-ready microcopy, single orange-red accent, sharp edges, subtle grain, near-black palette) and stretch it across the app — but lighter touch than the splash: no CRT bezel, no scanlines, body-text data stays sans-serif for legibility.**

## What changed (concretely)

### Tokens
- New file `tokens.css` (loaded *before* `style.css`) defines the splash-tier palette + motion + type. Existing app rules now reference these vars.
- `:root` in `style.css` (the app-tier palette) lifted to KVS-aligned dark + warm:
  - bg `#0f0d0c` (was `#4a4a4a`)
  - card `#161312`, elevated `#1d1916`, hover `#26201d`
  - border `#2a2421`, border-lt `#3a342f`
  - `--red` repurposed to `#ff4500` (the KVS orange) — every JS-set red (avatars, error states, accents) auto-updates.
  - body text `#e0dcd9` (a hair warm) on the new dark bg.

### Body
- Subtle film grain via fixed `body::after` (2.5% opacity, mix-blend overlay) — texture without distraction.
- Mono font applied via class-list selector to: `h1-h6`, `.htab`, `.btn-red`, `.section-title`, `.panel-title`, `.stat-label`, `.badge`, `.chip`, `.account-email`, `.account-label`, `.tab-label`, `.pill`. Body data text stays sans.

### Header / nav
- Header bg `rgba(15,13,12,0.92)` (matches new dark), 56px height kept.
- Logo wordmark switched to mono.
- htabs: mono uppercase, smaller (11px), wider tracking, accent-color underline on active (was bg flip).
- Count badges: outlined boxes (no rounded pill), mono, accent border when active.

### Account dropdown
- Avatar: outlined accent square (was filled red circle).
- Email: mono, secondary color.
- Menu items: outlined accent on hover, sign-out flips to filled accent.
- All sharp edges (radius 0).

### Component primitives
- `.card`, `.card-elevated`, `.stat-card`: radius 2px (was 6-12px).
- `.stat-card`: corner-tick (8px orange L-shape top-left) — KVS-style chrome.
- `.stat-value`, `.panel-stat-val`, all `[class*="-count"]`: mono, mono-tracking.
- `.input`: sharp edges, accent border on focus.
- `.btn-red`: outlined accent (transparent bg, orange border + text), fills on hover. Inverts the previous "filled red button" pattern — fits the KVS restraint.
- `.btn-outline`: same shape, neutral border that flips accent on hover.

### Artist detail panel
- Inherits new card/input styles via tokens.
- Avatar circle preserved (intentional — visual focus).
- Section headings already small-caps; now mono via override block.

### Billing modal
- Sharp edges throughout.
- Title: mono uppercase 18px (was bold 24px).
- Plan-card hover shadow recoloured to orange-red.

### Trail Map (`css/trail_map.css`)
- Override block added — buttons/period header mono+sharp, day cells radius 2px.

### Scrollbars
- Custom thin scrollbars matching theme (border-lt thumb, accent on hover).

## Files touched

- **New:** `tokens.css`, `js/cave_entrance.js`, `wiki/spec/splash_cave_entrance.md`, `wiki/spec/splash_cave_entrance_assets/v1_splash.png`, `wiki/spec/redesign_v1.md` (this file), `wiki/spec/redesign_v1_assets/{splash,home}.png`
- **Edited:** `index.html` (entrance markup + tokens.css link + cave_entrance.js script tag), `css/style.css` (entrance block, root tokens, header/nav/tabs/account/cards/inputs/buttons/billing + appended app-wide override block), `css/trail_map.css` (appended override block), `js/app.js` (glitch hook + halftone class + reveal timing + bracket microcopy in toggle text)
- **Untouched (deliberately):** all data-loading JS, all auth logic, all per-tab render functions. Only visual properties + CSS class hooks.

## Confirmed renders

- **Splash:** [`splash_cave_entrance_assets/v1_splash.png`](./splash_cave_entrance_assets/v1_splash.png) — Doug-confirmed.
- **Home tab:** [`redesign_v1_assets/home.png`](./redesign_v1_assets/home.png) — captured headless overnight, NOT yet Doug-confirmed.
- **Splash post-overrides:** [`redesign_v1_assets/splash.png`](./redesign_v1_assets/splash.png) — sanity-confirms overrides didn't break splash.

## Open verifications (for Doug, in the morning)

These tabs share the same chrome (header, htabs, cards, inputs, buttons) so should be consistent — but please visually walk through each in the real browser:

1. `THE CAVE → Dashboard` — stats cards, genre bar, charts
2. `THE CAVE → Foraging` — search modes, results grid
3. `THE CAVE → Clan` — saved-artist roster, link inputs
4. `THE CAVE → Footprints` — analytics charts
5. `FIREPIT → Forge` — content generator inputs + output card
6. `FIREPIT → Stash` — saved content list
7. `FIREPIT → Trail Map` — calendar grid
8. **Artist detail panel** (click any artist) — slide-in panel, link inputs, snapshot table
9. **Billing modal** (account menu → upgrade) — three plan cards, hover state
10. **Account dropdown** (top-right) — menu, sign-out hover state

If any one is visually broken, paste a screenshot — overrides are concentrated at the bottom of `style.css` so reverts are surgical.

## Anti-pattern alert (for future me)

**Don't ship-check on headless screenshots alone.** During this pass, the headless screenshot harness rendered the same "home" content for every `?tab=foo` because tab-switching depends on async-fetched data that never loads in headless. The chrome is verified; the per-tab content layouts are not. Only screenshot what the user will actually see.

## Tech debt explicitly carried forward

1. **`css/style.css` is 1466 lines.** Over the 500 guideline by ~3x. Net add this overnight: ~150 lines (override block + targeted edits). Refactor into modules (entrance/header/cards/panels/billing) is queued — too risky to do unattended.
2. **Logo SVG** still uses old grey hex fills with a `brightness(2.2)` CSS filter band-aid. Replace by recolouring the SVG paths against new tokens — the orange flame is slightly off-tone under the filter.
3. **WebAudio drone** is a placeholder (synthesised lows). Swap to a real ambient asset by setting `AUDIO_URL` in `js/cave_entrance.js`.
4. **Per-tab render content** not visually verified overnight. Doug's morning walkthrough is the gate.
