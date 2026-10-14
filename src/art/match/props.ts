// src/art/match/props.ts — small match props: H goalposts, the ball, shadows.
//
// Goalposts are split into three sprites (two uprights + the crossbar) so each
// can depth-sort by its own ground contact: a player passing between the posts
// is drawn in front of the far upright and behind the near one. The crossbar is
// a 2:1 diagonal because the try-line runs along the iso gy axis.
// Pure + Phaser-free.
import { PixelBuffer, mix } from '../pixel';
import { TILE_W, TILE_H } from '../../config';
import { OUTLINE, type Kit } from './kit';
import { CROSSBAR_Z, POST_GY, POST_H } from './stadium';

const POST_WHITE = 0xf6f6f0;
const POST_SHADE = 0xc8c8c4;

export const UPRIGHT_W = 9;
/** Upright texture height (pole + pad + outline). Origin is bottom-centre. */
export const UPRIGHT_H = POST_H + 2;

/** One upright: white pole, padded base in the home kit, a little top cap. */
export function drawUpright(kit: Kit): PixelBuffer {
  const b = new PixelBuffer(UPRIGHT_W, UPRIGHT_H);
  const cx = 4;
  const base = UPRIGHT_H - 2; // ground row
  // Pole (3px: lit left, white, shaded right).
  for (let y = 1; y <= base; y++) {
    b.set(cx - 1, y, POST_WHITE);
    b.set(cx, y, POST_WHITE);
    b.set(cx + 1, y, POST_SHADE);
  }
  b.set(cx - 1, 1, 0xffffff);
  // Padding: a 7px cylinder 16px tall, jersey with two trim bands.
  const padTop = base - 15;
  for (let y = padTop; y <= base; y++) {
    const band = y - padTop === 3 || y - padTop === 4 || y - padTop === 11;
    const c = band ? kit.trim : kit.jersey;
    for (let x = cx - 3; x <= cx + 3; x++) {
      const t = x - (cx - 3);
      let col = c;
      if (t === 0) col = mix(c, 0xffffff, 0.3);
      else if (t >= 5) col = band ? kit.trimShade : kit.jerseyShade;
      b.set(x, y, col);
    }
  }
  // Rounded pad top.
  b.set(cx - 3, padTop, 0, 0);
  b.set(cx + 3, padTop, 0, 0);
  b.outline(OUTLINE);
  return b;
}

/** Screen delta between the two uprights (A → B, B is down-left). */
export const CROSSBAR_DX = -Math.round((POST_GY[1] - POST_GY[0]) * (TILE_W / 2));
export const CROSSBAR_DY = Math.round((POST_GY[1] - POST_GY[0]) * (TILE_H / 2));

/** Crossbar buffer; its A end is at (CROSSBAR_AX, CROSSBAR_AY). */
export const CROSSBAR_AX = -CROSSBAR_DX + 1;
export const CROSSBAR_AY = 1;

export function drawCrossbar(): PixelBuffer {
  const w = -CROSSBAR_DX + 3;
  const h = CROSSBAR_DY + 5;
  const b = new PixelBuffer(w, h);
  const ax = CROSSBAR_AX;
  const ay = CROSSBAR_AY;
  b.line(ax, ay, ax + CROSSBAR_DX, ay + CROSSBAR_DY, POST_WHITE);
  b.line(ax, ay + 1, ax + CROSSBAR_DX, ay + CROSSBAR_DY + 1, POST_WHITE);
  b.line(ax, ay + 2, ax + CROSSBAR_DX, ay + CROSSBAR_DY + 2, POST_SHADE);
  b.outline(OUTLINE);
  return b;
}

export { CROSSBAR_Z };

// ── Ball ─────────────────────────────────────────────────────────────────────

/**
 * Steeden-style ball, side-on: cream leather, red panel stripe, highlight. 12×7
 * inside a 1px near-black outline (14×9) so it reads against the white
 * line markings and the crowd (#17).
 */
export function drawBall(): PixelBuffer {
  const rows = [
    '...wwwwww...',
    '.wHHwwwRwws.',
    'wHHwwwwRwwss',
    'wwwwwwwRwwss',
    'wwwwwwwRwsss',
    '.wwwwwwRssss',
    '...ssssss...',
  ];
  const b = new PixelBuffer(14, 9);
  b.sprite(rows, { w: 0xf3ead2, H: 0xffffff, R: 0xd8443a, s: 0xc7b48c }, 1, 1);
  b.outline(OUTLINE);
  return b;
}

/** Soft elliptical ground shadow (semi-transparent black). */
export function drawShadow(w: number, h: number, alpha = 0.3): PixelBuffer {
  const b = new PixelBuffer(w, h);
  const rx = w / 2;
  const ry = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      if (dx * dx + dy * dy <= 1) b.set(x, y, 0x000000, alpha);
    }
  }
  return b;
}
