-- Sound Cave — initial schema
-- Stream 1, Phase A. Idempotent where possible.

-- Enums
do $$ begin
  create type tier as enum ('solo', 'label', 'agency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stash_kind as enum ('text', 'image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('scheduled', 'posted', 'failed');
exception when duplicate_object then null; end $$;

-- users
-- Phase B will add a trigger to sync from auth.users on signup; until then,
-- public.users is the source of truth and id is unconstrained UUID.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  tier tier not null default 'solo',
  credits_balance integer not null default 0,
  created_at timestamptz not null default now()
);
-- If a previous run created the FK to auth.users, drop it (idempotent migration).
alter table public.users drop constraint if exists users_id_fkey;

-- artists (global, shared scouting)
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  soundcloud_id text unique not null,
  name text not null,
  follower_count integer,
  genre text[] default '{}',
  scout_score numeric,
  last_seen_at timestamptz not null default now()
);
create index if not exists artists_soundcloud_id_idx on public.artists(soundcloud_id);

-- stash_items
create table if not exists public.stash_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind stash_kind not null,
  content text,
  media_url text,
  prompt text,
  artist_id uuid references public.artists(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.stash_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists stash_items_user_created_idx
  on public.stash_items(user_id, created_at desc);

-- credits_ledger (append-only)
create table if not exists public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists credits_ledger_user_created_idx
  on public.credits_ledger(user_id, created_at);

-- scheduled_posts
create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stash_item_id uuid not null references public.stash_items(id) on delete cascade,
  platforms text[] not null default '{}',
  scheduled_for timestamptz not null,
  status post_status not null default 'scheduled',
  ayrshare_post_id text,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_posts_user_when_idx
  on public.scheduled_posts(user_id, scheduled_for);

-- connected_accounts
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null,
  ayrshare_ref_id text not null,
  connected_at timestamptz not null default now(),
  unique (user_id, platform)
);
