"""
The Sound Cave — Events API
Phase 2 endpoints for the Event entity and its lineup. Scaffolded 2026-05-13.

Endpoints land here in Day 3:
- GET/POST /api/events
- GET/PATCH/DELETE /api/events/<id>
- POST /api/events/<id>/extract       (flyer → vision extraction, week 2)
- POST /api/events/<id>/generate-campaign  (Phase 3)

Spec: projects/thesoundcave/wiki/spec/phase_2_3_pivot.md
"""
from flask import Blueprint

events_bp = Blueprint('events', __name__, url_prefix='/api/events')
