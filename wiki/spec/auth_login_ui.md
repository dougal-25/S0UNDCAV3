# Spec — Auth login UI

> Status: **Approved 2026-04-29** (Doug accepted recommendations on all 4 framing questions).
> **Amended 2026-05-07** — added optional password sign-in alongside magic link (dev ergonomics).

## Decisions (UI Change Protocol)

1. **References / mood / anti-examples** — reuse the existing cave-entrance splash aesthetic. Dark, organic, electronic-music. No new tokens.
2. **Auth flow** — Magic link via Supabase (`signInWithOtp`) is the primary/default flow. **Password sign-in (`signInWithPassword`) is a secondary option** for users who have set one. **"Forgot password?" link** (visible only in password mode) calls `resetPasswordForEmail(email, { redirectTo })`; Supabase emails a recovery link, and on return the app listens for the `PASSWORD_RECOVERY` event, auto-opens the account dropdown's password panel, and focuses the new-password input. No signup form (magic-link-only signup). No Google OAuth (yet).
3. **Login surface** — full-page splash gate. The existing cave-entrance splash becomes the login screen when no session exists. Email field appears centred over the cave mouth. Below the email field: two buttons — primary "Email me a link", secondary "Use password" which reveals a password field + "Sign in" button. Once auth returns a session, the reveal animation plays into the app.
4. **Account/settings** — minimal: email, tier, credits balance, sign-out, **"Set / change password"** affordance (calls `updateUser({ password })`). Nav-anchored dropdown. Phase D adds Stripe customer portal link.
5. **Hero moment** — type email → submit → "Check your inbox" overlay → click email link → reveal animation plays once → app shown. Password path: type email + password → "Sign in" → reveal animation plays once → app shown. Reuses the existing splash animation; no new motion code.

## Constraints

- Tokens already live in `:root` of `css/style.css` (no separate `tokens.css`). Reuse existing `--bg`, `--card`, `--red`, `--heading`, `--body`, etc.
- No new fonts, no new colours.
- Mobile-first (the existing splash is responsive).

## Troubleshooting — when signup/login fails

Added 2026-08-03 after a live outage. Work down this list; the first two are infrastructure and account for most "login is broken" reports.

1. **Is the Supabase project paused?** Free-tier projects auto-pause after ~7 days idle, which stops `*.supabase.co` serving entirely — every auth call fails at the network layer. Check the project status (dashboard, or the projects API — a paused project reports `INACTIVE`); a DB query timing out on *connect* and empty auth logs are corroborating signs. Restore from the dashboard. **No code change fixes this.** The Railway backend uses the same project, so Forge will be down too.
2. **Did the magic-link email actually send?** Signup here is magic-link-only, so email delivery *is* signup. Supabase's built-in SMTP allows only ~2 emails/hour project-wide — a batch of new testers will mostly get nothing, reported as `over_email_send_rate_limit`. Custom SMTP is required before any real user push.
3. **Are email signups enabled?** Auth → Providers → Email. If off, new addresses get `otp_disabled`.
4. **Is the return URL allowlisted?** Auth → URL Configuration. The frontend sends `origin + pathname` as `emailRedirectTo`/`redirectTo`, so every host the app is served from needs an entry (currently the Vercel URL + `http://localhost:3000/**`).

The UI copy comes from `explain()` in `js/lib/supabase.js`, which maps the above to plain-English messages; anything unrecognised is shown verbatim, and the full error is always in the browser console.

## Out of scope (later phases)

- Google / Apple sign-in
- Password-based signup (only existing accounts can set a password from account settings)
- Custom-branded reset emails (using Supabase's default template)
- Avatar upload, change-email flow
- Email verification UX (Supabase handles)
- Stripe billing portal (Phase D)
- Re-auth prompts on session expiry (just sign back in)
