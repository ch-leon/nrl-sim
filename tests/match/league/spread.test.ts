// tests/match/league/spread.test.ts — how much a rating gap counts (BAK-207
// Phase 3, #87): each side moved toward the match average shrinks the gap
// between them, keeps every player's edge over his teammates, and leaves even
// sides as they were. Then the difficulty's edge to the player's rival (N12.2).
import { describe, it, expect } from 'vitest';
import { RATING, edgeSheets, rivalEdge, spreadSheets } from '../../../src/match/league/spread';
import { DIFFICULTY } from '../../../src/config';
import { sideSheet } from '../../../src/match/balance/measure';
import { teamSheetFromRival } from '../../../src/match/league/sheets';
import { LiveSim } from '../../../src/match/league/live';

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
  it('keeps every player’s edge over his teammates, and does not touch the sheets passed in', () => {
    const home = teamSheetFromRival({ id: 'rival-wolves', name: 'W', colors: ['#000', '#fff'], strength: 71 });
    const away = teamSheetFromRival({ id: 'rival-gulls', name: 'G', colors: ['#000', '#fff'], strength: 48 });
    const before = JSON.stringify(home);
    const [h] = spreadSheets(home, away, 0.4);
    expect(JSON.stringify(home)).toBe(before);
    const speeds = (s: typeof home): number[] => s.roster!.map((e) => e.stats!.speed);
    const gaps = (xs: number[]): number[] => xs.map((x) => x - xs[0]!);
    gaps(speeds(h)).forEach((g, i) => expect(g).toBeCloseTo(gaps(speeds(home))[i]!));
    // …and the side as a whole is closer to the other.
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(speeds(h))).toBeLessThan(mean(speeds(home)));
  });
  it('is a knob by name', () => {
    expect(typeof RATING.spread).toBe('number');
  });
});

describe('the difficulty’s edge after the spread (N12.2, pure)', () => {
  const rival = teamSheetFromRival({ id: 'rival-wolves', name: 'W', colors: ['#000', '#fff'], strength: 71 });
  const mine = sideSheet('H', { rating: 60 });
  it('adds the points to every stat of the named side’s starters and bench, and leaves the other side alone', () => {
    const [h, a] = edgeSheets(mine, rival, { side: 'away', points: 3 });
    expect(h).toBe(mine);
    a.roster!.forEach((e, i) => {
      for (const k of ['speed', 'strength', 'stamina', 'skill', 'footyIQ'] as const) expect(e.stats![k]).toBe(rival.roster![i]!.stats![k] + 3);
    });
    a.bench!.forEach((e, i) => expect(e.stats!.skill).toBe(rival.bench![i]!.stats!.skill + 3)); // the bench too
    const [easyHome] = edgeSheets(rival, mine, { side: 'home', points: -2.5 });
    expect(easyHome.roster![4]!.stats!.footyIQ).toBe(rival.roster![4]!.stats!.footyIQ - 2.5);
  });
  it('keeps every player’s edge over his teammates, and does not touch the sheets passed in', () => {
    const before = JSON.stringify(rival);
    const [, a] = edgeSheets(mine, rival, { side: 'away', points: 4 });
    expect(JSON.stringify(rival)).toBe(before);
    const gaps = (s: typeof rival): number[] => s.roster!.map((e) => e.stats!.speed - s.roster![0]!.stats!.speed);
    expect(gaps(a)).toEqual(gaps(rival));
  });
  it('clamps to 1–100', () => {
    const [top] = edgeSheets(sideSheet('H', { rating: 98 }), mine, { side: 'home', points: 5 });
    const [, low] = edgeSheets(mine, sideSheet('A', { rating: 3 }), { side: 'away', points: -5 });
    expect(top.roster![0]!.stats!.speed).toBe(100);
    expect(top.bench![0]!.stats!.stamina).toBe(100);
    expect(low.roster![0]!.stats!.skill).toBe(1);
  });
  it('no edge, or none on Normal, plays the sheets exactly as they were', () => {
    const [h, a] = edgeSheets(mine, rival, undefined);
    expect(h).toBe(mine);
    expect(a).toBe(rival);
    expect(edgeSheets(mine, rival, { side: 'away', points: 0 })[1]).toBe(rival);
    expect(rivalEdge('away', 'normal')).toBeUndefined();
    expect(rivalEdge('away', undefined)).toBeUndefined(); // an old save plays as Normal
  });
  it('reads the difficulty’s points for the side named', () => {
    const was = DIFFICULTY.hard.rivalEdge;
    DIFFICULTY.hard.rivalEdge = 2;
    try {
      expect(rivalEdge('home', 'hard')).toEqual({ side: 'home', points: 2 });
    } finally {
      DIFFICULTY.hard.rivalEdge = was;
    }
  });
});

describe('home advantage in the live match', () => {
  it('adds after the spread and stacks with a home rival’s difficulty edge', () => {
    const previous = RATING.homeEdge;
    const home = sideSheet('H', { rating: 70 });
    const away = sideSheet('A', { rating: 50 });
    const sheetsBefore = JSON.stringify([home, away]);
    try {
      RATING.homeEdge = 1;
      const withHomeEdge = new LiveSim(home, away, 7, { difficultyEdge: { side: 'home', points: 2 } });
      RATING.homeEdge = 0;
      const withEquivalentEdge = new LiveSim(home, away, 7, { difficultyEdge: { side: 'home', points: 3 } });
      for (let tick = 0; tick < 300; tick++) {
        withHomeEdge.step();
        withEquivalentEdge.step();
      }
      expect(withHomeEdge.snapshot()).toEqual(withEquivalentEdge.snapshot());
      expect(JSON.stringify([home, away])).toBe(sheetsBefore);
    } finally {
      RATING.homeEdge = previous;
    }
  });
});
