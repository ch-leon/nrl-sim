// src/match/view/goalKick.ts — the goal kicker's routine (#669). From the tick he is on his spot
// to the tick the sim strikes the ball (both on the snapshot's `goalKick`), he sets the ball on a
// tee, stands over it, steps back, looks up at the posts, takes a breath and runs in; the strike
// and follow-through are the kick the sim already shows, off the tee. The beats are shares of
// that gap, so the routine ends exactly on the strike whatever the gap; the strike tick and the
// result are the sim's. A pure function of the snapshot and tick: pause, seek and replay agree.
import type { PlayerSnap } from '../core/snapshot';
import type { Facing } from '../../art/prototype/player';
import { screenFacing } from './screenFacing';

/**
 * Where each beat of `goalRoutine` (frames 0–5) starts, as a share of the gap from his spot to the
 * strike: the ball on the tee, stood over it, stepping back, the look up, the breath, the run in.
 * At the sim's gap (goals.conversionTicks, 30 ticks, the only gap 40 seeds produced) that is 5, 3, 4, 6, 6 and 6 ticks.
 */
export const ROUTINE_BEATS = [0, 0.14, 0.24, 0.4, 0.6, 0.8] as const;

/** The routine's frame on `tick`, or null outside it (before he is on his spot, from the strike on). */
export function goalRoutineFrame(g: NonNullable<PlayerSnap['goalKick']>, tick: number): number | null {
  const gap = g.strikeTick - g.readyTick;
  if (gap <= 0 || tick < g.readyTick || tick >= g.strikeTick) return null;
  const u = (tick - g.readyTick) / gap;
  let f = 0;
  while (f < ROUTINE_BEATS.length - 1 && u >= ROUTINE_BEATS[f + 1]!) f++;
  return f;
}

/**
 * The goal kicker's picture, when `goalKick` says he is lining up a shot: his routine while he holds
 * the ball before the strike, the kick off the tee from it (the drop kick the sim reports, `action`),
 * always facing the posts. Null: draw him as anything else.
 */
export function goalKickPicture(p: PlayerSnap, action: string, frame: number, tick: number, possession: boolean, screenDir: number):
  { action: 'goalRoutine' | 'teeKick'; frame: number; facing: Facing; left: boolean } | null {
  const g = p.goalKick;
  if (!g) return null;
  // Square on to the posts, whichever way his feet last shuffled.
  const posts = { headX: g.toward, headY: 0 };
  const view = screenFacing(posts, posts, screenDir);
  if (action === 'dropKick') return { action: 'teeKick', frame, ...view };
  const beat = possession ? goalRoutineFrame(g, tick) : null;
  return beat === null ? null : { action: 'goalRoutine', frame: beat, ...view };
}
