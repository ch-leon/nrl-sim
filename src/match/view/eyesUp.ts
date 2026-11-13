// src/match/view/eyesUp.ts — eyes on the bomb (#671): while a bomb is in the air, the few men
// under where it will come down (the catcher and the nearest chasers) tip their heads back,
// and level off as it comes down. Pure over the two snapshots the view already holds: the ball's
// height two ticks running gives its rise and so its peak, and the horizontal pace gives where it
// lands. No state, no dice, nothing the sim reads, so pause, seek and replay show the same heads.
import type { Snapshot } from '../core/snapshot';
import { TICK_S } from '../core/engine';

/** Metres a second squared the sim's kicks fall at while they hang (core/ball.ts hangTime: a parabola in time). */
const GRAVITY = 9.81;

export const EYES_UP = {
  /** A ball whose flight peaks this high is a bomb (a bomb peaks at 20 m and over; every other kick in play at 13 m or under, and the default kick-off at 18). */
  bombPeakM: 19,
  /** The nearest this many men to where it comes down look up… */
  watchers: 4,
  /** …if they are within this many metres of it. */
  radiusM: 10,
  /** Ball heights (m) at which the head tips back a step: a glance up from here, right back from the second. */
  levelAtM: [4, 10] as readonly number[],
} as const;

/** Who is looking up on this tick, and how far: 1 a glance, 2 right back. Keyed `side/slot`. */
export interface EyesUp {
  level: 1 | 2;
  who: ReadonlySet<string>;
}

/** The peak a free ball is on course for, metres, read off its height on `prev` and `cur` (a parabola under gravity, so rise and height fix it). */
export function flightPeak(prev: Snapshot, cur: Snapshot): number | null {
  if (prev.ball.holder || cur.ball.holder) return null;
  const dt = Math.max(1, cur.tick - prev.tick) * TICK_S;
  // Vertical speed now: the mean over the tick, less half a tick's pull of gravity.
  const v = (cur.ball.lift - prev.ball.lift) / dt - (GRAVITY * dt) / 2;
  return cur.ball.lift + (v * v) / (2 * GRAVITY);
}

/** The men watching a bomb on this tick, or null when none is up (or it has come down). */
export function eyesUp(prev: Snapshot, cur: Snapshot): EyesUp | null {
  if (prev === cur || cur.tick <= prev.tick) return null;
  const h = cur.ball.lift;
  if (h < EYES_UP.levelAtM[0]!) return null;
  const peak = flightPeak(prev, cur);
  if (peak === null || peak < EYES_UP.bombPeakM) return null;
  // Where it lands: on at its pace over the ground for the time it still has to fall.
  const dt = (cur.tick - prev.tick) * TICK_S;
  const v = (h - prev.ball.lift) / dt - (GRAVITY * dt) / 2;
  const left = (v + Math.sqrt(v * v + 2 * GRAVITY * h)) / GRAVITY;
  const at = { x: cur.ball.x + ((cur.ball.x - prev.ball.x) / dt) * left, y: cur.ball.y + ((cur.ball.y - prev.ball.y) / dt) * left };
  const near = cur.players
    .filter((p) => !p.binned && Math.hypot(p.x - at.x, p.y - at.y) <= EYES_UP.radiusM)
    .sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y) || a.slot - b.slot)
    .slice(0, EYES_UP.watchers);
  if (near.length === 0) return null;
  return { level: h >= EYES_UP.levelAtM[1]! ? 2 : 1, who: new Set(near.map((p) => `${p.side}/${p.slot}`)) };
}
