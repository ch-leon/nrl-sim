import { afterEach, describe, expect, it } from 'vitest';
import { __resetDemo, FIRST_RUN_KEY, recordFirstRun } from '../../src/commercial/demo';
import { __setCommercial } from '../../src/commercial/flags';
import {
  __setStorage, deleteClassicSlots, flushSaveMeta, getSlotSummaries, installImportedSave, loadSlot, slotKey, writeSlot,
} from '../../src/core/save';
import { CLASSIC_RETIRED_TEXT } from '../../src/core/classicSave';
import { createNewGame, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { DEV_TEST_PREFIX, LEGACY_SAVE_KEY, liveMatchKey, recoveryKey, saveMetaKey } from '../../src/core/storageKeys';
import { setCareerNamespace } from '../../src/core/storage/local';
import { stubLocalStorage } from '../commercial/memStorage';
import { leagueSlotState } from '../helpers/leagueSlot';

/** A valid live-match record for `career`'s own fixture this week, with a coaching call at tick 47. */
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

afterEach(() => {
  setCareerNamespace(null);
  __setStorage(null);
  __setCommercial(false);
  __resetDemo();
});

// #819: Classic careers are deleted on load, intentionally, at the owner's request.
describe('deleting Classic saves', () => {
  it('deletes a Classic career with its meta and live-match checkpoint, and the slot reads empty', () => {
    const storage = stubLocalStorage();
    const classic = classicCareer('Old Club', 9);
    writeSlot(2, classic);
    storage.setItem(liveMatchKey(2), matchFor(classic));
    flushSaveMeta();
    expect(storage.getItem(saveMetaKey(2))).not.toBeNull();
    expect(deleteClassicSlots()).toEqual([2]);
    expect(storage.getItem(slotKey(2))).toBeNull();
    expect(storage.getItem(saveMetaKey(2))).toBeNull();
    expect(storage.getItem(liveMatchKey(2))).toBeNull();
    expect(loadSlot(2).status).toBe('empty');
    expect(getSlotSummaries().find((s) => s.slot === 2)?.status).toBe('empty');
  });

  it('is idempotent: a second run finds nothing and changes nothing', () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Old Club', 9));
    expect(deleteClassicSlots()).toEqual([1]);
    const after = new Map(storage.map);
    expect(deleteClassicSlots()).toEqual([]);
    expect(storage.map).toEqual(after);
  });

  it('leaves League careers, their checkpoints and other slots byte-for-byte untouched', async () => {
    const storage = stubLocalStorage();
    writeSlot(1, await leagueSlotState('Stay'));
    writeSlot(3, classicCareer('Go', 4));
    const prototype = JSON.stringify({ version: 32, competitions: { calendar: { mode: 'structural' } } });
    storage.setItem(slotKey(2), prototype);
    storage.setItem(liveMatchKey(1), '{"week":5}');
    storage.setItem(recoveryKey(1), 'kept');
    const keep = [slotKey(1), saveMetaKey(1), liveMatchKey(1), recoveryKey(1), slotKey(2)].map((k) => [k, storage.getItem(k)]);
    expect(deleteClassicSlots()).toEqual([3]);
    expect(keep.map(([k]) => [k, storage.getItem(k!)])).toEqual(keep);
    expect(loadSlot(1).status).toBe('ok');
  });

  it('a slot-1 Classic career read through the legacy key goes, with its meta and live match', () => {
    const storage = stubLocalStorage();
    const legacy = classicCareer('Legacy', 12);
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(legacy));
    storage.setItem(liveMatchKey(1), matchFor(legacy));
    expect(loadSlot(1).status).toBe('ok');
    expect(deleteClassicSlots()).toEqual([1]);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect(storage.getItem(liveMatchKey(1))).toBeNull();
    expect(loadSlot(1).status).toBe('empty');
  });

  it('a Classic legacy copy goes, but the League career in slot 1 and its live match stay', async () => {
    const storage = stubLocalStorage();
    const leagueState = await leagueSlotState('League');
    writeSlot(1, leagueState);
    flushSaveMeta();
    const league = storage.getItem(slotKey(1));
    const meta = storage.getItem(saveMetaKey(1));
    const match = matchFor(leagueState);
    storage.setItem(liveMatchKey(1), match);
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(classicCareer('Legacy', 12)));
    expect(deleteClassicSlots()).toEqual([1]);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect(storage.getItem(slotKey(1))).toBe(league);
    expect(storage.getItem(saveMetaKey(1))).toBe(meta);
    expect(storage.getItem(liveMatchKey(1))).toBe(match);
  });

  it('a League career under the legacy key is not touched when slot 1 is Classic', () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Slot One', 9));
    const league = JSON.stringify({ version: 35, clubName: 'Shadowed', competitions: { leagueCareer: { phase: 'active' } } });
    storage.setItem(LEGACY_SAVE_KEY, league);
    expect(deleteClassicSlots()).toEqual([1]);
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(league);
  });

  // Codex r4 blocker 1: Classic in slot 1, a League career under the legacy key, and
  // the League match parked mid-match. The checkpoint is the League career's: it stays.
  it('keeps the legacy League career\'s live match when slot 1 holds a Classic career', async () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Slot One', 9));
    const leagueState = await leagueSlotState('Legacy League');
    const league = JSON.stringify(leagueState);
    storage.setItem(LEGACY_SAVE_KEY, league);
    const match = matchFor(leagueState, 47);
    storage.setItem(liveMatchKey(1), match);
    expect(deleteClassicSlots()).toEqual([1]);
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe(league);
    expect(storage.getItem(liveMatchKey(1))).toBe(match);
    const loaded = loadSlot(1);
    expect(loaded.status === 'ok' && loaded.state.clubName).toBe('Legacy League');
  });

  it('keeps a live match whose owner it cannot prove', () => {
    const storage = stubLocalStorage();
    const classic = classicCareer('Old Club', 9);
    writeSlot(2, classic);
    const stranger = JSON.stringify({ ...JSON.parse(matchFor(classic)), homeId: 'not-a-club' , awayId: 'nor-this' });
    storage.setItem(liveMatchKey(2), stranger);
    expect(deleteClassicSlots()).toEqual([2]);
    expect(storage.getItem(slotKey(2))).toBeNull();
    expect(storage.getItem(liveMatchKey(2))).toBe(stranger);
  });

  it('leaves the whole slot for the next load when a key will not parse', () => {
    const storage = stubLocalStorage();
    writeSlot(2, classicCareer('Old Club', 9));
    const raw = storage.getItem(slotKey(2));
    storage.setItem(liveMatchKey(2), '{not json');
    expect(deleteClassicSlots()).toEqual([]);
    expect(storage.getItem(slotKey(2))).toBe(raw);
    expect(storage.getItem(liveMatchKey(2))).toBe('{not json');
    storage.removeItem(liveMatchKey(2));
    expect(deleteClassicSlots()).toEqual([2]);
  });

  it('leaves slot 1 whole when the legacy key will not parse', () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('Slot One', 9));
    const raw = storage.getItem(slotKey(1));
    storage.setItem(LEGACY_SAVE_KEY, 'garbled');
    expect(deleteClassicSlots()).toEqual([]);
    expect(storage.getItem(slotKey(1))).toBe(raw);
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBe('garbled');
  });

  it('deletes a playtest Classic career under its own prefix and leaves the normal slot', () => {
    const storage = stubLocalStorage();
    const normal = JSON.stringify(classicCareer('Normal', 1));
    storage.setItem(slotKey(1), normal);
    setCareerNamespace(DEV_TEST_PREFIX);
    writeSlot(1, classicCareer('Playtest', 2));
    expect(deleteClassicSlots()).toEqual([1]);
    expect(storage.getItem(DEV_TEST_PREFIX + slotKey(1))).toBeNull();
    expect(storage.getItem(slotKey(1))).toBe(normal);
  });

  it('refuses a Classic import and does not install it', () => {
    const storage = stubLocalStorage();
    const res = installImportedSave(JSON.stringify(classicCareer('Imported', 6)), 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(CLASSIC_RETIRED_TEXT);
    expect(storage.getItem(slotKey(1))).toBeNull();
  });

  it('does not change the commercial first-run record', () => {
    const storage = stubLocalStorage();
    __setCommercial(true);
    __resetDemo();
    writeSlot(1, classicCareer('Old Club', 5));
    recordFirstRun(getSlotSummaries(), 1000);
    const recorded = storage.getItem(FIRST_RUN_KEY);
    expect(deleteClassicSlots()).toEqual([1]);
    recordFirstRun(getSlotSummaries(), 2000);
    expect(storage.getItem(FIRST_RUN_KEY)).toBe(recorded);
  });
});
