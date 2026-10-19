// src/match/view/sprintLayer.ts — sprint and gas on screen (BAK-208 §8.2): a
// speed streak behind anyone going flat out, and a thin gas bar under the
// carrier when he is sprinting or has run dry, and under anyone sprinting at
// him. Pure marks plus a thin Phaser layer, like wrestleBar.ts.
import type Phaser from 'phaser';
import type { Side, Snapshot } from '../core/snapshot';

/** A chaser this close to the carrier gets his gas bar shown too (metres). */
export const CHASE_BAR_M = 10;
/** Screen px. */
export const GAS_BAR_W = 18;
export const GAS_BAR_H = 3;
export const STREAK_LEN = 10;
/** World px under the feet for the bar, and the streak's height above them. */
export const GAS_BAR_DROP = 4;
export const STREAK_LIFT = 10;
export const GAS_COLORS = { full: 0x7fd8ff, low: 0xffe14a, blown: 0xff4a4a } as const;

export interface SprintMark {
  side: Side;
  slot: number;
  /** Going flat out: draw the streak. */
  streak: boolean;
  /** Gas left 0..1 to show under him, or null for no bar. */
  bar: number | null;
  blown: boolean;
}

/** What to draw this frame: streaks for sprinters, gas bars for the carrier and his chasers. */
export function sprintMarks(s: Snapshot): SprintMark[] {
  const holder = s.ball.holder ? s.players.find((p) => p.side === s.ball.holder!.side && p.slot === s.ball.holder!.slot) : undefined;
  const out: SprintMark[] = [];
  for (const p of s.players) {
    const streak = p.sprint === true;
    const blown = p.blown === true;
    let bar: number | null = null;
    if (holder && p === holder && (streak || blown)) bar = p.gas ?? 0;
    else if (holder && streak && p.side !== holder.side && Math.hypot(p.x - holder.x, p.y - holder.y) < CHASE_BAR_M) bar = p.gas ?? 0;
    if (streak || bar !== null) out.push({ side: p.side, slot: p.slot, streak, bar, blown });
  }
  return out;
}

export const gasColor = (gas: number, blown: boolean): number => (blown ? GAS_COLORS.blown : gas > 0.35 ? GAS_COLORS.full : GAS_COLORS.low);

export class SprintLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Call every frame with the current snapshot and each player's feet and facing. */
  update(s: Snapshot, zoom: number, at: (side: Side, slot: number) => { x: number; y: number; faceLeft: boolean } | null): void {
    const g = this.g;
    g.clear();
    const k = 1 / zoom;
    for (const m of sprintMarks(s)) {
      const p = at(m.side, m.slot);
      if (!p) continue;
      if (m.streak) {
        // Three short lines trailing behind him.
        const back = p.faceLeft ? 1 : -1;
        g.lineStyle(1.5 * k, 0xffffff, 0.75);
        for (let i = 0; i < 3; i++) {
          const y = p.y - STREAK_LIFT - i * 4 * k;
          const x0 = p.x + back * (6 + i * 2) * k;
          g.lineBetween(x0, y, x0 + back * STREAK_LEN * k, y);
        }
      }
      if (m.bar !== null) {
        const w = GAS_BAR_W * k;
        const h = GAS_BAR_H * k;
        const x = p.x - w / 2;
        const y = p.y + GAS_BAR_DROP;
        g.fillStyle(0x10101c, 0.8).fillRect(x - k, y - k, w + 2 * k, h + 2 * k);
        g.fillStyle(gasColor(m.bar, m.blown), 1).fillRect(x, y, w * Math.max(0, Math.min(1, m.bar)), h);
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
