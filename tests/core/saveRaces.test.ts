// #819: the save critical section, with the interleavings a second tab could produce.
// A "second tab" is a fresh copy of the save modules (its own lock state), sharing storage.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setStorage, deleteRetiredSave, readRetiredSaves, retiredSaveId, retireClassicSlot, slotKey, writeSlot,
} from '../../src/core/save';
import { createNewGame, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { DEVICE_ID_KEY, retiredSaveKey, saveMetaKey, SAVE_LOCK_KEY } from '../../src/core/storageKeys';
import { stubLocalStorage, type MemStorage } from '../commercial/memStorage';

type SaveModule = typeof import('../../src/core/save');

function classicCareer(name: string, seed: number): GameState {
  const state = createNewGame(name, seed);
  state.league = initLeague(state);
  return state;
}

const bundle = (saves: string[]): string => JSON.stringify({ kind: 'nrl-retired-saves', saves });

/** Run `during` once, the first time `key` is read: a moment inside the caller's critical section. */
function onFirstRead(storage: MemStorage, key: string, during: () => void): void {
  const get = storage.getItem.bind(storage);
  let fired = false;
  storage.getItem = (k: string) => {
    if (k === key && !fired) { fired = true; during(); }
    return get(k);
  };
}

async function secondTab(): Promise<SaveModule> {
  vi.resetModules();
  return import('../../src/core/save');
}

let storage: MemStorage;
beforeEach(() => { storage = stubLocalStorage(); });
afterEach(() => { __setStorage(null); vi.unstubAllGlobals(); });

describe('one critical section across tabs (#819)', () => {
  it('a second tab cannot touch the archive while the first is archiving, so no career is dropped', async () => {
    const old = JSON.stringify(classicCareer('Archived earlier', 3));
    storage.setItem(retiredSaveKey(1), old);
    writeSlot(1, classicCareer('Retiring now', 9));
    const raw = storage.getItem(slotKey(1))!;
    const tabB = await secondTab();
    const seen: unknown[] = [];
    onFirstRead(storage, retiredSaveKey(1), () => {
      expect(storage.getItem(SAVE_LOCK_KEY)).not.toBeNull();
      // The other tab would have written its stale view of the bundle here.
      seen.push(tabB.deleteRetiredSave(1, retiredSaveId(old)), tabB.retireClassicSlot(1));
    });
    expect(retireClassicSlot(1)).toMatchObject({ slot: 1, raw, emptied: true });
    expect(seen).toEqual([false, null]);
    expect(readRetiredSaves(1)).toEqual([old, raw]);
    expect(storage.getItem(SAVE_LOCK_KEY)).toBeNull();
    // Once the section is free, the other tab's delete goes through against the latest list.
    expect(tabB.deleteRetiredSave(1, retiredSaveId(old))).toBe(true);
    expect(readRetiredSaves(1)).toEqual([raw]);
  });

  it('merges a new retirement into the latest bundle by id instead of writing a stale copy back', () => {
    const a = JSON.stringify(classicCareer('A', 1));
    const b = JSON.stringify(classicCareer('B', 2));
    storage.setItem(retiredSaveKey(1), bundle([a]));
    writeSlot(1, classicCareer('C', 9));
    const c = storage.getItem(slotKey(1))!;
    // Another tab finished archiving B just before this one entered the section.
    onFirstRead(storage, retiredSaveKey(1), () => storage.map.set(retiredSaveKey(1), bundle([a, b])));
    expect(retireClassicSlot(1)?.emptied).toBe(true);
    expect(readRetiredSaves(1)).toEqual([a, b, c]);
    // The same career archived again (a retry) is not duplicated.
    storage.setItem(slotKey(1), c);
    expect(retireClassicSlot(1)?.emptied).toBe(true);
    expect(readRetiredSaves(1)).toEqual([a, b, c]);
  });

  it('Settings deletes by id: two stale views cannot delete two different careers', () => {
    const a = JSON.stringify(classicCareer('A', 1));
    const b = JSON.stringify(classicCareer('B', 2));
    storage.setItem(retiredSaveKey(2), bundle([a, b]));
    // Both views drew [A, B] and the player taps Delete on A in each.
    const shown = readRetiredSaves(2).map(retiredSaveId);
    expect(deleteRetiredSave(2, shown[0]!)).toBe(true);
    expect(deleteRetiredSave(2, shown[0]!)).toBe(false);
    expect(readRetiredSaves(2)).toEqual([b]);
  });

  it('Start over never overwrites a replacement that lands during the metadata lookup', async () => {
    writeSlot(1, createNewGame('Shown in the prompt', 4));
    const shown = storage.getItem(slotKey(1))!;
    await new Promise((r) => setTimeout(r, 0)); // the queued meta is flushed, so the write looks it up
    const replacement = JSON.stringify({ ...JSON.parse(shown), clubName: 'Other tab' });
    const inject = () => storage.map.set(slotKey(1), replacement);
    onFirstRead(storage, saveMetaKey(1), inject);
    onFirstRead(storage, DEVICE_ID_KEY, inject);
    expect(writeSlot(1, createNewGame('Start over', 5), shown)).toBe(false);
    expect(storage.getItem(slotKey(1))).toBe(replacement);
  });

  it('Start over refuses while another tab is in the section', async () => {
    writeSlot(1, createNewGame('Shown', 4));
    const shown = storage.getItem(slotKey(1))!;
    storage.setItem(SAVE_LOCK_KEY, JSON.stringify({ token: 'other-tab:1', expires: Date.now() + 60_000 }));
    expect(writeSlot(1, createNewGame('Start over', 5), shown)).toBe(false);
    expect(storage.getItem(slotKey(1))).toBe(shown);
  });
});
