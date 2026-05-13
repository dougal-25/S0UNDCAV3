"""
The Sound Cave — Artist Profiles API
Phase 2 endpoints for the artist_profiles table (EPK source-of-truth). Scaffolded 2026-05-13.

Endpoints land here in Day 3:
- GET/POST /api/artist-profiles
- GET/PATCH /api/artist-profiles/<id>
- POST /api/artist-profiles/match     (name → top 3 SoundCloud candidates)
- POST /api/artist-profiles/scrape    (handle → stub profile)

Spec: projects/thesoundcave/wiki/spec/phase_2_3_pivot.md
"""
from flask import Blueprint

artist_profiles_bp = Blueprint('artist_profiles', __name__, url_prefix='/api/artist-profiles')
