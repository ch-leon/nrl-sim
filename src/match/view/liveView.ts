// src/match/view/liveView.ts — draws live-sim snapshots onto the match
// scene's sprites (BAK-207 §2 view/). Interpolates between the previous and
// current tick at `alpha`, so the 20 Hz sim looks smooth at any frame rate.
// Structural interfaces mirror MatchScene's public surface; no Phaser import,
// so it is unit-tested with fake actors.
import { toFieldPt } from '../core/field';
import type { Snapshot, Side } from '../core/snapshot';
import type { PlayerAnim } from '../../art/match/players';
import { playerPicture, type PlayerPicture } from './playerPicture';
import { advanceContactAnimation, type ContactAnimation } from './contactAnimation';
import { contactLayout, type ContactLayout, type ContactPoint } from './contactLayout';

export interface ActorView {
  place(x: number, y: number, depth: number): void;
  play(anim: PlayerAnim, faceLeft: boolean, timeScale: number): void;
  /** Wear this player's look (an interchange put someone new in the slot). */
  wear?(who: string): void;
  paint?(picture: PlayerPicture): void;
  setSpriteVisible?(visible: boolean): void;
}

export interface BallView {
  place(x: number, y: number, lift: number, depth: number): void;
  setRendered?(visible: boolean): void;
}

export interface ViewSurface {
  players: Record<Side, readonly ActorView[]>;
  ball: BallView;
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
  focus?: { carrier(t: { side: Side; x: number; y: number } | null): void };
  contact?: { paint(state: ContactAnimation | null, layout: ContactLayout | null, facing: 'front' | 'back'): void };
}

/** World px per metre of lift (the ball sprite rises this much per metre). */
export const LIFT_PX_PER_M = 10;

/** Whole world pixels: sub-pixel positions make pixel art shimmer as it moves. */
function snap(p: { x: number; y: number }): { x: number; y: number } {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}
/** Run-cycle rate is 1 at this ground speed (m/s). */
const CADENCE_SPEED = 7;

export class LiveView {
  private readonly s: ViewSurface;
  /** +1 when increasing x moves right on screen. */
  private readonly screenDir: number;
  private contactState: ContactAnimation | null = null;

  constructor(surface: ViewSurface) {
    this.s = surface;
    this.screenDir = Math.sign(surface.fieldToWorld(60, 50).x - surface.fieldToWorld(40, 50).x) || 1;
  }

  draw(prev: Snapshot, cur: Snapshot, alpha: number, timeScale = 1): void {
    const a = Math.max(0, Math.min(1, alpha));
    const points: ContactPoint[] = [];
    for (let i = 0; i < cur.players.length; i++) {
      const c = cur.players[i]!;
      const before = prev.players.find(p => p.side === c.side && p.slot === c.slot);
      const p = before && before.who === c.who ? before : c;
      const actor = this.s.players[c.side][c.slot];
      if (!actor) continue;
      if (c.who !== undefined) actor.wear?.(c.who);
      const f = toFieldPt({ x: p.x + (c.x - p.x) * a, y: p.y + (c.y - p.y) * a });
      const w = snap(this.s.fieldToWorld(f.fx, f.fy));
      // Feet y is the iso sort key; a tiny per-slot bias stops z-fighting flicker.
      actor.place(w.x, w.y, w.y + 1 + c.slot * 0.001 + (c.side === 'away' ? 0.0005 : 0));
      actor.setSpriteVisible?.(true);
      points.push({ player: { side: c.side, slot: c.slot, who: c.who ?? `${c.side}/${c.slot}` }, ...w });
      const faceLeft = c.headX * this.screenDir < 0;
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
        contactFacing = (carrier.headY ?? 0) < -.2 ? 'back' : 'front';
        layout = contactLayout(this.contactState, points, carrier.headX * this.screenDir < 0);
        if (layout) for (const p of layout.feet) {
          const actor = this.s.players[p.player.side][p.player.slot];
          actor?.place(p.x, p.y, p.y + 1); actor?.setSpriteVisible?.(false);
        }
      }
      this.s.contact.paint(this.contactState, layout, contactFacing);
    }
    const pb = prev.ball;
    const cb = cur.ball;
    const bf = toFieldPt({ x: pb.x + (cb.x - pb.x) * a, y: pb.y + (cb.y - pb.y) * a });
    const bw = snap(this.s.fieldToWorld(bf.fx, bf.fy));
    const lift = Math.round((pb.lift + (cb.lift - pb.lift) * a) * LIFT_PX_PER_M);
    if (cb.holder) {
      const h = cur.players.find((q) => q.side === cb.holder!.side && q.slot === cb.holder!.slot);
      const hand = h && h.headX * this.screenDir < 0 ? -4 : 4;
      this.s.ball.place(bw.x + hand, bw.y, lift, bw.y + 1.01 + cb.holder.slot * 0.001);
      const drawn = layout?.feet.find(p => p.player.side === cb.holder!.side && p.player.slot === cb.holder!.slot);
      this.s.focus?.carrier({ side: cb.holder.side, x: drawn?.x ?? bw.x, y: drawn?.y ?? bw.y });
    } else {
      this.s.ball.place(bw.x, bw.y, lift, bw.y + 2);
      this.s.focus?.carrier(null);
    }
    // Held balls are painted once in the player's hands (or the shared tackle).
    const embedded = !!cb.holder && !!this.s.players[cb.holder.side][cb.holder.slot]?.paint;
    this.s.ball.setRendered?.(!embedded);
  }
}
