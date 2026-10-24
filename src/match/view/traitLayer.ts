// src/match/view/traitLayer.ts — traits you can see (N15.4, BAK-208 §3).
// Six moves, each drawn only when the sim's event names the trait that fired:
// a fend's straight arm, a step's cut, a Playmaker's line through the man he
// skips, a Wrecking Ball's drive and a Hitman's shock. Big Boot is the kick's
// own trail (kickLayer.ts), wider and in the trait colour; the flight is
// already longer. Passive traits (Workhorse's drain, a Hothead's temper) are
// not drawn. A second or less, then gone. Pure over the events and the
// snapshot: no dice, nothing the sim reads.
import type Phaser from 'phaser';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import { toFieldPt } from '../core/field';

/** How long a move stays up, real ms. A second or less at ×1 and ×2. */
export const TRAIT_MOVE_MS = 1000;
/** From this playback speed the move is held longer, and the match eases, so ×8 does not run past it. */
export const TRAIT_FAST_FROM = 4;
/** Real-time multiplier on TRAIT_MOVE_MS while the playback is at TRAIT_FAST_FROM or faster. */
export const TRAIT_FAST_HOLD = 2;
/** A short ease when a move fires at that speed: real ms, and the time factor. */
export const TRAIT_SLOW_MS = 420;
export const TRAIT_SLOW_FACTOR = 0.4;

/** How many real seconds a move lasts at this playback speed. ×4 and ×8 hold it twice as long. */
export function moveHold(speed: number): number {
  return speed >= TRAIT_FAST_FROM ? TRAIT_FAST_HOLD : 1;
}
/** The last part of that is the fade. */
const FADE_MS = 280;
/** A teammate this close to the pass line, between the passer and the man he finds, is the one skipped. */
export const CUT_NEAR_M = 2.5;
/**
 * Keep this much of the pass clear of either end, in metres. A fraction of the
 * pass length dropped the man beside the passer on a long cut-out (he sits in
 * the first 12% of a 20 m ball) and circled someone further down the line.
 */
export const CUT_END_M = 0.4;
/** The arm, the cut and the shock, in the trait colour (popups.ts TRAIT_COLOR). */
const MOVE_COLOR = 0xd9a5ff;
const DUST_COLOR = 0xd9c9a3;

export type MoveKind = 'fend' | 'step' | 'cut-out' | 'drive' | 'hit';

export interface TraitMove {
  kind: MoveKind;
  side: Side;
  slot: number;
  /** Where he stood when it fired, field metres. */
  x: number;
  y: number;
  /** Which way he faces along the field (+1 towards the right-hand dead-ball line). */
  headX: number;
  /** A cut-out: the man he found. */
  to?: { x: number; y: number; slot: number };
  /** A cut-out: the teammate the line passes through, when one stands on it. */
  through?: { x: number; y: number; slot: number };
}

/**
 * Which announced name may draw the move. Finisher shares the step, the fend
 * and the drive. A Hothead's big hit is his temper, not a Hitman's shock, and
 * draws nothing here.
 */
const MOVE_TRAITS: Readonly<Record<MoveKind, readonly string[]>> = {
  fend: ["Don't Argue", 'Finisher'],
  step: ['Dancing Feet', 'Finisher'],
  'cut-out': ['Playmaker'],
  drive: ['Wrecking Ball', 'Finisher'],
  hit: ['Hitman'],
};

/** The event's trait line ("Hitman II") is one of the names that own this move. */
export function traitOwnsMove(kind: MoveKind, trait: string): boolean {
  return MOVE_TRAITS[kind].some((name) => trait === name || trait.startsWith(`${name} `));
}

const KIND_OF: Readonly<Record<string, MoveKind>> = {
  fend: 'fend',
  step: 'step',
  'cut-out': 'cut-out',
  // A bust, at contact or out of the wrestle, and the drive the pop-up calls DRIVE!.
  'break-tackle': 'drive',
  tackle: 'drive',
  'big-hit': 'hit',
};

/** 1 until the fade, then down to 0 at TRAIT_MOVE_MS. Nothing before it starts or after it ends. */
export function moveAlpha(ageMs: number): number {
  if (ageMs < 0 || ageMs >= TRAIT_MOVE_MS) return 0;
  if (ageMs <= TRAIT_MOVE_MS - FADE_MS) return 1;
  return (TRAIT_MOVE_MS - ageMs) / FADE_MS;
}

/**
 * The man a cut-out skips: the teammate nearest the passer who still stands
 * on the line to the man he found, within CUT_NEAR_M of it and clear of both
 * ends. The nearest point on the line would rather circle a trailer in a
 * crowded shift than the man beside the ball. Null when the pass is too short
 * to skip anyone, or nobody stands on it.
 */
export function manOnTheLine<T extends { x: number; y: number }>(
  from: { x: number; y: number },
  to: { x: number; y: number },
  others: readonly T[],
): T | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const len = Math.sqrt(len2);
  if (len < 1) return null;
  let best: T | null = null;
  let bestAlong = Infinity;
  for (const p of others) {
    const along = ((p.x - from.x) * dx + (p.y - from.y) * dy) / len;
    if (along <= CUT_END_M || along >= len - CUT_END_M) continue;
    const u = along / len;
    const off = Math.hypot(p.x - (from.x + u * dx), p.y - (from.y + u * dy));
    if (off > CUT_NEAR_M) continue;
    if (along < bestAlong) {
      bestAlong = along;
      best = p;
    }
  }
  return best;
}

/**
 * The move an event draws, or null. Null without a named trait, for a kind
 * with no move, and when the player is not on the snapshot. A fend or a step
 * with no trait credited (the plan, not Don't Argue or Dancing Feet) draws
 * nothing here: the pop-up and the pose already say it happened.
 */
export function traitMoveFor(e: SimEvent, snap: Snapshot): TraitMove | null {
  if (!e.trait || e.side === undefined || e.slot === undefined) return null;
  const kind = KIND_OF[e.kind];
  if (!kind || !traitOwnsMove(kind, e.trait)) return null;
  const who = snap.players.find((p) => p.side === e.side && p.slot === e.slot);
  if (!who) return null;
  const move: TraitMove = { kind, side: e.side, slot: e.slot, x: who.x, y: who.y, headX: who.headX || 1 };
  if (kind === 'cut-out' && e.toSlot !== undefined) {
    const to = snap.players.find((p) => p.side === e.side && p.slot === e.toSlot);
    if (to) {
      move.to = { x: to.x, y: to.y, slot: to.slot };
      const through = manOnTheLine(
        who,
        to,
        snap.players.filter((p) => p.side === e.side && p.slot !== who.slot && p.slot !== to.slot),
      );
      if (through) move.through = { x: through.x, y: through.y, slot: through.slot };
    }
  }
  return move;
}

interface WorldPt {
  x: number;
  y: number;
}

/** Field metres onto the pitch's screen point. */
function worldOf(x: number, y: number, toWorld: (fx: number, fy: number) => WorldPt): WorldPt {
  const f = toFieldPt({ x, y });
  return toWorld(f.fx, f.fy);
}

/** A unit step along the field in the direction he faces, in world px. */
function facing(move: TraitMove, toWorld: (fx: number, fy: number) => WorldPt): WorldPt {
  const sign = move.headX < 0 ? -1 : 1;
  const a = worldOf(move.x, move.y, toWorld);
  const b = worldOf(move.x + sign * 2, move.y, toWorld);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
}

/**
 * Draws the moves over the players and under the pop-ups. Give it each event
 * as it is said (`note`); call `update` every frame after the sprites have moved.
 * `clear` drops them (a skipped or resumed stretch shows none).
 */
export class TraitLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly live: { move: TraitMove; born: number }[] = [];
  private now = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** True when the event drew a move (the playback eases ×4 and ×8 so it can be seen). */
  note(e: SimEvent, snap: Snapshot): boolean {
    const move = traitMoveFor(e, snap);
    if (!move) return false;
    this.live.push({ move, born: this.now });
    return true;
  }

  clear(): void {
    this.live.length = 0;
  }

  update(
    deltaMs: number,
    zoom: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
    speed = 1,
  ): void {
    // Age in held time: at ×8 the mark stays up for two real seconds, not one.
    this.now += deltaMs / moveHold(speed);
    this.g.clear();
    const px = 1 / Math.max(0.25, zoom);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i]!;
      const a = moveAlpha(this.now - l.born);
      if (a <= 0) {
        this.live.splice(i, 1);
        continue;
      }
      this.draw(l.move, a, px, toWorld, feet);
    }
  }

  private draw(
    move: TraitMove,
    a: number,
    px: number,
    toWorld: (fx: number, fy: number) => WorldPt,
    feet: (side: Side, slot: number) => WorldPt | null,
  ): void {
    const at = feet(move.side, move.slot) ?? worldOf(move.x, move.y, toWorld);
    const fwd = facing(move, toWorld);
    const g = this.g;
    if (move.kind === 'fend') {
      // The straight arm: out along the way he faces, the palm at the end.
      const end = { x: at.x + fwd.x * 18 - fwd.y * 6, y: at.y + fwd.y * 18 + fwd.x * 6 - 8 };
      g.lineStyle(4 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(at.x, at.y - 10, end.x, end.y);
      g.fillStyle(MOVE_COLOR, 0.9 * a).fillCircle(end.x, end.y, 4 * px);
      return;
    }
    if (move.kind === 'step') {
      // The cut: a sidestep off his line and back onto it.
      const side = { x: -fwd.y, y: fwd.x };
      const p0 = { x: at.x - fwd.x * 8, y: at.y - fwd.y * 8 };
      const p1 = { x: at.x + side.x * 14, y: at.y + side.y * 14 };
      const p2 = { x: at.x + fwd.x * 16, y: at.y + fwd.y * 16 };
      g.lineStyle(3 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      g.lineBetween(p1.x, p1.y, p2.x, p2.y);
      return;
    }
    if (move.kind === 'cut-out' && move.to) {
      // Follow the men, so at ×8 the line is still through the man he skipped
      // and not a patch of grass he has run off.
      const from = feet(move.side, move.slot) ?? worldOf(move.x, move.y, toWorld);
      const to = feet(move.side, move.to.slot) ?? worldOf(move.to.x, move.to.y, toWorld);
      const mid = move.through ? feet(move.side, move.through.slot) ?? worldOf(move.through.x, move.through.y, toWorld) : null;
      g.lineStyle(3 * px, MOVE_COLOR, 0.9 * a);
      if (mid) {
        g.lineBetween(from.x, from.y, mid.x, mid.y);
        g.lineBetween(mid.x, mid.y, to.x, to.y);
        g.lineStyle(2 * px, 0xffffff, 0.9 * a).strokeCircle(mid.x, mid.y, 8);
      } else g.lineBetween(from.x, from.y, to.x, to.y);
      g.fillStyle(MOVE_COLOR, 0.85 * a).fillCircle(to.x, to.y, 3.5 * px);
      return;
    }
    if (move.kind === 'drive') {
      // Through the tackle: dust behind him, a chevron ahead.
      const back = { x: at.x - fwd.x * 10, y: at.y - fwd.y * 10 };
      g.fillStyle(DUST_COLOR, 0.55 * a).fillEllipse(back.x, back.y, 14, 6);
      const tip = { x: at.x + fwd.x * 16, y: at.y + fwd.y * 16 - 4 };
      g.lineStyle(3 * px, MOVE_COLOR, 0.95 * a);
      g.lineBetween(tip.x, tip.y, tip.x - fwd.x * 10 + fwd.y * 6, tip.y - fwd.y * 10 - fwd.x * 6);
      g.lineBetween(tip.x, tip.y, tip.x - fwd.x * 10 - fwd.y * 6, tip.y - fwd.y * 10 + fwd.x * 6);
      return;
    }
    if (move.kind === 'hit') {
      // The shock of the big hit, on the man who made it.
      g.lineStyle(3 * px, 0xffffff, 0.95 * a).strokeEllipse(at.x, at.y, 26, 12);
      g.lineStyle(2 * px, MOVE_COLOR, 0.8 * a).strokeEllipse(at.x, at.y, 16, 7);
    }
  }

  destroy(): void {
    this.g.destroy();
    this.live.length = 0;
  }
}
