# BAK-176 — Build week/season tick system
**Linear:** https://linear.app/bakinglions/issue/BAK-176/build-weekseason-tick-system | **Priority:** Urgent | **Work unit:** WU-4

## Problem
Time progression drives the whole game loop. Pressing "Advance Week" must run the
per-week systems in a **fixed, deterministic order** (ARCHITECTURE §5 pipeline),
roll the season over at the right point, support fast-forwarding multiple weeks,
and expose ordered hooks so each system (training, injuries, economy, match,
ladder, free agency, autosave) registers its own logic without `time.ts` knowing
their internals. No race conditions or order-of-operation bugs.

## Proposed solution
Implement `src/core/time.ts` as an ordered, synchronous hook registry plus
`advanceWeek`/`advanceWeeks` and season rollover. `time.ts` owns *ordering and
counters only*; the actual per-system work lives in the registered hook fns
(added by their own work units). It reads/writes counters via the `state.ts`
store (BAK-172) and emits `week:advanced` / `season:ended` on the bus (§5).

## Affected files
- Create: `src/core/time.ts`
- Test: `tests/core/time.test.ts`

## Key interfaces & behaviour
```ts
export type TickHook = (ctx: TickContext) => void;      // synchronous
export interface TickContext {
  week: number; season: number;
  fastForward: boolean;   // true inside advanceWeeks() -> hooks auto-sim, skip playback
}

// Fixed order constants (ARCHITECTURE §5 pipeline):
export const TICK_ORDER = {
  training: 10, injuries: 20, economy: 30, match: 40,
  ladder: 50, freeagents: 60, autosave: 90,
} as const;

// Register a weekly hook. `order` ascending = execution order. Stable for ties
// (insertion order). Duplicate `name` replaces the prior registration.
export function registerTickHook(name: string, order: number, fn: TickHook): void;
export function unregisterTickHook(name: string): void;
export function clearTickHooks(): void;                  // test helper

// Season-rollover hooks, a SEPARATE registry run only at rollover, ascending order.
export type SeasonHook = (ctx: { season: number }) => void;
export function registerSeasonHook(name: string, order: number, fn: SeasonHook): void;
export function unregisterSeasonHook(name: string): void;
export function clearSeasonHooks(): void;

export function advanceWeek(): void;
export function advanceWeeks(n: number): void;           // fast-forward, auto-sim
```
`advanceWeek()` (single, interactive):
1. Read `{ week, season }` from `getState()`.
2. Run all tick hooks in ascending `order` with
   `ctx = { week, season, fastForward: false }`. Ties broken by insertion order.
   Execution is synchronous and sequential — no `await`, no `setTimeout` — so the
   §5 order (training→injuries→economy→match→ladder→freeagents→autosave) is exact.
3. Compute `nextWeek = week + 1`. If `nextWeek > WEEKS_PER_SEASON` (import from
   `../config`) → perform season rollover (below); else `setState({ week: nextWeek })`.
4. Emit `week:advanced` `{ week: <new week>, season: <new season> }` **last**
   (matches §5 step 8; autosave hook at order 90 already ran in step 2).

Season rollover (invoked from step 3 when `nextWeek > WEEKS_PER_SEASON`):
- Call `resetForNewSeason()` (state.ts) → increments `season`, sets `week = 1`.
- Run all season hooks in ascending order with `{ season: <new season> }`. These
  hooks own the real work: ageing (+1), contract decrement, new fixtures, history
  push — each lives in its system's WU, registered via `registerSeasonHook`.
- Emit `season:ended` `{ season: <ended season>, ladderPosition, premiership }`.
  `ladderPosition`/`premiership` are read from state/league (default
  `ladderPosition: 0`, `premiership: false` if league not yet populated in WU-7).

`advanceWeeks(n)` (fast-forward):
- Loops `advanceWeek()` `n` times, but sets `fastForward: true` in the tick
  context so the match hook auto-sims instead of handing off to `MatchScene`.
  Because `advanceWeek` reads `fastForward` from a module flag, `advanceWeeks`
  sets it before the loop and restores it after (try/finally). `n <= 0` is a no-op.

## Edge cases & risks
- **Ordering is the core invariant.** Tests must assert hooks fire strictly in
  ascending `order`, with insertion-order tie-breaking, and that a hook cannot
  observe a later hook's mutation (sequential, synchronous).
- Rollover boundary: advancing at `week === WEEKS_PER_SEASON` must land on
  `week === 1`, `season + 1`, and fire season hooks exactly once.
- Re-registering a hook `name` replaces (not duplicates) — prevents double-apply
  of training gains after hot-reload or re-init.
- `fastForward` must be restored even if a hook throws (try/finally) to avoid a
  stuck fast-forward flag.
- Hooks are synchronous by contract; a hook that needs async work (e.g. match
  playback) must instead enqueue for the scene and return — never block the tick.
- Emitting `week:advanced` before hooks would let subscribers read stale state;
  it is emitted **after** all hooks, deliberately.

## Acceptance criteria
- [ ] `advanceWeek()` runs registered tick hooks in ascending `order`
      (training=10 … autosave=90), verified by an execution-order log.
- [ ] Tie-ordered hooks (same `order`) run in insertion order.
- [ ] Re-registering an existing hook name replaces it (no duplicate execution).
- [ ] Advancing from `week === WEEKS_PER_SEASON` sets `week=1`, `season+1`, runs
      season hooks once, emits `season:ended` then continues.
- [ ] `week:advanced` is emitted after all tick hooks with the post-tick counters.
- [ ] `advanceWeeks(n)` advances exactly `n` weeks with `fastForward:true` in ctx;
      `advanceWeeks(0)` and negatives are no-ops.
- [ ] `fastForward` flag is restored after `advanceWeeks` even if a hook throws.
- [ ] No hook can observe a later hook's state mutation (synchronous sequencing).

## Out of scope
- The actual bodies of training/injury/economy/match/ladder/free-agency hooks
  (their own WUs register them; this ticket only provides the registry + counters).
- Match playback pacing / MatchScene handoff (WU-11/12).
- Fixture generation and ladder population (WU-7).
