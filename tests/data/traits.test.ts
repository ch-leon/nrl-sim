// tests/data/traits.test.ts — the trait catalogue (BAK-208 §3): rare, levelled,
// position-weighted at generation, and migrated from the old string names.
import { describe, it, expect } from 'vitest';
import {
  LEVEL_MULT, POOL_IDS, TRAITS, TRAIT_COUNT_ODDS, TRAIT_IDS, fromLegacy, hasTrait, rollTraitCount, rollTraits,
  traitBoost, traitLabel, traitLevel, withTrait, withoutTrait,
} from '../../src/data/traits';
import { makeRng } from '../../src/utils/rng';

describe('catalogue', () => {
  it('every trait has a footy name, a short badge and a group; the pool excludes the age/tenure traits', () => {
    for (const id of TRAIT_IDS) {
      const d = TRAITS[id];
      expect(d.name.length).toBeGreaterThan(2);
      expect(d.short.length).toBeLessThanOrEqual(5);
      expect(['attack', 'defence', 'edge', 'meta']).toContain(d.group);
    }
    for (const id of ['youngGun', 'veteran', 'clubLegend', 'injuryProne'] as const) expect(POOL_IDS).not.toContain(id);
    expect(POOL_IDS).toContain('dancingFeet');
    expect(POOL_IDS.length).toBeGreaterThanOrEqual(15);
  });
  it('levels scale I ×1.0 · II ×1.6 · III ×2.2 and announce in roman numerals', () => {
    expect(LEVEL_MULT).toEqual({ 1: 1, 2: 1.6, 3: 2.2 });
    expect(traitLabel({ id: 'dancingFeet', level: 2 })).toBe('Dancing Feet II');
    expect(traitLabel({ id: 'dontArgue', level: 3 })).toBe("Don't Argue III");
  });
  it('lookups: has / level / boost', () => {
    const t = [{ id: 'hitman' as const, level: 2 as const }];
    expect(hasTrait(t, 'hitman')).toBe(true);
    expect(hasTrait(t, 'jets')).toBe(false);
    expect(hasTrait(undefined, 'jets')).toBe(false);
    expect(traitLevel(t, 'hitman')).toBe(2);
    expect(traitLevel(t, 'jets')).toBe(0);
    expect(traitBoost(t, 'hitman')).toBe(1.6);
    expect(traitBoost(t, 'jets')).toBe(0);
  });
  it('withTrait adds or raises, never lowers or repeats; withoutTrait removes', () => {
    let t = withTrait([], 'jets');
    expect(t).toEqual([{ id: 'jets', level: 1 }]);
    t = withTrait(t, 'jets', 3);
    expect(t).toEqual([{ id: 'jets', level: 3 }]);
    t = withTrait(t, 'jets', 1);
    expect(t).toEqual([{ id: 'jets', level: 3 }]);
    t = withTrait(t, 'poacher', 2);
    expect(t).toHaveLength(2);
    expect(withoutTrait(t, 'jets')).toEqual([{ id: 'poacher', level: 2 }]);
  });
});

describe('generation', () => {
  it('rollTraitCount follows the cumulative odds per quality', () => {
    expect(rollTraitCount(0.1, 'average')).toBe(0);
    expect(rollTraitCount(0.56, 'average')).toBe(1);
    expect(rollTraitCount(0.9, 'average')).toBe(2);
    expect(rollTraitCount(0.98, 'average')).toBe(3);
    expect(rollTraitCount(0.999, 'average')).toBe(4);
    expect(rollTraitCount(0.6, 'rookie')).toBe(0);
    expect(rollTraitCount(0.6, 'star')).toBe(1);
    for (const q of ['rookie', 'average', 'star'] as const) expect(TRAIT_COUNT_ODDS[q][TRAIT_COUNT_ODDS[q].length - 1]).toBe(1);
  });
  it('most average players have none, stars have several, and nobody repeats a trait', () => {
    const rng = makeRng(99);
    const count = (q: 'rookie' | 'average' | 'star'): number[] => {
      const n = [0, 0, 0, 0, 0];
      for (let i = 0; i < 3000; i++) {
        const t = rollTraits(rng, 'centre', q);
        expect(new Set(t.map((x) => x.id)).size).toBe(t.length);
        for (const x of t) expect([1, 2]).toContain(x.level); // III is trained, never rolled
        n[t.length]!++;
      }
      return n.map((v) => v / 3000);
    };
    const avg = count('average');
    expect(avg[0]).toBeGreaterThan(0.5);
    expect(avg[0]).toBeLessThan(0.6);
    expect(avg[1]).toBeGreaterThan(0.25);
    expect(avg[3]! + avg[4]!).toBeLessThan(0.06);
    const star = count('star');
    expect(star[0]).toBeLessThan(0.35);
    expect(star[2]! + star[3]! + star[4]!).toBeGreaterThan(0.3);
    expect(count('rookie')[0]).toBeGreaterThan(0.65);
  });
  it('is weighted to the position: props roll forward traits far more than steps', () => {
    const rng = makeRng(7);
    const tally = (pos: 'prop' | 'winger'): Record<string, number> => {
      const n: Record<string, number> = {};
      for (let i = 0; i < 4000; i++) for (const t of rollTraits(rng, pos, 'star')) n[t.id] = (n[t.id] ?? 0) + 1;
      return n;
    };
    const prop = tally('prop');
    const wing = tally('winger');
    expect(prop.wreckingBall!).toBeGreaterThan(wing.wreckingBall! * 2);
    expect(wing.dancingFeet!).toBeGreaterThan(prop.dancingFeet! * 2);
    expect(wing.jets!).toBeGreaterThan(prop.jets! * 2);
  });
  it('is deterministic per rng', () => {
    const a = rollTraits(makeRng(5), 'halfback', 'star');
    expect(a).toEqual(rollTraits(makeRng(5), 'halfback', 'star'));
  });
});

describe('fromLegacy', () => {
  it('maps the old names to level I, renames hardMan, drops junk and merges repeats', () => {
    expect(fromLegacy(['finisher', 'hardMan', 'playmaker', 'bogus', 42, 'finisher', 'injuryProne'])).toEqual([
      { id: 'finisher', level: 1 },
      { id: 'hitman', level: 1 },
      { id: 'playmaker', level: 1 },
      { id: 'injuryProne', level: 1 },
    ]);
    expect(fromLegacy([])).toEqual([]);
  });
});
