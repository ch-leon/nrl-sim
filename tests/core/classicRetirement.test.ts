import { afterEach, describe, expect, it } from 'vitest';
import { __resetDemo, FIRST_RUN_KEY, recordFirstRun } from '../../src/commercial/demo';
import { __setCommercial } from '../../src/commercial/flags';
import {
  __setStorage, getSlotSummaries, loadSlot, slotKey, writeSlot,
  installImportedSave, markClassicRetirementShown, readRetiredSave, readRetiredSaves, retireClassicSlot, retireClassicSlots,
} from '../../src/core/save';
import { CLASSIC_RETIRED_TEXT } from '../../src/core/classicSave';
import { createNewGame, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';

function classicCareer(name: string, seed: number): GameState {
  const state = createNewGame(name, seed);
  state.league = initLeague(state);
  return state;
}
import { classicRetiredNoticeKey, DEV_TEST_PREFIX, retiredSaveKey } from '../../src/core/storageKeys';
import { setCareerNamespace } from '../../src/core/storage/local';
import { stubLocalStorage } from '../commercial/memStorage';

afterEach(() => {
  setCareerNamespace(null);
  __setStorage(null);
  __setCommercial(false);
  __resetDemo();
});

describe('retiring a Classic save', () => {
  it('archives the raw bytes, empties the slot, and asks once', () => {
    const storage = stubLocalStorage();
    const state = classicCareer('Old Club', 9);
    writeSlot(1, state);
    const raw = storage.getItem(slotKey(1))!;
    const first = retireClassicSlot(1);
    expect(first).toEqual({ slot: 1, raw, emptied: true, notify: true });
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(storage.getItem(retiredSaveKey(1))).toBe(raw);
    expect(readRetiredSave(1)).toBe(raw);
    expect(loadSlot(1).status).toBe('empty');
    expect(getSlotSummaries().find((s) => s.slot === 1)?.status).toBe('empty');

    markClassicRetirementShown(1);
    storage.setItem(slotKey(1), raw);
    expect(retireClassicSlot(1)).toEqual({ slot: 1, raw, emptied: true, notify: false });
    expect(storage.getItem(classicRetiredNoticeKey(1))).toBe('1');
    expect(storage.getItem(slotKey(1))).toBeNull();
  });

  it('does not delete the slot when the archive cannot be stored', () => {
    const storage = stubLocalStorage();
    writeSlot(2, classicCareer('Keep', 3));
    const raw = storage.getItem(slotKey(2))!;
    storage.setItem = (key, value) => {
      if (key === retiredSaveKey(2)) throw new Error('quota');
      storage.map.set(key, String(value));
    };
    expect(retireClassicSlot(2)).toEqual({ slot: 2, raw, emptied: false, notify: true });
    expect(storage.getItem(slotKey(2))).toBe(raw);
    expect(storage.getItem(retiredSaveKey(2))).toBeNull();
  });

  it('leaves a League career and a structural calendar in place', () => {
    const storage = stubLocalStorage();
    const league = JSON.stringify({ version: 35, clubName: 'Stay', competitions: { leagueCareer: { phase: 'active' } } });
    const prototype = JSON.stringify({ version: 32, competitions: { calendar: { mode: 'structural' } } });
    storage.setItem(slotKey(1), league);
    storage.setItem(slotKey(3), prototype);
    expect(retireClassicSlots()).toEqual([]);
    expect(storage.getItem(slotKey(1))).toBe(league);
    expect(storage.getItem(slotKey(3))).toBe(prototype);
  });

  it('archives a playtest Classic career under its own prefix and leaves the normal slot', () => {
    const storage = stubLocalStorage();
    const normal = JSON.stringify({ version: 35, clubName: 'Normal' });
    storage.setItem(slotKey(1), normal);
    setCareerNamespace(DEV_TEST_PREFIX);
    writeSlot(1, classicCareer('Playtest', 2));
    const retired = retireClassicSlot(1);
    expect(retired?.emptied).toBe(true);
    expect(storage.getItem(slotKey(1))).toBe(normal);
    expect(storage.getItem(DEV_TEST_PREFIX + slotKey(1))).toBeNull();
    expect(storage.getItem(DEV_TEST_PREFIX + retiredSaveKey(1))).toBe(retired!.raw);
  });

  it('keeps a second Classic career beside the first instead of replacing it', () => {
    const storage = stubLocalStorage();
    writeSlot(1, classicCareer('First', 9));
    const first = storage.getItem(slotKey(1))!;
    expect(retireClassicSlot(1)?.emptied).toBe(true);
    writeSlot(1, classicCareer('Second', 11));
    const second = storage.getItem(slotKey(1))!;
    expect(second).not.toBe(first);
    expect(retireClassicSlot(1)?.emptied).toBe(true);
    expect(readRetiredSaves(1)).toEqual([first, second]);
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(loadSlot(1).status).toBe('empty');
  });

  it('refuses a Classic import and does not install it', () => {
    const storage = stubLocalStorage();
    const classic = JSON.stringify(classicCareer('Imported', 6));
    const res = installImportedSave(classic, 1);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(CLASSIC_RETIRED_TEXT);
    expect(storage.getItem(slotKey(1))).toBeNull();
    expect(readRetiredSaves(1)).toEqual([]);
  });

  it('does not change the commercial first-run record', () => {
    const storage = stubLocalStorage();
    __setCommercial(true);
    __resetDemo();
    writeSlot(1, classicCareer('Old Club', 5));
    recordFirstRun(getSlotSummaries(), 1000);
    const recorded = storage.getItem(FIRST_RUN_KEY);
    expect(JSON.parse(recorded!)).toEqual({ at: 1000, slots: [{ slot: 1, clubName: 'Old Club' }] });
    expect(retireClassicSlot(1)?.emptied).toBe(true);
    recordFirstRun(getSlotSummaries(), 2000);
    expect(storage.getItem(FIRST_RUN_KEY)).toBe(recorded);
    expect(getSlotSummaries().every((s) => s.status === 'empty')).toBe(true);
  });
});
