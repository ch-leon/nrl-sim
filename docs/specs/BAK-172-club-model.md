# BAK-172 — Define Club data model (money, reputation, squad)
**Linear:** https://linear.app/bakinglions/issue/BAK-172/define-club-data-model-money-reputation-squad | **Priority:** Urgent | **Work unit:** WU-3

> ⚠️ **DUPLICATE NOTICE:** BAK-170 is an exact duplicate of this ticket.
> **BAK-172 is canonical; BAK-170 should be cancelled in Linear** (see ARCHITECTURE §9).

## Problem
The player's club (name, money, reputation, squad, owned facilities, season
history) must be modelled, created for a new game, and mutated safely. Per
ARCHITECTURE §1.2 and §4 there is **no separate `Club` class** — the club is
embedded directly in the single serialisable `GameState`. We also need the typed
`EventBus` (§5) and the state store API (§4) that everything else builds on.

## Proposed solution
Implement three files: `src/core/events.ts` (tiny typed emitter + `bus`),
`src/core/state.ts` (the `GameState` type from §4, the store, `createNewGame`,
`resetForNewSeason`), and `src/data/club.ts` (pure-ish helpers that mutate state
via the store and emit bus events). Reuse `generatePlayer`/`makeRng` (BAK-166) and
`FACILITY_CATALOG`/`upgradeCost` (BAK-168).

## Affected files
- Create: `src/core/events.ts`
- Create: `src/core/state.ts`
- Create: `src/data/club.ts`
- Test: `tests/core/events.test.ts`
- Test: `tests/core/state.test.ts`
- Test: `tests/data/club.test.ts`

## Key interfaces & behaviour
`src/core/events.ts` — typed emitter, **no Phaser import**:
```ts
export interface Events { /* exactly the map from ARCHITECTURE §5 */ }
export type EventName = keyof Events;
export class EventEmitter {
  on<K extends EventName>(k: K, fn: (p: Events[K]) => void): () => void; // returns off()
  off<K extends EventName>(k: K, fn: (p: Events[K]) => void): void;
  emit<K extends EventName>(k: K, payload: Events[K]): void;
  clear(): void; // test helper: remove all listeners
}
export const bus: EventEmitter;
```
Listeners stored in a `Map<EventName, Set<fn>>`. `emit` iterates a snapshot copy
of the set so handlers may `off` themselves during dispatch. `on` returns an
unsubscribe closure.

`src/core/state.ts` — the store (module-singleton around one `GameState`):
```ts
export type { Position, Trait, PlayerStats, Player, PlacedFacility,
  LadderRow, Fixture, LeagueState, RivalClub, GameState } from '...'; // §4 shapes
export function getState(): GameState;                 // throws if not initialised
export function setState(patch: Partial<GameState>): void; // shallow-merge; emits 'state:changed'
export function loadState(state: GameState): void;     // replace whole state (used by save.ts)
export function createNewGame(clubName: string, seed?: number): GameState;
export function resetForNewSeason(): void;
```
`createNewGame(clubName, seed = Date.now() >>> 0)`:
- `rng = makeRng(seed)`.
- `squad`: 20 players via `generatePlayer(rng)` — mix qualities by rolling
  quality (`rng`-driven): ~3 star, ~10 average, ~7 rookie (bias with `rng.int`).
- `money = STARTING_MONEY`, `reputation = 30`, `week = 1`, `season = 1`.
- `facilities: []`.
- `freeAgents`: 12 players via `generatePlayer(rng)`.
- `league`: minimal valid `LeagueState` (`clubs: []`, `fixtures: []`, `ladder: []`)
  — populated later by WU-7; must still be a valid object here.
- `settings: { muted: false, volume: 0.8, tutorialDone: false }`, `history: []`.
- `version: 1`, `clubId: 'player'`, `rngSeed: rng.state()`.
- Calls `loadState(result)` then returns it.

`resetForNewSeason()`: increments `season`, sets `week = 1`, and pushes a
`history` entry stub if applicable — **actual per-system rollover (ageing,
contracts, fixtures) is driven by the `season:ended` hook registry in `time.ts`
(BAK-176), not here.** This function only bumps the counters and persists via
`setState`.

`src/data/club.ts` — squad & facility & money helpers (operate on `getState()`):
```ts
export function addPlayer(p: Player): boolean;   // false if squad at SQUAD_CAP
export function removePlayer(playerId: string): boolean; // false if at SQUAD_MIN or not found
export function addFacility(defId: FacilityDefId, x: number, y: number,
  level?: 1 | 2 | 3): PlacedFacility | null; // null if placement invalid
export function spendMoney(amount: number, reason: string): boolean; // false if money < amount
export function earnMoney(amount: number, reason: string): void;
```
Behaviour:
- `addPlayer`: reject when `squad.length >= SQUAD_CAP`; else push, `setState`,
  emit `player:signed`.
- `removePlayer`: reject when `squad.length <= SQUAD_MIN` or id absent; else remove.
- `addFacility(defId,x,y,level=1)`: validate `0 <= x`, `0 <= y`, footprint within
  `GRID_W/GRID_H`; construct `PlacedFacility` (`id` = seeded via state rng),
  push, `setState`, emit `facility:placed`. Returns the instance or `null`.
  (Overlap/adjacency checks belong to WU-8 placement controller — out of scope.)
- `spendMoney`: if `money < amount` return `false` (no mutation); else
  `setState({ money: money - amount })` and emit `money:changed`
  `{ delta: -amount, reason, balance }`. Returns `true`.
- `earnMoney`: `setState({ money: money + amount })`, emit `money:changed`
  `{ delta: +amount, reason, balance }`.

## Edge cases & risks
- Store must throw a clear error if `getState()` is called before init — prevents
  silent `undefined` state in tests.
- `setState` shallow-merges; nested objects (`league`, `settings`) are replaced
  wholesale by callers, not deep-merged — document this to avoid partial-update bugs.
- Emitting `state:changed` on every `setState` can fan out; helpers emit their
  specific event *in addition* (money/player/facility) so subscribers can choose.
- `removePlayer` at exactly `SQUAD_MIN` must fail (boundary), tested explicitly.
- IDs for placed facilities derive from the seeded rng advanced in state to stay
  deterministic across save/load.

## Acceptance criteria
- [ ] `createNewGame('Cavehole Crushers')` yields 20 squad players, 12 free agents,
      money = STARTING_MONEY, reputation = 30, week 1, season 1, empty facilities.
- [ ] `GameState` round-trips via JSON with no data loss (no class instances anywhere).
- [ ] `addPlayer` succeeds under cap, fails at `SQUAD_CAP`, emits `player:signed`.
- [ ] `removePlayer` fails at `SQUAD_MIN` and for unknown ids, else succeeds.
- [ ] `addFacility` places within grid bounds, emits `facility:placed`, returns instance.
- [ ] `spendMoney` returns false and leaves money unchanged when insufficient;
      otherwise deducts and emits `money:changed` with correct `balance`/`delta`.
- [ ] `earnMoney` credits and emits `money:changed`.
- [ ] `bus.on` returns a working unsubscribe; `emit` tolerates handlers that `off`
      themselves mid-dispatch.

## Out of scope
- Facility overlap/adjacency validation (WU-8).
- Rival clubs, fixtures, ladder population (WU-7).
- Persistence to localStorage (BAK-174) and tick pipeline (BAK-176).
- `clubLegend` tenure logic.
