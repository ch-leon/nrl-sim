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
    matchday.ts              # player match of the round; SQUAD_MIN forfeit (GitHub #4)
    lineup.ts                # the coach's nine, bench and rotation; positional fit; auto pick (GitHub #69)
    aging.ts                 # season-rollover ageing + age retirement (GitHub #5)
    events.ts                # random events deck: draw, choices, modifiers (GitHub #75; cards in data/events.ts)
    rivals.ts                # rival squads: generation, signings, ageing/development, strength (GitHub #74)
  match/                     # the match sim (BAK-207): every match the player plays or fast-forwards
    core/                    # sport-neutral: fixed-step clock, bodies, ball, snapshots, flag codes
    league/                  # rugby league (Nines) rules, roles, tackle contest, tactics, team sheets, runMatch
    view/                    # LivePlayback: plays the match on MatchScene's sprites (interpolated);
                             #   commentary.ts, the ticker's lines and the report's summary (N15.2);
                             #   traitLayer.ts, the moves a firing trait draws (N15.4);
                             #   replay.ts, a try's eight seconds re-simulated from the seed (N15.5);
                             #   contestLayer.ts, the line-break flash and the driven tackle's dust (N15.6)
    lab/                     # /#lab dev page: teams/seed, play/pause/step/scrub, Flag
  sim/
    events.ts                # MatchEvent types + MatchResult         (WU-6)
    weather.ts               # weekly weather roll + momentum helpers (WU-6 / BAK-198)
  scenes/
    BootScene.ts             # texture generation, then start scenes  (WU-2)
    GroundsScene.ts          # isometric club grounds                 (WU-2, extended WU-8)
    MatchScene.ts            # isometric match field + playback       (WU-11, extended WU-12)
  world/
    iso.ts                   # iso math: grid<->screen, depth         (WU-2)
    camera.ts                # pan/zoom controller                    (WU-2 / BAK-159)
    path.ts                  # A* grid pathfinding                    (WU-2 / BAK-161)
    placement.ts             # facility placement controller          (WU-8 / BAK-178)
  ui/
    dom.ts                   # DOM helpers: panel(), button(), mount  (WU-5)
    hud.ts                   # money/week/season HUD                  (WU-5 / BAK-163)
    nav.ts                   # bottom nav bar; screens register here via main.ts (WU-5)
    screens/
      squad.ts               # squad list screen                      (WU-9)
      lineup.ts              # pick the nine and the bench            (GitHub #69)
      recruit.ts             # free agency screen                     (WU-9 / BAK-179)
      fixtures.ts            # fixtures + ladder screens              (WU-7 / BAK-184)
      history.ts             # past-seasons screen + season-end toast (GitHub #3)
      build.ts               # facility build menu                    (WU-8 / BAK-178)
      matchOverlay.ts        # scoreboard/stats/commentary overlay    (WU-12 / BAK-196)
      matchReport.ts         # the match report at full time: scorers, goals, the numbers, Player of the Match (N9.5)
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

```ts
export type Position =
  | 'fullback' | 'winger' | 'centre' | 'five-eighth' | 'halfback'
  | 'hooker' | 'prop' | 'second-row' | 'lock';

// Traits are levelled special skills (BAK-208 §3); the catalogue of TraitIds
// (dancingFeet, hitman, hothead, …) lives in data/traits.ts.
export interface TraitInstance { id: TraitId; level: 1 | 2 | 3 }

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
  traits: TraitInstance[];
  wage: number;               // per week
  contractWeeks: number;      // remaining
  junior?: boolean;           // Academy prospect awaiting signing (#42)
  departed?: boolean;         // left the club: survives free-agent re-rolls (#40)
  career?: StatTally;         // games, tries, tackles, line breaks, sin bins, from match events (#46)
  seasonStats?: StatTally & { season: number }; // this season only (#46)
  joinedSeason?: number;      // first season at the club (drives clubLegend)
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
  strength: number;           // 1-100; for rivals, derived from `squad` (best 9 overall)
  squad?: Player[];           // the rival's own players (#74); absent on the player's club entry
}

export interface SeasonRecord {
  season: number; ladderPosition: number; premiership: boolean;
  wins?: number; losses?: number; draws?: number; // the extended fields are absent on pre-v4 records
  pointsFor?: number; pointsAgainst?: number;
  topScorer?: { name: string; tries: number };
  review?: SeasonReview;      // what the season review showed, so History can reopen it (v12+, #190)
}

// The club's books by line (#172): Σ money:changed deltas for one season, negative = spent.
// FINANCE_LINES: wages, upkeep, overhead (running costs, v17+, N12.3), sponsor, grant,
// gate, prize, boardGrant, events, transfers, contracts, facilities, other.
export type SeasonFinance = { season: number } & Record<FinanceLine, number>;

export interface GameState {
  version: typeof SAVE_VERSION; // bumped with a MIGRATIONS step in save.ts on every shape change
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
  settings: {
    muted: boolean; volume: number; tutorialDone: boolean;
    difficulty: Difficulty;   // easy | normal | hard (#48)
    coachCalls?: boolean;     // the call chips in your matches (#73); on when absent
    liveRivals?: boolean;     // rival rounds played on the live sim (N9.2, #212); off when absent
  };
  history: SeasonRecord[];    // one per completed season, oldest first
  boardPatience: number;      // 0..BOARD.MAX_PATIENCE; zero = sacked (#47)
  objectives: Objective[];    // this season's board objectives (#47)
  sacked?: SackedInfo;        // set when the board sacks the player; the save is kept (#47)
  eventDeck: EventDeckState;  // random events: pending cards, cooldowns, modifiers, own RNG stream (#75)
  kit?: KitDesign;            // the player's kit design (#79); absent = derived from the club colours
  finance: SeasonFinance[];   // the club's books by season, oldest first (#172)
  lineup: Lineup;             // the coach's nine by slot, bench, rotation and team tactics (#69, N11)
  training: { focus: TrainingFocus }; // what the squad trains hardest: a stat or 'balanced' (N11, v16)
  boardLoan: { owed: number }; // renewals the board advanced in debt, repaid at the rollover (N14.3, v18)
  staff: StaffMember[];        // the club's hires, one of each role at most (N14.5, v19)
  potmTally?: PotmTally;      // player-of-the-match awards this season, by name (#190); absent until the first
  rngSeed: number;            // advanced state of the seeded RNG
}
```

The club's books (N6, #172; `systems/economy.ts`): `registerFinanceSystem` adds every
`money:changed` delta to its line (`classifyReason`) in the season's `finance` entry,
opened on the season's first movement. The rollover pays the finals prize money and the
board grant after the counters have moved to week 1 of the next season, so
`stampMovement` books those two lines to the season they close; the Finance screen's
six-week ledger stamps with the same function (to that season's last week) and names
its Other column by the same lines, so the two agree (N12).

The lineup (GitHub #69, `systems/lineup.ts`): `{ starters: (playerId | null)[9]; bench:
playerId[]; rotation: 'off' | 'standard' | 'heavy'; tactics: TeamTactics; kicker, captain: playerId | null }`, the starters in the formation's
slot order (fullback, two wingers, centre, five-eighth, halfback, hooker, prop,
second-row: the live sim's roles in `match/league/roles.ts`). A man out of position
plays below his rating (same ×1, related ×0.92, unrelated ×0.8; tuning reference §21).
Matchday resolves the saved lineup against the squad on the day: an injured starter is
covered for that match by the best man for the slot (bench first, then the rest of the
squad) with a line in the news, a man who has left the club is replaced in the saved
lineup too. The sheet's roster is then the nine in slot order, each entry's `position`
the slot he plays and his stats scaled by his fit, so the live sim's slots and the
match-screen looks both see the man the coach picked. `tactics` is the attack and defence
preset the coach picks on the Lineup screen (N11, BAK-208 §5): Balanced / Slide by default
and for saves from before v14, and the sheet carries it into the match. `kicker` and `captain`
(N11, v15) are the coach's picks; null, or a man not in the nine, means the default
(`kickerAndCaptain`: the best-kicking half, the smartest starter), and the sheet names both. Rival
coaches auto-pick by slot with the same fit. Old saves (v10 → v11) get today's auto pick.

Rival squads (GitHub #74): every rival keeps a persistent `squad` (generated to match its
strength at new game / v7→v8 migration, seeded per club so `rngSeed` is untouched). Weekly
(tick order 59, before the free-agent refresh) rivals heal, may sign from `freeAgents`
(weakest position first, under a salary cap), and develop (#143): on their own RNG stream
(`rivalDevelopSeed`, never `rngSeed`) every rival player has a chance of ±1 on each stat
that averages `RIVAL_DEVELOPMENT.BY_AGE` over a season (young +4, veterans −4) plus the
pull toward `LEAGUE.MEAN`, and a league anchor nudges every rival back toward the mean
once the rival mean has drifted past a deadband, so the league's centre holds at about
55 while clubs still rise and fall against each other. At rollover they age and retire
through `aging.ts` and take on juniors; this replaced the old strength drift and the
rollover development. Matchday builds a rival's sheet from its fit squad with
`teamSheetFromSquad` (the strength sheet is the fallback), so the match API is unchanged.

Parity (N5, GitHub #140): `LEAGUE` in `config.ts` holds the league's rating centre
(`MEAN`, which `RIVAL_LEAGUE_MEAN` re-exports) and the new-game start. The rivals in
`data/league.ts` are spread 42–70 around it, and `createNewGame` builds the player's
squad the way rival squads are built (`generatePlayerAround`): one star for a hero, a
first-grader per position around `START_FIRST_GRADE` plus the difficulty's `startRating`
(Easy +4, Hard −4), and depth players `START_DEPTH_GAP` below, so on Normal the best nine
starts level with the rival mean rather than thirteen above it (#148). New games only; a save's
rivals keep the strength their squads give them. `npm run soak` reports the gap, the
player's record and ladder finish per season (`docs/status/2026-10-league.md`).

Signing fees (N5, GitHub #146): a free agent costs a transfer-style fee by overall and
age (`signingFee` in `freeagency.ts`, built on `contracts.transferFee`: overall² × 10 ×
an age factor, so an 80-overall in his prime is about $64k and a 55 about $30k), less a
Scout Office discount per level; Academy prospects still cost `SIGNING_FEE_WEEKS` × wage.
`marketWage` has one copy, in `data/player.ts` (contracts and rivals re-export it). Rivals
compete for the same pool, which since N12 (#247) is generated around the league
(`freeagency.poolTarget`), so there are fewer stars to take: over a first season they sign
about 3.2 players of 65+, down from 6.4.

Random events (GitHub #75): the deck draws at most one card a week (tick order 58,
after morale) from its own seeded stream `eventDeck.rng`, so it never moves `rngSeed`.
A card waits for `EVENTS.ANSWER_WEEKS`, then takes its default choice. Money effects go
through `earnMoney` (the finance ledger); the outcome of every choice is posted to the
news. A new card stops a multi-week advance. `ui/decisions.ts` presents them (UI cleanup
chunk 2): News shows a one-row banner and the cards open in their own popup, each choice
split into its sure line and its risks (`describeChoice`); Advance Week and the ▾ runs ask
before an advance with a card pending (never a default unasked), runs past ×4 weeks
confirm, and a run stopped by a new card opens it with Keep advancing.

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
  'match:started': { fixture: Fixture; sim?: MatchResult; live?: LiveMatchData }; // live: no result until full time
  'match:event': MatchEvent;          // re-emitted during playback pacing
  'match:finished': { fixture: Fixture; result: MatchResult };
  'match:parked': { tick: number }; // Save & exit: the week stays held; Advance Week resumes the match
  'bankruptcy:warning': { balance: number; forcedSales?: string[] }; // after the week's forced sales, naming them (N12.5)
  'ui:notify': { text: string; kind: 'info' | 'success' | 'danger' };
}
```

Week tick pipeline order (WU-4, fixed): 0) a change made since the last save is saved
(the week may hold, and a held week is never written; QA finding 21) → 1) training gains → 2) injuries tick →
3) economy (wages, income) → 4) match of the round (headless on fast-forward, else
hand off to MatchScene) → 5) ladder update → 6) free agent pool refresh (every 4 weeks) →
7) autosave → 8) emit `week:advanced`.

The player's match (BAK-207; coach calls #73) **holds the week** at
step 4: the matchday hook calls `ctx.hold()`, the hooks after it and the week's end
wait, and at `match:finished` matchday applies the live sim's own result and calls
`resumeWeek()`, so the ladder, finals seeding, morale and a season's end see the
match the player watched. Fast-forward holds only inside the multi-week advance in a
browser (N10.3, below); everywhere else it plays in place. The game saves at a week's end, when the page hides, and at the start of a week
when the state has changed since the last save (QA finding 21), never while a week
is held. A small record next to the save slot (`systems/liveMatchRecord.ts`: seed,
calls, plan changes (N11), tick) is written on each call and plan change, when the
page hides, every 2 seconds of match time, and on Save & exit. An app killed
mid-match reloads the week-start slot plus that record, and advancing resumes the
same match within those 2 seconds (no reloading for a better result). Save & exit
returns to the club with the week still held: Advance Week reads Resume match and
continues it, and the ▾ menu will not skip it. Continue on the slot does the same
after a reload. A hire or a build made back at the club stays in memory and is
saved with the week at full time; a kill before then drops it, because a held week
is never written. Export during the hold writes that week-start save plus the
live-match record, not the half-ticked week, and refuses when that save is
missing or from another week. Deleting the slot, or starting a
new game in it, drops the record so the next game does not kick the old match off.

Holds count (N9.2): every hook of the holding order still runs, then the later hooks
and the week's end wait for one `resumeWeek()` per hold. With *Rival matches played
out* on in Settings (`settings.liveRivals`), the rival round (order 40, beside the
player's match) plays its seven fixtures with `runMatch` in a Web Worker
(`systems/rivalRound.ts`, `systems/matchWorker.ts`) and holds the week until they are
in; off, or on fast-forward, it uses the cheap sim, which scores on the live sim's
scale (tuning reference §24).

The multi-week advance (`core/advance.ts`, the HUD's ×4 / to finals / to season end;
N10.2) runs one synchronous `advanceWeek()` per week under fast-forward and awaits a
frame between weeks, so the page paints and takes taps: the HUD shows "Week n of 27…"
and a **Stop** that ends the run after the week in hand. No hook sees a half-run week;
the stop rules (`core/advanceRules.ts`) are asked after each week as before. In a browser
the advance lets a fast-forwarded week hold (`withFastForward(fn, { holds: true })`,
N10.3): matchday plays the player's match headless in the same Worker
(`systems/matchJobs.ts`: a job is `{ home, away, opts }`, the answer `runMatch`'s result),
applies it on `resumeWeek()`, and the advance waits for the week's end before the rules.
Node, the tests, the soak and `advanceWeeks` have no holds and play in place, with the same
result; a Worker that fails or stays silent is replaced by playing the match here.
Skip in a live match (N10.4) posts the match's record to its own `'skip'` lane, a second
worker, so it never queues behind a rival round still being played in the background lane.
Debt stops a run once, not every week in the red (N12.5): on the crossing into the red
(money ≥ 0 before the week, < 0 after), on a forced sale (the economy's
`bankruptcy:warning` names them) and when the balance first passes the fire-sale floor.

Finals (weeks 25–27, GitHub #2): after the ladder step of week 24/25/26 the
fixtures system appends the next knockout round — QF 1v8/2v7/3v6/4v5 from the
regular-season ladder, SF re-seeded from QF winners, GF from SF winners. A final level
at full time on the live sim goes to **golden point** (N9.4; `goldenPoint` on `runMatch` /
`LiveSim`, set by matchday and the rival jobs for rounds past `SEASON_ROUNDS`): the next score
wins. Still level after it, or drawn on the cheap sim, it goes to the home/higher seed. Player ties go through matchday → MatchScene like any
round; rival ties are cheap-simmed (or live, with the setting on). Finals results stamp the fixture only — the
ladder stays the regular-season finish. At rollover the GF winner is recorded in
`history` (headless `runFinals` catch-up if the bracket is unfinished), and
`season:ended` carries that entry to the season-end toast.

## 6. Match simulation contract (src/match/, types in src/sim/events.ts)

Every match the player's club plays is played on the live match sim (BAK-207,
`docs/specs/BAK-207-live-match-sim.md`): eighteen bodies on a 20 Hz fixed-step
clock, rugby league Nines rules, the tackle contest, tactics, traits, fatigue,
weather and coach calls (rules and every knob: BAK-208 and
`docs/specs/BAK-208-tuning.md`). Rival-vs-rival fixtures stay on the cheap
score model in `systems/fixtures.ts` unless **Rival matches played out** (Settings)
is on (`settings.liveRivals`, off by default, N9.2). With it on, the other games
of the round run this same sim in a Worker (`systems/rivalRound.ts`) and the week
waits until they land. A fast-forwarded week keeps the cheap model either way.

```ts
// src/match/league/sheets.ts — what a side takes onto the field
export function teamSheetFromSquad(players: Player[], clubId: string, name: string,
  colors: [string, string], selection?: Selection): TeamSheet; // the coach's lineup (#69), else best fit nine + a bench of four
export function teamSheetFromRival(club: RivalClub): TeamSheet; // strength-built, generated names

// src/match/league/match.ts — a whole match, headless
export function runMatch(home: TeamSheet, away: TeamSheet, opts: {
  seed: number; weather?: WeatherKind; injuryRate?: number;
  length?: MatchLength;                       // two NINES halves unless told
  calls?: CallInput[];                        // coach calls by tick (#73)
  aiCoach?: ('home' | 'away')[];              // sides whose coach calls for himself (N9.6)
  goldenPoint?: boolean;                      // a final: the next score wins if level (N9.4)
  plans?: PlanInput[];                        // a change of plan at a break, by tick (N11)
  difficultyEdge?: DifficultyEdge;            // the difficulty's nudge, after the spread (N12.2); absent on Normal
}): MatchResult;

// src/sim/events.ts — event kinds the overlay, stats and FX read
export type MatchEventKind =
  | 'kickoff' | 'set-start' | 'run' | 'break' | 'tackle' | 'big-hit'
  | 'fend' | 'break-tackle' | 'error' | 'penalty' | 'kick'
  | 'try' | 'conversion' | 'penalty-goal'
  | 'field-goal' | 'half-time' | 'full-time'
  | 'sin-bin' | 'sin-bin-return';   // (#71): named for the man binned

// src/sim/events.ts — the result every system reads (season, ladder, stats, overlay)
export interface MatchResult {
  homeScore: number; awayScore: number;
  events: MatchEvent[];                       // t = match minute off the sim clock (0–18)
  stats: { possession: [number, number]; tackles: [number, number];
           errors: [number, number]; tries: [number, number] };
  weather: WeatherKind;
  momentumTimeline: { t: number; value: number }[]; // -100 (away) .. +100 (home)
  injuries: MatchInjury[];                    // matchday applies them at full time
  calls?: { made: [number, number]; paid: [number, number] }; // when any coach call was made (N9.5)
}
```

- **Deterministic:** a match is `{ seed, sheets, calls[], plans[] }` plus the options on
  `runMatch` (weather, length, the AI coach, golden point, the difficulty edge). The same
  inputs give the same match, tick for tick. Any new dice roll reshuffles every seed's
  match, so changes are judged on averages over many seeds (the balance harness,
  `balance/README.md`).
- **One sim, two drivers:** `runMatch` plays to full time headless (fast-forward, the
  balance harness, tests). `LivePlayback` (`src/match/view/`) runs the same `LiveSim` in a
  `Runner` as the player watches, takes the coach's calls, and builds the result with the
  same `MatchRecorder`, so the match on screen is exactly the match that counts.
- **The view's layers.** Each one is told the frame and draws; none of them is the sim.
  `LiveView` draws the bodies and the ball. `popupLayer` draws the shouts. `kickLayer`
  draws a kick's trail, the contest rings and the wide framing. `traitLayer` draws the
  six trait moves. `contestLayer` draws a line-break flash and the dust of a big hit.
  `zoneLayer` draws the bonus-zone glow. `wrestleBar` and `sprintLayer` draw the wrestle
  and the sprint. `commentary` is the DOM ticker, not a drawn layer. The instant replay
  is a second playback of the same seed (`replayRange`), drawn by these layers. It does not
  step the live runner, and nothing it draws is read back by the sim. `legsLayer` is the lab's.
  The DOM overlay (`matchOverlay.ts`) is the scoreboard, the controls and the
  final-whistle actions. The half-time card and the sheets over the field (the pause
  menu with Skip and Save & exit, the calls list) hold the match until they are closed;
  the Replay try chip hides and its count stops under any of them, and under the
  full-time report (#341, #348). While the overlay is up only toasts flagged
  `match: true` show; the rest wait for Back to Club (`src/ui/toasts.ts`, #339).
- **Cost:** a 2 × 9:00 match is 21,600 ticks, about **300 ms** headless in Node after
  N9.1 (BAK-207 §3.5; about 485 ms before that pass). The 0.6 s figure was the
  measurement from before N9.1. Desktop Chromium was about 275 ms after the Phase 3
  pass; N9.1 did not re-measure it. In a browser none of that time runs inside a tap:
  the fast-forwarded match (N10.3) and Skip (N10.4) play in a Worker, a rival round
  does the same when the live setting is on (N9.2), and the match scene's art is painted
  ahead in another (N10.5).
- Callers' sheets are never mutated. The sim only reports injuries; matchday applies
  `injuredWeeks` and announces them with the result at full time.

## 7. Rendering conventions

- Phaser config: `pixelArt: true`, `roundPixels: true`, FIT scale mode, background `#1a1a2e`.
- Iso projection (src/world/iso.ts): `screenX = (gx - gy) * TILE_W/2`,
  `screenY = (gx + gy) * TILE_H/2`; depth = `screenY` (+1 for objects on tile).
- Grounds textures (BootScene → `registerGroundsArt`, `src/art/grounds/`):
  `tile-grass`, `tile-grass-1`, `tile-grass-2`, `tile-dirt`, `tile-path`,
  `tile-highlight-ok`, `tile-highlight-bad`, path/dirt edge overlays, the
  surround, `char-idle-<dir>`, `char-walk-<dir>-<frame>` (dirs n/e/s/w; anims
  `walk-<dir>`), `facility-<defId>-<level>` for levels 1-3 (anchored via `facilityOrigin`; L2 adds awning/annex/props, L3 an extra storey or lit sign, floodlights and flags; gold pips show the level), and decor.
  The boot paints only the facilities placed (N10.6); any other `facility-<defId>-<level>` is
  painted by `ensureFacilityTexture` the moment it is first shown, or by
  `paintFacilitiesWhenIdle` in idle slices after the first frame.
- Build feedback (GitHub #24, `src/world/buildFeedback.ts` pure + `ghostPreview.ts` / `buildFx.ts`
  glue): the placement ghost is the real `facility-<defId>-1` texture, tinted green (valid, solid
  outline) or red (invalid, dashed outline + ✕); a new facility shows ~1.5s of scaffolding + dust,
  then pops in with a squash and stretch and a sparkle; an upgrade flashes scaffolding over the art
  swap. Presentation only (driven off the scene update event; state changes instantly, input is never
  blocked); `prefers-reduced-motion` skips the animations.
- Move and demolish (GitHub #78): the facility popup offers Move (placement mode with that
  facility's ghost at its level; `GROUNDS.MOVE_FEE_RATE` of the build cost, its own spot is a free
  cancel) and Demolish (two taps; `GROUNDS.DEMOLISH_REFUND_RATE` of build + upgrades back). Rules and
  money live in `src/world/placement.ts` (`moveFacility` / `demolishFacility`, ledger reasons
  `move:<id>` / `demolish:<id>`). Demolition plays the construction backwards. GroundsScene re-blocks
  the walk grid from state on every render, steps the manager out of a footprint, and grounds life
  re-plans. A placement bar (`src/ui/placementBar.ts`) explains build/move mode and has Cancel.
- Grounds life (GitHub #23): `src/world/groundsLife.ts` (pure, seeded by season+week)
  plans a capped cast (`MAX_AGENTS`) of squad players, staff and match-week fans
  with looping itineraries; `src/scenes/groundsLife.ts` renders them as sprites that
  A*-walk the scene's `WalkGrid` and sort at layer 2 like the manager. Looks are the
  manager's frames palette-swapped (`src/art/grounds/people.ts`) from the player's
  match look + club kit, one `life-*` strip atlas per distinct look. Presentation only.
- Kit designs (GitHub #79): `GameState.kit` (optional) holds the player's pattern, trim
  and alternate strip. `main.ts` registers it with `setKitDesign` in `src/art/match/kit.ts`,
  and `kitFromColors` consults that registry, so matches (including the away clash
  switch in `resolveKits`, `src/art/match/kitClash.ts`), the crowd, grounds characters and card portraits all wear it
  without knowing about designs. No design = the look derived from the club colours.
  Patterns: plain / v / hoops / sleeves / stripes. Behind `FEATURES.cosmeticKits`.
- Match textures (generated per match in MatchScene from `src/art/match/`, freed
  on shutdown): per-team player sheets `pl-<clubId>[-alt|-clash]` (kit palette-swapped
  from club colours; on a clash the away side switches to its alt strip, or a generated
  clash strip when the alt clashes too, judged on the colours the sprite actually wears,
  #340; every player also stands on a ring in a side colour picked to differ), ball,
  shadows, goalpost parts, the stadium background/foreground layers and crowd.
  `particle-square` comes from `src/fx/particles.ts`. The kit-dependent art (stadium
  layers in 512 px chunks, crowd, the two player atlases; `src/art/match/fixtureArt.ts`)
  is painted ahead (N10.5, #154): after each week, and when a game starts or loads,
  `scenes/matchArtAhead.ts` looks up the player's next fixture and has the art worker
  (`src/art/match/artWorker.ts`) paint it, with the pixel buffers transferred back, then
  uploads it one texture per idle slice. The ground (about 90% of the background, the
  same for every fixture) is painted once, from the title screen, and each background
  starts from a copy of it. One painting is kept, keyed by the field offset and both kits,
  so a kit change or another opponent paints again; nothing is painted during a
  multi-week run or under a match, and an upload that waited out a match waits 1.5 s more.
  `MatchScene.create()` takes it and only places it, then starts the effects and
  playback on the next frame. Not all up yet, a live match shows "Kick-off…" while the
  worker finishes and the rest goes up a texture a frame; the lab paints in place.
- Match atmosphere (GitHub #16, `src/fx/atmosphere.ts` + pure
  `src/art/match/atmosphere.ts`): per-fixture lighting (`day`/`dusk`/`night`,
  hashed from season/round/clubs; finals are night) and the MatchResult's
  weather drive a MULTIPLY light map (depth 70 000), rain haze (70 500),
  additive floodlight/stand glows (71 000), crowd streamers/flashes (72 000) and
  screen-space rain/wind emitters (80 000; splashes on the ground at 9 000).
  Shared `atm-*` textures persist; the per-fixture light map is freed on shutdown.
- Match readability (GitHub #17, `src/world/readability.ts`): default zoom 1.75 (a
  player ≈ 36px tall at 1280×800), eased per beat (tighter at tackles/tries, wider
  for kicks/breaks) until the player zooms by hand; a team-coloured ring under the
  ball carrier; a ~1.5s surname tag over the sprite playback chose for the beat
  (`PlaybackScene.focus`); a flight trail on the ball; and a slim two-line commentary
  ticker with the full log behind a toggle. Stadium layer chunks overlap by 1px so
  fractional zoom can't open a seam. Presentation only — no sim or event changes.
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
