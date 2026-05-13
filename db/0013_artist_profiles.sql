-- Sound Cave — Phase 2 artist_profiles (EPK source of truth)
-- Phase 2 stub fields are populated; Phase 4 claim flow lights up the rest.
-- Spec: wiki/spec/phase_2_3_pivot.md
-- Idempotent.

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  soundcloud_handle text unique,
  soundcloud_url text,
  spotify_url text,
  instagram_handle text,
  other_socials jsonb not null default '{}'::jsonb,
  bio_short text,
  bio_long text,
  genre_tags text[] not null default '{}',
  location text,
  hero_image_url text,
  gallery_image_urls text[] not null default '{}',
  pinned_track_urls text[] not null default '{}',
  follower_count_soundcloud int,
  claimed boolean not null default false,
  claimed_by_user_id uuid references public.users(id) on delete set null,
  last_scraped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bio_short_len check (bio_short is null or char_length(bio_short) <= 280)
);
create index if not exists artist_profiles_soundcloud_handle_idx on public.artist_profiles(soundcloud_handle);
create index if not exists artist_profiles_claimed_idx on public.artist_profiles(claimed);
create index if not exists artist_profiles_display_name_lower_idx on public.artist_profiles(lower(display_name));

-- Backfill the lineup_slots FK now that artist_profiles exists.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lineup_slots_artist_profile_id_fkey'
      and conrelid = 'public.lineup_slots'::regclass
  ) then
    alter table public.lineup_slots
      add constraint lineup_slots_artist_profile_id_fkey
      foreign key (artist_profile_id) references public.artist_profiles(id) on delete cascade;
  end if;
end $$;

-- RLS: globally readable (the whole point — cross-promoter benefit) but only
-- writable by the user who has claimed it. Service role bypasses RLS for
-- scout/scrape pipelines.
alter table public.artist_profiles enable row level security;

drop policy if exists "artist_profiles read all" on public.artist_profiles;
create policy "artist_profiles read all" on public.artist_profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "artist_profiles claimer write" on public.artist_profiles;
create policy "artist_profiles claimer write" on public.artist_profiles
  for update using (claimed_by_user_id = auth.uid()) with check (claimed_by_user_id = auth.uid());

-- updated_at trigger (re-uses touch_updated_at from 0012)
drop trigger if exists artist_profiles_touch_updated on public.artist_profiles;
create trigger artist_profiles_touch_updated before update on public.artist_profiles
  for each row execute function public.touch_updated_at();
