// src/systems/liveMatchRecord.ts — the record of a live match in progress
// (coach calls #73, docs/specs/coach-calls.md §5). The game saves only when a
// week ends, so a phone that kills the app mid-match reloads the week before
// it; advancing again rebuilds the same match (the seed comes from the saved
// rng). This record — the fixture, seed, the calls and plan changes made and the tick — lets
// that match carry on where it was, with the calls already made, instead of
// starting over (no reloading for a better result). A few hundred bytes, kept
// next to the save slot; cleared at full time.
import { getActiveSlot } from '../core/save';
import type { CallInput } from '../match/league/calls';
import type { PlanInput } from '../match/league/live';

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
