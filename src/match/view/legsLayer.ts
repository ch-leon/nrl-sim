// src/match/view/legsLayer.ts — legs left on screen (BAK-208 §8): a short bar
// under every player in the lab, green while fresh, amber once tired, red once
// spent, so a person can see who is running out of legs, and a mark beside it once
// tired (one notch) or spent (a cross) so the bands read without the colours (#371).
// Drawn just below the gas bar (sprintLayer.ts). Pure marks plus a thin Phaser
// layer, like wrestleBar.ts.
import type Phaser from 'phaser';
import type { Side, Snapshot } from '../core/snapshot';

/** Screen px. */
export const LEGS_BAR_W = 12;
export const LEGS_BAR_H = 2;
/** World px under the feet: below the gas bar. */
export const LEGS_BAR_DROP = 9;
export const LEGS_COLORS = { fresh: 0x5fd35f, tired: 0xffb02e, spent: 0xff4a4a } as const;

export type LegsBand = keyof typeof LEGS_COLORS;
/** The mark beside the bar (#371): none while fresh, a notch once tired, a cross once spent. */
export const LEGS_SYMBOLS = { fresh: 'none', tired: 'notch', spent: 'cross' } as const satisfies Record<LegsBand, string>;
export type LegsSymbol = (typeof LEGS_SYMBOLS)[LegsBand];

export interface LegsMark {
  side: Side;
  slot: number;
  legs: number;
  band: LegsBand;
  symbol: LegsSymbol;
}

/** Fatigue thresholds the bands follow (FATIGUE.tiredAt, FATIGUE.spentAt). */
export interface LegsBands {
  tiredAt: number;
  spentAt: number;
}

export const legsBand = (legs: number, b: LegsBands): LegsBand => (legs >= b.tiredAt ? 'fresh' : legs >= b.spentAt ? 'tired' : 'spent');

/** A bar for everyone on the field with legs reported (the sin-binned stand on the touchline: none). */
export function legsMarks(s: Snapshot, b: LegsBands): LegsMark[] {
  const out: LegsMark[] = [];
  for (const p of s.players) {
    if (p.legs === undefined || p.binned) continue;
    const band = legsBand(p.legs, b);
    out.push({ side: p.side, slot: p.slot, legs: p.legs, band, symbol: LEGS_SYMBOLS[band] });
  }
  return out;
}

export class LegsLayer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    depth: number,
    private readonly bands: LegsBands,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Call every frame with the current snapshot and each player's feet. */
  update(s: Snapshot, zoom: number, at: (side: Side, slot: number) => { x: number; y: number } | null): void {
    const g = this.g;
    g.clear();
    const k = 1 / zoom;
    const w = LEGS_BAR_W * k;
    const h = LEGS_BAR_H * k;
    for (const m of legsMarks(s, this.bands)) {
      const p = at(m.side, m.slot);
      if (!p) continue;
      const x = p.x - w / 2;
      const y = p.y + LEGS_BAR_DROP;
      g.fillStyle(0x10101c, 0.7).fillRect(x - k, y - k, w + 2 * k, h + 2 * k);
      g.fillStyle(LEGS_COLORS[m.band], 1).fillRect(x, y, w * Math.max(0, Math.min(1, m.legs)), h);
      // The mark just right of the bar, as tall as the bar and its edge.
      const sx = x + w + 3 * k;
      const top = y - k;
      const s = h + 2 * k;
      if (m.symbol === 'notch') {
        g.fillStyle(0x10101c, 0.7).fillRect(sx - k, top - k, 3 * k, s + 2 * k);
        g.fillStyle(LEGS_COLORS[m.band], 1).fillRect(sx, top, k, s);
      } else if (m.symbol === 'cross') {
        g.lineStyle(1.5 * k, LEGS_COLORS[m.band], 1);
        g.lineBetween(sx, top - k, sx + s + k, top + s + k);
        g.lineBetween(sx, top + s + k, sx + s + k, top - k);
      }
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
