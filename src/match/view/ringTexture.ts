// src/match/view/ringTexture.ts — a team ring under a player, painted once as pixels (#646).
//
// Thirty-six Graphics objects, each re-triangulating its ellipse and re-stroking its
// line every frame, cost more than the players they sit under. The ring never changes, so
// it is rasterised here once per side, at RING_SCALE texels per art pixel, and drawn as
// an Image (the scene gives it a linear filter and scales it back down). Same geometry as
// rings.ts drawRing: the fill, then a solid line, or the dashes over a thin dark edge.
import { PixelBuffer } from '../../art/pixel';
import { ringOutline, type RingStyle } from '../../art/match/kitClash';
import { RING_EDGE, type RingPaint } from './rings';

/** Texels per art pixel: the ring stays soft-edged and crisp at any camera zoom a phone uses. */
export const RING_SCALE = 4;

/** The rings painted last, kept for the next scene (a few of 22 KB each): painted ahead in the week, matchArtAhead.ts. */
const LIVE_RINGS_KEPT = 4;
const liveRings = new Map<string, PixelBuffer>();

/**
 * The ring under a live player (matchPlayers.ts) for a side's colour and style, painted
 * once and kept: the match art painted ahead paints the next fixture's two during the
 * week, so the hand-off to the match only uploads them. Read-only: never write into it.
 */
export function liveRingPixels(style: RingStyle, color: number): PixelBuffer {
  const id = `${style}-${color.toString(16)}`;
  let buf = liveRings.get(id);
  if (buf) {
    liveRings.delete(id);
  } else {
    buf = drawRingPixels(style, 15, 7.5, { color, width: 1.5, alpha: 0.9, fillAlpha: style === 'solid' ? 0.28 : 0.1 });
    while (liveRings.size >= LIVE_RINGS_KEPT) liveRings.delete(liveRings.keys().next().value!);
  }
  liveRings.set(id, buf);
  return buf;
}

type Seg = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * A stroked piece of the outline with what the per-texel test needs worked out once: its
 * direction and length, and the box a texel must be in to be covered by it. Every piece is
 * stroked with flat ends, as the line is: a round joint would also round off the end of a
 * dash and, on the thick dark edge, close the gaps between the dashes. Facets of 4 degrees
 * or less leave no visible wedge at a bend.
 */
interface Piece { x0: number; y0: number; dx: number; dy: number; len: number; lo_x: number; hi_x: number; lo_y: number; hi_y: number }

function pieceFor(s: Seg, reach: number): Piece {
  const dx = s[2] - s[0]; const dy = s[3] - s[1];
  // A texel is covered only within `reach` (the half line width) of the line and half a texel past an end:
  // so only inside the piece's own box grown by that. The extra texel is slack for rounding.
  const m = reach + 1.5;
  return {
    x0: s[0], y0: s[1], dx, dy, len: Math.hypot(dx, dy) || 1,
    lo_x: Math.min(s[0], s[2]) - m, hi_x: Math.max(s[0], s[2]) + m, lo_y: Math.min(s[1], s[3]) - m, hi_y: Math.max(s[1], s[3]) + m,
  };
}

/**
 * Whether any piece covers the texel's centre (px, py) by half or more: within `reach` of
 * the line across it and no more than half a texel past an end along it. The same sums as
 * stroking each piece and taking the best cover, without a result object a texel.
 */
function covered(px: number, py: number, pieces: readonly Piece[], reach: number): boolean {
  for (const s of pieces) {
    if (px < s.lo_x || px > s.hi_x || py < s.lo_y || py > s.hi_y) continue;
    const along = ((px - s.x0) * s.dx + (py - s.y0) * s.dy) / s.len;
    const past = Math.max(0, -along, along - s.len);
    const dist = Math.abs((px - s.x0) * s.dy - (py - s.y0) * s.dx) / s.len;
    // cover = min(clamp(0.5 + reach - dist), clamp(1 - past)) and the pixel wants cover >= 0.5.
    if (0.5 + reach - dist >= 0.5 && 1 - past >= 0.5) return true;
  }
  return false;
}

/** A `w` × `h` (art px) ring as RGBA, centred in a buffer padded for its line; even-sized so the centre falls between texels. */
export function drawRingPixels(style: RingStyle, w: number, h: number, p: RingPaint, scale = RING_SCALE): PixelBuffer {
  const lineMax = p.width + (style === 'solid' ? 0 : 1.5);
  const pad = Math.ceil(lineMax / 2) + 1;
  const even = (n: number): number => Math.ceil(n / 2) * 2;
  const bw = even((w + 2 * pad) * scale); const bh = even((h + 2 * pad) * scale);
  const out = new PixelBuffer(bw, bh);
  const cx = bw / 2; const cy = bh / 2;
  const a = (w / 2) * scale; const b = (h / 2) * scale;
  const segs: Seg[] = [];
  for (const arc of ringOutline(style, w * scale, h * scale, 96)) {
    for (let i = 1; i < arc.length; i++) segs.push([cx + arc[i - 1]!.x, cy + arc[i - 1]!.y, cx + arc[i]!.x, cy + arc[i]!.y]);
  }
  const strokes: { width: number; color: number; alpha: number }[] = style === 'solid'
    ? [{ width: p.width, color: p.color, alpha: p.alpha }]
    : [{ width: p.width + 1.5, color: RING_EDGE, alpha: 0.85 * p.alpha }, { width: p.width * 1.2, color: p.color, alpha: p.alpha }];
  const layers = strokes.map((l) => {
    const reach = (l.width * scale) / 2;
    return { ...l, reach, pieces: segs.map((s) => pieceFor(s, reach)) };
  });
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const px = x + 0.5; const py = y + 0.5;
      // Premultiplied running colour, painted in the order drawRing paints.
      let r = 0; let g = 0; let bl = 0; let al = 0;
      const over = (color: number, alpha: number): void => {
        if (alpha <= 0) return;
        const k = 1 - alpha;
        r = ((color >> 16) & 0xff) * alpha + r * k; g = ((color >> 8) & 0xff) * alpha + g * k; bl = (color & 0xff) * alpha + bl * k; al = alpha + al * k;
      };
      if (p.fillAlpha) {
        const u = (px - cx) / a; const v = (py - cy) / b;
        const grad = Math.hypot((px - cx) / (a * a), (py - cy) / (b * b)) || 1;
        // First-order distance to the ellipse, negative inside: one texel of soft edge.
        const d = (u * u + v * v - 1) / (2 * grad);
        over(p.color, d <= 0 ? p.fillAlpha : 0); // hard-edged, like the pixel art around it
      }
      for (const l of layers) over(l.color, covered(px, py, l.pieces, l.reach) ? l.alpha : 0);
      if (al <= 0) continue;
      const i = (y * bw + x) * 4;
      out.data[i] = Math.round(r / al); out.data[i + 1] = Math.round(g / al); out.data[i + 2] = Math.round(bl / al); out.data[i + 3] = Math.round(al * 255);
    }
  }
  return out;
}
