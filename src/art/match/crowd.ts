// src/art/match/crowd.ts — the spectators in the stands (#641).
//
// Each spectator is drawn waist-up at the players' chibi scale: a 10 px head (a
// player's is 13) on a 12 px torso, in a 16×26 frame with the waist on the bottom
// row (the row in front hides the rest). Six looks (short hair, long hair, a cap in
// the other team colour, a beanie, curls, bald) in eight shirts (both teams' jersey
// and trim plus four neutrals), seen from the front (the stands facing the camera)
// or from behind (the near terraces). Frames: seated, both arms up, one arm up, hands
// on head (the groan), looking up (a bomb in the air) and clapping; a pose is a frame
// plus a lift, so a jump or standing up costs no frame. A few oversized flags in the
// home colours are painted in the same atlas, furled or waving.
//
// Pure + deterministic: shirt, look and phase come from the seat's stable hash, and
// crowdPose() is a pure function of (seat, tick, mood).
import { PixelBuffer, mix, noise2, shade } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import type { CrowdBay, CrowdSeat } from './stadium';

export const CROWD_FW = 16;
export const CROWD_FH = 26;
/** Waist row inside a frame: the sprite stands on its seat at this row. */
export const CROWD_BASE = 25;

export type CrowdView = 'front' | 'back';
export const CROWD_VIEWS: readonly CrowdView[] = ['front', 'back'];

/** Frames per look: seated, arms up, one arm up, hands on head, looking up, clapping. */
export type CrowdFrame = 0 | 1 | 2 | 3 | 4 | 5;
export const CROWD_FRAMES: readonly CrowdFrame[] = [0, 1, 2, 3, 4, 5];

/**
 * What a spectator does on a tick: 0 seated, 1 seated shuffle, 2 arms up, 3 arms-up
 * jump, 4 one-arm wave, 5 groan (hands on head, slumped), 6 heads up, 7 standing
 * clap, 8 standing.
 */
export type CrowdPose = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const CROWD_POSES: readonly CrowdPose[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** The frame each pose shows. */
export const POSE_FRAME: Record<CrowdPose, CrowdFrame> = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 0 };
/** Pixels a pose lifts the whole figure off its seat (negative: slumped into it). */
export const POSE_LIFT: Record<CrowdPose, number> = { 0: 0, 1: 1, 2: 3, 3: 6, 4: 3, 5: -1, 6: 0, 7: 4, 8: 4 };

const NEUTRALS = [0xf2f0ea, 0x8c8a96, 0x3d5d9c, 0x2c2a33] as const;

/** Shirt palette for a fixture: [homeJ, homeT, awayJ, awayT, ...neutrals]. */
export function crowdShirts(home: Kit, away: Kit): number[] {
  return [home.jersey, home.trim, away.jersey, away.trim, ...NEUTRALS];
}

/** Which team a shirt index supports (neutrals cheer for nobody in particular). */
export function shirtSide(shirt: number): 'home' | 'away' | null {
  if (shirt <= 1) return 'home';
  if (shirt <= 3) return 'away';
  return null;
}

/** A spectator's look: skin, hair and what is on his head. */
interface Fan {
  skin: number;
  hair: number;
  top: 'short' | 'long' | 'cap' | 'beanie' | 'curls' | 'bald';
}
const FANS: readonly Fan[] = [
  { skin: 0xf3c9a0, hair: 0x3a2416, top: 'short' },
  { skin: 0xf0c49a, hair: 0xd9b04c, top: 'long' },
  { skin: 0xd59a68, hair: 0x16141c, top: 'cap' },
  { skin: 0x8a5636, hair: 0x16141c, top: 'beanie' },
  { skin: 0x6e4128, hair: 0x16141c, top: 'curls' },
  { skin: 0xe0ac80, hair: 0x9a9690, top: 'bald' },
];
export const CROWD_LOOKS = FANS.length;

/**
 * One spectator frame. `shirt` is his shirt; `gear` the colour of a cap or beanie
 * (the other colour of his side, so a bay reads in two team colours).
 */
export function drawSpectator(shirt: number, look: number, view: CrowdView, frame: CrowdFrame, gear = 0x2c2a33): PixelBuffer {
  const f = FANS[look % FANS.length]!;
  const b = new PixelBuffer(CROWD_FW, CROWD_FH);
  const px = (x: number, y: number, c: number): void => b.set(x, y, c);
  const rect = (x: number, y: number, w: number, h: number, c: number): void => b.fillRect(x, y, w, h, c);
  const shirtShade = shade(shirt, 0.74);
  const shirtLight = mix(shirt, 0xffffff, 0.22);
  const skinShade = shade(f.skin, 0.78);
  const front = view === 'front';
  // The groan hunches the head down into the shoulders; looking up tips it back a row.
  const hy = frame === 3 ? 8 : frame === 4 ? 4 : 5; // head top
  const ty = 16; // shoulders

  // Torso: shoulders to waist, lit left, shaded right.
  rect(2, ty, 12, CROWD_BASE - ty + 1, shirt);
  rect(3, ty, 10, 1, shirtLight);
  rect(12, ty + 1, 2, CROWD_BASE - ty, shirtShade);
  rect(2, CROWD_BASE - 1, 12, 2, shirtShade);
  if (front) {
    // A collar, and a stripe of the other colour across the chest of a team shirt reads at a glance.
    px(7, ty, skinShade);
    px(8, ty, skinShade);
  }
  // Neck.
  rect(6, hy + 10, 4, ty - hy - 10, skinShade);

  // Head: 10 wide, 10 tall, rounded.
  const headY = hy;
  rect(3, headY + 1, 10, 8, f.skin);
  rect(4, headY, 8, 10, f.skin);
  rect(12, headY + 2, 1, 6, skinShade);
  rect(5, headY + 9, 6, 1, skinShade);
  if (front) {
    // Eyes (up for a bomb, shut for a groan) and a mouth (open for a cheer).
    const ey = headY + (frame === 4 ? 4 : 5);
    if (frame === 3) {
      rect(5, ey + 1, 2, 1, OUTLINE);
      rect(9, ey + 1, 2, 1, OUTLINE);
    } else {
      rect(5, ey, 1, 2, OUTLINE);
      rect(10, ey, 1, 2, OUTLINE);
    }
    const shout = frame === 1 || frame === 2;
    if (shout || frame === 4) rect(7, headY + 7, 2, 2, 0x5a1f22);
    else rect(7, headY + 8, 2, 1, skinShade);
  }
  // Hair and headwear.
  const hairShade = shade(f.hair, 0.7);
  const hairLight = mix(f.hair, 0xf6dcc2, 0.25);
  const back = !front;
  switch (f.top) {
    case 'short':
      rect(4, headY - 1, 8, 3, f.hair);
      rect(3, headY, 10, 2, f.hair);
      rect(3, headY + 2, 1, 3, f.hair);
      rect(12, headY + 2, 1, 2, hairShade);
      rect(5, headY - 1, 3, 1, hairLight);
      if (back) {
        rect(3, headY, 10, 8, f.hair);
        rect(4, headY + 8, 8, 1, hairShade);
      }
      break;
    case 'long':
      rect(4, headY - 1, 8, 3, f.hair);
      rect(3, headY, 10, 2, f.hair);
      rect(2, headY + 1, 2, 11, f.hair);
      rect(12, headY + 1, 2, 11, hairShade);
      rect(5, headY - 1, 3, 1, hairLight);
      if (back) {
        rect(3, headY, 10, 12, f.hair);
        rect(3, headY + 2, 2, 8, hairLight);
      }
      break;
    case 'cap':
      rect(3, headY - 1, 10, 4, gear);
      rect(4, headY - 2, 8, 1, gear);
      rect(5, headY - 2, 3, 1, mix(gear, 0xffffff, 0.3));
      rect(12, headY, 1, 3, shade(gear, 0.7));
      if (front) rect(2, headY + 3, 12, 1, shade(gear, 0.6)); // brim
      else { // strap
        rect(3, headY + 3, 10, 5, f.hair);
        rect(6, headY + 2, 4, 1, shade(gear, 0.6));
      }
      break;
    case 'beanie':
      rect(3, headY - 2, 10, 5, gear);
      rect(4, headY - 3, 8, 1, gear);
      rect(7, headY - 4, 2, 1, 0xf2f0ea); // pom-pom
      rect(3, headY + 2, 10, 1, shade(gear, 0.7)); // the fold
      if (back) rect(3, headY + 3, 10, 5, f.hair);
      break;
    case 'curls':
      for (let x = 2; x <= 13; x += 2) rect(x, headY - 1 - ((x >> 1) % 2), 2, 3, f.hair);
      rect(2, headY + 1, 2, 4, f.hair);
      rect(12, headY + 1, 2, 4, hairShade);
      rect(5, headY - 1, 2, 1, hairLight);
      if (back) {
        rect(2, headY, 12, 9, f.hair);
        rect(4, headY + 2, 2, 1, hairLight);
        rect(9, headY + 5, 2, 1, hairLight);
      }
      break;
    case 'bald':
      rect(5, headY, 3, 1, mix(f.skin, 0xffffff, 0.35));
      rect(3, headY + 3, 1, 3, f.hair);
      rect(12, headY + 3, 1, 3, f.hair);
      if (back) rect(3, headY + 5, 10, 3, f.hair);
      break;
  }
  if (frame === 3 && front) {
    // Head bowed: the crown to the camera, the face down out of sight but for the shut eyes.
    const crown = f.top === 'cap' || f.top === 'beanie' ? gear : f.top === 'bald' ? mix(f.skin, 0xffffff, 0.12) : f.hair;
    rect(3, headY - 1, 10, 5, crown);
    rect(4, headY - 2, 8, 1, crown);
    rect(5, headY - 1, 3, 1, mix(crown, 0xffffff, 0.2));
  }
  if (back) {
    // Ears either side of the back of the head.
    px(2, headY + 5, f.skin);
    px(13, headY + 5, skinShade);
  }

  // Arms.
  const sleeve = (x: number, y: number, h: number): void => rect(x, y, 2, h, shirtShade);
  const hand = (x: number, y: number): void => rect(x, y, 2, 2, f.skin);
  const upArm = (x: number): void => {
    sleeve(x, ty - 3, 4);
    rect(x, 4, 2, ty - 7, f.skin);
    rect(x, 2, 2, 2, mix(f.skin, 0xffffff, 0.15));
  };
  switch (frame) {
    case 1: // both arms up
      upArm(0);
      upArm(14);
      break;
    case 2: // the near arm up, the other in his lap
      upArm(14);
      sleeve(1, ty + 1, 6);
      hand(3, ty + 7);
      break;
    case 3: // hands clasped on his bowed head, elbows out
      sleeve(0, ty - 2, 3);
      sleeve(14, ty - 2, 3);
      rect(0, headY + 2, 2, ty - headY - 4, f.skin);
      rect(14, headY + 2, 2, ty - headY - 4, f.skin);
      rect(1, headY, 4, 2, f.skin);
      rect(11, headY, 4, 2, f.skin);
      rect(5, headY - 1, 6, 1, f.skin);
      break;
    case 5: // clapping in front of his chest
      sleeve(1, ty + 1, 4);
      sleeve(13, ty + 1, 4);
      rect(3, ty + 4, 4, 2, f.skin);
      rect(9, ty + 4, 4, 2, f.skin);
      rect(7, ty + 2, 2, 3, mix(f.skin, 0xffffff, 0.2));
      break;
    default: // in his lap
      sleeve(1, ty + 1, 6);
      sleeve(13, ty + 1, 6);
      hand(3, ty + 7);
      hand(11, ty + 7);
  }
  b.outline(OUTLINE);
  return b;
}

// ── Flags ───────────────────────────────────────────────────────────────────

/** A home flag frame: furled on its pole (0) or flying in one of three waves (1–3). */
export const FLAG_W = 38;
export const FLAG_H = 50;
/** The pole's foot (where the fan's hand holds it) inside a flag frame. */
export const FLAG_HAND_X = 3;
export const FLAG_HAND_Y = 48;
/** The cloth flying: twice a fan's width. */
const CLOTH_W = 32;
const CLOTH_H = 19;
export const FLAG_FRAMES = [0, 1, 2, 3] as const;

export function drawFlag(jersey: number, trim: number, frame: number): PixelBuffer {
  const b = new PixelBuffer(FLAG_W, FLAG_H);
  const pole = 0x8d929c;
  for (let y = 1; y <= FLAG_HAND_Y; y++) b.set(FLAG_HAND_X, y, pole);
  b.set(FLAG_HAND_X, 0, 0xf2f0ea);
  if (frame === 0) {
    // Furled: the cloth hangs down the pole.
    for (let y = 2; y < 22; y++) {
      b.set(FLAG_HAND_X + 1, y, y % 5 < 3 ? jersey : trim);
      if (y < 17) b.set(FLAG_HAND_X + 2, y, shade(jersey, 0.8));
      if (y < 11) b.set(FLAG_HAND_X + 3, y, shade(jersey, 0.7));
    }
  } else {
    // Flying: a big cloth, jersey with a trim band, rippling along its length.
    const phase = (frame - 1) * ((2 * Math.PI) / 3);
    for (let x = 0; x < CLOTH_W; x++) {
      const dy = Math.round(Math.sin(x / 4.5 - phase) * 2.2 * (x / CLOTH_W + 0.15));
      const lit = Math.cos(x / 4.5 - phase) > 0.35;
      for (let y = 0; y < CLOTH_H; y++) {
        const band = y >= 7 && y <= 11;
        const c = band ? trim : jersey;
        b.set(FLAG_HAND_X + 1 + x, 2 + y + dy, lit ? mix(c, 0xffffff, 0.18) : y > CLOTH_H - 3 ? shade(c, 0.8) : c);
      }
    }
  }
  b.outline(OUTLINE);
  return b;
}

export function crowdFrameName(shirt: number, look: number, view: CrowdView, frame: CrowdFrame): string {
  return `c${shirt}-${look}-${view}-${frame}`;
}
export function flagFrameName(frame: number): string {
  return `flag-${frame}`;
}

export interface CrowdAtlasFrame {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The cap or beanie colour for a shirt: the other colour of its side, a navy for neutrals. */
function gearFor(shirts: readonly number[], si: number): number {
  if (si < 4) return shirts[si ^ 1]!;
  return 0x23263a;
}

/**
 * Every shirt × view × look × frame (a row per shirt and view), then a row of the
 * home flag's frames. 576×466 px at eight shirts.
 */
export function buildCrowdAtlas(shirts: readonly number[]): { buf: PixelBuffer; frames: CrowdAtlasFrame[] } {
  const cols = CROWD_LOOKS * CROWD_FRAMES.length;
  const rows = shirts.length * CROWD_VIEWS.length;
  const buf = new PixelBuffer(cols * CROWD_FW, rows * CROWD_FH + FLAG_H);
  const frames: CrowdAtlasFrame[] = [];
  shirts.forEach((shirt, si) => {
    CROWD_VIEWS.forEach((view, vi) => {
      const y = (si * CROWD_VIEWS.length + vi) * CROWD_FH;
      let col = 0;
      for (let look = 0; look < CROWD_LOOKS; look++) {
        for (const frame of CROWD_FRAMES) {
          const x = col * CROWD_FW;
          buf.blit(drawSpectator(shirt, look, view, frame, gearFor(shirts, si)), x, y);
          frames.push({ name: crowdFrameName(si, look, view, frame), x, y, w: CROWD_FW, h: CROWD_FH });
          col++;
        }
      }
    });
  });
  const fy = rows * CROWD_FH;
  for (const f of FLAG_FRAMES) {
    buf.blit(drawFlag(shirts[0] ?? 0xffffff, shirts[1] ?? 0x000000, f), f * FLAG_W, fy);
    frames.push({ name: flagFrameName(f), x: f * FLAG_W, y: fy, w: FLAG_W, h: FLAG_H });
  }
  return { buf, frames };
}

/** Deterministic shirt index for a seat, weighted by its bay. */
export function shirtForSeat(seat: Pick<CrowdSeat, 'r' | 'bay'>): number {
  const weights: Record<CrowdBay, readonly number[]> = {
    // homeJ, homeT, awayJ, awayT, white, grey, denim, black
    home: [0.56, 0.2, 0.04, 0.02, 0.06, 0.04, 0.05, 0.03],
    away: [0.08, 0.03, 0.5, 0.2, 0.06, 0.04, 0.05, 0.04],
    mixed: [0.34, 0.12, 0.22, 0.08, 0.07, 0.06, 0.06, 0.05],
  };
  const w = weights[seat.bay];
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += w[i]!;
    if (seat.r < acc) return i;
  }
  return 0;
}

/** Deterministic look for a seat (independent of its shirt). */
export function lookForSeat(seat: Pick<CrowdSeat, 'r'>): number {
  return Math.floor(noise2(Math.floor(seat.r * 1e6), 5, 17) * CROWD_LOOKS);
}

/** Whether a seat's spectator is drawn mirrored (twice the faces for no frames). */
export function flipForSeat(seat: Pick<CrowdSeat, 'r'>): boolean {
  return noise2(Math.floor(seat.r * 1e6), 9, 23) < 0.5;
}

/**
 * The crowd's mood, 0 calm … 1 full: each side's excitement (a score, a break), each
 * side's dismay (a try against them, a missed kick at goal), heads up for a ball high
 * in the air, the whole ground on its feet (kick-off, full time), and a Mexican wave's
 * front, 0 → 1 round the stands (absent when there is none).
 */
export interface CrowdMood {
  home: number;
  away: number;
  groan?: { home: number; away: number };
  up?: number;
  rise?: number;
  wave?: number;
}

/**
 * Share of a side's fans on their feet at excitement `hype` (0..1). Front-loaded
 * so even a big hit (hype ≈ 0.3) visibly stands half the bay; a try stands all.
 */
export function cheerShare(hype: number): number {
  return hype <= 0 ? 0 : Math.min(1, 0.15 + hype * 1.15);
}

/** Idle share of fans shifting in their seat (bob) on any tick. */
export const IDLE_BOB = 0.1;
/** Idle share of fans giving a one-arm wave on any tick. */
export const IDLE_WAVE = 0.012;
/** Half-width of a Mexican wave's band, as a share of the way round. */
export const WAVE_BAND = 0.045;

/**
 * Pose for one spectator on animation tick `tick`. `along` is where his seat is on the
 * way round the stands (0..1), for a Mexican wave. In order: the wave passing him;
 * cheering when his side is hyped (jump → arms up → wave, phase-staggered so the stand
 * ripples); hands on head when his side has just been hurt; heads up while the ball is
 * high; on his feet clapping when the ground rises; else the idle shuffle and the odd
 * wave. WHO reacts is mostly stable per seat (a little per-tick jitter), so a bay fills
 * as the mood rises and empties as it decays rather than flickering at random.
 */
export function crowdPose(seatR: number, side: 'home' | 'away' | null, tick: number, mood: CrowdMood, along = 0): CrowdPose {
  const id = Math.floor(seatR * 1e6);
  if (mood.wave !== undefined) {
    const d = Math.abs(along - mood.wave);
    if (d < WAVE_BAND) return 3;
    if (d < WAVE_BAND * 2) return 8;
  }
  const hype = side === 'home' ? mood.home : side === 'away' ? mood.away : Math.max(mood.home, mood.away) * 0.4;
  const roll = noise2(id, 3, 3) * 0.85 + noise2(id, tick, 3) * 0.15;
  if (hype > 0 && roll < cheerShare(hype)) {
    if (hype >= 0.5) {
      const beat = (tick + id) % 3;
      return beat === 0 ? 3 : beat === 1 ? 2 : 4;
    }
    return (tick + id) % 2 === 0 ? 2 : 4;
  }
  const g = mood.groan;
  const groan = !g ? 0 : side === 'home' ? g.home : side === 'away' ? g.away : Math.max(g.home, g.away) * 0.3;
  if (groan > 0 && noise2(id, 5, 7) < Math.min(1, groan * 1.1)) return 5;
  if ((mood.up ?? 0) > 0 && noise2(id, 6, 7) < (mood.up ?? 0) * 0.9) return 6;
  if ((mood.rise ?? 0) > 0 && noise2(id, 8, 7) < (mood.rise ?? 0)) return (tick + id) % 2 === 0 ? 7 : 8;
  const idle = noise2(id, tick >> 1, 11);
  if (idle < IDLE_WAVE) return 4;
  return idle < IDLE_WAVE + IDLE_BOB ? 1 : 0;
}
