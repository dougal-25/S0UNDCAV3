"""
Brand Kits — reference library endpoints (Phase 3 v0.6).

Lives alongside the existing /api/brand_kits endpoints in content_api.py
which handle CRUD on the kit itself. This module adds the reference-library
endpoints introduced by the brand-aware image-gen spec.

Spec: wiki/spec/brand_aware_image_gen.md
"""
import os
import time

from flask import Blueprint, jsonify, request

from sb_helpers import maybe_one, require_user, supabase

brand_kits_bp = Blueprint('brand_kits_v06', __name__, url_prefix='/api/brand_kits')

REF_BUCKET = 'brand_assets'   # reuse the existing bucket (Phase B)
REF_ALLOWED_MIMES = {'image/png', 'image/jpeg', 'image/jpg', 'image/webp'}
REF_MAX_BYTES = 10 * 1024 * 1024
MAX_REFS_PER_KIT = 24


def _owned_kit(kit_id, uid):
    """Return the kit row if `uid` owns it, else None."""
    return maybe_one(
        supabase().table('brand_kits')
        .select('id, user_id, name, reference_image_urls, is_primary')
        .eq('id', kit_id).eq('user_id', uid)
    )


@brand_kits_bp.route('/<kit_id>/references', methods=['POST'])
def upload_references(kit_id):
    """Multipart upload — appends up to N files to reference_image_urls.

    Accepts: form-data with one or more 'files' entries.
    Returns: { reference_image_urls: [...] } (the kit's full ordered list).
    """
    uid, err = require_user()
    if err:
        return err
    kit = _owned_kit(kit_id, uid)
    if not kit:
        return jsonify({'error': 'kit not found'}), 404

    files = request.files.getlist('files') or ([request.files['file']] if 'file' in request.files else [])
    if not files:
        return jsonify({'error': "form field 'files' (or 'file') required"}), 400

    existing = list(kit.get('reference_image_urls') or [])
    if len(existing) >= MAX_REFS_PER_KIT:
        return jsonify({'error': f'kit already at the {MAX_REFS_PER_KIT} reference limit'}), 400

    sb = supabase()
    new_urls = []
    skipped = []
    for f in files:
        if len(existing) + len(new_urls) >= MAX_REFS_PER_KIT:
            skipped.append({'name': f.filename, 'reason': 'limit reached'})
            continue
        mime = (f.mimetype or '').lower()
        if mime not in REF_ALLOWED_MIMES:
            skipped.append({'name': f.filename, 'reason': f'unsupported type: {mime}'})
            continue
        data = f.read()
        if not data:
            skipped.append({'name': f.filename, 'reason': 'empty file'})
            continue
        if len(data) > REF_MAX_BYTES:
            skipped.append({'name': f.filename, 'reason': f'exceeds {REF_MAX_BYTES // (1024 * 1024)}MB'})
            continue
        original = (f.filename or '').lower()
        ext = '.' + original.rsplit('.', 1)[1][:6] if '.' in original else '.png'
        path = f"{uid}/references/{int(time.time() * 1000)}_{os.urandom(3).hex()}{ext}"
        try:
            sb.storage.from_(REF_BUCKET).upload(
                path=path, file=data,
                file_options={'content-type': mime, 'upsert': 'true'},
            )
            url = sb.storage.from_(REF_BUCKET).get_public_url(path)
            new_urls.append(url)
        except Exception as e:
            skipped.append({'name': f.filename, 'reason': f'storage error: {e}'})

    updated = existing + new_urls
    sb.table('brand_kits').update({'reference_image_urls': updated}).eq('id', kit_id).eq('user_id', uid).execute()
    return jsonify({'reference_image_urls': updated, 'added': new_urls, 'skipped': skipped})


@brand_kits_bp.route('/<kit_id>/references', methods=['DELETE'])
def remove_reference(kit_id):
    """Body: { url: "<url to remove>" }. Removes from the array; leaves the
    storage object in place (cheap, GC later if needed)."""
    uid, err = require_user()
    if err:
        return err
    kit = _owned_kit(kit_id, uid)
    if not kit:
        return jsonify({'error': 'kit not found'}), 404

    body = request.get_json(silent=True) or {}
    url = (body.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'url required'}), 400

    existing = list(kit.get('reference_image_urls') or [])
    updated = [u for u in existing if u != url]
    if len(updated) == len(existing):
        return jsonify({'error': 'url not in references'}), 404

    supabase().table('brand_kits').update({'reference_image_urls': updated}).eq('id', kit_id).eq('user_id', uid).execute()
    return jsonify({'reference_image_urls': updated})


@brand_kits_bp.route('/<kit_id>/references/order', methods=['PATCH'])
def reorder_references(kit_id):
    """Body: { urls: [...] }. Replaces the array (used on drag-reorder).
    The new array must be a permutation of the current set — no additions or
    removals allowed here; use POST/DELETE for that."""
    uid, err = require_user()
    if err:
        return err
    kit = _owned_kit(kit_id, uid)
    if not kit:
        return jsonify({'error': 'kit not found'}), 404

    body = request.get_json(silent=True) or {}
    new_order = body.get('urls')
    if not isinstance(new_order, list):
        return jsonify({'error': 'urls must be a list'}), 400

    existing = list(kit.get('reference_image_urls') or [])
    if sorted(new_order) != sorted(existing):
        return jsonify({'error': 'new order must be a permutation of current references'}), 400

    supabase().table('brand_kits').update({'reference_image_urls': new_order}).eq('id', kit_id).eq('user_id', uid).execute()
    return jsonify({'reference_image_urls': new_order})


@brand_kits_bp.route('/<kit_id>/primary', methods=['POST'])
def set_primary(kit_id):
    """Mark this kit as the user's primary. Unflags any other kit."""
    uid, err = require_user()
    if err:
        return err
    kit = _owned_kit(kit_id, uid)
    if not kit:
        return jsonify({'error': 'kit not found'}), 404

    sb = supabase()
    sb.table('brand_kits').update({'is_primary': False}).eq('user_id', uid).execute()
    sb.table('brand_kits').update({'is_primary': True}).eq('id', kit_id).eq('user_id', uid).execute()
    return jsonify({'ok': True, 'kit_id': kit_id})
