// src/core/time.ts — week/season tick system (BAK-176, WU-4).
//
// Owns ORDERING and COUNTERS only. The real per-system work (training, injuries,
// economy, match, ladder, free agency, autosave) lives in hook functions that
// each system registers via registerTickHook / registerSeasonHook. time.ts never
// knows their internals. See ARCHITECTURE §5 (fixed week-tick pipeline order).
//
// Pure TypeScript, no Phaser. Execution is synchronous and sequential — no
// await, no setTimeout — so pipeline order is exact and no hook can observe a
// later hook's mutation.

import { getState, setState, resetForNewSeason } from './state';
import { bus } from './events';
import { WEEKS_PER_SEASON } from '../config';

// ── Public hook contracts ──────────────────────────────────────────────────

/** A weekly tick hook. Synchronous by contract — never block the tick. */
export type TickHook = (ctx: TickContext) => void;

export interface TickContext {
  week: number;
  season: number;
  /** true inside advanceWeeks() — hooks auto-sim and skip scene playback. */
  fastForward: boolean;
}

/** A season-rollover hook. Runs only at rollover, after counters are bumped. */
export type SeasonHook = (ctx: { season: number }) => void;

/**
 * Fixed order constants for the §5 pipeline. Ascending `order` = execution
 * order. Systems register with these so the sequence is stable regardless of
 * registration timing.
 */
export const TICK_ORDER = {
  training: 10,
  injuries: 20,
  economy: 30,
  match: 40,
  ladder: 50,
  freeagents: 60,
  autosave: 90,
} as const;

// ── Registries ─────────────────────────────────────────────────────────────
//
// Each entry keeps `order` (primary sort key), `seq` (monotonic insertion
// counter for stable tie-breaking) and the fn. Keyed by `name` so re-registering
// a name replaces its prior entry (prevents double-apply after hot-reload).

interface TickEntry {
  name: string;
  order: number;
  seq: number;
  fn: TickHook;
}

interface SeasonEntry {
  name: string;
  order: number;
  seq: number;
  fn: SeasonHook;
}

const tickHooks = new Map<string, TickEntry>();
const seasonHooks = new Map<string, SeasonEntry>();

/**
 * Monotonic insertion counter for stable tie-breaking. A single shared counter
 * keeps `seq` unique and strictly increasing across every registration call;
 * each registry still sorts by its own entries' seq.
 */
let seqCounter = 0;

/**
 * Module flag consulted by advanceWeek() to fill ctx.fastForward. advanceWeeks()
 * sets it before its loop and restores it after (try/finally) so a thrown hook
 * cannot leave fast-forward stuck on.
 */
let fastForwardFlag = false;

// ── Tick hook registry API ─────────────────────────────────────────────────

/**
 * Register (or replace) a weekly hook. Ascending `order` is execution order;
 * ties break by insertion order. Re-registering an existing `name` replaces it.
 */
export function registerTickHook(name: string, order: number, fn: TickHook): void {
  tickHooks.set(name, { name, order, seq: seqCounter++, fn });
}

export function unregisterTickHook(name: string): void {
  tickHooks.delete(name);
}

/** Test helper: drop all tick hooks. */
export function clearTickHooks(): void {
  tickHooks.clear();
}

// ── Season hook registry API ───────────────────────────────────────────────

/**
 * Register (or replace) a season-rollover hook. Ascending `order`, insertion
 * order for ties. Re-registering an existing `name` replaces it.
 */
export function registerSeasonHook(name: string, order: number, fn: SeasonHook): void {
  seasonHooks.set(name, { name, order, seq: seqCounter++, fn });
}

export function unregisterSeasonHook(name: string): void {
  seasonHooks.delete(name);
}

/** Test helper: drop all season hooks. */
export function clearSeasonHooks(): void {
  seasonHooks.clear();
}

// ── Ordering ───────────────────────────────────────────────────────────────

/** Sort by ascending order, then ascending insertion seq (stable tie-break). */
function sortedEntries<T extends { order: number; seq: number }>(m: Map<string, T>): T[] {
  return [...m.values()].sort((a, b) => (a.order - b.order) || (a.seq - b.seq));
}

// ── Advancing time ─────────────────────────────────────────────────────────

/**
 * Advance a single (interactive) week.
 *
 * 1. Read {week, season} from state.
 * 2. Run every tick hook in ascending order (insertion order for ties),
 *    synchronously, with ctx.fastForward = fastForwardFlag.
 * 3. Compute nextWeek. If it exceeds WEEKS_PER_SEASON, roll the season over;
 *    otherwise persist the new week.
 * 4. Emit 'week:advanced' LAST with the post-tick counters (§5 step 8) so
 *    subscribers read fully-settled state.
 */
export function advanceWeek(): void {
  const { week, season } = getState();
  const ctx: TickContext = { week, season, fastForward: fastForwardFlag };

  for (const entry of sortedEntries(tickHooks)) {
    entry.fn(ctx);
  }

  const nextWeek = week + 1;
  if (nextWeek > WEEKS_PER_SEASON) {
    rollSeasonOver();
  } else {
    setState({ week: nextWeek });
  }

  // Re-read post-tick / post-rollover counters for the event payload.
  const post = getState();
  bus.emit('week:advanced', { week: post.week, season: post.season });
}

/**
 * Season rollover. Invoked when advancing past the final week.
 * - resetForNewSeason() bumps season (+1) and sets week = 1.
 * - Season hooks run in ascending order with the NEW season (they own the real
 *   work: ageing, contract decrement, new fixtures, history push).
 * - 'season:ended' is emitted with the ENDED season (new - 1) plus final ladder
 *   position / premiership (defaults 0 / false until WU-7 populates the league).
 */
function rollSeasonOver(): void {
  resetForNewSeason();
  const { season } = getState(); // new season

  for (const entry of sortedEntries(seasonHooks)) {
    entry.fn({ season });
  }

  const endedSeason = season - 1;
  const { ladderPosition, premiership } = readSeasonOutcome();
  bus.emit('season:ended', { season: endedSeason, ladderPosition, premiership });
}

/**
 * Derive the just-ended season's outcome from the (post-rollover) history if a
 * season hook pushed one; otherwise default. Until WU-7 populates the league &
 * WU-registered hooks push history, this returns { 0, false }.
 */
function readSeasonOutcome(): { ladderPosition: number; premiership: boolean } {
  const { history } = getState();
  const last = history.length > 0 ? history[history.length - 1] : undefined;
  if (last) {
    return { ladderPosition: last.ladderPosition, premiership: last.premiership };
  }
  return { ladderPosition: 0, premiership: false };
}

/**
 * Fast-forward exactly n weeks, auto-simulating (fastForward:true in ctx so the
 * match hook auto-sims instead of handing off to MatchScene). n <= 0 is a no-op.
 * The flag is restored in finally so a thrown hook never leaves it stuck.
 */
export function advanceWeeks(n: number): void {
  if (n <= 0) return;
  const prev = fastForwardFlag;
  fastForwardFlag = true;
  try {
    for (let i = 0; i < n; i++) {
      advanceWeek();
    }
  } finally {
    fastForwardFlag = prev;
  }
}
