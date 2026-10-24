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

/** Key for one slot's record. Export files carry the same object under this field. */
export const LIVE_MATCH_EXPORT_FIELD = 'nrlLiveMatch';

export function liveMatchKey(slot: number): string {
  return `nrl-live-match-${slot}`;
}

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** A record this game can resume: a bad or partial one is ignored, not spread. */
export function isLiveMatchRecord(x: unknown): x is LiveMatchRecord {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Partial<LiveMatchRecord>;
  return typeof r.season === 'number' && typeof r.week === 'number'
    && typeof r.round === 'number' && typeof r.homeId === 'string' && typeof r.awayId === 'string'
    && typeof r.seed === 'number' && typeof r.tick === 'number'
    && Array.isArray(r.calls)
    && (r.plans === undefined || Array.isArray(r.plans));
}

export function readLiveMatch(): LiveMatchRecord | null {
  try {
    const raw = store()?.getItem(liveMatchKey(getActiveSlot()));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLiveMatchRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Write the record for `slot` (the active one, when omitted). False when storage is missing, full or blocked. */
export function writeLiveMatch(r: LiveMatchRecord, slot: number = getActiveSlot()): boolean {
  if (!isLiveMatchRecord(r)) return false;
  try {
    const s = store();
    if (!s) return false;
    s.setItem(liveMatchKey(slot), JSON.stringify(r));
    return true;
  } catch {
    // Storage full or blocked: the match can still be played, just not resumed.
    return false;
  }
}

export function clearLiveMatch(slot: number = getActiveSlot()): void {
  try {
    store()?.removeItem(liveMatchKey(slot));
  } catch {
    // nothing to clear
  }
}

/**
 * An exported save may carry the live-match record beside the week-start state
 * (`nrlLiveMatch`). Peel it off so migrate sees a plain save. `bad` is a field
 * that was present but not a record.
 */
export function peelLiveMatchExport(text: string): { text: string; live: LiveMatchRecord | null; bad: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { text, live: null, bad: false };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || !(LIVE_MATCH_EXPORT_FIELD in parsed)) {
    return { text, live: null, bad: false };
  }
  const bag = { ...(parsed as Record<string, unknown>) };
  const live = bag[LIVE_MATCH_EXPORT_FIELD];
  delete bag[LIVE_MATCH_EXPORT_FIELD];
  if (!isLiveMatchRecord(live)) return { text: JSON.stringify(bag), live: null, bad: true };
  return { text: JSON.stringify(bag), live, bad: false };
}
