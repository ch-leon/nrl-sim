# BAK-184 — Generate season fixture list and ladder
**Linear:** https://linear.app/bakinglions/issue/BAK-184/generate-season-fixture-list-and-ladder | **Priority:** Urgent | **Work unit:** WU-7

## Problem
The season needs a 16-club league (player club + 15 fictional rivals), a full
`SEASON_ROUNDS` (24) home-and-away fixture list with no duplicate or missing
matchups, a ladder that updates after every result, a top-8 finals series in weeks
25–27, and screens to view fixtures (upcoming + past results) and the ladder.
Rival-vs-rival matches must be simulated cheaply from strength ratings each round.

## Proposed solution
Add the 15 fictional rival clubs as data (`src/data/league.ts`) and the fixture +
ladder logic (`src/systems/fixtures.ts`). Fixtures use the circle (round-robin)
method: 15 all-play-all rounds, then rounds 1–9 mirrored with venues flipped, for
24 rounds. `applyResult` updates the ladder; `simulateRivalRound` resolves the
non-player games from `RivalClub.strength`. Finals (top 8, QF/SF/GF knockout) run
weeks 25–27; a premiership records history and grants reputation. Uses `Fixture`,
`LadderRow`, `LeagueState`, `RivalClub` from `src/core/state.ts` (§4) and the
seeded `Rng` (BAK-166).

## Affected files
- Create: `src/data/league.ts`
- Create: `src/systems/fixtures.ts`
- Create: `src/ui/screens/fixtures.ts`
- Test: `tests/systems/fixtures.test.ts`

## Key interfaces & behaviour
`src/data/league.ts` — 15 invented Aussie clubs (no real NRL names/trademarks),
each with two hex kit colours and `strength` spread 35–85:
```ts
import type { RivalClub } from '../core/state';
// e.g. Redcliffe Reapers, Woolloomooloo Wolves, Toowoomba Thunder, Parramatta-free
// invented names. 15 entries; ids like 'rival-reapers'. Player club is the 16th,
// added by state.ts as { id:'player', ... } — NOT included here.
export const RIVAL_CLUBS: readonly RivalClub[];
```
Colours are cosmetic; `strength` seeds rival team sheets and cheap-sim outcomes.

`src/systems/fixtures.ts`:
```ts
import type { GameState, Fixture, LadderRow } from '../core/state';
import type { Rng } from '../utils/rng';
import { SEASON_ROUNDS } from '../config';

// Circle method over 16 club ids → 15 rounds all-play-all, then rounds 1..9
// mirrored (home/away swapped) appended as rounds 16..24. Returns 24×8 = 192 fixtures.
export function generateFixtures(clubIds: string[], rng: Rng): Fixture[];

// Apply a completed result to the ladder: 2 pts win, 1 draw, 0 loss; accumulate
// pointsFor/Against, played/wins/draws/losses. Then re-sort ladder by
// points → (pointsFor − pointsAgainst) → pointsFor, all descending.
export function applyResult(
  state: GameState, fixture: Fixture,
  result: { homeScore: number; awayScore: number },
): GameState;

// The player club's fixture for the current week/round (or undefined on a bye/finals-skip).
export function getCurrentFixture(state: GameState, clubId: string): Fixture | undefined;

// Cheap-sim every non-player fixture in the current round from strength ratings and
// apply results to the ladder. Score ≈ f(strengthDiff) + rng noise; deterministic.
export function simulateRivalRound(state: GameState, rng: Rng): GameState;

// Finals (weeks 25..27): top-8 knockout QF → SF → GF. Player participates only if
// qualified (ladder position ≤ 8); if eliminated/absent those weeks auto-skip.
// A premiership win pushes history and grants +15 reputation.
export function runFinals(state: GameState, rng: Rng): GameState;
```
Behaviour details:
- **Completeness:** each ordered pair `(home,away)` where the round-robin says so
  appears exactly once; over the 24 rounds every club plays every other twice
  (once home, once away for the mirrored 1–9 pairings; the remaining rounds 10–15
  give the single reverse). Guarantee: no club plays twice in one round, no
  self-fixtures, 8 fixtures per round.
- **Cheap sim (`simulateRivalRound`):** for home H vs away A,
  `base = 12 + (H.strength − A.strength) × 0.2`, `homeScore = clamp(round(base + rng noise), 0, ..)`,
  symmetric for away using `A.strength − H.strength` and a small home advantage
  (+2 to home base). Noise via `rng.int(0, 12)` per side. Draws allowed.
- **Ladder position:** derived from sorted `state.league.ladder` index (1-based).
- **Finals bracket:** QF = seeds (1v8,2v7,3v6,4v5); SF = QF winners re-seeded by
  ladder rank; GF = SF winners. Each tie resolved by `simulateMatch` for player
  games (handed to MatchScene by the orchestrator) or cheap-sim for rival-only ties.
- **Integration note:** the player's own match each round is run by the orchestrator
  (WU-12); this ticket only exposes `getCurrentFixture` + `applyResult` and simulates
  the rival games. `simulateRivalRound` is registered inside the match tick hook
  (order 40) alongside the player match.

`src/ui/screens/fixtures.ts` — two DOM tabs:
- **Fixtures:** round-by-round list; each fixture shows both club names, colours,
  and score if `result` present ("R7 · Reapers 18–12 Wolves"). The player club's
  fixtures are highlighted. Past results and upcoming rounds both shown.
- **Ladder:** table of `LadderRow`s (pos, club, P, W, D, L, PF, PA, diff, Pts),
  sorted as `applyResult` sorts; the player row is highlighted.

## Edge cases & risks
- 16 clubs is even → no byes in the regular season; every round has 8 fixtures.
- Ladder tie-break must be stable and total (points, then diff, then PF) — tested.
- Finals auto-skip when player not in top 8: those weeks advance without a MatchScene.
- Rival names must avoid real NRL club names/trademarks — invented Aussie flavour only.
- `generateFixtures` must be order-independent w.r.t. the input id list for coverage,
  but deterministic given `rng` for any home/away tie-breaking.

## Acceptance criteria
- [ ] `generateFixtures` yields exactly `SEASON_ROUNDS` (24) rounds, 8 fixtures each,
      no self-fixtures, no club twice in a round.
- [ ] Every club plays every other club exactly twice across the season, once at
      each venue for the mirrored pairings (completeness/no-dupes test).
- [ ] `applyResult` awards 2/1/0 points and re-sorts by points → diff → PF.
- [ ] Ladder reflects results correctly after a full simulated round.
- [ ] `RIVAL_CLUBS` has 15 entries, invented names, `strength` within 35–85.
- [ ] Finals bracket seeds top 8 as QF(1v8…4v5) → SF → GF; premiership adds a
      `history` entry and +15 reputation.
- [ ] Fixtures screen shows past results and upcoming rounds; ladder highlights the
      player row.

## Out of scope
- The player's own match simulation/playback (WU-6 engine, WU-12 orchestration).
- Building rival `TeamSheet`s for full `simulateMatch` (only cheap-sim here).
- Multi-season fixture regeneration wiring (`resetForNewSeason`, state.ts).
