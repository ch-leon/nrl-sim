// src/match/view/lineBreak.ts — which line breaks are clean (#638). The sim
// counts a break whenever the carrier is goal-side of every defender but one
// (`watchLineBreak`, the §7 count), and the deep fullback is nearly always that
// one, so about 16 a match. The view tells them apart: a clean break has open
// grass ahead, a half break is everything else. Pure over the event and the
// snapshot it came on; nothing here is anything the sim reads.
import type { SimEvent, Snapshot } from '../core/snapshot';
import { LIVE } from '../league/live/knobs';

/** A clean break: the nearest unbeaten defender is at least this many metres from the carrier. The fullback sits 13 to 15 m back at the moment a break is counted, so this clears him only when he is out of position (about 3 a match). */
export const CLEAN_BREAK_M = 16;

/** The detail the view gives a half break's event, so the commentary, the pop-up and the key moment treat it as the plain thing it is. */
export const HALF_BREAK = 'half';

/**
 * Whether a `line-break` event is a clean break on this snapshot: no defender is
 * still goal-side of the carrier within CLEAN_BREAK_M. A defender is unbeaten
 * while he is not behind the carrier (the sim's own test, `lineBreakM`). With
 * nobody left to beat it is clean. Without the carrier in the picture it is half.
 */
export function isCleanBreak(e: Pick<SimEvent, 'side' | 'slot'>, snap: Pick<Snapshot, 'players'>): boolean {
  const c = snap.players.find((p) => p.side === e.side && p.slot === e.slot);
  if (!c) return false;
  const defs = snap.players.filter((p) => p.side !== c.side && !p.binned);
  if (defs.length === 0) return true;
  let dir = Math.abs(c.headX) > 0.3 ? Math.sign(c.headX) : 0;
  if (dir === 0) {
    // Standing still or square: attackers go towards the defence.
    const mine = snap.players.filter((p) => p.side === c.side);
    const mean = (ps: { x: number }[]): number => ps.reduce((s, p) => s + p.x, 0) / Math.max(1, ps.length);
    dir = mean(defs) >= mean(mine) ? 1 : -1;
  }
  for (const d of defs) {
    if ((c.x - d.x) * dir >= LIVE.lineBreakM) continue;
    if (Math.hypot(d.x - c.x, d.y - c.y) < CLEAN_BREAK_M) return false;
  }
  return true;
}

/** The event as the view tells it: a `line-break` that is not clean carries `detail: 'half'`; anything else is unchanged. */
export function shownBreak(e: SimEvent, snap: Pick<Snapshot, 'players'>): SimEvent {
  return e.kind === 'line-break' && !isCleanBreak(e, snap) ? { ...e, detail: HALF_BREAK } : e;
}
