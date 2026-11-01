# Marketing

Last updated: 2026-11-01 (status as of 1 Nov 2026)

Sources: `src/brand.ts`, `src/commercial/`, `docs/specs/commercial-*.md` and the
issues on [apps](https://github.com/ch-leon/nrl-sim/issues/335),
[entitlements](https://github.com/ch-leon/nrl-sim/issues/362),
[brand](https://github.com/ch-leon/nrl-sim/issues/363),
[paywall](https://github.com/ch-leon/nrl-sim/issues/364) and
[commercial foundations](https://github.com/ch-leon/nrl-sim/issues/365).

## Name

**Open.** The game is still "NRL Sim". A league-neutral name is to come, shown with
"a SuperCOOKED game" once it's chosen (the line is built but hidden). Renaming is a
change to `src/brand.ts` and a rebuild; storage keys never change, so no career is
lost. The [apps roadmap](https://github.com/ch-leon/nrl-sim/issues/335) flags naming
and trademarks as its biggest risk. Players and clubs in the game are already
fictional.

## Disclaimer

From `src/brand.ts`, shown in Settings and meant for the store listing:

> Not affiliated with or endorsed by the NRL, its clubs or players.

## Store copy and screenshots

- **Store copy: Open.**
- **Screenshots: Open.**

## Pricing

Premium, with a free demo and a one-off unlock. Tiers in the code: **demo**,
**standard** (full game on the platform it was bought on) and **all platforms**
(full game everywhere).

- **Price: Open.** None set. The paywall shows a placeholder dash until a store
  supplies the price.
- **Cross-buy: Open.** Is cross-buy included in standard, or only in all platforms?
  The code switch is off (standard unlocks its own platform).
- **Demo length: Open.** Code placeholder: season 1 up to round 3, marked as Leon's
  decision.
- **Today's web players: Open.** Code placeholder: careers already on a device keep
  the full game.

## Payments

- **RevenueCat: planned** for who owns what across Apple, Google and web. Today
  the game uses a local stub with a RevenueCat-shaped seam: no account, SDK or keys.
- **Web checkout: Open.** Paddle or Stripe?
- Each country's store rules (in-app only, link out, "Already bought? Log in") drive
  what the paywall shows (`src/commercial/storeRules.ts`).
- The demo gate, paywall and login sit behind the commercial switch, which is off on
  the live build. The storage adapter, content packs and brand config are in use.

## Store accounts

Not set up (Apple Developer and Google Play).
