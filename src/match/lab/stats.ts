// src/match/lab/stats.ts — counts of what happened in a window of sim events,
// for the lab's stats strip (BAK-208 §6): balance seen, not guessed. Pure.
import { TICK_S } from '../core/engine';
import type { SimEvent } from '../core/snapshot';

export interface WindowStats {
  tackles: number;
  breaks: number;
  offloads: number;
  errors: number;
  kicks: number;
  tries: number;
  /** Seconds of sim time the window actually covers. */
  seconds: number;
}

/** Default window: five minutes of sim time, in ticks. */
export const WINDOW_TICKS = Math.round(300 / TICK_S);

/** Counts for events with `tick` in (now − window, now]. */
export function statsWindow(history: readonly SimEvent[], nowTick: number, windowTicks = WINDOW_TICKS): WindowStats {
  const from = Math.max(0, nowTick - windowTicks);
  const s: WindowStats = { tackles: 0, breaks: 0, offloads: 0, errors: 0, kicks: 0, tries: 0, seconds: (nowTick - from) * TICK_S };
  for (const e of history) {
    if (e.tick <= from || e.tick > nowTick) continue;
    switch (e.kind) {
      case 'tackle':
      case 'big-hit':
        s.tackles++;
        break;
      case 'break-tackle':
      case 'fend':
      case 'step':
        s.breaks++;
        break;
      case 'offload':
        s.offloads++;
        break;
      case 'error':
        s.errors++;
        break;
      case 'kick':
        s.kicks++;
        break;
      case 'try':
        s.tries++;
        break;
      default:
        break;
    }
  }
  return s;
}

/** One-line readout, e.g. "last 4:12 · T 31 · Brk 7 · Off 2 · Err 3 · K 4 · Try 1". */
export function statsLine(s: WindowStats): string {
  const m = Math.floor(s.seconds / 60);
  const sec = Math.round(s.seconds % 60);
  return `last ${m}:${String(sec).padStart(2, '0')} · T ${s.tackles} · Brk ${s.breaks} · Off ${s.offloads} · Err ${s.errors} · K ${s.kicks} · Try ${s.tries}`;
}
