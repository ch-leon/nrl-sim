# BAK-196 — Build score, stats overlay and commentary feed
**Linear:** https://linear.app/bakinglions/issue/BAK-196/build-score-stats-overlay-and-commentary-feed | **Priority:** High | **Work unit:** WU-12

## Problem
During match playback (BAK-194) the player sees dots move but has no scoreboard, live stats, or commentary. We need a DOM overlay (per ARCHITECTURE.md §6 DOM-UI rule) shown only in the Match scene: a top scoreboard (names, kit colours, score, clock, half), a collapsible stats panel (possession %, tackles, errors), and a bottom scrolling commentary feed driven by an event-based template pool. The overlay must derive its running score/stats purely from the `'match:event'` re-emissions and land exactly on `MatchResult.stats` at full-time.

## Proposed solution
Add `src/ui/screens/matchOverlay.ts` (DOM overlay, mounted into `#ui-root` when the Match scene starts, removed on `match:finished`/scene exit) and `src/sim/commentary.ts` (pure `commentaryFor(event, homeName, awayName, rng)` with ≥4 template variants per `MatchEventKind`, player-name interpolation, Aussie footy flavour). The overlay subscribes to `'match:event'`, incrementally accumulates score/stats, updates the DOM, and appends commentary lines. Commentary variant selection is deterministic via a seeded rng for testability.

## Affected files
- Create `src/ui/screens/matchOverlay.ts` — overlay mount/teardown + event accumulator + render.
- Create `src/sim/commentary.ts` — pure `commentaryFor` + template pool (no Phaser, no DOM).
- Modify `src/main.ts` (orchestrator-owned) — mount overlay on entering `'Match'`, unmount on leaving. If unable to touch, report BLOCKED for that line only.
- Reuse `src/ui/dom.ts` (`panel`, `button`, mount helpers), `src/core/events.ts` (`bus`).
- Test `tests/sim/commentary.test.ts` — variant count, interpolation, determinism.
- Test `tests/ui/matchOverlayAccumulator.test.ts` — pure accumulator vs a full `simulateMatch` run.

## Key interfaces & behaviour
Commentary (pure):
```ts
export function commentaryFor(ev: MatchEvent, homeName: string, awayName: string,
  rng: () => number): string;
```
- A `Record<MatchEventKind, string[]>` with **≥4 templates each**. Placeholders `{player}` (from `ev.player`, fallback "the winger"/generic), `{team}` (home/away name from `ev.teamId`). Examples: try → `"{player} busts through the line!"`, `"TRY! {player} plants it down for {team}!"`; big-hit → `"Bone-rattler from {player}!"`, `"{player} lines him up and CRUNCH!"`; error → `"{player} spills it — turnover!"`; break → `"{player} breaks the line!"`. Aussie flavour throughout.
- Variant chosen via `rng()` index into the kind's array → deterministic for a given seed. Some low-signal kinds (`set-start`, `kickoff`) may return `''` to avoid feed spam (still ≥4 non-empty for scoring/impact kinds).

Overlay + accumulator: extract the accumulator as a pure reducer so it is unit-testable independent of the DOM:
```ts
export interface LiveState {
  homeScore: number; awayScore: number;
  possessionTicks: [number, number];  // set-start counts → normalized to % at render
  tackles: [number, number]; errors: [number, number]; tries: [number, number];
  minute: number; half: 1 | 2;
}
export function initLiveState(): LiveState;
// Pure: fold one event into running state (score from try/conversion/penalty-goal/field-goal,
// tackles/errors/tries from their events, possession from set-start's teamId, minute/half from t).
export function reduceEvent(s: LiveState, ev: MatchEvent, homeId: string): LiveState;
```
Scoring in `reduceEvent`: `try` +4, `conversion` +2 (only when it represents a successful conversion — engine emits `conversion` only on success), `penalty-goal` +2, `field-goal` +1, to the side matching `ev.teamId===homeId`. `half` = `ev.t < 40 ? 1 : 2` (flip on `half-time`). Possession % at render = `possessionTicks[i] / sum * 100` rounded (0/0 → 50/50).

DOM structure (into `#ui-root`, `.match-overlay`):
- **Scoreboard** (top-centre): two team chips (name + `colors[0]` swatch), big score `H – A`, clock `MM:SS` derived from `minute`, half indicator, weather badge from `result.weather`.
- **Stats panel** (collapsible via a toggle button): possession % bar, tackles made [h,a], errors [h,a].
- **Commentary feed** (bottom): latest **6** messages, newest at bottom, auto-scroll; each new non-empty `commentaryFor` line appended.

Wiring: on mount, `initLiveState()`, subscribe `bus.on('match:event', ev => { state = reduceEvent(state, ev, homeId); render(); const line = commentaryFor(ev, homeName, awayName, rng); if (line) appendCommentary(line); })`. Seed the commentary rng deterministically (e.g. from the match seed / `result` hash) so replays read identically. On `bus.on('match:finished')` (or scene exit): unsubscribe, remove DOM. Full-time `LiveState` MUST equal `MatchResult.stats` + final score.

## Edge cases & risks
- **Accumulator ↔ MatchResult parity:** the unit test folds every event of a real `simulateMatch` run through `reduceEvent` and asserts final score == `result.homeScore/awayScore` and stats == `result.stats` (possession within rounding). This is the core correctness guard.
- **Conversion semantics:** engine emits `conversion` only on success (per BAK-191) — do NOT also add points on `try`'s conversion attempt separately. Confirm against engine; if engine emits conversion-miss events, gate on `ev.detail`/success flag.
- **Duplicate subscriptions / leaks:** unsubscribe exactly the handlers added; guard against mounting twice (idempotent mount).
- **Overlay only in Match scene:** must not appear over Grounds; teardown on `match:finished` and on manual 'Back to Club'.
- **Determinism:** commentary uses the passed rng only; no `Math.random`, so tests are stable.
- **Clock display:** derive `MM:SS` from sim minute (e.g. minute 40 → `40:00`); clamp to 80:00 at full-time.

## Acceptance criteria
- [ ] Scoreboard shows both team names, kit colours, live score, clock, half, and weather; updates in real time as `'match:event'` fires.
- [ ] Stats panel shows possession %, tackles, errors and is collapsible.
- [ ] Commentary feed shows the latest 6 event-based messages, auto-scrolls, varied and contextual (player-name interpolated).
- [ ] `commentaryFor` has ≥4 template variants per scoring/impact `MatchEventKind`; selection deterministic per seed (unit test).
- [ ] Accumulator test: folding a full `simulateMatch` event log yields final score & stats identical to `MatchResult` (unit test).
- [ ] Overlay mounts only in the Match scene and is removed on `match:finished`/exit.

## Out of scope
Sprite/ball animation, camera, playback pacing (BAK-194 — same WU, separate file). Audio cues (BAK-200), particles (BAK-201). Post-match summary screen, player ratings, MOTM. Match seed/rng plumbing beyond reading what playback/scene provide.
