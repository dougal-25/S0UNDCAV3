"""Sound Cave — Stripe products bootstrap.

Idempotent. Creates the four prices Doug needs (3 tier subscriptions + 1 credit pack)
keyed by Stripe `lookup_key`, so re-running won't make duplicates and the backend
can resolve prices by lookup_key without hard-coded IDs.

Usage:
    cd projects/thesoundcave
    source venv/bin/activate
    python scripts/stripe_bootstrap.py

Requires STRIPE_SECRET_KEY in workspace .env (use a TEST key — sk_test_…).
"""
import os
import sys
import stripe
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

key = os.environ.get('STRIPE_SECRET_KEY')
if not key:
    print('ERROR: STRIPE_SECRET_KEY not in .env', file=sys.stderr)
    sys.exit(1)
if not key.startswith('sk_test_'):
    print(f'WARNING: STRIPE_SECRET_KEY is not a test key (starts with "{key[:8]}…").')
    if input('Continue against LIVE mode? [y/N]: ').strip().lower() != 'y':
        sys.exit(1)

stripe.api_key = key

# (lookup_key, product_name, amount_pence, recurring?, tier_metadata, credits_metadata)
PRICES = [
    ('tier_solo_monthly',   'Sound Cave — Solo',   2900,  True,  'solo',   500),
    ('tier_label_monthly',  'Sound Cave — Label',  7900,  True,  'label',  2000),
    ('tier_agency_monthly', 'Sound Cave — Agency', 19900, True,  'agency', 6000),
    ('credit_pack_200',     'Sound Cave — 200 Credit Pack', 1000, False, '', 200),
]

def upsert_price(lookup_key, product_name, amount, recurring, tier, credits):
    # Find existing price by lookup_key
    existing = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if existing.data:
        p = existing.data[0]
        print(f'  found existing  {lookup_key:25s} price={p.id} product={p.product}')
        return p

    # Find or create product
    products = stripe.Product.list(limit=100)
    product = next((pp for pp in products.data if pp.name == product_name), None)
    if product is None:
        product = stripe.Product.create(
            name=product_name,
            metadata={'tier': tier, 'credits': str(credits)},
        )
        print(f'  created product {product.id} — {product_name}')

    args = dict(
        unit_amount=amount,
        currency='gbp',
        product=product.id,
        lookup_key=lookup_key,
        metadata={'tier': tier, 'credits': str(credits)},
    )
    if recurring:
        args['recurring'] = {'interval': 'month'}
    p = stripe.Price.create(**args)
    print(f'  created price   {lookup_key:25s} price={p.id}')
    return p


def main():
    print(f'Bootstrapping Stripe ({"TEST" if key.startswith("sk_test_") else "LIVE"} mode)\n')
    for args in PRICES:
        upsert_price(*args)
    print('\nDone. Lookup keys to use in the app:')
    for (lk, name, *_rest) in PRICES:
        print(f'  {lk}  ({name})')


if __name__ == '__main__':
    main()
