// src/utils/rng.ts — deterministic seeded RNG (mulberry32). See ARCHITECTURE §1.5.
// All sim/system randomness MUST route through this. Pure TypeScript, no Phaser.

export interface Rng {
  /** Float in [0, 1). Mutates internal state. */
  next(): number;
  /** Integer in [min, max], inclusive at both ends. */
  int(min: number, max: number): number;
  /** Uniformly pick an element; throws on empty array. Does not mutate input. */
  pick<T>(arr: readonly T[]): T;
  /** Fisher–Yates shuffle returning a NEW array; input is not mutated. */
  shuffle<T>(arr: readonly T[]): T[];
  /** Current 32-bit state, for persisting into GameState.rngSeed. */
  state(): number;
}

/**
 * Seed mulberry32 with `seed >>> 0`. Two `makeRng(n)` instances with the same
 * seed produce identical sequences — the core determinism invariant.
 */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number =>
    min + Math.floor(next() * (max - min + 1));

  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('rng.pick: cannot pick from an empty array');
    return arr[int(0, arr.length - 1)] as T;
  };

  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  };

  const state = (): number => s >>> 0;

  return { next, int, pick, shuffle, state };
}
