import { describe, it, expect } from 'vitest';
import { drawRingPixels, RING_SCALE } from '../../../src/match/view/ringTexture';
import { RING_EDGE } from '../../../src/match/view/rings';

const paint = { color: 0xc03030, width: 1.5, alpha: 0.9, fillAlpha: 0.28 };
const alphaAt = (b: ReturnType<typeof drawRingPixels>, x: number, y: number): number => b.data[(y * b.w + x) * 4 + 3]!;
const rgbAt = (b: ReturnType<typeof drawRingPixels>, x: number, y: number): number => b.get(x, y).color;

describe('drawRingPixels', () => {
  it('is even-sized and big enough for the ring and its line', () => {
    const b = drawRingPixels('solid', 15, 7.5, paint);
    expect(b.w % 2).toBe(0);
    expect(b.h % 2).toBe(0);
    expect(b.w).toBeGreaterThanOrEqual(15 * RING_SCALE);
    expect(b.h).toBeGreaterThanOrEqual(7.5 * RING_SCALE);
  });

  it('fills the middle faintly and strokes the rim at the line alpha', () => {
    const b = drawRingPixels('solid', 15, 7.5, paint);
    const cx = b.w / 2; const cy = b.h / 2;
    expect(alphaAt(b, cx, cy)).toBe(Math.round(0.28 * 255));
    // The right-hand end of the ellipse: the line's alpha composited over the fill under it.
    expect(alphaAt(b, Math.round(cx + (15 / 2) * RING_SCALE), cy)).toBeGreaterThan(Math.round(0.9 * 255) - 2);
    expect(rgbAt(b, cx, cy)).toBe(paint.color);
    // Outside the ring's line: nothing.
    expect(alphaAt(b, 0, 0)).toBe(0);
  });

  it('is symmetric left to right and top to bottom', () => {
    const b = drawRingPixels('solid', 15, 7.5, paint);
    for (const [x, y] of [[10, 20], [40, 30], [5, 33]] as const) {
      expect(alphaAt(b, b.w - 1 - x, y)).toBe(alphaAt(b, x, y));
      expect(alphaAt(b, x, b.h - 1 - y)).toBe(alphaAt(b, x, y));
    }
  });

  it('breaks a dashed ring into dashes with gaps, over a dark edge', () => {
    const b = drawRingPixels('dashed', 15, 7.5, { color: 0x40a0ff, width: 1.5, alpha: 0.9, fillAlpha: 0.1 });
    const cx = b.w / 2; const cy = b.h / 2;
    // Walk the rim: some stops are on a dash, some in a gap (only the faint fill is there).
    let dashed = 0; let gap = 0;
    for (let i = 0; i < 360; i += 3) {
      const t = (i * Math.PI) / 180;
      const a = alphaAt(b, Math.round(cx + (15 / 2) * RING_SCALE * Math.cos(t)), Math.round(cy + (7.5 / 2) * RING_SCALE * Math.sin(t)));
      if (a > 150) dashed++; else gap++;
    }
    expect(dashed).toBeGreaterThan(30);
    expect(gap).toBeGreaterThan(20);
    // A dash is (nearly) the side's colour in its middle and the dark edge at its side.
    const near = (c: number, want: number): boolean => [16, 8, 0].every((sh) => Math.abs(((c >> sh) & 0xff) - ((want >> sh) & 0xff)) <= 40);
    let edge = 0; let side = 0;
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (alphaAt(b, x, y) < 150) continue;
      if (near(rgbAt(b, x, y), RING_EDGE)) edge++;
      if (near(rgbAt(b, x, y), 0x40a0ff)) side++;
    }
    expect(edge).toBeGreaterThan(20);
    expect(side).toBeGreaterThan(20);
  });
});
