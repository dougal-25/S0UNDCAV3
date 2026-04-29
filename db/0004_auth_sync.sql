-- Sound Cave — Phase B auth wiring
-- Trigger: on auth.users insert, create the matching public.users row.
-- Then re-add the FK from public.users.id → auth.users.id.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, tier, credits_balance)
    values (new.id, 'solo', 100)
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any existing auth.users without a public.users row
insert into public.users (id, tier, credits_balance)
  select au.id, 'solo', 100
  from auth.users au
  left join public.users pu on pu.id = au.id
  where pu.id is null;

-- Drop the Phase A dev user (00000000-0000-0000-0000-000000000001).
-- It exists only in public.users, not auth.users, so it would block the FK.
-- Cascades to any dev-owned stash_items / credits_ledger / etc.
delete from public.users where id = '00000000-0000-0000-0000-000000000001';

-- Re-add FK now that auth.users is the parent of record.
-- Skip if it already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_id_fkey' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_fkey foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;
