-- Sound Cave — Phase 2 events + lineup_slots
-- Spec: wiki/spec/phase_2_3_pivot.md
-- Idempotent.

-- Enums
do $$ begin
  create type event_status as enum ('draft', 'announced', 'sold_out', 'past');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voice_preset as enum ('underground', 'professional', 'high_energy', 'intimate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type billing_position as enum ('headliner', 'support', 'opener', 'b2b');
exception when duplicate_object then null; end $$;

-- events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  event_date timestamptz not null,
  venue_name text,
  venue_city text,
  ticketing_url text,
  flyer_image_url text,
  hero_track_url text,
  status event_status not null default 'draft',
  voice_preset voice_preset not null default 'professional',
  brand_color_primary text,
  brand_color_secondary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_owner_id_idx on public.events(owner_id);
create index if not exists events_event_date_idx on public.events(event_date);

-- lineup_slots
-- Forward reference to artist_profiles (created in 0013); use a deferred FK so
-- this file is safe to run before 0013 lands. The FK is added in 0013.
create table if not exists public.lineup_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  artist_profile_id uuid not null,
  billing_position billing_position not null default 'support',
  billing_order int not null default 0,
  set_time timestamptz,
  set_notes text,
  created_at timestamptz not null default now()
);
create index if not exists lineup_slots_event_id_idx on public.lineup_slots(event_id);
create index if not exists lineup_slots_artist_profile_id_idx on public.lineup_slots(artist_profile_id);

-- RLS
alter table public.events enable row level security;
alter table public.lineup_slots enable row level security;

drop policy if exists "events owner all" on public.events;
create policy "events owner all" on public.events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- lineup_slots: scoped via parent event ownership
drop policy if exists "lineup_slots via event owner" on public.lineup_slots;
create policy "lineup_slots via event owner" on public.lineup_slots
  for all using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  );

-- updated_at trigger for events
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists events_touch_updated on public.events;
create trigger events_touch_updated before update on public.events
  for each row execute function public.touch_updated_at();
