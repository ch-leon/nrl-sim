# BAK-166 — Define Player data model
**Linear:** https://linear.app/bakinglions/issue/BAK-166/define-player-data-model | **Priority:** Urgent | **Work unit:** WU-3

## Problem
The sim needs a canonical, serialisable player representation plus deterministic
generation for the starting squad, rival squads, prospects and free agents. All
downstream systems (training, economy, free agency, match sim) read the `Player`
shape defined in ARCHITECTURE §4. We also need the shared seeded RNG that every
sim/system module must route randomness through (ARCHITECTURE §1.5).

## Proposed solution
Implement the deterministic RNG (`src/utils/rng.ts`), the Aussie/NRL-flavoured
name pools (`src/data/names.ts`), and the player generator + derived helpers
(`src/data/player.ts`). The `Player`, `PlayerStats`, `Position` and `Trait` types
are **already defined in `src/core/state.ts`** (ARCHITECTURE §4) — import them, do
not redefine them. `player.ts` only adds the generator and pure helpers.

## Affected files
- Create: `src/utils/rng.ts`
- Create: `src/data/names.ts`
- Create: `src/data/player.ts`
- Test: `tests/utils/rng.test.ts`
- Test: `tests/data/player.test.ts`

## Key interfaces & behaviour
`src/utils/rng.ts` — mulberry32, returns an RNG object carrying advanceable state:
```ts
export interface Rng {
  next(): number;            // float in [0,1)
  int(min: number, max: number): number;   // inclusive both ends
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];       // returns a new array (Fisher–Yates)
  state(): number;           // current 32-bit state, for persisting into rngSeed
}
export function makeRng(seed: number): Rng;
```
`makeRng` seeds mulberry32 with `seed >>> 0`; `next()` mutates internal state.
`int(min,max)` = `min + floor(next() * (max - min + 1))`. `pick` uses
`arr[int(0, arr.length-1)]` and throws on empty array. `shuffle` copies input,
Fisher–Yates using `int`. `state()` returns the current uint32 so callers can
write it back to `GameState.rngSeed`.

`src/data/names.ts`:
```ts
export const FIRST_NAMES: readonly string[]; // ~40 fictional Aussie first names
export const SURNAMES: readonly string[];    // ~40 fictional surnames
export function randomName(rng: Rng): string; // `${pick(FIRST_NAMES)} ${pick(SURNAMES)}`
```

`src/data/player.ts`:
```ts
import type { Player, Position, PlayerStats, Trait } from '../core/state';
import type { Rng } from '../utils/rng';

export const POSITIONS: readonly Position[]; // the 9 positions from §4

export type Quality = 'rookie' | 'average' | 'star';

export interface GenPlayerOpts {
  age?: number;          // else rng.int(17,36)
  position?: Position;   // else rng.pick(POSITIONS)
  quality?: Quality;     // default 'average'
}

// Weighted mean of the 5 PlayerStats. Weights: skill .25, footyIQ .25,
// speed .2, strength .15, stamina .15. Returns 1-100 (rounded).
export function overallRating(p: Pick<Player, 'stats'>): number;

export function generatePlayer(rng: Rng, opts?: GenPlayerOpts): Player;
```
Stat bands per quality (each stat rolled `rng.int(lo,hi)`, clamped 1..STAT_MAX):
- rookie: 30–55
- average: 45–75
- star: 68–92

Derived fields:
- `id`: `` `p_${rng.state().toString(36)}_${rng.int(0, 1e6)}` `` (deterministic; no `crypto`).
- `morale`: `rng.int(55, 85)`; `injuryRisk`: `rng.int(5, 40)`; `injuredWeeks`: 0.
- `wage`: `Math.round(overallRating * 15 + 100)` per week (star ~1.4k, rookie ~600). Retuned during wave-3 integration: the original ×120 scale made the squad wage bill ~7× total income under BAK-188 economy scales.
- `contractWeeks`: `rng.int(1, 3) * WEEKS_PER_SEASON` (import from `../config`).
- Traits (deduped array): base roll — 25% each independent of `workhorse`,
  `finisher`, `hardMan`, `playmaker`, `injuryProne` (via `rng.next() < 0.15` each).
  Auto-traits: add `youngGun` when `age <= 20 && overallRating >= 60`; add
  `veteran` when `age >= 31`; add `clubLegend` never at generation (assigned later
  by club tenure — out of scope here).

## Edge cases & risks
- All stats clamped to 1..STAT_MAX so bands never overflow.
- `youngGun` and `veteran` are mutually exclusive by age construction; no guard
  needed but tests assert it.
- `shuffle`/`pick` must not mutate their input arrays (pure) — the `readonly`
  signatures enforce this at the type level.
- Determinism: two `makeRng(42)` instances produce identical player sequences —
  this is the core invariant every other system depends on.

## Acceptance criteria
- [ ] `Player` objects created via `generatePlayer` satisfy the §4 `Player` type.
- [ ] `JSON.parse(JSON.stringify(player))` deep-equals the original (no class instances).
- [ ] Every generated stat is within 1..100 across 1000 generations per quality.
- [ ] `overallRating` returns 1..100 and is a weighted mean (test with known stats).
- [ ] `age<=20` high-potential players carry `youngGun`; `age>=31` carry `veteran`.
- [ ] `makeRng(seed)` is deterministic: identical seed → identical player sequence.
- [ ] `rng.int(a,b)` is inclusive at both ends (statistical test over many draws).
- [ ] `rng.shuffle`/`rng.pick` do not mutate inputs.

## Out of scope
- `clubLegend` assignment (tenure-driven, later ticket).
- Persisting `rngSeed` back into `GameState` (handled in `state.ts`, BAK-172).
- Rival squad construction from `RivalClub.strength` (WU-7).
