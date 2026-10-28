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
  /** Role preference added to the score (halves as first receiver, forwards for hit-ups). */
  prefer?: number;
}

/** A pass wider than this is a cut-out ball (only a Playmaker throws one). */
export const MAX_LAT_M = 12;

/**
 * Best pass option: behind the passer, 2–`maxLat` m to the side, not too deep.
 * `widthBias` (0..1) softens the preference for the 6 m pass, so a Playmaker
 * happily finds the wider man.
 */
export function pickReceiver(passer: Vec, dir: 1 | -1, candidates: readonly Candidate[], maxLat = MAX_LAT_M, widthBias = 0): number | null {
  let best: number | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    if (c.busy) continue;
    const depth = (passer.x - c.pos.x) * dir;
    const lat = Math.abs(c.pos.y - passer.y);
    if (depth < 0.3 || depth > 8 || lat < 2 || lat > maxLat) continue;
    // Flat and wide beats deep: a deep receiver gives ground back.
    const score = -Math.abs(lat - 6) * (1 - widthBias) - 0.7 * depth + (c.prefer ?? 0);
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

/**
 * Last-tackle kick: long, down the middle-ish toward the fullback, never dead.
 * `boot` scales the distance and shrinks the scatter (Big Boot, §3).
 */
export function kickTarget(kicker: Vec, dir: 1 | -1, fullback: Vec, jitter01: number, boot = { dist: 1, acc: 1 }): Vec {
  const goal = dir > 0 ? FIELD_LENGTH : 0;
  const x = clamp(kicker.x + dir * 32 * boot.dist, Math.min(goal - 4, kicker.x + dir * 8), Math.max(goal - 4, kicker.x + dir * 8));
  const y = clamp(fullback.y * 0.6 + MID_Y * 0.4 + (jitter01 - 0.5) * 16 * boot.acc, 6, FIELD_WIDTH - 6);
  return { x: dir > 0 ? Math.min(x, goal - 4) : Math.max(x, goal + 4), y };
}

// ── Attacking kicks (BAK-208 §4.4, first slice) ──────────────────────────────

export type KickChoice = 'long' | 'bomb' | 'grubber' | 'chip' | 'cross-field';

/** Inside this many metres of the line the last tackle is run, never kicked. */
export const RUN_CLOSE_M = 6;
/** Inside this, this often the kicker runs the last instead of kicking. */
export const RUN_IT_ZONE_M = 40;
export const RUN_IT_CHANCE = 0.2;
/** Beyond this the last-tackle kick is for territory. */
export const ATTACK_KICK_M = 50;

const KICK_ORDER: readonly KickChoice[] = ['long', 'bomb', 'cross-field', 'grubber', 'chip'];

/** Weights of each kick on the last tackle, by distance to the line (BAK-208 §4.4). */
export function kickWeights(toLine: number): Record<KickChoice, number> {
  if (toLine > ATTACK_KICK_M) return { long: 0.85, bomb: 0.15, 'cross-field': 0, grubber: 0, chip: 0 };
  if (toLine > RUN_IT_ZONE_M) return { long: 0.2, bomb: 0.5, 'cross-field': 0.3, grubber: 0, chip: 0 };
  if (toLine > 22) return { long: 0, bomb: 0.3, 'cross-field': 0.35, grubber: 0.2, chip: 0.15 };
  return { long: 0, bomb: 0, 'cross-field': 0.3, grubber: 0.5, chip: 0.2 };
}

/**
 * Which kick on the last tackle: territory (with the odd bomb) from deep;
 * around halfway a bomb or a cross-field kick; inside 40 m an attacking kick,
 * a grubber the closer he gets. A team's style scales the weights (`bias`).
 * Pure: `roll` is one draw in [0, 1).
 */
export function chooseKick(toLine: number, roll: number, bias: Partial<Record<KickChoice, number>> = {}): KickChoice {
  const w = kickWeights(toLine);
  let total = 0;
  for (const k of KICK_ORDER) total += w[k] * (bias[k] ?? 1);
  let r = roll * total;
  for (const k of KICK_ORDER) {
    r -= w[k] * (bias[k] ?? 1);
    if (r < 0) return k;
  }
  return 'long';
}

const goalLine = (dir: 1 | -1): number => (dir > 0 ? FIELD_LENGTH : 0);
const towardGoal = (dir: 1 | -1, x: number, limit: number): number => (dir > 0 ? Math.min(x, limit) : Math.max(x, limit));

/**
 * Grubber: stabbed through for the in-goal, a few metres over the line.
 * `chaseY` is the lane the chase is running (a winger); the miss is either side of it.
 */
export function grubberTarget(kicker: Vec, dir: 1 | -1, jitter01: number, chaseY = kicker.y, missM = 12): Vec {
  const goal = goalLine(dir);
  const toLine = dir > 0 ? goal - kicker.x : kicker.x - goal;
  // Close in, through into the in-goal. From further out, short of the line so the chase can stick it.
  const past = toLine <= 16 ? 3 : -8;
  const x = towardGoal(dir, kicker.x + dir * 24, goal + dir * past);
  return { x, y: clamp(chaseY + (jitter01 - 0.5) * missM, 4, FIELD_WIDTH - 4) };
}

/** Chip: just over the rushing line for the kicker to run onto, never past the dead-ball line. */
export function chipTarget(kicker: Vec, dir: 1 | -1, jitter01: number): Vec {
  const goal = goalLine(dir);
  const x = towardGoal(dir, kicker.x + dir * (10 + jitter01 * 3), goal + dir * 2);
  return { x, y: clamp(kicker.y + (jitter01 - 0.5) * 4, 2, FIELD_WIDTH - 2) };
}

/** Cross-field: high to the far winger, landing a couple of metres short of the line (or 28 m out from deep). */
export function crossFieldTarget(kicker: Vec, dir: 1 | -1, winger: Vec, jitter01: number): Vec {
  const goal = goalLine(dir);
  const x = towardGoal(dir, kicker.x + dir * 28, goal - dir * 2);
  return { x, y: clamp(winger.y + (jitter01 - 0.5) * 4, 2, FIELD_WIDTH - 2) };
}

/** Bomb: high and short, onto the fullback's patch, never into the in-goal. */
export function bombTarget(kicker: Vec, dir: 1 | -1, fullback: Vec, jitter01: number): Vec {
  const goal = goalLine(dir);
  const x = towardGoal(dir, kicker.x + dir * (22 + jitter01 * 6), goal - dir * 3);
  return { x, y: clamp(fullback.y * 0.5 + MID_Y * 0.5 + (jitter01 - 0.5) * 10, 5, FIELD_WIDTH - 5) };
}

/**
 * Kick-off: onto the receivers' `lineM` line (metres from their own try line;
 * their quarter unless kickoff.ts says deeper or shorter, #397), ±12 m across.
 */
export function kickoffTarget(receivingDir: 1 | -1, jitter01: number, lineM = 24): Vec {
  // The receiving side attacks in receivingDir, so its own half is behind halfway.
  const x = receivingDir > 0 ? lineM : FIELD_LENGTH - lineM;
  return { x, y: clamp(MID_Y + (jitter01 - 0.5) * 24, 8, FIELD_WIDTH - 8) };
}
