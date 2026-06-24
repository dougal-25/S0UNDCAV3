# Decision 0011 — Admin accounts bypass in-app credits (fal balance is the only ceiling)

> **Date:** 2026-06-23
> **Status:** Accepted. First "admin" concept in the product — there was no role/admin notion anywhere before this (only `tier` solo/label/agency).
> **Context:** Doug's personal account (`douglaswoolfenden@gmail.com`) is the owner/admin account. He wants to dogfood the Forge and make Sound Cave's own promo content without the in-app credit grant getting in the way — bounded only by what his real fal.ai account can pay for. (Dogfooding-through-Forge is the plan from [decision 0010](0010_media_gen_cogs_verified.md).)

## The decision

1. **Admin = unlimited in-app credits.** Allowlisted accounts are never charged the in-app credit cost for any generation (image / video / conjure / refine). The grant balance is irrelevant for them.
2. **fal.ai balance is the real limit.** Every generation still hits fal with the live `FAL_KEY`, so admin spend draws down Doug's real fal credit exactly like any user's. When fal runs dry, the fal call fails naturally — there's no separate cap to maintain.
3. **Allowlist is env-driven, never hardcoded.** The repo is **public** (`github.com/douglaswoolfenden-byte/thesoundcave`), so the admin email must not be committed. `ADMIN_EMAILS` (comma-separated) lives in the gitignored workspace `.env` locally and in Railway env in prod. Missing/empty var = no admins = normal billing for everyone (safe default).

## How it works (implementation)

The in-app credit gate is **entirely server-side** — each generation endpoint calls `_debit()` before the fal call, and the frontend only blocks on a `402` from the backend. So the bypass is a server-side no-op, no DB migration, no endpoint changes:

| Piece | File | What changed |
|---|---|---|
| Allowlist constant | [content_api.py](../../content_api.py) `ADMIN_EMAILS` | Parsed from `os.getenv('ADMIN_EMAILS')` at startup. |
| Per-request flag | `_resolve_user_id()` | Stamps `g.is_admin = email in ADMIN_EMAILS` from the JWT email. |
| Charge bypass | `_debit()` | First line: `if g.get('is_admin'): return None, None` — same "free action" path captions already use. Never charged → no `402`. |
| Refund bypass | `_refund()` | `if g.get('is_admin'): return` — nothing was charged, nothing to refund. |
| UI signal | `/api/me` → `admin: true`; [app.js](../../js/app.js) + [firepit.js](../../js/firepit.js) | Credits display shows **∞** instead of a number (single element `#reflectionCredits`). |

## Why env-driven, not a DB `role` column

A DB column would be the "proper" RBAC answer, but it's overkill for one owner account: it needs a migration, a way to set the flag, and RLS thought. The env allowlist is one line, has a safe default (no var = no admins), and is trivially auditable. Revisit only if Sound Cave ever needs **multiple admin tiers or in-app role management** — then promote to a `users.role` column.

## Risks / notes

- **Prod requires the Railway env var.** Setting `.env` only affects local. Until `ADMIN_EMAILS` is set in Railway, the live app charges Doug normally (safe, just not the intent).
- **No spend guardrail beyond fal.** Intentional — fal's own balance is the backstop. If admin usage should ever be metered (e.g. cost attribution per project), that's a separate logging concern, not a credit one. The firepit cost-logging branch (`firepit-cost-logging`) is where that would live.
- **Allowlist is by email, resolved from the JWT** — so it follows the account, independent of tier or balance. Doug logs in as normal; the server recognises the email.
