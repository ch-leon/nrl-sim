import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, setState, type Player } from '../../src/core/state';
import { applyCampAward, campTrainingFoci } from '../../src/systems/assignmentTraining';
import { levelPointSpendMode, setSpendMode, trainWeek } from '../../src/systems/training';

function samplePlayer(overrides: Partial<Player> = {}): Player {
  return {
    ...getState().squad[0]!,
    age: 25,
    position: 'lock',
    traits: [],
    injuredWeeks: 0,
    stats: { speed: 50, strength: 50, stamina: 50, handling: 20, kicking: 20, footyIQ: 50 },
    ceilings: { speed: 52, strength: 55, stamina: 53, footyIQ: 54 },
    xp: 0,
    level: 1,
    unspentPoints: 0,
    ...overrides,
  };
}

beforeEach(() => { createNewGame('Camp XP', 708); });
afterEach(() => { setSpendMode('auto'); });

describe('weekly training during the camp', () => {
  it('retains veteran decline while leaving XP and banked points for return', () => {
    const before = samplePlayer({ age: 33, xp: 99, unspentPoints: 1 });
    const after = trainWeek(before, [], 'strength', false, { skipXp: true });
    expect(after).toEqual({
      ...before,
      stats: { ...before.stats, speed: 49.7, stamina: 49.7 },
    });
  });
});

describe('camp award', () => {
  const options = { mode: 'auto', clubFocus: 'balanced' } as const;

  it('records effective age- and trait-adjusted XP, with carry and no home facility boost', () => {
    setState({ facilities: [{ id: 'gym', defId: 'teamGym', level: 3, x: 0, y: 0 }] });
    const before = samplePlayer({
      age: 21, xp: 20, level: 4, traits: [{ id: 'workhorse', level: 3 }, { id: 'youngGun', level: 1 }],
    });
    const { player, receipt } = applyCampAward(before, { ...options, mode: 'manual' });
    expect(receipt.effectiveXp).toBeCloseTo(196.56);
    expect(receipt.xpBefore).toBe(20);
    expect(receipt.xpAfter).toBeCloseTo(16.56);
    expect(receipt).toMatchObject({ levelsGained: 2, newPoints: 2, bankedAfter: 2 });
    expect(player).toMatchObject({ xp: receipt.xpAfter, level: 6, unspentPoints: 2, stats: before.stats });
    expect(before).toMatchObject({ xp: 20, level: 4, unspentPoints: 0 });
  });

  it('spends banked points through a fractional ceiling and uses the existing fallback', () => {
    const before = samplePlayer({
      xp: 70, unspentPoints: 2, ceilings: { strength: 50.5, stamina: 52, speed: 50, footyIQ: 50 },
    });
    const { player, receipt } = applyCampAward(before, { ...options, campFocus: 'strength' });
    expect(receipt).toEqual({
      effectiveXp: 70, xpBefore: 70, xpAfter: 40, levelsGained: 1, newPoints: 1,
      bankedBefore: 2, bankedAfter: 0, pointsSpent: 3, priorPointsSpent: 2,
      statGains: { strength: 0.5, stamina: 2 }, mode: 'auto', focus: 'strength',
    });
    expect(player.stats).toEqual({ ...before.stats, strength: 50.5, stamina: 52 });
  });

  it('uses existing banked points first when the ceilings stop spending', () => {
    const before = samplePlayer({
      xp: 70, unspentPoints: 2, ceilings: { strength: 50.5, stamina: 50, speed: 50, footyIQ: 50 },
    });
    const { player, receipt } = applyCampAward(before, options);
    expect(receipt).toMatchObject({
      newPoints: 1, bankedBefore: 2, bankedAfter: 2, pointsSpent: 1, priorPointsSpent: 1,
      statGains: { strength: 0.5 },
    });
    expect(player.unspentPoints).toBe(2);
  });

  it('reports an XP gain with no point or stat gain when a level is not reached', () => {
    const { player, receipt } = applyCampAward(samplePlayer(), options);
    expect(player).toMatchObject({ xp: 70, level: 1, unspentPoints: 0 });
    expect(receipt).toMatchObject({
      effectiveXp: 70, levelsGained: 0, newPoints: 0, pointsSpent: 0, statGains: {},
    });
  });

  it.each([
    { byHand: true, qaMode: 'auto' },
    { byHand: false, qaMode: 'manual' },
  ] as const)('banks points with saved manual mode or the QA override ($byHand/$qaMode)', ({ byHand, qaMode }) => {
    setSpendMode(qaMode);
    const before = samplePlayer({ xp: 30, unspentPoints: 2 });
    const mode = levelPointSpendMode(byHand);
    const { player, receipt } = applyCampAward(before, { ...options, mode, campFocus: 'strength' });
    expect(receipt).toMatchObject({
      mode: 'manual', focus: null, newPoints: 1, bankedBefore: 2, bankedAfter: 3,
      pointsSpent: 0, priorPointsSpent: 0, statGains: {},
    });
    expect(player.stats).toEqual(before.stats);
  });

  it('uses the current club focus when returning in auto mode without a camp focus', () => {
    const before = samplePlayer({ xp: 30 });
    const mode = levelPointSpendMode(false);
    const { player, receipt } = applyCampAward(before, { mode, clubFocus: 'speed' });
    expect(receipt).toMatchObject({ mode: 'auto', focus: 'speed', statGains: { speed: 1 } });
    expect(player.stats.speed).toBe(51);
  });

  it('offers Balanced and uncapped shown stats even before the player has any points', () => {
    const player = samplePlayer({ ceilings: { strength: 50, stamina: 50.5, speed: 51, footyIQ: 50 } });
    expect(campTrainingFoci(player)).toEqual(['balanced', 'stamina', 'speed']);
    expect(campTrainingFoci({
      ...player, position: 'halfback', ceilings: { handling: 20, kicking: 20.5, footyIQ: 50, speed: 51 },
    })).toEqual(['balanced', 'kicking', 'speed']);
  });
});
