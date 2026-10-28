// src/art/match/stadium.ts — the generated match-day stadium.
//
// Paints the whole ground as two big pixel buffers:
//   • background — mown field with markings, grass apron, concourse, the back
//     grandstand (behind the top-right touchline), the grassy hill (behind the
//     top-left dead-ball line), corner blocks, back hoardings and floodlights.
//     Everything here sits BEHIND every player, so it renders at the lowest depth.
//   • foreground — the low terraces + hoardings along the two near edges
//     (bottom-left touchline, bottom-right dead-ball line). Everything here is in
//     FRONT of every player, so it renders above them.
// Splitting by "behind all / in front of all" is what lets one static image per
// layer depth-sort correctly against moving sprites; the only objects that need
// per-sprite sorting on the field itself are the goalposts (see posts.ts).
//
// Crowd people are separate sprites placed on the seat positions returned by
// crowdSeats() so they can bob and cheer (see crowd.ts). Structures are shaped so
// nothing ever occludes a seated spectator, which means each crowd layer can be
// drawn on top of its structure layer, sorted by y alone.
//
// Pure + deterministic (noise2/valueNoise, never Math.random). Light comes from
// the top-left: faces toward +gx (screen bottom-right) are the darker side.
import { mix, noise2, shade } from '../pixel';
import { FIELD_LONG, FIELD_WIDE, IN_GOAL_DEPTH, TEN_METRES, bonusZoneGrid } from '../../scenes/matchField';
import { Canvas3D, isoProject, isoUnproject, noiseTile, sampleTile, whiteTile, type NoiseTile, type P3 } from './iso3d';
import { drawText, textWidth } from './font';
import type { Kit } from './kit';
import { activeVocab } from '../../content';
import { BRAND, signText } from '../../brand';

// ── Geometry (grid units, z in px) ──────────────────────────────────────────

/** Distance of the hoarding ring outside the field edges. */
export const HOARD = 1.2;
export const HOARD_H = 10;
/** Outer edge of the concourse = where the stands begin. */
export const RING = 1.8;
export const TIER_D = 0.6;
export const BACK_TIERS = 6;
export const TIER_BASE = 6;
export const TIER_RISE = 7;
export const BACK_WALL_H = 24;
export const HILL_D = 3.8;
export const HILL_BASE = 5;
export const HILL_RISE = 9;
export const FRONT_TIERS = 3;
export const FRONT_BASE = 3;
export const FRONT_RISE = 4;

const X0 = -RING;
const X1 = FIELD_LONG + RING;
const Y0 = -RING;
const Y1 = FIELD_WIDE + RING;
const BACK_FAR = Y0 - BACK_TIERS * TIER_D;
const HILL_FAR = X0 - HILL_D;
const FRONT_FAR = Y1 + FRONT_TIERS * TIER_D;
const END_FAR = X1 + FRONT_TIERS * TIER_D;
const TRY_A = IN_GOAL_DEPTH;
const TRY_B = FIELD_LONG - IN_GOAL_DEPTH;

/**
 * Goalpost geometry shared with posts.ts and the ground-shadow painter. The
 * uprights stand on the bonus zone's sides (the rule file's 5.5 m gap, goals.ts),
 * so the zone painted between them is the one the sim scores (#77).
 */
const ZONE_R = bonusZoneGrid(1);
export const POST_GY = [ZONE_R.y0, ZONE_R.y1] as const;
export const POST_GX = [TRY_A, TRY_B] as const;
export const POST_H = 84;
export const CROSSBAR_Z = 30;

// The painted extent: generous margins so the camera never shows the void.
const EXT = { gx0: -8, gx1: 36, gy0: -8.5, gy1: 24, zTop: 190 };

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** World rect covered by the background buffer. */
export function stadiumWorldBounds(offsetX: number): WorldRect {
  const pts = [
    isoProject(EXT.gx0, EXT.gy1, 0, offsetX),
    isoProject(EXT.gx1, EXT.gy0, 0, offsetX),
    isoProject(EXT.gx0, EXT.gy0, EXT.zTop, offsetX),
    isoProject(EXT.gx1, EXT.gy1, 0, offsetX),
  ];
  const minX = Math.floor(Math.min(...pts.map((p) => p.x)));
  const maxX = Math.ceil(Math.max(...pts.map((p) => p.x)));
  const minY = Math.floor(Math.min(...pts.map((p) => p.y)));
  const maxY = Math.ceil(Math.max(...pts.map((p) => p.y)));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Camera bounds: the stands and terraces with a little surround, but not the
 * far corners of the painted extent.
 */
export function cameraWorldBounds(offsetX: number): WorldRect {
  const left = isoProject(HILL_FAR - 1, Y1 + 1, 0, offsetX).x;
  const right = isoProject(X1 + 1, BACK_FAR - 1, 0, offsetX).x;
  const top = isoProject(X0, BACK_FAR, TIER_BASE + BACK_TIERS * TIER_RISE + BACK_WALL_H + 30, offsetX).y;
  const bottom = isoProject(END_FAR + 0.5, FRONT_FAR + 0.5, 0, offsetX).y;
  return { x: Math.floor(left), y: Math.floor(top), width: Math.ceil(right - left), height: Math.ceil(bottom - top) };
}

// ── Palette ─────────────────────────────────────────────────────────────────

export const PAL = {
  grassA: 0x5fb24a,
  grassB: 0x4fa03f,
  inGoalA: 0x4b9a44,
  inGoalB: 0x43903e,
  apron: 0x3f8a37,
  line: 0xf3f5ec,
  concrete: 0xc4baa6,
  concreteSeam: 0xaea591,
  tread: 0xd6cdb9,
  riser: 0x968b7a,
  riserTop: 0x6e6559,
  standSide: 0xa79c89,
  wall: 0xe6e0d0,
  window: 0x4e5f7a,
  windowLit: 0x8fb4d8,
  roof: 0x9ca6b0,
  roofEdge: 0x6a7480,
  hillA: 0x58a845,
  hillB: 0x4c993e,
  earth: 0x8a6a46,
  treeDark: 0x214a2a,
  treeMid: 0x2d6434,
  treeLight: 0x3f8240,
  board: 0x23202e,
  pole: 0x8d929c,
  poleShade: 0x60656f,
  lamp: 0xfff4c4,
  shadow: 0x000000,
  /** The bonus zone's tint over the in-goal grass (#77). */
  zone: 0xeef6b8,
};

// ── Ground pass ─────────────────────────────────────────────────────────────

/** Snap a line position so 64·L is an integer → perfectly regular 2:1 steps. */
function snap(v: number): number {
  return Math.round(v * 64) / 64;
}

const TEN_M_LINES = Array.from({ length: 9 }, (_, i) => snap(TRY_A + (i + 1) * TEN_METRES));
const HALFWAY = snap(TRY_A + 5 * TEN_METRES);

/**
 * Is this field pixel on a white marking? Works in the "n = sx + 2sy" lattice so
 * every 2:1 iso line rasterises as clean 2-pixel steps (see snap()). O(1): the
 * nearest 10m line is found arithmetically rather than by scanning.
 */
const THIN = 1 / 64;
const THICK = 2 / 64;
const DASH_GY = [snap(FIELD_WIDE * 0.16), snap(FIELD_WIDE * 0.84)] as const;
function onMarking(gx: number, gy: number): boolean {
  // Lines of constant gx (across the field).
  if (Math.abs(gx - TRY_A) < THICK || Math.abs(gx - TRY_B) < THICK) return true;
  if (gx < THICK || Math.abs(gx - FIELD_LONG) < THICK) return true;
  if (Math.abs(gx - HALFWAY) < THICK) return true;
  const k = Math.round((gx - TRY_A) / TEN_METRES);
  const L = k >= 1 && k <= 9 ? TEN_M_LINES[k - 1]! : -99;
  if (Math.abs(gx - L) < THIN) return true;
  // Touchlines (constant gy), full length incl. in-goal.
  if (gy < THICK || Math.abs(gy - FIELD_WIDE) < THICK) return true;
  // 10m-from-touch dashes on every 10m line.
  if (Math.abs(gx - L) < 0.18 && (Math.abs(gy - DASH_GY[0]) < THIN || Math.abs(gy - DASH_GY[1]) < THIN)) return true;
  // Centre spot.
  return Math.abs(gx - HALFWAY) < 0.09 && Math.abs(gy - FIELD_WIDE / 2) < 0.09;
}

/**
 * The bonus zone (Nines, #77): the in-goal between the uprights at each end, from
 * the rule file (matchField.bonusZoneGrid), snapped like the other lines. A lighter
 * band with a thin dashed edge on its three open sides, quieter than the try line
 * it hangs off (that line is solid and twice as thick).
 */
const ZONES = [bonusZoneGrid(-1), bonusZoneGrid(1)].map((z) => ({
  x0: snap(z.x0),
  x1: snap(z.x1),
  y0: snap(z.y0),
  y1: snap(z.y1),
  /** The try line it hangs off, and the dead-ball side opposite. */
  line: z.x0 < FIELD_LONG / 2 ? snap(z.x1) : snap(z.x0),
  back: z.x0 < FIELD_LONG / 2 ? snap(z.x0) : snap(z.x1),
}));
/** Dash length and period along the zone's edge, tiles. */
const ZONE_DASH = 0.2;
const ZONE_DASH_PERIOD = 0.36;
const ZONE_EDGE = 2;
const ZONE_IN = 1;

/** 0 outside a bonus zone, ZONE_IN inside, ZONE_EDGE on a dash of its edge. */
function zoneMark(gx: number, gy: number): number {
  for (const z of ZONES) {
    if (gx < z.x0 - THIN || gx > z.x1 + THIN || gy < z.y0 - THIN || gy > z.y1 + THIN) continue;
    const side = Math.abs(gy - z.y0) < THIN || Math.abs(gy - z.y1) < THIN;
    if (side && Math.abs(gx - z.line) % ZONE_DASH_PERIOD < ZONE_DASH) return ZONE_EDGE;
    if (Math.abs(gx - z.back) < THIN && (gy - z.y0) % ZONE_DASH_PERIOD < ZONE_DASH) return ZONE_EDGE;
    return gx >= z.x0 && gx <= z.x1 && gy >= z.y0 && gy <= z.y1 ? ZONE_IN : 0;
  }
  return 0;
}

/** Long thin post shadows thrown toward +gx (light from the top-left). */
function inPostShadow(gx: number, gy: number): boolean {
  for (const px of POST_GX) {
    if (gx < px || gx > px + 2.6) continue;
    for (const py of POST_GY) if (Math.abs(gy - py) < 0.05) return true;
    // Crossbar shadow: a band offset along +gx at crossbar height.
    if (Math.abs(gx - (px + 0.95)) < 0.05 && gy > POST_GY[0] && gy < POST_GY[1]) return true;
  }
  return false;
}

/** Base + three variants (lit clump, shaded clump, bright blade, dark blade). */
function tones(base: number): [number, number, number, number, number] {
  return [base, shade(base, 1.05), shade(base, 0.96), shade(base, 1.14), shade(base, 0.86)];
}

interface GroundTex {
  clump: NoiseTile;
  tree: NoiseTile;
  speck: NoiseTile;
}

let groundTexCache: GroundTex | null = null;
/** Shared noise tiles (built once per session; deterministic). */
function groundTex(): GroundTex {
  groundTexCache ??= { clump: noiseTile(128, 8, 11), tree: noiseTile(256, 16, 41), speck: whiteTile(256, 7) };
  return groundTexCache;
}

const T_GRASS_A = tones(PAL.grassA);
const T_GRASS_B = tones(PAL.grassB);
const T_INGOAL_A = tones(PAL.inGoalA);
const T_INGOAL_B = tones(PAL.inGoalB);
const T_APRON = tones(PAL.apron);

function textured(t: readonly number[], clump: number, n: number): number {
  if (n < 0.035) return t[3]!;
  if (n > 0.972) return t[4]!;
  return clump > 0.66 ? t[1]! : clump < 0.3 ? t[2]! : t[0]!;
}

function grassColor(gx: number, x: number, y: number, tex: GroundTex): number {
  let t: readonly number[];
  if (gx < TRY_A || gx > TRY_B) {
    t = Math.floor(gx * 2) % 2 === 0 ? T_INGOAL_A : T_INGOAL_B;
  } else {
    t = Math.floor((gx - TRY_A) / TEN_METRES) % 2 === 0 ? T_GRASS_A : T_GRASS_B;
  }
  return textured(t, sampleTile(tex.clump, x, y), sampleTile(tex.speck, x, y));
}

function concourseColor(gx: number, gy: number): number {
  // Paving slabs: seams every half tile.
  const sx = gx * 2 - Math.floor(gx * 2);
  const sy = gy * 2 - Math.floor(gy * 2);
  return sx < 0.05 || sy < 0.05 ? PAL.concreteSeam : PAL.concrete;
}

function outsideColor(x: number, y: number, tex: GroundTex): number {
  // Tree canopy: soft blobs lit from the top-left (sample offset toward the
  // light: brighter there → lit rim), with sparse leaf speckle.
  const v = sampleTile(tex.tree, x, y);
  if (v < 0.36) return PAL.treeDark;
  if (sampleTile(tex.tree, x - 4, y - 4) > v + 0.035) return PAL.treeLight;
  const n = sampleTile(tex.speck, x + 101, y + 37);
  if (n < 0.05) return PAL.treeLight;
  return n > 0.95 ? PAL.treeDark : PAL.treeMid;
}

function paintGround(cv: Canvas3D): void {
  const { buf } = cv;
  const d = buf.data;
  const tex = groundTex();
  const shadowMix = (c: number): number => mix(c, PAL.shadow, 0.28);
  const hw = 32;
  const hh = 16;
  for (let y = 0; y < buf.h; y++) {
    const b = (y + cv.oy + 0.5) / hh;
    for (let x = 0; x < buf.w; x++) {
      const a = (x + cv.ox + 0.5 - cv.offsetX) / hw;
      const gx = (a + b) / 2;
      const gy = (b - a) / 2;
      let c: number;
      if (gx >= 0 && gx <= FIELD_LONG && gy >= 0 && gy <= FIELD_WIDE) {
        if (onMarking(gx, gy)) c = PAL.line;
        else {
          c = grassColor(gx, x, y, tex);
          const z = zoneMark(gx, gy);
          if (z === ZONE_EDGE) c = mix(c, PAL.line, 0.6);
          else if (z === ZONE_IN) c = mix(c, PAL.zone, 0.24);
        }
        if (inPostShadow(gx, gy)) c = shadowMix(c);
      } else if (gx >= -HOARD && gx <= FIELD_LONG + HOARD && gy >= -HOARD && gy <= FIELD_WIDE + HOARD) {
        c = textured(T_APRON, sampleTile(tex.clump, x + 61, y + 17), sampleTile(tex.speck, x + 13, y + 71));
      } else if (gx >= X0 && gx <= X1 && gy >= Y0 && gy <= Y1) {
        c = concourseColor(gx, gy);
      } else {
        c = outsideColor(x, y, tex);
      }
      const i = (y * buf.w + x) * 4;
      d[i] = (c >> 16) & 0xff;
      d[i + 1] = (c >> 8) & 0xff;
      d[i + 2] = c & 0xff;
      d[i + 3] = 255;
    }
  }
}

// ── Hoardings ───────────────────────────────────────────────────────────────

export interface Panel {
  bg: number;
  fg: number;
  text: string;
}

/**
 * The hoardings' panels. The words are the content pack's (#361) and the game's own
 * sign is the brand's (#363); the colours are the art's. Exported for tests.
 */
export function panelsFor(home: Kit, away: Kit): Panel[] {
  const signs = activeVocab().stadiumSigns;
  return [
    { bg: 0xd8443a, fg: 0xffffff, text: signs.food },
    { bg: 0x2b5fd9, fg: 0xffe14d, text: signs.sport },
    { bg: home.jersey, fg: home.trim, text: signs.home },
    { bg: 0xffe14d, fg: 0x1c1424, text: brandSign() },
    { bg: 0x1c1424, fg: 0x7be05a, text: signs.snack },
    { bg: 0xffffff, fg: 0xd8443a, text: signs.score },
    { bg: away.jersey, fg: away.trim, text: signs.away },
    { bg: 0xf08a24, fg: 0x1c1424, text: signs.cheer },
  ];
}

const PANEL_PX = 112;

/** The brand's sign: its title text, or its short name when the title will not fit a panel. */
export function brandSign(brand = BRAND): string {
  return signText(brand, textWidth, PANEL_PX - 4);
}

/** Render a flat (unsheared) hoarding strip `w` px long. */
function hoardingStrip(w: number, panels: readonly Panel[], seed: number): { w: number; h: number; px: (x: number, y: number) => number } {
  const h = HOARD_H;
  const cols = new Uint32Array(w * h);
  for (let x = 0; x < w; x++) {
    const pi = Math.floor(x / PANEL_PX);
    const p = panels[(pi + seed) % panels.length]!;
    for (let y = 0; y < h; y++) {
      let c = p.bg;
      if (y === 0) c = PAL.board; // top frame
      else if (y === h - 1) c = shade(p.bg, 0.7); // shaded foot
      else if (x % PANEL_PX === 0) c = PAL.board; // panel seam
      else if (y === 1) c = mix(p.bg, 0xffffff, 0.25); // top highlight
      cols[y * w + x] = c;
    }
  }
  // Text, repeated per panel and centred.
  for (let pi = 0; pi * PANEL_PX < w; pi++) {
    const p = panels[(pi + seed) % panels.length]!;
    const tw = textWidth(p.text);
    const tx = pi * PANEL_PX + Math.floor((PANEL_PX - tw) / 2);
    drawText(p.text, (gx, gy) => {
      const x = tx + gx;
      const y = 2 + gy;
      if (x >= 0 && x < w && y < h - 1) cols[y * w + x] = p.fg;
    });
  }
  return { w, h, px: (x, y) => cols[y * w + x] ?? 0 };
}

/**
 * Shear a strip onto the canvas along an iso edge. `dir` +1 runs along +gx
 * (screen slope +½), -1 runs along -gy from the far end (screen slope -½).
 */
function blitBoard(cv: Canvas3D, start: { gx: number; gy: number }, lengthTiles: number, dir: 1 | -1, panels: readonly Panel[], seed: number): void {
  const s = cv.at(start.gx, start.gy, 0);
  const w = Math.round(lengthTiles * 32);
  const strip = hoardingStrip(w, panels, seed);
  for (let x = 0; x < w; x++) {
    const baseY = s.y + (dir === 1 ? Math.floor(x / 2) : -Math.floor(x / 2));
    for (let r = 0; r < strip.h; r++) {
      cv.buf.set(s.x + x, baseY - strip.h + r, strip.px(x, r));
    }
    // Board shadow on the ground behind/below (toward +gx is the dark side).
    cv.buf.set(s.x + x, baseY, 0x000000, 0.22);
  }
}

// ── Structures ──────────────────────────────────────────────────────────────

function seatColor(kit: Kit, k: number): number {
  return k % 2 === 0 ? shade(kit.jersey, 0.85) : shade(kit.jersey, 0.7);
}

/** The back grandstand along the top-right touchline (gy < 0). */
function paintBackStand(cv: Canvas3D, home: Kit): void {
  const zTop = TIER_BASE + (BACK_TIERS - 1) * TIER_RISE;
  const wallTop = zTop + BACK_WALL_H;
  // Back wall + roof first (farthest).
  cv.face({ gx: X0, gy: BACK_FAR }, { gx: X1, gy: BACK_FAR }, 0, wallTop, PAL.wall, (u, v) => {
    const px = Math.floor(u * (X1 - X0) * 32);
    const vv = Math.floor(v);
    if (vv >= wallTop - 4) return vv >= wallTop - 2 ? home.trim : home.jersey; // fascia
    if (vv > zTop + 4 && vv < wallTop - 7) {
      // Corporate-box windows.
      const inWin = px % 14 < 10 && vv % 8 < 5;
      if (inWin) return noise2(px >> 4, vv >> 3, 5) < 0.3 ? PAL.windowLit : PAL.window;
    }
    return vv % 8 === 7 ? shade(PAL.wall, 0.92) : PAL.wall;
  });
  cv.poly(
    [
      { gx: X0, gy: BACK_FAR, z: wallTop },
      { gx: X1, gy: BACK_FAR, z: wallTop },
      { gx: X1, gy: BACK_FAR - 1.2, z: wallTop + 2 },
      { gx: X0, gy: BACK_FAR - 1.2, z: wallTop + 2 },
    ],
    PAL.roof,
    (x, y) => ((x + y * 2) % 12 === 0 ? PAL.roofEdge : PAL.roof),
  );
  // Tiers back → front.
  for (let k = BACK_TIERS - 1; k >= 0; k--) {
    const g0 = Y0 - k * TIER_D;
    const g1 = g0 - TIER_D;
    const z = TIER_BASE + k * TIER_RISE;
    // Riser (front face, faces +gy).
    cv.face({ gx: X0, gy: g0 }, { gx: X1, gy: g0 }, 0, z, PAL.riser, (_u, v) =>
      v > z - 1.5 ? PAL.riserTop : v > z - 3 ? shade(PAL.riser, 0.9) : PAL.riser,
    );
    // Tread with a seat row along its back half.
    const seat = seatColor(home, k);
    cv.poly(
      [
        { gx: X0, gy: g1, z },
        { gx: X1, gy: g1, z },
        { gx: X1, gy: g0, z },
        { gx: X0, gy: g0, z },
      ],
      PAL.tread,
      (x, y) => {
        const wx = x + cv.ox + 0.5;
        const wy = y + cv.oy + 0.5 + z;
        const { gx, gy } = isoUnproject(wx, wy, cv.offsetX);
        const t = (g0 - gy) / TIER_D; // 0 front lip → 1 back
        if (t < 0.12) return mix(PAL.tread, 0xffffff, 0.3); // lit lip
        if (t > 0.45) {
          const slot = (gx * 3.4) % 1;
          return slot < 0.75 ? seat : shade(seat, 0.75);
        }
        return PAL.tread;
      },
    );
  }
  // Right end face (faces +gx): stepped profile.
  const prof: P3[] = [{ gx: X1, gy: Y0, z: 0 }];
  for (let k = 0; k < BACK_TIERS; k++) {
    const g0 = Y0 - k * TIER_D;
    const z = TIER_BASE + k * TIER_RISE;
    prof.push({ gx: X1, gy: g0, z }, { gx: X1, gy: g0 - TIER_D, z });
  }
  prof.push({ gx: X1, gy: BACK_FAR, z: wallTop }, { gx: X1, gy: BACK_FAR - 1.2, z: wallTop + 2 }, { gx: X1, gy: BACK_FAR - 1.2, z: 0 });
  cv.poly(prof, PAL.standSide, (x, y) => (noise2(x, y, 21) < 0.05 ? shade(PAL.standSide, 0.92) : PAL.standSide));
}

/** Grassy hill behind the top-left dead-ball line (gx < 0). */
function paintHill(cv: Canvas3D): void {
  const zFar = HILL_BASE + HILL_D * HILL_RISE;
  // Retaining wall (faces +gx).
  cv.face({ gx: X0, gy: Y1 }, { gx: X0, gy: Y0 }, 0, HILL_BASE, PAL.riser, (_u, v) =>
    v > HILL_BASE - 1.5 ? PAL.riserTop : PAL.riser,
  );
  // Slope.
  cv.poly(
    [
      { gx: X0, gy: Y0, z: HILL_BASE },
      { gx: X0, gy: Y1, z: HILL_BASE },
      { gx: HILL_FAR, gy: Y1, z: zFar },
      { gx: HILL_FAR, gy: Y0, z: zFar },
    ],
    PAL.hillA,
    (x, y) => {
      const tex = groundTex();
      const n = sampleTile(tex.speck, x + 7, y + 211);
      const clump = sampleTile(tex.clump, x + 29, y + 3);
      let c = clump > 0.6 ? PAL.hillA : clump < 0.35 ? PAL.hillB : mix(PAL.hillA, PAL.hillB, 0.5);
      if (n < 0.04) c = shade(c, 1.15);
      return c;
    },
  );
  // Near side cut (faces +gy): earth bank.
  cv.poly(
    [
      { gx: X0, gy: Y1, z: 0 },
      { gx: X0, gy: Y1, z: HILL_BASE },
      { gx: HILL_FAR, gy: Y1, z: zFar },
      { gx: HILL_FAR, gy: Y1, z: 0 },
    ],
    PAL.earth,
    (x, y) => (noise2(x, y, 37) < 0.15 ? shade(PAL.earth, 0.85) : PAL.earth),
  );
}

function paintCornerBlocks(cv: Canvas3D, home: Kit): void {
  // Back corner (farthest): club building with a fascia stripe.
  cv.box(HILL_FAR, BACK_FAR - 1.2, X0, Y0, 0, 58, PAL.roof, PAL.wall, shade(PAL.wall, 0.82));
  cv.face({ gx: HILL_FAR, gy: Y0 }, { gx: X0, gy: Y0 }, 50, 56, home.jersey);
  cv.face({ gx: X0, gy: Y0 }, { gx: X0, gy: BACK_FAR - 1.2 }, 50, 56, shade(home.jersey, 0.8));
  // Back-right corner block.
  cv.box(X1, BACK_FAR - 1.2, X1 + 2.6, Y0, 0, 46, PAL.roof, PAL.wall, shade(PAL.wall, 0.82));
  cv.face({ gx: X1, gy: Y0 }, { gx: X1 + 2.6, gy: Y0 }, 38, 44, home.trim);
  cv.face({ gx: X1 + 2.6, gy: Y0 }, { gx: X1 + 2.6, gy: BACK_FAR - 1.2 }, 38, 44, shade(home.trim, 0.8));
  // Left corner (near the hill's front): a pie kiosk with a striped awning.
  const k0 = HILL_FAR + 0.6;
  const k1 = X0 - 0.4;
  const ky0 = Y1 + 0.3;
  const ky1 = Y1 + 2.0;
  cv.face({ gx: k0, gy: ky1 }, { gx: k1, gy: ky1 }, 0, 20, PAL.wall, (u, v) => {
    const px = Math.floor(u * (k1 - k0) * 32);
    if (v > 6 && v < 15 && px % 26 > 3 && px % 26 < 22) return v > 13 ? 0x2a2733 : 0x4e5f7a; // serving hatch
    return v < 2 ? shade(PAL.wall, 0.85) : PAL.wall;
  });
  cv.face({ gx: k1, gy: ky1 }, { gx: k1, gy: ky0 }, 0, 20, shade(PAL.wall, 0.82));
  cv.poly(
    [
      { gx: k0 - 0.1, gy: ky0, z: 23 },
      { gx: k1 + 0.1, gy: ky0, z: 23 },
      { gx: k1 + 0.1, gy: ky1 + 0.1, z: 19 },
      { gx: k0 - 0.1, gy: ky1 + 0.1, z: 19 },
    ],
    0xd8443a,
    (x, y) => {
      const { gx } = isoUnproject(x + cv.ox + 0.5, y + cv.oy + 0.5 + 21, cv.offsetX);
      return Math.floor(gx * 3) % 2 === 0 ? 0xd8443a : 0xf6f2e8;
    },
  );
}

/** The floodlight towers (ground position + pole height in px). */
export const FLOODLIGHT_TOWERS: readonly { gx: number; gy: number; h: number }[] = [
  { gx: HILL_FAR + 1.6, gy: BACK_FAR - 0.4, h: 150 },
  { gx: X1 + 1.3, gy: BACK_FAR - 0.4, h: 150 },
  { gx: HILL_FAR + 0.4, gy: Y1 + 3.4, h: 150 },
];

/**
 * World-space centre of each tower's light bank (see paintTower: a 19×13 frame
 * whose top-left sits 12px above the pole top). Used by the dusk/night lighting
 * pass to hang glows exactly on the painted lamps.
 */
export function floodlightLamps(offsetX: number): { x: number; y: number }[] {
  return FLOODLIGHT_TOWERS.map((t) => {
    const b = isoProject(t.gx, t.gy, 0, offsetX);
    return { x: Math.floor(b.x) + 0.5, y: Math.floor(b.y) - t.h - 5.5 };
  });
}

/**
 * The back grandstand's corporate-box window band as a world-space segment
 * (left end → right end, at mid-band height). The lighting pass lays its
 * "lit stand" glow along it.
 */
export function backStandWindowBand(offsetX: number): { a: { x: number; y: number }; b: { x: number; y: number } } {
  const zTop = TIER_BASE + (BACK_TIERS - 1) * TIER_RISE;
  const z = zTop + (BACK_WALL_H - 3) / 2 + 2;
  return { a: isoProject(X0, BACK_FAR, z, offsetX), b: isoProject(X1, BACK_FAR, z, offsetX) };
}

/** The back grandstand's tiers (seat rows) as a world-space segment at mid-rake. */
export function backStandTiers(offsetX: number): { a: { x: number; y: number }; b: { x: number; y: number } } {
  const gy = Y0 - (BACK_TIERS * TIER_D) / 2;
  const z = TIER_BASE + ((BACK_TIERS - 1) * TIER_RISE) / 2;
  return { a: isoProject(X0, gy, z, offsetX), b: isoProject(X1, gy, z, offsetX) };
}

function paintTower(cv: Canvas3D, gx: number, gy: number, h: number): void {
  const b = cv.at(gx, gy, 0);
  // Lattice pole.
  for (let y = 0; y < h; y++) {
    cv.buf.set(b.x - 1, b.y - y, PAL.pole);
    cv.buf.set(b.x, b.y - y, PAL.pole);
    cv.buf.set(b.x + 1, b.y - y, PAL.poleShade);
    if (y % 6 === 0) {
      cv.buf.set(b.x - 2, b.y - y, PAL.poleShade);
      cv.buf.set(b.x + 2, b.y - y, PAL.poleShade);
    }
  }
  // Light bank: 4×3 lamps on a dark frame, angled toward the field.
  const top = b.y - h;
  cv.buf.fillRect(b.x - 9, top - 12, 19, 13, PAL.board);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      cv.buf.fillRect(b.x - 8 + c * 5, top - 11 + r * 4, 3, 3, PAL.lamp);
      cv.buf.set(b.x - 8 + c * 5, top - 11 + r * 4, 0xffffff);
    }
  }
  // Ground shadow (toward +gx).
  for (let i = 0; i < 18; i++) cv.buf.set(b.x + 2 + i, b.y + Math.floor(i / 2), 0x000000, 0.25);
}

/** Front terraces (in front of every player): rows rise toward the camera. */
function paintFrontTerraces(cv: Canvas3D, away: Kit): void {
  const zTop = FRONT_BASE + (FRONT_TIERS - 1) * FRONT_RISE;
  // Long side (gy > field): tiers from the field outward (nearest last).
  for (let k = 0; k < FRONT_TIERS; k++) {
    const g0 = Y1 + k * TIER_D;
    const g1 = g0 + TIER_D;
    const z = FRONT_BASE + k * FRONT_RISE;
    cv.poly(
      [
        { gx: X0, gy: g0, z },
        { gx: X1, gy: g0, z },
        { gx: X1, gy: g1, z },
        { gx: X0, gy: g1, z },
      ],
      PAL.tread,
      (x, y) => (noise2(x, y, 51) < 0.04 ? shade(PAL.tread, 0.94) : PAL.tread),
    );
    // Step edge line (the visible lip where the next tier rises).
    cv.line({ gx: X0, gy: g1, z }, { gx: X1, gy: g1, z }, PAL.riserTop);
  }
  // Rear wall facing the camera, with an away-colour banner stripe.
  cv.face({ gx: X0, gy: FRONT_FAR }, { gx: X1, gy: FRONT_FAR }, 0, zTop, PAL.riser, (u, v) => {
    if (v > zTop - 2) return PAL.riserTop;
    const px = Math.floor(u * (X1 - X0) * 32);
    if (v > 2 && v < zTop - 3) return Math.floor(px / 40) % 2 === 0 ? away.jersey : away.trim;
    return PAL.riser;
  });
  // End side (gx > field): same build, rising toward +gx.
  for (let k = 0; k < FRONT_TIERS; k++) {
    const g0 = X1 + k * TIER_D;
    const g1 = g0 + TIER_D;
    const z = FRONT_BASE + k * FRONT_RISE;
    cv.poly(
      [
        { gx: g0, gy: Y0, z },
        { gx: g1, gy: Y0, z },
        { gx: g1, gy: Y1, z },
        { gx: g0, gy: Y1, z },
      ],
      PAL.tread,
      (x, y) => (noise2(x, y, 53) < 0.04 ? shade(PAL.tread, 0.94) : PAL.tread),
    );
    cv.line({ gx: g1, gy: Y0, z }, { gx: g1, gy: Y1, z }, PAL.riserTop);
  }
  cv.face({ gx: END_FAR, gy: Y1 }, { gx: END_FAR, gy: Y0 }, 0, zTop, shade(PAL.riser, 0.85), (_u, v) =>
    v > zTop - 2 ? PAL.riserTop : shade(PAL.riser, 0.85),
  );
  // Each terrace's open end, so the step profile reads.
  for (let k = 0; k < FRONT_TIERS; k++) {
    const z = FRONT_BASE + k * FRONT_RISE;
    cv.face({ gx: X1, gy: Y1 + (k + 1) * TIER_D }, { gx: X1, gy: Y1 + k * TIER_D }, 0, z, PAL.standSide);
  }
}

// ── Public painters ─────────────────────────────────────────────────────────

/**
 * The ground alone: grass, lines and the trees outside (about 90% of the background's
 * cost, and the same for every fixture). Painted once and kept (N10.5), so each
 * fixture's background starts from a copy of it.
 */
let groundCache: { offsetX: number; data: Uint8ClampedArray } | null = null;

function groundFor(offsetX: number, cv: Canvas3D): void {
  if (groundCache?.offsetX !== offsetX || groundCache.data.length !== cv.buf.data.length) {
    paintGround(cv);
    groundCache = { offsetX, data: cv.buf.data.slice() };
    return;
  }
  cv.buf.data.set(groundCache.data);
}

/** Forget the painted ground (tests). */
export function clearGroundCache(): void {
  groundCache = null;
}

/** Paint the ground ahead, so the first fixture's background is cheap (the art worker at start-up). */
export function warmGround(offsetX: number): void {
  const b = stadiumWorldBounds(offsetX);
  groundFor(offsetX, new Canvas3D(b.x, b.y, b.width, b.height, offsetX));
}

/** Paint the static background (everything behind the players). */
export function paintBackground(offsetX: number, home: Kit, away: Kit): Canvas3D {
  const b = stadiumWorldBounds(offsetX);
  const cv = new Canvas3D(b.x, b.y, b.width, b.height, offsetX);
  groundFor(offsetX, cv);
  paintCornerBlocks(cv, home);
  paintBackStand(cv, home);
  paintHill(cv);
  const panels = panelsFor(home, away);
  // Back hoardings: along the top-right touchline, then the top-left end.
  blitBoard(cv, { gx: -HOARD, gy: -HOARD }, FIELD_LONG + 2 * HOARD, 1, panels, 0);
  blitBoard(cv, { gx: -HOARD, gy: FIELD_WIDE + HOARD }, FIELD_WIDE + 2 * HOARD, -1, panels, 3);
  for (const t of FLOODLIGHT_TOWERS) paintTower(cv, t.gx, t.gy, t.h);
  return cv;
}

/** World rect of the foreground layer (near terraces + hoardings). */
export function foregroundWorldBounds(offsetX: number): WorldRect {
  const pts = [
    isoProject(X0, FRONT_FAR, 0, offsetX),
    isoProject(X0, FIELD_WIDE + HOARD, HOARD_H + 2, offsetX),
    isoProject(END_FAR, Y0, 0, offsetX),
    isoProject(FIELD_LONG + HOARD, -HOARD, HOARD_H + 2, offsetX),
    isoProject(END_FAR, FRONT_FAR, 0, offsetX),
  ];
  const minX = Math.floor(Math.min(...pts.map((p) => p.x))) - 2;
  const maxX = Math.ceil(Math.max(...pts.map((p) => p.x))) + 2;
  const minY = Math.floor(Math.min(...pts.map((p) => p.y))) - 2;
  const maxY = Math.ceil(Math.max(...pts.map((p) => p.y))) + 2;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Paint the foreground layer (everything in front of the players). */
export function paintForeground(offsetX: number, home: Kit, away: Kit): Canvas3D {
  const b = foregroundWorldBounds(offsetX);
  const cv = new Canvas3D(b.x, b.y, b.width, b.height, offsetX);
  const panels = panelsFor(home, away);
  // Near hoardings first (they're behind the terraces from the camera).
  blitBoard(cv, { gx: -HOARD, gy: FIELD_WIDE + HOARD }, FIELD_LONG + 2 * HOARD, 1, panels, 5);
  blitBoard(cv, { gx: FIELD_LONG + HOARD, gy: FIELD_WIDE + HOARD }, FIELD_WIDE + 2 * HOARD, -1, panels, 1);
  paintFrontTerraces(cv, away);
  return cv;
}

// ── Crowd seats ─────────────────────────────────────────────────────────────

export type CrowdLayer = 'back' | 'front';
export type CrowdBay = 'home' | 'away' | 'mixed';

export interface CrowdSeat {
  gx: number;
  gy: number;
  z: number;
  layer: CrowdLayer;
  /** 'front' = facing the camera (we see faces), 'back' = we see their backs. */
  view: 'front' | 'back';
  bay: CrowdBay;
  /** Stable per-seat hash in [0,1) for colour/animation phase. */
  r: number;
}

/**
 * Every occupied spectator position, deterministic. Rows run parallel to the
 * field edges; some seats stay empty so the stands don't read as wallpaper.
 */
export function crowdSeats(): CrowdSeat[] {
  const seats: CrowdSeat[] = [];
  let id = 0;
  const push = (s: Omit<CrowdSeat, 'r'>, emptyRate: number): void => {
    id++;
    const r = noise2(id, 7, 99);
    if (noise2(id, 3, 77) < emptyRate) return;
    seats.push({ ...s, r });
  };
  // Back grandstand: seats on the back half of each tread.
  for (let k = 0; k < BACK_TIERS; k++) {
    const gy = Y0 - k * TIER_D - TIER_D * 0.62;
    const z = TIER_BASE + k * TIER_RISE;
    for (let gx = X0 + 0.2; gx < X1 - 0.1; gx += 0.3) {
      const bay: CrowdBay = gx > FIELD_LONG * 0.74 ? 'away' : gx < FIELD_LONG * 0.2 ? 'home' : 'mixed';
      push({ gx: gx + (noise2(id, 1, 5) - 0.5) * 0.06, gy, z, layer: 'back', view: 'front', bay }, 0.14);
    }
  }
  // The hill: looser rows of home fans on the slope.
  for (let r = 0; r < 5; r++) {
    const gx = X0 - 0.45 - r * 0.72;
    const z = HILL_BASE + (X0 - gx) * HILL_RISE;
    for (let gy = Y0 + 0.3; gy < Y1 - 0.2; gy += 0.34) {
      push({ gx: gx + (noise2(id, 2, 5) - 0.5) * 0.25, gy: gy + (noise2(id, 4, 5) - 0.5) * 0.1, z, layer: 'back', view: 'front', bay: 'home' }, 0.32);
    }
  }
  // Front terraces (backs to the camera).
  for (let k = 0; k < FRONT_TIERS; k++) {
    const z = FRONT_BASE + k * FRONT_RISE;
    const gy = Y1 + k * TIER_D + 0.24;
    for (let gx = X0 + 0.2; gx < X1 - 0.1; gx += 0.3) {
      push({ gx, gy, z, layer: 'front', view: 'back', bay: 'mixed' }, 0.22);
    }
    const gxe = X1 + k * TIER_D + 0.24;
    for (let gy2 = Y0 + 0.2; gy2 < Y1 - 0.1; gy2 += 0.3) {
      push({ gx: gxe, gy: gy2, z, layer: 'front', view: 'back', bay: gy2 > FIELD_WIDE * 0.6 ? 'away' : 'mixed' }, 0.24);
    }
  }
  return seats;
}
