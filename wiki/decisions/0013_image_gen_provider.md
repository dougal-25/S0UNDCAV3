# Decision 0013 — Image-gen provider strategy: fal primary, Replicate fallback

> **Date:** 2026-06-25
> **Status:** Accepted (documents as-built reality). Closes the `_(TODO — write when picking primary vs fallback strategy)_` marker in [firepit_forge.md](../features/firepit_forge.md) "Related" list.
> **Context:** The Forge's image generation has used **fal** as the working provider and **Replicate** as a fallback since the `image_gen.py` → `media_gen.py` move ([0005_media_gen.md](0005_media_gen.md)), but the *why* of that split was never written down. This page records the decision so the routing is reviewable and the fallback's narrow role is explicit.

## The decision

1. **fal is the primary image provider.** Every image route in the v2 job router goes to a fal model — backdrops (Seedream v5 Lite), hero art (FLUX.2 [pro]), and all restyle/avatar/compose/edit work (Nano Banana Pro). The router itself is fal-only and surfaces errors to the caller rather than retrying elsewhere ([media_gen.py:858-900](../../media_gen.py#L858-L900), registry at [:774-792](../../media_gen.py#L774-L792)).
2. **Replicate is a fallback for the legacy text-to-image path only.** The legacy `generate_image()` chain tries fal FLUX schnell, then Replicate FLUX schnell, then raises ([media_gen.py:953-969](../../media_gen.py#L953-L969)). It survives solely as a degrade path for **ref-free** Forge generations.
3. **A ref-based generation never silently degrades.** `/api/generate-image` calls the v2 router; if it fails *and references were supplied*, the endpoint **re-raises** instead of dropping to the ref-blind legacy chain — a ref-blind model (flux-schnell) ignores every reference and garbles baked-in text, which once shipped looking like a real attempt ([content_api.py:1087-1103](../../content_api.py#L1087-L1103)). Only a no-refs generation is allowed to fall back.

## Why fal wins

- **Model breadth.** The looks the studio needs — character-consistent restyle, multi-reference compose, faithful baked-in typography — live on fal's `/edit` endpoints (Nano Banana Pro, FLUX.2 [pro], Seedream v5 Lite). Replicate's image offering here is just FLUX schnell. The whole v2 registry is fal slugs because no other provider covers these jobs ([media_gen.py:774-792](../../media_gen.py#L774-L792)).
- **Reference-native routing.** Bake-offs ([0009_baked_vs_overlay.md](0009_baked_vs_overlay.md) lineage; registry comments at [media_gen.py:779-791](../../media_gen.py#L779-L791)) settled restyle/compose on **Nano Banana Pro/edit** for the best style fidelity *and* legible small print. That endpoint has no Replicate equivalent in the stack.
- **Cost is verified and acceptable.** [0010_media_gen_cogs_verified.md](0010_media_gen_cogs_verified.md) confirmed live fal pricing — nano-banana-pro ≈ £0.12/img, flux-2-pro ≈ £0.06 — and that spend is image-dominated but trivial (~£35/mo projected). There is no cost case to move the primary off fal.
- **One key, one queue.** Both image and video tiers authenticate with the same `FAL_KEY` ([media_gen.py:603-607](../../media_gen.py#L603-L607), [:865-867](../../media_gen.py#L865-L867)), keeping ops surface small.

## Why keep Replicate at all

- It is the **only second pair of hands** if fal's FLUX schnell endpoint has an outage during a ref-free generation — cheap insurance for the one path where a generic backdrop is an acceptable degrade.
- It requires no extra code beyond the existing legacy chain; removing it buys nothing and loses the safety net. Left in place, gated to ref-free only.

## Evidence (so this page is checkable)

| Claim | Evidence |
|---|---|
| v2 router is fal-only, raises on failure | [media_gen.py:858-900](../../media_gen.py#L858-L900) (`generate_for_job`) |
| Every job_type maps to a `fal-ai/…` slug | [media_gen.py:774-792](../../media_gen.py#L774-L792) (`_JOB_REGISTRY`) |
| Primary fal image call (FLUX schnell) | [media_gen.py:603-629](../../media_gen.py#L603-L629) (`_generate_fal`) |
| Legacy chain = fal → Replicate → raise | [media_gen.py:953-969](../../media_gen.py#L953-L969) (`generate_image`) |
| Endpoint uses v2 first, guards ref-based fallback | [content_api.py:1087-1103](../../content_api.py#L1087-L1103) |
| Restyle/compose chose Nano Banana Pro in bake-off | [media_gen.py:779-791](../../media_gen.py#L779-L791) (registry comments) |
| fal COGS verified, no provider move warranted | [0010_media_gen_cogs_verified.md](0010_media_gen_cogs_verified.md) |
| Both providers are optional env vars | `FAL_KEY` / `REPLICATE_API_TOKEN` ([CLAUDE.md](../../CLAUDE.md) Environment) |

## Open follow-ups

- **Retire the legacy chain entirely** once Forge is fully proven on v2 — the `generate_image()` fallback (and the Replicate dependency) can then go ([media_gen.py:949-951](../../media_gen.py#L949-L951) already flags this).
- **Video providers** are out of scope here — their primary/fallback tiers (fal LTX/Kling → Hunyuan/Replicate Veo) are recorded in [0005_media_gen.md](0005_media_gen.md) and [0003_saas_architecture.md](0003_saas_architecture.md).
