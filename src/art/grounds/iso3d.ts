// src/art/grounds/iso3d.ts — iso "ground space" painter for grounds art.
//
// All grounds art (tiles, facilities, decor) is painted in a shared iso frame:
//   u — along grid +gx (screen right-down), v — along grid +gy (screen left-down),
//   z — straight up. 32 ground units = one tile edge, so a w×h footprint spans
//   u ∈ [0, 32w], v ∈ [0, 32h] and projects to exactly the 2:1 TILE_W×TILE_H
//   diamond grid used by src/world/iso.ts.
//
// Light comes from the top-left of the screen: +v faces (screen down-left walls)
// are lit, +u faces (screen down-right walls) are in shade. Every helper here
// is pure (no Phaser) so the generators that use it stay unit-testable.
import { PixelBuffer, noise2, mix } from '../pixel';

export interface Pt {
  x: number;
  y: number;
}

/** Ground units per tile edge (TILE_W / 2). */
export const UNIT = 32;

/** Per-pixel colour callback in plane coordinates (a, b are the plane axes). */
export type PlaneShade = (a: number, b: number, x: number, y: number) => number;

/**
 * Paints iso geometry into a PixelBuffer. (ox, oy) is the texture position of
 * ground point u=0, v=0, z=0 — i.e. the footprint diamond's top vertex.
 */
export class IsoPainter {
  constructor(
    readonly buf: PixelBuffer,
    readonly ox: number,
    readonly oy: number,
  ) {}

  /** Project a ground-space point to texture pixels. */
  p(u: number, v: number, z = 0): Pt {
    return { x: this.ox + u - v, y: this.oy + (u + v) / 2 - z };
  }

  /** Ground (u, v) under a pixel centre on the horizontal plane at height z. */
  groundAt(x: number, y: number, z = 0): { u: number; v: number } {
    const dx = x + 0.5 - this.ox;
    const s = 2 * (y + 0.5 - this.oy + z);
    return { u: (dx + s) / 2, v: (s - dx) / 2 };
  }

  /** Horizontal quad u0..u1 × v0..v1 at height z. Shade gets (u, v). */
  top(u0: number, v0: number, u1: number, v1: number, z: number, color: number, shade?: PlaneShade): void {
    const pts = [this.p(u0, v0, z), this.p(u1, v0, z), this.p(u1, v1, z), this.p(u0, v1, z)];
    this.buf.fillPoly(
      pts,
      color,
      shade
        ? (x, y) => {
            const g = this.groundAt(x, y, z);
            return shade(g.u, g.v, x, y);
          }
        : undefined,
    );
  }

  /** Lit wall facing +v (screen down-left) on plane v, spanning u0..u1, z0..z1. Shade gets (u, z). */
  wallV(v: number, u0: number, u1: number, z0: number, z1: number, color: number, shade?: PlaneShade): void {
    const pts = [this.p(u0, v, z0), this.p(u1, v, z0), this.p(u1, v, z1), this.p(u0, v, z1)];
    this.buf.fillPoly(
      pts,
      color,
      shade
        ? (x, y) => {
            const u = x + 0.5 - this.ox + v;
            const z = this.oy + (u + v) / 2 - (y + 0.5);
            return shade(u, z, x, y);
          }
        : undefined,
    );
  }

  /** Shaded wall facing +u (screen down-right) on plane u, spanning v0..v1, z0..z1. Shade gets (v, z). */
  wallU(u: number, v0: number, v1: number, z0: number, z1: number, color: number, shade?: PlaneShade): void {
    const pts = [this.p(u, v0, z0), this.p(u, v1, z0), this.p(u, v1, z1), this.p(u, v0, z1)];
    this.buf.fillPoly(
      pts,
      color,
      shade
        ? (x, y) => {
            const vv = u - (x + 0.5 - this.ox);
            const z = this.oy + (u + vv) / 2 - (y + 0.5);
            return shade(vv, z, x, y);
          }
        : undefined,
    );
  }

  /** Arbitrary polygon given in ground space. */
  poly(pts: readonly [number, number, number][], color: number, shade?: (x: number, y: number) => number): void {
    this.buf.fillPoly(
      pts.map(([u, v, z]) => this.p(u, v, z)),
      color,
      shade,
    );
  }

  /** Line between two ground-space points. */
  line(a: readonly [number, number, number], b: readonly [number, number, number], color: number, alpha = 1): void {
    const pa = this.p(a[0], a[1], a[2]);
    const pb = this.p(b[0], b[1], b[2]);
    this.buf.line(pa.x, pa.y, pb.x, pb.y, color, alpha);
  }

  /** Single pixel at a ground-space point. */
  dot(u: number, v: number, z: number, color: number, alpha = 1): void {
    const q = this.p(u, v, z);
    this.buf.set(q.x, q.y, color, alpha);
  }

  /**
   * Solid box u0..u1 × v0..v1 × z0..z1 with its three visible faces. Colours
   * are given per face; shades receive plane coords like top/wallV/wallU.
   */
  box(
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    z0: number,
    z1: number,
    c: { top: number; left: number; right: number },
    s: { top?: PlaneShade; left?: PlaneShade; right?: PlaneShade } = {},
  ): void {
    this.wallV(v1, u0, u1, z0, z1, c.left, s.left);
    this.wallU(u1, v0, v1, z0, z1, c.right, s.right);
    this.top(u0, v0, u1, v1, z1, c.top, s.top);
  }
}

// ── Noise / colour helpers ─────────────────────────────────────────────────

/** Smoothstep-interpolated value noise in [0,1). Optional period wraps the lattice. */
export function valueNoise(x: number, y: number, scale: number, seed: number, period = 0): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const wrap = (n: number) => (period > 0 ? ((n % period) + period) % period : n);
  const n = (ix: number, iy: number) => noise2(wrap(ix), wrap(iy), seed);
  const a = n(x0, y0) + (n(x0 + 1, y0) - n(x0, y0)) * sx;
  const b = n(x0, y0 + 1) + (n(x0 + 1, y0 + 1) - n(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

/** Positive modulo. */
export function pmod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Pick one of a ramp of tones from a 0..1 value. */
export function ramp(tones: readonly number[], t: number): number {
  const i = Math.max(0, Math.min(tones.length - 1, Math.floor(t * tones.length)));
  return tones[i]!;
}

/** Set a pixel only where the buffer is still transparent. */
export function setUnder(buf: PixelBuffer, x: number, y: number, color: number, alpha = 1): void {
  if (buf.get(x, y).alpha === 0) buf.set(x, y, color, alpha);
}

/** Tint every opaque pixel inside a polygon toward a colour (used for cast shadows). */
export function tintPoly(buf: PixelBuffer, pts: readonly Pt[], color: number, t: number): void {
  const mask = new PixelBuffer(buf.w, buf.h);
  mask.fillPoly(pts, 0xffffff);
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      if (mask.get(x, y).alpha === 0) continue;
      const px = buf.get(x, y);
      if (px.alpha === 0) continue;
      buf.set(x, y, mix(px.color, color, t));
    }
  }
}

/**
 * Give a separately painted `layer` its 1px dark edge, then composite it onto
 * `base`. Lets props/buildings get the sticker outline while the ground base
 * beneath them (which must fill its footprint exactly) stays un-outlined.
 */
export function stamp(base: PixelBuffer, layer: PixelBuffer, outlineColor: number): void {
  layer.outline(outlineColor);
  base.blit(layer);
}
