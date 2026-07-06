# BAK-191 — Build core match simulation engine (stat-based RNG)
**Linear:** https://linear.app/bakinglions/issue/BAK-191/build-core-match-simulation-engine-stat-based-rng | **Priority:** Urgent | **Work unit:** WU-6

## Problem
There is no way to resolve a fixture into a scoreline. We need a pure, headless, deterministic simulation that turns two `TeamSheet`s into a full `MatchResult` (score, event log, stats, weather, momentum timeline) per ARCHITECTURE.md §6. Outcomes must be stat-weighted (better teams win more but not always), produce Kairosoft-style variance, and complete in <50ms so the week tick (§5 step 4) can run it synchronously. Weather and momentum are built in the same work unit but specified separately in BAK-198; this spec owns the possession/scoring core and the `TeamSheet` builders, and calls into `src/sim/weather.ts` for the modifiers.

## Proposed solution
Implement `src/sim/engine.ts` (`simulateMatch`, `teamSheetFromSquad`, `teamSheetFromRival`) and `src/sim/events.ts` (event/result type re-exports + small event-builder helpers). The match is simulated as **alternating possessions of 6-tackle sets across 80 sim-minutes**. Each tackle rolls a weighted outcome table (attack-vs-defense differential + momentum + weather mods). A set ends on error/try/penalty/6th-tackle kick; possession alternates. Tries add a conversion attempt; penalties may kick for goal; trailing high-footyIQ teams attempt field goals late. All randomness flows through the seeded RNG (`src/utils/rng.ts`, mulberry32).

## Affected files
- Create `src/sim/engine.ts` — `simulateMatch`, `teamSheetFromSquad`, `teamSheetFromRival`, internal set/tackle loop.
- Create `src/sim/events.ts` — re-exports the §6 `MatchEvent`/`MatchEventKind`/`MatchResult`/`TeamSheet`/`WeatherKind` types as the canonical import site, plus `mkEvent()` builder.
- Modify `src/sim/weather.ts` — provides `rollWeather` + `weatherMods` + momentum helpers (owned by BAK-198; consumed here).
- Test `tests/sim/engine.test.ts` — statistical calibration (≥200 seeded runs) + determinism.
- Test `tests/sim/events.test.ts` — `mkEvent` shape + `teamSheet` builder aggregation.

## Key interfaces & behaviour
Types live in ARCHITECTURE.md §6; `src/sim/events.ts` is the canonical export point:
```ts
export type { WeatherKind, TeamSheet, MatchEventKind, MatchEvent, MatchResult } from './events';
export function mkEvent(t: number, kind: MatchEventKind, teamId: string,
  extra?: Partial<Pick<MatchEvent, 'player' | 'x' | 'y' | 'detail'>>): MatchEvent;
```
Builders:
```ts
export function teamSheetFromSquad(players: Player[], clubId: string,
  name: string, colors: [string, string]): TeamSheet;
export function teamSheetFromRival(club: RivalClub): TeamSheet;
```
`teamSheetFromSquad` aggregation (exclude `injuredWeeks > 0`; use best 13 by overall rating where rating = mean of the five stats):
- `attack`  = mean(speed, skill, footyIQ) over the best 13.
- `defense` = mean(strength, stamina) over the best 13.
- `kicking` = max skill among players whose `position` is `'halfback'` or `'five-eighth'` (fallback: best skill overall if none).
- `fitness` = mean(stamina) over the best 13.
- Morale modifier: multiply attack & defense by `1 + ((meanMorale - 50) / 50) * 0.1` (i.e. ±10% at morale 0/100), clamp results to 1..`STAT_MAX`.

`teamSheetFromRival`: derive all four aggregates from `club.strength` with small deterministic jitter around it (±5, seeded by clubId hash), clamped 1..100; `colors` from `club.colors`.

`simulateMatch(home, away, { seed, weather? })`:
1. `const rng = mulberry32(seed)`. Weather = `opts.weather ?? rollWeather(rng)`.
2. Init `momentum = 0` (+home/−away), `possessing = home`, tack 0, position `fieldX=20` (0=own line,100=opp try-line), scores, stat counters, `events`, `momentumTimeline`.
3. Emit `kickoff`. Loop sim-minutes 0→80 (advance ~`0.5–1.5` min per tackle via rng). Each set:
   - Emit `set-start` (carries possession + `x`). For each tackle 1..6 roll `tackleOutcome(atkDiff, momentum, weatherMods, rng)` from weighted table:
     - **run** (advance 5–15m; emit `run`/`tackle`), **break** (advance 20–40m, emit `break`; if resulting `fieldX≥80` roll try chance scaled by attack → `try`), **error** (turnover, emit `error`, end set), **penalty** (emit `penalty`; if within range & worth it, kick `penalty-goal`), **big-hit** (emit `big-hit`; momentum swing + error chance against carrier).
   - On `try`: +4, emit `try` then conversion attempt (`conversion` success = f(kicking, wind); +2 if good). Reset to kickoff, flip possession.
   - 6th tackle with no score → downfield kick, flip possession, `fieldX` reset near ~30 for receiver.
   - Sample `momentumTimeline.push({ t, value: momentum })` at each set end; decay momentum 10%/set.
4. At minute 40 emit `half-time`; late (t≥75) if margin ≤2 and possessing team `footyIQ`-analog (attack) high → attempt `field-goal` (+1 on success). At 80 emit `full-time`.
5. Build `stats`: possession = share of tackles each side had (rounded %, sums 100); tackles/errors/tries counted from events. Return `MatchResult`.

Determinism: identical `seed` → identical `MatchResult` (deep-equal). No `Date.now`, no `Math.random`.

## Edge cases & risks
- **0-0 avoidance:** if full-time reached with 0-0, force one late try for the team with higher attack (still logged as an event) so ≤2% of runs are 0-0.
- **Possession % must sum to 100** — compute one side, derive the other as `100 - a`.
- **Injured/short squads:** if fit players < 13, use all fit players; if 0 fit, throw `Error('no fit players')` (caller guards via SQUAD_MIN).
- **Perf:** ~80 min × few tackles = a few hundred rng calls; keep allocations low (no per-tackle object spread in hot loop). Must stay <50ms.
- **Momentum/weather coupling:** clamp the combined weight adjustment so base stats stay dominant (detailed caps in BAK-198).
- **Float score bug:** scores are integers only; never push fractional points.

## Acceptance criteria
- [ ] `simulateMatch` returns a `MatchResult` conforming exactly to §6 (all fields populated, events ordered by `t`, first event `kickoff`, last `full-time`).
- [ ] Determinism: same seed twice → deep-equal results (unit test).
- [ ] Two equal 50-rated teams over ≥200 seeded runs: mean total score in 20–50; home win rate 45–55% (test asserts both).
- [ ] 80-rated vs 40-rated over ≥200 runs: strong side wins ≥80% and <100%.
- [ ] ≤2% of ≥200 runs end 0-0.
- [ ] `teamSheetFromSquad` excludes injured players, uses best 13, applies morale modifier, clamps to 1..100 (unit test).
- [ ] A single `simulateMatch` call completes in <50ms (timed assertion).

## Out of scope
Weather roll/modifier tables and momentum tuning constants (BAK-198 — same WU, separate file). Visual playback (BAK-194), overlay/commentary (BAK-196), ladder application (WU-7 fixtures). Substitutions, sin-bins, individual player fatigue curves.
