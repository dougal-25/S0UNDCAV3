# 0012 — Invite-gate launch safety (gate the gift, not the signup)

**Date:** 2026-06-25 · **Status:** accepted · **Branch:** `free-trial-invite-gate`

## Context

Doug is about to send the live app to music-industry friends to test → strangers create accounts. A pre-launch audit (3 parallel agents: auth/abuse, secrets/RLS, billing/credits) found:

- **Solid:** no leaked secrets (client uses the public anon key), RLS enabled + `auth.uid()`-scoped on every per-user table, backend verifies JWTs server-side and never trusts client-supplied ids, credit *spending* is an atomic server-side Postgres debit that can't be cheated.
- **One real blocker:** signup is wide-open, every new account auto-gets **100 non-expiring credits** ([db/0004](../../db/0004_auth_sync.sql)), and there is **zero rate-limiting**. Each generation costs real fal money → a scripted attacker could farm throwaway emails for ~£6 of fal spend per account, unbounded.
- **Audit correction:** the audit claimed `bypass.html` (Doug's personal JWT) was committed to the public repo. **False** — it's gitignored ([.gitignore:15](../../.gitignore#L15)) and absent from git history. No exposure; local-only, token expired.

## Decision

**Gate the gift, not the signup.** A signup-form code check is theatre — the Supabase anon key is public, so a script can call `signInWithOtp` directly and bypass the frontend. Instead:

- New accounts start with **0 credits** → can't generate → cost nothing.
- Trial credits are gifted only by redeeming an invite code, **verified server-side** (`/api/redeem-invite`, constant-time compare vs `INVITE_CODES` env), **once per account** (`users.trial_claimed`), **rate-limited per IP**.
- No-expiry is free — the credit model has no TTL anywhere, so gifted tokens never expire by construction.

## Alternatives considered

- **Email allowlist** — most control, but manual per person; rejected for a self-serve trial.
- **Supabase invite-only (disable open signups)** — zero code, but fully manual + doesn't feel self-serve.
- **No gate, cut grant low + rate-limit** — lowest friction, but a script can still farm low-value accounts and the friend gift is stingy.
- **Chosen: invite code** (Doug's pick) — self-serve for friends, blocks anonymous farming, rotatable on leak.

## Consequences

- Paid tiers (Starter/Pro) are shown but **greyed** during the beta — Stripe price metadata is stale (grants old 500/2000/6000 vs displayed); `scripts/stripe_bootstrap.py` must be re-run before they go live.
- Per-endpoint *generation* rate-limits remain a fast-follow; the 0-credit gate is the real protection.
- Requires migration [db/0020](../../db/0020_free_trial_invite.sql) applied + `INVITE_CODES` set in Railway before the gate is live in prod. `/api/me` was made column-absent-tolerant so deploy order is forgiving.
