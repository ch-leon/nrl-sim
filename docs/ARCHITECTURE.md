# NRL Sim — Architecture & Conventions

> Kairosoft-style pixel-art NRL rugby league management sim. Browser game.
> Stack: **Vite + TypeScript (strict) + Phaser 3**, **Vitest** for headless logic tests.
> This document covers the shared interfaces and conventions. Where it summarises a
> source file, the source file wins.

## 1. Core principles

1. **Keep simulation and domain calculations headless.** They must not depend on
   DOM/Phaser or concrete remote-service SDKs. `src/match/{core,league}/` and pure
   calculations such as `src/systems/lineup.ts` take data and return data. Existing
   orchestration, browser I/O and view bridges are intentional seams or current
   exceptions, not proof of complete separation (see §1.2). Scenes render state
   and send intents through existing exported operations.
2. **Single serialisable career state.** Persistent career data lives in the
   plain-JSON-serialisable `GameState` (see §4); no class instances in state. Save
   metadata, live-match recovery and entitlement caches have dedicated sidecars,
   not a second career store. UI owns ephemeral selection, open sheets and display
   state; persistent game-rule changes belong to existing system/core operations
   (§4.1). Presentation preferences have a bounded exception (§4.2).
3. **Typed event bus.** Systems communicate via a single typed `EventBus`
   (see §5). Scenes/UI subscribe; systems publish. No direct scene→system calls
   other than through exported system functions. A returned system patch may be
   applied by the caller under the explicit ownership contract in §4.1.
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

### 1.1 Offline gameplay and remote integrations

The game loop, week hooks and match execution must work from local state without
waiting for remote services. `src/core/time.ts` runs synchronous ordered hooks;
its hold/resume mechanism coordinates local live matches and worker jobs (§5),
not login, analytics, flags, purchases or cloud availability. Do not put remote
requests in a tick, simulation step or render update.

Purchases, Restore, login and sync may await network at their UI/menu boundary.
`src/ui/screens/paywall.ts` already awaits entitlement purchase/restore operations;
it currently uses stub integration, not a shipped store SDK. A failed remote save
must leave the local career playable. Sync uses the existing storage seam and
conflict rules, outside active week/match execution (§4.3).

**Cached entitlement policy is existing policy, not a new offline purchase rule.**
`src/commercial/entitlements.ts` exposes synchronous `snapshot()` for gameplay.
`EntitlementService` starts from an explicit provider initial answer, otherwise the
persisted last-good cache, otherwise demo; failed provider calls keep the last
answer, while a successful changed answer (including a refund) replaces it. The
currently wired `LocalStubProvider` supplies its own synchronous initial answer.
`src/commercial/demo.ts` uses the snapshot (or the existing slot-grandfathering
rule), and `advanceWeek` checks the gate after the held-week guard, so an active
match finishes. Preserve the current tier/platform, demo and grandfathering rules;
this contract adds no grace period, purchase bypass or new entitlement grant.
See [commercial entitlements](specs/commercial-entitlements.md#the-service) and
its [decision switches](specs/commercial-entitlements.md#decision-leon-switches).

Remote presentation flags may select copy, announcements or presentation variants.
They must not alter match outcomes, RNG draws/order, tuning, save format/validation,
storage ownership or purchase entitlements. The build-time `commercial` gate in
`src/commercial/flags.ts` and ownership rules in `entitlements.ts` are not remote
presentation flags. Launch integration [#456](https://github.com/ch-leon/nrl-sim/issues/456)
and remote flags [#452](https://github.com/ch-leon/nrl-sim/issues/452) must follow
these boundaries; neither is a prerequisite or implemented by this contract.

### 1.2 Dependency seams and current exceptions

- Domain calculations consume explicit data: `resolveLineup` in
  `src/systems/lineup.ts`, `runMatch` in `src/match/league/match.ts`, and
  `resolveSaveConflict` in `src/core/storage/conflict.ts` do not need a scene or SDK.
  Keep concrete provider clients at integration boundaries; for example,
  `src/commercial/revenuecat.ts` maps an injected `RcPurchasesClient` into the
  entitlement model. It is a seam, not a wired RevenueCat SDK.
- System orchestration is not necessarily pure: `src/systems/freeagency.ts` reads
  and updates the store, emits events and registers week hooks. `src/core/time.ts`
  intentionally consults the local commercial gate. Neither should acquire a
  concrete service SDK or await a remote answer.
- `src/core/save.ts` combines save/migration logic with browser download, file-picker
  and page-lifecycle helpers. `src/commercial/entitlements.ts` accesses browser
  storage and exposes a dev-only window hook. Do not describe all core/commercial
  modules as DOM-free or all persistence as already routed through one adapter.
- `src/world/placement.ts` mixes pure placement validation, money/state operations,
  a scene registry and Phaser `PlacementController` glue. `src/systems/undo.ts`
  imports its placement helpers, so that dependency is not fully separated.
  Keep rules in the existing operations rather than copying them into screens.
- `src/match/view/livePlayback.ts` currently drives `LiveSim`, records events and
  publishes completion as well as drawing (§6.1). These are real orchestration
  responsibilities in a view module; drawing itself is never result authority.

Retain the current folders and exported operations. Do not introduce a parallel
application/service framework or wrappers that only rename an existing API.
The remaining screen mutation exceptions in §4.1 are work for
[#526](https://github.com/ch-leon/nrl-sim/issues/526). Deferred overlay decomposition
[#527](https://github.com/ch-leon/nrl-sim/issues/527) and the later Preact decision
[#528](https://github.com/ch-leon/nrl-sim/issues/528) must preserve these contracts;
this document does not start their implementation.

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

**Save versions.** `SAVE_VERSION` is **23**. This documentation does not change it.
Any change to `GameState`'s shape:

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

Nested save validation and permitted repairs are documented in
[save validation](specs/save-validation.md). Load/import validate before trusted
installation; autosave uses exact-byte approvals and never runs nested validators
in a tick. Repaired originals and replaced import destinations use #522 recovery.

### 4.1 Mutation ownership and operation effects

UI owns a selected row/slot, a name or kit draft, an open modal, sorting and display
state. Confirming a persistent change must use the existing system/core operation
that owns validation and game rules. A shared calculation alone does not make a
screen the owner of the resulting gameplay mutation.

Two existing contracts are valid: an operation commits to the store, or a pure
operation returns a patch for the caller to apply. `setState` is a shallow merge
and publishes `state:changed`; it does not validate rules, deep-merge nested objects,
persist a save, book finance, or offer Undo. Applying a returned patch is permitted;
rebuilding its rules or reapplying a committed operation's effects in UI is not.

For each operation, keep its effect ownership explicit. Current examples:

| Operation | State/rule owner | Persistence owner | Notifications, finance and Undo |
|---|---|---|---|
| Player rename | `renamePlayer` in `src/systems/rename.ts` validates and returns a patch or no change; the player page applies that patch with `setState` | `src/ui/screens/player.ts` calls `save(getState())` after a changed patch | Player page deliberately redraws without a toast; no money movement or Undo is part of rename |
| Club rename | `renameClub` in `src/systems/rename.ts` returns the coordinated club/league patch; the kit screen applies it | `src/ui/screens/kit.ts` calls `saveGame(getState())` (its imported save alias) | Kit screen emits the success toast only for a changed patch; no finance effect or Undo |
| Signing from Recruit/player page | Existing `signWithUndo` in `src/systems/undo.ts` calls `signPlayer` in `src/systems/freeagency.ts`; the latter checks funds/capacity, spends the fee and commits squad/pool/optional lineup changes | Neither operation directly saves; existing autosave owns persistence (§4.3) | `signPlayer` emits `player:signed` and money effects; `toast: false` suppresses its ordinary toast so `signWithUndo` offers one Undo toast. Undo restores eligible state and books a reversing money movement |

`spendMoney`/`earnMoney` in `src/data/club.ts` emit `money:changed`;
`registerFinanceSystem` in `src/systems/economy.ts`, installed once by `main.ts`,
books that movement. A caller must not also deduct the fee, emit the same money
event or update the finance ledger. `src/systems/undo.ts` owns eligibility, expiry
and reversal for its supported operations; the toast only invokes it. Undo offers
are in memory, expire after five seconds, and end on advance, match start or reload.
Do not add Undo to an operation that has no such contract merely to match a screen.

A changed patch must be applied once, with the operation's assigned save and
notification path; a refused/no-change result must not charge, announce success or
create an Undo offer. Preserve existing persistence timing, including held-week
protection, rather than adding a second generic save/notification layer.

**Current gaps, not approved patterns:** `src/ui/screens/lineup.ts` and
`player.ts` write lineup changes directly; `playbook.ts` writes tactics/plays;
`kit.ts` commits the kit draft directly (distinct from its system-owned rename);
`build.ts` writes facility upgrades; `matchReport.ts` updates `potmTally`.
These persistent mutations remain on main and are the later #526 cleanup scope.
They do not permit new UI-owned gameplay rules. No mutation code is moved here.

### 4.2 Persistent preferences

Small presentation-only preferences may remain in their dedicated settings
boundary. For example, `src/fx/audio.ts` owns audio controls and the settings sheet:
volume/mute use `setState`, and the sheet's settings patch helper also calls `save`;
`src/ui/textSize.ts` translates the saved text-size choice into presentation.
These use the same save/held-week rules as other callers; they are persistent
preferences, not ephemeral UI state.

This exception is limited by meaning, not by the field name `settings`. Difficulty,
lineup, training, match rules, money, ownership and save data are not presentation
preferences. The existing settings sheet also exposes match-affecting choices
such as live rivals; its current location does not authorise arbitrary gameplay
patches through a settings helper. Keep rule changes with the existing system/core
owner and its validation/effect contract. Preserve other settings fields when
applying a presentation preference, because `setState` replaces nested objects.

### 4.3 Local persistence and asynchronous storage

`src/core/save.ts` owns serialisation, migration/validation and the synchronous
`save`/`load` contract. `LocalSaveStore` in `src/core/storage/local.ts` writes the
local payload synchronously; metadata is a sidecar coalesced in a microtask, not a
promise that callers must await before the career is saved. `setState` alone is
not a disk save. Existing `enableAutosave` wiring saves settled weeks, changes
before the next week's hooks, and on page hide/visibility loss. Callers with an
explicit immediate-save contract, such as rename above, retain it.

`save` refuses a held week, an imported-over active slot and locked career writes;
never bypass it to write a half-ticked state. Preserve the week-start save plus
live-match sidecar contract (§5). Preserve normal/developer career namespace
isolation (`setCareerNamespace` in `storage/local.ts`, selected by the existing
Labs career flow), stable keys in `src/core/storageKeys.ts`, and existing save
bytes/schema. Keys are historical identifiers, not branding or folder names.

`SaveStore` in `src/core/storage/types.ts` allows `MaybePromise` results for future
adapters, but current save callers require `SyncSaveStore`. That interface does
not automatically make `save`, `load`, title flows or week hooks async. Remote or
native storage requires an explicitly designed caller boundary; replacing the
local store with a promise-returning adapter is not a transparent substitution.
Keep local saves available without a remote service. `RemoteSaveStore` is currently
an interface: future menu-driven sync must use conditional writes and the pure
conflict resolver, preserving unknown/newer payloads rather than overwriting them.
See [commercial saves](specs/commercial-saves.md#what-shipped) and its
[conflict rules](specs/commercial-saves.md#conflict-rules--resolvesaveconflictlocal-remote).
No storage migration or new adapter is introduced by this contract.

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

### 6.1 Worker inputs and result authority

Workers receive explicit serialisable (structured-cloneable) inputs, not a live
store, DOM nodes, Phaser objects, callbacks or service clients.
`MatchJob` in `src/systems/matchJobs.ts` carries `home`, `away` and `opts` (including
seed); `src/systems/matchWorker.ts` runs `runMatch` and returns `MatchResult[]` in
request order without reading `GameState`. Replay requests likewise supply sheets,
options, seed and tick range. The existing worker failure/timeout path runs the
same jobs locally; remote availability never decides whether a fixture can finish.

The official result comes from simulation and its recorder, never pixels, frame
rate, animation completion, DOM scores or a replay. Headless `runMatch` and live
`LivePlayback` use `LiveSim`/`MatchRecorder`; live playback currently drives that
sim and emits `match:finished` from the recorded result (or the headless Skip
result). `src/systems/matchday.ts` owns applying the player result and resuming the
held week. Draw layers and instant replays cannot overwrite the fixture or apply
season/finance effects a second time. Coach calls and plan changes are explicit
simulation inputs; cosmetic presentation choices must not consume its RNG.

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
