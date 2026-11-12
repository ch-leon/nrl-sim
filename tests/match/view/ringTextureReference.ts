// The ring rasteriser as it was before #646's speed-up: every piece measured for every texel.
// The test holds the fast one to these pixels.
import { PixelBuffer } from '../../../src/art/pixel';
import { ringOutline, type RingStyle } from '../../../src/art/match/kitClash';
import { RING_EDGE, type RingPaint } from '../../../src/match/view/rings';

/** Texels per art pixel: the ring stays soft-edged and crisp at any camera zoom a phone uses. */
const RING_SCALE = 4;

type Seg = readonly [x0: number, y0: number, x1: number, y1: number];

/**
 * How far (px, py) is from the segment's line, and how far past either end along it. Every
 * piece is stroked with flat ends, as the line is: a round joint would also round off the
 * end of a dash and, on the thick dark edge, close the gaps between the dashes. Facets of
 * 4 degrees or less leave no visible wedge at a bend.
 */
function segReach(px: number, py: number, s: Seg): { dist: number; past: number } {
  const dx = s[2] - s[0]; const dy = s[3] - s[1];
  const len = Math.hypot(dx, dy) || 1;
  const along = ((px - s[0]) * dx + (py - s[1]) * dy) / len;
  return { dist: Math.abs((px - s[0]) * dy - (py - s[1]) * dx) / len, past: Math.max(0, -along, along - len) };
}

/** A `w` × `h` (art px) ring as RGBA, centred in a buffer padded for its line; even-sized so the centre falls between texels. */
export function drawRingPixelsReference(style: RingStyle, w: number, h: number, p: RingPaint, scale = RING_SCALE): PixelBuffer {
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
  const layers: { width: number; color: number; alpha: number }[] = style === 'solid'
    ? [{ width: p.width, color: p.color, alpha: p.alpha }]
    : [{ width: p.width + 1.5, color: RING_EDGE, alpha: 0.85 * p.alpha }, { width: p.width * 1.2, color: p.color, alpha: p.alpha }];
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
      const reach = segs.map((s) => segReach(px, py, s));
      for (const l of layers) {
        let cover = 0;
        for (const r of reach) {
          const side = Math.max(0, Math.min(1, 0.5 + (l.width * scale) / 2 - r.dist)); // across the line
          const end = Math.max(0, Math.min(1, 1 - r.past)); // along it: past an end (half a texel of overlap hides the seams)
          cover = Math.max(cover, Math.min(side, end));
        }
        over(l.color, cover >= 0.5 ? l.alpha : 0);
      }
      if (al <= 0) continue;
      const i = (y * bw + x) * 4;
      out.data[i] = Math.round(r / al); out.data[i + 1] = Math.round(g / al); out.data[i + 2] = Math.round(bl / al); out.data[i + 3] = Math.round(al * 255);
    }
  }
  return out;
}
