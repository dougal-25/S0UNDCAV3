"""
Shared Supabase + auth helpers for the Flask API modules.

Extracted 2026-05-13 so events_api, artist_profiles_api, campaigns_api,
posts_api can share auth + service-role client without circular imports
back into content_api.
"""
import os

from flask import g, jsonify, request

_sb_client = None

# Admin emails bypass in-app credit charges entirely (the fal/provider balance is
# the real ceiling). Kept in sync with content_api.ADMIN_EMAILS — same env var.
ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.getenv('ADMIN_EMAILS', '').split(',')
    if e.strip()
}

# Cost (in credits) of one generative image. Mirrors content_api.CREDIT_COST['image'];
# keep the two in sync. Blueprint gen routes debit this before every paid image call.
CREDIT_COST_IMAGE = 2


def supabase():
    """Service-role Supabase client. Bypasses RLS; we apply owner scoping in code."""
    global _sb_client
    if _sb_client is None:
        from supabase import create_client
        _sb_client = create_client(
            os.environ['SUPABASE_URL'],
            os.environ['SUPABASE_SERVICE_KEY'],
        )
    return _sb_client


def resolve_user_id():
    """Return the authed user_id from the request JWT, or None if missing/invalid.

    Also stamps `g.is_admin` for this request so blueprint credit charges can
    exempt admin accounts, matching content_api's own auth path.
    """
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:].strip()
    try:
        res = supabase().auth.get_user(token)
        if res and res.user:
            g.is_admin = (res.user.email or '').strip().lower() in ADMIN_EMAILS
            return res.user.id
    except Exception as e:
        print('JWT validation failed:', e)
    return None


def require_user():
    """Returns (user_id, None) or (None, 401-response tuple)."""
    uid = resolve_user_id()
    if uid is None:
        return None, (jsonify({'error': 'unauthenticated'}), 401)
    return uid, None


def maybe_one(builder):
    """Run a supabase-py query and return the first row or None.

    supabase-py's `.maybe_single().execute()` returns None (not a response
    object) when there are zero matching rows, which breaks `.data` access.
    Use `.limit(1).execute()` + this helper instead.
    """
    res = builder.limit(1).execute()
    rows = getattr(res, 'data', None) or []
    return rows[0] if rows else None


def charge(uid, amount, reason):
    """Atomic credit debit for blueprint gen routes. Returns
    (new_balance, error_response_or_None).

    Mirrors content_api._debit: admins and zero-cost actions are never charged,
    the debit is an atomic row-locked RPC, and an empty balance yields a 402 the
    caller should return directly. Every paid provider call MUST be preceded by a
    successful charge() (and refunded on failure) so 0-credit accounts can't
    generate for free.
    """
    if g.get('is_admin'):
        return None, None
    if amount <= 0:
        return None, None
    try:
        res = supabase().rpc('debit_credits', {
            'p_user_id': uid, 'p_amount': amount, 'p_reason': reason,
        }).execute()
        return res.data, None
    except Exception as e:
        msg = str(e)
        if 'insufficient_credits' in msg:
            return None, (jsonify({'error': 'insufficient_credits', 'cost': amount}), 402)
        print('debit failed:', e)
        return None, (jsonify({'error': 'credit debit failed'}), 500)


def refund(uid, amount, reason):
    """Return credits after a paid call fails. Best-effort: a refund failure is
    logged for later reconciliation, never surfaced (the user already saw the
    generation error)."""
    if g.get('is_admin') or amount <= 0:
        return
    try:
        supabase().rpc('refund_credits', {
            'p_user_id': uid, 'p_amount': amount, 'p_reason': reason,
        }).execute()
    except Exception as e:
        print('refund failed (will need reconciliation):', e)
