// src/art/grounds/manager.ts — the club manager walking around the grounds.
//
// A chibi ~16×24 person (big head, club polo, trousers, shoes) authored as
// palette grids for the head/torso plus procedural legs and arms so the walk
// cycle can swing them. Two base views exist — front 3/4 (facing the camera,
// eyes visible) and back 3/4 — each mirrored for the other diagonal:
//
//   grid +gx 'e' → screen right-down → front view
//   grid +gy 's' → screen left-down  → front view, mirrored
//   grid −gx 'w' → screen left-up    → back view, mirrored
//   grid −gy 'n' → screen right-up   → back view
//
// Frames: `char-idle-<dir>` plus 4 walk frames `char-walk-<dir>-<f>` (contact,
// passing, contact, passing) with alternating legs, opposite arm swing and a
// 1px body bob on the passing frames. CHAR_FOOT_Y is the ground-contact row
// so GroundsScene can anchor feet on the tile centre.
import { PixelBuffer, type Palette } from '../pixel';
import { OUTLINE, CLUB } from './palette';

export const CHAR_DIRS = ['n', 'e', 's', 'w'] as const;
export type CharDir = (typeof CHAR_DIRS)[number];
export const CHAR_WALK_FRAMES = 4;

/** Texture size (includes 1px outline, bob headroom and the ground shadow). */
export const CHAR_W = 16;
export const CHAR_H = 28;
/** Row whose bottom edge touches the ground (the outline under the shoes). */
export const CHAR_FOOT_Y = 24;

const PAL: Palette = {
  o: OUTLINE,
  h: 0x5a3320, // hair dark
  H: 0x7a4728, // hair mid
  L: 0x9c6236, // hair light
  s: 0xf7cfa6, // skin
  S: 0xe0a77f, // skin shade
  b: 0xf3a08c, // blush
  e: OUTLINE, // eyes
  p: CLUB.gold, // polo
  P: CLUB.goldDark,
  c: CLUB.navy, // collar / badge
};

/** Source colours of the manager sprite — the swap keys for people.ts (#23). */
export const MANAGER_COLORS = {
  hairDark: 0x5a3320,
  hairMid: 0x7a4728,
  hairLight: 0x9c6236,
  skin: 0xf7cfa6,
  skinShade: 0xe0a77f,
  shirt: CLUB.gold,
  shirtShade: CLUB.goldDark,
  trim: CLUB.navy,
  trousers: 0x3b4462,
  trousersShade: 0x2b3249,
} as const;

const TROUSER = 0x3b4462;
const TROUSER_SHADE = 0x2b3249;
const SHOE = 0x4a2f22;
const SHOE_HI = 0x6e4a35;
const SKIN = 0xf7cfa6;
const SKIN_SHADE = 0xe0a77f;

// Head grids are 10 wide, drawn at x=3, y=2 (rows 2..11).
const HEAD_FRONT = [
  '..hhhhhh..',
  '.hHHHHHHh.',
  'hHHLLLHHHh',
  'hHLLHHHHHh',
  'hHHHHHHHHh',
  'hHHhsshsss',
  'hSsssesses',
  'hSsssesses',
  'hsssbssSsb',
  '.hSssssss.',
];

const HEAD_BACK = [
  '..hhhhhh..',
  '.hHHHHHHh.',
  'hHHLLLHHHh',
  'hHLLHHHHHh',
  'hHHHHHHHHh',
  'hHHHHHHHHh',
  'hhHHHHHHhS',
  'hhHHHHHHhS',
  'hhhhhhhhhs',
  '..SSsssS..',
];

// Torso grids are 8 wide, drawn at x=4, y=12 (rows 12..16).
const TORSO_FRONT = [
  'pcsssscP',
  'ppcsscPP',
  'pppppPPP',
  'pcpppPPP',
  'ppppppPP',
];

const TORSO_BACK = [
  'pccccccP',
  'ppppppPP',
  'ppppppPP',
  'ppppppPP',
  'ppppppPP',
];

type Pose = 'stand' | 'stepA' | 'pass' | 'stepB';
const WALK_POSES: readonly Pose[] = ['stepA', 'pass', 'stepB', 'pass'];

/** One leg: 3px wide trouser column from the hips down to a shoe. */
function leg(buf: PixelBuffer, x: number, hipY: number, footY: number, shade: boolean, front: boolean): void {
  for (let y = hipY; y <= footY - 2; y++) {
    buf.fillRect(x, y, 3, 1, shade ? TROUSER_SHADE : TROUSER);
  }
  // Shoe: 2 rows; front view pokes the toe 1px toward the facing side.
  buf.fillRect(x, footY - 1, 3, 2, SHOE);
  buf.set(x, footY - 1, SHOE_HI);
  if (front) buf.set(x + 3, footY, SHOE);
}

/** One arm: sleeve with a navy club cuff, forearm, hand. `dy` swings it (+1 forward/down). */
function arm(buf: PixelBuffer, x: number, top: number, dy: number, shade: boolean): void {
  const y = top + dy;
  buf.fillRect(x, y, 2, 1, shade ? CLUB.goldDark : CLUB.gold);
  buf.fillRect(x, y + 1, 2, 1, CLUB.navy);
  buf.fillRect(x, y + 2, 2, 3, shade ? SKIN_SHADE : SKIN);
}

/** Horizontally mirror a buffer. */
function flip(src: PixelBuffer): PixelBuffer {
  const out = new PixelBuffer(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const px = src.get(x, y);
      if (px.alpha > 0) out.set(src.w - 1 - x, y, px.color, px.alpha / 255);
    }
  }
  return out;
}

/** Soft oval ground shadow, painted only under the figure (never over it). */
function shadow(buf: PixelBuffer, bob: number): void {
  const cx = CHAR_W / 2;
  const cy = CHAR_FOOT_Y + 0.5;
  const rx = bob ? 4.5 : 5.5;
  for (let y = CHAR_FOOT_Y - 1; y <= CHAR_FOOT_Y + 1; y++) {
    for (let x = 0; x < CHAR_W; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / 1.6) ** 2;
      if (d <= 1 && buf.get(x, y).alpha === 0) buf.set(x, y, 0x000000, 0.28);
    }
  }
}

function drawFigure(view: 'front' | 'back', pose: Pose): PixelBuffer {
  const buf = new PixelBuffer(CHAR_W, CHAR_H);
  const front = view === 'front';
  const bob = pose === 'pass' ? -1 : 0;
  const ground = CHAR_FOOT_Y - 1; // bottom shoe row
  const hip = 17 + bob;

  // Legs: on a step one leg plants a pixel wider, the other lifts a pixel.
  const lLift = pose === 'stepB' ? 1 : 0;
  const rLift = pose === 'stepA' ? 1 : 0;
  const lx = pose === 'stepA' ? 4 : 5;
  const rx = pose === 'stepB' ? 9 : 8;
  buf.fillRect(4, hip, 8, 1, TROUSER); // hips
  buf.fillRect(10, hip, 2, 1, TROUSER_SHADE);
  leg(buf, lx, hip + 1, ground - lLift, false, front);
  leg(buf, rx, hip + 1, ground - rLift, true, front);

  // Arms swing opposite to the legs.
  const swing = pose === 'stepA' ? 1 : pose === 'stepB' ? -1 : 0;
  arm(buf, 2, 12 + bob, -swing, false);
  arm(buf, 12, 12 + bob, swing, true);

  buf.sprite(front ? TORSO_FRONT : TORSO_BACK, PAL, 4, 12 + bob);
  buf.sprite(front ? HEAD_FRONT : HEAD_BACK, PAL, 3, 2 + bob);
  return buf;
}

/**
 * One manager frame. `frame` null → idle pose; 0..3 → walk cycle frame.
 * Pure: same inputs always produce identical pixels.
 */
export function charFrame(dir: CharDir, frame: number | null): PixelBuffer {
  const view = dir === 'e' || dir === 's' ? 'front' : 'back';
  const pose: Pose = frame === null ? 'stand' : WALK_POSES[((frame % 4) + 4) % 4]!;
  let buf = drawFigure(view, pose);
  if (dir === 's' || dir === 'w') buf = flip(buf);
  buf.outline(OUTLINE);
  shadow(buf, pose === 'pass' ? 1 : 0);
  return buf;
}

/** Every manager texture as { key, buf } (keys per ARCHITECTURE §7). */
export function charTextures(): { key: string; buf: PixelBuffer }[] {
  const out: { key: string; buf: PixelBuffer }[] = [];
  for (const dir of CHAR_DIRS) {
    out.push({ key: `char-idle-${dir}`, buf: charFrame(dir, null) });
    for (let f = 0; f < CHAR_WALK_FRAMES; f++) {
      out.push({ key: `char-walk-${dir}-${f}`, buf: charFrame(dir, f) });
    }
  }
  return out;
}
