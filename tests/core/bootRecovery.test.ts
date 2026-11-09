import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, expect, it, vi } from 'vitest';
import { __setStorage, __unlockSaves, getSlotSummaries, loadSlot, setActiveSlot } from '../../src/core/save';
import { createNewGame } from '../../src/core/state';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';

afterEach(() => { __setStorage(null); vi.restoreAllMocks(); });

it('the actual boot Continue loop returns to recovery when a selected save becomes rejected (#522)', async () => {
  const bytes = new Map([[slotKey(1), JSON.stringify(createNewGame('Continue', 525))], [liveMatchKey(1), 'parked match original']]);
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  __unlockSaves(); setActiveSlot(1);
  expect(getSlotSummaries()[0].status).toBe('ok');
  const reachedRecovery = new Error('recovery shown');
  const showTitleFlow = vi.fn().mockImplementationOnce(async () => {
    // Another tab/storage change after the title offered Continue.
    bytes.set(slotKey(1), '{rejected after Continue');
    return { mode: 'continue' };
  }).mockImplementationOnce(async () => { throw reachedRecovery; });
  const defaults = vi.fn(); const clearLiveMatch = vi.fn(); const loadState = vi.fn(); const preparePack = vi.fn();
  // Execute the real boot section in isolation: importing main itself would boot
  // Phaser and register every system. No copy of the guard under test lives here.
  const main = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
  const section = main.slice(main.indexOf('  let choice = playtest'), main.indexOf('  if (getState().league.clubs.length === 0)'));
  expect(section).toContain('while (');
  const js = ts.transpileModule(section, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
  const run = new Function('showTitleFlow', 'loadSlot', 'createNewGame', 'clearLiveMatch', 'loadState', 'preparePack', `return (async () => { const playtest = null; const uiRoot = {}; ${js} })();`);
  await expect(run(showTitleFlow, loadSlot, defaults, clearLiveMatch, loadState, preparePack)).rejects.toBe(reachedRecovery);
  expect(showTitleFlow).toHaveBeenCalledTimes(2);
  expect(defaults).not.toHaveBeenCalled(); expect(loadState).not.toHaveBeenCalled(); expect(clearLiveMatch).not.toHaveBeenCalled(); expect(preparePack).not.toHaveBeenCalled();
  expect(bytes.get(slotKey(1))).toBe('{rejected after Continue');
  expect(bytes.get(liveMatchKey(1))).toBe('parked match original');
  expect(getSlotSummaries()[0].status).toBe('corrupt');
});
