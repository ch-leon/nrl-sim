# BAK-180 — Implement training stat gains over time
**Linear:** https://linear.app/bakinglions/issue/BAK-180/implement-training-stat-gains-over-time | **Priority:** High | **Work unit:** WU-10

## Problem
Owning facilities should improve players week over week. Each week tick must apply
per-facility stat bonuses to every squad player, scaled by facility level,
orthogonal adjacency bonuses, the player's age-development curve, relevant traits,
and injury status; stats cap at `STAT_MAX` (100) and floor at 1. Veterans should
plateau then decline. This is the first tick-pipeline stage (training gains, order
10, ARCHITECTURE §5), which also owns the injuries tick (order 20).

## Proposed solution
Add `src/systems/training.ts` with a pure `applyTraining(state, rng?)` (order 10)
and `applyInjuries(state)` (order 20). The data source for what each facility
trains is `FACILITY_CATALOG` from `src/data/facility.ts` (BAK-168): each
`FacilityDef.trains` maps `keyof PlayerStats → base weekly gain`. Effective gain =
`base × levelMult × adjacencyMult × ageMod × traitMod × injuryMod`. Gains are
fractional and accumulate on the numeric stat; UI rounds for display. All maths are
deterministic and unit-tested against seeded state.

## Affected files
- Create: `src/systems/training.ts`
- Test: `tests/systems/training.test.ts`

## Key interfaces & behaviour
Relies on `FacilityDef` from `src/data/facility.ts` (BAK-168):
```ts
// trains: Partial<Record<keyof PlayerStats, number>> — base weekly gain per stat.
```
If BAK-168 is unmerged, implement against that exact `FacilityDef` shape.

`src/systems/training.ts`:
```ts
import type { GameState, Player, PlacedFacility } from '../core/state';
import { STAT_MAX } from '../config';

export const STAT_FLOOR = 1;

// Level multiplier for a facility: L1 ×1.0, L2 ×1.6, L3 ×2.4.
export function levelMult(level: 1 | 2 | 3): number;

// Age-based development modifier applied to all gains.
//  age<=21 → 1.5 ; 22-27 → 1.0 ; 28-30 → 0.6 ; 31+ → 0.25
export function ageMod(age: number): number;

// Count of facilities orthogonally adjacent to `f` (footprints touching N/E/S/W).
// Adjacency multiplier = 1 + 0.1 × adjacentCount (capped at 1.4).
export function adjacencyMult(f: PlacedFacility, all: PlacedFacility[]): number;

// Trait multiplier: workhorse ×1.2 and youngGun ×1.3 stack multiplicatively;
// others ×1.0.
export function traitMult(player: Player): number;

// Injury multiplier: injuredWeeks>0 → 0.3 else 1.0.
export function injuryMult(player: Player): number;

// Tick hook order 10: apply one week of training to every squad player.
export function applyTraining(state: GameState): GameState;

// Tick hook order 20: decrement injuredWeeks; Medical Bay / Physio accelerate.
export function applyInjuries(state: GameState): GameState;
```
Behaviour of `applyTraining` (per squad player, per stat):
1. Sum contributions across all built facilities:
   `gain += def.trains[stat] × levelMult(pf.level) × adjacencyMult(pf, facilities)`
   for each `PlacedFacility pf` (resolve `def` via `getDef(pf.defId)`).
2. Multiply the summed gain by `ageMod(age) × traitMult(player) × injuryMult(player)`.
3. **Veteran decline:** if `age >= 31`, additionally subtract `0.3` flat per week
   from `speed` and `stamina` (applied after gains, before clamp).
4. Clamp every stat to `[STAT_FLOOR, STAT_MAX]`. Stats stay fractional in state.
   (Display rounding lives in UI, not here.)

Behaviour of `applyInjuries` (per squad player with `injuredWeeks > 0`):
- Base recovery = 1 week per tick. If a `medicalBay` facility is built, add its
  level as extra weeks recovered; if a `physio` facility is built, add 1 extra.
  `injuredWeeks = max(0, injuredWeeks − recovery)`.
- Recovery uses facility presence/level only (deterministic; no RNG here).

Both functions mutate and return `state`; `applyTraining` runs strictly before
`applyInjuries` in the pipeline so an injured player trains at ×0.3 *this* week and
recovers *after*.

## Edge cases & risks
- No facilities built → zero gains, but veteran decline still applies (stats can drop).
- Stat already at 100 → clamp; further gain lost (no overflow banking).
- Adjacency is symmetric but computed independently per facility; cap prevents
  runaway stacking in dense builds.
- `medicalBay`/`physio` defIds must match BAK-168 catalog keys exactly; if renamed,
  update the string literals here (single source: `getDef`).
- Fractional stats must never be rounded in state or determinism/regression breaks.

## Acceptance criteria
- [ ] After N seeded weeks with a stat-training facility, the trained stats increase
      by the computed deterministic amount (exact-value test).
- [ ] Two orthogonally-adjacent facilities yield a higher gain than the same two
      placed non-adjacent (adjacency test).
- [ ] `ageMod` returns 1.5 / 1.0 / 0.6 / 0.25 for ages 21 / 25 / 29 / 33.
- [ ] Players aged 31+ lose speed and stamina by 0.3/week net of gains.
- [ ] `workhorse` + `youngGun` stack to ×1.56 trait multiplier.
- [ ] Injured players gain at ×0.3; `injuredWeeks` decrements after training, faster
      with Medical Bay / Physio.
- [ ] All stats stay within `[1, 100]` across many weeks.

## Out of scope
- Facility catalog data and `trains` values (BAK-168).
- Generating new injuries (occurs in match sim / injuries source, not here — this
  ticket only recovers existing `injuredWeeks`).
- Morale changes from training.
