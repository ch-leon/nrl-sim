// tests/qa/soak.test.ts — a small slice of the headless soak (npm run soak runs the full
// 5 seasons × 20 seeds): whole seasons through every system with the invariant checks,
// and old saves of every version migrating and playing on.
import { describe, it, expect } from 'vitest';
import { runSoak, checkState, nonFinitePaths, duplicatePlayers, asOldSave, OLD_VERSIONS } from '../../src/qa/soak';
import { createNewGame, getState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { migrateState } from '../../src/core/save';

describe('soak checks', () => {
  it('spots NaN, Infinity and players in two places', () => {
    expect(nonFinitePaths({ a: 1, b: [2, NaN], c: { d: Infinity } })).toEqual(['state.b[1]', 'state.c.d']);
    createNewGame('Check', 3);
    initLeague(getState());
    const s = getState();
    expect(checkState(s)).toEqual([]);
    const dupe = { ...s, freeAgents: [...s.freeAgents, s.squad[0]!] };
    expect(duplicatePlayers(dupe)).toEqual([s.squad[0]!.id]);
  });

  it('every old save version migrates', () => {
    createNewGame('Old', 9);
    initLeague(getState());
    for (const v of OLD_VERSIONS) {
      const res = migrateState(asOldSave(getState(), v));
      expect(res.ok, `v${v}`).toBe(true);
      if (res.ok) expect(checkState(res.state), `v${v}`).toEqual([]);
    }
  });
});

describe('soak', () => {
  it('plays two seasons idle and managed with no problems', () => {
    for (const mode of ['idle', 'managed'] as const) {
      const r = runSoak({ seed: 101, seasons: 2, mode });
      expect(r.problems, mode).toEqual([]);
      expect(r.seasons.length).toBe(2);
    }
  }, 60_000);

  it('plays on from a v1 save and a v7 save', () => {
    for (const v of [1, 7]) {
      const r = runSoak({ seed: 202, seasons: 1, mode: 'managed', fromVersion: v });
      expect(r.problems, `v${v}`).toEqual([]);
    }
  }, 60_000);
});
