// tests/match/league/spread.test.ts — how much a rating gap counts (BAK-207
// Phase 3, #87): stats drawn toward the two sides' average shrink the gap
// between them, keep the order within a side, leave even sides as they were.
import { describe, it, expect } from 'vitest';
import { RATING, spreadSheets } from '../../../src/match/league/spread';
import { sideSheet } from '../../../src/match/balance/measure';
import { teamSheetFromRival } from '../../../src/sim/engine';

describe('rating spread (pure)', () => {
  it('draws both sides toward the match average: a 20-point gap at k = 0.5 plays as 10', () => {
    const [h, a] = spreadSheets(sideSheet('H', { rating: 70 }), sideSheet('A', { rating: 50 }), 0.5);
    expect(h.roster![0]!.stats!.speed).toBeCloseTo(65);
    expect(a.roster![0]!.stats!.speed).toBeCloseTo(55);
    expect(h.bench![0]!.stats!.strength).toBeCloseTo(65); // the bench too
  });
  it('even sides, and k = 1, are left exactly as they were', () => {
    const home = sideSheet('H', { rating: 35 });
    const away = sideSheet('A', { rating: 35 });
    const [h, a] = spreadSheets(home, away, 0.3);
    expect(h.roster![3]!.stats).toEqual(home.roster![3]!.stats); // two weak sides still play like weak sides
    expect(a.roster![3]!.stats).toEqual(away.roster![3]!.stats);
    const strong = sideSheet('H', { rating: 70 });
    expect(spreadSheets(strong, away, 1)[0]).toBe(strong);
  });
  it('keeps the order of players within a side, and does not touch the sheets passed in', () => {
    const home = teamSheetFromRival({ id: 'rival-wolves', name: 'W', colors: ['#000', '#fff'], strength: 71 });
    const away = teamSheetFromRival({ id: 'rival-gulls', name: 'G', colors: ['#000', '#fff'], strength: 48 });
    const before = JSON.stringify(home);
    const [h] = spreadSheets(home, away, 0.4);
    expect(JSON.stringify(home)).toBe(before);
    const speeds = (s: typeof home): number[] => s.roster!.map((e) => e.stats!.speed);
    const order = (xs: number[]): number[] => xs.map((_, i) => i).sort((i, j) => xs[i]! - xs[j]! || i - j);
    expect(order(speeds(h))).toEqual(order(speeds(home)));
  });
  it('is a knob by name', () => {
    expect(typeof RATING.spread).toBe('number');
  });
});
