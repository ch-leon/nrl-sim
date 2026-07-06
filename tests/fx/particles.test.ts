// tests/fx/particles.test.ts — pure helpers for BAK-201 particle FX (WU-14).
// Only the Phaser-free math is unit-tested (world mapping, cap allocation,
// event→effect mapping). Emitter wiring / teardown is presentation and covered
// by manual/preview QA (ARCHITECTURE §8). Importing particles.ts here would pull
// in Phaser, which cannot load under the node test env — so we import the pure
// module directly.
import { describe, it, expect } from 'vitest';
import {
  MAX_LIVE_PARTICLES,
  MATCH_CAPS,
  GROUNDS_CAPS,
  totalCaps,
  fieldToWorld,
  facilityToWorld,
  matchEffectFor,
} from '../../src/fx/particleMath';
import { TILE_W, TILE_H } from '../../src/config';

const BOUNDS = { x: 100, y: 200, width: 800, height: 400 };

describe('particleMath.fieldToWorld', () => {
  it('maps the corners of the field to the corners of the bounds', () => {
    expect(fieldToWorld(0, 0, BOUNDS)).toEqual({ x: 100, y: 200 });
    expect(fieldToWorld(100, 0, BOUNDS)).toEqual({ x: 900, y: 200 });
    expect(fieldToWorld(0, 100, BOUNDS)).toEqual({ x: 100, y: 600 });
    expect(fieldToWorld(100, 100, BOUNDS)).toEqual({ x: 900, y: 600 });
  });

  it('maps the centre to the centre of the bounds', () => {
    expect(fieldToWorld(50, 50, BOUNDS)).toEqual({ x: 500, y: 400 });
  });

  it('clamps out-of-range and NaN coords into the bounds', () => {
    expect(fieldToWorld(-50, 0, BOUNDS)).toEqual({ x: 100, y: 200 });
    expect(fieldToWorld(150, 0, BOUNDS)).toEqual({ x: 900, y: 200 });
    expect(fieldToWorld(Number.NaN, Number.NaN, BOUNDS)).toEqual({ x: 100, y: 200 });
  });
});

describe('particleMath.facilityToWorld', () => {
  it('applies the iso projection plus the centring offset', () => {
    const offsetX = 640;
    // origin cell maps to (0,0) screen + offset.
    expect(facilityToWorld(0, 0, offsetX)).toEqual({ x: 640, y: 0 });
    // +x moves right and down; +y moves left and down — matches iso.gridToScreen.
    expect(facilityToWorld(1, 0, offsetX)).toEqual({ x: 640 + TILE_W / 2, y: TILE_H / 2 });
    expect(facilityToWorld(0, 1, offsetX)).toEqual({ x: 640 - TILE_W / 2, y: TILE_H / 2 });
    expect(facilityToWorld(2, 2, offsetX)).toEqual({ x: 640, y: 4 * (TILE_H / 2) });
  });
});

describe('particleMath.matchEffectFor', () => {
  it('maps try and big-hit to their discrete effects', () => {
    expect(matchEffectFor('try')).toBe('try');
    expect(matchEffectFor('big-hit')).toBe('big-hit');
  });

  it('returns null for kinds with no discrete burst', () => {
    for (const kind of ['kickoff', 'tackle', 'run', 'penalty', 'conversion', 'full-time']) {
      expect(matchEffectFor(kind)).toBeNull();
    }
  });
});

describe('particleMath cap allocation', () => {
  it('sums match emitter caps within the global ceiling', () => {
    expect(totalCaps(MATCH_CAPS)).toBeLessThanOrEqual(MAX_LIVE_PARTICLES);
  });

  it('sums grounds emitter caps within the global ceiling', () => {
    expect(totalCaps(GROUNDS_CAPS)).toBeLessThanOrEqual(MAX_LIVE_PARTICLES);
  });

  it('has every per-emitter cap positive', () => {
    for (const cap of [...Object.values(MATCH_CAPS), ...Object.values(GROUNDS_CAPS)]) {
      expect(cap).toBeGreaterThan(0);
    }
  });

  it('totalCaps adds the values of a caps table', () => {
    expect(totalCaps({ a: 10, b: 5, c: 1 })).toBe(16);
    expect(totalCaps({})).toBe(0);
  });
});
