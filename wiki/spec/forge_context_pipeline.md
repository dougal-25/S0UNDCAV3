# Forge Context Pipeline — every generation digests ALL context

> Status: **SIGNED OFF 2026-06-11** (all four calls: auto-guess+tap-to-fix roles · style ref wins over brand · one combined P1 pass incl. 5→3 formats · WHO/WHERE/WHAT/STYLE labels). Supersedes the input-wiring fixes in
> [forge_input_usage_audit.md](forge_input_usage_audit.md) with a full architecture for how context
> reaches media generation. Branch: `forge-output-ux`.

## The principle (Doug, 2026-06-11)
> "What is absolutely fundamental is that every media generated utilises as much context as possible…
> the more context you digest, the more accurate your output."

Context arrives from **three places**, and *all three* must shape every generation:
1. **Structured format inputs** — the per-format required fields (venue, city, date, doors open/close, tickets, lineup…). Facts. Manual, reliable, machine-readable.
2. **Freeform text** — bulk paragraphs that may contain venue, artist names, timings, dates, themes, moods. Facts + vibe, unstructured.
3. **Reference images** — uploaded media, each with a *meaning*: a person, a place, an object, a style to copy.

Plus two ambient sources that already exist: **brand kit** (palette/identity) and **voice** (energy).

## What's broken today
- Reference images are one anonymous pile. The pipeline guesses: got refs → "restyle" (copy the style of all of them); got a Spirit → person refs. There is no way to say *"image 1 is me, image 2 is a palace, image 3 is a crown, image 4 is the style I want"* — which is exactly the composition the models support natively.
- Freeform text reaches the image prompt as a raw "Context:" string — facts inside it (timings, names) aren't parsed, so they can't be prioritised or de-duplicated against structured fields.
- Structured facts reach the *overlay* (legible text layer) but barely shape the *image scene*.

## Design

### 1. Role-tagged references (the core unlock)
Every uploaded image gets a **role chip** on its thumbnail:

| Role (UI) | Meaning | Prompt job |
|---|---|---|
| **WHO** | a person/artist to feature | subject — must remain recognisable |
| **WHERE** | a place/venue/scene | setting — the image lives here |
| **WHAT** | an object/prop/motif | element — include it, restyled to fit |
| **STYLE** | a flyer/artwork whose look Doug loves | aesthetic law — everything else is rendered in this language |

- On upload, Claude vision **auto-guesses** each role; Doug can tap a chip to correct it. Optional one-line note per image ("my logo", "the headliner") for extra precision.
- The compose prompt then *names each reference by role*: "Image 1 is the person — feature them prominently… Image 4 defines the visual style — recreate every subject in this style."

### 2. Routing v2 (replaces guess-by-presence)
| Situation | Route | Model | Why |
|---|---|---|---|
| Any WHO ref present (incl. Spirits) | **compose** | Nano Banana Pro `/edit` (≤14 refs) | best person-consistency + semantic multi-ref |
| Mixed refs, no person (WHERE/WHAT + STYLE) | **compose** | FLUX.2 pro `/edit` (≤9 refs) | strong multi-ref blending, cheaper |
| STYLE refs only | **restyle** (today's proven path) | FLUX.2 pro `/edit` | unchanged |
| No refs | **backdrop** (today's path) | per-format model | unchanged |

Spirits become WHO refs in the same system (one mental model, no parallel machinery).

### 3. Context merge rules (when sources conflict)
- **Facts** (date/venue/times/tickets/lineup): structured fields win over freeform. Freeform fills gaps only. Facts render via the **compositor overlay** (legible layer) — the image gets them as *scene-setting* ("warehouse in Hackney, night"), never as text to paint.
- **Mood/theme**: freeform leads (it's where Doug describes the vibe), voice adds energy.
- **Style**: STYLE ref wins; if no STYLE ref, brand kit palette leads; freeform colour cues fill gaps. (Today brand always beats freeform — that stays, *unless* a STYLE ref is present, which beats both.)
- **Freeform parsing**: Claude extracts facts from freeform before prompt-build, so "doors at 11" in a paragraph lands in the same slot as a typed doors field — flagged, not silently duplicated.

### 4. Per-format required inputs (3 formats)
| Format | Required | Optional |
|---|---|---|
| **FLYER** | night name, venue, city, date, doors open | lineup, doors close/curfew, tickets, refs, brand, freeform |
| **POST** | nothing (freeform or refs enough) | artist, refs, brand, voice, freeform |
| **CAROUSEL** | slide count (2–10, default 5) | narrative/theme, artist, refs, brand, voice, freeform |

(Format consolidation 5→3 ships with this: `event_poster`→Flyer label; promo + bio retire from the picker, legacy Stash items keep readable labels. Artist-bio behaviour returns later as a Spotlight mode inside Post.)

## Build phases
- **P1 — context core**: role chips on uploads (auto-guess + tap-to-correct), compose route + role-aware prompt builders, freeform fact-extraction, merge rules. Formats consolidated to 3 in the same pass (picker + field visibility).
- **P2 — carousel multi-image**: N consistent slides (seed-lock + locked zone skeleton); panorama "walking-man" experiment after.
- **P3 — post-generation reveal**: hero poster moment + button reshape (already sketched in the audit page).

## Verification (P1)
Doug's four-image test, exactly as described: a person + a palace + a crown + a loved flyer style → one generation that features the person, sets it at the palace, includes the crown, all rendered in the flyer's style. Plus: a Flyer with full structured fields → facts crisp on overlay, scene matches venue/city/theme; same inputs minus STYLE ref → brand palette leads.
