-- Sound Cave — Pre-launch security hardening
-- Run after 0022. Idempotent.
--
-- Closes three launch-blocking holes exposed once free public signups open:
--   1. Clients could rewrite their OWN users row (credits_balance, tier,
--      trial_claimed, stripe_customer_id) via the anon key + JWT, granting
--      themselves unlimited credits and bypassing Stripe entirely.
--   2. Clients could forge/delete their own credits_ledger rows (the append-only
--      "source of truth").
--   3. Stripe redelivers webhooks at-least-once; nothing deduped them, so a
--      retried event double-granted credits. This adds the dedup table the
--      webhook handler now writes to.
--
-- Every users/credits_ledger column is server-managed and the frontend never
-- writes either table directly, so removing client write access is safe. The
-- SECURITY DEFINER credit functions (debit_credits/refund_credits/grant_credits)
-- run as the table owner and the backend service role bypasses RLS, so
-- server-side credit changes keep working.

-- ── 1. users: no client-side writes ────────────────────────────
-- Drop the permissive self-update policy and revoke the UPDATE privilege from
-- the client roles. Reads (users self read) are unchanged.
drop policy if exists "users self update" on public.users;
revoke update on public.users from anon, authenticated;

-- ── 2. credits_ledger: client read-only ────────────────────────
-- Was a FOR ALL owner policy (INSERT/UPDATE/DELETE allowed). Replace with a
-- SELECT-only policy and revoke write privileges. Writes happen only through
-- the SECURITY DEFINER credit functions.
drop policy if exists "credits_ledger owner all" on public.credits_ledger;
drop policy if exists "credits_ledger owner read" on public.credits_ledger;
create policy "credits_ledger owner read" on public.credits_ledger
  for select using (user_id = auth.uid());
revoke insert, update, delete on public.credits_ledger from anon, authenticated;

-- ── 3. Stripe webhook idempotency ──────────────────────────────
-- The webhook handler inserts each event id here before processing; a duplicate
-- insert (unique violation) means the event was already handled, so it skips.
-- RLS on with no policies = clients cannot read/write; the service-role webhook
-- bypasses RLS.
create table if not exists public.stripe_events (
  event_id text primary key,
  type text,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
