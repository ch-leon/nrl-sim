import { beforeEach, describe, expect, it } from 'vitest';
import { generateProspects, juniorCount, registerYouthSystem } from '../../src/systems/youth';
import { registerAgingSystem } from '../../src/systems/aging';
import { freeAgencyTick, signPlayer } from '../../src/systems/freeagency';
import { trainPlayer } from '../../src/systems/training';
import { overallRating } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';
import { createNewGame, getState, setState } from '../../src/core/state';
import { clearSeasonHooks, clearTickHooks, advanceWeeks } from '../../src/core/time';
import { WEEKS_PER_SEASON } from '../../src/config';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const avgOverall = (level: number) =>
  mean([1, 2, 3, 4, 5, 6, 7, 8].flatMap((s) =>
    generateProspects(makeRng(s), level).map((p) => overallRating(p))));

describe('generateProspects', () => {
  it('is deterministic per seed', () => {
    expect(generateProspects(makeRng(7), 2)).toEqual(generateProspects(makeRng(7), 2));
    expect(generateProspects(makeRng(7), 2)).not.toEqual(generateProspects(makeRng(8), 2));
  });
  it('keeps ages 17-19, 3-5 per intake, flagged junior and cheap', () => {
    for (let level = 0; level <= 3; level++) {
      for (let s = 1; s < 30; s++) {
        const ps = generateProspects(makeRng(s), level);
        expect(ps.length).toBeGreaterThanOrEqual(3);
        expect(ps.length).toBeLessThanOrEqual(5);
        for (const p of ps) {
          expect(p.age).toBeGreaterThanOrEqual(17);
          expect(p.age).toBeLessThanOrEqual(19);
          expect(p.junior).toBe(true);
          expect(p.wage).toBeLessThan(1000);
        }
      }
    }
  });
  it('count and quality scale with Academy level', () => {
    expect(juniorCount(0)).toBeLessThan(juniorCount(3));
    expect(juniorCount(1)).toBeGreaterThanOrEqual(juniorCount(0));
    expect(avgOverall(1)).toBeGreaterThan(avgOverall(0));
    expect(avgOverall(2)).toBeGreaterThan(avgOverall(1));
    expect(avgOverall(3)).toBeGreaterThan(avgOverall(2));
  });
  it('develop under the training curve (>= 8 overall in a season at L0)', () => {
    const facilities = [{ id: 'f1', defId: 'trainingPaddock' as const, level: 1 as const, x: 0, y: 0 },
      { id: 'f2', defId: 'videoRoom' as const, level: 1 as const, x: 2, y: 0 },
      { id: 'f3', defId: 'weightsRoom' as const, level: 1 as const, x: 0, y: 2 }];
    for (const p of generateProspects(makeRng(3), 0)) {
      let q = p;
      for (let w = 0; w < WEEKS_PER_SEASON; w++) q = { ...q, stats: trainPlayer(q, facilities) };
      expect(overallRating(q) - overallRating(p)).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('season hook', () => {
  beforeEach(() => {
    clearSeasonHooks();
    clearTickHooks();
    createNewGame('11');
    registerAgingSystem();
    registerYouthSystem();
  });
  const rollover = () => {
    setState({ week: WEEKS_PER_SEASON });
    advanceWeeks(1);
  };
  it('adds prospects at rollover, deterministically', () => {
    setState({ rngSeed: 123, squad: [], freeAgents: [] });
    rollover();
    const a = getState().freeAgents.filter((p) => p.junior);
    expect(a.length).toBeGreaterThanOrEqual(3);
    createNewGame('11');
    setState({ rngSeed: 123, squad: [], freeAgents: [] });
    rollover();
    expect(getState().freeAgents.filter((p) => p.junior)).toEqual(a);
  });
  it('prospects survive the next pool re-roll and can be signed', () => {
    rollover();
    const s = getState();
    freeAgencyTick({ ...s, week: 4 }, makeRng(1));
    const juniors = getState().freeAgents.filter((p) => p.junior);
    expect(juniors.length).toBeGreaterThanOrEqual(3);
    expect(signPlayer(getState(), juniors[0]!.id).ok).toBe(true);
    expect(getState().squad.find((p) => p.id === juniors[0]!.id)!.junior).toBeUndefined();
  });
  it('clears last intake before adding the next', () => {
    rollover();
    rollover();
    expect(getState().freeAgents.filter((p) => p.junior).length).toBeLessThanOrEqual(5);
  });
});
