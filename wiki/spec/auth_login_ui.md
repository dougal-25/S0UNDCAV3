# Spec — Auth login UI

> Status: **Approved 2026-04-29** (Doug accepted recommendations on all 4 framing questions).
> **Amended 2026-05-07** — added optional password sign-in alongside magic link (dev ergonomics).

## Decisions (UI Change Protocol)

1. **References / mood / anti-examples** — reuse the existing cave-entrance splash aesthetic. Dark, organic, electronic-music. No new tokens.
2. **Auth flow** — Magic link via Supabase (`signInWithOtp`) is the primary/default flow. **Password sign-in (`signInWithPassword`) is a secondary option** for users who have set one. No signup form (magic-link-only signup). No Google OAuth (yet).
3. **Login surface** — full-page splash gate. The existing cave-entrance splash becomes the login screen when no session exists. Email field appears centred over the cave mouth. Below the email field: two buttons — primary "Email me a link", secondary "Use password" which reveals a password field + "Sign in" button. Once auth returns a session, the reveal animation plays into the app.
4. **Account/settings** — minimal: email, tier, credits balance, sign-out, **"Set / change password"** affordance (calls `updateUser({ password })`). Nav-anchored dropdown. Phase D adds Stripe customer portal link.
5. **Hero moment** — type email → submit → "Check your inbox" overlay → click email link → reveal animation plays once → app shown. Password path: type email + password → "Sign in" → reveal animation plays once → app shown. Reuses the existing splash animation; no new motion code.

## Constraints

- Tokens already live in `:root` of `css/style.css` (no separate `tokens.css`). Reuse existing `--bg`, `--card`, `--red`, `--heading`, `--body`, etc.
- No new fonts, no new colours.
- Mobile-first (the existing splash is responsive).

## Out of scope (later phases)

- Google / Apple sign-in
- Password-based signup (only existing accounts can set a password from account settings)
- Avatar upload, change-email flow
- Email verification UX (Supabase handles)
- Stripe billing portal (Phase D)
- Re-auth prompts on session expiry (just sign back in)
