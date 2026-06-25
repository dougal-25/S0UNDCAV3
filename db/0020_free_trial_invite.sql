-- Sound Cave — Free-trial invite gate (2026-06-25)
-- Closes the open-signup fal-spend drain before sending the app to industry testers.
--
-- 1. New signups now start with 0 credits (was 100). Trial credits are GIFTED only
--    by redeeming an invite code, verified server-side (see /api/redeem-invite).
--    A 0-credit account cannot generate (every gen route debits first), so an
--    un-redeemed account costs Doug nothing — the gate is on the gift, not signup.
-- 2. users.trial_claimed enforces one-time redemption per account.
-- Idempotent: safe to re-run.

-- 1 — signup grant 100 → 0
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, tier, credits_balance)
    values (new.id, 'solo', 0)        -- was 100; gift now requires an invite code
    on conflict (id) do nothing;
  return new;
end;
$$;

-- 2 — one-time trial-claim flag
alter table public.users
  add column if not exists trial_claimed boolean not null default false;

-- Existing accounts already received their grant under the old trigger — mark them
-- claimed so they can't ALSO redeem an invite code on top.
update public.users set trial_claimed = true where trial_claimed = false;
