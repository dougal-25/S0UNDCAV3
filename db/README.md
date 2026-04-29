# db/

SQL migrations for Sound Cave's Supabase project.

## Files

- `0001_init.sql` — schema (tables, enums, indexes)
- `0002_rls.sql` — Row Level Security policies

Both are idempotent — safe to re-run.

## Apply

Connection: pooler at `aws-1-eu-west-2.pooler.supabase.com:6543`, user `postgres.agmmdrqmjywggtsycsri`, password from `SUPABASE_DB_PASSWORD`.

```bash
# from project root, with venv active
python3 - <<'PY'
import os, urllib.parse, psycopg
from dotenv import load_dotenv
load_dotenv('../../.env')
pwd = urllib.parse.quote_plus(os.environ['SUPABASE_DB_PASSWORD'])
dsn = f"postgresql://postgres.agmmdrqmjywggtsycsri:{pwd}@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require"
for f in ['db/0001_init.sql','db/0002_rls.sql']:
    with psycopg.connect(dsn) as c, c.cursor() as cur:
        cur.execute(open(f).read()); c.commit()
    print('applied', f)
PY
```

## Verify

```sql
select tablename, rowsecurity from pg_tables where schemaname='public';
```

All six tables (`users`, `artists`, `stash_items`, `credits_ledger`, `scheduled_posts`, `connected_accounts`) should return `rowsecurity = t`.
