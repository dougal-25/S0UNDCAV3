-- Sound Cave — Lock the credit RPCs to the service role
-- Run after 0023. Idempotent.
--
-- 0023 closed the FRONT door: it dropped the "users self update" policy and
-- revoked UPDATE on public.users, so a client can no longer rewrite its own
-- credits_balance through the table API.
--
-- It missed the SIDE door. grant_credits / debit_credits / refund_credits are
-- SECURITY DEFINER (by design — they must bypass RLS to write the append-only
-- ledger), and PostgREST exposes every public-schema function as an RPC
-- endpoint. Default EXECUTE grants left them callable by anon and authenticated:
--
--   POST /rest/v1/rpc/grant_credits
--   apikey: <the anon key, hardcoded in js/lib/supabase.js and fully public>
--   {"p_user_id": "<any uuid>", "p_amount": 999999, "p_reason": "x"}
--
-- SECURITY DEFINER means this bypasses the RLS lockdown 0023 just applied, so
-- the original launch blocker (self-granted unlimited credits, Stripe bypassed)
-- stayed open. anon can call it without even signing in.
--
-- Safe to revoke: nothing client-side calls these. The frontend makes zero
-- PostgREST rpc() calls (js/ has no `.rpc(`), and every backend caller
-- (sb_helpers.charge/refund, content_api._debit and the Stripe webhook grants)
-- goes through a SUPABASE_SERVICE_KEY client, which bypasses these grants.

revoke execute on function public.grant_credits(uuid, integer, text, uuid)  from anon, authenticated;
revoke execute on function public.debit_credits(uuid, integer, text, uuid)  from anon, authenticated;
revoke execute on function public.refund_credits(uuid, integer, text, uuid) from anon, authenticated;

-- handle_new_user is an auth.users trigger function; it is never meant to be
-- called over the API (a direct call errors on the missing NEW record, but
-- there is no reason to expose it at all).
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Pin the search_path on the shared trigger helper so it cannot be hijacked by
-- a caller-controlled search_path (flagged by the Supabase linter).
alter function public.touch_updated_at() set search_path = public, pg_temp;
