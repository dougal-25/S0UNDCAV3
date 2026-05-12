# Reflection Tab — UI spec

**References:** Unveil Projects nav row (screenshot 2026-05-12 — tall outlined pills flush with the top edge of the viewport, text bottom-left of each pill).
**Mood/feel:** continuous with the rest of the Sound Cave dark theme. Tall pills feel architectural, more like signage than UI chrome. Each pill = its own "block" the eye can land on.
**Hero moment:** the new REFLECTION pill — clicking it slides the user to a full page that owns their profile data, instead of a cramped dropdown stuck in the top-right corner.
**Anti-examples:** the previous account dropdown (small, hidden, easy to miss), generic SaaS settings page with sidebar.
**Constraints:** desktop-first. Dark theme only. All values from `tokens.css` / CSS custom properties — no hardcoded hex or px in feature CSS where avoidable.

## Build notes (2026-05-12)

### Header overhaul
- All top-nav pills (`.htab`) now share a single tall geometry: `min-height: 84px`, `min-width: 150px`, `flex-direction: column`, `justify-content: flex-end`, `align-items: flex-start` — so the text labels land in the bottom-left corner of each pill.
- Header padding: vertical padding removed from `.header-tabs` and pills `align-items: stretch` — they now reach the top edge of the header strip.
- Brand pill (`.htab-brand`) shares the same shape, but stacks a **48px logo** at the top and the `S0UNDCAV3` wordmark bottom-left underneath. The logo dominates inside the pill; the wordmark anchors it.
- Sound toggle (`#appSoundToggle`) now has `class="app-sound-toggle htab"` — inherits the tall-pill styling, only override is `margin-left: auto` to push it to the far right of the header.

### Tab structure
- New top tab `REFLECTION` (`data-tab="reflection"`), added to `TOP_TABS` in `switchTab()` so it gets the active-state highlight when current.
- New `#tab-reflection` page section in `index.html`, sitting before `#tab-index`.
- All controls from the old `#accountMenu` dropdown now live on this page:
  - `reflectionAvatar` + `reflectionEmail` — header
  - `reflectionTier` / `reflectionCredits` / `reflectionSocials` — 3-column stat grid
  - `reflectionConnectSocials`, `reflectionSetPassword` (toggles inline form), `reflectionUpgrade`, `reflectionManageBilling`, `reflectionSignOut` — vertical action stack
- Switching to the Reflection tab calls `window.refreshReflection()` so credits/socials counters re-hydrate on view.

### What got deleted
- `index.html`: the entire `<div class="account">…</div>` block (avatar pill + dropdown).
- `css/style.css`: every `.account-*` rule (`account`, `account-btn`, `account-menu`, `account-row`, `account-label`, `account-link`, `account-signout`, `account-pwd-form`, `account-avatar`, `account-email`, `account-caret`).
- `js/app.js`: the entire `initAccount()` IIFE, replaced by `initReflection()`. Recovery flow now navigates to the Reflection tab and reveals the password form there (instead of opening a dropdown that no longer exists).

### Cross-file dependency we patched
- `js/firepit.js:271` previously read `document.getElementById('accountCredits')` to update the credits ticker after each generation. Updated to read `reflectionCredits`. Without this fix, credits would silently fail to update post-generation.
