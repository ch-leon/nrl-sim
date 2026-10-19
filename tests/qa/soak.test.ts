// tests/qa/soak.test.ts — a small slice of the headless soak (npm run soak runs the full
// 5 seasons × 20 seeds): whole seasons through every system with the invariant checks,
// and old saves of every version migrating and playing on.
import { describe, it, expect } from 'vitest';
import {
  runSoak, checkState, nonFinitePaths, duplicatePlayers, asOldSave, OLD_VERSIONS, gapSample, bestNineMean, summariseSeasons,
  classifyReason, emptyTally, tallyNet, FINANCE_LINES,
} from '../../src/qa/soak';
import { STARTING_MONEY } from '../../src/config';
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

describe('soak P&L (#161)', () => {
  it('maps every ledger reason the game uses to a line, and the unknown to other', () => {
    expect(classifyReason('wages')).toBe('wages');
    expect(classifyReason('sponsor')).toBe('sponsor');
    expect(classifyReason('grant')).toBe('grant');
    expect(classifyReason('sponsor+grant')).toBe('grant'); // the pre-#172 combined reason
    expect(classifyReason('gate')).toBe('gate');
    expect(classifyReason('upkeep')).toBe('upkeep');
    expect(classifyReason('finals prize money')).toBe('prize');
    expect(classifyReason('board grant')).toBe('boardGrant');
    expect(classifyReason('event: Billboard offer')).toBe('events');
    for (const label of ['Merch royalties', 'Pizza win bonus', 'Food truck rent']) expect(classifyReason(label), label).toBe('events');
    expect(classifyReason('sign:p_1')).toBe('transfers');
    expect(classifyReason('sell:p_1')).toBe('transfers');
    expect(classifyReason('renew:p_1')).toBe('contracts');
    expect(classifyReason('release:p_1')).toBe('contracts');
    for (const verb of ['build', 'upgrade', 'move', 'demolish']) expect(classifyReason(`${verb}:grandstand`), verb).toBe('facilities');
    expect(classifyReason('something new')).toBe('other');
    const t = emptyTally();
    expect(Object.keys(t).sort()).toEqual([...FINANCE_LINES].sort());
    expect(Object.values(t).every((v) => v === 0)).toBe(true);
    expect(tallyNet({ ...t, wages: -5, gate: 8 })).toBe(3);
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
        // The season's P&L adds up to the balance, line by line (#161).
        expect(s.finance.wages).toBeLessThan(0);
        expect(s.finance.grant).toBeGreaterThan(0);
        expect(s.finance.sponsor).toBe(0); // the soak manager never builds a Sponsor Board
        expect(s.finance.gate).toBeGreaterThan(0);
        expect(s.finance.other).toBe(0);
        if (mode === 'idle') {
          expect(s.finance.transfers).toBe(0);
          expect(s.finance.facilities).toBe(0);
          expect(s.finance.upkeep).toBe(0);
        } else {
          expect(s.finance.transfers).toBeCloseTo(-s.signingFees, 5); // −0 when nobody was signed
          expect(s.finance.upkeep).toBeLessThanOrEqual(0);
        }
      }
      expect(tallyNet(r.seasons[0]!.finance)).toBeCloseTo(r.seasons[0]!.money - STARTING_MONEY, 0);
      expect(tallyNet(r.seasons[1]!.finance)).toBeCloseTo(r.seasons[1]!.money - r.seasons[0]!.money, 0);
      runs.push(r);
    }
    expect(runs[0]!.start).toEqual(runs[1]!.start);
    // The game's own books (#172) agree with the soak's tally: the soak reports any line that differs as a problem (none above).
    // The managed manager builds and signs; its club should be at least as strong as the idle one.
    expect(runs[1]!.seasons[1]!.bestNine).toBeGreaterThanOrEqual(runs[0]!.seasons[1]!.bestNine);
    const summary = summariseSeasons(runs);
    expect(summary.map((s) => `${s.mode}:${s.season}`)).toEqual(['idle:1', 'idle:2', 'managed:1', 'managed:2']);
    // The managed manager built at least a Paddock over two seasons.
    expect(runs[1]!.seasons[0]!.finance.facilities + runs[1]!.seasons[1]!.finance.facilities).toBeLessThan(0);
    // …and pays upkeep on it from then on (#164).
    expect(runs[1]!.seasons[1]!.finance.upkeep).toBeLessThan(0);
    for (const row of summary) {
      expect(row.runs).toBe(1);
      expect(row.finance.wages).toBeLessThan(0);
      expect(tallyNet(row.finance)).toBeCloseTo(row.money - (row.season === 1 ? STARTING_MONEY : summary.find((x) => x.mode === row.mode && x.season === row.season - 1)!.money), -1);
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
