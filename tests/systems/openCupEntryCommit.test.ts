import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, installImportedSave, loadSlot, setActiveSlot } from '../../src/core/save';
import { getState, loadState, setState } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { advanceWeek, clearHeldWeek, clearTickHooks, registerTickHook, weekHeld } from '../../src/core/time';
import { captureOpenCupEntryPreview, confirmOpenCupChoice } from '../../src/systems/openCupEntryCommit';
import { commitUndo, currentOffer, offerUndo } from '../../src/systems/undo';

function setup() {
  const bytes = new Map<string, string>();
  const store = {
    getItem: (k: string) => bytes.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => {
      bytes.set(k, v);
    }),
    removeItem: (k: string) => {
      bytes.delete(k);
    }
  };
  __setStorage(store);
  __unlockSaves();
  setActiveSlot(1);
  const input = readFileSync(new URL('../fixtures/saves/league-career/v32-au-week-6.json', import.meta.url), 'utf8');
  const result = installImportedSave(input, 1);
  if (!result.ok) throw Error(result.message);
  loadState(result.state);
  const p = captureOpenCupEntryPreview();
  if (!p.ok) throw Error(p.message);
  return { bytes, store, selection: { ...p.preview, choice: 'enter' as const } };
}
afterEach(() => {
  clearHeldWeek();
  clearTickHooks();
  bus.clear();
  commitUndo();
  __setStorage(null);
  vi.restoreAllMocks();
});
it('persists the choice before installation and preserves the live sidecar and Undo', () => {
  const { bytes, selection } = setup();
  bytes.set(liveMatchKey(1), 'existing sidecar');
  const undo = { kind: 'build' as const, text: 'Undo', expiresAt: Number.MAX_SAFE_INTEGER, canRevert: () => true, revert: () => {} };
  offerUndo(undo);
  const seen: string[] = [];
  bus.on('state:changed', () => seen.push(bytes.get(slotKey(1))!));
  expect(confirmOpenCupChoice(selection).ok).toBe(true);
  expect(seen).toEqual([JSON.stringify(getState())]);
  expect(bytes.get(liveMatchKey(1))).toBe('existing sidecar');
  expect(currentOffer()).toBe(undo);
  expect(loadSlot(1)).toMatchObject({ status: 'ok', state: { competitions: { openCupEntry: { current: { choice: 'enter' } } } } });
});
it('refuses an action inside the synchronous interval before a held token exists', () => {
  const { selection } = setup();
  const attempted = vi.fn();
  registerTickHook('choose-in-interval', 0, ctx => {
    attempted(weekHeld(), confirmOpenCupChoice(selection));
    ctx.hold!();
  });
  advanceWeek();
  expect(attempted).toHaveBeenCalledWith(false, expect.objectContaining({ ok: false, reason: 'held' }));
});
it.each(['quota', 'readback', 'source change'] as const)('keeps the choice out of the slot after %s', fault => {
  const { bytes, store, selection } = setup();
  const original = bytes.get(slotKey(1))!;
  store.setItem.mockImplementation((k, v) => {
    if (k === slotKey(1) && v !== original) {
      if (fault === 'quota') throw Error('quota');
      if (fault === 'source change') setState({ clubName: 'Changed while saving' });
      bytes.set(k, fault === 'readback' ? 'damaged bytes' : v);
    } else bytes.set(k, v);
  });
  expect(confirmOpenCupChoice(selection).ok).toBe(false);
  expect(bytes.get(slotKey(1))).toBe(original);
  expect(getState().competitions!.openCupEntry!.current.choice).toBe('unanswered');
});

it.each(['slot and installation', 'installation', 'source'] as const)(
  'rejects a byte-identical career after a preview changes %s',
  change => {
    const { bytes, selection } = setup();
    const old = getState();
    if (change === 'slot and installation') {
      expect(installImportedSave(JSON.stringify(old), 2).ok).toBe(true);
      setActiveSlot(2);
      const loaded = loadSlot(2);
      if (loaded.status !== 'ok') throw Error('expected second slot');
      loadState(loaded.state);
    } else if (change === 'installation') loadState(old);
    else setState({});
    const before = new Map(bytes),
      source = getState();
    expect(confirmOpenCupChoice(selection)).toMatchObject({ ok: false, reason: 'stale' });
    expect(getState()).toBe(source);
    expect(bytes).toEqual(before);
  }
);
