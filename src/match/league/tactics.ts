// src/match/league/tactics.ts — pure positioning decisions (BAK-207 §3.4):
// where the carrier runs, who the dummy-half or carrier passes to, where
// support runners hold their lines, where a kick is aimed. No state; the
// live sim feeds positions in and gets targets out.
import { FIELD_LENGTH, FIELD_WIDTH, MID_Y } from '../core/field';
import { clamp, type Vec } from '../core/vec';

/** The carrier aims this far ahead of himself. */
export const LOOKAHEAD_M = 10;
/** Defenders further ahead than this don't shape the running line. */
const GAP_RANGE_M = 14;
/** Won't run more than this far sideways to find a gap. */
const MAX_DRIFT_M = 10;

/**
 * Where the carrier runs: at the gap between the two defenders nearest his
 * line, or away from a lone defender, else straight ahead.
 */
export function gapTarget(carrier: Vec, dir: 1 | -1, defenders: readonly Vec[]): Vec {
  const ahead = defenders
    .filter((d) => {
      const dx = (d.x - carrier.x) * dir;
      return dx > 0.5 && dx < GAP_RANGE_M;
    })
    .sort((a, b) => Math.abs(a.y - carrier.y) - Math.abs(b.y - carrier.y));
  let y = carrier.y;
  const a = ahead[0];
  const b = ahead[1];
  if (a && b) y = (a.y + b.y) / 2;
  else if (a) y = carrier.y + (carrier.y >= a.y ? 1 : -1) * 4;
  y = clamp(y, carrier.y - MAX_DRIFT_M, carrier.y + MAX_DRIFT_M);
  return { x: carrier.x + dir * LOOKAHEAD_M, y: clamp(y, 1.5, FIELD_WIDTH - 1.5) };
}

export interface Candidate {
  idx: number;
  pos: Vec;
  /** Can't take a pass right now (getting up, locked in a tackle). */
  busy: boolean;
}

/** Best pass option: behind the passer, 2–12 m to the side, not too deep. */
export function pickReceiver(passer: Vec, dir: 1 | -1, candidates: readonly Candidate[]): number | null {
  let best: number | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (c.busy) continue;
    const depth = (passer.x - c.pos.x) * dir;
    const lat = Math.abs(c.pos.y - passer.y);
    if (depth < 0.3 || depth > 8 || lat < 2 || lat > 12) continue;
    // Flat and wide beats deep: a deep receiver gives ground back.
    const score = -Math.abs(lat - 6) - 0.7 * depth;
    if (score > bestScore) {
      bestScore = score;
      best = c.idx;
    }
  }
  return best;
}

/** The two support lines: either side of the carrier, a little behind. */
export function supportSpots(carrier: Vec, dir: 1 | -1): [Vec, Vec] {
  const x = carrier.x - dir * 3;
  return [
    { x, y: clamp(carrier.y - 6, 1.5, FIELD_WIDTH - 1.5) },
    { x, y: clamp(carrier.y + 6, 1.5, FIELD_WIDTH - 1.5) },
  ];
}

/**
 * Where a defender running at `speed` should aim to meet a carrier at `pos`
 * moving with `vel`: the point on the carrier's line he reaches at the same
 * time (closed-form intercept). With no solution (the carrier is faster and
 * pulling away) he aims as far ahead as `maxT` seconds allow, which still
 * cuts the angle instead of trailing.
 */
export function intercept(from: Vec, speed: number, pos: Vec, vel: Vec, maxT = 1.5): Vec {
  const rx = pos.x - from.x;
  const ry = pos.y - from.y;
  const a = vel.x * vel.x + vel.y * vel.y - speed * speed;
  const b = 2 * (rx * vel.x + ry * vel.y);
  const c = rx * rx + ry * ry;
  let t = maxT;
  if (Math.abs(a) < 1e-6) {
    // Same speed: a finite intercept only exists while closing (b < 0).
    if (b < -1e-6) t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      const t1 = (-b - r) / (2 * a);
      const t2 = (-b + r) / (2 * a);
      const best = Math.min(...[t1, t2].filter((v) => v > 1e-6));
      if (Number.isFinite(best)) t = best;
    }
  }
  t = clamp(t, 0, maxT);
  return { x: pos.x + vel.x * t, y: pos.y + vel.y * t };
}

/** Last-tackle kick: long, down the middle-ish toward the fullback, never dead. */
export function kickTarget(kicker: Vec, dir: 1 | -1, fullback: Vec, jitter01: number): Vec {
  const goal = dir > 0 ? FIELD_LENGTH : 0;
  const x = clamp(kicker.x + dir * 32, Math.min(goal - 4, kicker.x + dir * 8), Math.max(goal - 4, kicker.x + dir * 8));
  const y = clamp(fullback.y * 0.6 + MID_Y * 0.4 + (jitter01 - 0.5) * 16, 6, FIELD_WIDTH - 6);
  return { x: dir > 0 ? Math.min(x, goal - 4) : Math.max(x, goal + 4), y };
}

/** Kick-off: into the receiving side's quarter. */
export function kickoffTarget(receivingDir: 1 | -1, jitter01: number): Vec {
  // The receiving side attacks in receivingDir, so its own quarter is behind halfway.
  const x = receivingDir > 0 ? 24 : FIELD_LENGTH - 24;
  return { x, y: clamp(MID_Y + (jitter01 - 0.5) * 24, 8, FIELD_WIDTH - 8) };
}
