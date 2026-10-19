// tests/qa/soak.test.ts — a small slice of the headless soak (npm run soak runs the full
// 5 seasons × 20 seeds): whole seasons through every system with the invariant checks,
// and old saves of every version migrating and playing on.
import { describe, it, expect } from 'vitest';
import {
  runSoak, checkState, nonFinitePaths, duplicatePlayers, asOldSave, OLD_VERSIONS, gapSample, bestNineMean, summariseSeasons,
} from '../../src/qa/soak';
import { SEASON_ROUNDS } from '../../src/config';
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
  it('plays two seasons idle and managed with no problems, reporting the record and the gap (#138)', () => {
    const runs = [];
    for (const mode of ['idle', 'managed'] as const) {
      const r = runSoak({ seed: 101, seasons: 2, mode });
      expect(r.problems, mode).toEqual([]);
      expect(r.seasons.length).toBe(2);
      // The start gap is the new game's: the same squad and league whichever way it is managed.
      expect(r.start.bestNine).toBeGreaterThan(0);
      expect(r.start.rivalRange[0]).toBeLessThanOrEqual(r.start.rivalMean);
      expect(r.start.rivalMean).toBeLessThanOrEqual(r.start.rivalRange[1]);
      for (const s of r.seasons) {
        expect(s.wins + s.draws + s.losses).toBe(SEASON_ROUNDS);
        expect(s.ladderPosition).toBeGreaterThanOrEqual(1);
        expect(s.ladderPosition).toBeLessThanOrEqual(16);
        expect(s.bestNine).toBeGreaterThan(30);
        expect(s.rivalMean).toBeGreaterThan(30);
        expect(s.rivalRange[0]).toBeLessThanOrEqual(s.rivalRange[1]);
        if (mode === 'idle') expect(s.signings).toBe(0);
        else expect(s.signingFees).toBeGreaterThanOrEqual(0);
      }
      runs.push(r);
    }
    expect(runs[0]!.start).toEqual(runs[1]!.start);
    // The managed manager builds and signs; its club should be at least as strong as the idle one.
    expect(runs[1]!.seasons[1]!.bestNine).toBeGreaterThanOrEqual(runs[0]!.seasons[1]!.bestNine);
    const summary = summariseSeasons(runs);
    expect(summary.map((s) => `${s.mode}:${s.season}`)).toEqual(['idle:1', 'idle:2', 'managed:1', 'managed:2']);
    for (const row of summary) {
      expect(row.runs).toBe(1);
      expect(row.gap).toBeCloseTo(row.bestNine - row.rivalMean, 0);
      expect(row.finals).toBe(row.ladderPosition <= 8 ? 1 : 0);
    }
  }, 60_000);

  it('gapSample reads the player\'s best nine against the rivals', () => {
    createNewGame('Gap', 5);
    initLeague(getState());
    const s = getState();
    const g = gapSample(s);
    expect(g.bestNine).toBe(bestNineMean(s.squad));
    const strengths = s.league.clubs.filter((c) => c.id !== 'player').map((c) => c.strength);
    expect(g.rivalMean).toBeCloseTo(strengths.reduce((t, x) => t + x, 0) / strengths.length, 1);
    expect(g.rivalRange).toEqual([Math.min(...strengths), Math.max(...strengths)]);
    expect(bestNineMean([])).toBe(0);
  });

  it('plays on from a v1 save and a v7 save', () => {
    for (const v of [1, 7]) {
      const r = runSoak({ seed: 202, seasons: 1, mode: 'managed', fromVersion: v });
      expect(r.problems, `v${v}`).toEqual([]);
    }
  }, 60_000);
});
