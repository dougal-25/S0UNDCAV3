# Splash + Cave Entrance — UI spec

**Status:** Shipped & visually confirmed by Doug 2026-05-08. See [`splash_cave_entrance_assets/v1_splash.png`](./splash_cave_entrance_assets/v1_splash.png).
**Surface:** First-impression splash and the reveal that drops the user into the app
**Files touched:** `index.html` (`.cave-entrance`), `css/style.css` (entrance block at top), new `tokens.css`, new `js/cave_entrance.js`

## References

Hybrid of the two saved design references:

- [`wiki/design_references/kvs_studio.md`](../design_references/kvs_studio.md) — CRT bezel, monospace, bracket microcopy, single orange-red accent, halftone sigil, glitch type, ambient drone
- [`wiki/design_references/augen.md`](../design_references/augen.md) — pinned cinematic reveal choreography, restraint, tuned easing curves, color-flip on section entry

KVS supplies the **skin and microcopy discipline.** Augen supplies the **motion grammar and restraint.** Existing cave-mouth-opens reveal stays as the architectural backbone — it's already an Augen-style pinned moment; we just dress it KVS and tune the timing.

## Mood/feel

Underground music people walking up to a closed cave at night. The mouth is small and dark, scanlines flicker across a CRT screen, a low hum is *available* (not forced). It feels like a private place that's selective about who comes in — premium and weird, but not theatrical. Once you're in, the world prints itself into existence through a halftone dot-screen.

## Hero moment

> Page loads silent. The cave-mouth shape sits closed, framed by CRT scanlines + vignette + film grain. Centered: the mountain logo rendered through a halftone dot-screen, with `{HEADPHONES RECOMMENDED}` bracket label below, and the email field. On submit, the CTA text glitch-scrambles ("CHECK YOUR EMAIL" → "CH*CK Y0UR EM%IL" → resolves), the cave mouth opens, and the dashboard fades up *through* a dot-screen halftone that resolves to clean pixels over ~1.2s. Like the world is being printed onto the screen.

The hero is the **glitch-resolve + halftone-print combo**. Everything else (palette, type, microcopy) is supporting cast.

## Anti-examples

- **Slick SaaS dashboards** (Linear, Notion homepage): too clean, too friendly, nothing to make you lean in
- **Gamified onboarding with cute illustrations**: kills the audience instantly
- **Generic "dark mode" with electric blue accents**: we want orange-red, not crypto-blue
- **Anything that screams "AI"** (gradient meshes, sparkle icons): Sound Cave is *for* music people, not engineers

## Constraints

- Fresh slate — no existing tokens preserved (greys + DM Sans get replaced)
- Mobile-first
- Vanilla HTML/CSS/JS only — no framework, no GSAP, no Lenis (splash doesn't scroll)
- Audio: **opt-in.** Mute by default, `{SOUND ON / OFF}` toggle in corner. No autoplay surprise.
- Existing Phase A/B login flow must keep working — re-skin only, no flow changes
- Reduced-motion users get a static fade fallback (existing media query in style.css already covers this — preserve)
- Performance: splash is the first paint. Total entrance JS budget < 5KB. Halftone done with SVG `<filter>`, not a video.

## Visual ingredients (lifted)

| Ingredient | Source | How it appears here |
|---|---|---|
| CRT scanlines | KVS | Repeating linear-gradient overlay on `.cave-entrance` (1px stripes, 4% opacity) |
| Film grain | KVS | SVG noise filter applied as `::after`, animated translate every 80ms |
| Vignette | KVS | Radial-gradient overlay, dark at corners |
| Monospace type | KVS | New token `--font-mono: 'JetBrains Mono', 'Space Mono', ui-monospace, monospace` |
| `{bracket microcopy}` | KVS | All meta-text wrapped — `{HEADPHONES RECOMMENDED}`, `{SOUND ON}`, `{ENTER}`, `{47.5°N 0.1°W}` |
| Single orange-red accent | KVS | `--accent: #ff4500` replaces current `--red: #e63946` for splash. App keeps red palette for now (separate decision). |
| Halftone dot-screen | KVS | SVG pattern overlay on logo + on app-wrap during reveal. Resolves to clean over 1.2s. |
| Glitch-scramble text | KVS | ~30 lines vanilla JS on CTA submit — randomly swaps letters from `!<>-_\\/[]{}—=+*^?#________` for 600ms then locks |
| Pinned reveal | Augen | Existing transform: scale on `.cave-entrance::before` — keep, but retune duration `2s → 1.4s` and tighten easing |
| Color flip on entry | Augen | `transition: background-color .6s` on body when entering — splash bg `#0a0a0a` → app bg (kept dark for now, but a touch warmer) |
| Restraint | Augen | One hero moment, one accent color, two type sizes, no decorative emoji or extra UI chrome |

## Tokens (locked here, sourced from `tokens.css`)

```
--font-mono:      'JetBrains Mono', 'Space Mono', ui-monospace, monospace
--font-display:   var(--font-mono)            /* same family, larger size */
--color-bg:       #0a0a0a                      /* near-black */
--color-text:     #e8e8e8                      /* off-white */
--color-muted:    #888888
--color-accent:   #ff4500                      /* orange-red, single accent */
--color-accent-hot: #ff6a1f                    /* hover/active only */
--scan-opacity:   0.04
--grain-opacity:  0.06
--motion-fast:    180ms
--motion-mid:     600ms
--motion-slow:    1400ms
--ease-cinematic: cubic-bezier(0.16, 0.7, 0.3, 1)   /* keep existing — Augen-tier */
--ease-glitch:    steps(8, end)
```

## Choreography (timeline)

```
t=0      Page paints. Splash visible. CRT frame on. Logo halftoned. Mute.
         Microcopy: {HEADPHONES RECOMMENDED}  {SOUND ON / OFF}
t=0+     Cursor blink starts in email field. Subtle drone available behind toggle.
         User types email, clicks {ENTER}.
t=user   CTA text begins glitch-scramble (600ms, ease-glitch).
t=+0.6s  CTA resolves to "CHECK YOUR EMAIL" / or "ENTERING…".
t=+0.7s  Cave mouth begins opening (existing transform: scale 0.12 → 1, 1.4s, ease-cinematic).
         Simultaneously: app-wrap scales 0.94 → 1, fades from 0 → 1, with halftone overlay at full strength.
t=+1.4s  Cave mouth fully open. Halftone overlay starts dissolving (1.2s linear).
t=+2.6s  Halftone gone. App fully resolved. Splash hidden.
```

## Skipped from refs (intentional)

- KVS hard splash gate (we have a login form here — kills auth conversion)
- KVS live 3D morphing centrepiece (SVG halftone + 1 small motion = enough)
- KVS pixel-cluster custom cursor (defer — cursor changes break native UX expectations)
- Augen Lenis smooth-scroll (splash doesn't scroll)
- Augen 8-resolution `srcset` (no images on splash)

## Build notes

(populate as we build)

## Open questions for next iteration

- Does the entrance treatment carry into the app, or is the app a different visual world? (KVS reference suggests: marketing = full KVS, app = lighter touch. Decide once entrance lands.)
- Audio asset — placeholder ambient drone or commission/curate something specific to Sound Cave?
- GPS coordinate microcopy — fake/atmospheric, or real (London, since Doug is based there)?
