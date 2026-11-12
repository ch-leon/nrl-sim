import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __setLabs, fieldLengthPreference, setFieldLengthPreference } from '../../src/labs/flags';
import { applyFieldLength, resetFieldSelection, type FieldSelectionDeps, type FieldResetDeps } from '../../src/labs/fieldSelection';
import { setMatchSceneProbe, type MatchProbe, type SwitchResult } from '../../src/labs/devCareer';
import { LABS_KEY, slotKey } from '../../src/core/storageKeys';
import { __flushSaveMeta, __setStorage, __unlockSaves, save, setActiveSlot } from '../../src/core/save';
import { createNewGame, getState, setState } from '../../src/core/state';

const idle: MatchProbe = { held: false, parked: false, resumable: false, advancing: false, matchScene: false };
let stored: Map<string, string>;
const deps = (): FieldSelectionDeps => ({
  probe: idle, save: vi.fn(() => true), persist: setFieldLengthPreference, reload: vi.fn(),
});
beforeEach(() => {
  stored = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
    removeItem: (key: string) => { stored.delete(key); },
  });
  __setStorage(null);
  __unlockSaves();
  setActiveSlot(1);
  setMatchSceneProbe(() => false);
  __setLabs({ visible: true, on: {}, hintsSeen: [] });
});
afterEach(() => { __flushSaveMeta(); setMatchSceneProbe(() => false); __setLabs(null); vi.unstubAllGlobals(); });

describe('applying the field experiment', () => {
  it.each([100, 80, 60] as const)('saves progress, reads back %sm and then reloads', (length) => {
    const d = deps();
    const order: string[] = [];
    d.save = () => { order.push('save'); return true; };
    d.persist = (n) => { order.push('persist'); return setFieldLengthPreference(n); };
    d.reload = () => { order.push('reload'); expect(fieldLengthPreference()).toBe(length); };
    expect(applyFieldLength(length, d)).toEqual({ ok: true });
    expect(order).toEqual(['save', 'persist', 'reload']);
    expect(JSON.parse(stored.get(LABS_KEY)!).fieldLength ?? 100).toBe(length);
  });

  it.each(['held', 'parked', 'resumable', 'advancing', 'matchScene'] as const)('rechecks %s at Apply time before any mutation', (busy) => {
    const d = deps();
    d.probe = { ...idle, [busy]: true };
    d.persist = vi.fn(setFieldLengthPreference);
    expect(applyFieldLength(80, d)).toMatchObject({ ok: false, why: expect.any(String) });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.persist).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
    expect(fieldLengthPreference()).toBe(100);
  });

  it('keeps the current field when the latest career progress cannot save', () => {
    const d = deps();
    d.save = () => false;
    d.persist = vi.fn(setFieldLengthPreference);
    expect(applyFieldLength(60, d)).toMatchObject({ ok: false, why: expect.stringMatching(/didn't save/) });
    expect(d.persist).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
    expect(fieldLengthPreference()).toBe(100);
  });

  it.each(['throws', 'ignores'] as const)('reports a storage write that %s without reloading or changing the choice', (failure) => {
    const d = deps();
    localStorage.setItem = () => { if (failure === 'throws') throw new Error('quota'); };
    expect(applyFieldLength(80, d)).toMatchObject({ ok: false, why: expect.stringMatching(/couldn't be saved/) });
    expect(d.reload).not.toHaveBeenCalled();
    expect(fieldLengthPreference()).toBe(100);
  });

  it('the actual Apply action saves unsaved progress before the reload', () => {
    createNewGame('Field Test', 42);
    save(getState());
    setState({ money: getState().money + 123 });
    const reload = vi.fn(() => {
      expect(JSON.parse(stored.get(slotKey(1))!).money).toBe(getState().money);
      expect(fieldLengthPreference()).toBe(80);
    });
    vi.stubGlobal('location', { search: '', reload });
    expect(applyFieldLength(80)).toEqual({ ok: true });
    expect(reload).toHaveBeenCalledOnce();
  });

  it('the actual Apply action keeps an unchanged save byte for byte', () => {
    createNewGame('Field Test', 42);
    save(getState());
    __flushSaveMeta();
    const before = stored.get(slotKey(1));
    const write = vi.spyOn(localStorage, 'setItem');
    vi.stubGlobal('location', { search: '', reload: vi.fn() });
    expect(applyFieldLength(60)).toEqual({ ok: true });
    expect(stored.get(slotKey(1))).toBe(before);
    expect(write.mock.calls.filter(([key]) => key === slotKey(1))).toEqual([]);
    write.mockRestore();
  });

  it('the actual Apply action checks the current scene again after the panel has opened', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { search: '', reload });
    setMatchSceneProbe(() => true);
    expect(applyFieldLength(80)).toMatchObject({ ok: false, why: expect.stringMatching(/Finish the match/) });
    expect(fieldLengthPreference()).toBe(100);
    expect(stored.has(LABS_KEY)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('refuses an invalid choice before saving or persisting', () => {
    const d = deps();
    expect(applyFieldLength(90, d)).toMatchObject({ ok: false });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
  });
});

const resetDeps = (activeLength = 80, inTest = false): FieldResetDeps => ({
  ...deps(), activeLength, inTest, reset: vi.fn((): SwitchResult => ({ ok: true })),
});
describe('Reset all with a shorter frozen field', () => {
  it('saves progress and verifies the default before resetting and reloading', () => {
    const d = resetDeps();
    const order: string[] = [];
    d.save = () => { order.push('save'); return true; };
    d.persist = n => { order.push(`persist-${n}`); return setFieldLengthPreference(n); };
    d.reset = () => { order.push('reset'); return { ok: true }; };
    d.reload = () => { order.push('reload'); };
    expect(resetFieldSelection(d)).toEqual({ ok: true });
    expect(order).toEqual(['save', 'persist-100', 'reset', 'reload']);
    expect(fieldLengthPreference()).toBe(100);
  });

  it.each(['held', 'parked', 'resumable', 'advancing', 'matchScene'] as const)('refuses during %s without clearing any switches', busy => {
    const d = resetDeps();
    d.probe = { ...idle, [busy]: true };
    expect(resetFieldSelection(d)).toMatchObject({ ok: false });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.reset).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
  });

  it('keeps all switches when progress cannot save', () => {
    const d = resetDeps();
    d.save = () => false;
    expect(resetFieldSelection(d)).toMatchObject({ ok: false });
    expect(d.reset).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
  });

  it('keeps all switches and the current field when the default cannot persist', () => {
    setFieldLengthPreference(80);
    const d = resetDeps();
    localStorage.setItem = () => { throw new Error('quota'); };
    expect(resetFieldSelection(d)).toMatchObject({ ok: false });
    expect(fieldLengthPreference()).toBe(80);
    expect(d.reset).not.toHaveBeenCalled();
    expect(d.reload).not.toHaveBeenCalled();
  });

  it('shows a refused career reset without reloading', () => {
    const d = resetDeps();
    d.reset = () => ({ ok: false, why: 'A match is waiting to resume.' });
    expect(resetFieldSelection(d)).toEqual({ ok: false, why: 'A match is waiting to resume.' });
    expect(d.reload).not.toHaveBeenCalled();
  });

  it('uses the playtest reset’s existing reload once', () => {
    const d = resetDeps(60, true);
    expect(resetFieldSelection(d)).toEqual({ ok: true });
    expect(d.reset).toHaveBeenCalledOnce();
    expect(d.reload).not.toHaveBeenCalled();
  });

  it('leaves the ordinary 100m reset behavior intact', () => {
    const d = resetDeps(100);
    expect(resetFieldSelection(d)).toEqual({ ok: true });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.reset).toHaveBeenCalledOnce();
    expect(d.reload).not.toHaveBeenCalled();
  });
});
