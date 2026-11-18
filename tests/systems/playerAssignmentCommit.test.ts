import { readFileSync } from 'node:fs';
import { preparePack } from '../../src/content';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { __setStorage, __unlockSaves, installImportedSave, setActiveSlot } from '../../src/core/save';
import { getState, loadState, setState } from '../../src/core/state';
import { slotKey } from '../../src/core/storageKeys';
import { captureCampAction, confirmCampAction } from '../../src/systems/playerAssignmentCommit';
import { currentSkillsCamp } from '../../src/systems/playerAssignments';

beforeAll(async () => {
  await preparePack('uk');
});
function setup() {
  const bytes = new Map<string, string>();
  let fail = false;
  __setStorage({
    getItem: (k) => bytes.get(k) ?? null,
    setItem: (k, v) => {
      if (!fail) bytes.set(k, v);
    },
    removeItem: (k) => {
      bytes.delete(k);
    }
  });
  __unlockSaves();
  setActiveSlot(1);
  const raw = readFileSync(new URL('../fixtures/saves/v33-assignments/v33-uk-week-4.json', import.meta.url), 'utf8');
  const result = installImportedSave(raw, 1);
  if (!result.ok) throw Error(result.message);
  loadState(result.state);
  const p = getState().squad.find((p) => !p.injuredWeeks && !p.suspendedWeeks)!;
  const quote = captureCampAction({
    kind: 'book',
    participantId: p.id,
    focus: getState().settings.spendPointsMyself ? null : 'balanced'
  });
  if (!quote.ok) throw Error(quote.message);
  return {
    selection: quote.selection,
    bytes,
    breakWrites: () => {
      fail = true;
    }
  };
}
afterEach(() => {
  __setStorage(null);
});
it.each(['state', 'installation', 'slot', 'write'] as const)(
  'preserves the original booking and slot with a changed %s',
  (fault) => {
    const { selection, bytes, breakWrites } = setup();
    const saved = bytes.get(slotKey(1));
    if (fault === 'state') setState({});
    if (fault === 'installation') loadState(getState());
    if (fault === 'slot') setActiveSlot(2);
    if (fault === 'write') breakWrites();
    expect(confirmCampAction(selection)).toMatchObject({ ok: false, reason: fault === 'write' ? 'storage' : 'stale' });
    expect(currentSkillsCamp(getState())?.status).toBe('available');
    expect(bytes.get(slotKey(1))).toBe(saved);
  }
);
it('saves once before publishing the booking and rejects duplicate confirmation', () => {
  const { selection, bytes } = setup();
  expect(confirmCampAction(selection).ok).toBe(true);
  expect(bytes.get(slotKey(1))).toBe(JSON.stringify(getState()));
  expect(currentSkillsCamp(getState())?.revision).toBe(1);
  expect(confirmCampAction(selection)).toMatchObject({ ok: false, reason: 'stale' });
});
