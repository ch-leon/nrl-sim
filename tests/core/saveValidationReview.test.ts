import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, emptyFinance, FINANCE_LINES, loadState, type ActiveModifier, type GameState } from '../../src/core/state';
import { __setStorage, __unlockSaves, exportOriginalSave, importSave, installImportedSave, load, loadSlot, migrateState, setActiveSlot } from '../../src/core/save';
import { isActiveModifier, isImmediateEffect } from '../../src/core/saveValidation';
import { liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { setCareerNamespace } from '../../src/core/storage/local';
import { bus } from '../../src/core/events';
import { registerFinanceSystem } from '../../src/systems/economy';
import { tickModifiers } from '../../src/systems/events';
import { TRAIT_IDS } from '../../src/data/traits';
import { initLeague } from '../../src/systems/fixtures';
import { getState } from '../../src/core/state';
import type { ImmediateEffect } from '../../src/data/events';

let bytes: Map<string, string>;
const fresh = (): GameState => createNewGame('Checker regression', 525);
const modifier = (): ActiveModifier => ({
  id: 'merchDeal-1-0', cardId: 'merchDeal', label: 'Merch royalties',
  trigger: 'weekly', weeksLeft: 2, effects: [{ kind: 'money', amount: 900 }],
});
beforeEach(() => {
  bus.clear(); setCareerNamespace(null); __unlockSaves(); setActiveSlot(1);
  bytes = new Map();
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { bus.clear(); __setStorage(null); vi.restoreAllMocks(); });

/** Exercise both installation boundaries, including #522's raw recovery path.
 * Refusal must preserve the source slot, the occupied import destination, and
 * the separate live-match record beside each of them. */
function refusesAtBoundaries(state: unknown): void {
  const source = ` \n${JSON.stringify(state)}\n`;
  const destination = JSON.stringify(fresh());
  bytes.set(slotKey(1), source); bytes.set(liveMatchKey(1), 'source live-match bytes');
  bytes.set(slotKey(2), destination); bytes.set(liveMatchKey(2), 'destination live-match bytes');
  expect(loadSlot(1)).toMatchObject({ status: 'corrupt', outcome: 'unrecoverable' });
  expect(load()).toBeNull();
  expect(exportOriginalSave(1)).toBe(source);
  const beforeImport = new Map(bytes);
  expect(importSave(source)).toMatchObject({ ok: false, outcome: 'unrecoverable' });
  expect(installImportedSave(source, 2)).toMatchObject({ ok: false });
  expect(bytes).toEqual(beforeImport);
  expect(bytes.get(slotKey(1))).toBe(source);
  expect(bytes.get(liveMatchKey(1))).toBe('source live-match bytes');
  expect(bytes.get(slotKey(2))).toBe(destination);
  expect(bytes.get(liveMatchKey(2))).toBe('destination live-match bytes');
}

describe('complete finance rows (checker P1)', () => {
  it.each(['season', ...FINANCE_LINES])('refuses a current row missing %s through load and import', field => {
    const s = fresh();
    s.finance = [emptyFinance(1)];
    delete (s.finance[0] as unknown as Record<string, unknown>)[field];
    refusesAtBoundaries(s);
  });
  it.each(FINANCE_LINES.filter(line => line !== 'overhead'))('refuses a v16 row missing %s instead of fabricating a ledger value', line => {
    const s = { ...fresh(), version: 16, finance: [emptyFinance(1)] };
    delete (s.finance[0] as unknown as Record<string, unknown>)[line];
    refusesAtBoundaries(s);
  });
  it.each([10, 16, 17, 23])('requires the season on a v%i ledger row', version => {
    const s = { ...fresh(), version, finance: [{}] };
    refusesAtBoundaries(s);
  });
  it.each(['bad', null, true, {}, []])('refuses a complete row with an extra nonnumeric value %j through load and import', extra => {
    for (const version of [16, 23]) {
      const s = { ...fresh(), version, finance: [{ ...emptyFinance(1), extra }] };
      refusesAtBoundaries(s);
    }
  });
  it('keeps finite signed extra ledger values unchanged', () => {
    const s = fresh(); s.finance = [{ ...emptyFinance(1), extra: -25.5 } as GameState['finance'][number]];
    const source = JSON.stringify(s);
    bytes.set(slotKey(1), source);
    const loaded = loadSlot();
    expect(loaded).toMatchObject({ status: 'ok', outcome: 'valid' });
    if (loaded.status === 'ok') expect(JSON.stringify(loaded.state)).toBe(source);
    expect(installImportedSave(source, 2)).toMatchObject({ ok: true, outcome: 'valid' });
  });
  it('accepts signed finite ledger amounts unchanged and books the next wage movement without NaN', () => {
    const s = fresh(); s.finance = [{ ...emptyFinance(1), wages: -500, other: -100.5, gate: 200 }];
    const source = JSON.stringify(s);
    bytes.set(slotKey(1), source);
    const loaded = loadSlot();
    expect(loaded).toMatchObject({ status: 'ok', outcome: 'valid' });
    if (loaded.status !== 'ok') throw new Error('Expected valid finance');
    expect(JSON.stringify(loaded.state)).toBe(source);
    expect(installImportedSave(source, 2)).toMatchObject({ ok: true, outcome: 'valid' });
    loadState(loaded.state);
    const off = registerFinanceSystem();
    try {
      bus.emit('money:changed', { delta: -25, reason: 'wages', balance: s.money - 25 });
      expect(getState().finance[0]!.wages).toBe(-525);
      expect(FINANCE_LINES.every(line => Number.isFinite(getState().finance[0]![line]))).toBe(true);
    } finally { off(); }
  });
  it.each([10, 16])('rejects the historical pre-v17 overhead format for v%i without changing source bytes', version => {
    const s = { ...fresh(), version, finance: [{ ...emptyFinance(1), wages: -500 }] };
    delete (s.finance[0] as unknown as Record<string, unknown>).overhead;
    const source = JSON.stringify(s);
    bytes.set(slotKey(1), source);
    expect(loadSlot()).toMatchObject({ status: 'corrupt', message: expect.stringMatching(/start a new career/i) });
    expect(bytes.get(slotKey(1))).toBe(source);
    expect(installImportedSave(source, 2)).toMatchObject({ ok: false });
    expect(JSON.stringify(s)).toBe(source);
  });
});

describe('modifier payloads (checker P1)', () => {
  it.each(['id', 'cardId', 'label', 'trigger', 'weeksLeft', 'effects'])('refuses a modifier missing %s', field => {
    const s = fresh(); const m = { ...modifier() } as Record<string, unknown>;
    delete m[field];
    (s.eventDeck.modifiers as unknown[]) = [m];
    refusesAtBoundaries(s);
  });
  it('refuses the checker reproduction with no identity, label or effects', () => {
    const s = fresh();
    (s.eventDeck.modifiers as unknown[]) = [{ trigger: 'weekly', weeksLeft: 2 }];
    refusesAtBoundaries(s);
  });
  it.each([
    { id: 3 }, { cardId: null }, { label: [] }, { trigger: 'draw' }, { weeksLeft: -1 },
    { weeksLeft: 0 }, { weeksLeft: 1.5 }, { effects: null }, { effects: {} },
    { subjectId: 7 }, { subjectName: false },
  ])('refuses malformed modifier fields %j', patch => {
    const s = fresh(); (s.eventDeck.modifiers as unknown[]) = [{ ...modifier(), ...patch }];
    refusesAtBoundaries(s);
  });
  it.each([
    null, {}, { kind: 'unknown' }, { kind: 'money' }, { kind: 'money', amount: '900' },
    { kind: 'reputation', amount: null }, { kind: 'squadMorale', amount: false },
    { kind: 'playerMorale', amount: [] }, { kind: 'boardPatience', amount: {} },
    { kind: 'playerWage' }, { kind: 'playerWage', pct: '0.1' }, { kind: 'playerWage', pct: -1.1 },
    { kind: 'playerTrait', trait: 'unknown' }, { kind: 'playerTrait', trait: 'toString' },
    { kind: 'playerTrait', trait: '__proto__' }, { kind: 'playerTrait' },
    { kind: 'flag' }, { kind: 'flag', id: 1 }, { kind: 'suspend', weeks: 2 },
    { kind: 'suspend', weeks: 2, source: 'unknown' }, { kind: 'suspend', weeks: [3, 1], source: 'event' },
    { kind: 'suspend', weeks: [1], source: 'event' }, { kind: 'suspend', weeks: [1, '3'], source: 'event' },
    { kind: 'suspend', weeks: -1, source: 'event' }, { kind: 'suspend', weeks: 1.5, source: 'event' },
    { kind: 'chance', p: 1, hit: [] }, { kind: 'modifier', effects: [] },
  ])('refuses malformed or non-immediate effect %j through load and import', effect => {
    expect(isImmediateEffect(effect)).toBe(false);
    const s = fresh(); (s.eventDeck.modifiers as unknown[]) = [{ ...modifier(), effects: [effect] }];
    refusesAtBoundaries(s);
  });
  const effects: ImmediateEffect[] = [
    { kind: 'money', amount: -50 }, { kind: 'reputation', amount: -1 }, { kind: 'squadMorale', amount: 2 },
    { kind: 'playerMorale', amount: -1 }, { kind: 'playerWage', pct: -1 }, { kind: 'playerTrait', trait: 'finisher' },
    { kind: 'signSubject' }, { kind: 'suspend', weeks: [0, 2], source: 'trip' },
    { kind: 'suspend', weeks: 2, source: 'judiciary' }, { kind: 'boardPatience', amount: -1 },
    { kind: 'flag', id: 'remembered-choice' }, { kind: 'closeGates' },
  ];
  it.each(effects)('accepts the valid ImmediateEffect payload %j unchanged', effect => {
    expect(isImmediateEffect(effect)).toBe(true);
    const s = fresh(); s.eventDeck.modifiers = [{ ...modifier(), effects: [effect] }];
    const source = JSON.stringify(s);
    bytes.set(slotKey(1), source);
    const result = loadSlot();
    expect(result).toMatchObject({ status: 'ok', outcome: 'valid' });
    if (result.status === 'ok') expect(JSON.stringify(result.state)).toBe(source);
    expect(installImportedSave(source, 2)).toMatchObject({ ok: true, outcome: 'valid' });
  });
  it.each(['weekly', 'win', 'loss'] as const)('accepts %s and departed narrative subjects; weekly effects tick safely', trigger => {
    const s = fresh(); s.eventDeck.modifiers = [{ ...modifier(), trigger, subjectId: 'departed', subjectName: 'Former player' }];
    expect(isActiveModifier(s.eventDeck.modifiers[0])).toBe(true);
    expect(migrateState(s)).toMatchObject({ ok: true, outcome: 'valid', state: s });
    const result = tickModifiers(s, 1);
    expect(result.state.eventDeck.modifiers[0]!.weeksLeft).toBe(1);
    expect(result.money).toEqual(trigger === 'weekly' ? [{ amount: 900, reason: 'Merch royalties' }] : []);
  });
});

describe('trait catalogue membership (checker P2)', () => {
  it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty'])('rejects inherited trait name %s across every roster and pre-v6 instances', id => {
    for (const version of [5, 23]) for (const roster of ['squad', 'freeAgents', 'rival'] as const) {
      const s = fresh(); initLeague(s);
      const state = getState();
      const players = roster === 'rival' ? state.league.clubs.find(c => c.squad)!.squad! : state[roster];
      (players[0]!.traits as unknown[]) = [{ id, level: 1 }];
      refusesAtBoundaries({ ...state, version });
    }
  });
  it('accepts every actual trait catalogue ID without changing the save', () => {
    for (const id of TRAIT_IDS) {
      const s = fresh(); s.squad[0]!.traits = [{ id, level: 1 }];
      expect(migrateState(s)).toMatchObject({ ok: true, outcome: 'valid', state: s });
    }
  });
});
