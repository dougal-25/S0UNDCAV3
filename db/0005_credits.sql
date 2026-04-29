-- Sound Cave — Phase C credit helpers
-- Atomic debit + refund. Ledger is the source of truth; users.credits_balance
-- is a denormalised cache kept in sync inside the same transaction.
-- Idempotent: safe to re-run.

create or replace function public.debit_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_id uuid default null
)
returns integer  -- new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'debit amount must be positive (got %)', p_amount;
  end if;

  -- Lock the user row so concurrent debits can't oversell credits.
  select credits_balance into v_balance
    from public.users
    where id = p_user_id
    for update;

  if v_balance is null then
    raise exception 'user % not found', p_user_id;
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credits_ledger (user_id, delta, reason, ref_id)
    values (p_user_id, -p_amount, p_reason, p_ref_id);

  update public.users
    set credits_balance = v_balance - p_amount
    where id = p_user_id;

  return v_balance - p_amount;
end;
$$;

create or replace function public.refund_credits(
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
    raise exception 'refund amount must be positive (got %)', p_amount;
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

-- Allow the supabase service role + authenticated to call (RPC).
-- (Service role bypasses RLS regardless; this is for completeness.)
grant execute on function public.debit_credits(uuid,integer,text,uuid) to service_role;
grant execute on function public.refund_credits(uuid,integer,text,uuid) to service_role;
