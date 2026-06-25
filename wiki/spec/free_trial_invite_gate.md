# Spec — Free Trial + Invite-Code Gate

**Status:** approved 2026-06-25 (Doug) · **Branch:** `free-trial-invite-gate`
**Why now:** Doug is about to send the live app to music-industry friends to test. That means strangers create accounts. A pre-launch security audit (see [decisions/0012](../decisions/0012_invite_gate_launch_safety.md)) found one real blocker: signup is open, every new account auto-gets **100 free credits**, and there is **zero rate-limiting** → a scripted attacker could farm throwaway emails and burn ~£6 of fal money per account, unbounded.

## Goal

Let industry friends **self-serve** a free trial (create account → claim gifted, non-expiring credits) **without** exposing Doug's fal balance to anonymous farming. Present 3 plan tiers — **Free Trial / Starter / Pro** — with only **Free Trial** active; Starter + Pro shown but greyed ("Coming soon") until paid billing is re-validated.

## Key design decision — gate the *gift*, not the *signup*

A code check on the signup form is security theatre: the Supabase **anon key is public** (it must be, for the browser SDK), so a script can call `signInWithOtp` directly and skip the frontend. So:

- A raw new account starts with **0 credits → cannot generate → harmless** (no fal spend possible).
- Entering a valid invite code (verified **server-side** against the `INVITE_CODES` env secret) gifts the trial credits via the existing `grant_credits` RPC, **once per account** (`users.trial_claimed` one-time flag).
- This ties cleanly to the "Free Trial" tier: *enter your code → claim your free credits*.

No-expiry is already guaranteed by the data model — credits have no TTL anywhere (`credits_ledger` has no `expires_at`). So gifted trial tokens never expire, by construction. No schema work needed for that property.

## Scope

### Backend (`content_api.py` + migration `db/0020_free_trial_invite.sql`)
- **Migration:** `handle_new_user()` grants **0** credits (was 100); add `users.trial_claimed boolean default false`; mark existing rows `trial_claimed = true` (they already received their grant).
- **Constants (env-driven):** `INVITE_CODES` (comma-sep), `FREE_TRIAL_CREDITS` (default 100). Missing `INVITE_CODES` = no codes redeemable = safe default.
- **`POST /api/redeem-invite`** — authed; validates `code` against `INVITE_CODES` (constant-time); atomic one-time claim (`update users set trial_claimed=true where id=? and trial_claimed=false`); on success calls `grant_credits(uid, FREE_TRIAL_CREDITS, 'free_trial_invite')`. Returns new balance. **Rate-limited per client IP** (in-memory, X-Forwarded-For aware) — the new farming surface.
- **`/api/billing/plans`** → Free Trial / Starter / Pro with a `disabled` flag; drop the credit pack during beta. **`/api/me`** also returns `trial_claimed`.

### Frontend (`js/app.js`, `index.html`, `css/style.css`)
- Billing modal renders 3 tiers; disabled cards greyed with "Coming soon" CTA; Free Trial card has an inline **invite-code input + Claim** button → `POST /api/redeem-invite` → on success refresh credits + success toast.
- Tier display maps base `solo`→"Free Trial", `label`→"Starter", `agency`→"Pro" (DB enum unchanged — Starter/Pro aren't purchasable yet, so no enum migration).
- Discoverability: a fresh user (0 credits, not claimed, not admin) sees the Reflection action relabelled **"🎁 Claim free credits"**.
- Fix the stale billing subtitle ("Text 1cr · Image 5cr" → real costs).

### Cleanup / hygiene
- Delete `bypass.html` (Doug's personal JWT committed to a public repo — expired, but bad hygiene).
- Add `INVITE_CODES` + `FREE_TRIAL_CREDITS` placeholders to workspace `.env`.

## Out of scope (flagged, not done here)
- **Per-endpoint generation rate-limits** — the 0-credit gate is the real protection; a generous per-IP gen cap is a fast-follow.
- **Re-validating paid billing** — Stripe price metadata is stale (grants old 500/2000/6000 vs displayed amounts). Must fix `scripts/stripe_bootstrap.py` **before** Starter/Pro go live. Greying them out now is precisely to avoid this.

## Manual prod steps (Doug — required for the gate to take effect live)
1. Apply `db/0020_free_trial_invite.sql` in the Supabase SQL editor.
2. Set `INVITE_CODES=<your-code>` and (optional) `FREE_TRIAL_CREDITS=100` in **Railway** env (local `.env` only covers localhost).
3. Until 1 + 2 are done, prod still grants 100 to any signup — do **not** send the link before then.

## UI framing (ui-change-protocol — extension of existing component)
- **References:** the *existing* billing modal (`.plan-card` / `.plan-cta` in `css/style.css:425-491`). This is an extension, not a redesign — reuse those classes + `tokens.css` vars (no hardcoded hex/px).
- **Mood/feel:** consistent with the in-product dark Sound Cave palette (non-negotiable dark) and caveman-leaning microcopy.
- **Hero moment:** the *claim* — a fresh tester enters their code and instantly sees credits land ("🎉 X credits added"). It's the first real action every industry tester takes; it must feel rewarding and obvious.
- **Anti-examples:** don't make it feel like a hard paywall/upsell wall (Starter/Pro are quiet "coming soon", not nags). No light theme.
- **Constraints:** desktop + mobile (existing modal already collapses to 1 column at 720px); dark; reuse `--red`/`--card`/`--border`/`--muted`/`--heading` tokens.

## Acceptance
- New signup → 0 credits, cannot generate (402).
- Redeem valid code → `FREE_TRIAL_CREDITS` granted, balance shown, second redeem → 409 already_claimed.
- Invalid code → 403; redeem endpoint rate-limited.
- Plan selector shows Free Trial (active) + Starter/Pro (greyed).
