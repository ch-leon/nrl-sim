# NRL Sim — Architecture & Conventions

> Kairosoft-style pixel-art NRL rugby league management sim. Browser game.
> Stack: **Vite + TypeScript (strict) + Phaser 3**, **Vitest** for headless logic tests.
> This document is the single source of truth for shared interfaces, file ownership,
> and conventions. Every ticket spec and every implementer builds against this.

## 1. Core principles

1. **Simulation is pure TypeScript.** Nothing under `src/sim/`, `src/data/`, or
   `src/systems/` may import Phaser. All game logic is headless and unit-testable
   with Vitest. Phaser scenes are *views* that render state and emit intents.
2. **Single serialisable state object.** All persistent game state lives in one
   plain-JSON-serialisable `GameState` object (see §4). No class instances in state.
3. **Typed event bus.** Systems communicate via a single typed `EventBus`
   (see §5). Scenes/UI subscribe; systems publish. No direct scene→system calls
   other than through exported system functions.
4. **Generated pixel art.** No binary assets in the repo. All textures are
   painted pixel-by-pixel into a `PixelBuffer` (`src/art/pixel.ts`: palette
   sprite grids, hard-edged polygons, deterministic `noise2`/`bayer` dither) and
   uploaded once with `toTexture`. Generators are pure (unit-tested in node) and
   live under `src/art/grounds/` and `src/art/match/`. Eyeball changes with
   `npx vite-node scripts/art-preview.ts <module> <out.png> <scale>`. Art never
   uses `Math.random`. Texture keys (see §7) are the swap point if hand-drawn
   art ever replaces them.
5. **Deterministic RNG.** All randomness in sim/systems goes through the seeded
   RNG in `src/utils/rng.ts` (mulberry32). UI-only cosmetic randomness may use
   `Math.random`.
6. **DOM overlay UI.** Menus, HUD, panels and screens are HTML/CSS in a `#ui-root`
   overlay div (decision for BAK-163, applies everywhere). Phaser canvas renders
   the world; DOM renders UI. Pixel styling via CSS (`image-rendering: pixelated`,
   monospace pixel font, chunky borders). Helpers in `src/ui/dom.ts`.

## 2. Directory layout & file ownership

```
src/
  main.ts                    # boot Phaser + register scenes + wire UI (ORCHESTRATOR-OWNED)
  config.ts                  # game constants (grid size, tile size, econ tuning)
  core/
    events.ts                # EventBus + typed event names          (WU-3)
    state.ts                 # GameState type, createNewGame(), store accessors (WU-3)
    save.ts                  # SaveManager: localStorage persistence  (WU-4)
    time.ts                  # TimeSystem: week/season tick pipeline  (WU-4)
  data/
    player.ts                # Player model + generator               (WU-3 / BAK-166)
    facility.ts              # Facility defs + catalog                (WU-3 / BAK-168)
    club.ts                  # Club model helpers                     (WU-3 / BAK-172)
    league.ts                # 16 fictional clubs, names data         (WU-7 / BAK-184)
    names.ts                 # player/club name pools                 (WU-3)
  systems/
    fixtures.ts              # fixture generation, ladder             (WU-7 / BAK-184)
    economy.ts               # wages, sponsors, gate receipts         (WU-10 / BAK-188)
    training.ts              # weekly stat gains, adjacency           (WU-10 / BAK-180)
    freeagency.ts            # free agent pool gen/refresh, signing   (WU-9 / BAK-179)
  sim/
    engine.ts                # simulateMatch() core                   (WU-6 / BAK-191)
    events.ts                # MatchEvent types + MatchResult         (WU-6)
    weather.ts               # weather + momentum modifiers           (WU-6 / BAK-198)
    commentary.ts            # event → commentary text templates      (WU-12 / BAK-196)
  scenes/
    BootScene.ts             # texture generation, then start scenes  (WU-2)
    GroundsScene.ts          # isometric club grounds                 (WU-2, extended WU-8)
    MatchScene.ts            # isometric match field + playback       (WU-11, extended WU-12)
  world/
    iso.ts                   # iso math: grid<->screen, depth         (WU-2)
    camera.ts                # pan/zoom controller                    (WU-2 / BAK-159)
    path.ts                  # A* grid pathfinding                    (WU-2 / BAK-161)
    placement.ts             # facility placement controller          (WU-8 / BAK-178)
    playback.ts              # match event timeline -> sprite anims   (WU-12 / BAK-194)
  ui/
    dom.ts                   # DOM helpers: panel(), button(), mount  (WU-5)
    hud.ts                   # money/week/season HUD                  (WU-5 / BAK-163)
    nav.ts                   # bottom nav bar; screens register here via main.ts (WU-5)
    screens/
      squad.ts               # squad list screen                      (WU-9)
      recruit.ts             # free agency screen                     (WU-9 / BAK-179)
      fixtures.ts            # fixtures + ladder screens              (WU-7 / BAK-184)
      build.ts               # facility build menu                    (WU-8 / BAK-178)
      matchOverlay.ts        # scoreboard/stats/commentary overlay    (WU-12 / BAK-196)
    tutorial.ts              # onboarding flow                        (WU-15 / BAK-202)
  fx/
    audio.ts                 # WebAudio-synthesised SFX + music       (WU-13 / BAK-200)
    particles.ts             # particle effect helpers                (WU-14 / BAK-201)
  utils/
    rng.ts                   # mulberry32 seeded RNG                  (WU-3)
tests/                       # Vitest specs mirroring src/ paths
docs/specs/                  # per-ticket technical specs
```

**Ownership rule:** an implementer may create/modify only files owned by its work
unit, plus its tests. `main.ts` and cross-cutting wiring are integrated by the
orchestrator between waves. If you believe you must touch a file you don't own,
STOP and report BLOCKED.

## 3. Constants (src/config.ts)

```ts
export const GRID_W = 20;            // club grounds grid (tiles)
export const GRID_H = 20;
export const TILE_W = 64;            // iso tile screen width (2:1 diamond)
export const TILE_H = 32;
export const SEASON_ROUNDS = 24;     // home & away vs 15 rivals + repeats
export const FINALS_WEEKS = 3;       // weeks 25-27 if qualified
export const WEEKS_PER_SEASON = SEASON_ROUNDS + FINALS_WEEKS;
export const SQUAD_CAP = 30;
export const SQUAD_MIN = 13;         // cannot play a match below this
export const STARTING_MONEY = 200_000;
export const STAT_MAX = 100;
```

## 4. GameState (src/core/state.ts)

```ts
export type Position =
  | 'fullback' | 'winger' | 'centre' | 'five-eighth' | 'halfback'
  | 'hooker' | 'prop' | 'second-row' | 'lock';

export type Trait =
  | 'workhorse' | 'finisher' | 'hardMan' | 'playmaker'
  | 'injuryProne' | 'clubLegend' | 'youngGun' | 'veteran';

export interface PlayerStats {
  speed: number; strength: number; stamina: number;
  skill: number; footyIQ: number;               // 1-100
}

export interface Player {
  id: string;                 // crypto-random or seeded uuid
  name: string;
  age: number;                // 17-36
  position: Position;
  stats: PlayerStats;
  morale: number;             // 1-100
  injuryRisk: number;         // 1-100
  injuredWeeks: number;       // 0 = fit
  traits: Trait[];
  wage: number;               // per week
  contractWeeks: number;      // remaining
}

export interface PlacedFacility {
  id: string;                 // instance id
  defId: FacilityDefId;       // catalog key, e.g. 'weightsRoom'
  level: 1 | 2 | 3;
  x: number; y: number;       // grid origin (top-left of footprint)
}

export interface LadderRow {
  clubId: string; played: number; wins: number; draws: number; losses: number;
  pointsFor: number; pointsAgainst: number; points: number; // 2 win / 1 draw
}

export interface Fixture {
  round: number;              // 1..SEASON_ROUNDS (+ finals rounds)
  homeId: string; awayId: string;
  result?: { homeScore: number; awayScore: number };
}

export interface LeagueState {
  clubs: RivalClub[];         // 15 rivals + player club entry
  fixtures: Fixture[];
  ladder: LadderRow[];
}

export interface RivalClub {
  id: string; name: string; colors: [string, string]; // hex kit colours
  strength: number;           // 1-100 baseline used to derive rival squads
}

export interface GameState {
  version: 1;
  clubId: 'player';
  clubName: string;
  money: number;
  reputation: number;         // 1-100, drives attendance & sponsors
  week: number;               // 1..WEEKS_PER_SEASON
  season: number;             // starts at 1
  squad: Player[];
  facilities: PlacedFacility[];
  freeAgents: Player[];
  league: LeagueState;
  weather?: WeatherKind;      // set for current round by fixtures system
  settings: { muted: boolean; volume: number; tutorialDone: boolean };
  history: { season: number; ladderPosition: number; premiership: boolean }[];
  rngSeed: number;            // advanced state of the seeded RNG
}
```

Store API (WU-3): `getState(): GameState`, `setState(patch)`, `newGame(clubName, seed?)`,
`resetForNewSeason()`. `setState` publishes `state:changed`.

## 5. EventBus (src/core/events.ts)

`export const bus = new EventEmitter()` (tiny custom typed emitter, no Phaser import).

```ts
export interface Events {
  'state:changed': GameState;
  'week:advanced': { week: number; season: number };
  'season:ended': { season: number; ladderPosition: number; premiership: boolean };
  'money:changed': { delta: number; reason: string; balance: number };
  'facility:placed': PlacedFacility;
  'player:signed': Player;
  'match:started': { fixture: Fixture; sim: MatchResult };
  'match:event': MatchEvent;          // re-emitted during playback pacing
  'match:finished': { fixture: Fixture; result: MatchResult };
  'bankruptcy:warning': { balance: number };
  'ui:notify': { text: string; kind: 'info' | 'success' | 'danger' };
}
```

Week tick pipeline order (WU-4, fixed): 1) training gains → 2) injuries tick →
3) economy (wages, income) → 4) match of the round (auto-sim or hand off to
MatchScene) → 5) ladder update → 6) free agent pool refresh (every 4 weeks) →
7) autosave → 8) emit `week:advanced`.

## 6. Match simulation contract (src/sim/)

```ts
export type WeatherKind = 'clear' | 'rain' | 'wind';

export interface TeamSheet {                 // built from squad or rival strength
  clubId: string; name: string;
  attack: number; defense: number; kicking: number; fitness: number; // 1-100 aggregates
  colors: [string, string];
}

export type MatchEventKind =
  | 'kickoff' | 'set-start' | 'run' | 'break' | 'tackle' | 'big-hit'
  | 'error' | 'penalty' | 'try' | 'conversion' | 'penalty-goal'
  | 'field-goal' | 'half-time' | 'full-time';

export interface MatchEvent {
  t: number;                   // match minute 0-80
  kind: MatchEventKind;
  teamId: string;              // acting team
  player?: string;             // display name
  x?: number; y?: number;      // field position 0-100 (length), 0-100 (width)
  detail?: string;
}

export interface MatchResult {
  homeScore: number; awayScore: number;
  events: MatchEvent[];
  stats: { possession: [number, number]; tackles: [number, number];
           errors: [number, number]; tries: [number, number] };
  weather: WeatherKind;
  momentumTimeline: { t: number; value: number }[]; // -100 (away) .. +100 (home)
}

export function simulateMatch(home: TeamSheet, away: TeamSheet,
  opts: { seed: number; weather?: WeatherKind }): MatchResult;
```

`simulateMatch` must be synchronous, < 50ms, and fully deterministic per seed.

## 7. Rendering conventions

- Phaser config: `pixelArt: true`, `roundPixels: true`, FIT scale mode, background `#1a1a2e`.
- Iso projection (src/world/iso.ts): `screenX = (gx - gy) * TILE_W/2`,
  `screenY = (gx + gy) * TILE_H/2`; depth = `screenY` (+1 for objects on tile).
- Texture keys generated in BootScene: `tile-grass`, `tile-dirt`, `tile-path`,
  `tile-highlight-ok`, `tile-highlight-bad`, `char-idle-<dir>`, `char-walk-<dir>-<frame>`
  (dirs: n/e/s/w), `facility-<defId>` (footprint-sized diamond blocks),
  `field-tile`, `field-line`, `ball`, `particle-square`.
- Scene keys: `'Boot'`, `'Grounds'`, `'Match'`. Only one world scene active at a time;
  switch via `this.scene.start(...)`. UI overlay is DOM and persists across scenes.

## 8. Testing & quality gates

- Vitest, `npm test` runs all specs under `tests/`. Pure logic (data models, systems,
  sim) MUST have unit tests. Scenes/UI are excluded from unit tests (manual/preview QA).
- `npm run build` (tsc + vite build) must pass with zero TS errors — strict mode.
- No `any` unless interfacing with Phaser types that require it; justify with comment.
- Conventional commits: `feat(BAK-XXX): ...`, one commit per ticket minimum.

## 9. Known constraints

- Design docs referenced by tickets (`~/Desktop/NRL-Sim/docs/`) are NOT available;
  where a ticket defers to them (facility bonus tables, adjacency rules, club names)
  this document and the ticket spec are authoritative.
- BAK-170 duplicates BAK-172 — BAK-172 is canonical.
- BAK-205 (monetisation) is blocked on a business decision; not implemented.
