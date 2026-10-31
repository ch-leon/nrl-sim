// src/match/league/touch.ts — touch, dead ball and restarts (BAK-207 §5.1 2d;
// BAK-208 §4.4, E #99). The ball can leave the field: kicked out on the full,
// bouncing into touch, rolling dead over the dead-ball line or into touch-in-goal,
// or a carrier bundled over the touchline. The side that touched it last loses
// it. Restarts are a play-the-ball 10 m in from touch (no scrums), a tap on the
// 20 m line, a tap for a 40/20, or a goal-line drop-out. Pure: live.ts plays
// them out.
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_Y } from '../core/field';
import { clamp, type Vec } from '../core/vec';
import type { Zone } from './presets';

/** The touch and restart knobs (tuning reference §16). Overridable by name in balance experiments (tuning.ts). */
export const TOUCH = {
  /** A territory kick goes for touch this often, by the kicker's zone (else it goes to the fullback as before). */
  findTouch: { own20: 0.6, ownHalf: 0.5, midfield: 0.35, attackingHalf: 0.15, redZone: 0 } as Record<Zone, number>,
  /** A touch-finder aims to land this far in from the touchline… */
  touchInsideM: 4,
  /** …give or take this much (× Big Boot accuracy): too far and it is out on the full. */
  touchScatterM: 5,
  /** A touch-finder bounces on this far (it is rolling for the line). */
  touchRollM: 9,
  /** On the last tackle inside his own 40, the kicker goes for the 40/20 this often… */
  fortyTwenty: 0.08,
  /** …plus this much per level of Big Boot or Playmaker. */
  fortyTwentyTrait: 0.2,
  /** A 40/20 attempt lands this far from the line it is going for, this far in from touch, and rolls on. */
  fortyTwentyLandM: 26,
  fortyTwentyInsideM: 3,
  /** A grubber can run on this far past its spot (some roll dead). */
  grubberLongM: 6,
  /** Share of the aim pulled back from the chasing winger toward the kicker (0 = on the winger). */
  grubberInfield: 0.4,
  /** Scatter either side of that lane, metres. */
  grubberMissM: 14,
  /** A restart after touch is played this far in from the touchline, and never nearer a try line than this. */
  restartInM: 10,
  restartFromLineM: 10,
  /** A carrier tackled this close to the touchline is bundled into touch this often (a big hit more often). */
  bundleNearM: 1.2,
  bundle: 0.4,
  bundleBigHit: 0.7,
  /** A defender who gathers a kick in his own in-goal grounds it (20 m restart) if an attacker is this close or he is this deep; else he runs it out. */
  groundNearM: 8,
  groundDeepM: 3,
  /** A set piece (a restart in play) waits at least this long and at most this long for the players to get there (ticks). */
  setMinTicks: 30,
  setMaxTicks: 200,
  /** A goal-line drop-out goes this far, give or take half the spread. */
  dropOutM: 38,
  dropOutSpreadM: 12,
};

/** Where a line from `from` to `to` first leaves the playing area, and how: over a touchline in the field of play, or dead (touch-in-goal, dead-ball line). Null if it stays in. */
export function exitPoint(from: Vec, to: Vec): { at: Vec; how: 'touch' | 'dead' } | null {
  const minX = -IN_GOAL;
  const maxX = FIELD_LENGTH + IN_GOAL;
  let t = Infinity;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (to.y < 0 && dy < 0) t = Math.min(t, (0 - from.y) / dy);
  if (to.y > FIELD_WIDTH && dy > 0) t = Math.min(t, (FIELD_WIDTH - from.y) / dy);
  if (to.x < minX && dx < 0) t = Math.min(t, (minX - from.x) / dx);
  if (to.x > maxX && dx > 0) t = Math.min(t, (maxX - from.x) / dx);
  if (!Number.isFinite(t)) return null;
  t = clamp(t, 0, 1);
  const at = { x: from.x + dx * t, y: from.y + dy * t };
  return { at, how: at.x < 0 || at.x > FIELD_LENGTH ? 'dead' : 'touch' };
}

/** Off the field: over a touchline or touch-in-goal, or past a dead-ball line. */
export const outOfPlay = (p: Vec): boolean => p.y < 0 || p.y > FIELD_WIDTH || p.x < -IN_GOAL || p.x > FIELD_LENGTH + IN_GOAL;

/** The play-the-ball after touch: level with where it went out, 10 m in from that touchline, kept off the try lines. */
export function touchRestartSpot(at: Vec): Vec {
  return {
    x: clamp(at.x, TOUCH.restartFromLineM, FIELD_LENGTH - TOUCH.restartFromLineM),
    y: at.y < MID_Y ? TOUCH.restartInM : FIELD_WIDTH - TOUCH.restartInM,
  };
}

/** A side's own try line (the one it defends), for a side attacking in `dir`. */
export const ownLineX = (dir: 1 | -1): number => (dir > 0 ? 0 : FIELD_LENGTH);

/** The 20 m restart: on the defending side's 20 m line, level with where it went dead (kept 10 m in from touch). */
export function twentySpot(dir: 1 | -1, y: number): Vec {
  return { x: ownLineX(dir) + dir * 20, y: clamp(y, TOUCH.restartInM, FIELD_WIDTH - TOUCH.restartInM) };
}

/** In the in-goal a side defends (it attacks in `dir`). */
export function inOwnInGoal(p: Vec, dir: 1 | -1): boolean {
  return dir > 0 ? p.x < 0 : p.x > FIELD_LENGTH;
}

/** The 40/20's lines: kicked from behind his own 40, out inside their 20 (metres from each try line). */
export const FORTY_TWENTY_FROM_M = 40;
export const FORTY_TWENTY_INTO_M = 20;

/** A 40/20: kicked from inside the kicker's own 40, bounced into touch inside the other side's 20 (metres to the line he attacks, at the kick and where it went out). */
export function isFortyTwenty(kickToLine: number, outToLine: number): boolean {
  return kickToLine >= FIELD_LENGTH - FORTY_TWENTY_FROM_M && outToLine <= FORTY_TWENTY_INTO_M && outToLine >= 0;
}
