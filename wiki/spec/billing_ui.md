# Spec — Pricing / Billing UI

> Status: **Approved 2026-04-29** (Doug accepted recommendations on all 4 framing questions).

## Decisions (UI Change Protocol)

1. **Surface** — modal triggered from the account dropdown ("Upgrade plan" link). After subscribing, the same dropdown shows "Manage billing" → opens Stripe Customer Portal.
2. **Card layout** — three side-by-side cards: Solo / Label / Agency. Middle card (Label) flagged as "Most popular".
3. **Tier differentiation** — credits-only. All features unlocked at every tier; tiers differ on monthly credit grant. Locks down complexity early; can revisit.
4. **Hero moment** — card hover = soft red glow + 4px lift; Subscribe button brightens on hover. Reuses existing red/fire palette.

## Pricing

| Tier    | Price (monthly) | Credits / month | Stripe lookup_key |
|---------|-----------------|-----------------|-------------------|
| Solo    | £29             | 500             | `tier_solo_monthly` |
| Label   | £79             | 2000            | `tier_label_monthly` |
| Agency  | £199            | 6000            | `tier_agency_monthly` |
| Pack    | £10             | 200 (one-off)   | `credit_pack_200` |

Credit costs (already live): text gen 1 / image gen 5.

Top-up triggers:
- Subscription renewal (`invoice.payment_succeeded` with subscription) → set tier to plan, refill credits to that tier's monthly grant
- Credit pack purchase (`checkout.session.completed`, mode `payment`) → add 200 credits, no tier change

## Constraints

- Reuse existing `:root` tokens. No new fonts/colours.
- Mobile: cards stack vertically below 720px.
- Modal must be dismissable (Esc, backdrop click, X button).

## Out of scope (later)

- Annual pricing (use monthly first; annual is ~15-20% savings later)
- Plan downgrades / proration UX (Stripe handles; let portal cover it)
- Team seats / RBAC (deferred — Agency stays single-seat for now)
- Dunning / failed payment in-app warnings (rely on Stripe email + portal)
