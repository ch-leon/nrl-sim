// src/match/league/bench.ts — interchanges (BAK-207 §5.1 2b, #70; BAK-208 §8.2).
// Nines has unlimited interchanges. Each side carries a bench of up to four; at
// a stoppage (after a try, and at half-time) the coach's rotation policy takes
// off the most tired men for fresher ones. A benched player gets his legs back
// slowly, never all the way to fresh within a match. Pure: live.ts keeps the
// bench and calls these.

/** How hard a coach rotates. Off: the starters play the whole match. */
export type Rotation = 'off' | 'standard' | 'heavy';
export const ROTATIONS: readonly Rotation[] = ['off', 'standard', 'heavy'];
export const isRotation = (s: unknown): s is Rotation => ROTATIONS.includes(s as Rotation);

export interface RotationPolicy {
  /** Take a man off when his legs are under this. */
  offBelow: number;
  /** …for a bench man with at least this much more legs. */
  gain: number;
  /** At most this many swaps per side at one stoppage. */
  perStoppage: number;
}

/** The interchange knobs (tuning reference §14). Overridable by name in balance experiments (tuning.ts). */
export const BENCH = {
  /** Players on the bench (sheets carry up to this many). */
  size: 4,
  /**
   * A benched player's legs come back this much a minute…
   * Was 0.05, which reaches the 0.9 cap across an 18-minute match.
   * ×9/7 keeps that on a 14-minute match (0.05 × 18 = 0.05 × 9/7 × 14).
   */
  recoverPerMin: 0.05 * (9 / 7),
  /** …up to here, never all the way to fresh within a match. */
  recoverCap: 0.9,
  /** A man coming off gets this long to reach the touchline before the swap is made where he stands (seconds). */
  jogOffS: 12,
  standard: { offBelow: 0.55, gain: 0.15, perStoppage: 2 } as RotationPolicy,
  heavy: { offBelow: 0.7, gain: 0.1, perStoppage: 3 } as RotationPolicy,
};

export const DEFAULT_ROTATION: Rotation = 'standard';

/** A benched player's legs after `dt` seconds of rest: up to the cap, never down (a fresh reserve stays fresh). */
export function benchRecover(energy: number, dt: number): number {
  if (energy >= BENCH.recoverCap) return energy;
  return Math.min(BENCH.recoverCap, energy + (BENCH.recoverPerMin * dt) / 60);
}

/**
 * Who comes off for whom at a stoppage: the most tired men under the policy's
 * line, each for the freshest bench man who is fresher by at least `gain`.
 * Returns field slots paired with bench indexes, most tired first.
 */
export function pickSwaps(
  field: readonly { slot: number; energy: number }[],
  bench: readonly { energy: number }[],
  rotation: Rotation,
): { slot: number; bench: number }[] {
  if (rotation === 'off' || bench.length === 0) return [];
  const policy = BENCH[rotation];
  const tired = field.filter((p) => p.energy < policy.offBelow).sort((a, b) => a.energy - b.energy || a.slot - b.slot);
  const free = bench.map((b, i) => ({ i, energy: b.energy })).sort((a, b) => b.energy - a.energy || a.i - b.i);
  const out: { slot: number; bench: number }[] = [];
  for (const p of tired) {
    if (out.length >= policy.perStoppage) break;
    const k = free.findIndex((b) => b.energy >= p.energy + policy.gain);
    if (k < 0) break; // the freshest left isn't fresh enough for anyone more tired either
    out.push({ slot: p.slot, bench: free[k]!.i });
    free.splice(k, 1);
  }
  return out;
}
