// src/art/grounds/tiles.ts — ground tile textures for the club grounds.
//
// Every tile is a TILE_W×TILE_H 2:1 diamond (top vertex at (TILE_W/2, 0), the
// same anchor GroundsScene uses with origin (0.5, 0)). Base textures are
// painted in iso ground space with noise whose lattice wraps every tile, so
// neighbouring tiles of the same material join seamlessly; only a very faint
// seam on each tile's two top edges keeps the grid readable for placement.
// Lawn variants add tufts/flowers/patches inside the tile so the lawn doesn't
// visibly repeat; GroundsScene picks one per cell via grassVariantKey().
import { TILE_W, TILE_H } from '../../config';
import { PixelBuffer, noise2, bayer, mix } from '../pixel';
import { IsoPainter, UNIT, valueNoise, pmod, ramp } from './iso3d';
import { GRASS, ROUGH, DIRT, STONE, WHITE } from './palette';
import { COLOR_TOKENS } from '../../ui/tokens';

/** Cell sides, named by grid direction: n = -gy, e = +gx, s = +gy, w = -gx. */
export type Side = 'n' | 'e' | 's' | 'w';
export const SIDES: readonly Side[] = ['n', 'e', 's', 'w'];

/** Overlay key for a path tile's curb on `side` (drawn where the neighbour isn't path). */
export function pathEdgeKey(side: Side): string {
  return `tile-edge-path-${side}`;
}

/** Overlay key for a dirt tile's grass fringe on `side` (drawn where the neighbour is lawn). */
export function dirtEdgeKey(side: Side): string {
  return `tile-edge-dirt-${side}`;
}

/** Seamless rough-grass texture tiled behind the whole grounds. */
export const SURROUND_KEY = 'tile-surround';

/** Lawn texture keys, in variant order. */
export const GRASS_KEYS = ['tile-grass', 'tile-grass-1', 'tile-grass-2'] as const;

/** Deterministic lawn variant for a cell (mostly plain, some tufts/flowers). */
export function grassVariantKey(gx: number, gy: number): (typeof GRASS_KEYS)[number] {
  const n = noise2(gx, gy, 77);
  if (n < 0.55) return GRASS_KEYS[0];
  if (n < 0.82) return GRASS_KEYS[1];
  return GRASS_KEYS[2];
}

// ── Shared tile plumbing ────────────────────────────────────────────────────

type GroundShade = (u: number, v: number, x: number, y: number) => number;

/** Fill a fresh tile diamond with a ground-space shade. */
function paintTile(shade: GroundShade): { buf: PixelBuffer; iso: IsoPainter } {
  const buf = new PixelBuffer(TILE_W, TILE_H);
  const iso = new IsoPainter(buf, TILE_W / 2, 0);
  iso.top(0, 0, UNIT, UNIT, 0, 0, shade);
  return { buf, iso };
}

/** Lawn seam strength: visible enough to count tiles by, faint enough not to read as graph paper. */
export const SEAM_T = 0.7;

/** Darken the tile's two top edges by `t` toward `color` — the faint grid seam. */
export function seam(buf: PixelBuffer, color: number, t: number): void {
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const px = buf.get(x, y);
      if (px.alpha === 0 || buf.get(x, y - 1).alpha !== 0) continue;
      buf.set(x, y, mix(px.color, color, t));
    }
  }
}

/** Two-octave tiling noise in ground space, dithered with the Bayer matrix. */
function groundNoise(u: number, v: number, x: number, y: number, seed: number, dither = 0.22): number {
  const a = valueNoise(u, v, 8, seed, UNIT / 8);
  const b = valueNoise(u, v, 4, seed + 1, UNIT / 4);
  return Math.max(0, Math.min(0.999, 0.65 * a + 0.35 * b + (bayer(x, y) - 0.5) * dither));
}

/** Deterministic feature spots inside the tile (kept off the edges). */
function spots(seed: number, count: number, margin = 5): { u: number; v: number }[] {
  const out: { u: number; v: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      u: margin + Math.floor(noise2(i, 1, seed) * (UNIT - margin * 2)),
      v: margin + Math.floor(noise2(i, 2, seed) * (UNIT - margin * 2)),
    });
  }
  return out;
}

// ── Grass ───────────────────────────────────────────────────────────────────

/**
 * Lawn base: mostly mid green, a gentle dithered swell and sparse speckles.
 * Kept low-contrast on purpose — it repeats every tile, so any strong shape
 * here would show as a pattern; the variants carry the bigger features.
 */
export function grassBase(u: number, v: number, x: number, y: number): number {
  const t = 0.5 + (groundNoise(u, v, x, y, 11, 0) - 0.5) * 0.7 + (bayer(x, y) - 0.5) * 0.3;
  // Speckles hashed on wrapped ground cells so they stay seamless.
  const s = noise2(pmod(Math.floor(u), UNIT), pmod(Math.floor(v), UNIT), 12);
  if (s < 0.05) return GRASS.dark;
  if (s > 0.96) return GRASS.light;
  return t < 0.3 ? GRASS.dark : t > 0.72 ? GRASS.light : GRASS.mid;
}

/** A little 3px-tall grass tuft: two dark blades with a light tip. */
function tuft(buf: PixelBuffer, x: number, y: number): void {
  buf.set(x, y, GRASS.dark);
  buf.set(x + 2, y, GRASS.dark);
  buf.set(x + 1, y, GRASS.dark);
  buf.set(x, y - 1, GRASS.light);
  buf.set(x + 2, y - 1, GRASS.hi);
  buf.set(x + 1, y - 2, GRASS.hi);
}

/** A tiny 3x3 daisy with a 1px shadow. */
function flower(buf: PixelBuffer, x: number, y: number, petal: number, centre: number): void {
  buf.set(x, y + 2, GRASS.dark);
  buf.set(x + 1, y + 1, GRASS.dark);
  buf.set(x, y - 1, petal);
  buf.set(x - 1, y, petal);
  buf.set(x + 1, y, petal);
  buf.set(x, y + 1, petal);
  buf.set(x, y, centre);
}

/** Lawn tile. variant 0 = plain, 1 = tufts + sun patch, 2 = flowers + clover. */
export function grassTile(variant: 0 | 1 | 2 = 0): PixelBuffer {
  const blob = (u: number, v: number, cu: number, cv: number, r: number, x: number, y: number) =>
    Math.hypot(u - cu, v - cv) / r < 0.55 + bayer(x, y) * 0.5;
  const { buf, iso } = paintTile((u, v, x, y) => {
    const base = grassBase(u, v, x, y);
    if (variant === 1 && blob(u, v, 17, 13, 9, x, y)) return base === GRASS.dark ? GRASS.mid : GRASS.light;
    if (variant === 2 && blob(u, v, 12, 19, 8, x, y)) return base === GRASS.light ? GRASS.mid : GRASS.dark;
    return base;
  });
  const tufts = variant === 0 ? 2 : variant === 1 ? 4 : 1;
  for (const s of spots(100 + variant, tufts, 6)) {
    const q = iso.p(s.u, s.v);
    tuft(buf, Math.round(q.x), Math.round(q.y));
  }
  if (variant === 2) {
    const colours = [WHITE, 0xffe36b, WHITE, 0xf7a8c8];
    spots(300, 4, 6).forEach((s, i) => {
      const q = iso.p(s.u, s.v);
      flower(buf, Math.round(q.x), Math.round(q.y), colours[i % colours.length]!, i % 2 ? 0xffb02e : 0xf2c94c);
    });
  }
  seam(buf, GRASS.seam, SEAM_T);
  return buf;
}

// ── Dirt ────────────────────────────────────────────────────────────────────

const DIRT_TONES = [DIRT.dark, DIRT.mid, DIRT.mid, DIRT.light] as const;

/** Worn, bare earth with pebbles and a couple of dark scuffs. */
export function dirtTile(): PixelBuffer {
  const { buf, iso } = paintTile((u, v, x, y) => {
    const t = groundNoise(u, v, x, y, 21, 0.35);
    const s = noise2(pmod(Math.floor(u), UNIT), pmod(Math.floor(v), UNIT), 22);
    if (s < 0.06) return DIRT.dark; // grit
    if (s > 0.97) return DIRT.hi;
    return ramp(DIRT_TONES, t);
  });
  for (const [i, s] of spots(400, 6, 4).entries()) {
    const q = iso.p(s.u, s.v);
    const x = Math.round(q.x);
    const y = Math.round(q.y);
    const big = i % 3 === 0;
    buf.set(x, y, STONE.light);
    buf.set(x + 1, y, STONE.mid);
    if (big) {
      buf.set(x, y + 1, STONE.mid);
      buf.set(x + 1, y + 1, STONE.dark);
      buf.set(x, y - 1, STONE.hi);
    }
    buf.set(x + (big ? 2 : 1), y + 1, DIRT.dark);
  }
  seam(buf, DIRT.dark, 0.35);
  return buf;
}

// ── Path (cobbled pavers) ───────────────────────────────────────────────────

const PAVER = 8; // ground units per paver (4×4 pavers per tile)

/** Paver (row, col) under a ground point, running-bond rows along u. */
function paverId(u: number, v: number): { row: number; col: number } {
  const row = Math.floor(v / PAVER);
  const col = Math.floor((u + (pmod(row, 2) ? PAVER / 2 : 0)) / PAVER);
  return { row: pmod(row, UNIT / PAVER), col: pmod(col, UNIT / PAVER) };
}

const PAVER_TONES = [STONE.mid, STONE.light, STONE.mid, 0xbcae95] as const;

/** Paver texture shade at a pixel — shared by path tiles and facility aprons. */
export function paverShade(iso: IsoPainter, x: number, y: number, tones: readonly number[] = PAVER_TONES): number {
  const at = (yy: number) => {
    const g = iso.groundAt(x, yy);
    const id = paverId(g.u, g.v);
    return id.row * 16 + id.col;
  };
  const id = at(y);
  if (at(y - 1) !== id) return STONE.mortar;
  if (at(y + 1) !== id) return STONE.dark;
  const base = tones[Math.floor(noise2(id, 5, 31) * tones.length)]!;
  if (at(y - 2) !== id) return mix(base, STONE.hi, 0.6);
  // A little grit so large pavers aren't flat fills.
  return noise2(x, y, 33) < 0.08 ? mix(base, STONE.dark, 0.35) : base;
}

/** Cobbled path tile. */
export function pathTile(): PixelBuffer {
  const buf = new PixelBuffer(TILE_W, TILE_H);
  const iso = new IsoPainter(buf, TILE_W / 2, 0);
  iso.top(0, 0, UNIT, UNIT, 0, 0, (_u, _v, x, y) => paverShade(iso, x, y));
  return buf;
}

// ── Edge overlays (drawn over a tile where its neighbour is a different material) ──

/** Ground-space distance from a point to a given cell side. */
function sideDist(side: Side, u: number, v: number): number {
  switch (side) {
    case 'n':
      return v;
    case 's':
      return UNIT - v;
    case 'w':
      return u;
    case 'e':
      return UNIT - u;
  }
}

/** Coordinate running along a side (for segmenting curb stones / fringe noise). */
function sideRun(side: Side, u: number, v: number): number {
  return side === 'n' || side === 's' ? u : v;
}

/** Tile diamond coverage mask (exactly the pixels a full tile fill covers). */
export function tileMask(): PixelBuffer {
  const mask = new PixelBuffer(TILE_W, TILE_H);
  new IsoPainter(mask, TILE_W / 2, 0).top(0, 0, UNIT, UNIT, 0, 0xffffff);
  return mask;
}

/** Paint a tile overlay: `shade` returns a colour, or null to leave the pixel clear. */
function overlay(shade: (u: number, v: number, x: number, y: number) => number | null): PixelBuffer {
  const buf = new PixelBuffer(TILE_W, TILE_H);
  const iso = new IsoPainter(buf, TILE_W / 2, 0);
  const mask = tileMask();
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (mask.get(x, y).alpha === 0) continue;
      const g = iso.groundAt(x, y);
      const c = shade(g.u, g.v, x, y);
      if (c !== null) buf.set(x, y, c);
    }
  }
  return buf;
}

/** Stone curb along one side of a path tile (2–3px band with joints). */
export function pathEdge(side: Side): PixelBuffer {
  return overlay((u, v) => {
    const d = sideDist(side, u, v);
    if (d >= 3) return null;
    if (d >= 2.2) return STONE.dark; // inner shadow line
    const joint = pmod(Math.floor(sideRun(side, u, v)), 8) === 0;
    return joint ? STONE.mortar : d < 1 ? STONE.hi : STONE.light;
  });
}

/** Ragged grass fringe creeping over a dirt tile's edge. */
export function dirtEdge(side: Side): PixelBuffer {
  return overlay((u, v, x, y) => {
    const d = sideDist(side, u, v);
    const reach = 1.5 + valueNoise(sideRun(side, u, v), 0, 3, 41 + SIDES.indexOf(side), UNIT / 3) * 4;
    if (d > reach) return null;
    return d > reach - 1 ? GRASS.dark : grassBase(u, v, x, y);
  });
}

// ── Placement highlights ────────────────────────────────────────────────────

/** Translucent ghost tile: dithered fill, bright 1px rim and corner ticks. */
export function highlightTile(ok: boolean): PixelBuffer {
  const fill = ok ? 0x5df07a : 0xff4a4a;
  const rim = ok ? 0xc6ffb8 : 0xffc0b0;
  const buf = new PixelBuffer(TILE_W, TILE_H);
  const iso = new IsoPainter(buf, TILE_W / 2, 0);
  const mask = tileMask();
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (mask.get(x, y).alpha === 0) continue;
      const edge =
        mask.get(x - 1, y).alpha === 0 ||
        mask.get(x + 1, y).alpha === 0 ||
        mask.get(x, y - 1).alpha === 0 ||
        mask.get(x, y + 1).alpha === 0;
      if (edge) buf.set(x, y, rim, 0.95);
      else buf.set(x, y, fill, bayer(x, y) < 0.5 ? 0.5 : 0.32);
    }
  }
  // Corner ticks just inside each vertex make the cell read as a target.
  const ticks: [number, number][] = [
    [3, 3],
    [UNIT - 3, 3],
    [UNIT - 3, UNIT - 3],
    [3, UNIT - 3],
  ];
  for (const [u, v] of ticks) iso.dot(u, v, 0, WHITE, 0.9);
  return buf;
}

/** The valid-spot tint colour (#395): the theme's positive token (src/ui/tokens.ts). */
export const VALID_TINT = parseInt(COLOR_TOKENS.pos.slice(1), 16);

/**
 * Soft tint on a cell where the footprint being placed fits (#395): a light
 * dithered wash with a faint rim, quiet enough that the ghost still reads first.
 */
export function validTile(): PixelBuffer {
  const buf = new PixelBuffer(TILE_W, TILE_H);
  const mask = tileMask();
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (mask.get(x, y).alpha === 0) continue;
      const edge = mask.get(x - 1, y).alpha === 0 || mask.get(x + 1, y).alpha === 0 || mask.get(x, y - 1).alpha === 0 || mask.get(x, y + 1).alpha === 0;
      buf.set(x, y, VALID_TINT, edge ? 0.75 : bayer(x, y) < 0.5 ? 0.4 : 0.24);
    }
  }
  return buf;
}

// ── Surround ────────────────────────────────────────────────────────────────

/** Size of the seamless rough-grass texture tiled behind the whole grounds. */
export const SURROUND_SIZE = 256;

/** Seamless rough grass for the area outside the club (TileSprite fill). */
export function surroundTexture(): PixelBuffer {
  const n = SURROUND_SIZE;
  const buf = new PixelBuffer(n, n);
  const tones = [ROUGH.dark, ROUGH.mid, ROUGH.mid, ROUGH.light] as const;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Two wrapped octaves keep the texture seamless when tiled.
      const a = valueNoise(x, y, 16, 51, n / 16);
      const c = valueNoise(x, y, 8, 53, n / 8);
      const t = 0.55 * a + 0.45 * c + (bayer(x, y) - 0.5) * 0.25;
      buf.set(x, y, ramp(tones, Math.max(0, Math.min(0.999, t))));
    }
  }
  // Scattered tufts (positions wrap so the texture stays seamless).
  for (let i = 0; i < 28; i++) {
    const x = Math.floor(noise2(i, 1, 57) * n);
    const y = Math.floor(noise2(i, 2, 57) * n);
    const at = (dx: number, dy: number, c: number) => buf.set(pmod(x + dx, n), pmod(y + dy, n), c);
    at(0, 0, ROUGH.dark);
    at(2, 0, ROUGH.dark);
    at(0, -1, ROUGH.hi);
    at(2, -1, ROUGH.light);
    at(1, -2, ROUGH.hi);
  }
  return buf;
}

/** Every tile texture as { key, buf } (§7 keys plus lawn variants and overlays). */
export function tileTextures(): { key: string; buf: PixelBuffer }[] {
  return [
    { key: GRASS_KEYS[0], buf: grassTile(0) },
    { key: GRASS_KEYS[1], buf: grassTile(1) },
    { key: GRASS_KEYS[2], buf: grassTile(2) },
    { key: 'tile-dirt', buf: dirtTile() },
    { key: 'tile-path', buf: pathTile() },
    { key: 'tile-highlight-ok', buf: highlightTile(true) },
    { key: 'tile-highlight-bad', buf: highlightTile(false) },
    { key: 'tile-valid', buf: validTile() },
    { key: SURROUND_KEY, buf: surroundTexture() },
    ...SIDES.map((s) => ({ key: pathEdgeKey(s), buf: pathEdge(s) })),
    ...SIDES.map((s) => ({ key: dirtEdgeKey(s), buf: dirtEdge(s) })),
  ];
}
