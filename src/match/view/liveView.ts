// src/match/view/liveView.ts — draws live-sim snapshots onto the match
// scene's sprites (BAK-207 §2 view/). Interpolates between the previous and
// current tick at `alpha`, so the 20 Hz sim looks smooth at any frame rate.
// Structural interfaces mirror MatchScene's public surface; no Phaser import,
// so it is unit-tested with fake actors.
import { toFieldPt } from '../core/field';
import type { PlayerSnap, Snapshot, Side } from '../core/snapshot';
import type { PlayerAnim } from '../../art/match/players';
import { playerPicture, type PlayerPicture } from './playerPicture';
import { screenFacing } from './screenFacing';
import { advanceContactAnimation, type ContactAnimation } from './contactAnimation';
import { contactLayout, type ContactLayout, type ContactPoint } from './contactLayout';

export interface ActorView {
  place(x: number, y: number, depth: number): void;
  play(anim: PlayerAnim, faceLeft: boolean, timeScale: number): void;
  /** Wear this player's look (an interchange put someone new in the slot). */
  wear?(who: string): void;
  paint?(picture: PlayerPicture): void;
  /** Draw him this opaque (a substitute fades in), 1 once he has. */
  fade?(alpha: number): void;
  setSpriteVisible?(visible: boolean): void;
}

/** Where the ball is heading on screen, per tick (world px, the climb included), and the tick it is drawn at (fractional): the flying ball turns to its heading and spins by it. */
export interface BallMotion {
  dx: number;
  dy: number;
  t: number;
}

export interface BallView {
  place(x: number, y: number, lift: number, depth: number, motion?: BallMotion): void;
  setRendered?(visible: boolean): void;
}

export interface ViewSurface {
  players: Record<Side, readonly ActorView[]>;
  ball: BallView;
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
  /** Bodies were put somewhere new in one tick (a half's restart): the camera goes with them instead of panning. */
  cut?(): void;
  focus?: { carrier(t: { side: Side; x: number; y: number } | null): void };
  contact?: { paint(state: ContactAnimation | null, layout: ContactLayout | null, facing: 'front' | 'back'): void };
}

/** World px per metre of lift (the ball sprite rises this much per metre). */
export const LIFT_PX_PER_M = 10;

/** Whole world pixels: sub-pixel positions make pixel art shimmer as it moves. */
function snap(p: { x: number; y: number }): { x: number; y: number } {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}
/** Ticks over which the ball's ±4 px hand offset fades out after a release (the loose ball starts in the hand). */
const HAND_BLEND_TICKS = 2;
/** Ticks a substitute takes to fade in (about a quarter of a second at ×1). */
const FADE_TICKS = 5;
/** A body that moves further than this (metres) in one tick has been placed, not run: it snaps (a run is under 0.5 m a tick). */
const SNAP_M = 4;
/** A restart puts most of both sides somewhere new; one man sent to the bin or a swap is not a cut. */
const CUT_BODIES = 6;
/** The same for the ball (a kick or pass is under 2.5 m a tick). */
const BALL_SNAP_M = 6;
/** Run-cycle rate is 1 at this ground speed (m/s). */
const CADENCE_SPEED = 7;

export class LiveView {
  private readonly s: ViewSurface;
  /** +1 when increasing x moves right on screen. */
  private readonly screenDir: number;
  private contactState: ContactAnimation | null = null;
  /** The last few ticks drawn: which hand held the ball (0 when nobody did), to fade the offset after a release. */
  private readonly held = new Map<number, number>();
  /** Substitutes fading in: the tick each came on, by side and slot. */
  private readonly came = new Map<string, number>();

  constructor(surface: ViewSurface) {
    this.s = surface;
    this.screenDir = Math.sign(surface.fieldToWorld(60, 50).x - surface.fieldToWorld(40, 50).x) || 1;
  }

  draw(prev: Snapshot, cur: Snapshot, alpha: number, timeScale = 1): void {
    const a = Math.max(0, Math.min(1, alpha));
    const points: ContactPoint[] = [];
    let placed = 0;
    for (let i = 0; i < cur.players.length; i++) {
      const c = cur.players[i]!;
      let p = this.before(prev, c);
      // Put somewhere new in a tick (the restart of a half): snap rather than streak across the pitch.
      if (Math.hypot(c.x - p.x, c.y - p.y) > SNAP_M) {
        p = c;
        placed++;
      }
      const actor = this.s.players[c.side][c.slot];
      if (!actor) continue;
      if (c.who !== undefined) actor.wear?.(c.who);
      this.fadeIn(actor, prev, cur, c, a);
      const f = toFieldPt({ x: p.x + (c.x - p.x) * a, y: p.y + (c.y - p.y) * a });
      const w = snap(this.s.fieldToWorld(f.fx, f.fy));
      // Feet y is the iso sort key; a tiny per-slot bias stops z-fighting flicker.
      actor.place(w.x, w.y, w.y + 1 + c.slot * 0.001 + (c.side === 'away' ? 0.0005 : 0));
      actor.setSpriteVisible?.(true);
      points.push({ player: { side: c.side, slot: c.slot, who: c.who ?? `${c.side}/${c.slot}` }, ...w });
      const faceLeft = screenFacing(c, p, this.screenDir).left;
      const cadence = c.pose === 'run' ? Math.max(0.45, Math.min(1.7, c.speed / CADENCE_SPEED)) : 1;
      if (actor.paint) actor.paint(playerPicture(c, p, cur.tick, cur.ball.holder, this.screenDir));
      else actor.play(c.pose as PlayerAnim, faceLeft, timeScale * cadence);
    }
    let layout: ContactLayout | null = null;
    let contactFacing: 'front' | 'back' = 'front';
    if (this.s.contact) {
      this.contactState = advanceContactAnimation(this.contactState, cur);
      if (this.contactState) {
        const carrier = cur.players.find(p => p.side === this.contactState!.contact.carrier.side && p.slot === this.contactState!.contact.carrier.slot)!;
        const facing = screenFacing(carrier, this.before(prev, carrier), this.screenDir);
        contactFacing = facing.facing;
        layout = contactLayout(this.contactState, points, facing.left);
        if (layout) for (const p of layout.feet) {
          const actor = this.s.players[p.player.side][p.player.slot];
          actor?.place(p.x, p.y, p.y + 1); actor?.setSpriteVisible?.(false);
        }
      }
      this.s.contact.paint(this.contactState, layout, contactFacing);
    }
    const pb = prev.ball;
    const cb = cur.ball;
    // The ball put on a mark (a set piece's restart) snaps the same way.
    const ballPlaced = Math.hypot(cb.x - pb.x, cb.y - pb.y) > BALL_SNAP_M;
    const ba = ballPlaced ? 1 : a;
    const bf = toFieldPt({ x: pb.x + (cb.x - pb.x) * ba, y: pb.y + (cb.y - pb.y) * ba });
    const bw = snap(this.s.fieldToWorld(bf.fx, bf.fy));
    const lift = Math.round((pb.lift + (cb.lift - pb.lift) * ba) * LIFT_PX_PER_M);
    // Heading and flight time for the ball's turn and spin: its screen step this tick, the climb included.
    const f0 = toFieldPt({ x: pb.x, y: pb.y });
    const f1 = toFieldPt({ x: cb.x, y: cb.y });
    const w0 = this.s.fieldToWorld(f0.fx, f0.fy);
    const w1 = this.s.fieldToWorld(f1.fx, f1.fy);
    const motion: BallMotion = ballPlaced
      ? { dx: 0, dy: 0, t: prev.tick + a }
      : { dx: w1.x - w0.x, dy: w1.y - w0.y - (cb.lift - pb.lift) * LIFT_PX_PER_M, t: prev.tick + a };
    // Which hand holds it, remembered per tick: a release hands the offset back over HAND_BLEND_TICKS.
    for (const s of [prev, cur]) {
      const hh = s.ball.holder && s.players.find((q) => q.side === s.ball.holder!.side && q.slot === s.ball.holder!.slot);
      this.held.set(s.tick, hh ? (screenFacing(hh, s === cur ? this.before(prev, hh) : hh, this.screenDir).left ? -4 : 4) : 0);
    }
    for (const k of this.held.keys()) if (k < cur.tick - 8 || k > cur.tick + 1) this.held.delete(k);
    if (cb.holder) {
      const h = cur.players.find((q) => q.side === cb.holder!.side && q.slot === cb.holder!.slot);
      const hand = h && screenFacing(h, this.before(prev, h), this.screenDir).left ? -4 : 4;
      this.s.ball.place(bw.x + hand, bw.y, lift, bw.y + 1.01 + cb.holder.slot * 0.001, motion);
      const drawn = layout?.feet.find(p => p.player.side === cb.holder!.side && p.player.slot === cb.holder!.slot);
      this.s.focus?.carrier({ side: cb.holder.side, x: drawn?.x ?? bw.x, y: drawn?.y ?? bw.y });
    } else {
      const hand = this.handAt(prev.tick) * (1 - a) + this.handAt(cur.tick) * a;
      this.s.ball.place(bw.x + hand, bw.y, lift, bw.y + 2, motion);
      this.s.focus?.carrier(null);
    }
    if (placed >= CUT_BODIES) this.s.cut?.();
    // Held balls are painted once in the player's hands (or the shared tackle).
    const embedded = !!cb.holder && !!this.s.players[cb.holder.side][cb.holder.slot]?.paint;
    this.s.ball.setRendered?.(!embedded);
  }

  /** A substitute (the slot's man changed since the tick before) fades in over FADE_TICKS; anyone else is opaque. */
  private fadeIn(actor: ActorView, prev: Snapshot, cur: Snapshot, c: PlayerSnap, a: number): void {
    if (!actor.fade) return;
    const key = `${c.side}/${c.slot}`;
    const old = prev.players.find((q) => q.side === c.side && q.slot === c.slot);
    if (old && old.who !== c.who) this.came.set(key, cur.tick);
    const tick = this.came.get(key);
    if (tick === undefined) return;
    // From the tick before he came on (nothing) to FADE_TICKS later (all of him).
    const f = (prev.tick + a - (tick - 1)) / FADE_TICKS;
    if (f >= 1 || f < 0) this.came.delete(key);
    actor.fade(f < 0 ? 1 : Math.min(1, f));
  }

  /** The same player a tick earlier, or himself when the slot changed hands. */
  private before(prev: Snapshot, c: PlayerSnap): PlayerSnap {
    const before = prev.players.find(p => p.side === c.side && p.slot === c.slot);
    return before && before.who === c.who ? before : c;
  }

  /** The hand offset still on the ball at `tick`: all of it while held and on the release, none HAND_BLEND_TICKS later. */
  private handAt(tick: number): number {
    const now = this.held.get(tick);
    if (now) return now;
    for (let n = 0; n < HAND_BLEND_TICKS; n++) {
      const hand = this.held.get(tick - n - 1);
      if (hand) return hand * (1 - n / HAND_BLEND_TICKS);
    }
    return 0;
  }
}
