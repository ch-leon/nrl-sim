// #819: a Classic save is no longer loadable. It reads as an empty slot everywhere the
// player sees saves, is never deleted, and is overwritten only when a League career is
// started in that slot.
import { afterEach, describe, expect, it } from 'vitest';
import { __resetDemo, FIRST_RUN_KEY, recordFirstRun } from '../../src/commercial/demo';
import { __setCommercial } from '../../src/commercial/flags';
import {
  __setStorage, capturePlayerSlot, captureSlot, classicSlots, firstRunSlotSummaries, flushSaveMeta, getSlotSummaries, hasSave,
  installImportedSave, listSlotMeta, loadCareer, loadSlot, setActiveSlot, slotHasLeagueData, slotKey, writeSlot,
} from '../../src/core/save';
import { CLASSIC_RETIRED_TEXT, isClassicSave } from '../../src/core/classicSave';
import { createNewGame, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { DEV_TEST_PREFIX, LEGACY_SAVE_KEY, liveMatchKey } from '../../src/core/storageKeys';
import { setCareerNamespace } from '../../src/core/storage/local';
import { stubLocalStorage } from '../commercial/memStorage';
import { leagueSlotState } from '../helpers/leagueSlot';
import { startLeagueCareer } from '../../src/systems/leagueCareerSetup';

/** A valid live-match record for `career`'s own fixture this week, with a coaching call. */
function matchFor(career: GameState, tick = 47): string {
  const away = career.league.clubs.find((c) => c.id !== career.clubId)!.id;
  return JSON.stringify({
    season: career.season, week: career.week, round: 1, homeId: career.clubId, awayId: away, seed: 7,
    calls: [{ tick: 40, side: 'home', call: 'hit-up' }], tick,
  });
}

function classicCareer(name: string, seed: number): GameState {
  const state = createNewGame(name, seed);
  state.league = initLeague(state);
  return state;
}

/** Every read the player's screens make of the slots. */
function readEverything(): void {
  getSlotSummaries();
  listSlotMeta();
  for (const slot of [1, 2, 3]) { hasSave(slot); loadSlot(slot); loadCareer(slot); captureSlot(slot); capturePlayerSlot(slot); }
  classicSlots();
}

afterEach(() => {
  setCareerNamespace(null);
  __setStorage(null);
  __setCommercial(false);
  __resetDemo();
});

describe('Classic saves are ignored, never deleted', () => {
  it('a Classic slot reads as empty, and every byte beside it stays', () => {
    const storage = stubLocalStorage();
    const classic = classicCareer('Old Club', 9);
    writeSlot(2, classic);
    flushSaveMeta();
    storage.setItem(liveMatchKey(2), matchFor(classic));
    const before = new Map(storage.map);
    readEverything();
    expect(loadCareer(2).status).toBe('empty');
    expect(getSlotSummaries().find((s) => s.slot === 2)?.status).toBe('empty');
    expect(classicSlots()).toEqual([2]);
    expect(storage.map).toEqual(before);
  });

  it('Continue\'s loader installs nothing from a Classic slot', () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Old Club', 9));
    const raw = storage.getItem(slotKey(1));
    expect(loadCareer(1).status).toBe('empty');
    expect(storage.getItem(slotKey(1))).toBe(raw);
  });

  it('League saves and their checkpoints are untouched byte for byte', async () => {
    const storage = stubLocalStorage();
    const league = await leagueSlotState('Stay');
    writeSlot(1, league);
    writeSlot(3, classicCareer('Ignored', 4));
    flushSaveMeta();
    storage.setItem(liveMatchKey(1), matchFor(league));
    const before = new Map(storage.map);
    readEverything();
    expect(storage.map).toEqual(before);
    const loaded = loadSlot(1);
    expect(loaded.status === 'ok' && loaded.state.clubName).toBe('Stay');
  });

  // Codex r4 blocker 1, and r5's hidden legacy checkpoint: nothing is deleted on load.
  it('Classic in slot 1 with a League career and its parked match under the legacy key: nothing moves', async () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Slot One', 9));
    flushSaveMeta();
    const leagueState = await leagueSlotState('Legacy League');
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(leagueState));
    storage.setItem(liveMatchKey(1), matchFor(leagueState, 47));
    const before = new Map(storage.map);
    readEverything();
    expect(storage.map).toEqual(before);
    expect(loadCareer(1).status).toBe('empty');
  });

  it('a Classic save under the legacy key is never migrated into slot 1, nor removed', () => {
    const storage = stubLocalStorage();
    const legacy = JSON.stringify(classicCareer('Legacy', 12));
    storage.setItem(LEGACY_SAVE_KEY, legacy);
    readEverything();
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(legacy);
    expect(loadCareer(1).status).toBe('empty');
  });

  it('a League save under the legacy key still migrates exactly as on main', async () => {
    const storage = stubLocalStorage();
    const league = JSON.stringify(await leagueSlotState('Legacy League'));
    storage.setItem(LEGACY_SAVE_KEY, league);
    getSlotSummaries();
    expect(storage.getItem(slotKey(1))).toBe(league);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull();
  });

  it('a League career can be written over a Classic slot through the normal write path', async () => {
    const storage = stubLocalStorage();
    writeSlot(2, classicCareer('Old Club', 9));
    const { raw, result } = capturePlayerSlot(2);
    expect(result.status).toBe('empty');
    const league = await leagueSlotState('New League');
    expect(writeSlot(2, league, raw)).toBe(true);
    expect(storage.getItem(slotKey(2))).toBe(JSON.stringify(league));
    expect(classicSlots()).toEqual([]);
  });

  it('startLeagueCareer replaces a Classic slot and loads the League career', async () => {
    const storage = stubLocalStorage();
    setActiveSlot(1);
    writeSlot(1, classicCareer('Old Club', 9));
    const { raw } = captureSlot(1);
    const result = await startLeagueCareer({ clubName: 'New League', seed: 819, home: { town: 'Brisbane', country: 'AU' } },
      { slot: 1, expectedOriginal: raw });
    expect(result.ok).toBe(true);
    const loaded = loadSlot(1);
    expect(loaded.status === 'ok' && loaded.state.clubName).toBe('New League');
    expect(storage.getItem(slotKey(1))).not.toBe(raw);
  });

  it('a stale Start over over a Classic slot that changed is refused', async () => {
    const storage = stubLocalStorage();
    writeSlot(2, classicCareer('Old Club', 9));
    const { raw } = captureSlot(2);
    writeSlot(2, classicCareer('Other Tab', 10));
    const now = storage.getItem(slotKey(2));
    expect(writeSlot(2, await leagueSlotState('New League'), raw)).toBe(false);
    expect(storage.getItem(slotKey(2))).toBe(now);
  });

  it('a playtest Classic career is ignored under its own prefix, and the normal slot is untouched', () => {
    const storage = stubLocalStorage();
    const normal = JSON.stringify(classicCareer('Normal', 1));
    storage.setItem(slotKey(1), normal);
    setCareerNamespace(DEV_TEST_PREFIX);
    writeSlot(1, classicCareer('Playtest', 2));
    const playtest = storage.getItem(DEV_TEST_PREFIX + slotKey(1));
    expect(classicSlots()).toEqual([1]);
    expect(loadCareer(1).status).toBe('empty');
    expect(storage.getItem(DEV_TEST_PREFIX + slotKey(1))).toBe(playtest);
    expect(storage.getItem(slotKey(1))).toBe(normal);
  });

  it('refuses a Classic import and does not install it', () => {
    const storage = stubLocalStorage();
    const res = installImportedSave(JSON.stringify(classicCareer('Imported', 6)), 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(CLASSIC_RETIRED_TEXT);
    expect(storage.getItem(slotKey(1))).toBeNull();
  });

  it('the commercial first-run record keeps a Classic career, as main records it', () => {
    const storage = stubLocalStorage();
    __setCommercial(true);
    __resetDemo();
    writeSlot(1, classicCareer('Old Club', 5));
    recordFirstRun(firstRunSlotSummaries(), 1000);
    expect(JSON.parse(storage.getItem(FIRST_RUN_KEY)!)).toEqual({ at: 1000, slots: [{ slot: 1, clubName: 'Old Club' }] });
  });
});

describe('slotHasLeagueData: a slot is empty only when all its keys hold nothing or Classic (#819 r6)', () => {
  it('a Classic career with its own meta and its own parked match: no League data, an empty slot', () => {
    const storage = stubLocalStorage();
    const classic = classicCareer('Old Club', 9);
    writeSlot(1, classic);
    flushSaveMeta();
    storage.setItem(liveMatchKey(1), matchFor(classic));
    expect(slotHasLeagueData(1)).toBe(false);
    expect(capturePlayerSlot(1).result.status).toBe('empty');
  });

  it('a League career under the legacy key behind a Classic slot 1 makes it occupied', async () => {
    const storage = stubLocalStorage();
    storage.setItem(slotKey(1), JSON.stringify(classicCareer('Old Club', 9)));
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(await leagueSlotState('Hidden')));
    expect(slotHasLeagueData(1)).toBe(true);
    expect(capturePlayerSlot(1).result.status).toBe('ok');
    expect(getSlotSummaries()[0]).toMatchObject({ status: 'ok', classic: true });
    expect(loadCareer(1).status).toBe('empty');
  });

  it('a checkpoint that is not the Classic career\'s own, or is unreadable, makes it occupied', async () => {
    const storage = stubLocalStorage();
    writeSlot(2, classicCareer('Old Club', 9));
    flushSaveMeta();
    const league = await leagueSlotState('Elsewhere');
    const fixture = { competitionId: 'league', fixtureId: 'f1' };
    storage.setItem(liveMatchKey(2), JSON.stringify({ ...JSON.parse(matchFor(league)), ...fixture }));
    expect(slotHasLeagueData(2)).toBe(true);
    const own = JSON.parse(matchFor(classicCareer('Old Club', 9)));
    storage.setItem(liveMatchKey(2), JSON.stringify({ ...own, week: own.week + 3 }));
    expect(slotHasLeagueData(2)).toBe(true);
    storage.setItem(liveMatchKey(2), '{not json');
    expect(slotHasLeagueData(2)).toBe(true);
    expect(getSlotSummaries()[1]?.status).toBe('ok');
  });

  it('meta that does not describe the Classic payload makes it occupied', async () => {
    const storage = stubLocalStorage();
    writeSlot(3, await leagueSlotState('League'));
    flushSaveMeta();
    storage.setItem(slotKey(3), JSON.stringify(classicCareer('Old Club', 9)));
    expect(slotHasLeagueData(3)).toBe(true);
  });

  it('a League slot has League data; an empty slot has none', async () => {
    stubLocalStorage();
    writeSlot(1, await leagueSlotState('League'));
    expect(slotHasLeagueData(1)).toBe(true);
    expect(slotHasLeagueData(2)).toBe(false);
  });
});

describe('the commercial first-run record matches main (#819 r6)', () => {
  it('leaves out a released v26 Classic save, which main showed as unreadable', () => {
    const storage = stubLocalStorage();
    __setCommercial(true);
    __resetDemo();
    storage.setItem(slotKey(1), JSON.stringify({ ...classicCareer('Released', 5), version: 26 }));
    writeSlot(2, classicCareer('Current', 6));
    recordFirstRun(firstRunSlotSummaries(), 1000);
    expect(JSON.parse(storage.getItem(FIRST_RUN_KEY)!)).toEqual({ at: 1000, slots: [{ slot: 2, clubName: 'Current' }] });
  });

  it('leaves out an unreadable save, as main did', () => {
    const storage = stubLocalStorage();
    __setCommercial(true);
    __resetDemo();
    storage.setItem(slotKey(1), '{broken');
    recordFirstRun(firstRunSlotSummaries(), 1000);
    expect(JSON.parse(storage.getItem(FIRST_RUN_KEY)!)).toEqual({ at: 1000, slots: [] });
  });
});

describe('a Classic save captured before league initialisation is Classic too (#819 r6)', () => {
  const early = (): GameState => createNewGame('Early', 3);

  it('is recognised, never loaded for Continue, and its slot reads empty', () => {
    const storage = stubLocalStorage();
    expect(early().league.clubs).toEqual([]);
    expect(isClassicSave(JSON.stringify(early()))).toBe(true);
    writeSlot(1, early());
    const raw = storage.getItem(slotKey(1));
    expect(loadCareer(1).status).toBe('empty');
    expect(getSlotSummaries()[0]?.status).toBe('empty');
    expect(storage.getItem(slotKey(1))).toBe(raw);
  });

  it('is never migrated out of the legacy key', () => {
    const storage = stubLocalStorage();
    const raw = JSON.stringify(early());
    storage.setItem(LEGACY_SAVE_KEY, raw);
    readEverything();
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(raw);
  });

  it('is refused on import', () => {
    const storage = stubLocalStorage();
    const res = installImportedSave(JSON.stringify(early()), 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(CLASSIC_RETIRED_TEXT);
    expect(storage.getItem(slotKey(1))).toBeNull();
  });
});
