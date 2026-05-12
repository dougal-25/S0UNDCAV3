-- Sound Cave — brand_kits
-- Phase 1 of the Brand Overlay Compositor (wiki/spec/brand_overlay_compositor.md).
-- Multi-brand-per-user; each kit holds logo + fonts + palette + default layout knobs.

create table if not exists public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  logo_url text,
  display_font_url text,
  body_font_url text,
  palette jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists brand_kits_user_created_idx
  on public.brand_kits(user_id, created_at desc);

alter table public.brand_kits enable row level security;

drop policy if exists brand_kits_owner_all on public.brand_kits;
create policy brand_kits_owner_all on public.brand_kits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
