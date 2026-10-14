// tests/systems/difficulty.test.ts — GitHub #48: each difficulty applies its multipliers.
import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY, DIFFICULTIES, STARTING_MONEY, isValidColorPair,
  PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS, DEFAULT_PLAYER_COLORS,
} from '../../src/config';
import { createNewGame, getState, setState } from '../../src/core/state';
import { weeklyWages } from '../../src/systems/economy';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { scaleRivalStrength } from '../../src/systems/matchday';
import { rollBigHitInjury } from '../../src/sim/engine';
import { makeRng } from '../../src/utils/rng';
import type { RivalClub } from '../../src/core/state';

describe('difficulty multipliers', () => {
  it('normal is the identity', () => {
    expect(DIFFICULTY.normal).toEqual({ startingMoney: 1, wages: 1, injuryRate: 1, rivalStrength: 1 });
  });

  it.each(DIFFICULTIES)('%s scales starting money', (d) => {
    const s = createNewGame('T', 1, { difficulty: d });
    expect(s.settings.difficulty).toBe(d);
    expect(s.money).toBe(Math.round(STARTING_MONEY * DIFFICULTY[d].startingMoney));
  });

  it('defaults to normal', () => {
    expect(createNewGame('T', 1).settings.difficulty).toBe('normal');
  });

  it.each(DIFFICULTIES)('%s scales weekly wages', (d) => {
    createNewGame('T', 1, { difficulty: d });
    const base = getState().squad.reduce((n, p) => n + p.wage, 0);
    expect(weeklyWages(getState())).toBe(Math.round(base * DIFFICULTY[d].wages));
  });

  it.each(DIFFICULTIES)('%s scales rival strength', (d) => {
    const rival: RivalClub = { id: 'r', name: 'R', colors: ['#fff', '#000'], strength: 60 };
    expect(scaleRivalStrength(rival, d).strength).toBe(Math.round(60 * DIFFICULTY[d].rivalStrength));
    expect(rival.strength).toBe(60);
  });

  it('rival strength is clamped to 1..100', () => {
    const r: RivalClub = { id: 'r', name: 'R', colors: ['#fff', '#000'], strength: 99 };
    expect(scaleRivalStrength(r, 'hard').strength).toBeLessThanOrEqual(100);
  });

  it('injury chance scales with the injury rate', () => {
    const roster = [{ name: 'A', injuryRisk: 100 }] as never;
    const count = (rate: number): number => {
      const rng = makeRng(42);
      let n = 0;
      for (let i = 0; i < 4000; i++) if (rollBigHitInjury(roster, 'A', 'player', rng, rate)) n++;
      return n;
    };
    const easy = count(DIFFICULTY.easy.injuryRate);
    const normal = count(DIFFICULTY.normal.injuryRate);
    const hard = count(DIFFICULTY.hard.injuryRate);
    expect(easy).toBeLessThan(normal);
    expect(normal).toBeLessThan(hard);
  });
});

describe('club colours', () => {
  it('initLeague writes the chosen colours to the player club', () => {
    const s = createNewGame('T', 1);
    const league = initLeague(s, ['#c0392b', '#ffffff']);
    expect(league.clubs.find((c) => c.id === PLAYER_ID)?.colors).toEqual(['#c0392b', '#ffffff']);
    setState({});
  });

  it('defaults to the gold/navy kit', () => {
    const league = initLeague(createNewGame('T', 1));
    expect(league.clubs.find((c) => c.id === PLAYER_ID)?.colors).toEqual(DEFAULT_PLAYER_COLORS);
  });

  it('the default pair is valid and every primary has a readable secondary', () => {
    expect(isValidColorPair(...DEFAULT_PLAYER_COLORS)).toBe(true);
    for (const p of PLAYER_PRIMARY_COLORS) {
      expect(PLAYER_SECONDARY_COLORS.some((s) => isValidColorPair(p, s))).toBe(true);
    }
  });

  it('rejects off-palette and low-contrast pairs', () => {
    expect(isValidColorPair('#00ff00', '#1a1a2e')).toBe(false);
    expect(isValidColorPair('#f4d03f', '#f4d03f')).toBe(false);
    expect(isValidColorPair('#1a1a2e', '#1a1a2e')).toBe(false);
  });
});
