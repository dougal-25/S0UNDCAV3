# Design Reference — Augen

**Source:** https://augen.pro/
**Captured:** 2026-05-08
**Local assets:** [augen_assets/](./augen_assets/) — 5 hero stills extracted from the live site (`f_001` through `f_005`).

**Full code mirror (heavy, kept outside the wiki):** `~/Desktop/website_clones/augen/` — 504 files, 65MB. HTML at `augen.pro/index.html`, build assets in `augen.pro/_nuxt/`, Storyblok media in `a.storyblok.com/`. Open `augen.pro/index.html` directly in a browser to view offline. Reproducible from the wget command in this project's wiki log if ever lost.

## Why this is a reference

Saved as a **mood + technique reference** for Sound Cave (and future Doug projects). Augen is a premium product/brand site — clean, restrained, motion-rich. Useful counterpoint to KVS's heavy occult mood: where KVS is *weird/dark*, Augen is *clinical/pro*. Both are "for serious people" but at opposite ends of the dial.

## The aesthetic in one line

**Apple-tier minimalism with cinematic scroll choreography** — pristine product photography, generous whitespace, and silky GSAP-driven reveals on a Lenis smooth-scroll backbone.

## Tech stack (confirmed from build artifacts)

- **Framework:** Nuxt 3 (Vue) — see `_nuxt/entry.*.js`
- **CMS:** Storyblok (media on `a.storyblok.com`, payload in `_payload.json`)
- **Smooth scroll:** Lenis (`html.lenis lenis-smooth` class on root)
- **Animation:** GSAP + ScrollTrigger
- **Image strategy:** Aggressive responsive `srcset` — every hero shipped at 8–10 sizes (400w → 2600w), all WebP/JPEG with `filters:format(webp):quality(70)`

## Visual ingredients

| Element | What it is | Where to find |
|---|---|---|
| **Hero product reveal** | Large-format product photo, scroll-pinned, scales/parallaxes as you scroll | `index.html` hero section |
| **Component-tagged sections** | Each section tagged with category (a1-sense, b1-eye, a1-neuro) — feels like product catalog | `/products/`, `/neurals/` |
| **Smooth scroll** | Lenis — soft inertia, no native scroll jank | Whole site |
| **Reveal-on-scroll** | Text fades/slides in as it enters viewport (ScrollTrigger) | Throughout |
| **Sticky nav with state** | Menu transforms based on scroll position | Whole site |
| **Multi-resolution imagery** | `srcset` w/ 8+ breakpoints per image — pixel-perfect on any DPR | All product shots |
| **News/Updates module** | Card-grid for editorial content (`updates.html`) | `/updates` |
| **Programs page** | Likely a structured features/services list | `/programs` |

## Color palette (extracted from compiled CSS)

- Pure white `#fff` and pure black `#000` — anchors
- Off-white `#f8f8f8` / `#f2f2f4` / `#efefef` — section backgrounds
- Near-black `#0f1012` / `#1d1e20` — text + dark sections
- Apple-blue `#0071e3` — link/CTA accent
- Green `#00b982` — secondary/status
- Orange `#ff5102` / amber `#fca311` — highlight accents

The palette is **predominantly neutral** — colors used as punctuation, not theme.

## Typography

- Sans-serif system, almost certainly a custom display face (check `augen.pro/fonts/`)
- Tight tracking on display sizes, generous on body
- Big size jumps between hierarchy levels (display → body, no in-between)

## Animation library

- **Lenis** — smooth scroll. Single config call at boot, then everything else hooks into native scroll events
- **GSAP + ScrollTrigger** — section reveals, parallax, pinning
- **Single explicit CSS transition** found: `transition: background-color .6s` — color flips on section entry. Most movement is JS, not CSS.

## Replication tiers — for Sound Cave

### Easy — ship in a weekend
- Lenis smooth scroll (drop-in lib, ~15 lines to wire up)
- Apple-style multi-size `srcset` images (manual pre-export or via Storyblok/Cloudinary URLs)
- Fade/slide-in on scroll with vanilla `IntersectionObserver` (no GSAP needed for simple reveals)
- Restrained palette discipline — neutrals + 1–2 accent colors max
- Section-based color flips with `transition: background-color .6s`

### Medium — needs a real frontend dev day
- ScrollTrigger pinned hero (product locks while text changes)
- Coordinated scroll-driven sequences (image parallax + text fade + scale, all on the same scroll progress)
- Custom display font licensing/loading
- Storyblok-style headless CMS hookup so editors can update without code

### Hard — month+ effort
- The full Augen polish: every transition tuned, every breakpoint checked, every image at 8 resolutions
- Cinematic product photography (the asset cost is huge — this site lives or dies on the photos)
- Page transitions between products without jank

### Skip
- The Nuxt/Vue stack — Sound Cave is vanilla HTML/JS, no need to switch
- 8-resolution `srcset` for v1 — overkill until traffic justifies
- Storyblok — Sound Cave's content is generated, not editorially curated

## How to apply to Sound Cave

- **Marketing pages** (homepage, "for artists" landing): pull the *whitespace + scroll choreography* — fewer ingredients than KVS but more polish
- **App surfaces** (dashboard, Forge, etc.): NOT this aesthetic. Too clinical for the "underground music" mood. Keep KVS as the app reference.
- **Product detail / artist pages**: Augen's product layouts (`/products/a1-sense.html`) are a great template for "deep dive on one thing" pages

## Open questions for Doug

1. Do we want Lenis on Sound Cave? It's beautiful but adds friction for power users (keyboard shortcuts, accessibility). Probably yes for marketing pages, no for the app.
2. Sound Cave splits between KVS-mood (app) and Augen-mood (marketing) — is that the right call, or should we pick one and commit?
3. The Augen photography bar is unreachable without a budget. What's the v1 substitute? (AI gen? Stock? Bold typography in lieu of imagery?)

## Notes on the code mirror

Located at `~/Desktop/website_clones/augen/` (kept out of the wiki/repo because it's 65MB).

- The JS bundles are minified — readable structure, gibberish names. To deobfuscate, run `npx prettier --write ~/Desktop/website_clones/augen/augen.pro/_nuxt/*.js` (formats but doesn't rename vars).
- The CSS files **are** readable — that's where to dig for animation timings, easings, and the exact responsive breakpoints.
- `_payload.json` is a frozen snapshot of the CMS data at capture time. Useful for seeing the content model, useless for running the live site offline.

To reproduce the mirror if lost:
```
mkdir -p ~/Desktop/website_clones/augen && cd ~/Desktop/website_clones/augen && \
wget --mirror --convert-links --adjust-extension --page-requisites \
     --span-hosts --domains=augen.pro,a.storyblok.com \
     --user-agent="Mozilla/5.0" https://augen.pro/
```
