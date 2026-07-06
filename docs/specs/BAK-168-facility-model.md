# BAK-168 — Define Facility data model
**Linear:** https://linear.app/bakinglions/issue/BAK-168/define-facility-data-model | **Priority:** Urgent | **Work unit:** WU-3

## Problem
The grounds-building loop needs a catalog of buildable facilities: their cost,
grid footprint, upgrade scaling, weekly stat-training contribution, special
economic/recruiting effects, and adjacency bonuses. The referenced facilities
design doc **does not exist** (ARCHITECTURE §9) — this spec is authoritative for
all numbers. Runtime placed instances use the `PlacedFacility` type already
defined in ARCHITECTURE §4; this ticket defines only the *static definitions*.

## Proposed solution
Implement `src/data/facility.ts` exporting a `FacilityDefId` union, a `FacilityDef`
interface, a fully-populated `FACILITY_CATALOG`, and pure helpers for upgrade cost
and level scaling. No mutable state, no Phaser. The 12 facilities and their
balanced numbers are fixed in the table below.

## Affected files
- Create: `src/data/facility.ts`
- Test: `tests/data/facility.test.ts`

## Key interfaces & behaviour
```ts
import type { PlayerStats } from '../core/state';

export type FacilityDefId =
  | 'trainingPaddock' | 'weightsRoom' | 'videoRoom' | 'physioCentre'
  | 'canteen' | 'sponsorBoard' | 'grandstand' | 'academy'
  | 'coachsOffice' | 'scoutOffice' | 'medicalBay' | 'teamGym';

export type FacilitySpecial =
  | 'income' | 'gate' | 'recruitQuality' | 'injuryRecovery' | 'morale';

export interface FacilityDef {
  id: FacilityDefId;
  name: string;
  cost: number;                       // build cost at level 1
  footprint: { w: number; h: number };
  trains: Partial<PlayerStats>;       // per-week stat gain at level 1 (pre-scaling)
  special?: FacilitySpecial;          // non-training effect (magnitude read by systems)
  adjacency?: { near: FacilityDefId; bonusMult: number }; // multiplier on this
                                      // facility's trains when placed adjacent
}

export const FACILITY_CATALOG: Record<FacilityDefId, FacilityDef>;

// Level scaling multiplier applied to `trains` (and to special magnitude):
// L1 ×1, L2 ×1.6, L3 ×2.2
export const LEVEL_MULT: readonly [number, number, number]; // [1, 1.6, 2.2]
export function levelMult(level: 1 | 2 | 3): number;         // LEVEL_MULT[level-1]

// Cumulative-ish scaling cost to build/upgrade INTO `level`: cost * level.
// upgradeCost(def, 1)=cost, (def,2)=cost*2, (def,3)=cost*3.
export function upgradeCost(def: FacilityDef, level: 1 | 2 | 3): number;

// Effective per-week trains for a placed facility at a level, adjacency applied
// by caller (training system) when the `adjacency.near` facility is neighbouring.
export function effectiveTrains(
  def: FacilityDef, level: 1 | 2 | 3, adjacencyActive: boolean
): Partial<PlayerStats>;
```
`effectiveTrains` multiplies each `trains` entry by `levelMult(level)` and, when
`adjacencyActive && def.adjacency`, additionally by `def.adjacency.bonusMult`,
rounding each result to 1 decimal place.

### FACILITY_CATALOG — concrete balanced numbers
| id | name | cost | footprint | trains (L1/week) | special | adjacency |
|---|---|---|---|---|---|---|
| trainingPaddock | Training Paddock | 8000 | 2×2 | speed +1.5, stamina +1.0 | — | — |
| weightsRoom | Weights Room | 15000 | 2×2 | strength +2.0 | — | near trainingPaddock ×1.25 (strength) |
| videoRoom | Video Room | 18000 | 2×2 | footyIQ +2.0 | — | near coachsOffice ×1.25 |
| physioCentre | Physio Centre | 22000 | 2×2 | stamina +1.5 | injuryRecovery | near medicalBay ×1.25 (recovery) |
| canteen | Canteen | 12000 | 2×2 | — | morale | — |
| sponsorBoard | Sponsor Board | 10000 | 2×1 | — | income | — |
| grandstand | Grandstand | 120000 | 3×3 | — | gate | — |
| academy | Academy | 60000 | 3×3 | skill +1.0, footyIQ +1.0 | recruitQuality | near coachsOffice ×1.25 |
| coachsOffice | Coach's Office | 30000 | 2×2 | footyIQ +1.0, skill +1.0 | morale | — |
| scoutOffice | Scout Office | 25000 | 2×2 | — | recruitQuality | — |
| medicalBay | Medical Bay | 35000 | 2×2 | — | injuryRecovery | — |
| teamGym | Team Gym | 40000 | 3×3 | strength +1.5, speed +1.0, stamina +1.5 | — | near weightsRoom ×1.2 |

Notes: Grandstand is the most expensive (120k). Costs span 8k–120k as required.
Adjacency rules I define here (authoritative): Weights Room next to Training
Paddock grants +25% strength gains; Physio Centre next to Medical Bay grants +25%
injury recovery; Video Room / Academy next to Coach's Office +25%; Team Gym next to
Weights Room +20%. "Adjacent" = footprints share a grid edge (computed by the
placement/training system, not here — this module only stores the rule).

Special magnitudes (base, before `levelMult`) that systems will read:
- income: +$1,500/week per Sponsor Board.
- gate: +$4,000/week attendance uplift per Grandstand.
- recruitQuality: +0.10 quality bias per facility (Academy/Scout Office).
- injuryRecovery: −0.5 `injuredWeeks` decay accel per Physio/Medical.
- morale: +2 morale/week per Canteen/Coach's Office.
These constants live as named exports in this file (e.g. `SPECIAL_MAGNITUDE`).

## Edge cases & risks
- `LEVEL_MULT` is a fixed 3-tuple; `levelMult`/`upgradeCost` reject out-of-range
  levels at the type level (`1 | 2 | 3`).
- Facilities with no `trains` (e.g. Grandstand) return `{}` from `effectiveTrains`.
- Adjacency multiplier applies only to `trains` for that facility; special
  magnitudes scale by `levelMult`, not adjacency (keep systems simple).
- Rounding to 1 dp keeps weekly gains readable and avoids float drift in tests.

## Acceptance criteria
- [ ] `FACILITY_CATALOG` contains exactly the 12 listed ids with the exact numbers above.
- [ ] Every def is JSON-serialisable and round-trips via `JSON.parse(JSON.stringify(...))`.
- [ ] `upgradeCost(def, level) === def.cost * level` for level 1,2,3.
- [ ] `levelMult` returns 1, 1.6, 2.2 for levels 1,2,3.
- [ ] `effectiveTrains` scales by level and applies adjacency ×mult only when active.
- [ ] Grandstand has the highest `cost` in the catalog; min cost is 8000.

## Out of scope
- Placement/adjacency detection on the grid (WU-8, `src/world/placement.ts`).
- Applying `trains` to squad each week (WU-10, `src/systems/training.ts`).
- Runtime `PlacedFacility` mutation — that type lives in `state.ts` (BAK-172).
