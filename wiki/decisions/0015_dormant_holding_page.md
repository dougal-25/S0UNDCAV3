# 0015 — Dormancy: replace the app with a holding page

**Date:** 2026-08-03 · **Status:** approved (Doug, in session) · **Branch:** `claude/soundcave-signup-login-errors-qeq7zr`

## Context

Doug has taken permanent employment and is pausing the build. The ask: the public
site should be just a homepage — the logo, the brand name below it, the cave
drone playing — like the logo-click re-show inside the app. A sound toggle,
**defaulting to ON**. No login, no app.

## Decision

- **`index.html` becomes a self-contained holding page** on this branch: logo +
  wordmark + drone + `{SOUND ON/OFF}` toggle + CRT/grain atmosphere + corner
  stamp. One file; it loads only the logo SVG, the mp3, and the DM Mono font.
  It does **not** load `css/style.css`, any `js/`, or the Supabase SDK — so it
  keeps working with the backend and database switched off.
- **No new repo, no new branch structure.** The whole app remains in git
  history and on `main` until this merges; reviving it is `git revert` of one
  commit. Hosting stays exactly as-is: Vercel serves this repo's `main`
  (Supabase is only the database/auth layer — nothing gets "uploaded" to it).
- **Sound defaults ON.** Browsers block autoplay before a user gesture, so
  "on" means: try immediately, and if blocked show `{TAP ANYWHERE FOR SOUND}`
  and start on the first gesture (the same iOS-proof pattern the app used).
  An explicit OFF is remembered in `localStorage` (`sc_sound_on`).
- **No entrance swirl.** Doug's reference was the logo-click re-show, which
  deliberately skips the 172-path swirl. The logo stays a plain `<img>` — no
  fetch/parse/animate step, so there is no state where the mark fails to render.
- The app-side pieces (Supabase pause, Railway stop, `main` merge) are
  operational steps, tracked in the log.

## Revival

`git log` for this commit on `index.html`, revert it, redeploy, unpause the
Supabase project (dashboard → restore, ~7 min), restart Railway. Everything
else — data, migrations, credits, the whole studio — is untouched.
