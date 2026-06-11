# HANDOFF — state as of 2026-06-10 (evening)

> Tool-agnostic resume note. Read this + `CLAUDE.md` + `wiki/log.md` (top entries) before doing anything.

## Where things are

**🚀 LIVE IN PRODUCTION, verified end-to-end:**
- Frontend: `https://thesoundcave.vercel.app` (Vercel, auto-deploys `main`)
- Backend: `https://soundcave-api-production.up.railway.app` (Railway, gunicorn via `Procfile`/`wsgi.py`; env vars set in Railway dashboard)
- A real Forge poster was generated ON production: Claude copy → FLUX.2 restyle (fal) → Supabase Storage → Konva compositor overlay.
- Branch: `phase-3-v0.6`, merged into `main` at `643e6c6`. Everything committed + pushed.

**Shipped 2026-06-10:** Forge poster pipeline (reference-restyle via FLUX.2 `/edit` + brand-less compositor overlay + structured event fields → legible overlay lines) and the **input-usage fixes** (`5bea4b2`): genre/theme/freeform/voice-energy/brand-palette now actually reach the image prompts. Proof: same pink reference flyer + S0UNDCAV3 brand kit → brand orange-on-black output.

## Key docs (in `wiki/`)
- `wiki/log.md` — top entry = the go-live record
- `wiki/spec/forge_input_usage_audit.md` — input→output truth table + shipped fixes + the parked button-reshape sketch
- `wiki/spec/compositor_overlay_forge.md` — poster overlay spec (incl. accepted baked-text edge)
- `wiki/glossary.md` — caveman-vernacular UI terms ↔ code names

## Next (Doug's stated intent)
1. **Doug's full live review** of the product at the production URL — feeds:
2. **Post-generation button reshape** — Doug hates the current 10-button wall; chosen hero moment = **the poster reveal**; layout sketch in the audit page. Make decisions AFTER the review.
3. **Firepit image-quality iteration** — inputs now flow, so cue tuning is a live lever. Open: freeform-vs-brand priority, per-type recipe tuning, optional top mask band for baked backdrop text (prompt-tuning that text away is PROVEN futile — don't retry it).
4. **GTM** — get it in front of industry eyes; growth strategy session.

## Gotchas
- API-status pill may show "Not connected" for a few seconds on cold load (3s health-check timeout race; it recovers). Railway may cold-start — first generation of the day is slow.
- Local dev: `./run.sh` (ports 8000 + 3000); venv is `venv.nosync` (iCloud). Browser caches JS hard — force-revalidate after restarts.
- Two agent sessions sharing this working tree caused commit races on 2026-06-10 — prefer one session at a time, or `git worktree`.
- Magic-link login for automated browser testing: mint via Supabase admin `generate_link` (service key in workspace `.env`), override `redirect_to`.
