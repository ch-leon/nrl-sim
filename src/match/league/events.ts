// src/match/league/events.ts — live SimEvents → the engine-contract MatchEvent
// (ARCHITECTURE §6) that the overlay, crowd, particle FX and camera already
// react to. Phase 1.5 (#95) uses it to light up the stadium from the lab;
// runMatch (match.ts) builds the MatchResult event log from the same mapping.
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
  // A line break (Phase 3): the contract's `break`, counted in season stats and Player of the Match.
  'line-break': 'break',
  regather: 'run',
  'half-time': 'half-time',
  'full-time': 'full-time',
  conversion: 'conversion',
  'field-goal': 'field-goal',
  'penalty-goal': 'penalty-goal',
  // A 40/20 is a kick event to the contract (KickKind '40-20').
  '40-20': 'kick',
};

/** Whistle kinds that belong to no side; the contract files them under the home team. */
const WHISTLES: ReadonlySet<string> = new Set(['half-time', 'full-time']);

/** Sim kick detail → contract KickKind (a cross-field kick is a bomb to the contract). */
const KICK_DETAIL: Readonly<Record<string, KickKind>> = {
  long: 'find-touch',
  bomb: 'bomb',
  grubber: 'grubber',
  chip: 'chip',
  'cross-field': 'bomb',
};

/** Match minute for a tick, for a sim without a clock (sim seconds / 60). */
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
  const side = e.side ?? (WHISTLES.has(e.kind) ? 'home' : undefined);
  if (!kind || !side) return null;
  const f = toFieldPt({ x: snap.ball.x, y: snap.ball.y });
  // The match clock's minute when the sim keeps one (Nines minutes, 0–18).
  const t = snap.clock ? snap.clock.minute : minuteOf(e.tick);
  const ev: MatchEvent = { t, kind, teamId: ids[side], x: Math.round(f.fx), y: Math.round(f.fy) };
  if (e.player) ev.player = e.player;
  if (e.kind === 'kick') ev.detail = KICK_DETAIL[e.detail ?? 'long'] ?? 'find-touch';
  if (e.kind === '40-20') ev.detail = '40-20';
  // Kicks at goal carry their result; the overlay scores only the good ones.
  if (e.kind === 'conversion' || e.kind === 'field-goal' || e.kind === 'penalty-goal') ev.detail = e.detail === 'good' ? 'good' : 'missed';
  // A try in the bonus zone (Nines) is worth five; the overlay reads the mark.
  if (e.kind === 'try' && e.detail === 'bonus') ev.detail = 'bonus';
  return ev;
}
