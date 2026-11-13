// tests/labs/devCareer.test.ts — Developer settings (#519): the playtest career's
// isolation, the way back byte for byte, Reset all, reload, the match guard, the
// preset through the game's own routes, and the browser-local screen override.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setStorage, __unlockSaves, __flushSaveMeta, getSlotMeta, load, save, setActiveSlot, getActiveSlot,
} from '../../src/core/save';
import { createNewGame, getState, setState, SAVE_VERSION } from '../../src/core/state';
import { careerNamespace, setCareerNamespace, type StorageLike } from '../../src/core/storage/local';
import { DEV_TEST_BACKUP_KEY, DEV_TEST_DISPLACED_KEY, DEV_TEST_PREFIX, DEVICE_ID_KEY, LABS_KEY, liveMatchKey, saveMetaKey, slotKey } from '../../src/core/storageKeys';
import { checksumOf, parseMeta } from '../../src/core/storage/meta';
import { clearLiveMatch, writeLiveMatch } from '../../src/systems/liveMatchRecord';
import {
  __setLabs, developerSession, devSettingsEntryVisible, experimentOn, hintSeen, labsBlocksAnalytics, OPEN_SCREENS, overrideOn, readLabs, setExperiment, setOverride, testCareer,
} from '../../src/labs/flags';
import {
  applyPlaytestPreset, bootCareerNamespace, careerKeys, enterTestCareer, markPlaytestBuilt, resetAll, returnToNormalCareer,
  transitionRefusal, type MatchProbe,
} from '../../src/labs/devCareer';
import { uiScreenLockReason } from '../../src/labs/screenOverride';
import { screenLockReason, screensDue } from '../../src/systems/screenUnlocks';
import { initLeague } from '../../src/systems/fixtures';
import { attackCoach } from '../../src/systems/staff';
import { STARTING_MONEY } from '../../src/config';
import { PLAYS_BY_ID } from '../../src/data/plays';
import { devMarkerText } from '../../src/labs/marker';

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  /** Every key and its bytes, for a byte-for-byte comparison. */
  dump(filter: (k: string) => boolean = () => true): Record<string, string> {
    return Object.fromEntries([...this.map].filter(([k]) => filter(k)).sort(([a], [b]) => a.localeCompare(b)));
  }
}

const idle: MatchProbe = { held: false, parked: false, resumable: false, advancing: false, matchScene: false };
const isNormal = (k: string) => !k.startsWith(DEV_TEST_PREFIX) && !k.startsWith('nrl-sim-devtest') && k !== LABS_KEY;
let storage: FakeStorage;
let reloads = 0;
const deps = (probe: MatchProbe = idle) => ({ storage, probe, reload: () => { reloads++; } });

/** A normal career in slot 2 (any slot but 1, so the test career's slot 1 is clearly another key), saved, with a live record in slot 3. */
function normalCareer(): void {
  setActiveSlot(2);
  createNewGame('Leon Real Club', 42);
  save(getState());
  __flushSaveMeta();
  storage.setItem(liveMatchKey(3), '{"other":"slot"}');
}

/** What boot does in a fresh page with the marker set: namespace on, slot 1, the preset built and saved. */
function bootPlaytestPage(): void {
  __unlockSaves();
  __setLabs(null); // a new page reads the marker from storage
  const boot = bootCareerNamespace();
  expect(boot).not.toBeNull();
  setActiveSlot(1);
  if (boot!.fresh) {
    createNewGame('Playtest XIII', 519, { difficulty: 'normal' });
    initLeague(getState());
    expect(applyPlaytestPreset()).toEqual([]);
    save(getState());
    markPlaytestBuilt();
  } else {
    const s = load();
    expect(s).not.toBeNull();
  }
}

beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('localStorage', storage);
  __setStorage(null); // save.ts reaches the stubbed localStorage, as in a browser
  setCareerNamespace(null);
  __unlockSaves();
  __setLabs(null);
  reloads = 0;
  setActiveSlot(1);
});
afterEach(() => {
  setCareerNamespace(null);
  __unlockSaves();
  __setLabs(null);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('the career namespace', () => {
  it('keeps every save, meta and live-match write of a playtest career under its prefix', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    setCareerNamespace(DEV_TEST_PREFIX);
    setActiveSlot(1);
    createNewGame('Playtest XIII', 1);
    save(getState());
    __flushSaveMeta();
    writeLiveMatch({ season: 1, week: 1, round: 1, homeId: 'player', awayId: 'x', seed: 1, calls: [], tick: 5 });
    clearLiveMatch(2);
    expect(storage.dump(isNormal)).toEqual(before);
    expect(storage.getItem(DEV_TEST_PREFIX + slotKey(1))).not.toBeNull();
    expect(storage.getItem(DEV_TEST_PREFIX + liveMatchKey(1))).not.toBeNull();
    expect(load()?.clubName).toBe('Playtest XIII');
    setCareerNamespace(null);
    setActiveSlot(2);
    expect(load()?.clubName).toBe('Leon Real Club');
  });
});

describe('setting up the playtest career', () => {
  it('leaves an unchanged career untouched, backs it up byte for byte, and reloads into a fresh playtest', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    expect(enterTestCareer(deps())).toEqual({ ok: true });
    expect(reloads).toBe(1);
    expect(storage.dump(isNormal)).toEqual(before);
    const backup = JSON.parse(storage.getItem(DEV_TEST_BACKUP_KEY)!) as Record<string, string | null>;
    for (const key of careerKeys()) expect(backup[key]).toBe(storage.getItem(key));
    expect(testCareer()).toEqual({ preset: 'block-play', fresh: true, from: 2 });
    // The reload's pagehide must not write anything now.
    setState({ money: 1 });
    save(getState());
    expect(storage.dump(isNormal)).toEqual(before);
  });

  it('saves an unsaved change first, as Save & quit would, and backs up those bytes', () => {
    normalCareer();
    setState({ money: getState().money + 1234 });
    expect(enterTestCareer(deps()).ok).toBe(true);
    const backup = JSON.parse(storage.getItem(DEV_TEST_BACKUP_KEY)!) as Record<string, string>;
    expect(JSON.parse(backup[slotKey(2)]!).money).toBe(STARTING_MONEY + 1234);
    expect(storage.getItem(slotKey(2))).toBe(backup[slotKey(2)]);
  });

  it('with an unsaved change, backs up the save with its meta and a first device id, and nothing lands after', async () => {
    // A save from before meta, on a browser with no device id yet: the setup's save makes both.
    setActiveSlot(2);
    createNewGame('Leon Real Club', 42);
    storage.setItem(slotKey(2), JSON.stringify(getState()));
    expect(load()).not.toBeNull(); // normal boot validates and approves the occupied slot
    setState({ money: getState().money + 1 });
    expect(enterTestCareer(deps()).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 0)); // every deferred write has had its turn
    const backup = JSON.parse(storage.getItem(DEV_TEST_BACKUP_KEY)!) as Record<string, string | null>;
    for (const key of careerKeys()) expect(storage.getItem(key), key).toBe(backup[key]);
    expect(backup[DEVICE_ID_KEY]).not.toBeNull();
    const meta = parseMeta(backup[saveMetaKey(2)]!);
    expect(meta?.checksum).toBe(checksumOf(backup[slotKey(2)]!));
    expect(meta?.updatedAt).toBeGreaterThan(0);
    expect(meta?.deviceId).toBe(backup[DEVICE_ID_KEY]);
  });

  it('round trip with an unsaved change: Return leaves the save, its meta and the device id as set up, putting nothing back', async () => {
    normalCareer();
    setState({ money: getState().money + 5 });
    expect(enterTestCareer(deps()).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    const after = storage.dump(isNormal);
    expect(JSON.parse(after[slotKey(2)]!).money).toBe(STARTING_MONEY + 5);
    bootPlaytestPage();
    save(getState()); // the playtest's own save, its meta queued under the prefix
    const warn = vi.spyOn(console, 'warn');
    expect(returnToNormalCareer(deps()).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(storage.dump(isNormal)).toEqual(after);
    expect(storage.getItem(DEV_TEST_DISPLACED_KEY)).toBeNull();
    expect(Object.keys(storage.dump((k) => k.startsWith('nrl-sim-devtest')))).toEqual([]);
    // The next page: slot 2's meta still describes its save, with its time known.
    setCareerNamespace(null);
    __unlockSaves();
    const meta = getSlotMeta(2);
    expect(meta?.checksum).toBe(checksumOf(storage.getItem(slotKey(2))!));
    expect(meta?.updatedAt).toBeGreaterThan(0);
    expect(meta?.deviceId).toBe(storage.getItem(DEVICE_ID_KEY));
  });

  it.each<[string, Partial<MatchProbe>]>([
    ['a live match', { held: true }],
    ['a parked match', { parked: true }],
    ['the Match scene', { matchScene: true }],
    ['a match to resume', { resumable: true }],
    ['Advance Until', { advancing: true }],
  ])('is refused during %s, changing nothing', (_name, p) => {
    normalCareer();
    setState({ money: 7 }); // an unsaved change that a refusal must not save either
    const before = storage.dump();
    const res = enterTestCareer(deps({ ...idle, ...p }));
    expect(res.ok).toBe(false);
    expect(storage.dump()).toEqual(before);
    expect(reloads).toBe(0);
    expect(testCareer()).toBeNull();
    save(getState()); // saves still work after a refusal
    expect(JSON.parse(storage.getItem(slotKey(2))!).money).toBe(7);
  });

  it('says why in plain words', () => {
    expect(transitionRefusal(idle)).toBeNull();
    expect(transitionRefusal({ ...idle, held: true })).toMatch(/Finish the match/);
    expect(transitionRefusal({ ...idle, resumable: true })).toMatch(/waiting to resume/);
  });

  it('refuses without storage, and when the backup cannot be written', () => {
    normalCareer();
    expect(enterTestCareer({ storage: null, probe: idle, reload: () => {} }).ok).toBe(false);
    const full = new FakeStorage();
    full.map = storage.map;
    const set = full.setItem.bind(full);
    full.setItem = (k, v) => { if (k === DEV_TEST_BACKUP_KEY) throw new Error('quota'); set(k, v); };
    const before = storage.dump(isNormal);
    expect(enterTestCareer({ storage: full, probe: idle, reload: () => { reloads++; } }).ok).toBe(false);
    expect(reloads).toBe(0);
    expect(testCareer()).toBeNull();
    expect(storage.getItem(DEV_TEST_BACKUP_KEY)).toBeNull();
    expect(storage.dump(isNormal)).toEqual(before);
  });
});

describe('the playtest career', () => {
  it('is built through the game’s routes: a Direct attack coach, Block play bought and picked, the bank still flush', () => {
    normalCareer();
    enterTestCareer(deps());
    bootPlaytestPage();
    const s = getState();
    expect(s.clubName).toBe('Playtest XIII');
    expect(attackCoach(s)?.speciality).toBe('direct');
    expect(s.playbook.owned).toEqual(['block-play']);
    expect(s.lineup.plays).toEqual(['block-play']);
    expect(s.money).toBe(STARTING_MONEY - PLAYS_BY_ID['block-play'].price);
    expect(s.settings.tutorialDone).toBe(true);
    expect(s.settings.playbackSpeed).toBe(1);
    expect(s.version).toBe(SAVE_VERSION); // no save-format change
    expect(testCareer()?.fresh).toBe(false);
  });

  it('survives a reload as the same playtest career, never touching the normal keys', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    enterTestCareer(deps());
    bootPlaytestPage();
    setState({ money: 99 });
    save(getState());
    setCareerNamespace(null);
    bootPlaytestPage(); // the reload
    expect(getState().clubName).toBe('Playtest XIII');
    expect(getState().money).toBe(99);
    expect(storage.dump(isNormal)).toEqual(before);
  });

  it('returns to the normal career exactly as it was and throws the playtest away', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    enterTestCareer(deps());
    bootPlaytestPage();
    save(getState());
    expect(returnToNormalCareer(deps()).ok).toBe(true);
    expect(storage.dump(isNormal)).toEqual(before);
    expect(Object.keys(storage.dump((k) => k.startsWith(DEV_TEST_PREFIX)))).toEqual([]);
    expect(storage.getItem(DEV_TEST_BACKUP_KEY)).toBeNull();
    expect(testCareer()).toBeNull();
    // The next page boots normally, on the title, with slot 2 as it was.
    setCareerNamespace(null);
    __unlockSaves();
    __setLabs(null);
    expect(bootCareerNamespace()).toBeNull();
    expect(careerNamespace()).toBeNull();
    setActiveSlot(2);
    expect(load()?.clubName).toBe('Leon Real Club');
  });

  it('puts back a normal key that changed meanwhile (another tab), keeping what it found', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    enterTestCareer(deps());
    bootPlaytestPage();
    storage.setItem(slotKey(2), 'changed elsewhere');
    storage.setItem(slotKey(3), 'new elsewhere');
    expect(returnToNormalCareer(deps()).ok).toBe(true);
    expect(storage.dump(isNormal)).toEqual(before);
    expect(JSON.parse(storage.getItem(DEV_TEST_DISPLACED_KEY)!)).toEqual({ [slotKey(2)]: 'changed elsewhere', [slotKey(3)]: 'new elsewhere' });
  });

  it('will not return mid-match: the playtest’s own match record counts', () => {
    normalCareer();
    enterTestCareer(deps());
    bootPlaytestPage();
    const before = storage.dump();
    expect(returnToNormalCareer(deps({ ...idle, resumable: true })).ok).toBe(false);
    expect(resetAll(deps({ ...idle, held: true })).ok).toBe(false);
    expect(storage.dump()).toEqual(before);
    expect(testCareer()).not.toBeNull();
    expect(reloads).toBe(1); // only the way in
  });
});

describe('Reset all', () => {
  it('turns every developer switch off and hides the page, keeping hints and the career', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    __setLabs({ visible: true, on: { 'match-controls': true }, hintsSeen: ['match-controls'], overrides: { [OPEN_SCREENS]: true } });
    storage.setItem(DEV_TEST_PREFIX + slotKey(1), 'left over');
    expect(resetAll(deps())).toEqual({ ok: true });
    expect(experimentOn('match-controls')).toBe(false);
    expect(overrideOn(OPEN_SCREENS)).toBe(false);
    expect(hintSeen('match-controls')).toBe(true);
    expect(developerSession()).toBeNull();
    expect(storage.getItem(DEV_TEST_PREFIX + slotKey(1))).toBeNull();
    expect(storage.dump(isNormal)).toEqual(before);
    expect(reloads).toBe(0);
  });

  it('in a playtest career, returns as Return does and then resets', () => {
    normalCareer();
    const before = storage.dump(isNormal);
    __setLabs({ visible: true, on: {}, hintsSeen: ['h'], overrides: { [OPEN_SCREENS]: true } });
    enterTestCareer(deps());
    bootPlaytestPage();
    expect(resetAll(deps()).ok).toBe(true);
    expect(reloads).toBe(2);
    expect(storage.dump(isNormal)).toEqual(before);
    expect(readLabs(storage.getItem(LABS_KEY))).toEqual({ visible: false, on: {}, hintsSeen: ['h'] });
  });
});

describe('the screen override', () => {
  it('opens the Office screens on screen only: the save’s unlocks, and their openings, are untouched', () => {
    createNewGame('Gates', 3);
    initLeague(getState());
    const unlocks = JSON.stringify(getState().unlocks);
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    for (const id of ['finance', 'staff', 'contracts']) expect(uiScreenLockReason(getState(), id)).toBe(screenLockReason(getState(), id));
    expect(uiScreenLockReason(getState(), 'staff')).toBe('Opens at round 4');
    setOverride(OPEN_SCREENS, true);
    for (const id of ['finance', 'staff', 'contracts']) expect(uiScreenLockReason(getState(), id)).toBeNull();
    expect(JSON.stringify(getState().unlocks)).toBe(unlocks);
    expect(screensDue(getState(), 4)).toEqual(['staff']);
    expect(JSON.stringify(getState())).not.toContain(OPEN_SCREENS);
    setOverride(OPEN_SCREENS, false);
    expect(uiScreenLockReason(getState(), 'staff')).toBe('Opens at round 4');
  });

  it('does nothing while the page is hidden and the build switch is off', () => {
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    createNewGame('Gates', 3);
    __setLabs({ visible: false, on: {}, hintsSeen: [], overrides: { [OPEN_SCREENS]: true } });
    expect(devSettingsEntryVisible()).toBe(false);
    expect(overrideOn(OPEN_SCREENS)).toBe(false);
    expect(uiScreenLockReason(getState(), 'staff')).toBe('Opens at round 4');
  });

  it('applies a stored override when the build shows the page, and does not write the career', () => {
    createNewGame('Gates', 3);
    initLeague(getState());
    const before = JSON.stringify(getState());
    __setLabs({ visible: false, on: {}, hintsSeen: [], overrides: { [OPEN_SCREENS]: true } });
    expect(devSettingsEntryVisible()).toBe(true);
    expect(uiScreenLockReason(getState(), 'staff')).toBeNull();
    expect(JSON.stringify(getState())).toBe(before);
    expect(labsBlocksAnalytics()).toBe(true);
  });
});

describe('the developer marker', () => {
  it('is null for a player, and says what is on for Leon', () => {
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    expect(developerSession()).toBeNull();
    expect(devMarkerText(developerSession())).toBeNull();
    __setLabs({ visible: true, on: {}, hintsSeen: [] });
    // The build shows the page. Nothing is on, so this is still a normal career.
    expect(developerSession()).toBeNull();
    expect(devMarkerText(developerSession())).toBeNull();
    expect(labsBlocksAnalytics()).toBe(false);
    vi.stubEnv('VITE_DEV_SETTINGS', '0');
    expect(developerSession()).toEqual({ testCareer: false, overrides: [], experiments: [] });
    expect(devMarkerText(developerSession())).toBeNull();
    expect(labsBlocksAnalytics()).toBe(true);
    vi.unstubAllEnvs();
    setExperiment('match-controls', true);
    expect(devMarkerText(developerSession())).toBe('DEV');
    __setLabs({ visible: false, on: {}, hintsSeen: [], testCareer: { preset: 'block-play', fresh: false, from: 1 } });
    expect(developerSession()).toEqual({ testCareer: true, overrides: [], experiments: [] });
    expect(devMarkerText(developerSession())).toBe('TEST CAREER');
  });

  it('reads old Labs values as before and drops a bad new field without losing the rest', () => {
    expect(readLabs('{"visible":true,"on":{"match-controls":true},"hintsSeen":["match-controls"]}'))
      .toEqual({ visible: true, on: { 'match-controls': true }, hintsSeen: ['match-controls'] });
    expect(readLabs('{"visible":true,"on":{},"hintsSeen":[],"overrides":{"open-screens":"yes"},"testCareer":{"preset":"x"}}'))
      .toEqual({ visible: true, on: {}, hintsSeen: [] });
    expect(getActiveSlot()).toBe(1);
  });
});

describe('analytics stays off for a real developer session, not for the Settings entry', () => {
  it('counts a playtest career as Labs even with the page hidden', async () => {
    const { labsVisible } = await import('../../src/labs/flags');
    __setLabs({ visible: false, on: {}, hintsSeen: [] });
    expect(labsVisible()).toBe(false);
    expect(labsBlocksAnalytics()).toBe(false);
    __setLabs({ visible: false, on: {}, hintsSeen: [], testCareer: { preset: 'block-play', fresh: false, from: 1 } });
    expect(labsVisible()).toBe(true);
    expect(labsBlocksAnalytics()).toBe(true);
  });
});
