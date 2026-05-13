"""
Image composer — Phase 3 v0.5

Minimal viable composition for campaign post images.
- Output: 1080x1350 PNG (Instagram portrait)
- Layers: dark background (with brand-color accent bar) + foreground photo
  (artist hero for spotlights, event flyer otherwise) + typography overlay
  (event/artist name + date in DM Mono)
- No AI-generated backgrounds yet — v0.6 swaps the bg layer for Fal FLUX
- One image per post (not yet 2 variants)
- Idempotent storage path per post: {user}/{post_id}.png — re-runs overwrite

Returns the public Supabase Storage URL of the composed image.
"""
import io
import os
import re
from datetime import datetime
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from sb_helpers import supabase

PROJECT_ROOT = Path(__file__).resolve().parent
FONT_MONO = str(PROJECT_ROOT / 'brand' / 'fonts' / 'DMMono-Regular.ttf')
FONT_SANS = str(PROJECT_ROOT / 'brand' / 'fonts' / 'DMSans-Regular.ttf')

# IMPORTANT: this module is the asset factory for promoter campaigns.
# NO Sound Cave branding is allowed in any output — no S0UNDCAV3 wordmark,
# no Sound Cave red as a fallback accent. Outputs must read as the
# promoter's brand alone. If the promoter hasn't set brand colours, we
# default to neutral white — never our brand.
BUCKET = 'campaign_images'
WIDTH = 1080
HEIGHT = 1350
BG_DEFAULT = (10, 10, 12)         # neutral near-black
ACCENT_DEFAULT = (240, 240, 240)  # neutral off-white — NOT Sound Cave red
TEXT_HEADING = (245, 245, 245)
TEXT_BODY = (180, 180, 180)
MARGIN = 64


def _hex_to_rgb(s, fallback):
    if not s or not isinstance(s, str):
        return fallback
    m = re.fullmatch(r'#?([0-9a-fA-F]{6})', s.strip())
    if not m:
        return fallback
    h = m.group(1)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _fetch_image(url):
    """Best-effort fetch + open as PIL Image. Returns None on any failure."""
    if not url:
        return None
    try:
        r = requests.get(url, timeout=10, stream=True)
        if r.status_code != 200:
            return None
        img = Image.open(io.BytesIO(r.content)).convert('RGB')
        return img
    except Exception:
        return None


def _cover_crop(img, target_w, target_h):
    """Resize + center-crop so img fills (target_w, target_h) with no distortion."""
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    tgt_ratio = target_w / target_h
    if src_ratio > tgt_ratio:
        # source is wider — scale to height, crop sides
        new_h = target_h
        new_w = int(src_ratio * new_h)
    else:
        new_w = target_w
        new_h = int(new_w / src_ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def _wrap_text(draw, text, font, max_width):
    """Greedy word-wrap. Returns list of lines."""
    if not text:
        return []
    words = text.split()
    lines = []
    current = ''
    for w in words:
        candidate = (current + ' ' + w).strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def _format_event_date(iso):
    if not iso:
        return ''
    try:
        if 'T' in iso:
            d = datetime.fromisoformat(iso.replace('Z', '+00:00'))
        else:
            d = datetime.fromisoformat(iso)
        return d.strftime('%d %b %Y · %H:%M').upper()
    except Exception:
        return iso


def _draw_image_card(canvas, photo_url, area):
    """Place a photo inside `area` (l,t,r,b). Falls back to a brand-tinted
    placeholder if no photo or fetch fails."""
    x0, y0, x1, y1 = area
    w, h = x1 - x0, y1 - y0
    img = _fetch_image(photo_url) if photo_url else None
    if img:
        cropped = _cover_crop(img, w, h)
        canvas.paste(cropped, (x0, y0))
    else:
        # Solid dark slab as fallback
        placeholder = Image.new('RGB', (w, h), (24, 24, 28))
        canvas.paste(placeholder, (x0, y0))


def compose_post_image(event, profile, post_type, brand_kit=None):
    """Build one PNG for a post. Returns raw bytes.

    v0.6 routing:
    - If a style reference is available (event.flyer_image_url or
      brand_kit.reference_image_urls), call FLUX Redux for a brand-anchored
      canvas + Pillow typography overlay.
    - Otherwise fall back to the v0.5 Pillow-only composition.

    Image gen errors fall through to Pillow — the post still ships.
    """
    style_ref = _pick_style_reference(event, brand_kit)
    if style_ref:
        try:
            return _compose_brand_aware(event, profile, post_type, style_ref)
        except Exception as e:
            print(f'[image_composer] brand-aware path failed ({e}); falling back to Pillow')
    return _compose_pillow_fallback(event, profile, post_type)


def _pick_style_reference(event, brand_kit):
    """Return the first available reference image URL or None."""
    if event and event.get('flyer_image_url'):
        return event['flyer_image_url']
    if brand_kit and brand_kit.get('reference_image_urls'):
        refs = brand_kit['reference_image_urls']
        if refs:
            return refs[0]
    return None


# Per-post-type prompts for the FLUX content variation. Voice is implicit in
# the style reference; these just direct WHAT the canvas should depict.
_POST_FLUX_PROMPT = {
    'announcement': "lineup reveal poster mood, full event composition, atmospheric",
    'headliner_spotlight': "single artist focus, portrait composition, atmospheric",
    'support_spotlight': "single artist focus, portrait composition, atmospheric",
    'mid_campaign_push': "event promotional design, building anticipation",
    'countdown_7d': "event countdown poster, anticipation",
    'countdown_3d': "event countdown poster, urgency, three days away",
    'countdown_1d': "event countdown poster, urgency, tomorrow night",
    'countdown_day_of': "event poster, tonight, urgency",
    'day_of_doors': "event poster, doors opening, atmospheric",
    'recap': "post-event reflection mood, warm, looking back",
    'throwback': "throwback nostalgic event mood",
    'ticket_push': "ticket sales push, direct, urgent",
    'custom': "promotional event imagery",
}


def _compose_brand_aware(event, profile, post_type, style_ref):
    """Brand-aware path — FLUX Redux for the canvas + Pillow for typography."""
    from media_gen import generate_fal_with_reference

    post_brief = _POST_FLUX_PROMPT.get(post_type, _POST_FLUX_PROMPT['custom'])
    prompt_parts = [
        "Promotional event flyer, modern design",
        post_brief,
        "matching the visual style of the reference image — same palette, typography mood, photographic feel, layout language",
        "portrait orientation, no text (text will be added in post-processing)",
    ]
    if event.get('name'):
        prompt_parts.append(f"for the event '{event['name']}'")
    prompt = ', '.join(prompt_parts) + '.'

    flux_bytes, _, _ = generate_fal_with_reference(prompt, style_ref, WIDTH, HEIGHT)
    canvas = Image.open(io.BytesIO(flux_bytes)).convert('RGB')
    canvas = _cover_crop(canvas, WIDTH, HEIGHT)  # ensure exact dimensions
    draw = ImageDraw.Draw(canvas)

    # Typography overlay — minimal, no Sound Cave branding
    accent = _hex_to_rgb(event.get('brand_color_primary'), ACCENT_DEFAULT)

    # Subtle dark gradient at the bottom so text is always legible over the
    # generated canvas. We don't know what FLUX returned; play it safe.
    grad_h = 480
    grad = Image.new('RGBA', (WIDTH, grad_h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grad)
    for y in range(grad_h):
        alpha = int(180 * (y / grad_h))
        g_draw.rectangle([(0, y), (WIDTH, y + 1)], fill=(0, 0, 0, alpha))
    canvas.paste(grad, (0, HEIGHT - grad_h), grad)
    draw = ImageDraw.Draw(canvas)

    # Post type label (top-left)
    label_font = _font(FONT_MONO, 26)
    label_text = post_type.replace('_', ' ').upper()
    draw.text((MARGIN, MARGIN), label_text, font=label_font, fill=accent)

    # Heading (artist or event name) — bottom block
    is_spotlight = bool(profile)
    heading_text = ((profile.get('display_name') if is_spotlight else event.get('name', '')) or '').upper()
    heading_font = _font(FONT_SANS, 64)
    heading_lines = _wrap_text(draw, heading_text, heading_font, WIDTH - 2 * MARGIN)[:2]

    line_h = 76
    detail_y_offset = 40
    detail_font = _font(FONT_MONO, 26)
    detail_bits = [_format_event_date(event.get('event_date'))]
    venue_str = event.get('venue_name') or ''
    if event.get('venue_city'):
        venue_str = (venue_str + ', ' + event['venue_city']).strip(', ')
    if venue_str:
        detail_bits.append(venue_str.upper())
    detail = '  ·  '.join(b for b in detail_bits if b)

    # Compute bottom-anchored Y for the text block
    text_block_h = line_h * len(heading_lines) + (detail_y_offset + 30 if detail else 0)
    text_top = HEIGHT - MARGIN - text_block_h
    y = text_top
    for line in heading_lines:
        draw.text((MARGIN, y), line, font=heading_font, fill=TEXT_HEADING)
        y += line_h
    if detail:
        draw.text((MARGIN, y + 12), detail, font=detail_font, fill=TEXT_BODY)

    buf = io.BytesIO()
    canvas.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def _compose_pillow_fallback(event, profile, post_type):
    """v0.5 fallback — dark canvas + photo + typography. Used when there's
    no style reference available."""
    accent = _hex_to_rgb(event.get('brand_color_primary'), ACCENT_DEFAULT)
    bg = _hex_to_rgb(event.get('brand_color_secondary'), BG_DEFAULT)

    canvas = Image.new('RGB', (WIDTH, HEIGHT), bg)
    draw = ImageDraw.Draw(canvas)

    # Top accent bar (thin)
    draw.rectangle([(0, 0), (WIDTH, 6)], fill=accent)

    # Headline label (post type)
    label_font = _font(FONT_MONO, 26)
    label_text = post_type.replace('_', ' ').upper()
    draw.text((MARGIN, 36), label_text, font=label_font, fill=accent)

    # Photo area — top ~62% of canvas
    photo_top = 96
    photo_h = 820
    photo_area = (MARGIN, photo_top, WIDTH - MARGIN, photo_top + photo_h)
    photo_url = None
    if profile and profile.get('hero_image_url'):
        photo_url = profile['hero_image_url']
    elif event.get('flyer_image_url'):
        photo_url = event['flyer_image_url']
    _draw_image_card(canvas, photo_url, photo_area)

    # Text block below photo
    text_top = photo_top + photo_h + 36

    # Primary heading: artist display name (spotlights) or event name
    is_spotlight = bool(profile)
    heading_text = (profile.get('display_name') if is_spotlight else event.get('name', '')) or ''
    heading_text = heading_text.upper()

    # Sans-bold-ish via DM Sans Regular at large size — punchy enough
    heading_font = _font(FONT_SANS, 64)
    heading_lines = _wrap_text(draw, heading_text, heading_font, WIDTH - 2 * MARGIN)
    # Trim to 2 lines max
    heading_lines = heading_lines[:2]
    y = text_top
    for line in heading_lines:
        draw.text((MARGIN, y), line, font=heading_font, fill=TEXT_HEADING)
        y += 76

    # Secondary line: event date + venue
    detail_font = _font(FONT_MONO, 26)
    detail_bits = [_format_event_date(event.get('event_date'))]
    venue_str = event.get('venue_name') or ''
    if event.get('venue_city'):
        venue_str = (venue_str + ', ' + event['venue_city']).strip(', ')
    if venue_str:
        detail_bits.append(venue_str.upper())
    detail = '  ·  '.join(b for b in detail_bits if b)
    if detail:
        draw.text((MARGIN, y + 12), detail, font=detail_font, fill=TEXT_BODY)

    # NB: deliberately no project signature or watermark on output.
    # Generated assets carry the promoter's brand alone (see module docstring).

    buf = io.BytesIO()
    canvas.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def store_post_image(user_id, post_id, png_bytes):
    """Upload to Supabase Storage with upsert; return public URL."""
    path = f"{user_id}/{post_id}.png"
    sb = supabase()
    sb.storage.from_(BUCKET).upload(
        path=path, file=png_bytes,
        file_options={'content-type': 'image/png', 'upsert': 'true'},
    )
    return sb.storage.from_(BUCKET).get_public_url(path)
