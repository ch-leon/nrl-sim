// src/match/league/events.ts — live SimEvents → the engine-contract MatchEvent
// (ARCHITECTURE §6) that the overlay, crowd, particle FX and camera already
// react to. Phase 1.5 (#95) uses it to light up the stadium from the lab; Phase
// 2 (#86) builds the MatchResult event log from the same mapping.
import { TICK_S } from '../core/engine';
import { toFieldPt } from '../core/field';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import type { KickKind, MatchEvent, MatchEventKind } from '../../sim/events';

/** Sim event kinds that have a contract counterpart; the rest stay lab-only for now. */
const KIND: Readonly<Record<string, MatchEventKind>> = {
  kickoff: 'kickoff',
  'set-start': 'set-start',
  tackle: 'tackle',
  'big-hit': 'big-hit',
  'break-tackle': 'break-tackle',
  fend: 'fend',
  kick: 'kick',
  try: 'try',
  error: 'error',
  drop: 'error',
  dart: 'run',
  regather: 'run',
};

/** Sim kick detail → contract KickKind (a cross-field kick is a bomb to the contract). */
const KICK_DETAIL: Readonly<Record<string, KickKind>> = {
  long: 'find-touch',
  bomb: 'bomb',
  grubber: 'grubber',
  chip: 'chip',
  'cross-field': 'bomb',
};

/** Match minute for a tick (Phase 1 has no scaled clock yet: sim seconds / 60). */
export function minuteOf(tick: number): number {
  return Math.floor((tick * TICK_S) / 60);
}

/**
 * The MatchEvent for a sim event, positioned at the ball, or null for kinds the
 * contract doesn't know (offload, handover). `teamId` follows the contract:
 * the side the sim named, which for a tackle is the defender who made it.
 */
export function toMatchEvent(e: SimEvent, snap: Snapshot, ids: Record<Side, string>): MatchEvent | null {
  const kind = KIND[e.kind];
  if (!kind || !e.side) return null;
  const f = toFieldPt({ x: snap.ball.x, y: snap.ball.y });
  const ev: MatchEvent = { t: minuteOf(e.tick), kind, teamId: ids[e.side], x: Math.round(f.fx), y: Math.round(f.fy) };
  if (e.player) ev.player = e.player;
  if (e.kind === 'kick') ev.detail = KICK_DETAIL[e.detail ?? 'long'] ?? 'find-touch';
  return ev;
}
