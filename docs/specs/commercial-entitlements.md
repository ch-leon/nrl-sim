# Commercial foundations 03: entitlements, the demo gate and the `commercial` flag
**GitHub:** [#362](https://github.com/ch-leon/nrl-sim/issues/362) | **Code:** `src/commercial/` | **Tests:** `tests/commercial/`

NRL Sim will be a premium game: a free demo, then a one-off unlock. This ticket
lays the logic underneath that: who owns what, where the demo ends, and the flag
that keeps all of it out of the live game until it is ready. There is no UI (the
paywall is task 05), no login, no SDK, no keys and no network.

Everything still undecided is a config value marked `// DECISION (Leon)` in the
code; the table at the end lists them.

## The `commercial` flag (`src/commercial/flags.ts`)

`commercialEnabled()` is true only when:

- the build sets `VITE_COMMERCIAL=1`, or
- it is a dev build (`npm run dev`, `import.meta.env.DEV`) opened with `?commercial=1`.

The GitHub Pages build sets neither, so there the flag is always off. The URL
param does nothing in a production build. Tests force it with `__setCommercial`.

With the flag off, nothing below runs in a way a player can notice: the demo gate
returns before it reads anything, the entitlement service is never built, and no
localStorage key is written (`tests/commercial/demo.test.ts` checks this with a
storage spy over a whole soak season).

`.env` and `.env.*` are git-ignored. Values needed later (RevenueCat's public key,
Supabase's URL) come in as `import.meta.env.VITE_*` placeholders, never committed.

## The model (`src/commercial/entitlements.ts`)

```ts
type Tier = 'demo' | 'standard' | 'allPlatforms';
type Platform = 'web' | 'ios' | 'android' | 'steam';
interface Entitlements {
  tier: Tier;
  platforms: Platform[];   // where standard was bought; all for allPlatforms; none for demo
  source: 'stub' | 'revenuecat' | 'steam' | 'grandfathered';
  checkedAt: number;       // ms since epoch
}
```

The tiers proposed:

| Tier | Gets |
|---|---|
| demo | Season 1 up to round `DEMO.lastWeek` (below). |
| standard | The full game on the platform it was bought on. |
| allPlatforms | The full game everywhere, plus cloud saves moving between platforms. |

`hasFullGame(ent, platform)` is the one rule that reads them: demo never, standard
on its own platforms, allPlatforms everywhere. `CROSS_BUY_INCLUDED` (a DECISION)
makes standard unlock every platform, as allPlatforms does: Option A in the launch
plan. The web build's own platform is `PLATFORM = 'web'`.

## Providers

```ts
interface EntitlementProvider {
  current(): Promise<Entitlements>;
  refresh(): Promise<Entitlements>;   // after a purchase
  restore(): Promise<Entitlements>;   // the store's Restore purchases
  onChange(cb): () => void;           // answers the provider learns of by itself
}
```

- **`LocalStubProvider`**: the stand-in store. Its tier is kept in the dev-only key
  `nrl-sim-entitlements-stub`; unset, it is `demo` with the flag on and `standard`
  with it off. In the dev build the console has
  `window.__nrlEntitlements.set('standard')` (and `.get()`); the game carries on at
  once, no reload. The hook is not in the production build.
- **`RevenueCatProvider`** (`src/commercial/revenuecat.ts`): a typed seam only. It
  takes an injected client shaped like RevenueCat's Purchases API (`logIn(appUserId)`,
  `getCustomerInfo()`, `restorePurchases()`, `addCustomerInfoUpdateListener`) and
  maps `CustomerInfo.entitlements.active` to ours:

  | RevenueCat entitlement id (placeholder) | Ours |
  |---|---|
  | `all_platforms` | allPlatforms, every platform (wins over any standard) |
  | `standard_web`, `standard_ios`, `standard_android` | standard, on each platform active |
  | none active | demo |

  The ids live in `RC_ENTITLEMENT_IDS` and must match the RevenueCat dashboard once
  the project exists. The app user id will be the Supabase account's. Steam has no
  RevenueCat id: our own server will check Steam ownership. Nothing in the game
  imports this file yet, so it is not in the bundle; a test drives it with a fake
  client.

## The service

`getEntitlementService()` builds the service over the local stub (for now) and
keeps the last good answer, in memory and in `nrl-sim-entitlements-cache`. A
failed ask (offline, the store down) answers with that last answer: **a dropped
network never re-locks a player**, even across a reload. A real answer that
changes the tier (a refund) is taken. `snapshot()` gives the last answer at once,
for the week tick, which is synchronous and can't wait on a promise.

## The demo gate (`src/commercial/demo.ts`)

`DEMO = { season: 1, lastWeek: 3 }` (a DECISION). Week n plays round n, so the
demo plays rounds 1 to 3 of season 1 and stops with the club on week 4, its round
unplayed. `lastWeek: 0` is "preseason only": the club can build, sign and set its
lineup, but not play a round.

`demoAllowsAdvance(state, ent)` is false when the flag is on, the club does not
have the full game on this platform, and the week about to be played is past
`DEMO.lastWeek` of season 1 (or a later season).

It covers every way a week moves on:

- **Advance Week** and **fast forward**: one check at the top of `advanceWeek`
  (`src/core/time.ts`), after the held-week check, so a held week (the last demo
  week's live match, a rival round) always finishes; it never stops mid-match.
  `advanceWeeks` stops at the first refused week, so it says so once.
- **The ▾ runs and Keep advancing**: `advanceUntil` (`src/core/advance.ts`) checks
  before each week and stops cleanly (`stop.kind === 'demo'`) before the first
  refused one, after waiting for a held week to end as usual.
- **The asks** (`src/ui/decisions.ts`): at the demo's end, Advance Week and the ▾
  runs skip the "decisions waiting" list and the long-run confirm and go straight to
  the gate, which says the demo is over.

Blocked, the gate emits `commercial:demoEnded { season, week }` on the bus (the ▾
run emits it in place of its "Stopped after…" toast). Task 05 opens the paywall on
it; until then `initCommercial` (flag on only) answers it with a plain `ui:notify`:
"That's the end of the demo."

### Grandfathering

`GRANDFATHER_EXISTING_SAVES` (a DECISION, default `true`): careers already on the
device when the commercial build first runs there keep the full game, with
`source: 'grandfathered'`, so people playing the free web build today don't lose
them.

The save has no creation date, and `src/core/save.ts` is not touched, so on its
first run (before the title screen, so a new game can't count) the commercial
build records, in its own key `nrl-sim-commercial-first-run`:

```json
{ "at": 1767225600000, "slots": [{ "slot": 1, "clubName": "Cavehole Crushers" }] }
```

A slot is grandfathered when it is in that list with the same club. So an existing
career keeps playing, and still does after its own export is imported back into
its slot; a new career started in that slot under another name is in the demo, and
so is a save imported into another slot. (A new career in the same slot under the
very same club name would pass. It can only happen on a device that already had
that career, so it is left alone.)

## Keys this adds (flag on only)

| Key | What |
|---|---|
| `nrl-sim-entitlements-stub` | The stub's tier. Dev only: written by the console hook. |
| `nrl-sim-entitlements-cache` | The service's last good answer. |
| `nrl-sim-commercial-first-run` | The first commercial run on this device and the careers then. |

None of the existing keys (`nrl-sim-save-slot-1..3`, `nrl-sim-save-v1`,
`nrl-sim-save-corrupt`, `nrl-live-match-<slot>`, `nrlsim.iosInstallHintShown`)
changes, and the save format stays v21.

## DECISION (Leon) switches

| Switch | File | Default | What moving it does |
|---|---|---|---|
| `DEMO` | `src/commercial/demo.ts` | `{ season: 1, lastWeek: 3 }` | Where the demo ends. `lastWeek: 0` is preseason only. |
| `GRANDFATHER_EXISTING_SAVES` | `src/commercial/demo.ts` | `true` | `false` puts every career, old or new, in the demo. |
| `CROSS_BUY_INCLUDED` | `src/commercial/entitlements.ts` | `false` | `true` (Option A) makes standard unlock every platform. |
| `RC_ENTITLEMENT_IDS` | `src/commercial/revenuecat.ts` | placeholders | Must match the RevenueCat project's entitlement ids. |

## Out of scope

The paywall and any styled UI, per-country rules (task 05); login, Supabase, the
RevenueCat SDK, Paddle or Stripe, anything on the network; Steam.
