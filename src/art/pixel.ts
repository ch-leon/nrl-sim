// src/art/pixel.ts — tiny pixel-art engine for generated textures.
//
// ARCHITECTURE §1.4: no binary art in the repo. Instead of drawing vector shapes
// with Phaser.Graphics (which antialiases and reads as "placeholder"), art is
// authored as hard-edged pixels into a PixelBuffer, then uploaded once as a
// canvas texture. Two authoring styles are supported:
//
//   1. Sprite grids — rows of characters mapped through a Palette. Good for
//      characters, props and icons where every pixel is hand-placed.
//   2. Procedural painting — setPixel / fillRect / fillPoly / line on a buffer,
//      with a seeded noise helper for dithered grass, brick, roof tiles etc.
//
// Everything except `toTexture` is pure and Phaser-free so it can be unit tested
// under the node test environment.

/** Character → colour (0xRRGGBB). `.` and space are always transparent. */
export type Palette = Record<string, number>;

/** An RGBA pixel buffer with hard-edged drawing helpers. */
export class PixelBuffer {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = Math.max(1, Math.floor(w));
    this.h = Math.max(1, Math.floor(h));
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
  }

  /** Set one pixel (ignored when out of bounds). alpha 0..1. */
  set(x: number, y: number, color: number, alpha = 1): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const i = (iy * this.w + ix) * 4;
    const a = Math.round(alpha * 255);
    if (a >= 255 || this.data[i + 3] === 0) {
      this.data[i] = (color >> 16) & 0xff;
      this.data[i + 1] = (color >> 8) & 0xff;
      this.data[i + 2] = color & 0xff;
      this.data[i + 3] = Math.max(a, this.data[i + 3] ?? 0);
      return;
    }
    // Simple source-over blend onto an existing opaque-ish pixel.
    const t = a / 255;
    this.data[i] = Math.round((this.data[i] ?? 0) * (1 - t) + ((color >> 16) & 0xff) * t);
    this.data[i + 1] = Math.round((this.data[i + 1] ?? 0) * (1 - t) + ((color >> 8) & 0xff) * t);
    this.data[i + 2] = Math.round((this.data[i + 2] ?? 0) * (1 - t) + (color & 0xff) * t);
  }

  /** Read a pixel as { color, alpha(0..255) }; out of bounds → transparent. */
  get(x: number, y: number): { color: number; alpha: number } {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return { color: 0, alpha: 0 };
    const i = (Math.floor(y) * this.w + Math.floor(x)) * 4;
    const color = ((this.data[i] ?? 0) << 16) | ((this.data[i + 1] ?? 0) << 8) | (this.data[i + 2] ?? 0);
    return { color, alpha: this.data[i + 3] ?? 0 };
  }

  fillRect(x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
    for (let yy = Math.floor(y); yy < Math.floor(y + h); yy++) {
      for (let xx = Math.floor(x); xx < Math.floor(x + w); xx++) this.set(xx, yy, color, alpha);
    }
  }

  /** Bresenham line, inclusive of both endpoints. */
  line(x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 10_000; guard++) {
      this.set(ax, ay, color, alpha);
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        ax += sx;
      }
      if (e2 <= dx) {
        err += dx;
        ay += sy;
      }
    }
  }

  /**
   * Fill a polygon using pixel-centre sampling (even-odd rule). `shade` may
   * return a per-pixel colour (for noise/dither/gradients); otherwise `color`.
   */
  fillPoly(
    pts: readonly { x: number; y: number }[],
    color: number,
    shade?: (x: number, y: number) => number,
  ): void {
    if (pts.length < 3) return;
    const minY = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y))));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...pts.map((p) => p.y))));
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % pts.length]!;
        if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) {
          xs.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.ceil(xs[k]! - 0.5);
        const x1 = Math.floor(xs[k + 1]! - 0.5);
        for (let x = x0; x <= x1; x++) this.set(x, y, shade ? shade(x, y) : color);
      }
    }
  }

  /** Stroke a closed polygon outline. */
  strokePoly(pts: readonly { x: number; y: number }[], color: number, alpha = 1): void {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      this.line(a.x, a.y, b.x, b.y, color, alpha);
    }
  }

  /** Draw a palette sprite grid with its top-left at (ox, oy). */
  sprite(rows: readonly string[], palette: Palette, ox = 0, oy = 0, flipX = false): void {
    const width = Math.max(0, ...rows.map((r) => r.length));
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]!;
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c === undefined) continue;
        this.set(ox + (flipX ? width - 1 - x : x), oy + y, c);
      }
    });
  }

  /** Copy another buffer onto this one (alpha-aware) at (ox, oy). */
  blit(src: PixelBuffer, ox = 0, oy = 0): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const { color, alpha } = src.get(x, y);
        if (alpha > 0) this.set(ox + x, oy + y, color, alpha / 255);
      }
    }
  }

  /**
   * Add a 1px dark outline around every opaque pixel (on transparent
   * neighbours only). The classic pixel-art "sticker" edge.
   */
  outline(color: number): void {
    const mask = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y).alpha > 0) mask[y * this.w + x] = 1;
      }
    }
    const opaque = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < this.w && y < this.h && mask[y * this.w + x] === 1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (opaque(x, y)) continue;
        if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
          this.set(x, y, color);
        }
      }
    }
  }

  /** Count of pixels with any opacity (handy in tests). */
  opaqueCount(): number {
    let n = 0;
    for (let i = 3; i < this.data.length; i += 4) if ((this.data[i] ?? 0) > 0) n++;
    return n;
  }
}

/** Rasterise a palette grid to a fresh buffer sized to the grid. */
export function fromGrid(rows: readonly string[], palette: Palette, flipX = false): PixelBuffer {
  const w = Math.max(1, ...rows.map((r) => r.length));
  const buf = new PixelBuffer(w, rows.length);
  buf.sprite(rows, palette, 0, 0, flipX);
  return buf;
}

// ── Colour helpers ──────────────────────────────────────────────────────────

/** Scale an RGB colour toward black (f<1) or white-ish (f>1), clamped. */
export function shade(hex: number, f: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (ch((hex >> 16) & 0xff) << 16) | (ch((hex >> 8) & 0xff) << 8) | ch(hex & 0xff);
}

/** Linear blend between two colours (t=0 → a, t=1 → b). */
export function mix(a: number, b: number, t: number): number {
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    (lerp((a >> 16) & 0xff, (b >> 16) & 0xff) << 16) |
    (lerp((a >> 8) & 0xff, (b >> 8) & 0xff) << 8) |
    lerp(a & 0xff, b & 0xff)
  );
}

/** Parse `#rrggbb` / `#rgb` to an int (invalid → white). */
export function hexToInt(hex: string): number {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  const n = Number.parseInt(h, 16);
  return Number.isNaN(n) ? 0xffffff : n & 0xffffff;
}

/**
 * Deterministic 2D hash noise in [0,1). Same (x, y, seed) → same value, so
 * generated textures are stable across boots (no Math.random in art).
 */
export function noise2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 4x4 Bayer threshold in [0,1) — for ordered dithering between two tones. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER4[((y & 3) << 2) | (x & 3)] ?? 0) / 16;
}

// ── Iso geometry ────────────────────────────────────────────────────────────

/** The 2:1 iso diamond for a w×h-tile footprint, top vertex at (cx, top). */
export function isoDiamond(
  cx: number,
  top: number,
  wTiles: number,
  hTiles: number,
  tileW: number,
  tileH: number,
): { top: { x: number; y: number }; right: { x: number; y: number }; bottom: { x: number; y: number }; left: { x: number; y: number } } {
  const hw = tileW / 2;
  const hh = tileH / 2;
  return {
    top: { x: cx, y: top },
    right: { x: cx + wTiles * hw, y: top + wTiles * hh },
    bottom: { x: cx + (wTiles - hTiles) * hw, y: top + (wTiles + hTiles) * hh },
    left: { x: cx - hTiles * hw, y: top + hTiles * hh },
  };
}

// ── Phaser upload (the only non-pure function) ──────────────────────────────

/** Minimal structural view of Phaser's TextureManager used by toTexture. */
interface TextureHost {
  textures: {
    exists(key: string): boolean;
    remove(key: string): unknown;
    createCanvas(key: string, w: number, h: number): {
      getContext(): CanvasRenderingContext2D;
      refresh(): unknown;
    } | null;
  };
}

/** Upload a buffer as a canvas texture under `key` (replacing any existing). */
export function toTexture(scene: TextureHost, key: string, buf: PixelBuffer): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, buf.w, buf.h);
  if (!tex) return;
  const ctx = tex.getContext();
  const img = ctx.createImageData(buf.w, buf.h);
  img.data.set(buf.data);
  ctx.putImageData(img, 0, 0);
  tex.refresh();
}
