// src/art/match/iso3d.ts — small iso-with-height painting helpers shared by the
// stadium generators. Grid coords (gx, gy) project exactly like world/iso.ts
// (screenX = (gx-gy)·TILE_W/2, screenY = (gx+gy)·TILE_H/2) and `z` lifts a point
// straight up the screen by z pixels. A `Canvas3D` wraps a PixelBuffer whose
// top-left sits at world (ox, oy), so painters work in grid/z units and never
// think about buffer offsets. Pure + Phaser-free.
import { PixelBuffer, noise2 } from '../pixel';
import { TILE_W, TILE_H } from '../../config';

export interface P3 {
  gx: number;
  gy: number;
  z: number;
}

const HW = TILE_W / 2;
const HH = TILE_H / 2;

/** World point for grid coords + height (offsetX = the field's centring offset). */
export function isoProject(gx: number, gy: number, z: number, offsetX: number): { x: number; y: number } {
  return { x: (gx - gy) * HW + offsetX, y: (gx + gy) * HH - z };
}

/** Inverse projection of a world point onto the ground plane (z = 0). */
export function isoUnproject(wx: number, wy: number, offsetX: number): { gx: number; gy: number } {
  const a = (wx - offsetX) / HW;
  const b = wy / HH;
  return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

/** A pixel buffer positioned in world space, painted in iso grid units. */
export class Canvas3D {
  readonly buf: PixelBuffer;
  /** World coords of the buffer's top-left pixel. */
  readonly ox: number;
  readonly oy: number;
  readonly offsetX: number;

  constructor(ox: number, oy: number, w: number, h: number, offsetX: number) {
    this.ox = Math.floor(ox);
    this.oy = Math.floor(oy);
    this.buf = new PixelBuffer(w, h);
    this.offsetX = offsetX;
  }

  /** Buffer-local pixel coords of a grid point. */
  at(gx: number, gy: number, z = 0): { x: number; y: number } {
    const w = isoProject(gx, gy, z, this.offsetX);
    return { x: w.x - this.ox, y: w.y - this.oy };
  }

  /** Fill a 3D polygon (projected) with a flat colour or per-pixel shade. */
  poly(pts: readonly P3[], color: number, shadeFn?: (x: number, y: number) => number): void {
    this.buf.fillPoly(
      pts.map((p) => this.at(p.gx, p.gy, p.z)),
      color,
      shadeFn,
    );
  }

  /** Straight line between two 3D points. */
  line(a: P3, b: P3, color: number, alpha = 1): void {
    const pa = this.at(a.gx, a.gy, a.z);
    const pb = this.at(b.gx, b.gy, b.z);
    this.buf.line(pa.x, pa.y, pb.x, pb.y, color, alpha);
  }

  /**
   * Vertical face spanning grid segment a→b (at z=0) up to height h:
   * `shadeFn(u, v)` gets u∈[0,1] along the segment and v px above the base.
   */
  face(
    a: { gx: number; gy: number },
    b: { gx: number; gy: number },
    z0: number,
    z1: number,
    color: number,
    shadeFn?: (u: number, v: number) => number,
  ): void {
    const pa = this.at(a.gx, a.gy, 0);
    const pb = this.at(b.gx, b.gy, 0);
    const pts = [
      { x: pa.x, y: pa.y - z0 },
      { x: pb.x, y: pb.y - z0 },
      { x: pb.x, y: pb.y - z1 },
      { x: pa.x, y: pa.y - z1 },
    ];
    const dx = pb.x - pa.x;
    this.buf.fillPoly(
      pts,
      color,
      shadeFn
        ? (x, y) => {
            const u = dx === 0 ? 0 : (x + 0.5 - pa.x) / dx;
            const baseY = pa.y + (pb.y - pa.y) * Math.max(0, Math.min(1, u));
            return shadeFn(Math.max(0, Math.min(1, u)), baseY - (y + 0.5));
          }
        : undefined,
    );
  }

  /** Axis-aligned box from (gx0,gy0)-(gx1,gy1), z0..z1, with the 3 visible faces. */
  box(
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    z0: number,
    z1: number,
    top: number,
    front: number,
    side: number,
  ): void {
    // Front face faces +gy (bottom-left on screen); side face faces +gx.
    this.face({ gx: gx0, gy: gy1 }, { gx: gx1, gy: gy1 }, z0, z1, front);
    this.face({ gx: gx1, gy: gy1 }, { gx: gx1, gy: gy0 }, z0, z1, side);
    this.poly(
      [
        { gx: gx0, gy: gy0, z: z1 },
        { gx: gx1, gy: gy0, z: z1 },
        { gx: gx1, gy: gy1, z: z1 },
        { gx: gx0, gy: gy1, z: z1 },
      ],
      top,
    );
  }
}

/**
 * Smooth value noise in [0,1): bilinear blend of a hashed lattice with cell
 * size `cell` px. Deterministic — used for tree canopies and grass clumps.
 */
export function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const n00 = noise2(x0, y0, seed);
  const n10 = noise2(x0 + 1, y0, seed);
  const n01 = noise2(x0, y0 + 1, seed);
  const n11 = noise2(x0 + 1, y0 + 1, seed);
  const a = n00 + (n10 - n00) * sx;
  const b = n01 + (n11 - n01) * sx;
  return a + (b - a) * sy;
}

/** A square, power-of-two noise table sampled with wrap-around (fast lookups). */
export interface NoiseTile {
  size: number;
  data: Float32Array;
}

/**
 * Periodic value-noise table (`cell` must divide `size`; size a power of two).
 * Painting multi-megapixel layers with per-pixel valueNoise is slow, so ground
 * passes sample precomputed tiles instead; mixing two tile sizes hides repeats.
 */
export function noiseTile(size: number, cell: number, seed: number): NoiseTile {
  const period = size / cell;
  const lattice = (ix: number, iy: number): number =>
    noise2(((ix % period) + period) % period, ((iy % period) + period) % period, seed);
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x / cell;
      const fy = y / cell;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const a = lattice(x0, y0) + (lattice(x0 + 1, y0) - lattice(x0, y0)) * sx;
      const b = lattice(x0, y0 + 1) + (lattice(x0 + 1, y0 + 1) - lattice(x0, y0 + 1)) * sx;
      data[y * size + x] = a + (b - a) * sy;
    }
  }
  return { size, data };
}

/** White-noise table (per-pixel hash) for sparse speckles. */
export function whiteTile(size: number, seed: number): NoiseTile {
  const data = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data[y * size + x] = noise2(x, y, seed);
  return { size, data };
}

/** Wrap-around lookup into a noise tile. */
export function sampleTile(t: NoiseTile, x: number, y: number): number {
  const m = t.size - 1;
  return t.data[((y & m) * t.size) + (x & m)] ?? 0;
}
