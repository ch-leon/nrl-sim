// src/systems/liveMatchRecord.ts — the record of a live match in progress
// (coach calls #73, docs/specs/coach-calls.md §5). The game never saves a held
// week (it saves as a week starts, at its end and when the page hides), so a
// phone that kills the app mid-match reloads the week's start; advancing again
// rebuilds the same match (the seed comes from the saved rng). This record — the
// fixture, seed, the calls and plan changes made and the tick — lets
// that match carry on where it was, with the calls already made, instead of
// starting over (no reloading for a better result). It is written on each call
// and plan change, when the page hides, every LIVE_MATCH_SAVE_SECONDS of match
// time, and on Save & exit, so a kill that never fires pagehide loses at most
// that much. A few hundred bytes, kept next to the save slot; cleared at full time.
import { getActiveSlot } from '../core/save';
import { TICK_S } from '../match/core/engine';
import type { CallInput } from '../match/league/calls';
import type { PlanInput } from '../match/league/live';

/**
 * How often a match that is being watched writes this record. Two seconds of
 * match time (the sim ticks at 1/TICK_S Hz): a hard kill loses at most that,
 * and a reload cannot rewind further. One small localStorage write per interval.
 */
export const LIVE_MATCH_SAVE_SECONDS = 2;
export const LIVE_MATCH_SAVE_TICKS = Math.round(LIVE_MATCH_SAVE_SECONDS / TICK_S);

/** True when `tick` is at least one save interval past the last write. */
export function liveMatchSaveDue(tick: number, lastSavedTick: number, every = LIVE_MATCH_SAVE_TICKS): boolean {
  return tick - lastSavedTick >= every;
}

export interface LiveMatchRecord {
  season: number;
  week: number;
  round: number;
  homeId: string;
  awayId: string;
  seed: number;
  calls: CallInput[];
  /** Plan changes at the breaks (N11); absent in a record from before them. */
  plans?: PlanInput[];
  tick: number;
}

const key = (): string => `nrl-live-match-${getActiveSlot()}`;

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readLiveMatch(): LiveMatchRecord | null {
  try {
    const raw = store()?.getItem(key());
    return raw ? (JSON.parse(raw) as LiveMatchRecord) : null;
  } catch {
    return null;
  }
}

export function writeLiveMatch(r: LiveMatchRecord): void {
  try {
    store()?.setItem(key(), JSON.stringify(r));
  } catch {
    // Storage full or blocked: the match can still be played, just not resumed.
  }
}

export function clearLiveMatch(): void {
  try {
    store()?.removeItem(key());
  } catch {
    // nothing to clear
  }
}
