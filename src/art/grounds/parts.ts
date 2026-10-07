// src/art/grounds/parts.ts — reusable building parts for facility art.
//
// Walls, roofs (flat/gable/hip), windows, doors, sheared wall decals and
// small signage icons, all painted through an IsoPainter in ground space
// (see iso3d.ts). Lighting convention: light from the screen's top-left, so
// faces rank brightest → darkest as: −u roof slope, top, +v wall (screen
// left), −v roof slope, +u wall (screen right).
import { shade, mix, noise2, type Palette } from '../pixel';
import { IsoPainter, pmod, type PlaneShade } from './iso3d';
import { GLASS, OUTLINE, WHITE, CLUB, RED } from './palette';

// ── Wall surface shaders (plane coords: a = along wall, z = height) ─────────

/** Plain render with a faint grit. */
export function plaster(c: number): PlaneShade {
  return (_a, _z, x, y) => (noise2(x, y, 7) < 0.07 ? shade(c, 0.95) : c);
}

/** Running-bond brick: 3px courses, 6-unit bricks, mortar lines. */
export function brick(c: number, mortar: number): PlaneShade {
  return (a, z) => {
    const row = Math.floor(z / 3);
    if (pmod(z, 3) < 1) return mortar;
    const off = pmod(row, 2) ? 3 : 0;
    if (pmod(a + off, 6) < 1) return mortar;
    return noise2(Math.floor((a + off) / 6), row, 9) < 0.3 ? shade(c, 0.9) : c;
  };
}

/** Horizontal weatherboards with a shadow line under each board. */
export function boards(c: number): PlaneShade {
  return (_a, z) => (pmod(z, 4) < 1 ? shade(c, 0.8) : c);
}

/** Vertical ribbed cladding (corrugated sheet / panels). */
export function ribs(c: number, every = 3): PlaneShade {
  return (a) => (pmod(a, every) < 1 ? shade(c, 0.82) : c);
}

/** Roof tiles: courses follow height contours (parallel to the eave). */
export function roofTiles(c: number): (u: number, v: number, z: number, along: number) => number {
  return (_u, _v, z, along) => {
    const row = Math.floor(z / 3);
    if (pmod(z, 3) < 0.9) return shade(c, 0.78);
    return pmod(along + pmod(row, 2) * 3, 6) < 1 ? shade(c, 0.9) : c;
  };
}

/** Corrugated metal roof: ribs running down the slope. */
export function roofRibs(c: number): (u: number, v: number, z: number, along: number) => number {
  return (_u, _v, _z, along) => (pmod(along, 4) < 1 ? shade(c, 0.85) : pmod(along, 4) < 2 ? shade(c, 1.08) : c);
}

type RoofShade = (u: number, v: number, z: number, along: number) => number;

// ── Building block ──────────────────────────────────────────────────────────

export interface Block {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Wall height in px. */
  h: number;
}

/**
 * The two visible walls of a block, with an eave shadow band under the roof
 * line and a highlight on the front vertical corner.
 */
export function walls(iso: IsoPainter, b: Block, c: number, surface: (c: number) => PlaneShade): void {
  const left = c;
  const right = shade(c, 0.76);
  iso.wallV(b.v1, b.u0, b.u1, 0, b.h, left, surface(left));
  iso.wallU(b.u1, b.v0, b.v1, 0, b.h, right, surface(right));
  // Eave shadow: 2px darker band under the roof edge.
  iso.wallV(b.v1, b.u0, b.u1, b.h - 2, b.h, shade(left, 0.82));
  iso.wallU(b.u1, b.v0, b.v1, b.h - 2, b.h, shade(right, 0.82));
  // Plinth: 2px darker strip at ground level.
  iso.wallV(b.v1, b.u0, b.u1, 0, 2, shade(left, 0.7));
  iso.wallU(b.u1, b.v0, b.v1, 0, 2, shade(right, 0.7));
  // Front corner highlight (where the lit and shaded walls meet).
  iso.line([b.u1, b.v1, 2], [b.u1, b.v1, b.h - 3], mix(left, WHITE, 0.35));
}

/** Flat roof with a raised parapet rim and recessed membrane. */
export function flatRoof(iso: IsoPainter, b: Block, rim: number, membrane: number): void {
  iso.top(b.u0, b.v0, b.u1, b.v1, b.h, rim);
  iso.top(b.u0 + 3, b.v0 + 3, b.u1 - 3, b.v1 - 3, b.h, membrane, (u, v, x, y) =>
    u < b.u0 + 4 || v < b.v0 + 4 ? shade(membrane, 0.8) : noise2(x, y, 3) < 0.08 ? shade(membrane, 0.92) : membrane,
  );
  // Inner lip on the near edges catches light.
  iso.line([b.u0 + 3, b.v1 - 3, b.h], [b.u1 - 3, b.v1 - 3, b.h], mix(rim, WHITE, 0.3));
}

/** Plane z = a·u + b·v + c through three ground-space points. */
function planeOf(p: readonly [number, number, number][]): { a: number; b: number; c: number } {
  const [p1, p2, p3] = [p[0]!, p[1]!, p[2]!];
  const ux = p2[0] - p1[0];
  const uy = p2[1] - p1[1];
  const uz = p2[2] - p1[2];
  const vx = p3[0] - p1[0];
  const vy = p3[1] - p1[1];
  const vz = p3[2] - p1[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const a = -nx / nz;
  const b = -ny / nz;
  return { a, b, c: p1[2] - a * p1[0] - b * p1[1] };
}

/** Fill a sloped (non-vertical) face, shading with its ground-space (u, v, z). */
export function slope(
  iso: IsoPainter,
  pts: readonly [number, number, number][],
  color: number,
  roof: RoofShade,
  along: 'u' | 'v',
): void {
  const pl = planeOf(pts);
  iso.poly(pts, color, (x, y) => {
    // Invert the projection onto the plane z = a·u + b·v + c.
    const X = x + 0.5 - iso.ox;
    const v = (y + 0.5 - iso.oy + pl.c - X / 2 + pl.a * X) / (1 - pl.a - pl.b);
    const u = X + v;
    const z = pl.a * u + pl.b * v + pl.c;
    return roof(u, v, z, along === 'u' ? u : v);
  });
}

/** Light ridge line along a roof's apex. */
function ridge(iso: IsoPainter, a: [number, number, number], b: [number, number, number], c: number): void {
  iso.line(a, b, mix(c, WHITE, 0.45));
}

/** Gable roof with the ridge running along u (gable end on the +u wall). */
export function gableU(iso: IsoPainter, b: Block, rise: number, c: number, wall: number, roof = roofTiles, o = 2): void {
  const vm = (b.v0 + b.v1) / 2;
  const top = b.h + rise;
  slope(iso, [[b.u0 - o, b.v0 - o, b.h], [b.u1 + o, b.v0 - o, b.h], [b.u1 + o, vm, top], [b.u0 - o, vm, top]], shade(c, 0.78), roof(shade(c, 0.78)), 'u');
  iso.poly([[b.u1, b.v0, b.h], [b.u1, b.v1, b.h], [b.u1, vm, top]], shade(wall, 0.76));
  slope(iso, [[b.u0 - o, vm, top], [b.u1 + o, vm, top], [b.u1 + o, b.v1 + o, b.h], [b.u0 - o, b.v1 + o, b.h]], c, roof(c), 'u');
  ridge(iso, [b.u0 - o, vm, top], [b.u1 + o, vm, top], c);
}

/** Gable roof with the ridge running along v (gable end on the +v wall). */
export function gableV(iso: IsoPainter, b: Block, rise: number, c: number, wall: number, roof = roofTiles, o = 2): void {
  const um = (b.u0 + b.u1) / 2;
  const top = b.h + rise;
  slope(iso, [[b.u0 - o, b.v0 - o, b.h], [um, b.v0 - o, top], [um, b.v1 + o, top], [b.u0 - o, b.v1 + o, b.h]], shade(c, 1.1), roof(shade(c, 1.1)), 'v');
  iso.poly([[b.u0, b.v1, b.h], [b.u1, b.v1, b.h], [um, b.v1, top]], wall);
  slope(iso, [[um, b.v0 - o, top], [b.u1 + o, b.v0 - o, b.h], [b.u1 + o, b.v1 + o, b.h], [um, b.v1 + o, top]], shade(c, 0.74), roof(shade(c, 0.74)), 'v');
  ridge(iso, [um, b.v0 - o, top], [um, b.v1 + o, top], c);
}

/** Hip roof rising to a ridge (or a point, for square blocks). */
export function hipRoof(iso: IsoPainter, b: Block, rise: number, c: number, roof = roofTiles, o = 2): void {
  const um = (b.u0 + b.u1) / 2;
  const vm = (b.v0 + b.v1) / 2;
  const top = b.h + rise;
  const ru = Math.max(0, (b.u1 - b.u0 - (b.v1 - b.v0)) / 2); // ridge half-length along u
  const A: [number, number, number] = [um - ru, vm, top];
  const B: [number, number, number] = [um + ru, vm, top];
  const nw: [number, number, number] = [b.u0 - o, b.v0 - o, b.h];
  const ne: [number, number, number] = [b.u1 + o, b.v0 - o, b.h];
  const se: [number, number, number] = [b.u1 + o, b.v1 + o, b.h];
  const sw: [number, number, number] = [b.u0 - o, b.v1 + o, b.h];
  const back = shade(c, 0.8);
  const leftC = shade(c, 1.1);
  const rightC = shade(c, 0.72);
  slope(iso, ru > 0 ? [nw, ne, B, A] : [nw, ne, A], back, roof(back), 'u');
  slope(iso, [nw, A, sw], leftC, roof(leftC), 'v');
  slope(iso, ru > 0 ? [sw, A, B, se] : [sw, A, se], c, roof(c), 'u');
  slope(iso, [ne, se, B], rightC, roof(rightC), 'v');
  iso.line(sw, A, mix(c, WHITE, 0.3));
  iso.line(se, B, shade(c, 0.6));
  if (ru > 0) ridge(iso, A, B, c);
}

// ── Openings ────────────────────────────────────────────────────────────────

/** Glass with a diagonal glint. */
function glassShade(dark: boolean): PlaneShade {
  return (a, z) => (pmod(a - z * 2, 9) < 1.6 ? GLASS.hi : dark ? GLASS.dark : GLASS.mid);
}

/** Window on the lit (+v) wall: frame, glass, sill. */
export function windowV(iso: IsoPainter, v: number, u0: number, u1: number, z0: number, z1: number, frame = WHITE): void {
  iso.wallV(v, u0, u1, z0, z1, frame);
  iso.wallV(v, u0 + 1, u1 - 1, z0 + 1, z1 - 1, GLASS.mid, glassShade(false));
  iso.wallV(v, u0 + 1, u1 - 1, z1 - 2, z1 - 1, GLASS.dark); // head shadow
  iso.wallV(v, u0 - 1, u1 + 1, z0 - 1, z0, shade(frame, 0.8)); // sill
}

/** Window on the shaded (+u) wall. */
export function windowU(iso: IsoPainter, u: number, v0: number, v1: number, z0: number, z1: number, frame = WHITE): void {
  const f = shade(frame, 0.8);
  iso.wallU(u, v0, v1, z0, z1, f);
  iso.wallU(u, v0 + 1, v1 - 1, z0 + 1, z1 - 1, GLASS.dark, glassShade(true));
  iso.wallU(u, v0 - 1, v1 + 1, z0 - 1, z0, shade(f, 0.8));
}

/** Door on the lit (+v) wall with a frame, panel line and knob. */
export function doorV(iso: IsoPainter, v: number, u0: number, u1: number, h: number, c: number, frame = WHITE): void {
  iso.wallV(v, u0 - 1, u1 + 1, 0, h + 1, frame);
  iso.wallV(v, u0, u1, 0, h, c);
  iso.wallV(v, u0, u1, h - 1, h, shade(c, 0.75));
  iso.dot(u1 - 2, v, h / 2, CLUB.gold);
}

/** Door on the shaded (+u) wall. */
export function doorU(iso: IsoPainter, u: number, v0: number, v1: number, h: number, c: number, frame = WHITE): void {
  iso.wallU(u, v0 - 1, v1 + 1, 0, h + 1, shade(frame, 0.8));
  iso.wallU(u, v0, v1, 0, h, shade(c, 0.8));
  iso.dot(u, v1 - 2, h / 2, CLUB.gold);
}

/** Glass double doors on the lit wall. */
export function glassDoorV(iso: IsoPainter, v: number, u0: number, u1: number, h: number, frame: number): void {
  iso.wallV(v, u0 - 1, u1 + 1, 0, h + 1, frame);
  iso.wallV(v, u0, u1, 0, h, GLASS.mid, glassShade(false));
  const mid = (u0 + u1) / 2;
  iso.line([mid, v, 0], [mid, v, h], frame);
}

// ── Decals & signs ──────────────────────────────────────────────────────────

/**
 * Paint a palette grid onto the lit (+v) wall, sheared to sit flat on it: top-
 * left at ground point (u, v, z). Each grid column steps down ½px, so the icon
 * follows the wall's 2:1 slope.
 */
export function decalV(iso: IsoPainter, rows: readonly string[], pal: Palette, u: number, v: number, z: number): void {
  const o = iso.p(u, v, z);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]!];
      if (c === undefined) continue;
      iso.buf.set(Math.round(o.x) + i, Math.round(o.y + i / 2 - 0.25) + j, c);
    }
  });
}

/** Paint a palette grid onto the shaded (+u) wall (columns step up ½px). */
export function decalU(iso: IsoPainter, rows: readonly string[], pal: Palette, u: number, v: number, z: number): void {
  const o = iso.p(u, v, z);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = pal[row[i]!];
      if (c === undefined) continue;
      iso.buf.set(Math.round(o.x) + i, Math.round(o.y - i / 2 - 0.25) + j, c);
    }
  });
}

/** A sign board on the lit wall plane with an icon centred on it. */
export function signV(
  iso: IsoPainter,
  v: number,
  u0: number,
  z0: number,
  w: number,
  h: number,
  board: number,
  icon: readonly string[],
  pal: Palette,
): void {
  iso.wallV(v, u0, u0 + w, z0, z0 + h, shade(board, 0.7));
  iso.wallV(v, u0 + 1, u0 + w - 1, z0 + 1, z0 + h - 1, board);
  const iw = Math.max(...icon.map((r) => r.length));
  const iu = u0 + Math.floor((w - iw) / 2);
  decalV(iso, icon, pal, iu, v, z0 + Math.floor((h + icon.length) / 2));
}

// ── Icons (x = ink, y = accent, w = white) ──────────────────────────────────

export const ICON = {
  dumbbell: [
    '.xx.....xx.',
    'xxx.....xxx',
    'xxxxxxxxxxx',
    'xxx.....xxx',
    '.xx.....xx.',
  ],
  cross: [
    '..xxx..',
    '..xxx..',
    'xxxxxxx',
    'xxxxxxx',
    'xxxxxxx',
    '..xxx..',
    '..xxx..',
  ],
  cup: [
    '.y.y...',
    'y.y....',
    'xxxxxx.',
    'xwxxx.x',
    'xxxxx.x',
    'xxxxxx.',
    '.xxxx..',
  ],
  clipboard: [
    '..yyy..',
    'xxyyyxx',
    'xwwwwwx',
    'xwxxxwx',
    'xwwwwwx',
    'xwxxwwx',
    'xwwwwwx',
    'xxxxxxx',
  ],
  binoculars: [
    '.xx..xx.',
    'xxxxxxxx',
    'xxxxxxxx',
    'xwxxxwxx',
    'xxx..xxx',
    '.x....x.',
  ],
  cap: [
    '....x....',
    '..xxxxx..',
    'xxxxxxxxx',
    '..xxxxx.y',
    '..xxxxx.y',
    '........y',
  ],
  play: [
    'xxxxxxxxx',
    'x.......x',
    'x..y....x',
    'x..yy...x',
    'x..yyy..x',
    'x..yy...x',
    'x..y....x',
    'x.......x',
    'xxxxxxxxx',
  ],
  kettlebell: [
    '..xxx..',
    '.x...x.',
    '.x...x.',
    'xxxxxxx',
    'xxxxwxx',
    'xxxxxxx',
    '.xxxxx.',
  ],
  ball: [
    '..xxxx..',
    '.xwxxwx.',
    'xxxwwxxx',
    'xxwxxwxx',
    '.xxxxxx.',
  ],
} as const;

/** Palette for an icon in a given ink/accent. */
export function iconPal(ink: number, accent: number = CLUB.gold): Palette {
  return { x: ink, y: accent, w: WHITE };
}

/** Handy default palettes. */
export const PAL = {
  red: iconPal(RED.mid),
  dark: iconPal(OUTLINE),
} as const;
