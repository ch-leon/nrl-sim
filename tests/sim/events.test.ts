// tests/sim/events.test.ts — mkEvent shape + teamSheet builder aggregation.
import { describe, it, expect } from 'vitest';
import { mkEvent } from '../../src/sim/events';
import { teamSheetFromSquad, teamSheetFromRival } from '../../src/sim/engine';
import { makeRng } from '../../src/utils/rng';
import { generatePlayer } from '../../src/data/player';
import { STAT_MAX } from '../../src/config';
import type { Player, RivalClub } from '../../src/core/state';

const COLORS: [string, string] = ['#001122', '#334455'];

function player(overrides: Partial<Player> & { stats?: Partial<Player['stats']> } = {}): Player {
  const rng = makeRng(1);
  const base = generatePlayer(rng);
  return {
    ...base,
    ...overrides,
    stats: { ...base.stats, ...(overrides.stats ?? {}) },
  };
}

describe('mkEvent', () => {
  it('builds a minimal event with rounded t', () => {
    const e = mkEvent(12.7, 'run', 'H');
    expect(e).toEqual({ t: 13, kind: 'run', teamId: 'H' });
  });

  it('spreads only provided extra fields', () => {
    const e = mkEvent(5, 'try', 'A', { player: 'Jones', x: 100, detail: 'good' });
    expect(e).toEqual({ t: 5, kind: 'try', teamId: 'A', player: 'Jones', x: 100, detail: 'good' });
    expect('y' in e).toBe(false);
  });
});

describe('teamSheetFromSquad', () => {
  it('excludes injured players', () => {
    const fitPlayers = Array.from({ length: 13 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 40, strength: 40, stamina: 40, skill: 40, footyIQ: 40 }, morale: 50 }),
    );
    // Add injured superstars that would inflate stats if wrongly included.
    const injured = Array.from({ length: 4 }, () =>
      player({ injuredWeeks: 3, stats: { speed: 99, strength: 99, stamina: 99, skill: 99, footyIQ: 99 }, morale: 50 }),
    );
    const sheet = teamSheetFromSquad([...fitPlayers, ...injured], 'player', 'Sharks', COLORS);
    // All fit players are 40-rated → aggregates should be ~40, nowhere near 99.
    expect(sheet.attack).toBeLessThan(60);
    expect(sheet.defense).toBeLessThan(60);
  });

  it('uses the best 13 by overall rating', () => {
    const strong = Array.from({ length: 13 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 80, strength: 80, stamina: 80, skill: 80, footyIQ: 80 }, morale: 50 }),
    );
    const weak = Array.from({ length: 10 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 20, strength: 20, stamina: 20, skill: 20, footyIQ: 20 }, morale: 50 }),
    );
    const sheet = teamSheetFromSquad([...weak, ...strong], 'player', 'Sharks', COLORS);
    // Best 13 are the 80s (morale 50 → no modifier), so aggregates ~80.
    expect(sheet.attack).toBe(80);
    expect(sheet.defense).toBe(80);
  });

  it('applies the morale modifier (±10% at morale 0/100)', () => {
    const highMorale = Array.from({ length: 13 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 }, morale: 100 }),
    );
    const lowMorale = Array.from({ length: 13 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 }, morale: 0 }),
    );
    const hi = teamSheetFromSquad(highMorale, 'player', 'A', COLORS);
    const lo = teamSheetFromSquad(lowMorale, 'player', 'B', COLORS);
    // morale 100 → ×1.1 → 66; morale 0 → ×0.9 → 54.
    expect(hi.attack).toBe(66);
    expect(lo.attack).toBe(54);
  });

  it('clamps aggregates to 1..STAT_MAX', () => {
    const maxed = Array.from({ length: 13 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 100, strength: 100, stamina: 100, skill: 100, footyIQ: 100 }, morale: 100 }),
    );
    const sheet = teamSheetFromSquad(maxed, 'player', 'A', COLORS);
    expect(sheet.attack).toBe(STAT_MAX);
    expect(sheet.defense).toBe(STAT_MAX);
    expect(sheet.kicking).toBeLessThanOrEqual(STAT_MAX);
  });

  it('derives kicking from halfback/five-eighth skill when present', () => {
    const forwards = Array.from({ length: 12 }, () =>
      player({ position: 'prop', injuredWeeks: 0, stats: { speed: 50, strength: 50, stamina: 50, skill: 30, footyIQ: 50 }, morale: 50 }),
    );
    const half = player({ position: 'halfback', injuredWeeks: 0, stats: { speed: 50, strength: 50, stamina: 50, skill: 90, footyIQ: 50 }, morale: 50 });
    const sheet = teamSheetFromSquad([...forwards, half], 'player', 'A', COLORS);
    expect(sheet.kicking).toBe(90);
  });

  it('throws when no fit players', () => {
    const allInjured = Array.from({ length: 13 }, () => player({ injuredWeeks: 2 }));
    expect(() => teamSheetFromSquad(allInjured, 'player', 'A', COLORS)).toThrow('no fit players');
  });

  it('uses all fit players when fewer than 13', () => {
    const five = Array.from({ length: 5 }, () =>
      player({ injuredWeeks: 0, stats: { speed: 70, strength: 70, stamina: 70, skill: 70, footyIQ: 70 }, morale: 50 }),
    );
    const sheet = teamSheetFromSquad(five, 'player', 'A', COLORS);
    expect(sheet.attack).toBe(70);
  });
});

describe('teamSheetFromRival', () => {
  const rival: RivalClub = { id: 'club-x', name: 'Titans', colors: ['#abc', '#def'], strength: 60 };

  it('derives all four aggregates near strength (±5)', () => {
    const sheet = teamSheetFromRival(rival);
    for (const v of [sheet.attack, sheet.defense, sheet.kicking, sheet.fitness]) {
      expect(v).toBeGreaterThanOrEqual(55);
      expect(v).toBeLessThanOrEqual(65);
    }
    expect(sheet.colors).toEqual(['#abc', '#def']);
  });

  it('is deterministic per clubId', () => {
    expect(teamSheetFromRival(rival)).toEqual(teamSheetFromRival(rival));
  });

  it('clamps to 1..100 for extreme strengths', () => {
    const weak = teamSheetFromRival({ id: 'w', name: 'W', colors: ['#000', '#fff'], strength: 2 });
    const strong = teamSheetFromRival({ id: 's', name: 'S', colors: ['#000', '#fff'], strength: 99 });
    for (const v of [weak.attack, weak.defense, weak.kicking, weak.fitness]) {
      expect(v).toBeGreaterThanOrEqual(1);
    }
    for (const v of [strong.attack, strong.defense, strong.kicking, strong.fitness]) {
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
