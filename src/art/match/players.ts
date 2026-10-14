// src/art/match/players.ts — generated pixel-art rugby league players.
//
// Every frame is painted from a tiny skeleton pose: a hand-authored head and
// torso grid (palette-swapped per kit) plus 2px limbs drawn joint-to-joint, then
// a 1px dark outline. Poses face RIGHT; the scene flips the sprite for left.
// Horizontal poses (dives, lying on the ground) are an upright pose rotated by
// exactly 90°, which keeps every pixel hard-edged.
//
// One atlas per kit: LOOKS (skin/hair combos) × every animation frame, laid out
// in a grid of FRAME_W × FRAME_H cells. Pure + deterministic; the only Phaser
// step (upload + frame registration) lives in the scene.
import { PixelBuffer, mix, shade, type Palette } from '../pixel';
import { OUTLINE, type Kit } from './kit';

export const FRAME_W = 28;
export const FRAME_H = 30;
/** Row of the lowest boot pixel when standing — the sprite's ground contact. */
export const BASE_Y = 26;
/** Horizontal centre of the body in a frame (the sprite's x origin). */
export const CENTER_X = 13;

export type PlayerAnim =
  | 'idle'
  | 'run'
  | 'tackle'
  | 'tackled'
  | 'kick'
  | 'pass'
  | 'celebrate'
  | 'dive'
  | 'down'
  | 'ptb'
  | 'dummyHalf'
  | 'fend'
  | 'catch'
  | 'kneeSlide'
  | 'fistPump'
  | 'point'
  | 'chestBump';

export interface AnimSpec {
  frames: number;
  frameRate: number;
  /** -1 loops forever; 0 plays once and holds the last frame. */
  repeat: number;
}

export const PLAYER_ANIMS: Record<PlayerAnim, AnimSpec> = {
  idle: { frames: 2, frameRate: 2.5, repeat: -1 },
  run: { frames: 6, frameRate: 14, repeat: -1 },
  tackle: { frames: 3, frameRate: 9, repeat: 0 },
  tackled: { frames: 2, frameRate: 6, repeat: 0 },
  kick: { frames: 3, frameRate: 7, repeat: 0 },
  pass: { frames: 2, frameRate: 8, repeat: 0 },
  celebrate: { frames: 2, frameRate: 5, repeat: -1 },
  dive: { frames: 2, frameRate: 6, repeat: 0 },
  down: { frames: 1, frameRate: 1, repeat: 0 },
  // #19: play-the-ball (get up, step over, heel it back), dummy-half pick-up,
  // straight-arm fend, and a leap for contested kicks.
  ptb: { frames: 3, frameRate: 7, repeat: 0 },
  dummyHalf: { frames: 2, frameRate: 6, repeat: 0 },
  fend: { frames: 2, frameRate: 8, repeat: 0 },
  catch: { frames: 2, frameRate: 6, repeat: 0 },
  // #21: try celebrations beyond the arms-up jump.
  kneeSlide: { frames: 2, frameRate: 4, repeat: 0 },
  fistPump: { frames: 2, frameRate: 5, repeat: -1 },
  point: { frames: 2, frameRate: 1.5, repeat: -1 },
  chestBump: { frames: 2, frameRate: 4, repeat: -1 },
};

/** Celebration anims a try scorer / his teammates / winners pick from (#21). */
export const CELEBRATIONS: readonly PlayerAnim[] = ['celebrate', 'fistPump', 'point', 'kneeSlide', 'chestBump'];

export const ANIM_ORDER: readonly PlayerAnim[] = [
  'idle',
  'run',
  'tackle',
  'tackled',
  'kick',
  'pass',
  'celebrate',
  'dive',
  'down',
  'ptb',
  'dummyHalf',
  'fend',
  'catch',
  'kneeSlide',
  'fistPump',
  'point',
  'chestBump',
];

// ── Looks (skin + hair), varied per formation slot ──────────────────────────

/** Head silhouettes (#21): headgear and headband take the kit's trim colour. */
export type HairStyle = 'short' | 'buzz' | 'mullet' | 'headgear' | 'headband';

export interface Look {
  skin: number;
  hair: number;
  style: HairStyle;
  beard: boolean;
}

const SKINS = [0xf3c9a0, 0xd59a68, 0x8a5636, 0xb97a4e] as const;
const HAIRS = [0x3a2416, 0x16141c, 0xd9b04c, 0x8a3c1c, 0x8c8a90] as const;

const look = (skin: number, hair: number, style: HairStyle = 'short', beard = false): Look => ({ skin, hair, style, beard });

/**
 * Skin × hair × style combinations. The first four are the original looks (the
 * slot fallback still cycles them); the rest add hairstyles, beards and a
 * fourth skin tone so a side of nine rarely repeats (#21).
 */
export const LOOKS: readonly Look[] = [
  look(SKINS[0], HAIRS[2]),
  look(SKINS[1], HAIRS[0]),
  look(SKINS[2], HAIRS[1]),
  look(SKINS[0], HAIRS[3]),
  look(SKINS[3], HAIRS[1], 'buzz', true),
  look(SKINS[0], HAIRS[0], 'mullet'),
  look(SKINS[2], HAIRS[1], 'headgear'),
  look(SKINS[1], HAIRS[3], 'headband', true),
  look(SKINS[3], HAIRS[0], 'mullet', true),
  look(SKINS[0], HAIRS[4], 'buzz'),
  look(SKINS[1], HAIRS[1], 'headgear'),
  look(SKINS[2], HAIRS[0], 'buzz', true),
];

/**
 * Stable look for a named player (#21): the same id/name always gets the same
 * look, in every match and on every screen. FNV-1a hash → LOOKS index.
 */
export function lookForPlayer(key: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % LOOKS.length;
}

/** Deterministic look index for a formation slot (0..12). */
export function lookForSlot(slot: number): number {
  // A fixed shuffle so neighbours in the line rarely match.
  const order = [1, 0, 2, 3, 2, 1, 0, 2, 3, 1, 0, 2, 1];
  return order[((slot % order.length) + order.length) % order.length] ?? 0;
}

// ── Grids ────────────────────────────────────────────────────────────────────
// Head (8×8, facing right). H hair, h hair shade, L hair light, S skin,
// s skin shade, E eye, G/g headgear (kit trim), B headband (kit trim).
const HEAD = [
  '..LHHHh.',
  '.LHHHHHh',
  'LHHHHHHH',
  'hHHHSSSS',
  'hHHSSSES',
  'hHsSSSSS',
  '.hSSSSSs',
  '..sSSSs.',
];

const HEADS: Record<HairStyle, readonly string[]> = {
  short: HEAD,
  buzz: ['..hhhhh.', '.hHHHHHh', 'hHHSSSSS', 'hHSSSSSS', 'hSSSSSES', 'hSsSSSSS', '.sSSSSSs', '..sSSSs.'],
  // Business in front, party at the back (hair falls to the collar behind).
  mullet: ['..LHHHh.', '.LHHHHHh', 'LHHHHHHH', 'HHHHSSSS', 'HHHSSSES', 'HHsSSSSS', 'hHSSSSSs', 'hhsSSSs.'],
  headgear: ['..gGGGg.', '.gGGGGGg', 'gGGGGGGG', 'gGGGSSSS', 'gGGSSSES', 'gGsSSSSS', '.gSSSSSs', '..sSSSs.'],
  headband: ['..LHHHh.', '.LHHHHHh', 'BBBBBBBB', 'hHHHSSSS', 'hHHSSSES', 'hHsSSSSS', '.hSSSSSs', '..sSSSs.'],
};

/** Head grid for a look: its style, with a beard along the jaw if it has one. */
export function headGrid(lk: Look): readonly string[] {
  const g = [...HEADS[lk.style]];
  if (lk.beard) {
    g[6] = '.hSHHHHh';
    g[7] = '..hHHHh.';
  }
  return g;
}

// Torso (6×6, facing right). J jersey, j shade, l light, C collar (trim),
// V chevron pixels, O hoop pixels. Pattern decides what V/O resolve to.
const TORSO = [
  'lJJCCCJ',
  'lVJJJVj',
  'lJVJVJj',
  'JJJVJJj',
  'OOOOOOO',
  'jjjjjjj',
];

const SHORTS = ['PPPPPPP', 'pPPPPPp'];

// ── Pose model ───────────────────────────────────────────────────────────────

type V2 = readonly [number, number];
interface Limb {
  /** Middle joint (knee / elbow), relative to the hip / shoulder. */
  mid: V2;
  /** End joint (foot / hand), relative to the hip / shoulder. */
  end: V2;
}
interface Pose {
  dx?: number;
  dy?: number;
  /** Lean of the upper body in px (+ forward, - back). */
  lean?: number;
  nearLeg: Limb;
  farLeg: Limb;
  nearArm: Limb;
  farArm: Limb;
  /** Rotate the finished upright figure 90° ('cw' = dive face-down, 'ccw' = on back). */
  rotate?: 'cw' | 'ccw';
  /** For rotated poses: px the lowest pixel sits above the ground line. */
  lift?: number;
}

const L = (mx: number, my: number, ex: number, ey: number): Limb => ({ mid: [mx, my], end: [ex, ey] });

const STAND_LEG_N = L(0, 3, 0, 6);
const STAND_LEG_F = L(0, 3, 0, 6);
const ARM_DOWN = L(1, 2, 1, 5);
const ARM_DOWN_F = L(-1, 2, -1, 5);
const ARM_FWD = L(2, 1, 4, 1);
const ARM_BACK = L(-2, 2, -3, 3);
const ARM_MID = L(1, 2, 2, 3);

// Run: contact / recoil / push for the near leg, then the same with far leg.
const RUN_A: Pose = {
  lean: 1,
  nearLeg: L(2, 2, 3, 6),
  farLeg: L(-1, 3, -3, 5),
  nearArm: ARM_BACK,
  farArm: L(2, 1, 3, 0),
};
const RUN_B: Pose = {
  lean: 1,
  dy: 1,
  nearLeg: L(1, 2, 0, 5),
  farLeg: L(-1, 2, -3, 3),
  nearArm: ARM_MID,
  farArm: ARM_MID,
};
const RUN_C: Pose = {
  lean: 1,
  dy: -1,
  nearLeg: L(-1, 3, -3, 7),
  farLeg: L(2, 2, 2, 5),
  nearArm: L(2, 1, 3, 0),
  farArm: ARM_BACK,
};
const swapLegs = (p: Pose): Pose => ({
  ...p,
  nearLeg: p.farLeg,
  farLeg: p.nearLeg,
  nearArm: p.farArm,
  farArm: p.nearArm,
});

const SUPERMAN: Pose = {
  nearLeg: L(0, 3, 1, 7),
  farLeg: L(0, 3, -1, 7),
  nearArm: L(0, -4, 0, -8),
  farArm: L(-1, -4, -1, -8),
};

const POSES: Record<PlayerAnim, Pose[]> = {
  idle: [
    { nearLeg: L(1, 3, 1, 6), farLeg: L(-1, 3, -1, 6), nearArm: ARM_DOWN, farArm: ARM_DOWN_F },
    { dy: 1, nearLeg: L(1, 2, 1, 5), farLeg: L(-1, 2, -1, 5), nearArm: L(1, 2, 2, 4), farArm: ARM_DOWN_F },
  ],
  run: [RUN_A, RUN_B, RUN_C, swapLegs(RUN_A), swapLegs(RUN_B), swapLegs(RUN_C)],
  tackle: [
    { dy: 2, lean: 2, nearLeg: L(2, 2, 1, 4), farLeg: L(-1, 2, -3, 4), nearArm: ARM_FWD, farArm: L(2, 0, 4, 0) },
    { ...SUPERMAN, rotate: 'cw', lift: 3 },
    { ...SUPERMAN, nearArm: L(1, -3, 2, -6), farArm: L(0, -3, 1, -6), rotate: 'cw', lift: 0 },
  ],
  tackled: [
    {
      dy: 1,
      lean: -2,
      nearLeg: L(2, 2, 3, 5),
      farLeg: L(1, 3, 2, 5),
      nearArm: L(2, -1, 3, -3),
      farArm: L(-1, -2, 0, -4),
    },
    { nearLeg: STAND_LEG_N, farLeg: L(1, 3, 2, 6), nearArm: L(1, -2, 2, -4), farArm: ARM_DOWN_F, rotate: 'ccw', lift: 0 },
  ],
  kick: [
    { nearLeg: L(-1, 3, -4, 4), farLeg: L(0, 3, 1, 6), nearArm: ARM_BACK, farArm: L(2, 1, 3, 0) },
    { lean: -1, nearLeg: L(3, 1, 6, 0), farLeg: L(0, 3, 0, 6), nearArm: L(2, 0, 3, -2), farArm: ARM_BACK },
    { nearLeg: L(2, 2, 3, 6), farLeg: STAND_LEG_F, nearArm: ARM_MID, farArm: ARM_DOWN_F },
  ],
  pass: [
    { lean: -1, nearLeg: L(2, 3, 2, 6), farLeg: L(-2, 3, -2, 6), nearArm: L(-1, 2, -3, 2), farArm: L(-2, 2, -4, 1) },
    { lean: 1, nearLeg: L(2, 3, 2, 6), farLeg: L(-2, 3, -2, 6), nearArm: L(2, 1, 5, 1), farArm: L(2, 1, 5, 2) },
  ],
  celebrate: [
    { nearLeg: L(1, 3, 2, 6), farLeg: L(-1, 3, -2, 6), nearArm: L(2, -2, 3, -5), farArm: L(-2, -2, -3, -5) },
    { dy: -3, nearLeg: L(1, 2, 0, 5), farLeg: L(-1, 2, -2, 5), nearArm: L(2, -3, 3, -6), farArm: L(-2, -3, -3, -6) },
  ],
  dive: [
    { ...SUPERMAN, rotate: 'cw', lift: 4 },
    { ...SUPERMAN, rotate: 'cw', lift: 0 },
  ],
  down: [
    { nearLeg: STAND_LEG_N, farLeg: L(1, 3, 2, 6), nearArm: L(1, -2, 2, -4), farArm: ARM_DOWN_F, rotate: 'ccw', lift: 0 },
  ],
  ptb: [
    // Up off the deck: on one knee, hands still on the turf.
    { dy: 3, lean: 2, nearLeg: L(2, 1, 0, 3), farLeg: L(-1, 2, -3, 3), nearArm: L(2, 2, 3, 4), farArm: L(1, 2, 2, 4) },
    // Standing over the ball.
    { lean: 1, nearLeg: L(1, 3, 1, 6), farLeg: L(-1, 3, -1, 6), nearArm: ARM_MID, farArm: L(0, 2, 1, 4) },
    // Heel it back to the dummy-half (foot rolls the ball behind him).
    { lean: 1, nearLeg: L(-1, 3, -4, 5), farLeg: STAND_LEG_F, nearArm: L(2, 1, 3, 2), farArm: ARM_BACK },
  ],
  dummyHalf: [
    // Stooped behind the ruck, hands down at the ball.
    { dy: 3, lean: 3, nearLeg: L(2, 2, 1, 3), farLeg: L(-2, 2, -3, 3), nearArm: L(2, 3, 3, 6), farArm: L(1, 3, 2, 6) },
    // Rising with it, ready to fire the pass.
    { dy: 1, lean: 1, nearLeg: L(1, 3, 2, 5), farLeg: L(-1, 3, -2, 5), nearArm: L(-1, 2, -3, 2), farArm: L(-2, 2, -4, 1) },
  ],
  fend: [
    // Mid-stride with the near arm locked out at the defender.
    { lean: 1, nearLeg: L(2, 2, 3, 6), farLeg: L(-1, 3, -3, 5), nearArm: L(3, 0, 6, -1), farArm: ARM_BACK },
    { lean: 1, dy: -1, nearLeg: L(-1, 3, -3, 7), farLeg: L(2, 2, 2, 5), nearArm: L(3, 0, 6, 0), farArm: L(-1, 2, -2, 3) },
  ],
  kneeSlide: [
    // On his knees, shins flat behind, leaning back with arms flung wide.
    { dy: 4, lean: -2, nearLeg: L(1, 2, -3, 2), farLeg: L(0, 2, -4, 2), nearArm: L(2, -2, 4, -4), farArm: L(-2, -2, -4, -4) },
    { dy: 4, lean: -1, nearLeg: L(1, 2, -3, 2), farLeg: L(0, 2, -4, 2), nearArm: L(2, -3, 3, -6), farArm: L(-2, -3, -3, -6) },
  ],
  fistPump: [
    { nearLeg: L(1, 3, 2, 6), farLeg: L(-1, 3, -2, 6), nearArm: L(2, -1, 2, -4), farArm: ARM_DOWN_F },
    { dy: 1, nearLeg: L(1, 2, 2, 5), farLeg: L(-1, 2, -2, 5), nearArm: L(2, 1, 2, -1), farArm: ARM_DOWN_F },
  ],
  point: [
    // Both index fingers to the sky, then arms out to the crowd.
    { nearLeg: L(1, 3, 1, 6), farLeg: L(-1, 3, -1, 6), nearArm: L(1, -4, 1, -7), farArm: L(0, -4, -1, -7) },
    { nearLeg: L(1, 3, 1, 6), farLeg: L(-1, 3, -1, 6), nearArm: L(3, -1, 5, -2), farArm: L(-3, -1, -5, -2) },
  ],
  chestBump: [
    // Leap, chest out, arms swept back…
    { dy: -3, lean: -2, nearLeg: L(1, 2, 1, 4), farLeg: L(-1, 2, -2, 4), nearArm: L(-2, 1, -4, 2), farArm: L(-2, 1, -4, 1) },
    // …and land, arms up.
    { nearLeg: L(1, 3, 2, 6), farLeg: L(-1, 3, -2, 6), nearArm: L(2, -2, 3, -5), farArm: L(-1, -2, -2, -5) },
  ],
  catch: [
    // Load: knees bent, eyes and hands up.
    { dy: 1, nearLeg: L(1, 2, 1, 5), farLeg: L(-1, 2, -1, 5), nearArm: L(1, -3, 2, -6), farArm: L(-1, -3, -1, -6) },
    // Airborne, arms at full stretch.
    { dy: -3, nearLeg: L(1, 2, 2, 4), farLeg: L(-1, 3, -1, 5), nearArm: L(1, -4, 1, -7), farArm: L(0, -4, 0, -7) },
  ],
};

// ── Painting ─────────────────────────────────────────────────────────────────

interface Colors {
  skin: number;
  skinShade: number;
  hair: number;
  hairShade: number;
  hairLight: number;
  sleeve: number;
  boot: number;
  bootLight: number;
}

function colorsFor(kit: Kit, look: Look): Colors {
  return {
    skin: look.skin,
    skinShade: shade(look.skin, 0.8),
    hair: look.hair,
    hairShade: shade(look.hair, 0.7),
    hairLight: mix(look.hair, 0xffffff, 0.3),
    sleeve: kit.pattern === 'sleeves' ? kit.trim : kit.jersey,
    boot: 0x262230,
    bootLight: 0x5a5466,
  };
}

/** Thick (2px) segment, coloured by a callback on parametric t∈[0,1]. */
function limb(
  buf: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: (t: number) => number,
): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const horizontal = Math.abs(x1 - x0) > Math.abs(y1 - y0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    const c = color(t);
    buf.set(x, y, c);
    if (horizontal) buf.set(x, y + 1, c);
    else buf.set(x + 1, y, c);
  }
}

function darken(c: number): number {
  return shade(c, 0.78);
}

function drawLeg(buf: PixelBuffer, kit: Kit, col: Colors, hx: number, hy: number, leg: Limb, far: boolean): void {
  const f = far ? darken : (c: number) => c;
  const kx = hx + leg.mid[0];
  const ky = hy + leg.mid[1];
  const fx = hx + leg.end[0];
  const fy = hy + leg.end[1];
  limb(buf, hx, hy, kx, ky, (t) => f(t < 0.5 ? kit.shorts : col.skin));
  limb(buf, kx, ky, fx, fy, (t) => f(t < 0.2 ? col.skin : t < 0.5 ? kit.sockHoop : kit.sock));
  // Boot: 3px wide with the toe pointing forward (right), 2px tall.
  const bx = fx;
  const by = fy;
  buf.fillRect(bx, by, 3, 1, f(col.boot));
  buf.fillRect(bx, by - 1, 2, 1, f(col.boot));
  buf.set(bx + 2, by - 1, f(col.bootLight));
}

function drawArm(buf: PixelBuffer, col: Colors, sx: number, sy: number, arm: Limb, far: boolean): void {
  const f = far ? darken : (c: number) => c;
  const ex = sx + arm.mid[0];
  const ey = sy + arm.mid[1];
  const hx = sx + arm.end[0];
  const hy = sy + arm.end[1];
  limb(buf, sx, sy, ex, ey, (t) => f(t < 0.6 ? col.sleeve : col.skin));
  limb(buf, ex, ey, hx, hy, () => f(col.skin));
  buf.set(hx, hy, f(col.skinShade));
}

function torsoPalette(kit: Kit): Palette {
  const v = kit.pattern === 'v' ? kit.trim : kit.jersey;
  const o = kit.pattern === 'hoops' ? kit.trim : kit.jersey;
  return {
    J: kit.jersey,
    j: kit.jerseyShade,
    l: kit.jerseyLight,
    C: kit.trim,
    V: v,
    O: o,
  };
}

/** Paint an upright figure (before rotation / outline). */
function paintUpright(kit: Kit, look: Look, pose: Pose): PixelBuffer {
  const buf = new PixelBuffer(FRAME_W, FRAME_H);
  const col = colorsFor(kit, look);
  const dx = pose.dx ?? 0;
  const dy = pose.dy ?? 0;
  const lean = pose.lean ?? 0;
  // Layout (standing): head 8 rows, torso 6, shorts 2, legs 6 → 22px tall.
  const cx = CENTER_X + dx;
  const top = BASE_Y - 21 + dy; // head top row
  const torsoY = top + 8;
  const shortsY = torsoY + 6;
  const hipY = shortsY + 1;
  const farHipX = cx - 2;
  const nearHipX = cx + 1;
  const shY = torsoY + 1;
  const farShX = cx - 3 + lean;
  const nearShX = cx + 1 + lean;

  // Back-to-front: far arm, far leg, near leg, shorts, torso, head, near arm.
  drawArm(buf, col, farShX, shY, pose.farArm, true);
  drawLeg(buf, kit, col, farHipX, hipY, pose.farLeg, true);
  drawLeg(buf, kit, col, nearHipX, hipY, pose.nearLeg, false);

  const shortsPal: Palette = { P: kit.shorts, p: kit.shortsShade };
  buf.sprite(SHORTS, shortsPal, cx - 3, shortsY);

  const tPal = torsoPalette(kit);
  TORSO.forEach((row, r) => {
    // Lean shears the torso: top rows shift most.
    const shift = Math.round((lean * (TORSO.length - 1 - r)) / (TORSO.length - 1));
    buf.sprite([row], tPal, cx - 3 + shift, torsoY + r);
  });

  const hPal: Palette = {
    H: col.hair,
    h: col.hairShade,
    L: col.hairLight,
    S: col.skin,
    s: col.skinShade,
    E: 0x1c1424,
    G: kit.trim,
    g: shade(kit.trim, 0.72),
    B: kit.trim,
  };
  buf.sprite([...headGrid(look)], hPal, cx - 3 + lean, top);

  drawArm(buf, col, nearShX, shY, pose.nearArm, false);
  return buf;
}

/** Rotate a square buffer by 90° ('cw' or 'ccw'). */
export function rotate90(src: PixelBuffer, dir: 'cw' | 'ccw'): PixelBuffer {
  const out = new PixelBuffer(src.h, src.w);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const { color, alpha } = src.get(x, y);
      if (alpha === 0) continue;
      const nx = dir === 'cw' ? src.h - 1 - y : y;
      const ny = dir === 'cw' ? x : src.w - 1 - x;
      out.set(nx, ny, color, alpha / 255);
    }
  }
  return out;
}

/** Bounding box of opaque pixels (null when empty). */
export function opaqueBounds(buf: PixelBuffer): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      if (buf.get(x, y).alpha === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}

/** One finished, outlined frame for a kit + look. */
export function drawPlayerFrame(kit: Kit, look: Look, anim: PlayerAnim, frame: number): PixelBuffer {
  const poses = POSES[anim];
  const pose = poses[Math.max(0, Math.min(poses.length - 1, frame))] as Pose;
  let fig = paintUpright(kit, look, pose);
  if (pose.rotate) {
    // Rotate, then re-seat on the ground line, centred on the body origin.
    const rot = rotate90(fig, pose.rotate);
    const b = opaqueBounds(rot);
    fig = new PixelBuffer(FRAME_W, FRAME_H);
    if (b) {
      const cx = Math.round((b.x0 + b.x1) / 2);
      fig.blit(rot, CENTER_X - cx, BASE_Y - (pose.lift ?? 0) - b.y1);
    }
  }
  fig.outline(OUTLINE);
  return fig;
}

// ── Atlas ────────────────────────────────────────────────────────────────────

export interface AtlasFrame {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Frame name inside a kit atlas, e.g. `2-run-3` (look 2, run frame 3). */
export function frameName(look: number, anim: PlayerAnim, frame: number): string {
  return `${look}-${anim}-${frame}`;
}

/** Every look × anim frame for one kit, packed in a grid (one row per look). */
export function buildPlayerAtlas(kit: Kit): { buf: PixelBuffer; frames: AtlasFrame[] } {
  const perLook = ANIM_ORDER.reduce((n, a) => n + PLAYER_ANIMS[a].frames, 0);
  const buf = new PixelBuffer(perLook * FRAME_W, LOOKS.length * FRAME_H);
  const frames: AtlasFrame[] = [];
  LOOKS.forEach((look, li) => {
    let col = 0;
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < PLAYER_ANIMS[anim].frames; f++) {
        const x = col * FRAME_W;
        const y = li * FRAME_H;
        buf.blit(drawPlayerFrame(kit, look, anim, f), x, y);
        frames.push({ name: frameName(li, anim, f), x, y, w: FRAME_W, h: FRAME_H });
        col++;
      }
    }
  });
  return { buf, frames };
}
