# Sound Cave — Brand Assets

**The one place to find every S0UNDCAV3 logo, icon, font, colour, and brand reference.**
Not code — just art and reference material. If you're looking for a logo to drop into a
deck, a poster, or a social post, it's here.

## Quick grab — "I just need the logo"

| You want… | Use this file |
|---|---|
| The logo (vector, transparent) | `logo/soundcave_logo_2026-05-11.svg` |
| The logo at 300×300 (PNG, transparent) | `logo/soundcave_logo_300.png` |
| **Logo with the name underneath** (vector) | `logo/soundcave_lockup_stacked_2026-08-03.svg` |
| Logo with the name underneath, 300×300 PNG | `logo/soundcave_lockup_stacked_300.png` (transparent) or `_dark_300.png` (cave-black + ember glow) |
| The app icon / favicon (logo on dark square) | `icons/favicon.svg` |
| The favicon at 300×300 (PNG) | `icons/favicon-300.png` |
| The alternate / boxed logo | `logo/dormant/soundcave_logo_alt_2026-05-11.svg` |
| The fonts | `fonts/DMSans-Regular.ttf`, `fonts/DMMono-Regular.ttf` |
| A Reddit profile banner (logo + wordmark) | `banners/soundcave_banner_reddit_1920x384_2026-06-29.png` |

## Structure

```
brand/
├── README.md                ← you are here (the index)
├── logo/                    active logo files (SVG preferred, dated filenames keep history)
│   ├── soundcave_logo_2026-05-11.svg          primary mark, vector
│   ├── soundcave_logo_300.png                 primary mark, 300×300 transparent
│   ├── soundcave_lockup_stacked_2026-08-03.svg  mark + wordmark underneath, vector
│   ├── soundcave_lockup_stacked_300.png       lockup, 300×300 transparent
│   ├── soundcave_lockup_stacked_dark_300.png  lockup, 300×300 on cave black + ember glow
│   └── dormant/             alternates, drafts, retired logos — kept for reference / revival
│       └── soundcave_logo_alt_2026-05-11.svg
├── icons/                   app-icon / favicon set (reference copies — see note below)
│   ├── favicon.svg          512×512, logo on the dark rounded square
│   ├── favicon.ico          16/32/48 multi-res ICO (Chromium omnibox + legacy fallback)
│   ├── favicon-32.png       32×32 PNG fallback
│   ├── favicon-192.png      192×192 PNG (Chromium high-DPI surfaces)
│   ├── favicon-300.png      300×300 PNG (decks, store listings, profile avatars)
│   └── apple-touch-icon.png 180×180 home-screen icon
├── fonts/                   brand typefaces (TTF)
│   ├── DMSans-Regular.ttf
│   └── DMMono-Regular.ttf
└── banners/                 horizontal lockups for social profile headers
    └── soundcave_banner_reddit_1920x384_2026-06-29.png
```

## Full asset list

### Logos (vector)

| File | Format | What it is |
|---|---|---|
| `logo/soundcave_logo_2026-05-11.svg` | SVG, transparent | **Primary mark.** Off-white cave glyph, no background. Used in the splash, header tab, and hero. |
| `logo/soundcave_lockup_stacked_2026-08-03.svg` | SVG, transparent, 499×577 | **Stacked lockup.** Primary mark with the `S0UNDCAV3` wordmark underneath. Wordmark is DM Mono at `0.18em` tracking, **converted to outlines** — no font needed to render it. Wordmark width is 90% of the mark width; gap is 10%. |
| `logo/dormant/soundcave_logo_alt_2026-05-11.svg` | SVG, 1024×1024 | Alternate — same glyph on a solid `#0A0A0A` square. Dormant; kept for possible revival. |

### Logos (raster, 300×300)

Rendered from the vector masters above (headless Chromium at 4× → Lanczos downscale), so they
stay pixel-consistent with the rest of the set. Each PNG is a square 300×300 canvas with the art
fitted and centred, so the four drop into a grid without re-cropping.

| File | Background | What it is |
|---|---|---|
| `logo/soundcave_logo_300.png` | transparent | Mark only. Fills the width (mark is 1.04:1), centred vertically. |
| `logo/soundcave_lockup_stacked_300.png` | transparent | Mark + `S0UNDCAV3` underneath. Fills the height (lockup is 0.87:1), centred horizontally. |
| `logo/soundcave_lockup_stacked_dark_300.png` | `#0a0a0a` + ember glow | Same lockup on cave black with an `#ff4500` radial glow — the "hero" treatment, for dark decks and social avatars where a transparent PNG would sit on the wrong background. |

### App icons / favicons

These are the logo rendered as an app icon (mark on the brand dark rounded square).

| File | Size | Used as |
|---|---|---|
| `icons/favicon.svg` | 512×512 | Modern-browser favicon (`<link rel="icon" type="image/svg+xml">`) |
| `icons/favicon.ico` | 16 + 32 + 48 | Multi-res ICO served from the site root — Chromium's omnibox/URL-suggestion UI requests `/favicon.ico` directly; also the legacy fallback |
| `icons/favicon-32.png` | 32×32 | PNG favicon fallback |
| `icons/favicon-192.png` | 192×192 | Larger PNG for Chromium high-DPI surfaces (new-tab tiles, suggestion rows) |
| `icons/favicon-300.png` | 300×300 | Not a browser size — the app icon at deck/store/profile-avatar scale. Reference copy only; nothing at the repo root needs it |
| `icons/apple-touch-icon.png` | 180×180 | iOS/Android home-screen icon |

> All raster sizes are rendered from the `favicon.svg` master (headless-Chromium render →
> Lanczos downscale) so the set stays pixel-consistent. Re-render from the SVG if the mark changes.

> **⚠ Deployed copies live at the repo root**, not here. `index.html` references
> `favicon.svg`, `favicon.ico`, `favicon-32.png`, `favicon-192.png`, and
> `apple-touch-icon.png` with root-relative paths because GitHub Pages serves icons from
> the site root (and browsers hit `/favicon.ico` unprompted). The copies in `icons/` are the
> findable **reference masters** — if you change an icon, update **both** the root copy
> and the copy here so they don't drift.

### Banners / social

Lockups (logo + `S0UNDCAV3` wordmark, no glow) on cave-black, sized for social profile headers.

| File | Size | For |
|---|---|---|
| `banners/soundcave_banner_reddit_1920x384_2026-06-29.png` | 1920×384 (5:1) | Reddit profile banner — **stacked** (logo above wordmark) |

> **Reddit mobile crops the banner inward to ~the centre third**, so a wide horizontal
> logo-left/wordmark-right lockup loses its ends on a phone. The Reddit banner therefore
> uses a **stacked** lockup sized to sit inside the full safe zone — the art spans only
> x 832–1088 and y 108–274 of the 1920×384 canvas, i.e. inside both the centre-third
> width *and* the central ~200px height, so it stays whole on every viewport (Reddit crops
> inward on mobile both horizontally and vertically). Recommended size is 1920×384; keep
> key art inside the central 1300×200 px. Keep the PNG under ~400 KB or Reddit re-compresses it.
>
> Built from the master logo SVG + DM Mono wordmark via headless Chromium. For a wider
> header (e.g. X/Twitter 1500×500, which crops less aggressively) a horizontal lockup is
> fine — re-render keeping the group centred.

### Fonts

| File | Role |
|---|---|
| `fonts/DMMono-Regular.ttf` | **Display / logo** — DM Mono, monospace, wide tracking (`0.18em`), lowercase |
| `fonts/DMSans-Regular.ttf` | **Body** — DM Sans |

In the app these load via `--font-mono` / `--font-body` CSS variables (`css/style.css`).

## Palette (locked, from `tokens.css`)

| Hex | Role |
|---|---|
| `#0a0a0a` | Cave black (primary bg) |
| `#120e0c` | Warm cave black |
| `#e8e8e8` | Off-white (text / mark) |
| `#888888` | Muted grey |
| `#4a4a4a` | Faint grey |
| `#ff4500` | Orange-red accent (hero) |
| `#ff6a1f` | Hot orange (hover) |
| `#aa2a00` | Deep ember (shadow) |

## Type

- **Display / logo:** DM Mono (monospace, wide tracking `0.18em`, lowercase)
- **Body:** DM Sans

## Notes

- Logo filenames are **dated** (`_YYYY-MM-DD`) so we keep version history — add a new dated
  file rather than overwriting when the mark changes, and move the old one to `logo/dormant/`.
  Size-suffixed files (`_300.png`, `favicon-192.png`) are **renders of the dated master**, not
  versions of their own — re-render them whenever the master changes.
- The lockup wordmark is **outlines, not live text**. To change the wording or tracking, rebuild
  it from `fonts/DMMono-Regular.ttf` (the glyphs are laid out at `0.18em` tracking, then scaled so
  the wordmark is 90% of the mark width with a 10% gap) — you can't edit it as text in the SVG.
- This folder is the **single source of truth** for brand art. Related *spec/design* pages
  (the compositor, brand-kit UI, image-gen brand awareness) live in `wiki/spec/brand_*.md`.
