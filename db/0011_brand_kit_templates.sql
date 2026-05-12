-- Sound Cave — brand_kits.templates
-- Phase B of the Forge text rework (wiki/spec/brand_templates_inline.md).
-- Per-brand caption templates: plain text starters the user can load into the Forge draft area.
-- Stored as a jsonb array on the kit row to avoid a second table for v1.

alter table public.brand_kits
  add column if not exists templates jsonb not null default '[]'::jsonb;
