# Decision 0003 — SaaS Architecture

> Status: **Approved 2026-04-28** by Doug. Supersedes ad-hoc backend choices in 0002.

## Decision
Sound Cave becomes a multi-tenant hosted SaaS using this stack:

| Layer | Choice | Cost at start |
|---|---|---|
| Frontend host | **Vercel** | Free |
| Backend host | **Railway** (Flask + worker) | ~£5/mo |
| DB + Auth + Storage | **Supabase** (Postgres + auth + S3-style storage) | Free tier |
| Job scheduler | **Inngest** (cron + delayed jobs for scheduled posts) | Free tier |
| Billing | **Stripe** (subs + metered credits) | Free in test |
| Social posting | **Ayrshare** (IG, TikTok, X, LinkedIn behind one API) | Pay-per-post; dev tier free |
| Text gen | **Anthropic Claude Haiku** (existing) | Pay-per-token |
| Image gen | **Fal AI** (FLUX schnell primary), **Replicate** (fallback) | Pay-per-image |
| Video gen | Same Fal + Replicate, generalised in `media_gen.py` | Tiered, pay-per-clip |

## Three product pillars
1. **Scout** — SoundCloud discovery (already built)
2. **Create** — text + image + video via multi-provider routing
3. **Distribute** — Trail Map calendar → Ayrshare publishing

## Pricing model — credits + subscription
- Sub tiers (£/mo): **Solo £29 / 500 credits**, **Label £79 / 2000 credits**, **Agency £199 / 6000 credits**
- Credit packs: **£10 = 200 credits** (top-up)
- Per-action cost (illustrative):
  - Text post: 1 credit (~£0.05)
  - Image: 2 credits
  - Composite video (Tier 1, FFmpeg): 3 credits
  - Standard video (Tier 2, LTX/Hunyuan via Fal): 10 credits
  - Premium video (Tier 3, Kling/Veo/Runway): 50–100 credits
  - Scheduled post: 1 credit
- Target gross margin after API costs: 50–70%

## Video — three tiers in one engine
- **Tier 1 — Composite (~£0):** static image + audio waveform + Ken Burns via FFmpeg. Workhorse.
- **Tier 2 — Standard (~£0.05–0.15):** LTX or Hunyuan via Fal. 5–10s text-to-video.
- **Tier 3 — Premium (~£0.50–2):** Kling, Veo, Runway. Hero moments.

`image_gen.py` → generalises to `media_gen.py`. Same provider routing pattern.

## API keys to acquire (in order)
1. ✅ `ANTHROPIC_API_KEY` (confirm exists)
2. `FAL_KEY` — fal.ai
3. `REPLICATE_API_TOKEN` — replicate.com
4. `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_KEY` — supabase.com
5. `STRIPE_SECRET_KEY` (test) + `STRIPE_WEBHOOK_SECRET` — stripe.com
6. `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` — inngest.com
7. `AYRSHARE_API_KEY` — ayrshare.com (dev tier free, paid at launch)

Upfront cost to private beta: **£0–30**. Nothing recurring until customers exist.

## Phases (eight, A–H)
- **A — Foundations:** Supabase project, schema, migrate Stash + images
- **B — Auth + tenancy:** Supabase auth, RLS, per-user isolation
- **C — Credits engine:** ledger pattern, debit/refund middleware
- **D — Stripe:** subscriptions + credit packs + webhooks
- **E — Media gen v2:** `media_gen.py` with image + 3 video tiers
- **F — Trail Map calendar:** drag-drop scheduler UI
- **G — Ayrshare integration:** OAuth per platform, post executor
- **H — Polish + private beta:** onboarding, 5–10 paying users

Execution layout: see `0004_parallel_execution.md`.

## What was deferred
- Voice profiles (push to v2)
- PDF export / mailto polish
- Direct platform integrations (defer until Ayrshare margins hurt)

## Why this stack vs alternatives
- **Supabase** over Firebase: Postgres = sane SQL for relational data (artists, posts, schedules)
- **Supabase** over rolling our own: ~1 day vs ~3 weeks of plumbing
- **Ayrshare** over direct IG/TikTok/X APIs: 3–6 months saved, X write API alone is $100+/mo
- **Inngest** over self-rolled cron: scheduled posts need retries + observability; free tier covers thousands
- **Credit system** over pure subs: matches user intuition (Midjourney/ChatGPT pattern), maps cleanly to variable provider costs
