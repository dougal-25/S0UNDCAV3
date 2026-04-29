# Design Reference — KVS Studio

**Source:** https://www.kvs.services/ (FWA of the Day winner)
**Captured:** 2026-04-29
**Local assets:** [kvs_assets/](./kvs_assets/) — 8 keyframes from a 58s screen recording (full recording on Doug's Desktop: `Screen Recording 2026-04-29 at 12.07.58.mov`, 432MB, not committed)

## Why this is a reference

Saved as a **mood + technique reference** for future Sound Cave UI work. Sound Cave is a content creation platform for artists/labels/promoters in dark/underground music — KVS's black-metal-meets-CRT aesthetic maps directly onto that audience. Use this as the bar for "premium, weird, unmistakably *for music people*."

## The aesthetic in one line

**CRT monitor + VHS tape + occult sigil**, rendered in monospace. Black background, white type, single orange-red highlight color. Every visual decision serves one mood.

## Visual ingredients

| Element | What it is | Where seen |
|---|---|---|
| **CRT bezel** | Curved-corner viewport frame, scanlines, vignette, animated film grain | Whole site, all frames |
| **Splash gate** | "CLICK TO ENTER / {HEADPHONES RECOMMENDED}" — sound on by default | f_001, f_024 |
| **Halftone dot-screen art** | Sigil/tree rendered through pixelated dot pattern | f_001, f_024 |
| **Glitch text scramble** | Letters swap mid-word ("CLICK TO ENTER" → "CLICK TO E*FIS") | f_024 |
| **Morphing 3D centrepiece** | Same sculpt shifts: dot-screen → red lava → chrome metal as you scroll | f_004, f_020 |
| **Bracket microcopy** | All meta-text wrapped `{LIKE THIS}` — `{BUDAPEST/}`, `{SOUND} ON OFF`, `{KVS}` | All frames |
| **GPS coords** | `47.4979° N, 19.0402° E` in footer — adds "real place, real people" texture | f_020 |
| **Floating mockup grid** | Phone/desktop screenshots scattered in 3D space with depth/parallax | f_016 |
| **Tool tag strip** | Horizontal cycling `{FIGMA} {PHOTOSHOP} {ILLUSTRATOR} {MIRO} {FIGJAM}` over project | f_008 |
| **Orange-red highlight blocks** | Only color accent — used on CTA, page numbers, status indicators | All frames |
| **Pixel-cluster cursor** | Custom cursor is a small orange+white pixel cross | f_008, f_012 |
| **Page transitions** | "BACK HOME / NEXT" navigation between project deep-dives | f_012 |
| **Sound design** | Heavy ambient/drone audio bed — explicitly flagged "headphones recommended" | (audio, not visible) |

## Color palette

- Background: near-black `#0a0a0a` (with grain noise overlay)
- Primary text: off-white `#e8e8e8`
- Highlight/CTA: orange-red `#ff4500`-ish (single accent, used sparingly)
- Lava state: deep red `#aa0000`
- Chrome state: cool greys with strong specular highlights

## Typography

- 100% monospace throughout (looks like a custom or modified mono — possibly PP Mondwest, Space Mono, or JetBrains Mono territory)
- Two sizes only: small caps for UI, slightly larger for hero copy
- Wide letter-spacing in all-caps labels
- All UI strings wrapped in `{curly braces}`

## Replication tiers — for Sound Cave

### Easy — ship in a weekend (vanilla CSS/JS)
- CRT frame: scanlines (repeating linear-gradient), vignette (radial-gradient overlay), grain (SVG noise filter or animated PNG)
- Bracket microcopy convention `{LIKE THIS}` — pure typographic discipline, free
- FWA-style corner badge
- Sound on/off toggle UI
- Splash gate with audio autoplay-on-click
- Glitch text scramble — ~30 lines of vanilla JS or a tiny lib (e.g. `glitched-writer`, no deps)
- Halftone effect on static images — bake once in Photoshop, or CSS `background-image` with SVG dot pattern
- Pixel-cluster custom cursor (CSS `cursor: url(...)` or a JS-tracked div)
- Orange-red accent system in `tokens.css`

### Medium — ~1 week with GSAP
- Scroll-driven scene transitions (sigil → lava → chrome). GSAP ScrollTrigger choreographs the swap by crossfading pre-rendered video loops.
- Floating mockup grid with parallax/depth — CSS 3D transforms + scroll listener, no Three.js needed
- Cursor-reactive distortion on hover (SVG filter `feDisplacementMap`)
- Page transition curtain (FLIP animation via GSAP)
- Audio bed with ducking on interaction

### Hard — weeks of 3D pipeline work, **skip for v1**
- Live morphing 3D centrepiece (Three.js / React Three Fiber + custom shaders for dot-screen, lava, chrome). **Recommended workaround:** render 3 short video loops in Blender, crossfade with GSAP. 80% of the impact, 20% of the effort.
- The sculpt itself (the sigil) — needs an illustrator or 3D artist; not codeable

### Effectively impossible without their team
- The sound design (a huge part of the feel — would need a sound designer or careful Splice/library curation)
- The art direction *taste* — the choice of *what* to build. Use this reference page as the filter.

## How to apply this to Sound Cave

1. **Don't copy wholesale** — Sound Cave is a *product*, not a one-page studio site. Lift the **frame, type system, microcopy convention, color discipline, and audio-first posture**. Skip the splash gate (kills conversion in a SaaS).
2. **Hero/marketing pages** can go full KVS — splash, CRT frame, sigil video loop, glitch type. These don't need to convert hard.
3. **App/dashboard UI** keeps the monospace + bracket microcopy + orange accent + grain texture, but loses the CRT bezel and heavy motion (kills usability).
4. **Build `tokens.css` first** — colors, mono font stack, spacing scale, motion durations. Lock it before any component work. (UI Change Protocol applies — get spec sign-off per feature.)

## Open questions for Doug (next time we touch this)

- Is the splash gate on/off for soundcave.app? (My take: off for app, on for marketing site only.)
- One unified visual language across marketing + app, or separate "outside" and "inside" worlds?
- Custom sigil/mark commission, or lean on typographic identity only for v1?

## Key frames (in [kvs_assets/](./kvs_assets/))

- `f_001.jpg` — Splash gate, halftone sigil, "CLICK TO ENTER"
- `f_004.jpg` — Hero with red lava state of centrepiece, full nav layout visible
- `f_008.jpg` — Project showcase: phone mockup + tool tag strip + pixel cursor
- `f_012.jpg` — Empty/transition state with NEXT / BACK HOME nav
- `f_016.jpg` — Floating mockup grid in 3D space (multiple project screens)
- `f_020.jpg` — Chrome/metallic state of centrepiece with GPS coords footer
- `f_024.jpg` — Splash gate mid-glitch ("CLICK TO E*FIS")
- `f_028.jpg` — Page exiting / wireframe selection state
