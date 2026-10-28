// src/match/league/bench.ts — interchanges (BAK-207 §5.1 2b, #70; BAK-208 §8.2).
// Nines has unlimited interchanges. Each side carries a bench of up to four; at
// a stoppage (after a try, and at half-time) the coach's rotation policy takes
// off the most tired men for fresher ones. A benched player gets his legs back
// slowly, never all the way to fresh within a match. The coach's Fresh legs
// call (#367) makes one more swap, its pick here too. Pure: live.ts keeps the
// bench and calls these.
import type { Position } from '../../core/state';

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

/** Fresh legs (#367): a man coming on covers his own group first. */
export type PositionGroup = 'forward' | 'half' | 'back';
export const POSITION_GROUP: Readonly<Record<Position, PositionGroup>> = {
  hooker: 'forward',
  prop: 'forward',
  'second-row': 'forward',
  lock: 'forward',
  'five-eighth': 'half',
  halfback: 'half',
  fullback: 'back',
  winger: 'back',
  centre: 'back',
};

/**
 * Fresh legs (#367): the most tired man with legs under `offBelow` (ties by slot)
 * for the freshest uninjured bench man with at least `onAtLeast`, from his position
 * group first (ties by bench index). Slots and bench indexes in `taken` are skipped.
 * Null when nobody is tired or nobody on the bench is fresh.
 */
export function pickFreshLegs(
  field: readonly { slot: number; energy: number; position: Position }[],
  bench: readonly { energy: number; injured?: boolean; position?: Position }[],
  offBelow: number,
  onAtLeast: number,
  taken: { slots?: ReadonlySet<number>; bench?: ReadonlySet<number> } = {},
): { slot: number; bench: number } | null {
  let off: (typeof field)[number] | null = null;
  for (const p of field) {
    if (p.energy >= offBelow || taken.slots?.has(p.slot)) continue;
    if (!off || p.energy < off.energy || (p.energy === off.energy && p.slot < off.slot)) off = p;
  }
  if (!off) return null;
  const group = POSITION_GROUP[off.position];
  let best = -1;
  let bestSame = false;
  bench.forEach((b, i) => {
    if (b.injured || b.energy < onAtLeast || taken.bench?.has(i)) return;
    const same = b.position !== undefined && POSITION_GROUP[b.position] === group;
    if (best < 0 || (same && !bestSame) || (same === bestSame && b.energy > bench[best]!.energy)) {
      best = i;
      bestSame = same;
    }
  });
  return best < 0 ? null : { slot: off.slot, bench: best };
}
