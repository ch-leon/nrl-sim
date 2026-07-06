# BAK-194 — Animate pixel players during match playback
**Linear:** https://linear.app/bakinglions/issue/BAK-194/animate-pixel-players-during-match-playback | **Priority:** High | **Work unit:** WU-12

## Problem
`MatchScene` (BAK-189) can render a field and dots, and `simulateMatch` (BAK-191) produces a `MatchResult` with a timed event log, but nothing drives the sprites over time. We need a controller that consumes `MatchResult.events`, schedules them on a compressed clock, moves/animates the player dots and ball to each event's field position, plays try/tackle/big-hit beats, and re-emits each event on the bus so the overlay (BAK-196) and later audio/particles can react. Playback is presentation-only: state (ladder) is already updated by the tick pipeline before the scene starts.

## Proposed solution
Add `src/world/playback.ts` exporting `PlaybackController(scene, result)`. It maps each `MatchEvent` to a scheduled real-time offset (80 sim-minutes → ~90 real seconds), and on each firing: tweens the ball to the event's `x/y` via `scene.fieldToWorld`, shifts the two formation lines toward ball x, plays the beat for the event kind (try sprint + bounce, big-hit/tackle converge + camera shake, half/full-time pause), and re-emits the event as `'match:event'` on the bus. Speed toggle (×1/×2/×4) scales the clock; 'Skip' jumps to full-time. Emits `'match:finished'` at the end.

## Affected files
- Create `src/world/playback.ts` — `PlaybackController` class + pure scheduling helpers.
- Modify `src/scenes/MatchScene.ts` (BAK-189, same WU-12 extension) — instantiate `PlaybackController` in `create()`, call `controller.update(delta)` from scene `update`, add DOM speed/skip controls (or delegate to overlay BAK-196).
- Reuse `src/core/events.ts` (`bus`), `src/scenes/MatchScene.ts` `fieldToWorld`, `src/world/camera.ts` (shake).
- Test `tests/world/playback.test.ts` — pure scheduling helpers (event→time mapping, skip, speed) with a fake scene.

## Key interfaces & behaviour
Clock: `SIM_MINUTES = 80`, `REAL_SECONDS_AT_1X = 90`. Real ms for a sim minute at 1×: `(REAL_SECONDS_AT_1X * 1000) / SIM_MINUTES`.
```ts
export type PlaybackSpeed = 1 | 2 | 4;

// Pure: real-ms offset from kickoff for an event at sim-minute t, at the given speed.
export function eventTimeMs(t: number, speed: PlaybackSpeed): number {
  return (t / SIM_MINUTES) * REAL_SECONDS_AT_1X * 1000 / speed;
}

export class PlaybackController {
  constructor(scene: MatchScene, result: MatchResult);
  update(deltaMs: number): void;   // advance clock, fire due events (called from scene.update)
  setSpeed(speed: PlaybackSpeed): void;
  skip(): void;                    // fire all remaining events instantly, jump to full-time
  get finished(): boolean;
}
```
Scheduling: keep events sorted by `t`; maintain `clockMs` accumulator and a `cursor` index. Each `update(deltaMs)` adds `deltaMs * speed` to `clockMs`, then fires every event whose `eventTimeMs(t, 1)` (base scale; speed applied to clock, not per-event) ≤ `clockMs` in order. `setSpeed` changes the accumulation rate only (already-fired events unaffected). `skip` fires all remaining events synchronously (no tweens; snap sprites), then triggers full-time.

Per-event firing (`fire(ev)`):
1. `bus.emit('match:event', ev)` FIRST (so overlay/score update in lockstep).
2. If `ev.x`/`ev.y` present: `const w = scene.fieldToWorld(ev.x, ev.y);` tween `scene.ball` to `w` (duration scaled by speed). Shift formation lines toward `w.x` (ease each dot's target x by a fraction toward ball x, keep width spread).
3. Beat by `ev.kind`:
   - `try`: pick the acting team's nearest dot as scorer, tween it sprinting to the in-goal (`fieldToWorld(ev.teamId===home?100:0, ev.y ?? 50)`), then a brief vertical bounce tween (celebration).
   - `big-hit` / `tackle`: converge the two nearest opposing dots on the ball position; small camera shake via `scene.cameras.main.shake(120, 0.004)` (big-hit stronger than tackle).
   - `half-time`: pause the clock (`paused=true`) ~1.5s real, then resume; `full-time`: pause permanently, emit finish.
   - others (`run`/`break`/`error`/`kickoff`/`set-start`/`conversion`/`penalty`/`penalty-goal`/`field-goal`): ball/formation move only.
4. When `full-time` fires or `skip()` completes: `bus.emit('match:finished', { fixture, result })` and set `finished`.

**State/ladder note (explicit):** playback is presentation-only. The ladder/result is applied ONLY via the existing `applyResult` call in the WU-7 fixtures tick pipeline, which runs BEFORE `MatchScene` starts. `PlaybackController` MUST NOT mutate `GameState`, call `setState`, or touch fixtures — it only reads `result` and emits bus events. Re-running/replaying playback must not double-count anything.

## Edge cases & risks
- **Overlay accumulator sync:** emit `'match:event'` before moving sprites so BAK-196's running score never lags the visual (AC: playback matches the event log).
- **Skip correctness:** skip must still emit every `'match:event'` (in order) so the overlay reaches the exact full-time score/stats, then `'match:finished'` exactly once.
- **Double-finish:** guard so `'match:finished'` fires exactly once (skip vs natural full-time race).
- **Tween overlap:** killing/replacing in-flight tweens on rapid events (speed ×4) — retarget existing tween rather than stacking.
- **No Phaser in helpers:** `eventTimeMs`/ordering are pure and unit-tested; the class is manual/preview QA (§8). Tests use a minimal fake `scene` (stubbed `fieldToWorld`, `tweens.add`, `cameras`).
- **Events without x/y:** half/full-time, some set-start — skip sprite movement, still emit.

## Acceptance criteria
- [ ] Visual playback fires every event in `MatchResult.events` in `t` order, re-emitted as `'match:event'` (unit test on scheduling with a fake scene).
- [ ] Player dots animate smoothly between formation positions; ball tweens to each event's field position.
- [ ] `try` produces a scorer sprint to in-goal + celebration bounce; `big-hit`/`tackle` produce a converge + camera shake.
- [ ] Speed toggle ×1/×2/×4 scales pacing; 'Skip' jumps to full-time having emitted all events, then emits `'match:finished'` once.
- [ ] Full clock is ~90s at ×1 (80 sim-min compressed); `eventTimeMs` unit-tested.
- [ ] Controller never mutates `GameState`/ladder (asserted: no `setState` import/use).

## Out of scope
Scoreboard/stats/commentary DOM (BAK-196 — same WU, separate file). Audio (BAK-200), particles (BAK-201). Realistic gameplay pathing/A* on the field (dots use direct tweens). Field rendering & `fieldToWorld` (BAK-189).
