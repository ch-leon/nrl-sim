import { describe, it, expect } from 'vitest';
import { makeRng } from '../../src/utils/rng';

describe('makeRng — determinism', () => {
  it('same seed produces identical next() sequence', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds diverge', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('seed is normalised via >>> 0 (negative seed equals its uint32)', () => {
    const a = makeRng(-1);
    const b = makeRng(0xffffffff);
    expect(a.next()).toBe(b.next());
  });
});

describe('rng.next range', () => {
  it('always returns a float in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rng.int', () => {
  it('is inclusive at both ends', () => {
    const rng = makeRng(123);
    let sawMin = false;
    let sawMax = false;
    for (let i = 0; i < 5000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      if (v === 1) sawMin = true;
      if (v === 6) sawMax = true;
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it('handles a single-value range', () => {
    const rng = makeRng(9);
    for (let i = 0; i < 20; i++) expect(rng.int(5, 5)).toBe(5);
  });
});

describe('rng.pick', () => {
  it('returns an element of the array', () => {
    const rng = makeRng(3);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(arr).toContain(rng.pick(arr));
  });

  it('does not mutate the input', () => {
    const rng = makeRng(3);
    const arr = ['a', 'b', 'c'];
    const copy = arr.slice();
    rng.pick(arr);
    expect(arr).toEqual(copy);
  });

  it('throws on empty array', () => {
    const rng = makeRng(3);
    expect(() => rng.pick([])).toThrow();
  });
});

describe('rng.shuffle', () => {
  it('returns a new array with the same elements', () => {
    const rng = makeRng(11);
    const arr = [1, 2, 3, 4, 5];
    const out = rng.shuffle(arr);
    expect(out).not.toBe(arr);
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the input', () => {
    const rng = makeRng(11);
    const arr = [1, 2, 3, 4, 5];
    const copy = arr.slice();
    rng.shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('is deterministic for a given seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(makeRng(99).shuffle(arr)).toEqual(makeRng(99).shuffle(arr));
  });
});

describe('rng.state', () => {
  it('returns a uint32 that advances with next()', () => {
    const rng = makeRng(5);
    const s0 = rng.state();
    rng.next();
    const s1 = rng.state();
    expect(s0).toBeGreaterThanOrEqual(0);
    expect(s1).not.toBe(s0);
    expect(s1).toBe(s1 >>> 0);
  });
});
