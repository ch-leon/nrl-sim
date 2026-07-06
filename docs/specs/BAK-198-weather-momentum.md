# BAK-198 — Add weather and momentum systems to match sim
**Linear:** https://linear.app/bakinglions/issue/BAK-198/add-weather-and-momentum-systems-to-match-sim | **Priority:** Medium | **Work unit:** WU-6

## Problem
The core engine (BAK-191) needs environmental and momentum modifiers to make matches feel dynamic without letting them dominate base stats. We need: a weather roll (clear/rain/wind), weather effects on errors/breaks/kicking, and a momentum meter that swings on tries/big-hits/errors and temporarily boosts the leading side. Effects must be balanced — a maxed-out modifier is worth roughly a handful of rating points, never enough to flip a lopsided match. This is the same work unit as BAK-191 (WU-6) and is built alongside it; this spec owns `src/sim/weather.ts` and the momentum helpers the engine calls.

## Proposed solution
Add `src/sim/weather.ts` with a pure `rollWeather`, a `weatherMods(weather)` lookup returning multiplicative modifiers, and momentum helpers (`applyMomentumEvent`, `decayMomentum`, `momentumWeightMod`). The engine imports these and applies them inside its tackle/scoring loop and per-set momentum sampling. `MatchResult.momentumTimeline` is populated by the engine using these helpers. The fixtures/tick integration rolls `state.weather` for the player's round (one-line boundary noted below; owned by WU-7).

## Affected files
- Create `src/sim/weather.ts` — `rollWeather`, `weatherMods`, momentum helpers + constants.
- Modify `src/sim/engine.ts` (BAK-191, same WU) — call the above in the tackle table, conversion/penalty-goal success, and per-set momentum decay/sampling.
- Modify `src/systems/fixtures.ts` (WU-7 boundary — ONE line) — in the tick pipeline, set `state.weather = rollWeather(rng)` for the current round before match sim. If unable to touch, report BLOCKED for that line only.
- Test `tests/sim/weather.test.ts` — statistical weather/momentum effects + bounds.

## Key interfaces & behaviour
```ts
export type WeatherKind = 'clear' | 'rain' | 'wind';

// 60% clear / 25% rain / 15% wind, via the seeded rng.
export function rollWeather(rng: () => number): WeatherKind;

export interface WeatherMods {
  errorMult: number;        // multiplies base error chance
  breakMult: number;        // multiplies base break chance
  kickSuccessMult: number;  // multiplies conversion & penalty-goal success prob
  kickDistanceMult: number; // scales downfield kick distance
}

export function weatherMods(w: WeatherKind): WeatherMods;
```
Modifier table (exact):
```ts
clear: { errorMult: 1.0,  breakMult: 1.0,  kickSuccessMult: 1.0,  kickDistanceMult: 1.0  }
rain:  { errorMult: 1.5,  breakMult: 0.8,  kickSuccessMult: 1.0,  kickDistanceMult: 1.0  }
wind:  { errorMult: 1.0,  breakMult: 1.0,  kickSuccessMult: 0.75, kickDistanceMult: 1.15 } // distance ±15%: engine also randomly applies 0.85 on some kicks
```
Wind distance is applied as ±15% (engine rolls direction per kick using rng; magnitude 0.15). Rain never affects kicking; wind never affects errors — keeps effects orthogonal and testable.

Momentum (`momentum` scalar −100..+100, + = home):
```ts
export const MOMENTUM_MIN = -100, MOMENTUM_MAX = 100;
export const MOMENTUM_TRY = 30, MOMENTUM_BIGHIT = 15, MOMENTUM_ERROR = 10;
export const MOMENTUM_DECAY = 0.1;          // 10% toward 0 per set
export const MOMENTUM_MAX_WEIGHT_PCT = 0.08; // ±8% max on outcome weights

// Returns new momentum after an event, clamped to [-100, 100].
// homeTeam=true means the acting team is home. try/bigHit push toward the actor;
// error pushes AGAINST the actor.
export function applyMomentumEvent(m: number, kind: 'try'|'big-hit'|'error',
  actorIsHome: boolean): number;

export function decayMomentum(m: number): number; // m * (1 - MOMENTUM_DECAY)

// Convert momentum into a multiplicative weight nudge for the team in possession.
// At momentum ±100 the possessing side's favourable-outcome weight shifts by ±8%
// (≈ 8 rating points), so base stats stay dominant.
export function momentumWeightMod(m: number, possIsHome: boolean): number;
```
Engine usage: multiply error chance by `errorMult`, break chance by `breakMult`; conversion/penalty-goal success prob by `kickSuccessMult`; downfield kick distance by `kickDistanceMult` (× wind ±15% roll). Apply `momentumWeightMod` to the run/break vs error split. After each set: `momentum = decayMomentum(momentum)` then push `{ t, value: momentum }` to `momentumTimeline`. On try/big-hit/error events call `applyMomentumEvent`.

**Fixtures boundary (one line):** `state.weather = rollWeather(rng)` in the WU-7 tick pipeline; the engine still accepts `opts.weather` and falls back to its own roll when omitted (auto-simmed rival-vs-rival matches).

## Edge cases & risks
- **Momentum clamp:** `applyMomentumEvent` must clamp to [−100, 100] — repeated tries cannot exceed the cap (unit test).
- **Balance regression:** momentum + weather combined must not flip win rates for equal teams outside 45–55%; the cap (8%) plus orthogonal weather is the guard. Statistical test required.
- **Weather distribution drift:** `rollWeather` split must hold ~60/25/15 over many rolls (allow ±5% tolerance in test over ≥1000 rolls).
- **Determinism:** all rolls via the passed `rng`; no `Math.random`. Same seed → same weather & momentum timeline.
- **Sign convention bug:** error pushes momentum against the actor — double-check sign in tests for both home and away actors.

## Acceptance criteria
- [ ] `rollWeather` yields ~60/25/15 clear/rain/wind over ≥1000 seeded rolls (±5%).
- [ ] Over ≥200 runs, rain raises mean errors ≥20% vs clear (same seeds/teams).
- [ ] Over ≥200 runs, wind lowers conversion success rate ≥15% vs clear.
- [ ] `momentum` never exceeds ±100 across a full sim (asserted over ≥200 runs).
- [ ] Equal-team home win rate stays 45–55% under clear, rain, AND wind (three assertions).
- [ ] `MatchResult.momentumTimeline` has one sample per set, values within [−100, 100], last decayed toward 0.
- [ ] `state.weather` is set for the player's round by fixtures tick (integration note; verified in WU-7 tests, not here).

## Out of scope
Visual weather rendering (rain/particles) and the UI weather badge live in the overlay (BAK-196) and playback (BAK-194); this spec is sim-logic only. Seasonal weather patterns, temperature, and ground-condition persistence across rounds.
