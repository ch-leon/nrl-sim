// tests/systems/difficulty.test.ts — GitHub #48: each difficulty applies its multipliers.
import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY, DIFFICULTIES, STARTING_MONEY, isValidColorPair,
  PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS, DEFAULT_PLAYER_COLORS,
} from '../../src/config';
import { createNewGame, getState, setState } from '../../src/core/state';
import { bestNineMean } from '../../src/qa/soak';
import { weeklyWages } from '../../src/systems/economy';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { rivalEdge } from '../../src/match/league/spread';
import { injuryChance } from '../../src/match/league/weather';

describe('difficulty multipliers', () => {
  it('normal is the identity', () => {
    expect(DIFFICULTY.normal).toEqual({ startingMoney: 1, wages: 1, injuryRate: 1, rivalEdge: 0, startRating: 0, overhead: 1, prize: 1, gate: 1 });
  });

  it('startRating moves the starting squad: Easy starts stronger than Normal, Hard weaker (#140)', () => {
    const nine = (d: 'easy' | 'normal' | 'hard'): number => {
      let total = 0;
      for (let seed = 1; seed <= 30; seed++) total += bestNineMean(createNewGame('T', seed, { difficulty: d }).squad);
      return total / 30;
    };
    const easy = nine('easy');
    const normal = nine('normal');
    const hard = nine('hard');
    expect(easy - normal).toBeGreaterThan(2);
    expect(easy - normal).toBeLessThan(5);
    expect(normal - hard).toBeGreaterThan(2);
    expect(normal - hard).toBeLessThan(5);
  });

  it.each(DIFFICULTIES)('%s scales starting money', (d) => {
    const s = createNewGame('T', 1, { difficulty: d });
    expect(s.settings.difficulty).toBe(d);
    expect(s.money).toBe(Math.round(STARTING_MONEY * DIFFICULTY[d].startingMoney));
  });

  it('defaults to normal', () => {
    expect(createNewGame('T', 1).settings.difficulty).toBe('normal');
  });

  it('Easy pays 90% of the wages (N12: 85% banked an idle club about $150k a season), Hard 115%', () => {
    expect(DIFFICULTY.easy.wages).toBe(0.9);
    expect(DIFFICULTY.hard.wages).toBe(1.15);
    createNewGame('T', 1, { difficulty: 'easy' });
    const base = getState().squad.reduce((n, p) => n + p.wage, 0);
    expect(weeklyWages(getState())).toBe(Math.round(base * 0.9));
  });

  it.each(DIFFICULTIES)('%s scales weekly wages', (d) => {
    createNewGame('T', 1, { difficulty: d });
    const base = getState().squad.reduce((n, p) => n + p.wage, 0);
    expect(weeklyWages(getState())).toBe(Math.round(base * DIFFICULTY[d].wages));
  });

  it('Hard’s rival plays with an edge after the spread, Easy’s gives one away, Normal’s has none (N12.2)', () => {
    expect(DIFFICULTY.hard.rivalEdge).toBeGreaterThan(0);
    expect(DIFFICULTY.easy.rivalEdge).toBeLessThan(0);
    expect(rivalEdge('away', 'hard')).toEqual({ side: 'away', points: DIFFICULTY.hard.rivalEdge });
    expect(rivalEdge('home', 'easy')).toEqual({ side: 'home', points: DIFFICULTY.easy.rivalEdge });
    expect(rivalEdge('away', 'normal')).toBeUndefined();
  });

  it('Easy pays less prize money and a smaller gate, Hard pays more prize money and the same gate', () => {
    expect(DIFFICULTY.easy.prize).toBe(0.75);
    expect(DIFFICULTY.easy.gate).toBe(0.75);
    expect(DIFFICULTY.hard.prize).toBe(1.2);
    expect(DIFFICULTY.hard.gate).toBe(1);
    expect(DIFFICULTY.easy.prize).toBeLessThan(DIFFICULTY.normal.prize);
    expect(DIFFICULTY.hard.prize).toBeGreaterThan(DIFFICULTY.normal.prize);
  });

  it('injury chance scales with the injury rate', () => {
    const count = (rate: number): number => injuryChance({ injuryRisk: 100 }, rate);
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
