import { describe, it, expect } from 'vitest';
import { CLASH_DISTANCE, colorDistance, kitFromColors, luminance, resolveKits } from '../../../src/art/match/kit';

describe('kitFromColors', () => {
  it('uses colors[0] as jersey and colors[1] as trim, with distinct shades', () => {
    const k = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');
    expect(k.jersey).toBe(0x8e1c1c);
    expect(k.trim).toBe(0xf2c14e);
    expect(k.jerseyShade).not.toBe(k.jersey);
    expect(k.jerseyLight).not.toBe(k.jersey);
    expect(luminance(k.jerseyShade)).toBeLessThan(luminance(k.jersey));
  });

  it('alt strip swaps jersey and trim', () => {
    const k = kitFromColors(['#8e1c1c', '#f2c14e'], 'x', true);
    expect(k.jersey).toBe(0xf2c14e);
    expect(k.trim).toBe(0x8e1c1c);
  });

  it('picks the jersey pattern deterministically from the club id', () => {
    const a = kitFromColors(['#111111', '#eeeeee'], 'rival-gulls').pattern;
    const b = kitFromColors(['#123456', '#abcdef'], 'rival-gulls').pattern;
    expect(a).toBe(b);
    const patterns = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => kitFromColors(['#000', '#fff'], id).pattern));
    expect(patterns.size).toBeGreaterThan(1);
  });

  it('keeps legs readable: shorts differ from a near-black jersey', () => {
    const k = kitFromColors(['#212121', '#ff7043'], 'rival-scorpions');
    expect(colorDistance(k.shorts, k.jersey)).toBeGreaterThan(60);
  });
});

describe('resolveKits', () => {
  it('leaves distinct kits alone', () => {
    const r = resolveKits({ clubId: 'a', colors: ['#f4d03f', '#1a1a2e'] }, { clubId: 'b', colors: ['#0d47a1', '#ffffff'] });
    expect(r.awayAlt).toBe(false);
    expect(r.away.jersey).toBe(0x0d47a1);
  });

  it('switches the away side to its alternate strip on a colour clash', () => {
    const r = resolveKits({ clubId: 'a', colors: ['#01579b', '#4fc3f7'] }, { clubId: 'b', colors: ['#0d47a1', '#ffffff'] });
    expect(r.awayAlt).toBe(true);
    expect(colorDistance(r.home.jersey, r.away.jersey)).toBeGreaterThanOrEqual(CLASH_DISTANCE);
  });
});
