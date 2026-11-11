import { describe, expect, it } from 'vitest';
import { archetype, derivedRatings, FIT, styleFit, type DerivedRatings } from '../../../src/match/league/fit';
import { ATTACK_PRESETS, BACKS, PACK, type StyleEntry } from '../../../src/match/league/presets';
import { applyTuning, listKnobs } from '../../../src/match/league/tuning';

const positions = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'];
const player = (position = 'winger', base = 60, traits: string[] = []): StyleEntry => ({
  position, stats: { speed: base, strength: base, stamina: base, handling: base, kicking: base, footyIQ: base }, traits: traits.map((id) => ({ id })),
});
const squad = (base = 60, traits: string[] = []): StyleEntry[] => positions.map((p) => player(p, base, traits));
const topAttack = (roster: StyleEntry[]): string => {
  const scores = styleFit(roster);
  return [...ATTACK_PRESETS].sort((a, b) => scores[b] - scores[a])[0]!;
};

describe('pure squad fit', () => {
  it('gives flat 60 exactly 60 in all derived ratings and exactly 1 on all eight styles', () => {
    expect(Object.values(derivedRatings(player()))).toEqual(Array(6).fill(60));
    expect(Object.values(styleFit(squad()))).toEqual(Array(8).fill(1));
    expect(archetype(player())).toBeNull();
  });
  it('ranks Expansive first above 1.2 for speed-80 backs', () => {
    const roster = squad();
    for (const p of roster) if (BACKS.includes(p.position)) p.stats!.speed = 80;
    expect(topAttack(roster)).toBe('expansive');
    expect(styleFit(roster).expansive).toBe(1.25);
  });
  it('ranks Tight (grind) first above 1.2 for strength-80 pack', () => {
    const roster = squad();
    for (const p of roster) if (PACK.includes(p.position)) p.stats!.strength = 80;
    expect(topAttack(roster)).toBe('grind');
    expect(styleFit(roster).grind).toBeCloseTo(1 + (20 * (0.75 + 2 / 3) / 2) / 50);
  });
  it.each([1, 99])('clamps all eight fits for all-%i squads, with and without all traits', (base) => {
    for (const traits of [[], ['dancingFeet', 'wreckingBall', 'offloadKing', 'razzleDazzle', 'hitman', 'brickWall', 'lastLine', 'poacher', 'playmaker', 'jets', 'bigBoot']]) {
      for (const value of Object.values(styleFit(squad(base, traits)))) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1.5);
      }
    }
    expect(Object.values(styleFit(squad(base)))).toEqual(Array(8).fill(base === 1 ? 0 : 1.5));
  });
  it.each<[keyof DerivedRatings, string[]]>([
    ['carry', ['wreckingBall']], ['offload', ['offloadKing', 'razzleDazzle']],
    ['ballPlay', ['playmaker']], ['footwork', ['dancingFeet']],
    ['edgeD', ['lastLine', 'poacher']], ['contactD', ['brickWall', 'hitman']],
  ])('%s increases for each of its traits', (rating, traits) => {
    for (const trait of traits) {
      expect(derivedRatings(player('winger', 60, [trait]))[rating]).toBeGreaterThan(60);
      expect(derivedRatings(player('winger', 60, [trait, trait]))).toEqual(derivedRatings(player('winger', 60, [trait])));
    }
  });
  it('weights offloads two-thirds Strength and one-third Handling, independent of Kicking', () => {
    const p = player('prop');
    p.stats = { ...p.stats!, handling: 90, strength: 30, kicking: 1 };
    expect(derivedRatings(p).offload).toBe(50);
    p.stats.kicking = 100;
    expect(derivedRatings(p).offload).toBe(50);
    p.stats.handling = 30; p.stats.strength = 90;
    expect(derivedRatings(p).offload).toBe(70);
  });
  it('reads the best kicker anywhere, Big Boot, and Hitman rush bonuses', () => {
    const roster = squad();
    roster[0]!.stats!.kicking = 80;
    expect(styleFit(roster)['kick-chase']).toBe(1.2);
    roster[0]!.traits = [{ id: 'bigBoot' }];
    expect(styleFit(roster)['kick-chase']).toBe(1.28);
    expect(styleFit(squad(60, ['hitman'])).rush).toBeGreaterThan(styleFit(squad()).rush);
  });
  it.each([
    ['winger', 'dancingFeet', 'Strike winger'], ['prop', 'wreckingBall', 'Wrecking forward'],
    ['halfback', 'playmaker', 'Ball-playing half'], ['centre', 'lastLine', 'Edge defender'],
    ['prop', 'brickWall', 'Enforcer'], ['fullback', 'lastLine', 'Sweeper'],
  ])('labels a standout %s with %s as %s', (position, trait, label) => {
    expect(archetype(player(position, 75, [trait]))).toBe(label);
  });
  it('uses the top rating, a high threshold and a deterministic single label on ties', () => {
    expect(archetype(player('winger', 71, ['dancingFeet']))).toBeNull();
    expect(archetype(player('prop', 80))).toBe('Wrecking forward');
    expect(archetype(player('prop', 75, ['hitman', 'brickWall', 'wreckingBall']))).toBe('Enforcer');
  });
  it('handles absent stats, empty rosters and missing role groups neutrally', () => {
    for (const roster of [[], [{ position: 'prop' }], [player('unknown')]]) {
      expect(Object.values(styleFit(roster))).toEqual(Array(8).fill(1));
    }
  });
  it('does not mutate its input and tuning applies and restores fit knobs', () => {
    const roster = squad();
    const before = structuredClone(roster);
    styleFit(roster); roster.forEach(archetype);
    expect(roster).toEqual(before);
    expect(listKnobs()).toContainEqual({ path: 'fit.pointsPerFit', value: 50 });
    const restore = applyTuning({ 'fit.footwork.dancingFeet': 10 });
    try { expect(derivedRatings(player('winger', 60, ['dancingFeet'])).footwork).toBe(70); }
    finally { restore(); }
    expect(FIT.footwork.dancingFeet).toBe(8);
  });
});
