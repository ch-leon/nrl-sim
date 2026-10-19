// src/match/league/goals.ts — kicks at goal (BAK-207 §5.1 2c; BAK-208 §4.4).
// Nines conversions are drop kicks, taken in line with where the try was
// grounded; the kicker steps back to where the posts look widest. Field goals
// are drop kicks in open play. Either goes over when the kick's sideways error
// (wider for a longer kick, narrower for a better kicker) falls inside the
// angle the uprights make from the spot. Pure: live.ts places the kicker,
// rolls once and flies the ball.
import type { Vec } from '../core/vec';

/** The goal-kicking knobs (tuning reference §15). Overridable by name in balance experiments (tuning.ts). */
export const GOALS = {
  /** Half the gap between the uprights, metres (posts 5.5 m apart). */
  halfPosts: 2.75,
  /** Sideways error of a kick, degrees (1 standard deviation) for a Skill 60 kicker before distance. */
  errorDeg: 5,
  /** The error grows by this share per metre to the posts. */
  errorPerM: 1 / 40,
  /** Each Skill point above 60 narrows the error this much (and below 60 widens it). */
  errorPerSkill: 0.012,
  /** A conversion is taken from at least this far out and at most this far. */
  minBackM: 10,
  maxBackM: 35,
  /** Ticks the kicker takes to line it up once on his spot (a Nines drop kick is quick). */
  conversionTicks: 30,
  /** …and the longest the conversion waits for him to get there. */
  conversionMaxTicks: 160,
  /** Field goal: only in the last this-many seconds of the match… */
  fieldGoalLastS: 180,
  /** …with his side this far behind at worst and this far ahead at most… */
  fieldGoalMargin: [-1, 0] as [number, number],
  /** …from inside this many metres of the posts, on this tackle or later (0-based, of 5)… */
  fieldGoalRangeM: 30,
  fieldGoalFromTackle: 3,
  /** …and he goes for it this often when it is on. */
  fieldGoalChance: 0.7,
  /** A field goal is charged down this often. */
  chargeDown: 0.08,
  /** Ticks of celebration after a field goal before the restart (1.5 s). */
  goalTicks: 30,
  /**
   * Bonus zone (Nines): a carrier over the line goes round under the posts for
   * the five-pointer while no defender is within this many metres of him…
   */
  bonusClearM: 5,
  /** …for at most this long (ticks, 2.5 s), and grounds it before he is this close to the dead-ball line. */
  bonusMaxTicks: 50,
  bonusDeadM: 2,
};

/** The posts a side kicks at: the middle of the try line it attacks. */
export function postsFor(dir: 1 | -1, fieldLength: number, midY: number): Vec {
  return { x: dir > 0 ? fieldLength : 0, y: midY };
}

/** In the bonus zone: over the try line and between the uprights (the line counts). A try grounded here is worth five. */
export function inBonusZone(p: Vec, posts: Vec, dir: 1 | -1): boolean {
  return (p.x - posts.x) * dir >= 0 && Math.abs(p.y - posts.y) <= GOALS.halfPosts;
}

/**
 * Where a conversion is taken: in line with the grounding, as far back as
 * makes the posts look widest (between `minBackM` and `maxBackM`).
 */
export function conversionSpot(groundedY: number, posts: Vec, dir: 1 | -1): Vec {
  const off = Math.abs(groundedY - posts.y);
  const near = off - GOALS.halfPosts;
  const far = off + GOALS.halfPosts;
  // Outside the uprights the widest view is √(near × far) back; between them, as close as allowed.
  const back = near > 0 ? Math.sqrt(near * far) : GOALS.minBackM;
  const d = Math.max(GOALS.minBackM, Math.min(GOALS.maxBackM, back));
  return { x: posts.x - dir * d, y: groundedY };
}

/** The angle the uprights make from a spot, degrees. */
export function postsAngleDeg(from: Vec, posts: Vec): number {
  const d = Math.abs(posts.x - from.x) || 0.01;
  const a1 = Math.atan2(posts.y - GOALS.halfPosts - from.y, d);
  const a2 = Math.atan2(posts.y + GOALS.halfPosts - from.y, d);
  return (Math.abs(a2 - a1) * 180) / Math.PI;
}

/** Abramowitz–Stegun erf, plenty for odds. */
function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

/**
 * Chance a kick from `from` goes between the posts: its sideways error is
 * normal with a spread set by distance, the kicker's Skill and Big Boot's
 * accuracy multiplier (`acc` < 1 is truer).
 */
export function goalChance(from: Vec, posts: Vec, skill: number, acc = 1): number {
  const metres = Math.hypot(posts.x - from.x, posts.y - from.y);
  const spread = Math.max(0.5, GOALS.errorDeg * (1 + metres * GOALS.errorPerM) * (1 - (skill - 60) * GOALS.errorPerSkill) * acc);
  const half = postsAngleDeg(from, posts) / 2;
  return Math.max(0, Math.min(1, erf(half / (spread * Math.SQRT2))));
}
