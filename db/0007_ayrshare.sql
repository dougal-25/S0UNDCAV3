-- Sound Cave — Phase G Ayrshare publishing
-- Adds executor metadata to scheduled_posts. Idempotent.

alter table public.scheduled_posts
  add column if not exists post_text text,
  add column if not exists media_urls text[] default '{}',
  add column if not exists posted_at timestamptz,
  add column if not exists error text,
  add column if not exists attempts integer not null default 0;

-- Helpful for the executor's "find due" query.
create index if not exists scheduled_posts_due_idx
  on public.scheduled_posts(scheduled_for)
  where status = 'scheduled';
