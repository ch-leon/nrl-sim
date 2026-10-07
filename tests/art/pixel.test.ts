import { describe, it, expect } from 'vitest';
import { PixelBuffer, fromGrid, shade, mix, hexToInt, noise2, bayer, isoDiamond } from '../../src/art/pixel';

describe('PixelBuffer', () => {
  it('set/get round-trips colour and ignores out-of-bounds writes', () => {
    const b = new PixelBuffer(4, 4);
    b.set(1, 2, 0x123456);
    b.set(-1, 0, 0xffffff);
    b.set(4, 4, 0xffffff);
    expect(b.get(1, 2)).toEqual({ color: 0x123456, alpha: 255 });
    expect(b.opaqueCount()).toBe(1);
  });

  it('fillPoly fills a diamond symmetric about its centre', () => {
    const b = new PixelBuffer(16, 8);
    b.fillPoly([{ x: 8, y: 0 }, { x: 16, y: 4 }, { x: 8, y: 8 }, { x: 0, y: 4 }], 0xff0000);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(b.get(x, y).alpha).toBe(b.get(15 - x, y).alpha);
      }
    }
    expect(b.get(8, 4).alpha).toBe(255);
    expect(b.get(0, 0).alpha).toBe(0);
  });

  it('sprite maps palette chars, treats . as transparent, and can flip', () => {
    const b = fromGrid(['ab.', '..b'], { a: 0x111111, b: 0x222222 });
    expect(b.w).toBe(3);
    expect(b.get(0, 0).color).toBe(0x111111);
    expect(b.get(2, 0).alpha).toBe(0);
    const f = fromGrid(['ab.'], { a: 0x111111, b: 0x222222 }, true);
    expect(f.get(2, 0).color).toBe(0x111111);
  });

  it('outline adds edge pixels only around opaque pixels', () => {
    const b = new PixelBuffer(5, 5);
    b.set(2, 2, 0xffffff);
    b.outline(0x000000);
    expect(b.opaqueCount()).toBe(5);
    expect(b.get(2, 1).color).toBe(0x000000);
    expect(b.get(1, 1).alpha).toBe(0);
  });

  it('line covers both endpoints', () => {
    const b = new PixelBuffer(10, 10);
    b.line(1, 1, 8, 5, 0xabcdef);
    expect(b.get(1, 1).alpha).toBe(255);
    expect(b.get(8, 5).alpha).toBe(255);
  });
});

describe('colour + noise helpers', () => {
  it('shade/mix/hexToInt behave', () => {
    expect(shade(0x808080, 0.5)).toBe(0x404040);
    expect(shade(0xf0f0f0, 2)).toBe(0xffffff);
    expect(mix(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(hexToInt('#0af')).toBe(0x00aaff);
    expect(hexToInt('nope')).toBe(0xffffff);
  });

  it('noise2 is deterministic and in [0,1)', () => {
    for (let i = 0; i < 100; i++) {
      const v = noise2(i, i * 3, 7);
      expect(v).toBe(noise2(i, i * 3, 7));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(noise2(1, 2, 3)).not.toBe(noise2(2, 1, 3));
  });

  it('bayer thresholds cover 16 distinct levels', () => {
    const s = new Set<number>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) s.add(bayer(x, y));
    expect(s.size).toBe(16);
  });

  it('isoDiamond matches the 2:1 projection for a footprint', () => {
    const d = isoDiamond(64, 0, 2, 1, 64, 32);
    expect(d.right).toEqual({ x: 128, y: 32 });
    expect(d.left).toEqual({ x: 32, y: 16 });
    expect(d.bottom).toEqual({ x: 96, y: 48 });
  });
});
