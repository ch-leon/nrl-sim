import { describe, expect, it } from 'vitest';
import { resolveMatchPreview, PreviewWatchClock } from '../../src/match/preview';
import { fromFieldPt, toFieldPt } from '../../src/match/core/field';

describe('unmerged match preview', () => {
  it('retains normal rules without an explicit preview build', () => {
    expect(resolveMatchPreview(undefined)).toBeNull();
    expect(resolveMatchPreview('')).toBeNull();
    const p = { x: 31.123456789, y: 34 };
    expect(toFieldPt(p, 100).fx).toBe(p.x);
  });
  for (const length of [100, 80, 60] as const) {
    it(`selects a labelled ${length}m, 2:30-half build and maps physical metres round-trip`, () => {
      expect(resolveMatchPreview(String(length))).toEqual({ fieldLength: length, halfMinutes: 2.5 });
      for (const x of [-10, 0, length / 2, length, length + 10]) {
        const field = toFieldPt({ x, y: 34 }, length);
        expect(field.fx).toBeCloseTo(x / length * 100);
        expect(fromFieldPt(field, length).x).toBeCloseTo(x);
        expect(field.fy).toBe(50);
      }
      expect(toFieldPt({ x: length / 2, y: 34 }, length)).toEqual({ fx: 50, fy: 50 });
    });
  }
  it('rejects unsupported or ambiguous build settings', () => {
    for (const raw of ['0', '50', '70', '120', '80m', 'NaN']) expect(() => resolveMatchPreview(raw)).toThrow();
  });
});


describe('preview viewing clock', () => {
  it('counts actual viewing separately for each half, excluding pause and half-time', () => {
    const clock = new PreviewWatchClock();
    clock.advance(1500, 1, 1, 'play', true);
    clock.advance(900, 1, 1, 'play', false);
    clock.advance(3000, 1, 1, 'half-time', true);
    clock.advance(2500, 2, 1, 'ruck', true);
    expect(clock.milliseconds).toEqual([1500, 2500]);
    expect(clock.clean).toBe(true);
    clock.advance(200, 2, 2, 'play', true);
    expect(clock.clean).toBe(false);
    clock.reset();
    expect(clock.milliseconds).toEqual([0, 0]);
    expect(clock.clean).toBe(true);
    clock.invalidate();
    expect(clock.clean).toBe(false);
  });
});
