-- Sound Cave — Phase D billing
-- Adds Stripe linkage to users + a subscriptions table tracking active sub state.
-- Webhooks update subscriptions; users.tier is a denormalised cache.
-- Idempotent.

alter table public.users
  add column if not exists stripe_customer_id text unique;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  tier tier not null,
  status text not null,                 -- stripe sub status: active|trialing|past_due|canceled|incomplete...
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;
drop policy if exists "subscriptions owner read" on public.subscriptions;
create policy "subscriptions owner read" on public.subscriptions
  for select using (user_id = auth.uid());
-- Writes are service-role only (via webhook handler).

-- Refill helper: idempotent set-balance + ledger entry.
-- Used by the renewal webhook to top up a user's monthly credits.
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'grant amount must be positive (got %)', p_amount;
  end if;

  select credits_balance into v_balance
    from public.users
    where id = p_user_id
    for update;

  if v_balance is null then
    raise exception 'user % not found', p_user_id;
  end if;

  insert into public.credits_ledger (user_id, delta, reason, ref_id)
    values (p_user_id, p_amount, p_reason, p_ref_id);

  update public.users
    set credits_balance = v_balance + p_amount
    where id = p_user_id;

  return v_balance + p_amount;
end;
$$;

grant execute on function public.grant_credits(uuid,integer,text,uuid) to service_role;
