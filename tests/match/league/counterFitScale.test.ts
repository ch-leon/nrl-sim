import { describe, expect, it } from 'vitest';
import { compressedCounter, rushCounter, slideCounter } from '../../../src/match/league/counters';
import { applyTuning } from '../../../src/match/league/tuning';

describe('counter calibration for unequal fits (#465)', () => {
  it('keeps neutral cells and unrelated styles fixed while strengthening the three unequal-fit cells', () => {
    const off = applyTuning({ 'counters.slide.expansiveFit': 0, 'counters.slide.allOutFit': 0, 'counters.compressed.tightFit': 0 });
    try {
      const cells = [
        (a: number, d: number) => slideCounter('expansive', 'slide', a, d),
        (a: number, d: number) => slideCounter('all-out', 'slide', a, d),
        (a: number, d: number) => compressedCounter('grind', 'compressed', a, d),
      ];
      const neutral = cells.map((c) => c(1, 1));
      const unequal = cells.map((c) => c(0.5, 1.5));
      const kick = slideCounter('kick-chase', 'slide', 1.5, 0.5);
      const rush = rushCounter('kick-chase', 'rush', 1.5, 0.5);
      const on = applyTuning({ 'counters.slide.expansiveFit': 1, 'counters.slide.allOutFit': 1, 'counters.compressed.tightFit': 1 });
      try {
        expect(cells.map((c) => c(1, 1))).toEqual(neutral);
        for (const [i, cell] of cells.entries()) {
          expect(cell(0.5, 1.5)).toBeGreaterThan(unequal[i]!);
          expect(cell(1.5, 0.5)).toBe(cell(0.5, 1.5));
          expect(cell(0, 1.5)).toBe(0);
        }
        expect(slideCounter('balanced', 'slide', 1.5, 0.5)).toBe(0);
        expect(slideCounter('kick-chase', 'slide', 1.5, 0.5)).toBe(kick);
        expect(rushCounter('kick-chase', 'rush', 1.5, 0.5)).toBe(rush);
      } finally { on(); }
    } finally { off(); }
  });
});
