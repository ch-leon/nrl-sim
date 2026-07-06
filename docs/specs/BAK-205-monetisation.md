# BAK-205 — Implement monetisation (model TBD)
**Linear:** https://linear.app/bakinglions/issue/BAK-205/implement-monetisation-model-tbd | **Priority:** Medium | **Work unit:** (decision — no WU)

> **BLOCKED — requires business decision + external accounts (Stripe/ad network); excluded from
> build execution.** This is a **decision document**, not an implementation spec. No source
> files are produced by this ticket. ARCHITECTURE §9 already records this as blocked.

## Problem
The monetisation model is undecided (see `docs/00-overview.md`): premium one-off via Stripe,
free + ads, or free + cosmetic IAP. Two of the three (premium, IAP) require server-side
entitlement verification, which the current **static-hosting** architecture does not provide.
We cannot responsibly build any of them until a model and the backing accounts/infrastructure
are chosen. The one thing safe to build now is a cosmetic system, behind a flag, with no
payment coupling.

## Proposed solution (decision + recommendation)
Adopt **premium one-off** as the primary recommendation and pre-build a cosmetic kit-colour
system behind a flag so a later IAP pivot is cheap. Do not integrate any payment SDK until the
prerequisites checklist is satisfied.

### Comparison matrix
| Model | Revenue shape | Client effort | Backend required | Pay-to-win risk |
|---|---|---|---|---|
| Premium one-off (Stripe) | Upfront, per-user, predictable | Low | **Yes** — license check endpoint / entitlement store | None |
| Free + ads | Ongoing, low ARPU, volume-driven | Medium (ad SDK, consent) | Ad-network account; consent/privacy backend-ish | None (but UX cost) |
| Free + cosmetic IAP | Ongoing, opt-in, higher ARPU/payer | High (catalog, purchase flow, restore) | **Yes** — purchase verification + entitlement store | None if cosmetic-only |

Key architectural fact: **premium and IAP both require a server component** for entitlement
verification (verify payment, gate unlock, prevent trivial client tampering). The current
build is static-hosted (localStorage saves, no auth), so either model adds new infrastructure.

### Recommendation
Premium one-off is the simplest and fits the Kairosoft precedent (paid app, full game, no
grind-to-pay). Minimal backend: **Stripe Payment Links** (no custom checkout UI) plus a
lightweight serverless **license-check endpoint** (verify a purchased license key / email →
returns entitlement JSON, cached client-side). Avoids ad-network complexity and avoids the
larger IAP catalog/restore surface while keeping "no pay-to-win" trivially true.

### Prerequisites checklist (all must be true before any implementation ticket)
- [ ] Business decision recorded (which model) in `docs/00-overview.md`.
- [ ] Stripe account + product/Payment Link created; test + live keys provisioned.
- [ ] A hosting target for a serverless function chosen (e.g. Netlify/Vercel/Cloudflare fn) —
      the static host must gain a single verify endpoint.
- [ ] Privacy policy + terms published (payment + any analytics).
- [ ] Analytics decision: whether to track conversion (and consent handling if EU users).
- [ ] Threat model for license bypass accepted (offline-first game → soft enforcement only).

### What CAN be pre-built now (no decision needed)
A **cosmetic kit-colour system behind a flag** — purely presentational, no payment coupling:
- A cosmetics catalog (kit colour palettes, optional stadium skins) as pure data.
- Selected cosmetics stored in `state.settings` (extend the settings object) so they persist
  via the existing save system; all cosmetics **unlocked/free** while the flag is off.
- A feature flag (e.g. `config.ts` `MONETISATION_ENABLED = false`) gating whether cosmetics are
  ever locked; with it off, everything is free and no purchase UI renders.
- Because it only touches presentation + settings, it introduces **zero pay-to-win** and is
  fully reversible if the model changes. This work should be scoped as its own future ticket,
  not built under BAK-205.

## Affected files
- None. (Decision document only. If/when unblocked, spin up separate implementation tickets:
  one for the cosmetic system, one for the chosen payment/verify integration.)

## Key interfaces & behaviour
None implemented here. Illustrative shape only, for the future cosmetic ticket (not binding):
```ts
// FUTURE, not part of this ticket:
// interface Cosmetics { kitPaletteId: string; stadiumSkinId: string; }
// const MONETISATION_ENABLED = false; // when true, some cosmetics require entitlement
```

## Edge cases & risks
- Building a payment flow before the server exists would strand entitlement checks → blocked.
- Offline-first + localStorage means license enforcement is inherently soft; accept as a
  business risk (piracy tolerance) rather than over-engineering DRM.
- Ads model adds consent/privacy obligations disproportionate to a niche sim → deprioritised.

## Acceptance criteria
- This document is reviewed and a model is selected; decision recorded in `docs/00-overview.md`.
- No monetisation code is merged while the ticket is BLOCKED.
- (Post-decision) the chosen model is broken into implementation tickets with their own specs.

## Out of scope
- Any Stripe/ad SDK integration, license endpoint code, purchase UI, or analytics wiring — all
  deferred to post-decision tickets. No pay-to-win mechanics under any model.
