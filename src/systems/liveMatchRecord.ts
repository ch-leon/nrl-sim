// src/systems/liveMatchRecord.ts — the record of a live match in progress
// (coach calls #73, docs/specs/coach-calls.md §5). The game never saves a held
// week (it saves as a week starts, at its end and when the page hides), so a
// phone that kills the app mid-match reloads the week's start; advancing again
// rebuilds the same match (the seed comes from the saved rng). This record — the
// fixture, seed, the calls and plan changes made and the tick — lets
// that match carry on where it was, with the calls already made, instead of
// starting over (no reloading for a better result). It is written on each call
// and plan change, when the page hides, every LIVE_MATCH_SAVE_SECONDS of match
// time, and on Save & exit, so a compatible kill that never fires pagehide loses at most
// that much. A few hundred bytes, kept next to the save slot; cleared at full time.
import { type ControlInput, isControlInput } from '../match/league/controls';
import { getActiveSlot } from '../core/save';
import { browserStorage, inCareerNamespace, type StorageLike } from '../core/storage/local';
import { liveMatchKey } from '../core/storageKeys';
import { TICK_S } from '../match/core/engine';
import { isCoachCall } from '../match/league/calls';
import { PLAYS_BY_ID } from '../data/plays';
import { isAttackPreset, isDefencePreset } from '../match/league/presets';
import { isMatchEngineIdentity, matchEngineIdentity } from './matchEngineIdentity';
import type { CallInput } from '../match/league/calls';
import type { PlanInput } from '../match/league/live';
import { NINES } from '../match/league/rules';

/**
 * How often a match that is being watched writes this record. Two seconds of
 * match time (the sim ticks at 1/TICK_S Hz): a compatible recovery loses at most that,
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
  controls?: ControlInput[];
  tick: number;
  /**
   * Halves this record was written under. Absent on a record from before the
   * 7:00 cut (a v19 mid-match save): that match is not this one, so resume
   * starts it again from the kick-off.
   */
  halfMinutes?: number;
  /** Missing in historical records: never replay those inputs. */
  engineId?: string;
}

/** Both explicit engine compatibility and the actual half length must match. */
export function liveMatchSameRules(r: Pick<LiveMatchRecord, 'halfMinutes' | 'engineId'>): boolean {
  return r.halfMinutes === NINES.halfMinutes && r.engineId === matchEngineIdentity();
}

/** Key for one slot's record. Export files carry the same object under this field. */
export const LIVE_MATCH_EXPORT_FIELD = 'nrlLiveMatch';

/** The slot's key, frozen in src/core/storageKeys.ts (#360). */
export { liveMatchKey };

function store(): StorageLike | null {
  // A playtest career's record sits under its own prefix, beside its slot (#519).
  return inCareerNamespace(browserStorage());
}

const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const tick = (x: unknown): x is number => Number.isSafeInteger(x) && (x as number) >= 0;
const timed = (x: unknown): x is Record<string, unknown> => object(x) && tick(x.tick) && (x.side === 'home' || x.side === 'away');

function isCall(x: unknown): boolean {
  return timed(x) && isCoachCall(x.call)
    && (x.play === undefined || typeof x.play === 'string' && Object.prototype.hasOwnProperty.call(PLAYS_BY_ID, x.play))
    && (x.call !== 'set-play' || typeof x.play === 'string' && Object.prototype.hasOwnProperty.call(PLAYS_BY_ID, x.play));
}
function isPlan(x: unknown): boolean {
  return timed(x) && object(x.tactics)
    && typeof x.tactics.attack === 'string' && isAttackPreset(x.tactics.attack)
    && typeof x.tactics.defence === 'string' && isDefencePreset(x.tactics.defence);
}

/** Boundary shape, not a promise of compatibility; historical identities may be absent. */
export function isLiveMatchRecord(x: unknown): x is LiveMatchRecord {
  if (!object(x)) return false;
  const r = x as Partial<LiveMatchRecord>;
  return Number.isSafeInteger(r.season) && r.season! >= 1 && tick(r.week) && r.week >= 1
    && Number.isSafeInteger(r.round) && typeof r.homeId === 'string' && r.homeId.length > 0
    && typeof r.awayId === 'string' && r.awayId.length > 0
    && Number.isSafeInteger(r.seed) && tick(r.tick)
    && (r.engineId === undefined || isMatchEngineIdentity(r.engineId))
    && (r.halfMinutes === undefined || Number.isFinite(r.halfMinutes) && r.halfMinutes > 0)
    && Array.isArray(r.calls) && r.calls.every(isCall)
    && (r.plans === undefined || Array.isArray(r.plans) && r.plans.every(isPlan))
    && (r.controls === undefined || Array.isArray(r.controls) && r.controls.every(isControlInput));
}

/**
 * A malformed identity is an incompatible record, not an invalid career/import.
 * Strip only that metadata so the existing week-start fallback still runs.
 * Malformed simulation inputs never cross the record boundary.
 */
function recoveryRecord(x: unknown): LiveMatchRecord | null {
  if (object(x) && !isMatchEngineIdentity(x.engineId)) {
    const { engineId: _identity, ...legacy } = x;
    return isLiveMatchRecord(legacy) ? legacy : null;
  }
  return isLiveMatchRecord(x) ? x : null;
}

export function readLiveMatch(): LiveMatchRecord | null {
  try {
    const raw = store()?.getItem(liveMatchKey(getActiveSlot()));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const record = recoveryRecord(parsed);
    return record ? optionalControls(record) : null;
  } catch {
    return null;
  }
}

/** Labs: match controls (Leon, 30 Oct). Empty inputs keep the pre-Labs record bytes. */
function optionalControls(record: LiveMatchRecord): LiveMatchRecord {
  if (record.controls?.length) return record;
  const { controls: _controls, ...plain } = record;
  return plain;
}

/** Write the record for `slot` (the active one, when omitted). False when storage is missing, full or blocked. */
export function writeLiveMatch(r: LiveMatchRecord, slot: number = getActiveSlot()): boolean {
  if (!isLiveMatchRecord(r)) return false;
  try {
    const s = store();
    if (!s) return false;
    s.setItem(liveMatchKey(slot), JSON.stringify(optionalControls(r)));
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
  const live = recoveryRecord(bag[LIVE_MATCH_EXPORT_FIELD]);
  delete bag[LIVE_MATCH_EXPORT_FIELD];
  if (!live) return { text: JSON.stringify(bag), live: null, bad: true };
  return { text: JSON.stringify(bag), live, bad: false };
}
