import { describe, it, expect } from 'vitest';
import { makeRng } from '../../src/utils/rng';
import {
  generatePlayer,
  overallRating,
  POSITIONS,
  type Quality,
} from '../../src/data/player';
import { STAT_MAX, WEEKS_PER_SEASON } from '../../src/config';
import type { Player } from '../../src/core/state';

const QUALITIES: Quality[] = ['rookie', 'average', 'star'];

describe('overallRating', () => {
  it('computes the weighted mean for known stats', () => {
    // all 80 -> weighted mean is 80
    const r = overallRating({
      stats: { speed: 80, strength: 80, stamina: 80, skill: 80, footyIQ: 80 },
    });
    expect(r).toBe(80);
  });

  it('weights skill & footyIQ higher than strength/stamina', () => {
    const highSkill = overallRating({
      stats: { speed: 50, strength: 50, stamina: 50, skill: 100, footyIQ: 100 },
    });
    const highStrength = overallRating({
      stats: { speed: 50, strength: 100, stamina: 100, skill: 50, footyIQ: 50 },
    });
    expect(highSkill).toBeGreaterThan(highStrength);
  });

  it('returns a value within 1..100', () => {
    const r = overallRating({
      stats: { speed: 1, strength: 1, stamina: 1, skill: 1, footyIQ: 1 },
    });
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(100);
  });
});

describe('generatePlayer — determinism', () => {
  it('same seed -> identical player sequence', () => {
    const a = makeRng(2024);
    const b = makeRng(2024);
    const seqA = Array.from({ length: 20 }, () => generatePlayer(a));
    const seqB = Array.from({ length: 20 }, () => generatePlayer(b));
    expect(seqA).toEqual(seqB);
  });
});

describe('generatePlayer — shape & bounds', () => {
  it('produces a valid §4 Player and is JSON round-trippable', () => {
    const rng = makeRng(1);
    const p = generatePlayer(rng);
    const roundtrip: Player = JSON.parse(JSON.stringify(p));
    expect(roundtrip).toEqual(p);
    expect(typeof p.id).toBe('string');
    expect(typeof p.name).toBe('string');
    expect(POSITIONS).toContain(p.position);
    expect(p.injuredWeeks).toBe(0);
    expect(Array.isArray(p.traits)).toBe(true);
  });

  it('all stats within 1..STAT_MAX across 1000 generations per quality', () => {
    for (const quality of QUALITIES) {
      const rng = makeRng(50);
      for (let i = 0; i < 1000; i++) {
        const p = generatePlayer(rng, { quality });
        for (const v of Object.values(p.stats)) {
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(STAT_MAX);
        }
        expect(p.age).toBeGreaterThanOrEqual(17);
        expect(p.age).toBeLessThanOrEqual(36);
        expect(p.morale).toBeGreaterThanOrEqual(55);
        expect(p.morale).toBeLessThanOrEqual(85);
        expect(p.injuryRisk).toBeGreaterThanOrEqual(5);
        expect(p.injuryRisk).toBeLessThanOrEqual(40);
      }
    }
  });

  it('respects opts overrides', () => {
    const rng = makeRng(8);
    const p = generatePlayer(rng, { age: 25, position: 'hooker', quality: 'star' });
    expect(p.age).toBe(25);
    expect(p.position).toBe('hooker');
  });

  it('wage derives from overall rating', () => {
    const rng = makeRng(8);
    const p = generatePlayer(rng);
    expect(p.wage).toBe(Math.round(overallRating(p) * 15 + 100));
  });

  it('contractWeeks is a multiple of WEEKS_PER_SEASON (1..3 seasons)', () => {
    const rng = makeRng(8);
    for (let i = 0; i < 200; i++) {
      const p = generatePlayer(rng);
      const seasons = p.contractWeeks / WEEKS_PER_SEASON;
      expect(Number.isInteger(seasons)).toBe(true);
      expect(seasons).toBeGreaterThanOrEqual(1);
      expect(seasons).toBeLessThanOrEqual(3);
    }
  });
});

describe('generatePlayer — auto traits', () => {
  it('young high-potential players carry youngGun and not veteran', () => {
    const rng = makeRng(3);
    const p = generatePlayer(rng, { age: 19, quality: 'star' });
    expect(overallRating(p)).toBeGreaterThanOrEqual(60);
    expect(p.traits).toContain('youngGun');
    expect(p.traits).not.toContain('veteran');
  });

  it('age>=31 players carry veteran and not youngGun', () => {
    const rng = makeRng(3);
    const p = generatePlayer(rng, { age: 33, quality: 'average' });
    expect(p.traits).toContain('veteran');
    expect(p.traits).not.toContain('youngGun');
  });

  it('never assigns clubLegend at generation', () => {
    const rng = makeRng(77);
    for (let i = 0; i < 500; i++) {
      const p = generatePlayer(rng);
      expect(p.traits).not.toContain('clubLegend');
    }
  });

  it('traits are deduped (no repeats)', () => {
    const rng = makeRng(4);
    for (let i = 0; i < 500; i++) {
      const p = generatePlayer(rng);
      expect(new Set(p.traits).size).toBe(p.traits.length);
    }
  });
});
