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

-- NOTE — revoke from PUBLIC, not from anon/authenticated.
-- Unlike tables, Postgres grants functions EXECUTE to the PUBLIC pseudo-role by
-- default. These functions' ACLs read:
--     =X/postgres          <- the empty grantee is PUBLIC
--     postgres=X/postgres
--     service_role=X/postgres
-- anon and authenticated hold no explicit grant to revoke — they inherit
-- EXECUTE through PUBLIC. `revoke ... from anon, authenticated` therefore
-- silently removes nothing and leaves the endpoint wide open. (Learned the hard
-- way: the first version of this migration did exactly that and reported
-- success while has_function_privilege('anon', ...) stayed true.)
-- postgres and service_role keep their explicit grants, so the backend is
-- unaffected.

revoke execute on function public.grant_credits(uuid, integer, text, uuid)  from public, anon, authenticated;
revoke execute on function public.debit_credits(uuid, integer, text, uuid)  from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, integer, text, uuid) from public, anon, authenticated;

-- handle_new_user is the on_auth_user_created trigger function on auth.users.
-- Exposure is negligible (a direct RPC call errors on the unassigned NEW
-- record), but there is no reason to publish it. Postgres checks EXECUTE on a
-- trigger function at CREATE TRIGGER time rather than at fire time, so this is
-- safe — the explicit grant to supabase_auth_admin (the role that inserts into
-- auth.users) is belt-and-braces so signup cannot possibly regress.
grant execute on function public.handle_new_user() to supabase_auth_admin;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Pin the search_path on the shared trigger helper so it cannot be hijacked by
-- a caller-controlled search_path (flagged by the Supabase linter).
alter function public.touch_updated_at() set search_path = public, pg_temp;
