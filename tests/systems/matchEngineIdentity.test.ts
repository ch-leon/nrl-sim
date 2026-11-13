import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it('uses revision four and separates recovery identities by the actual frozen field', async () => {
  const identities: string[] = [];
  const revisions: number[] = [];
  const accepts: ((engineId: string) => boolean)[] = [];
  for (const length of [100, 80, 60]) {
    vi.resetModules();
    vi.stubGlobal('name', length === 100 ? 'match-replay' : `match-replay--field-${length}`);
    const { FIELD_LENGTH } = await import('../../src/match/core/field');
    const { matchEngineIdentity, MATCH_ENGINE_REVISION } = await import('../../src/systems/matchEngineIdentity');
    expect(FIELD_LENGTH).toBe(length);
    revisions.push(MATCH_ENGINE_REVISION);
    identities.push(matchEngineIdentity());
    const { liveMatchSameRules } = await import('../../src/systems/liveMatchRecord');
    const { NINES } = await import('../../src/match/league/rules');
    accepts.push(engineId => liveMatchSameRules({ engineId, halfMinutes: NINES.halfMinutes }));
  }
  expect(new Set(identities).size).toBe(3);
  expect(revisions).toEqual([4, 4, 4]);
  for (let current = 0; current < identities.length; current++) {
    for (let saved = 0; saved < identities.length; saved++) {
      expect(accepts[current]!(identities[saved]!)).toBe(current === saved);
    }
  }
});
