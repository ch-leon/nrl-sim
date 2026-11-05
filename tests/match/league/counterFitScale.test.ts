import { describe, expect, it } from 'vitest';
import { compressedCommitReach, compressedCounter, rushCounter, slideCounter } from '../../../src/match/league/counters';
import { applyTuning } from '../../../src/match/league/tuning';

describe('counter calibration for unequal fits (#465)', () => {
  it('keeps neutral cells and unrelated styles fixed while strengthening the unequal-fit contact cells', () => {
    const off = applyTuning({ 'counters.slide.expansiveFit': 0, 'counters.compressed.tightFit': 0 });
    try {
      const cells = [
        (a: number, d: number) => slideCounter('expansive', 'slide', a, d),
        (a: number, d: number) => compressedCounter('grind', 'compressed', a, d),
      ];
      const neutral = cells.map((c) => c(1, 1));
      const unequal = cells.map((c) => c(0.5, 1.5));
      const kick = slideCounter('kick-chase', 'slide', 1.5, 0.5);
      const rush = rushCounter('kick-chase', 'rush', 1.5, 0.5);
      const on = applyTuning({ 'counters.slide.expansiveFit': 1, 'counters.compressed.tightFit': 1 });
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
  it('can strengthen all eight unequal-fit counters while preserving every neutral cell and own-fit gate', () => {
    const restore = applyTuning({ 'counters.fit.on': 1, 'counters.fit.counterResponse': 0 });
    try {
      const cells = [
        (a: number, d: number) => slideCounter('grind', 'slide', a, d),
        (a: number, d: number) => slideCounter('expansive', 'slide', a, d),
        (a: number, d: number) => slideCounter('kick-chase', 'slide', a, d),
        (a: number, d: number) => slideCounter('all-out', 'slide', a, d),
        (a: number, d: number) => rushCounter('kick-chase', 'rush', a, d),
        (a: number, d: number) => rushCounter('all-out', 'rush', a, d),
        (a: number, d: number) => compressedCounter('grind', 'compressed', a, d),
        (a: number, d: number) => compressedCounter('expansive', 'compressed', a, d),
      ];
      const neutral = cells.map((cell) => cell(1, 1));
      const unequal = cells.map((cell) => cell(.5, 1.5));
      const on = applyTuning({ 'counters.fit.counterResponse': .5 });
      try {
        expect(cells.map((cell) => cell(1, 1))).toEqual(neutral);
        cells.forEach((cell, i) => {
          expect(cell(.5, 1.5)).toBeGreaterThan(unequal[i]!);
          expect(cell(.5, 1.5)).toBe(cell(1.5, .5));
          expect(cell(0, 1.5)).toBe(0);
        });
        const off = applyTuning({ 'counters.fit.on': 0 });
        try { expect(cells.map((cell) => cell(.5, 1.5))).toEqual(unequal); }
        finally { off(); }
      } finally { on(); }
    } finally { restore(); }
  });

  it('extends existing middle help only for a Compressed fit advantage, preserving neutral and strong-pack reach', () => {
    const restore = applyTuning({ 'counters.compressed.on': 1, 'counters.compressed.commitM': 10, 'counters.compressed.commitFit': 1.5 });
    try {
      expect(compressedCommitReach(1, 1)).toBe(10);
      expect(compressedCommitReach(1.25, 1)).toBe(12.5);
      expect(compressedCommitReach(.5, 1.5)).toBe(18.75);
      expect(compressedCommitReach(1.5, .5)).toBe(7.5);
      expect(compressedCommitReach(0, 1.5)).toBe(0);
      const off = applyTuning({ 'counters.compressed.on': 0 });
      try { expect(compressedCommitReach(.5, 1.5)).toBe(0); }
      finally { off(); }
    } finally { restore(); }
  });

});
