// src/match/view/tryMob.ts — after a try (#668) the scorer's nearest team-mates are drawn
// gathering round him to cheer, each on his own (no hugs or chest-bumps: match-big-moments.md),
// and eased back before the conversion. Where they are drawn only: the sim's positions are
// untouched, as with the contact layout. A pure function of one snapshot, so pause, seek and
// replay agree; the view interpolates two of them like any position.
import type { PlayerSnap, Side, Snapshot } from '../core/snapshot';

/** Ticks to gather (about a second at ×1), the hold, and the ease back; all back by MOB_BACK, before the try phase ends (LIVE.tryTicks) and the conversion's positions take over. */
export const MOB_IN = 18;
export const MOB_HOLD = 28;
export const MOB_BACK = 48;
/** Metres from the scorer they gather at. */
const RING_M = 2.6;
/** A mate is drawn at most this far (m) from where the sim has him: no streaking after a man who has run off. */
const MOB_MAX_M = 6;
/** Mates within MOB_NEAR_M of the scorer join; the pull fades out by MOB_FAR_M (continuous, so nobody pops). */
const MOB_NEAR_M = 10;
const MOB_FAR_M = 14;
/** At most this many: the fifth-nearest's distance fades the fourth out as they meet. */
const MOB_COUNT = 4;

export interface MobOffset { side: Side; slot: number; dx: number; dy: number }
export interface TryScene {
  /** The scoring side and ticks since the try. */
  side: Side;
  age: number;
  scorer: PlayerSnap;
  /** Field-metre offsets for the mates drawn gathered round him (zero for everyone else). */
  offsets: MobOffset[];
}

const smooth = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

/** How far into the gather a try `age` ticks old is: 0 → 1 → 0, and 0 well before the conversion. */
export function mobWeight(age: number): number {
  if (age < 0 || age >= MOB_BACK) return 0;
  if (age < MOB_IN) return smooth(age / MOB_IN);
  if (age < MOB_HOLD) return 1;
  return 1 - smooth((age - MOB_HOLD) / (MOB_BACK - MOB_HOLD));
}

export function tryScene(s: Snapshot): TryScene | null {
  const scorer = s.players.find(p => p.tryTick !== undefined);
  if (!scorer || scorer.tryTick === undefined) return null;
  const age = s.tick - scorer.tryTick;
  const w = mobWeight(age);
  const mates = s.players.filter(p => p.side === scorer.side && p !== scorer && !p.binned)
    .map(p => ({ p, d: Math.hypot(p.x - scorer.x, p.y - scorer.y) }))
    .sort((a, b) => a.d - b.d || a.p.slot - b.p.slot);
  const cut = mates[MOB_COUNT]?.d ?? Infinity;
  const offsets: MobOffset[] = [];
  for (const { p, d } of mates.slice(0, MOB_COUNT)) {
    const near = 1 - smooth((d - MOB_NEAR_M) / (MOB_FAR_M - MOB_NEAR_M));
    const k = w * near * Math.min(1, (cut - d) / 2);
    if (k <= 0) continue;
    // Each comes in from his own side of the scorer and stops a stride short of him.
    const ux = d > .01 ? (p.x - scorer.x) / d : 1; const uy = d > .01 ? (p.y - scorer.y) / d : 0;
    let dx = scorer.x + ux * RING_M - p.x; let dy = scorer.y + uy * RING_M - p.y;
    const len = Math.hypot(dx, dy);
    if (len > MOB_MAX_M) { dx *= MOB_MAX_M / len; dy *= MOB_MAX_M / len; }
    offsets.push({ side: p.side, slot: p.slot, dx: dx * k, dy: dy * k });
  }
  return { side: scorer.side, age, scorer, offsets };
}
