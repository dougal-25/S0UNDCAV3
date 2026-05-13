"""
Phase 2 one-off backfill: scout weekly JSON -> public.artist_profiles.

Reads every data/YYYY-MM-DD.json (weekly scout reports), extracts the
SoundCloud handle from each artist_url, and upserts a stub row into
artist_profiles (claimed = false).

Idempotent — safe to re-run. Dedupe key is soundcloud_handle.
Service-role write (bypasses RLS).

Run from project root with venv active:
    python scripts/migrate_scout_to_profiles.py
"""
import json
import os
import re
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT.parent.parent / '.env')

PWD = urllib.parse.quote_plus(os.environ['SUPABASE_DB_PASSWORD'])
DSN = (
    f"postgresql://postgres.agmmdrqmjywggtsycsri:{PWD}"
    "@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require"
)

HANDLE_RE = re.compile(r"soundcloud\.com/([^/?#]+)")


def extract_handle(url):
    if not url:
        return None
    m = HANDLE_RE.search(url)
    if not m:
        return None
    return urllib.parse.unquote(m.group(1)).strip().lower() or None


def strip_query(url):
    return url.split('?', 1)[0] if url else None


def load_tracks():
    """Yield {handle, display_name, soundcloud_url, hero_image_url, followers, genre} for every track row."""
    for f in sorted(PROJECT_ROOT.glob('data/[0-9][0-9][0-9][0-9]-*.json')):
        try:
            data = json.loads(f.read_text())
        except Exception as e:
            print(f"skip {f.name}: {e}", file=sys.stderr)
            continue
        for t in data.get('tracks', []):
            handle = extract_handle(t.get('artist_url'))
            if not handle:
                continue
            yield {
                'soundcloud_handle': handle,
                'display_name': t.get('artist') or t.get('artist_username') or handle,
                'soundcloud_url': strip_query(t.get('artist_url')),
                'hero_image_url': t.get('avatar_url'),
                'follower_count_soundcloud': t.get('followers'),
                'genre': t.get('genre'),
            }


def main():
    dedup = {}
    for row in load_tracks():
        h = row['soundcloud_handle']
        # First occurrence wins for display_name (latest follower count overwrites)
        if h not in dedup:
            dedup[h] = row
        else:
            # Keep highest follower count we've seen
            existing = dedup[h]
            if (row['follower_count_soundcloud'] or 0) > (existing['follower_count_soundcloud'] or 0):
                existing['follower_count_soundcloud'] = row['follower_count_soundcloud']

    print(f"Found {len(dedup)} unique SoundCloud handles across scout reports.")
    if not dedup:
        return

    now = datetime.now(timezone.utc)
    inserted = updated = 0
    with psycopg.connect(DSN, prepare_threshold=None) as conn, conn.cursor() as cur:
        for h, row in dedup.items():
            genre_tags = [row['genre']] if row['genre'] else []
            cur.execute(
                """
                insert into public.artist_profiles
                  (display_name, soundcloud_handle, soundcloud_url, hero_image_url,
                   follower_count_soundcloud, genre_tags, claimed, last_scraped_at)
                values (%s, %s, %s, %s, %s, %s, false, %s)
                on conflict (soundcloud_handle) do update set
                  display_name = excluded.display_name,
                  soundcloud_url = coalesce(excluded.soundcloud_url, public.artist_profiles.soundcloud_url),
                  hero_image_url = coalesce(excluded.hero_image_url, public.artist_profiles.hero_image_url),
                  follower_count_soundcloud = greatest(
                    coalesce(excluded.follower_count_soundcloud, 0),
                    coalesce(public.artist_profiles.follower_count_soundcloud, 0)
                  ),
                  last_scraped_at = excluded.last_scraped_at
                returning (xmax = 0) as inserted
                """,
                (
                    row['display_name'],
                    h,
                    row['soundcloud_url'],
                    row['hero_image_url'],
                    row['follower_count_soundcloud'],
                    genre_tags,
                    now,
                ),
            )
            (was_insert,) = cur.fetchone()
            inserted += int(bool(was_insert))
            updated += int(not bool(was_insert))
        conn.commit()
    print(f"Done. inserted={inserted} updated={updated}")


if __name__ == '__main__':
    main()
