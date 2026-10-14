// tests/systems/league.test.ts — rival strength drift + reputation from results (#37).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  driftRivalStrengths, strengthChanges, applySeasonReputation, ladderFinishDelta,
  STRENGTH_MIN, STRENGTH_MAX, STRENGTH_MEAN, REP_MIN, REP_MAX,
} from '../../src/systems/league';
import { RIVAL_CLUBS } from '../../src/data/league';
import { registerFixturesSystem, initLeague } from '../../src/systems/fixtures';
import { createNewGame, getState, setState, type RivalClub } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';
import { bus } from '../../src/core/events';
import { advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';

const clubs = (): RivalClub[] => RIVAL_CLUBS.map((c) => ({ ...c }));
const results = (o: Partial<Parameters<typeof applySeasonReputation>[1]> = {}) => ({
  ladderPosition: 8, clubCount: 16, finalsWins: 0, playedGrandFinal: false, premiership: false, ...o,
});

describe('driftRivalStrengths', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = driftRivalStrengths(clubs(), makeRng(7));
    const b = driftRivalStrengths(clubs(), makeRng(7));
    const c = driftRivalStrengths(clubs(), makeRng(8));
    expect(a).toEqual(b);
    expect(a.map((x) => x.strength)).not.toEqual(c.map((x) => x.strength));
  });

  it('does not mutate input and leaves the player club alone', () => {
    const input: RivalClub[] = [{ id: 'player', name: 'Me', colors: ['#000000', '#ffffff'], strength: 55 }, ...clubs()];
    const snapshot = JSON.parse(JSON.stringify(input));
    const out = driftRivalStrengths(input, makeRng(1));
    expect(input).toEqual(snapshot);
    expect(out[0]?.strength).toBe(55);
  });

  it('stays within bounds over many seasons, even from extremes', () => {
    const rng = makeRng(99);
    let cs: RivalClub[] = clubs().map((c, i) => ({ ...c, strength: i % 2 ? STRENGTH_MAX : STRENGTH_MIN }));
    for (let i = 0; i < 500; i++) {
      cs = driftRivalStrengths(cs, rng);
      for (const c of cs) {
        expect(c.strength).toBeGreaterThanOrEqual(STRENGTH_MIN);
        expect(c.strength).toBeLessThanOrEqual(STRENGTH_MAX);
        expect(Number.isInteger(c.strength)).toBe(true);
      }
    }
  });

  it('mean-reverts: extremes move toward the average on average', () => {
    const hi = clubs().map((c) => ({ ...c, strength: 88 }));
    const lo = clubs().map((c) => ({ ...c, strength: 32 }));
    const avg = (cs: RivalClub[]) => cs.reduce((t, c) => t + c.strength, 0) / cs.length;
    expect(avg(driftRivalStrengths(hi, makeRng(3)))).toBeLessThan(88);
    expect(avg(driftRivalStrengths(lo, makeRng(3)))).toBeGreaterThan(32);
    expect(STRENGTH_MEAN).toBeGreaterThan(32);
  });

  it('reports changed clubs, biggest movers first', () => {
    const before = clubs();
    const after = driftRivalStrengths(before, makeRng(5));
    const ch = strengthChanges(before, after);
    const diffs = ch.map((c) => Math.abs(c.to - c.from));
    expect([...diffs].sort((x, y) => y - x)).toEqual(diffs);
    expect(ch.every((c) => c.to !== c.from)).toBe(true);
  });
});

describe('reputation from results', () => {
  it('rises for a top finish and falls for a bottom finish', () => {
    expect(applySeasonReputation(50, results({ ladderPosition: 1 })).reputation).toBeGreaterThan(
      applySeasonReputation(50, results({ ladderPosition: 8 })).reputation,
    );
    expect(applySeasonReputation(50, results({ ladderPosition: 16 })).reputation).toBeLessThan(
      applySeasonReputation(50, results({ ladderPosition: 8 })).reputation,
    );
    expect(ladderFinishDelta(4, 16)).toBeGreaterThan(0);
    expect(ladderFinishDelta(5, 16)).toBe(0);
    expect(ladderFinishDelta(12, 16)).toBe(0);
    expect(ladderFinishDelta(13, 16)).toBeLessThan(0);
  });

  it('rewards finals wins and a grand-final appearance', () => {
    const base = applySeasonReputation(50, results({ ladderPosition: 3 })).reputation;
    expect(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2 })).reputation).toBeGreaterThan(base);
    expect(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2, playedGrandFinal: true })).reputation)
      .toBeGreaterThan(applySeasonReputation(50, results({ ladderPosition: 3, finalsWins: 2 })).reputation);
  });

  it('decays toward the baseline', () => {
    expect(applySeasonReputation(80, results()).reputation).toBeLessThan(80);
    expect(applySeasonReputation(5, results()).reputation).toBeGreaterThan(5);
  });

  it('stays clamped', () => {
    const top = results({ ladderPosition: 1, finalsWins: 2, playedGrandFinal: true });
    expect(applySeasonReputation(100, top).reputation).toBeLessThanOrEqual(REP_MAX);
    expect(applySeasonReputation(REP_MIN, results({ ladderPosition: 16 })).reputation).toBeGreaterThanOrEqual(REP_MIN);
    let r = 100;
    for (let i = 0; i < 200; i++) r = applySeasonReputation(r, results({ ladderPosition: 16 })).reputation;
    expect(r).toBeGreaterThanOrEqual(REP_MIN);
  });
});

describe('season rollover integration', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
  });

  it('drifts rivals, adjusts reputation and notifies, deterministically', () => {
    const run = () => {
      bus.clear(); clearTickHooks(); clearSeasonHooks();
      setState(createNewGame('Test FC', 42));
      initLeague(getState());
      registerFixturesSystem();
      const toasts: string[] = [];
      bus.on('ui:notify', (n) => toasts.push(n.text));
      advanceWeeks(WEEKS_PER_SEASON);
      const s = getState();
      return { strengths: s.league.clubs.map((c) => c.strength), rep: s.reputation, toasts };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.strengths.slice(1)).not.toEqual(RIVAL_CLUBS.map((c) => c.strength));
    expect(a.toasts.some((t) => t.startsWith('Reputation'))).toBe(true);
  });
});
