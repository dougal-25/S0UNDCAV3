-- Sound Cave — Phase 3 campaigns + posts (scaffold)
-- Created in week 1 so Phase 3 generation has a place to land.
-- Spec: wiki/spec/phase_2_3_pivot.md
-- Idempotent.

-- Enums
do $$ begin
  create type campaign_status as enum ('generating', 'ready', 'partially_published', 'completed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_type as enum (
    'announcement', 'headliner_spotlight', 'support_spotlight',
    'mid_campaign_push', 'countdown_7d', 'countdown_3d', 'countdown_1d',
    'countdown_day_of', 'day_of_doors', 'recap', 'throwback', 'ticket_push', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type publish_status as enum ('draft', 'scheduled', 'published', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

-- campaigns (one per event, for beta)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  status campaign_status not null default 'generating',
  voice_preset voice_preset not null default 'professional',
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_event_id_idx on public.campaigns(event_id);

-- posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  post_type post_type not null,
  scheduled_for timestamptz not null,
  target_platforms text[] not null default '{}',
  linked_artist_profile_id uuid references public.artist_profiles(id) on delete set null,
  copy_variants jsonb not null default '[]'::jsonb,
  selected_copy_variant_id text,
  image_asset_urls text[] not null default '{}',
  selected_image_url text,
  regeneration_count int not null default 0,
  publish_status publish_status not null default 'draft',
  published_at timestamptz,
  external_post_ids jsonb not null default '{}'::jsonb,
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists posts_campaign_id_idx on public.posts(campaign_id);
create index if not exists posts_scheduled_for_idx on public.posts(scheduled_for);
create index if not exists posts_linked_artist_profile_id_idx on public.posts(linked_artist_profile_id);
create index if not exists posts_publish_status_idx on public.posts(publish_status);

-- RLS: scoped via the parent event's owner
alter table public.campaigns enable row level security;
alter table public.posts enable row level security;

drop policy if exists "campaigns via event owner" on public.campaigns;
create policy "campaigns via event owner" on public.campaigns
  for all using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  );

drop policy if exists "posts via campaign event owner" on public.posts;
create policy "posts via campaign event owner" on public.posts
  for all using (
    exists (
      select 1 from public.campaigns c
      join public.events e on e.id = c.event_id
      where c.id = campaign_id and e.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.campaigns c
      join public.events e on e.id = c.event_id
      where c.id = campaign_id and e.owner_id = auth.uid()
    )
  );

-- updated_at triggers (re-uses touch_updated_at from 0012)
drop trigger if exists campaigns_touch_updated on public.campaigns;
create trigger campaigns_touch_updated before update on public.campaigns
  for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated on public.posts;
create trigger posts_touch_updated before update on public.posts
  for each row execute function public.touch_updated_at();
