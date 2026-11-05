import { describe, expect, it } from 'vitest';
import { shardCases } from '../../src/qa/shard';
import type { SoakOptions } from '../../src/qa/soak';

describe('soak case shards', () => {
  const cases: readonly SoakOptions[] = Object.freeze([
    ...Array.from({ length: 20 }, (_, seed) => (['easy', 'normal', 'hard'] as const).flatMap((difficulty) =>
      (['idle', 'managed'] as const).map((mode) => Object.freeze({ seed: (seed + 1) * 7919, seasons: 5, mode, difficulty })))).flat(),
    ...Array.from({ length: 20 }, (_, i) => Object.freeze({ seed: 4243 + i, seasons: 2, mode: 'managed' as const, fromVersion: i + 1 })),
  ]);

  it('leaves the default complete case set and its inputs unchanged', () => {
    const result = shardCases(cases);
    expect(result).toEqual(cases);
    expect(result.every((entry, i) => entry === cases[i])).toBe(true);
  });
  it('covers all 120 fresh and 20 migrated cases exactly once across seven runners', () => {
    const parts = Array.from({ length: 7 }, (_, i) => shardCases(cases, `${i + 1}/7`));
    expect(parts.every((part) => part.length === 20)).toBe(true);
    const pooled = parts.flat();
    expect(pooled).toHaveLength(140);
    expect(new Set(pooled).size).toBe(140);
    expect(pooled.filter((entry) => entry.fromVersion === undefined)).toHaveLength(120);
    expect(pooled.flatMap((entry) => entry.fromVersion === undefined ? [] : [entry.fromVersion]).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(cases.every((entry) => pooled.includes(entry))).toBe(true);
    expect(parts[0]!.slice(0, 3)).toEqual([cases[0], cases[7], cases[14]]);
    for (const part of parts) {
      const indices = part.map((entry) => cases.indexOf(entry));
      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    }
  });
  it.each(['0/7', '8/7', '1/0', '1/141', '1.5/7', 'bad', ''])('rejects invalid shard %s', (shard) => {
    expect(() => shardCases(cases, shard)).toThrow('--shard');
  });
});
