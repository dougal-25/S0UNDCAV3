-- 0019_spirit_character.sql
-- Phase E (Forge master spec, 2026-06-12): Spirits become animated CARTOON
-- CHARACTERS (a drawn persona forged from reference photos), and can be linked
-- to a Clan artist so the Forge auto-loads an artist's Spirit.
--
-- Apply in the Supabase SQL editor after 0018. Pure ALTER — additive, no data
-- migration. Both columns nullable so existing Spirits keep working.

alter table public.avatars
  add column if not exists character_url   text,        -- the forged cartoon persona (canonical look)
  add column if not exists linked_artist   text;        -- Clan artist username this Spirit belongs to (optional)

comment on column public.avatars.character_url is
  'Forged cartoon-character image (Phase E). When set, the Forge composes from this instead of raw photos.';
comment on column public.avatars.linked_artist is
  'Clan artist username this Spirit is attached to (optional). Drives the artist→Spirit connector.';
