// src/art/appIcon.ts — the PWA icon's pixels, drawn from the brand (BAK-204, #363).
// scripts/gen-icons.mjs encodes them as PNGs at build time; nothing in the game
// imports this file. A navy-black field with a light rugby ball, its seam and lace
// rungs down the middle; with brand.iconLetters set, the letters stand on the ball in
// the pixel font in place of the seam. Pure: RGBA bytes in, no Node or DOM.

import type { Brand } from '../brand';
import { GLYPH_H, drawText, textWidth } from './match/font';

/** '#rrggbb' → [r, g, b]. */
export function hexRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`icon colour must be #rrggbb, got ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * A size × size RGBA icon: the brand's field colour with a centred rugby-ball
 * ellipse (tall, narrow), then either the central seam and lace rungs (no letters)
 * or the brand's icon letters, both drawn in the field colour for contrast.
 */
export function renderIcon(size: number, brand: Brand): Uint8Array {
  const BG = hexRgb(brand.colors.app);
  const BALL = hexRgb(brand.colors.iconBall);
  const SEAM = BG;
  const letters = brand.iconLetters.toUpperCase();
  const px = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // Ellipse radii: tall/narrow oval (rugby ball on its point-ish).
  const rx = size * 0.24;
  const ry = size * 0.40;

  const set = (x: number, y: number, rgb: readonly number[]): void => {
    const o = (y * size + x) * 4;
    px[o] = rgb[0]!;
    px[o + 1] = rgb[1]!;
    px[o + 2] = rgb[2]!;
    px[o + 3] = 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(x, y, BG); // fill background
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) {
        set(x, y, BALL);
        if (letters) continue;
        // Vertical central seam (a couple px wide).
        if (Math.abs(x - cx) <= Math.max(1, size * 0.012)) {
          set(x, y, SEAM);
        }
        // Horizontal lace rungs across the seam near the centre.
        const rung = Math.abs(y - cy) % Math.max(6, Math.round(size * 0.06));
        if (rung < Math.max(1, size * 0.012) && Math.abs(x - cx) <= size * 0.05) {
          set(x, y, SEAM);
        }
      }
    }
  }

  if (letters) {
    // Scaled up to fill about 80% of the ball's width, centred on it.
    const w = textWidth(letters);
    const scale = Math.max(1, Math.floor((rx * 2 * 0.8) / w));
    const ox = Math.round(cx - (w * scale) / 2);
    const oy = Math.round(cy - (GLYPH_H * scale) / 2);
    drawText(letters, (gx, gy) => {
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const X = ox + gx * scale + x;
          const Y = oy + gy * scale + y;
          if (X >= 0 && X < size && Y >= 0 && Y < size) set(X, Y, SEAM);
        }
      }
    });
  }
  return px;
}
