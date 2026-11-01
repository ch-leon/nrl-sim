# NRL Sim — Architecture & Conventions

> Kairosoft-style pixel-art NRL rugby league management sim. Browser game.
> Stack: **Vite + TypeScript (strict) + Phaser 3**, **Vitest** for headless logic tests.
> This document covers the shared interfaces and conventions. Where it summarises a
> source file, the source file wins.

## 1. Core principles

1. **Simulation is pure TypeScript.** Nothing under `src/sim/`, `src/data/`,
   `src/systems/`, `src/core/` or `src/match/{core,league}/` may import Phaser. All
   game logic is headless and unit-testable with Vitest. Phaser scenes are *views*
   that render state and emit intents.
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
   overlay div. Phaser canvas renders the world; DOM renders UI. The look is
   "Broadcast Quiet" (`docs/specs/ui-broadcast-quiet.md`): navy sheets over the
   always-visible grounds or pitch, one dock at the bottom as the only navigation,
   Barlow Condensed for labels, IBM Plex Sans for text, IBM Plex Mono for numbers
   (self-hosted, `src/ui/fonts.ts`), one yellow primary action a screen. The
   world's art stays pixel art (`image-rendering: pixelated`). Tokens and helpers
   in `src/ui/dom.ts`.

## 2. Directory layout

```
src/
  main.ts                  # boot Phaser, register scenes and systems, wire the UI
  config.ts                # game constants (§3); league values come from the content pack
  brand.ts, brandBuild.ts  # the game's name, colours and logo; what the build writes (#363)
  content/                 # the league/locale content pack (pack.ts, au.ts; #361)
  commercial/              # demo gate, entitlements, paywall rules; behind the off-by-default
                           #   `commercial` flag (flags.ts, #362)
  labs/                    # Labs: browser-local experiments, hidden and off by default
  core/
    state.ts               # GameState, SAVE_VERSION, createNewGame, the store (§4)
    save.ts                # SaveManager and MIGRATIONS
    storage/               # SaveStore seam: local, memory, save meta, conflict rules (#360)
    storageKeys.ts         # every browser-storage key
    events.ts              # the typed EventBus (§5)
    time.ts                # week/season tick pipeline (§5)
    advance.ts, advanceRules.ts  # the multi-week advance and its stop rules
  data/                    # player, facility, club, league, names, events (cards), traits
  systems/                 # headless game systems: economy, training, fixtures, league,
                           #   matchday, lineup, rivals, rivalRound, matchJobs/matchWorker,
                           #   freeagency, contracts, aging, youth, morale, board, staff,
                           #   events, suspension, undo, liveMatchRecord, …
  match/                   # the match sim (BAK-207), §6
    core/                  # sport-neutral: fixed-step engine, bodies, ball, field, snapshots
    league/                # rugby league (Nines): rules, roles, tactics, traits, fatigue,
                           #   sheets.ts, match.ts (runMatch), tuning.ts (knobs by name)
      live.ts              # entry: LiveSim, the per-tick step over the modules below
      live/                # LiveSim's layers, each extending the one before:
        types.ts           #   player, phase and option types, shared text
        knobs.ts           #   LIVE, the live sim's tuning knobs
        base.ts            #   LiveBase: state, construction, kick-off set-up, helpers
        calls.ts           #   coach calls, plan changes at the breaks, the AI coach
        clock.ts           #   match clock, halves, golden point, interchanges
        kicks.ts           #   kicks in flight, landings, contests, kick-off restarts
        play.ts            #   the carrier's choices: run, pass, kick; the tackle
        restarts.ts        #   play-the-ball, tries, touch and dead ball, set pieces
        penalties.ts       #   penalties, sin bins, goal kicks and field goals
        contact.ts         #   passing, the tackle contest, the wrestle, scoring
        positioning.ts     #   attack options, defensive targets, movement, legs
    view/                  # LivePlayback and the drawn layers (§6), commentary, replay
    lab/                   # /#lab dev page: teams/seed, play/pause/step/scrub, Flag
    balance/               # balance harness: plans, measures, reports (balance/README.md)
  sim/                     # MatchEvent / MatchResult types, weather
  scenes/                  # BootScene, GroundsScene, MatchScene (+ art and life helpers)
  world/                   # iso math, camera, A* paths, placement, build feedback, readability
  art/                     # pixel generators: grounds/, match/, portraits, app icon
  ui/                      # DOM UI: dom, tokens, hud, nav, title, toasts, tutorial, guide/,
                           #   screens/ (squad, lineup, recruit, contracts, finance, …)
  fx/                      # audio, particles, atmosphere, PWA
  qa/soak.ts               # headless multi-season soak (npm run soak)
  utils/                   # rng, hash, …
  vendor/phaser-slim.js    # the Phaser the production build ships (#400)
scripts/
  e2e-season.mjs           # Chromium playthrough of a season (dumps the save corpus)
  e2e-perf.mjs             # phone performance budget (perf-budget.json)
  e2e-webkit.mjs           # WebKit layout/portrait checks; GROUPS maps sections to CI shards
  e2e-webkit/              # the sections, by shard: match/, text/, screens/, portrait/
                           #   (common.mjs: sizes, server, logging)
  balance.ts               # the balance harness runner (npm run balance)
tests/                     # Vitest specs mirroring src/; tests/qa/ (corpus, soak);
                           #   tests/fixtures/saves/ (the save corpus, §4)
docs/specs/                # per-ticket technical specs
docs/hub/                  # project hub: overview, features, roadmap
```

## 3. Constants (src/config.ts)

League-shaped values come from the active content pack (`src/content/au.ts`); these
are the AU pack's.

```ts
export const GRID_W = 20;            // club grounds grid (tiles)
export const GRID_H = 20;
export const TILE_W = 64;            // iso tile screen width (2:1 diamond)
export const TILE_H = 32;
export const SEASON_ROUNDS = 24;     // home & away vs 15 rivals + repeats
export const FINALS_WEEKS = 3;       // weeks 25-27 if qualified
export const WEEKS_PER_SEASON = SEASON_ROUNDS + FINALS_WEEKS;
export const SQUAD_CAP = 30;
export const SQUAD_MIN = 13;         // fewer fit than this → the player's match is forfeited
export const FORFEIT_SCORE = 24;     // forfeit scoreline is 0–24 to the opponent
export const RETIRE_SOFT_AGE = 34;   // retirement chance ramps 20%/yr from here…
export const RETIRE_HARD_AGE = 38;   // …to certain retirement at this age
export const ON_FIELD = 9;           // Nines trial (BAK-206 / GitHub #1)
export const SET_TACKLES = 5;        // tackles per set before last-tackle kick
export const STARTING_MONEY = 200_000;
export const STAT_MAX = 100;
```

## 4. GameState (src/core/state.ts)

`src/core/state.ts` is the source for every type below; read it for the fields'
shapes and comments. `GameState`'s fields:

| Field | What it holds |
|---|---|
| `version` | `SAVE_VERSION` |
| `clubId`, `clubName` | always `'player'`; the club's name |
| `money`, `reputation` | balance; 1–100, drives crowds and sponsors |
| `week`, `season` | 1..`WEEKS_PER_SEASON`; from 1 |
| `squad`, `freeAgents` | `Player[]` (stats, traits, wage, contract, injuries, career tallies) |
| `facilities` | placed facilities (`defId`, level 1–3, grid origin) |
| `league` | rival clubs (each with its own `squad`), fixtures, ladder |
| `weather?` | this round's weather |
| `settings` | sound, tutorial, difficulty, coach calls, live rivals, speed, key moments, week summary, hints, text size, team letters |
| `history` | one `SeasonRecord` per finished season (with its review) |
| `boardPatience`, `objectives`, `sacked?` | the board (#47) |
| `eventDeck` | random event cards, cooldowns, modifiers, own RNG stream (#75) |
| `kit?` | the player's kit design (#79) |
| `finance` | the books by season and line (#172) |
| `lineup` | the nine by slot, bench, rotation, tactics, kicker, captain (#69, N11) |
| `training` | the squad's training focus (N11) |
| `boardLoan` | renewals the board advanced in debt (N14.3) |
| `staff` | hires, one per role at most (N14.5) |
| `potmTally?` | player-of-the-match awards this season (#190) |
| `rngSeed` | advanced state of the seeded RNG |

Store API: `getState()`, `setState(patch)` (publishes `state:changed`),
`createNewGame(clubName, seed?, { difficulty? })`, `resetForNewSeason()`.

League parity (N5, #140): a new game on Normal starts the player's best nine level
with the rival mean (`LEAGUE.MEAN`, 55 in the AU pack), not above it.

**Save versions.** `SAVE_VERSION` is **21**. Any change to `GameState`'s shape:

1. Bump `SAVE_VERSION` in `state.ts` and update `GameState` and `createNewGame`.
2. Append one step to `MIGRATIONS` in `src/core/save.ts`, `{ from: N, to: N+1, run }`:
   pure, returns a new object with the new fields defaulted, never deletes user data.
   Saves load through every step from their version up; a save newer than
   `SAVE_VERSION` is refused, not touched.
3. Add a test that a vN save migrates with the defaults filled.

The save corpus (`tests/fixtures/saves/`, rules in its `README.md`) holds real saves
from the phone playthrough, `v<version>-<point>.json`, today v9–v19. Never edit one;
when the version moves, add the new version's dumps. `tests/qa/corpus.test.ts` checks
that every one migrates to `SAVE_VERSION`, passes the soak's invariants and plays on.

## 5. EventBus (src/core/events.ts)

`export const bus = new EventEmitter()` (tiny custom typed emitter, no Phaser import).

```ts
export interface Events {
  'state:changed': GameState;
  'week:advanced': { week: number; season: number };
  'season:ended': { season: number; ladderPosition: number; premiership: boolean };
  'money:changed': { delta: number; reason: string; balance: number };
  'facility:placed': PlacedFacility;
  'facility:removed': { facility: PlacedFacility; undo: boolean }; // a build taken back by the Undo (#370)
  'player:signed': Player;
  'player:unsigned': { player: Player }; // a signing taken back by the Undo (#370)
  'match:started': { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData }; // no result until full time
  'match:event': MatchEvent;          // re-emitted during playback pacing
  'match:finished': { fixture: Fixture; result: MatchResult };
  'match:parked': { tick: number }; // Save & exit: the week stays held; Advance Week resumes the match
  'board:sacked': { season: number; reason: string };
  'bankruptcy:warning': { balance: number; forcedSales?: string[] }; // after the week's forced sales (N12.5)
  'ui:notify': { text: string; kind: 'info' | 'success' | 'danger'; quiet?: boolean; match?: boolean; ms?: number;
                 action?: { label: string; run: () => void; enabled?: () => boolean } }; // action: the 5s Undo (#370)
  'commercial:demoEnded': { season: number; week: number }; // commercial flag on only (#362)
}
```

Week tick pipeline order (`core/time.ts`, fixed): 0) a change made since the last save
is saved (never a held week; QA finding 21) → 1) training gains → 2) injuries tick →
3) economy (wages, income) → 4) match of the round (headless on fast-forward, else
hand off to MatchScene) → 5) ladder update → 6) free agent pool refresh (every 4 weeks) →
7) autosave → 8) emit `week:advanced`.

**Held weeks.** The player's match holds the week at step 4: matchday calls
`ctx.hold()`, the later hooks wait, and at `match:finished` matchday applies the live
sim's result and calls `resumeWeek()`, so the ladder, finals and season end see the
match the player watched. Every hold needs its own `resumeWeek()`. With *Rival matches
played out* on (`settings.liveRivals`), the rival round plays in a Web Worker
(`systems/rivalRound.ts`, `systems/matchWorker.ts`) and holds the week too. A small
record beside the save slot (`systems/liveMatchRecord.ts`: seed, calls, plan changes,
tick) lets a match killed mid-way resume within 2 seconds of match time; Save & exit
parks the match and Advance Week resumes it. A held week is never written to the save.
Export during a hold writes this week's week-start save plus the live-match record,
never the half-ticked week, and refuses when that save is missing or from another week
(`downloadSave`). Deleting the slot, starting a new game in it, or importing over it
drops the record (`deleteSlot`, `main.ts`, `installImportedSave`), so the next game
never resumes the old match.

**Multi-week advance** (`core/advance.ts`, the HUD's ×4 / to finals / to season end):
one `advanceWeek()` per week under fast-forward, a frame between weeks so the page
paints and **Stop** works; the stop rules (`core/advanceRules.ts`) run after each week.
In a browser a fast-forwarded match plays headless in the Worker
(`systems/matchJobs.ts`); Node, tests and the soak play in place with the same result.

**Finals** (weeks 25–27): after the ladder step of week 24/25/26 the fixtures system
appends the next knockout round (QF 1v8/2v7/3v6/4v5, SF re-seeded, GF). A final level
at full time goes to golden point (N9.4); still level, the higher seed goes through.
Finals stamp the fixture only; the ladder stays the regular-season finish.

## 6. Match simulation contract (src/match/, types in src/sim/events.ts)

Every match the player's club plays is played on the live match sim (BAK-207,
`docs/specs/BAK-207-live-match-sim.md`): eighteen bodies on a 20 Hz fixed-step
clock, rugby league Nines rules, the tackle contest, tactics, traits, fatigue,
weather and coach calls (rules and every knob: BAK-208 and
`docs/specs/BAK-208-tuning.md`). The sim is `LiveSim` in `src/match/league/live.ts`,
built in layers under `live/` (§2). Rival-vs-rival fixtures use the cheap score model
in `systems/fixtures.ts` unless `settings.liveRivals` is on (off by default, N9.2);
a fast-forwarded week keeps the cheap model either way.

```ts
// src/match/league/sheets.ts — what a side takes onto the field
export function teamSheetFromSquad(players: Player[], clubId: string, name: string,
  colors: [string, string], selection?: Selection): TeamSheet; // the coach's lineup (#69), else best fit nine + a bench
export function teamSheetFromRival(club: RivalClub): TeamSheet;

// src/match/league/match.ts — a whole match, headless
export function runMatch(home: TeamSheet, away: TeamSheet, opts: RunMatchOptions): MatchResult;
// RunMatchOptions: seed, weather, injuryRate, length, calls (#73), controls (Labs),
// aiCoach (N9.6), goldenPoint (N9.4), plans (N11), breakRuleSides (N13.5),
// difficultyEdge (N12.2)

// src/sim/events.ts — the result every system reads (season, ladder, stats, overlay)
export interface MatchResult {
  homeScore: number; awayScore: number;
  events: MatchEvent[];                       // t = match minute off the sim clock
  stats: { possession: [number, number]; tackles: [number, number];
           errors: [number, number]; tries: [number, number] };
  weather: WeatherKind;
  momentumTimeline: { t: number; value: number }[]; // -100 (away) .. +100 (home)
  injuries: MatchInjury[];                    // matchday applies them at full time
  calls?: { made: [number, number]; paid: [number, number] };
}
```

- **Deterministic:** a match is `{ seed, sheets, calls[], plans[] }` plus the options on
  `runMatch`. The same inputs give the same match, tick for tick. Any new dice roll
  reshuffles every seed's match, so changes are judged on averages over many seeds
  (the balance harness, `balance/README.md`).
- **One sim, two drivers:** `runMatch` plays to full time headless (fast-forward, the
  balance harness, tests). `LivePlayback` (`src/match/view/`) runs the same `LiveSim` as
  the player watches, takes the coach's calls, and builds the result with the same
  recorder, so the match on screen is exactly the match that counts.
- **The view's layers** are told the frame and draw; none of them is the sim:
  `liveView` (bodies, ball), `popupLayer`, `kickLayer`, `traitLayer`, `contestLayer`,
  `zoneLayer`, `wrestleBar`, `sprintLayer`, `controlsLayer`, and `legsLayer` (the lab's).
  `commentary` is the DOM ticker. The instant replay (`replay.ts`) re-plays the seed
  with `replayRange` in the Worker; nothing it draws is read back by the sim. The DOM
  overlay (`ui/screens/matchOverlay.ts`) is the scoreboard, controls and full-time
  actions; while it is up only toasts flagged `match: true` show (`src/ui/toasts.ts`).
- **Cost:** a 2 × 9:00 match is 21,600 ticks, about 300 ms headless in Node. In a
  browser none of it runs inside a tap: fast-forward, Skip and live rival rounds play
  in a Worker, and the match art is painted ahead in another.
- Callers' sheets are never mutated. The sim only reports injuries; matchday applies
  them at full time.

## 7. Rendering conventions

- Phaser config (`main.ts`): `pixelArt: true`, `roundPixels: true`, background `#1a1a2e`.
- Iso projection (`src/world/iso.ts`): `screenX = (gx - gy) * TILE_W/2`,
  `screenY = (gx + gy) * TILE_H/2`; depth = `screenY` (+1 for objects on tile).
- Grounds textures (BootScene → `registerGroundsArt`, `src/art/grounds/`): tiles
  (`tile-grass*`, `tile-dirt`, `tile-path`, `tile-highlight-ok|bad`), edge overlays,
  the surround, the manager (`char-idle-<dir>`, `char-walk-<dir>-<frame>`),
  `facility-<defId>-<level>` for levels 1–3, and decor. Boot paints only the placed
  facilities; any other is painted on first show (`ensureFacilityTexture`) or in idle
  slices (`paintFacilitiesWhenIdle`).
- Building (`src/world/placement.ts`, `buildFeedback.ts`, `ghostPreview.ts`, `buildFx.ts`):
  rules and money for build, move and demolish live in `placement.ts`; the rest is
  presentation (tinted ghost, scaffolding, pop-in), skipped under `prefers-reduced-motion`.
- Grounds life (`src/world/groundsLife.ts` plans, `src/scenes/groundsLife.ts` draws):
  a capped, seeded cast of players, staff and fans walking the grounds. Presentation only.
- Kits (`src/art/match/kit.ts`, `kitClash.ts`): `GameState.kit` registers with
  `setKitDesign`, so everything that dresses a player wears it; the away side switches
  strip on a clash. Behind `FEATURES.cosmeticKits`.
- Match textures (`src/art/match/`): generated per match and freed on shutdown. The
  kit-dependent art (`fixtureArt.ts`) is painted ahead for the next fixture by the art
  worker (`artWorker.ts`, scheduled from `scenes/matchArtAhead.ts`) and uploaded a
  texture per idle slice.
- Match atmosphere (`src/fx/atmosphere.ts`, pure `src/art/match/atmosphere.ts`):
  per-fixture lighting and the result's weather drive the light map, haze, glows and
  rain/wind emitters.
- Match readability (`src/world/readability.ts`): situational zoom, carrier ring, name
  tag, ball trail. Presentation only.
- Scene keys: `'Boot'`, `'Grounds'`, `'Match'`. Only one world scene active at a time;
  switch via `this.scene.start(...)`. UI overlay is DOM and persists across scenes.

## 8. Testing & quality gates

- Vitest: `npx vitest run` runs every spec under `tests/`. Pure logic (data models,
  systems, sim, art generators) must have unit tests; Phaser-bound code is covered by
  the browser runs below.
- `npm run build` (tsc + vite build) must pass with zero TS errors, strict mode.
- No `any` unless interfacing with Phaser types that require it; justify with comment.

CI (`.github/workflows/`):

| Job | When | What |
|---|---|---|
| `check` | every PR, `main` | verdict over `check (typecheck, build)` (tsc, build, bundle size) and `check (unit qa / 1/2 / 2/2)` (vitest, sharded) |
| `webkit (<group>)`, `webkit` | every PR, `main` | `npm run e2e:webkit -- --group <group>` for match, text, screens, portrait; `webkit` is their verdict. Screenshots: the `e2e-webkit-<group>` artifact, 7 days |
| `apk` | PRs touching the app or native project, `main` | Android test APK (`android-apk.yml`); publishes the release only from `main` or a manual run |
| QA `qa`, `perf` | nightly and on demand (`qa.yml`) | soak and playthroughs; the phone perf budget (`scripts/perf-budget.json`) |

`balance.yml` re-runs the standard balance plan on match-code changes to `main`;
`pages.yml` deploys `main` to GitHub Pages.

## 9. Known constraints

- The design docs the early tickets cite were never in the repo; where a ticket defers
  to them, this document and the ticket's spec in `docs/specs/` are authoritative.
- BAK-170 duplicates BAK-172 — BAK-172 is canonical.
- Monetisation: see `docs/specs/commercial-entitlements.md` and
  `docs/specs/commercial-saves.md`. Everything commercial is behind the `commercial`
  flag, off unless the build sets it.
