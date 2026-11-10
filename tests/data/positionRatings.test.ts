import { describe, expect, it } from 'vitest';
import { generatePlayer, generatePlayerAround, generateFreeAgent, shownStats, POSITION_GROUPS, POSITIONS, overallRating, playerStars, starsForOverall, ratingText, marketWage, wageForOverall } from '../../src/data/player';
import { teamSheetFromSquad } from '../../src/match/league/sheets';
import { goalChance } from '../../src/match/league/goals';
import { drainRate } from '../../src/match/league/fatigue';
import { knockOnChance } from '../../src/match/league/contest';
import { STAR_BANDS } from '../../src/config';
import { makeRng } from '../../src/utils/rng';
import { trainWeek, TRAINING_FOCI } from '../../src/systems/training';
import { developRivalPlayerWeek } from '../../src/systems/rivals';
import { generateProspects } from '../../src/systems/youth';
import { FACILITY_CATALOG } from '../../src/data/facility';
import type { PlacedFacility, PlayerStats } from '../../src/core/state';

const cases = [
  ['fullback', 'outside-backs', ['speed', 'handling', 'strength', 'footyIQ']],
  ['winger', 'outside-backs', ['speed', 'handling', 'strength', 'footyIQ']],
  ['centre', 'outside-backs', ['speed', 'handling', 'strength', 'footyIQ']],
  ['five-eighth', 'halves', ['handling', 'kicking', 'footyIQ', 'speed']],
  ['halfback', 'halves', ['handling', 'kicking', 'footyIQ', 'speed']],
  ['hooker', 'hooker', ['handling', 'footyIQ', 'stamina', 'strength']],
  ['prop', 'forwards', ['strength', 'stamina', 'speed', 'footyIQ']],
  ['second-row', 'forwards', ['strength', 'stamina', 'speed', 'footyIQ']],
  ['lock', 'forwards', ['strength', 'stamina', 'speed', 'footyIQ']],
] as const;
const facilities = Object.values(FACILITY_CATALOG).map((f, i) => ({ id: `f${i}`, defId: f.id, x: i * 10, y: 0, level: 3 })) as PlacedFacility[];
const keys: (keyof PlayerStats)[] = ['speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'];

describe('position groups (#537)', () => {
  it.each(cases)('%s maps to %s and uses exactly its four ordered stats', (position, group, shown) => {
    expect(POSITION_GROUPS[position]).toBe(group);
    expect(shownStats(position)).toEqual(shown);
    const p = generatePlayer(makeRng(4), { position });
    p.stats = { speed: 31, strength: 42, stamina: 53, handling: 64, kicking: 75, footyIQ: 86 };
    const average = shown.reduce((sum, k) => sum + p.stats[k], 0) / 4;
    expect(overallRating(p)).toBe(average);
    expect(marketWage(p)).toBe(wageForOverall(average));
    for (const key of keys.filter(k => !shownStats(position).includes(k))) p.stats[key] = 100;
    expect(overallRating(p)).toBe(average);
    expect(playerStars(p)).toBe(starsForOverall(average));
  });

  it('all creation paths keep hidden stats low, including elite and Academy players', () => {
    const rng = makeRng(537);
    const players = POSITIONS.flatMap(position => [
      ...(['rookie', 'average', 'star'] as const).map(quality => generatePlayer(rng, { position, quality })),
      generatePlayerAround(rng, 95, { position }),
    ]);
    players.push(...Array.from({ length: 100 }, () => generateFreeAgent(rng, 90)));
    for (let level = 0; level <= 3; level++) players.push(...generateProspects(rng, level));
    for (const p of players) for (const key of keys.filter(k => !shownStats(p.position).includes(k))) {
      expect(p.stats[key]).toBeGreaterThanOrEqual(10);
      expect(p.stats[key]).toBeLessThanOrEqual(25);
    }
  });

  it('hidden values reach match sheets and retain a small match effect', () => {
    const rng = makeRng(4);
    const squad = POSITIONS.map(position => generatePlayerAround(rng, 70, { position }));
    const sheet = teamSheetFromSquad(squad, 'test', 'Test', ['#111111', '#ffffff']);
    for (const entry of sheet.roster!) {
      const player = squad.find(p => p.id === entry.id)!;
      for (const key of keys.filter(k => !shownStats(player.position).includes(k))) {
        expect(entry.stats![key]).toBe(player.stats[key]);
        expect(entry.stats![key]).toBeGreaterThan(0);
      }
    }
    // Neither hidden Stamina nor Handling is treated as zero or ignored.
    expect(drainRate(25)).toBeLessThan(drainRate(10));
    expect(drainRate(10) - drainRate(25)).toBeLessThan(0.2);
    expect(knockOnChance(25, false)).toBeLessThan(knockOnChance(10, false));
    expect(knockOnChance(10, false) - knockOnChance(25, false)).toBeLessThan(0.1);
    const lowKick = goalChance({ x: 30, y: 0 }, { x: 0, y: 0 }, 10);
    const highKick = goalChance({ x: 30, y: 0 }, { x: 0, y: 0 }, 25);
    expect(highKick).toBeGreaterThan(lowKick);
    expect(highKick - lowKick).toBeLessThan(0.1);
  });

  it.each(POSITIONS)('%s hidden stats stay fixed through training, decline and rival development', position => {
    const rng = makeRng(537);
    for (const age of [19, 25, 34]) {
      let p = generatePlayer(rng, { position, age });
      const initial = { ...p.stats };

      for (let week = 0; week < 52; week++) {
        for (const focus of TRAINING_FOCI) {
          p = trainWeek(p, facilities, focus);
        }
        p = developRivalPlayerWeek(p, rng);
      }
      for (const key of keys.filter(k => !shownStats(position).includes(k))) expect(p.stats[key]).toBe(initial[key]);
    }
  });
});

describe('star bands (#537)', () => {
  it('covers the lowest, highest and all half-step lookup edges', () => {
    expect(starsForOverall(-1)).toBe(0.5);
    expect(starsForOverall(1)).toBe(0.5);
    expect(starsForOverall(100)).toBe(5);
    expect(starsForOverall(101)).toBe(5);
    expect(STAR_BANDS.map(b => b.stars)).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
    for (const band of STAR_BANDS.slice(1)) {
      expect(starsForOverall(band.minOverall - 0.01)).toBe(band.stars - 0.5);
      expect(starsForOverall(band.minOverall)).toBe(band.stars);
      expect(starsForOverall(band.minOverall + 0.01)).toBe(band.stars);
    }
    expect(ratingText(1)).toBe('½★ 1');
    expect(ratingText(42)).toBe('3½★ 42');
    expect(ratingText(100)).toBe('5★ 100');
  });
});
