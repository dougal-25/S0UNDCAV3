-- Sound Cave — Phase 3 v0.6: brand kit reference library + event linkage
-- Spec: wiki/spec/brand_aware_image_gen.md (approved 2026-05-13)
-- Reconciled with existing schema: brand_kits uses user_id + palette
-- (not owner_id + colors as the spec drafted).
-- Idempotent.

-- 1. Extend brand_kits with a reference library + primary flag.
alter table public.brand_kits
  add column if not exists reference_image_urls text[] not null default '{}',
  add column if not exists is_primary boolean not null default false;

-- 2. Backfill: mark each user's oldest brand kit as primary so events
-- auto-default cleanly. If a user already has more than one kit, only
-- the oldest gets the flag — the rest stay unflagged.
do $$
declare
  rec record;
begin
  for rec in
    select distinct on (user_id) id, user_id
    from public.brand_kits
    order by user_id, created_at asc
  loop
    update public.brand_kits set is_primary = true where id = rec.id;
  end loop;
end $$;

-- 3. Partial unique index: only one primary kit per user.
create unique index if not exists brand_kits_one_primary_per_user
  on public.brand_kits(user_id) where is_primary;

-- 4. Link events to a brand kit (nullable; defaults to the user's
-- primary at generation time when null).
alter table public.events
  add column if not exists brand_kit_id uuid references public.brand_kits(id) on delete set null;

create index if not exists events_brand_kit_id_idx on public.events(brand_kit_id);
