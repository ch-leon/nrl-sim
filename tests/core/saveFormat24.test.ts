import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame, getState, SAVE_VERSION, type GameState } from '../../src/core/state';
import { __setStorage, __unlockSaves, exportOriginalSave, exportRecoverySaves, exportSave, importSave, installImportedSave, load, loadSlot, save, setActiveSlot, writeSlot } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, LEGACY_SAVE_KEY, liveMatchKey, slotKey } from '../../src/core/storageKeys';
import { bus } from '../../src/core/events';
import { initLeague } from '../../src/systems/fixtures';
import { generateFreeAgent, generatePlayer, generatePlayerAround } from '../../src/data/player';
import { generateProspects } from '../../src/systems/youth';
import { makeRng } from '../../src/utils/rng';

let bytes: Map<string, string>;
beforeEach(() => {
  bytes = new Map(); bus.clear(); setCareerNamespace(null); __unlockSaves(); setActiveSlot(1);
  __setStorage({ getItem: k => bytes.get(k) ?? null, setItem: (k, v) => { bytes.set(k, v); }, removeItem: k => { bytes.delete(k); } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { setCareerNamespace(null); __setStorage(null); bus.clear(); vi.restoreAllMocks(); });

/** Exact historical stat shape, rather than a v24 object with an older stamp. */
function historical(version: number): string {
  return ` \n${JSON.stringify(createNewGame('Original', 536), (key, value: unknown) => {
    if (key === 'version') return version;
    if (key === 'stats' && value && typeof value === 'object' && 'handling' in value) {
      const { handling, kicking: _, ...other } = value as GameState['squad'][number]['stats'];
      return { ...other, skill: handling };
    }
    return value;
  }, 2)}\n`;
}

describe('format-24 player contract and current saves (#536)', () => {
  it('generates only Handling and Kicking for squad, rivals, free agents and juniors', () => {
    createNewGame('Generation', 536); initLeague(getState()); const s = getState(); const rng = makeRng(536);
    const players = [...s.squad, ...s.freeAgents, ...s.league.clubs.flatMap(c => c.squad ?? []),
      generatePlayer(rng), generatePlayerAround(rng, 60), generateFreeAgent(rng, 60), ...generateProspects(rng, 3)];
    for (const p of players) {
      expect(p.stats).not.toHaveProperty('skill');
      for (const key of ['handling', 'kicking'] as const) {
        expect(p.stats[key]).toBeGreaterThanOrEqual(1); expect(p.stats[key]).toBeLessThanOrEqual(100);
      }
    }
  });
  it('round-trips a current career and export with distinct Handling and Kicking', () => {
    const s = createNewGame('Round-trip', 536); initLeague(s); const state = getState();
    state.squad[0]!.stats.handling = 31.5; state.squad[0]!.stats.kicking = 87.25;
    expect(state.version).toBe(SAVE_VERSION); save(state);
    expect(JSON.parse(bytes.get(slotKey(1))!).version).toBe(SAVE_VERSION);
    expect(load()).toEqual(state);
    expect(importSave(exportSave(state))).toMatchObject({ ok: true, state });
  });
  it.each(['skill', 'handling', 'kicking'] as const)('refuses a v24 player carrying legacy skill or missing %s', field => {
    const s = createNewGame('Invalid', 536);
    const stats = s.squad[0]!.stats as unknown as Record<string, unknown>;
    if (field === 'skill') stats.skill = 50; else delete stats[field];
    const raw = JSON.stringify(s); bytes.set(slotKey(1), raw);
    expect(loadSlot()).toMatchObject({ status: 'corrupt' });
    expect(importSave(raw).ok).toBe(false);
    expect(bytes.get(slotKey(1))).toBe(raw);
  });
  for (const namespace of [null, DEV_TEST_PREFIX]) {
    for (const key of [slotKey(1), LEGACY_SAVE_KEY]) {
      it.each(Array.from({ length: 23 }, (_, i) => i + 1))(`v%i at ${namespace ?? 'normal'} ${key}: explains new career and preserves original and other namespace`, version => {
        const raw = historical(version); const prefix = namespace ?? '';
        const other = namespace === null ? DEV_TEST_PREFIX : '';
        bytes.set(prefix + key, raw); bytes.set(prefix + liveMatchKey(1), 'parked original');
        bytes.set(other + slotKey(1), 'other career'); bytes.set(other + liveMatchKey(1), 'other match');
        setCareerNamespace(namespace);
        const messages: string[] = []; bus.on('ui:notify', n => messages.push(n.text));
        expect(loadSlot()).toMatchObject({ status: 'corrupt', message: expect.stringMatching(/older version.*start a new career/i) });
        expect(load()).toBeNull();
        expect(messages.some(m => /older version.*start a new career/i.test(m))).toBe(true);
        const fresh = createNewGame('Defaults', 24); save(fresh);
        expect(writeSlot(1, fresh)).toBe(false);
        expect(exportOriginalSave(1)).toBe(raw); expect(exportRecoverySaves(1)).toContain(raw);
        expect(bytes.get(prefix + key)).toBe(raw); expect(bytes.get(prefix + liveMatchKey(1))).toBe('parked original');
        expect(bytes.get(other + slotKey(1))).toBe('other career'); expect(bytes.get(other + liveMatchKey(1))).toBe('other match');
        const before = new Map(bytes);
        expect(installImportedSave(raw, 2)).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
        expect(bytes).toEqual(before);
      });
    }
  }
});


it('backfills pre-progression v24 players deterministically without changing RNG, ceilings or raw bytes', () => {
  const s = createNewGame('XP backfill', 539); initLeague(s);
  const current = getState();
  const raw = JSON.stringify({ ...current, version: 24 }, (_key, value: unknown) => {
    if (value && typeof value === 'object' && 'stats' in value && 'position' in value) {
      const { xp: _xp, level: _level, unspentPoints: _points, ...old } = value as GameState['squad'][number];
      return old;
    }
    return value;
  });
  const first = importSave(raw); const second = importSave(raw);
  expect(first).toEqual(second);
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.state.rngSeed).toBe(current.rngSeed);
  const players = [...first.state.squad, ...first.state.freeAgents, ...first.state.league.clubs.flatMap(c => c.squad ?? [])];
  for (const p of players) expect(p).toMatchObject({ xp: 0, level: 1, unspentPoints: 0 });
  expect(first.state.squad.map(p => p.ceilings)).toEqual(current.squad.map(p => p.ceilings));
  const progressed = { ...first.state, squad: first.state.squad.map(p => ({ ...p, xp: 45.5, level: 4, unspentPoints: 7 })) };
  expect(importSave(exportSave(progressed))).toMatchObject({ ok: true, state: progressed });
  expect(JSON.parse(raw).squad[0]).not.toHaveProperty('xp');
});
it.each([{ xp: -1 }, { xp: null }, { level: 0 }, { level: 1.5 }, { unspentPoints: -1 }, { unspentPoints: 0.5 }])('rejects malformed progression fields %j', fields => {
  const s = createNewGame('XP validation', 539);
  const raw = JSON.stringify({ ...s, squad: [{ ...s.squad[0]!, ...fields }, ...s.squad.slice(1)] });
  expect(importSave(raw).ok).toBe(false);
});
