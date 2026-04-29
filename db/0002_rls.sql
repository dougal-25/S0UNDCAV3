-- Sound Cave — Row Level Security
-- Run after 0001_init.sql. Idempotent.

alter table public.users enable row level security;
alter table public.artists enable row level security;
alter table public.stash_items enable row level security;
alter table public.credits_ledger enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.connected_accounts enable row level security;

-- Helper: drop+recreate so this file stays idempotent
drop policy if exists "users self read" on public.users;
create policy "users self read" on public.users
  for select using (id = auth.uid());

drop policy if exists "users self update" on public.users;
create policy "users self update" on public.users
  for update using (id = auth.uid());

-- artists: all authenticated read; only service role writes
drop policy if exists "artists read all" on public.artists;
create policy "artists read all" on public.artists
  for select using (auth.role() = 'authenticated');

-- generic owner policies
do $$
declare
  t text;
begin
  foreach t in array array['stash_items','credits_ledger','scheduled_posts','connected_accounts']
  loop
    execute format('drop policy if exists "%1$s owner all" on public.%1$s', t);
    execute format(
      'create policy "%1$s owner all" on public.%1$s for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
