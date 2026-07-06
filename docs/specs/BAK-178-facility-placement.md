# BAK-178 — Build grid-based facility placement system
**Linear:** https://linear.app/bakinglions/issue/BAK-178/build-grid-based-facility-placement-system | **Priority:** Urgent | **Work unit:** WU-8

## Problem
The player needs to build facilities on the club grounds grid (`GRID_W × GRID_H`,
ARCHITECTURE §3). This requires a build menu listing buildable facilities with
cost/footprint, a grid-snapped ghost preview that follows cursor/touch, validation
(bounds, overlap, funds), and a confirm flow that deducts money, appends a
`PlacedFacility` (§4), marks footprint tiles blocked for pathfinding, and renders
the facility sprite at correct iso depth. Existing facilities must also be
tappable to open an upgrade/info popup.

## Proposed solution
Add `PlacementController` (`src/world/placement.ts`) attached to `GroundsScene`,
driving a ghost sprite tinted per-tile via the `tile-highlight-ok` /
`tile-highlight-bad` overlay textures (§7). Add the DOM build menu
(`src/ui/screens/build.ts`) listing `FACILITY_CATALOG` (from `src/data/facility.ts`,
BAK-168). Placement uses the pure `validatePlacement(state, defId, x, y)` function
(also in `placement.ts`, unit-tested) and, on confirm, calls the club helpers
`spendMoney` + `addFacility` (`src/data/club.ts`), emits `facility:placed`, and
blocks footprint tiles in the A* grid (`src/world/path.ts`). `GroundsScene`
subscribes to `facility:placed` and renders `facility-<defId>`.

## Affected files
- Create: `src/world/placement.ts`
- Create: `src/ui/screens/build.ts`
- Modify: `src/scenes/GroundsScene.ts` (render placed facilities, host controller)
- Test: `tests/world/placement.test.ts`

## Key interfaces & behaviour
`src/data/facility.ts` (BAK-168) is authoritative for the catalog. This spec relies
only on the `FacilityDef` shape it exports:
```ts
// from src/data/facility.ts (BAK-168) — referenced, not redefined here:
export type FacilityDefId = 'weightsRoom' | 'scoutOffice' | 'medicalBay' /* ...*/;
export interface FacilityDef {
  id: FacilityDefId; name: string; blurb: string;   // "what it trains" copy
  cost: number;                                       // L1 build cost
  footprint: { w: number; h: number };               // in grid tiles
  trains: Partial<Record<keyof PlayerStats, number>>; // per-week base gains
  upgradeCost: (level: 1 | 2) => number;             // cost L→L+1, max L3
}
export const FACILITY_CATALOG: readonly FacilityDef[];
export function getDef(id: FacilityDefId): FacilityDef;
```
If BAK-168 is not yet merged when implementing, build against this exact interface.

`src/world/placement.ts`:
```ts
export interface PlaceValidation { ok: boolean; reason?: string; }

// Pure — no Phaser. Checks footprint fully inside 0..GRID_W/GRID_H,
// no overlap with existing facilities, money >= def.cost.
export function validatePlacement(
  state: GameState, defId: FacilityDefId, x: number, y: number,
): PlaceValidation;

// Footprint tiles occupied by a placed facility (for overlap + path blocking).
export function footprintTiles(def: FacilityDef, x: number, y: number): { x: number; y: number }[];

export class PlacementController {
  constructor(scene: Phaser.Scene, path: PathGrid);
  enterPlacementMode(defId: FacilityDefId): void;   // spawns ghost sprite
  moveGhost(gx: number, gy: number): void;          // snap + retint ok/bad
  confirm(): PlaceValidation;                        // commits if ok, exits mode
  cancel(): void;                                    // Escape / cancel button
  get active(): boolean;
}
```
Behaviour:
- `validatePlacement` reasons (exact strings): `'out-of-bounds'`, `'overlap'`,
  `'insufficient-funds'`. Bounds fail if `x<0 || y<0 || x+w>GRID_W || y+h>GRID_H`.
  Overlap fails if any footprint tile intersects an existing facility footprint.
- Ghost tint: each footprint tile shows `tile-highlight-ok` if the whole placement
  validates, else `tile-highlight-bad` (all-or-nothing, whole footprint one colour).
- `confirm()`: re-runs `validatePlacement`; if `!ok` returns it and emits
  `ui:notify {text: <human reason>, kind:'danger'}` without mutating state. If ok:
  `club.spendMoney(def.cost, 'build:'+defId)`, `club.addFacility({defId, level:1, x, y})`
  (which pushes a `PlacedFacility` with a fresh instance id), blocks
  `footprintTiles` in the path grid, emits `facility:placed` with the new
  `PlacedFacility`, `ui:notify {kind:'success'}`, then exits placement mode.
- Upgrade/info popup (in `build.ts`): tapping a placed facility opens a DOM popup
  showing name/level/blurb and an **Upgrade** button priced via `def.upgradeCost(level)`,
  disabled at L3 or when unaffordable. Upgrade calls `spendMoney` then increments
  `PlacedFacility.level`, emits `state:changed` (via `setState`) and re-renders.

`src/ui/screens/build.ts`: renders one row per `FACILITY_CATALOG` entry with
name, cost, footprint (`w×h`), and `blurb` ("what it trains"). Rows where
`money < cost` render `disabled` (greyed, non-clickable). Clicking an enabled row
calls `controller.enterPlacementMode(def.id)` and closes the menu.

`GroundsScene` renders each `PlacedFacility` as `facility-<defId>` at iso screen
position from its `(x,y)` origin, depth = `screenY` of the footprint's front tile
(§7), and re-renders on `facility:placed` / `state:changed`.

## Edge cases & risks
- Placement while insufficient funds: rows disabled, but re-check on confirm in
  case funds dropped after menu open (async wages tick) — confirm is source of truth.
- Footprint partially off-grid at the max edge: bounds check uses `x+w`/`y+h` (exclusive).
- Rapid re-entry: `enterPlacementMode` destroys any existing ghost before spawning.
- Upgrade beyond L3 must be impossible (button hidden/disabled; `level` typed `1|2|3`).
- Blocking tiles must be reversible-safe: only add to path grid on successful commit.

## Acceptance criteria
- [ ] Selecting a facility shows a grid-snapped ghost preview that follows the pointer.
- [ ] `validatePlacement` returns `ok:false` with the correct reason for out-of-bounds,
      overlap, and insufficient funds (unit-tested for each).
- [ ] Confirming a valid placement deducts exactly `def.cost`, appends one
      `PlacedFacility`, and emits `facility:placed`.
- [ ] Invalid confirm mutates nothing and emits a `ui:notify danger` with clear text.
- [ ] Footprint tiles are marked blocked in the pathfinding grid after commit.
- [ ] Tapping a placed facility opens an upgrade/info popup; upgrade deducts
      `upgradeCost` and raises level, capped at L3.
- [ ] Unaffordable catalog rows are visibly disabled.

## Out of scope
- Facility definitions/catalog data (BAK-168) and training bonus maths (BAK-180).
- Demolition/relocation of placed facilities.
- Path-grid unblocking (no removal feature this ticket).
