// tests/systems/potential.test.ts — the projected career (#369): training.ts's
// weekly rules run forward without dice, ageing at each rollover.
import { describe, it, expect } from 'vitest';
import type { PlacedFacility, Player, PlayerStats, TraitId } from '../../src/core/state';
import { PEAK_TOLERANCE, PROJECTION_LAST_AGE, RETIREMENT_NOTE_AGE, careerStage, projectCareer, retirementRisk } from '../../src/systems/potential';
import { trainPlayer } from '../../src/systems/training';
import { agePlayer } from '../../src/systems/aging';
import { overallRating } from '../../src/data/player';
import { WEEKS_PER_SEASON } from '../../src/config';

const flat = (v: number): PlayerStats => ({ speed: v, strength: v, stamina: v, skill: v, footyIQ: v });

const mk = (id: string, age: number, stats: PlayerStats, traits: TraitId[] = []): Player => ({
  id, name: id, age, position: 'lock', stats, morale: 60, injuryRisk: 10, injuredWeeks: 0,
  traits: traits.map((t) => ({ id: t, level: 1 as const })), wage: 5000, contractWeeks: 20,
});

/** A club that has built the three training rooms, apart. */
const BUILT: PlacedFacility[] = [
  { id: 'f1', defId: 'trainingPaddock', x: 0, y: 0, level: 1 },
  { id: 'f2', defId: 'weightsRoom', x: 10, y: 0, level: 1 },
  { id: 'f3', defId: 'videoRoom', x: 0, y: 10, level: 2 },
];

/** A fixed squad: a teenager (young gun), a hurt prime-age man, a veteran. */
const SQUAD: Player[] = [
  mk('kid', 19, { speed: 62, strength: 48, stamina: 55, skill: 58, footyIQ: 50 }, ['youngGun']),
  { ...mk('mid', 26, flat(66), ['workhorse']), injuredWeeks: 4 },
  mk('vet', 32, { speed: 78, strength: 80, stamina: 76, skill: 82, footyIQ: 84 }, ['veteran']),
];

/** The same rules stepped by hand: trainPlayer each week (fit), agePlayer at each rollover. */
function stepByHand(p0: Player, facilities: PlacedFacility[], week: number): number[] {
  let p: Player = { ...p0, injuredWeeks: 0 };
  const out = [overallRating(p)];
  let weeks = WEEKS_PER_SEASON - week + 1;
  while (p.age < PROJECTION_LAST_AGE) {
    for (let w = 0; w < weeks; w++) p = { ...p, stats: trainPlayer(p, facilities, 'speed') };
    p = agePlayer(p);
    out.push(overallRating(p));
    weeks = WEEKS_PER_SEASON;
  }
  return out;
}

describe('projectCareer', () => {
  it('matches stepping trainPlayer week by week on a fixed squad', () => {
    for (const p of SQUAD) {
      for (const week of [1, 10]) {
        const proj = projectCareer(p, BUILT, 'speed', undefined, week);
        expect(proj.points.map((x) => x.rating), `${p.id} from week ${week}`).toEqual(stepByHand(p, BUILT, week));
        expect(proj.points.map((x) => x.age)).toEqual(Array.from({ length: PROJECTION_LAST_AGE - p.age + 1 }, (_, i) => p.age + i));
      }
    }
  });

  it('counts the peak from when he gets within a point of his best, not the last point the ×0.6 years add', () => {
    const { points, peak } = projectCareer(SQUAD[0]!, BUILT.slice(0, 1));
    const best = Math.max(...points.map((x) => x.rating));
    expect(peak.rating).toBeGreaterThanOrEqual(best - PEAK_TOLERANCE);
    expect(points.filter((x) => x.age < peak.age).every((x) => x.rating < best - PEAK_TOLERANCE)).toBe(true);
    expect(peak.age).toBeLessThanOrEqual(25);
  });

  it('a teenager rises to a peak in his twenties, then the veteran decline brings him down', () => {
    const { points, peak } = projectCareer(SQUAD[0]!, BUILT);
    expect(points[1]!.rating).toBeGreaterThan(points[0]!.rating);
    expect(peak.age).toBeGreaterThanOrEqual(23);
    expect(peak.age).toBeLessThanOrEqual(27);
    expect(points[points.length - 1]!.rating).toBeLessThan(peak.rating);
  });

  it('a 32-year-old declines once the paddock and weights can\'t keep up, and his peak is now', () => {
    // (A level-2 video room still adds more skill and IQ than the decline takes: the rules, as they are.)
    const { points, peak } = projectCareer(SQUAD[2]!, BUILT.slice(0, 2));
    expect(peak).toEqual({ age: 32, rating: overallRating(SQUAD[2]!) });
    expect(points[points.length - 1]!.rating).toBeLessThan(points[0]!.rating);
  });

  it('moves when a training facility is built', () => {
    const kid = SQUAD[0]!;
    const before = projectCareer(kid, BUILT.slice(0, 2));
    const after = projectCareer(kid, BUILT);
    expect(after.peak.rating).toBeGreaterThan(before.peak.rating);
  });

  it('peaks earlier with no facilities: nothing trains, so the peak is today', () => {
    for (const p of SQUAD) {
      const none = projectCareer(p, []);
      const built = projectCareer(p, BUILT);
      expect(none.peak.age).toBe(p.age);
      expect(none.peak.age).toBeLessThanOrEqual(built.peak.age);
    }
    expect(projectCareer(SQUAD[0]!, []).peak.age).toBeLessThan(projectCareer(SQUAD[0]!, BUILT).peak.age);
  });

  it('is pure: the player and the facilities are untouched, and it says the same twice', () => {
    const p = structuredClone(SQUAD[1]!);
    const f = structuredClone(BUILT);
    const a = projectCareer(p, f, 'skill', undefined, 5);
    expect(p).toEqual(SQUAD[1]);
    expect(f).toEqual(BUILT);
    expect(projectCareer(p, f, 'skill', undefined, 5)).toEqual(a);
  });

  it('a man at or past the last age is just today', () => {
    const old = mk('old', 35, flat(70));
    expect(projectCareer(old, BUILT)).toEqual({ points: [{ age: 35, rating: 70 }], peak: { age: 35, rating: 70 } });
  });
});

describe('stage and retirement', () => {
  it('reads the stage from ageMod\'s bands', () => {
    expect([17, 21, 22, 27, 28, 30, 31, 36].map((age) => careerStage(age)))
      .toEqual(['Developing', 'Developing', 'Prime', 'Prime', 'Prime', 'Prime', 'Declining', 'Declining']);
  });

  it('a veteran whose projection still rises is Still improving, not Declining (#419)', () => {
    // The play-test's man: 33, a 53 overall, a Training Paddock at L2.
    const paddock: PlacedFacility[] = [{ id: 'p', defId: 'trainingPaddock', x: 0, y: 0, level: 2 }];
    const old = mk('old', 33, flat(53));
    const rising = projectCareer(old, paddock);
    expect(rising.points[rising.points.length - 1]!.rating).toBeGreaterThan(overallRating(old));
    expect(rising.peak.age).toBeGreaterThan(33);
    expect(careerStage(33, rising)).toBe('Still improving');
    expect(careerStage(33)).toBe('Declining'); // the age alone
    // A falling (or flat) curve keeps the word.
    const falling = projectCareer(mk('star', 33, flat(80)), paddock);
    expect(falling.peak.age).toBe(33);
    expect(careerStage(33, falling)).toBe('Declining');
    // The young and the prime read as before, whatever the curve.
    expect(careerStage(19, rising)).toBe('Developing');
    expect(careerStage(27, falling)).toBe('Prime');
  });

  it('the retirement note starts at 33, at the chance of the coming rollover', () => {
    expect(RETIREMENT_NOTE_AGE).toBe(33);
    expect(retirementRisk(32)).toBe(0);
    expect(retirementRisk(33)).toBeCloseTo(0.2);
    expect(retirementRisk(37)).toBe(1);
  });
});
