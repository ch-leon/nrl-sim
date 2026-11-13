// src/match/view/officials.ts — where the match's non-players stand (#642): the
// referee, the interchange bench and the sin bin. Pure functions of a snapshot
// (no sim state, no RNG, no memory between frames), so pause, seek and replay put
// everyone in the same place. Positions are sim metres (field.ts).
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, toFieldPt } from '../core/field';
import { fieldToWorldPoint } from '../../scenes/matchField';
import { LIVE } from '../league/live';
import type { PlayerSnap, Side, Snapshot } from '../core/snapshot';

/**
 * The referee's knobs. He keeps a few metres off the play on the far side of it (the
 * camera's side is the near touchline, so he reads as behind the ruck and is never in
 * front of the carrier), swings round to trail it when play is tight on the far touchline,
 * and is never closer than `clearM` to the man with the ball.
 */
export const REF = {
  /** Metres off the play. */
  offM: 6,
  /** The play he follows: this share the ball, the rest the middle of the bodies on the field (so a pass or a kick moves him at a man's pace, not the ball's). Small, as the ball's own snap onto a holder moves him by this share of it. */
  ballShare: 0.15,
  /**
   * Closest he stands to the ball or its carrier, metres (nearer only when it is right on him: see fadeM).
   * Kept small on purpose (#680): the ball snaps 2 to 5 m onto a new holder in a tick (the heel
   * landing in the dummy half's hands, a kick caught), and the push off it steps by up to its
   * peak when it does, so a bigger zone darted him 2.7 to 3.1 m at about one play-the-ball in ten.
   */
  clearM: 2.5,
  /** Inside this many metres of the ball the push off it fades out (continuity: no jump as it passes through him). */
  fadeM: 1.5,
  /** Metres of room on the far side he needs to stand there (less, and he swings round to the near side). */
  farRoomM: 6,
  /** Over these metres he swings from the far side to the near side. */
  swingM: 10,
  /** Ground speed (m/s) above which he is drawn running. */
  runSpeed: 1.2,
} as const;

/** Mean position of every body (a binned man too: he walks off and back on, so leaving him out would jump the middle). */
function middleOf(players: readonly PlayerSnap[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const p of players) {
    x += p.x;
    y += p.y;
    n++;
  }
  return n ? { x: x / n, y: y / n } : { x: FIELD_LENGTH / 2, y: FIELD_WIDTH / 2 };
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** What the referee stands off: the ball he reads, the point he is pushed away from, and how hard (0..1). */
interface Read {
  ball: { x: number; y: number };
  from: { x: number; y: number };
  weight: number;
}

/**
 * What the referee reads off a snapshot (#682). A heel rolling to the dummy half can end up to
 * 17 m short of him (he collects it at the mark), and the ball then snaps onto him in the tick he
 * catches it: that stepped the referee's spot (his share of the ball, and the push off it) by up
 * to 1.7 m. He is a man, so he is already where the ball is about to land: while the heel rolls
 * the ball he reads slides to the dummy half by how much of the roll has gone (his `poseUntil`
 * runs from the heel's start), the push off the rolling ball fades out as it goes, and the push
 * off the dummy half fades in over the hold that follows, from his `caughtTick`.
 */
function readPlay(s: Snapshot): Read {
  const holder = s.ball.holder && s.players.find((p) => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot);
  if (holder) {
    const heeled = holder.pose === 'dummyHalf' && holder.caughtTick !== undefined;
    const w = heeled ? clamp((s.tick - holder.caughtTick!) / Math.max(1, LIVE.dhHoldTicks), 0, 1) : 1;
    return { ball: s.ball, from: holder, weight: w };
  }
  const dh = s.players.find((p) => p.pose === 'dummyHalf' && p.poseUntil !== undefined);
  if (!dh) return { ball: s.ball, from: s.ball, weight: 1 };
  const gone = LIVE.rollTicks + LIVE.dhHoldTicks + 2 - (dh.poseUntil! - s.tick);
  const f = clamp(gone / Math.max(1, LIVE.rollTicks), 0, 1);
  return { ball: { x: s.ball.x + (dh.x - s.ball.x) * f, y: s.ball.y + (dh.y - s.ball.y) * f }, from: s.ball, weight: 1 - f };
}

/**
 * The referee's spot on this tick, in sim metres. Continuous in the snapshot: every
 * input (the ball, the bodies' middle) moves continuously, so he glides with play and
 * never jumps between ticks.
 */
export function refereeSpot(s: Snapshot): { x: number; y: number } {
  const mid = middleOf(s.players);
  const { ball, from: c, weight } = readPlay(s);
  const b = REF.ballShare;
  const ax = ball.x * b + mid.x * (1 - b);
  const ay = ball.y * b + mid.y * (1 - b);
  // 1 with room on the far side (low y), easing to 0 as play nears the far touchline.
  const far = clamp((ay - REF.farRoomM) / REF.swingM, 0, 1);
  // Toward the middle of the field along it, with a little bias so the direction never vanishes.
  const along = 0.2 + 0.8 * Math.tanh((FIELD_LENGTH / 2 - ax) / 15);
  const dx = (1 - far) * along + far * 0.25 * along;
  const dy = (1 - far) * 0.6 - far;
  const m = Math.hypot(dx, dy) || 1;
  let x = clamp(ax + (dx / m) * REF.offM, -IN_GOAL + 1, FIELD_LENGTH + IN_GOAL - 1);
  let y = clamp(ay + (dy / m) * REF.offM, 1.5, FIELD_WIDTH - 1.5);
  // Off the ball and whoever has it: pushed away from it, a push that fades to nothing as
  // the ball comes right up to him, so a ball passing through his spot swings him round
  // it rather than flipping him to the other side of it in one tick.
  const ex = x - c.x;
  const ey = y - c.y;
  const d = Math.hypot(ex, ey);
  if (d < REF.clearM && d > 1e-9) {
    const k = (weight * (REF.clearM - d) * Math.min(1, d / REF.fadeM)) / d;
    x += ex * k;
    y += ey * k;
  }
  return { x, y };
}

/** Screen box of a standing man round his feet (world px): half his width, his height. */
const BODY_HALF_W = 14;
const BODY_H = 36;

/**
 * Whether the referee at `spot` would be drawn over the man with the ball: in front of him
 * (lower on screen) and over his body. He then sorts behind the carrier instead (the
 * scene's depth), so the carrier is never hidden.
 */
export function refCoversCarrier(s: Snapshot, spot: { x: number; y: number }, offsetX: number): boolean {
  const h = s.ball.holder && s.players.find((p) => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot);
  if (!h) return false;
  const r = toFieldPt(spot);
  const c = toFieldPt(h);
  const rw = fieldToWorldPoint(r.fx, r.fy, offsetX);
  const cw = fieldToWorldPoint(c.fx, c.fy, offsetX);
  return rw.y >= cw.y && rw.y - BODY_H < cw.y && Math.abs(rw.x - cw.x) < BODY_HALF_W * 2;
}

/** What the referee is signalling on this tick: an arm up for a try, pointing for a penalty. */
export type RefSignal = 'try' | 'penalty' | null;

/** The phase in the snapshot's state label (`<side> ball · <phase> · …`). */
function phaseOf(s: Snapshot): string {
  return s.label.split(' · ')[1] ?? '';
}

export function refereeSignal(s: Snapshot): RefSignal {
  if (s.players.some((p) => p.tryTick !== undefined)) return 'try';
  return phaseOf(s) === 'penalty' ? 'penalty' : null;
}

// ── Bench and sin bin ───────────────────────────────────────────────────────

/** A team sheet as the bench needs it: who starts and who is on the bench (the keys the sim uses: id, else name). */
export interface BenchSheet {
  name: string;
  roster?: readonly { id?: string; name: string }[];
  bench?: readonly { id?: string; name: string }[];
}

/** The key a sheet entry plays under (live/base.ts: id, else name). */
function keyOf(e: { id?: string; name: string }): string {
  return e.id ?? e.name;
}

/**
 * Who is sitting on a side's bench on this tick: everyone on the sheet who is not on the
 * field (a man taken off sits down; the man who came on stands up). The sin-binned are on
 * the field's list (they are binned, not swapped) and sit in the bin instead. Sheet order.
 */
export function benchSeated(sheet: BenchSheet, side: Side, s: Snapshot): string[] {
  const on = new Set<string>();
  for (const p of s.players) if (p.side === side && p.who !== undefined) on.add(p.who);
  const all = [...(sheet.roster ?? []), ...(sheet.bench ?? [])].map(keyOf);
  // A snapshot without names (old recordings) keeps the sheet's own bench.
  if (on.size === 0) return (sheet.bench ?? []).map(keyOf);
  return all.filter((k) => !on.has(k));
}

/**
 * The benches and the bin, along the near touchline (y = FIELD_WIDTH), on the apron
 * between the line and the hoardings: the home bench short of halfway, the away bench
 * past it, each side's sin-bin seat at the end of its bench away from halfway.
 */
export const BENCH = {
  /** Metres between seats along the line. */
  seatM: 2.4,
  /** Seats painted on each bench (the sim's bench is four; a fifth for an injury swap). */
  seats: 5,
  /** Metres from halfway to each bench's inner end. */
  fromHalfwayM: 5,
  /** Metres beyond the touchline the bench stands. */
  backM: 2.2,
  /** Metres from the bench's outer end to the sin-bin seat. */
  binGapM: 3.2,
  /** A sin-binned man within this many metres of a touchline has reached it: he sits in the bin. */
  arrivedM: 2.5,
} as const;

/** Which way along the field a side's bench runs from halfway: home toward x = 0. */
function benchDir(side: Side): -1 | 1 {
  return side === 'home' ? -1 : 1;
}

/** A side's bench seat `i` (0 nearest halfway), sim metres. */
export function benchSeat(side: Side, i: number): { x: number; y: number } {
  return { x: FIELD_LENGTH / 2 + benchDir(side) * (BENCH.fromHalfwayM + i * BENCH.seatM), y: FIELD_WIDTH + BENCH.backM };
}

/** The sin-bin seat for a side's `n`th binned man (0 first), sim metres. */
export function binSeat(side: Side, n = 0): { x: number; y: number } {
  const end = BENCH.fromHalfwayM + (BENCH.seats - 1) * BENCH.seatM + BENCH.binGapM;
  return { x: FIELD_LENGTH / 2 + benchDir(side) * (end + n * BENCH.seatM), y: FIELD_WIDTH + BENCH.backM };
}

/**
 * Where a sin-binned man is drawn. He walks off to the nearest touchline under his own
 * steam (the sim takes him there), and once he has reached it he is in the bin: his
 * side's sin-bin seat by the bench. Anyone else (and a binned man still walking off): null.
 */
export function binnedSpot(p: PlayerSnap, s: Snapshot): { x: number; y: number } | null {
  if (!p.binned) return null;
  if (Math.min(p.y, FIELD_WIDTH - p.y) > BENCH.arrivedM) return null;
  // The second man of a side in the bin takes the next seat along.
  let n = 0;
  for (const q of s.players) if (q.binned && q.side === p.side && q.slot < p.slot) n++;
  return binSeat(p.side, n);
}
