// src/match/view/rings.ts — a side's ring on the ground (#371): the team rings under
// the players, the carrier's and the kick contest's. Home's is a solid line, away's
// dashed (kitClash.ts RING_STYLES, ringOutline), so the sides read apart by shape in
// greyscale or when two kits sit close. The geometry is pure; this only strokes it.
import type Phaser from 'phaser';
import { ringOutline, type RingStyle } from '../../art/match/kitClash';

/** A ring's line and fill. */
export interface RingPaint {
  color: number;
  /** The line's width (world px) and alpha. */
  width: number;
  alpha: number;
  /** The fill inside it, if any. */
  fillAlpha?: number;
}

/** Fill and stroke a `w` × `h` ring at (x, y) into `g` in the side's style. */
export function drawRing(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, style: RingStyle, p: RingPaint): void {
  if (p.fillAlpha) g.fillStyle(p.color, p.fillAlpha).fillEllipse(x, y, w, h);
  if (style === 'solid') {
    g.lineStyle(p.width, p.color, p.alpha).strokeEllipse(x, y, w, h);
    return;
  }
  // The dashes over a thin dark edge: a short dash in a grass-green kit's colour
  // vanishes on the grass (and in greyscale) without one.
  const arcs = ringOutline(style, w, h);
  for (const [width, color, alpha] of [[p.width + 1.5, RING_EDGE, 0.85 * p.alpha], [p.width * 1.2, p.color, p.alpha]] as const) {
    g.lineStyle(width, color, alpha);
    for (const arc of arcs) {
      g.beginPath();
      g.moveTo(x + arc[0]!.x, y + arc[0]!.y);
      for (let i = 1; i < arc.length; i++) g.lineTo(x + arc[i]!.x, y + arc[i]!.y);
      g.strokePath();
    }
  }
}

/** The dark edge under a dashed ring's dashes. */
const RING_EDGE = 0x10101c;
