// Developer settings' playtest career (#519). A career of its own, set up with a
// Direct attack coach hired and Block play bought and taken into the match, so a
// merged feature can be watched straight away without advancing Leon's career.
//
// Isolation: the playtest career lives under DEV_TEST_PREFIX (core/storage/local.ts
// inCareerNamespace), so it never writes a normal slot. Setting one up saves the
// career being played only if it has something unsaved (as Save & quit would),
// copies every normal career key byte for byte into DEV_TEST_BACKUP_KEY, stops
// this page saving, and reloads into the playtest career. The way back stops
// saving, puts any normal key that differs from the backup back (keeping what it
// found under DEV_TEST_DISPLACED_KEY), throws the playtest career away and
// reloads to the title. A reload in between stays in the playtest career, with
// its progress: nothing switches careers but these two buttons (and Reset all).
//
// Neither runs while a match is live or can be resumed (transitionRefusal): the
// match's sheet and record belong to the career that kicked it off.
import { bus } from '../core/events';
import { getActiveSlot, lockSaves, saveIfChanged, SLOT_COUNT } from '../core/save';
import { getState, setState } from '../core/state';
import { careerNamespace, setCareerNamespace, browserStorage, type StorageLike } from '../core/storage/local';
import {
  CORRUPT_SAVE_KEY, DEV_TEST_BACKUP_KEY, DEV_TEST_DISPLACED_KEY, DEV_TEST_PREFIX, DEVICE_ID_KEY, LEGACY_SAVE_KEY,
  liveMatchKey, saveMetaKey, slotKey,
} from '../core/storageKeys';
import { weekHeld } from '../core/time';
import { advanceInProgress } from '../core/advance';
import { playerMatchPending } from '../systems/matchday';
import { readLiveMatch } from '../systems/liveMatchRecord';
import { hireAttackCoach } from '../systems/staff';
import { buyPlay, ownedPlays, togglePlay } from '../systems/playbook';
import { setTestCareer, testCareer, turnAllOff, type TestCareerMarker } from './flags';

/** Every key a career keeps: what the backup holds and what the playtest namespace may hold. */
export function careerKeys(slots = SLOT_COUNT): string[] {
  const keys = [LEGACY_SAVE_KEY, CORRUPT_SAVE_KEY, DEVICE_ID_KEY];
  for (let slot = 1; slot <= slots; slot++) keys.push(slotKey(slot), saveMetaKey(slot), liveMatchKey(slot));
  return keys;
}

/** What the page is doing that a career switch must wait for. */
export interface MatchProbe {
  /** A week held for its live match or the rival round (core/time weekHeld). */
  held: boolean;
  /** A live match parked at the club, still to finish (matchday playerMatchPending). */
  parked: boolean;
  /** A live-match record for the active slot: a match the next Advance Week resumes. */
  resumable: boolean;
  /** Advance Until is running. */
  advancing: boolean;
  /** The Match scene is up (live, or the full-time card). */
  matchScene: boolean;
}

/** Why a career switch must wait, in the panel's words, or null. Pure. */
export function transitionRefusal(p: MatchProbe): string | null {
  if (p.matchScene || p.held || p.parked) return 'Finish the match first, then come back here.';
  if (p.resumable) return 'A match is waiting to resume. Play it out first.';
  if (p.advancing) return 'Wait for the weeks to finish advancing.';
  return null;
}

let matchSceneProbe: () => boolean = () => false;
/** main.ts tells this module how to see the Match scene. */
export function setMatchSceneProbe(fn: () => boolean): void { matchSceneProbe = fn; }

/** The page as it is now. */
export function currentProbe(): MatchProbe {
  return {
    held: weekHeld(),
    parked: playerMatchPending(),
    resumable: readLiveMatch() !== null,
    advancing: advanceInProgress(),
    matchScene: matchSceneProbe(),
  };
}

/** Copy every normal career key (absent ones as null) into the backup; false when the copy did not land whole. */
export function backupNormalCareer(storage: StorageLike, keys = careerKeys()): boolean {
  try {
    const copy: Record<string, string | null> = {};
    for (const key of keys) copy[key] = storage.getItem(key);
    const text = JSON.stringify(copy);
    storage.setItem(DEV_TEST_BACKUP_KEY, text);
    if (storage.getItem(DEV_TEST_BACKUP_KEY) === text) return true;
  } catch { /* storage full or blocked */ }
  try { storage.removeItem(DEV_TEST_BACKUP_KEY); } catch { /* best effort */ }
  return false;
}

export interface RestoreResult {
  /** The backup was there to check against. */
  checked: boolean;
  /** Keys found changed and put back to the backup's bytes. */
  restored: string[];
}

/**
 * Check every normal key against the backup and put back any that differs, byte
 * for byte (a removed key is written back, a new one removed). What was found is
 * kept under DEV_TEST_DISPLACED_KEY first, so nothing is lost. Then the backup goes.
 */
export function restoreNormalCareer(storage: StorageLike): RestoreResult {
  let copy: Record<string, string | null> | null = null;
  try {
    const raw = storage.getItem(DEV_TEST_BACKUP_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && Object.values(parsed).every((v) => v === null || typeof v === 'string')) copy = parsed as Record<string, string | null>;
  } catch { /* unreadable backup: nothing to check against */ }
  if (!copy) return { checked: false, restored: [] };
  const displaced: Record<string, string | null> = {};
  for (const [key, was] of Object.entries(copy)) {
    const now = storage.getItem(key);
    if (now !== was) displaced[key] = now;
  }
  const restored = Object.keys(displaced);
  if (restored.length) {
    try { storage.setItem(DEV_TEST_DISPLACED_KEY, JSON.stringify(displaced)); } catch { /* kept best effort */ }
    for (const key of restored) {
      const was = copy[key];
      if (was === null || was === undefined) storage.removeItem(key);
      else storage.setItem(key, was);
    }
  }
  storage.removeItem(DEV_TEST_BACKUP_KEY);
  return { checked: true, restored };
}

/** Remove every key the playtest career may have written. */
export function clearTestCareer(storage: StorageLike): void {
  for (const key of careerKeys()) {
    try { storage.removeItem(DEV_TEST_PREFIX + key); } catch { /* best effort */ }
  }
}

export type SwitchResult = { ok: true } | { ok: false; why: string };

interface SwitchDeps {
  storage: StorageLike | null;
  probe: MatchProbe;
  reload: () => void;
}
const pageDeps = (): SwitchDeps => ({
  storage: browserStorage(),
  probe: currentProbe(),
  reload: () => location.reload(),
});

/**
 * Put the career being played away and reload into a fresh playtest career. The
 * normal keys are written only if the career has an unsaved change (the same save
 * Save & quit makes); after the backup this page writes no save at all.
 */
export function enterTestCareer(deps: SwitchDeps = pageDeps()): SwitchResult {
  const wait = transitionRefusal(deps.probe);
  if (wait) return { ok: false, why: wait };
  if (testCareer()) return { ok: false, why: 'The playtest career is already on.' };
  const storage = deps.storage;
  if (!storage) return { ok: false, why: 'This browser is not keeping saves, so there is nowhere to put a playtest career.' };
  if (!saveIfChanged(getState())) return { ok: false, why: "Your career's latest change didn't save, so nothing was switched." };
  lockSaves();
  if (!backupNormalCareer(storage)) {
    return { ok: false, why: 'There was no room to back up your career, so nothing was switched. Reload to carry on.' };
  }
  clearTestCareer(storage);
  const marker: TestCareerMarker = { preset: 'block-play', fresh: true, from: getActiveSlot() };
  if (!setTestCareer(marker)) {
    storage.removeItem(DEV_TEST_BACKUP_KEY);
    return { ok: false, why: "The switch couldn't be written, so nothing was switched. Reload to carry on." };
  }
  deps.reload();
  return { ok: true };
}

/** Throw the playtest career away and reload to the title with the normal careers exactly as they were. */
export function returnToNormalCareer(deps: SwitchDeps = pageDeps()): SwitchResult {
  if (!testCareer()) return { ok: false, why: 'You are already in your own career.' };
  const wait = transitionRefusal(deps.probe);
  if (wait) return { ok: false, why: wait };
  const storage = deps.storage;
  if (!storage) return { ok: false, why: "This browser's storage can't be reached right now. Reload and try again." };
  lockSaves();
  const res = restoreNormalCareer(storage);
  clearTestCareer(storage);
  setTestCareer(null);
  if (res.restored.length) console.warn('nrl-sim: normal career keys put back from the backup', res.restored);
  deps.reload();
  return { ok: true };
}

/**
 * Reset all: every developer switch off and the page hidden, with the hints seen
 * kept. The playtest career, if on, is left the same way Return leaves it; any
 * playtest keys left behind are cleared. Refused, changing nothing, mid-match in
 * a playtest career.
 */
export function resetAll(deps: SwitchDeps = pageDeps()): SwitchResult {
  if (testCareer()) {
    const back = returnToNormalCareer({ ...deps, reload: () => {} });
    if (!back.ok) return back;
    turnAllOff();
    deps.reload();
    return { ok: true };
  }
  if (deps.storage) {
    clearTestCareer(deps.storage);
    try { deps.storage.removeItem(DEV_TEST_BACKUP_KEY); } catch { /* best effort */ }
  }
  turnAllOff();
  return { ok: true };
}

/**
 * At boot, before any save is read: in a playtest career, put the career keys
 * under its prefix and say whether the preset still has to be built. Null on a
 * normal boot.
 */
export function bootCareerNamespace(): { fresh: boolean } | null {
  const marker = testCareer();
  if (!marker) return null;
  setCareerNamespace(DEV_TEST_PREFIX);
  return { fresh: marker.fresh };
}

/** True while this page plays the playtest career. */
export function inTestCareer(): boolean {
  return careerNamespace() === DEV_TEST_PREFIX;
}

/** The playtest career's club, so it reads as a test everywhere it is named. */
export const PLAYTEST_CLUB = 'Playtest XIII';
export const PLAYTEST_COACH = 'Dev Tester';
/** One seed, so every playtest career starts from the same club. */
export const PLAYTEST_SEED = 519;

/**
 * The preset, through the game's own routes on a new career already loaded: the
 * tutorial marked done, the match at ×1, a Direct attack coach hired, Block play
 * bought (the starting bank covers it) and taken into the match. Returns what
 * did not take, empty when all did.
 */
export function applyPlaytestPreset(): string[] {
  const problems: string[] = [];
  setState({ settings: { ...getState().settings, tutorialDone: true, playbackSpeed: 1 } });
  if (!hireAttackCoach('direct')) problems.push('attack coach not hired');
  if (!buyPlay('block-play')) problems.push('Block play not bought');
  const s = getState();
  const lineup = togglePlay(s.lineup, 'block-play', ownedPlays(s));
  if (!lineup.plays?.includes('block-play')) problems.push('Block play not taken in');
  else setState({ lineup });
  return problems;
}

/** Once the preset has saved: a later reload resumes the playtest career instead of building it again. */
export function markPlaytestBuilt(): void {
  const marker = testCareer();
  if (marker?.fresh) setTestCareer({ ...marker, fresh: false });
}

/** Said on the club once the playtest career is up. */
export const PLAYTEST_READY_TEXT = 'Playtest career: your own career is put away untouched. Block play is bought and picked; play the week to call it. Return to it from Settings → Developer settings.';

export function announcePlaytest(): void {
  bus.emit('ui:notify', { text: PLAYTEST_READY_TEXT, kind: 'info', from: 'coach' });
}
