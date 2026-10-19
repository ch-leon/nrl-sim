// src/match/view/wrestleBar.ts — the wrestle bar (BAK-208 §8.1): a small bar
// over the carrier while he is in a tackle, the fight left in him running
// down from green to red, a pip under it for each man on him. Pure spec plus a
// thin Phaser layer, like popups.ts / popupLayer.ts.
import type Phaser from 'phaser';
import type { WrestleSnap } from '../core/snapshot';

/** Screen px (the bar keeps its size whatever the zoom). */
export const BAR_W = 30;
export const BAR_H = 5;
/** World px above the carrier's feet (under the pop-ups). */
export const BAR_LIFT = 38;
export const FIGHT_COLORS = { strong: 0x5ad75a, fading: 0xffe14a, gone: 0xff4a4a } as const;

export interface BarSpec {
  /** 0..1 of the bar filled. */
  fill: number;
  color: number;
  /** Men in the tackle. */
  pips: number;
}

export function barSpec(w: WrestleSnap): BarSpec {
  const fill = Math.max(0, Math.min(1, w.fight));
  const color = fill > 0.5 ? FIGHT_COLORS.strong : fill > 0.25 ? FIGHT_COLORS.fading : FIGHT_COLORS.gone;
  return { fill, color, pips: Math.max(1, Math.min(3, w.men)) };
}

export class WrestleBar {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth).setVisible(false);
  }

  /** Call every frame with the current wrestle (if any) and where the carrier's feet are. */
  update(w: WrestleSnap | undefined, zoom: number, feet: (w: WrestleSnap) => { x: number; y: number } | null): void {
    const at = w ? feet(w) : null;
    if (!w || !at) {
      this.g.setVisible(false);
      return;
    }
    const s = barSpec(w);
    const g = this.g;
    g.clear();
    g.fillStyle(0x10101c, 0.85).fillRect(-BAR_W / 2 - 1, -1, BAR_W + 2, BAR_H + 2);
    g.fillStyle(s.color, 1).fillRect(-BAR_W / 2, 0, Math.round(BAR_W * s.fill), BAR_H);
    for (let i = 0; i < s.pips; i++) g.fillStyle(0xff6b4a, 1).fillRect(-BAR_W / 2 + i * 6, BAR_H + 2, 4, 4);
    g.setPosition(at.x, at.y - BAR_LIFT).setScale(1 / zoom).setVisible(true);
  }

  destroy(): void {
    this.g.destroy();
  }
}
