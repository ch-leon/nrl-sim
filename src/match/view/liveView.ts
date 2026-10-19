// src/match/view/liveView.ts — draws live-sim snapshots onto the match
// scene's sprites (BAK-207 §2 view/). Interpolates between the previous and
// current tick at `alpha`, so the 20 Hz sim looks smooth at any frame rate.
// Structural interfaces mirror MatchScene's public surface; no Phaser import,
// so it is unit-tested with fake actors.
import { toFieldPt } from '../core/field';
import type { Snapshot, Side } from '../core/snapshot';
import type { PlayerAnim } from '../../art/match/players';

export interface ActorView {
  place(x: number, y: number, depth: number): void;
  play(anim: PlayerAnim, faceLeft: boolean, timeScale: number): void;
  /** Wear this player's look (an interchange put someone new in the slot). */
  wear?(who: string): void;
}

export interface BallView {
  place(x: number, y: number, lift: number, depth: number): void;
}

export interface ViewSurface {
  players: Record<Side, readonly ActorView[]>;
  ball: BallView;
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
  focus?: { carrier(t: { side: Side; x: number; y: number } | null): void };
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

  constructor(surface: ViewSurface) {
    this.s = surface;
    this.screenDir = Math.sign(surface.fieldToWorld(60, 50).x - surface.fieldToWorld(40, 50).x) || 1;
  }

  draw(prev: Snapshot, cur: Snapshot, alpha: number, timeScale = 1): void {
    const a = Math.max(0, Math.min(1, alpha));
    for (let i = 0; i < cur.players.length; i++) {
      const c = cur.players[i]!;
      const p = prev.players[i] ?? c;
      const actor = this.s.players[c.side][c.slot];
      if (!actor) continue;
      if (c.who !== undefined) actor.wear?.(c.who);
      const f = toFieldPt({ x: p.x + (c.x - p.x) * a, y: p.y + (c.y - p.y) * a });
      const w = snap(this.s.fieldToWorld(f.fx, f.fy));
      // Feet y is the iso sort key; a tiny per-slot bias stops z-fighting flicker.
      actor.place(w.x, w.y, w.y + 1 + c.slot * 0.001 + (c.side === 'away' ? 0.0005 : 0));
      const faceLeft = c.headX * this.screenDir < 0;
      const cadence = c.pose === 'run' ? Math.max(0.45, Math.min(1.7, c.speed / CADENCE_SPEED)) : 1;
      actor.play(c.pose as PlayerAnim, faceLeft, timeScale * cadence);
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
      this.s.focus?.carrier({ side: cb.holder.side, x: bw.x, y: bw.y });
    } else {
      this.s.ball.place(bw.x, bw.y, lift, bw.y + 2);
      this.s.focus?.carrier(null);
    }
  }
}
