import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { bus, type Events } from '../../src/core/events';
import { __setStorage, __unlockSaves, installImportedSave, setActiveSlot } from '../../src/core/save';
import { SAVE_VERSION, getState, loadState } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import {
  advanceWeek,
  clearHeldWeek,
  clearSeasonHooks,
  clearTickHooks,
  failedIntervalProblem,
  weekHeld
} from '../../src/core/time';
import { registerAllSystems, advanceWeekAsTapped } from '../../src/qa/soak';
import { LIVE_MATCH_EXPORT_FIELD } from '../../src/systems/liveMatchRecord';

const capture = (name: string) =>
  readFileSync(new URL('../fixtures/saves/v33-assignments/' + name + '.json', import.meta.url), 'utf8');
afterEach(() => {
  clearHeldWeek();
  clearTickHooks();
  clearSeasonHooks();
  bus.clear();
  __setStorage(null);
  vi.unstubAllGlobals();
});
it.each(['au', 'uk'] as const)(
  'reconstructs the complete released %s Week 5 boundary and its original parked match',
  async (pack) => {
    await preparePack(pack);
    selectPack(pack);
    const bytes = new Map<string, string>();
    const store = {
      getItem: (k: string) => bytes.get(k) ?? null,
      setItem: (k: string, v: string) => {
        bytes.set(k, v);
      },
      removeItem: (k: string) => {
        bytes.delete(k);
      }
    };
    vi.stubGlobal('localStorage', store);
    __setStorage(store);
    __unlockSaves();
    setActiveSlot(1);
    const w4 = capture('v33-' + pack + '-week-4'),
      w5 = JSON.parse(capture('v33-' + pack + '-week-5'));
    const originalSidecar = capture('live-matches/v33-' + pack + '-week-5'),
      live = JSON.parse(originalSidecar);
    const first = installImportedSave(w4, 1);
    if (!first.ok) throw Error(first.message);
    loadState(first.state);
    registerAllSystems();
    advanceWeekAsTapped();
    expect({ ...getState(), version: 33 }).toEqual(w5);
    expect(bytes.get(slotKey(1))).toBe(JSON.stringify({ ...w5, version: SAVE_VERSION }));
    const parked = installImportedSave(JSON.stringify({ ...w5, [LIVE_MATCH_EXPORT_FIELD]: live }), 1);
    if (!parked.ok) throw Error(parked.message);
    loadState(parked.state);
    const kickoffs: Events['match:started'][] = [];
    bus.on('match:started', (e) => kickoffs.push(e));
    advanceWeek();
    expect(failedIntervalProblem()).toBeNull();
    expect(weekHeld()).toBe(true);
    expect(kickoffs).toHaveLength(1);
    expect(kickoffs[0]!.fixture.id).toBe(live.fixtureId);
    expect(kickoffs[0]!.live.seed).toBe(live.seed);
    expect(bytes.get(liveMatchKey(1))).toBe(originalSidecar);
  }
);
