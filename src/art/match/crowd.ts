// src/art/match/crowd.ts — tiny spectators for the stands.
//
// Each spectator is a 7×9 figure (9×13 frame with outline + jump headroom) in
// one of a handful of shirts: both teams' jersey + trim colours plus a few
// neutrals. Five poses — seated, seated bob, standing cheer (arms up), cheer-jump
// (2px off the step) and a one-arm wave — swapped on a timer give the stands
// life: calm fans shift and the odd one waves; fans of a side that scores (or
// lands a big hit) are on their feet jumping and waving in a staggered rhythm
// that ripples across the stand (GitHub #16 — the old 1px bob read as static).
// Two views: 'front' (stands facing the camera) and 'back' (near terraces, we
// see the backs of heads). Pure + deterministic: shirt/look/phase come from the
// seat's stable hash, and crowdPose() is a pure function of (seat, tick, mood).
import { PixelBuffer, noise2, shade } from '../pixel';
import { OUTLINE, type Kit } from './kit';
import { LOOKS } from './players';
import type { CrowdBay, CrowdSeat } from './stadium';

export const CROWD_FW = 9;
export const CROWD_FH = 13;
/** Feet row inside a frame (sprite origin is bottom-centre). */
export const CROWD_BASE = 11;

export type CrowdView = 'front' | 'back';
/** 0 seated, 1 seated bob, 2 cheer, 3 cheer jump, 4 one-arm wave. */
export type CrowdPose = 0 | 1 | 2 | 3 | 4;
export const CROWD_POSES: readonly CrowdPose[] = [0, 1, 2, 3, 4];
/** Pixels a pose lifts the whole figure off its step. */
export const POSE_LIFT: Record<CrowdPose, number> = { 0: 0, 1: 1, 2: 0, 3: 2, 4: 0 };
export const CROWD_VIEWS: readonly CrowdView[] = ['front', 'back'];

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

// Grids are 7 wide × 9 tall, feet on the last row. T shirt, t shirt shade,
// S skin, H hair.
const SIT_FRONT = ['.......', '.......', '..HHH..', '.HSSSH.', '..SSS..', '.TTTTT.', 'TTTTTTT', 'STTTTTS', '.ttttt.'];
const CHEER_FRONT = ['S.....S', 'S.HHH.S', 'THSSSHT', 'T.SSS.T', 'TTTTTTT', '.TTTTT.', '.TTTTT.', '.TTTTT.', '.ttttt.'];
const SIT_BACK = ['.......', '.......', '..HHH..', '.HHHHH.', '..HHH..', '.TTTTT.', 'TTTTTTT', 'TTTTTTT', '.ttttt.'];
const CHEER_BACK = ['S.....S', 'S.HHH.S', 'THHHHHT', 'T.HHH.T', 'TTTTTTT', '.TTTTT.', '.TTTTT.', '.TTTTT.', '.ttttt.'];
const WAVE_FRONT = ['......S', '......S', '..HHH.T', '.HSSSHT', '..SSS.T', '.TTTTTT', 'TTTTTT.', 'STTTTT.', '.ttttt.'];
const WAVE_BACK = ['......S', '......S', '..HHH.T', '.HHHHHT', '..HHH.T', '.TTTTTT', 'TTTTTT.', 'TTTTTT.', '.ttttt.'];

function gridFor(view: CrowdView, pose: CrowdPose): readonly string[] {
  if (pose === 4) return view === 'front' ? WAVE_FRONT : WAVE_BACK;
  const cheer = pose === 2 || pose === 3;
  return view === 'front' ? (cheer ? CHEER_FRONT : SIT_FRONT) : cheer ? CHEER_BACK : SIT_BACK;
}

/** One outlined spectator frame. */
export function drawSpectator(shirt: number, look: number, view: CrowdView, pose: CrowdPose): PixelBuffer {
  const lk = LOOKS[look % LOOKS.length]!;
  const grid = gridFor(view, pose);
  const lift = POSE_LIFT[pose];
  const b = new PixelBuffer(CROWD_FW, CROWD_FH);
  b.sprite(grid, { T: shirt, t: shade(shirt, 0.72), S: lk.skin, H: lk.hair }, 1, CROWD_BASE - 8 - lift);
  b.outline(OUTLINE);
  return b;
}

export function crowdFrameName(shirt: number, look: number, view: CrowdView, pose: CrowdPose): string {
  return `c${shirt}-${look}-${view}-${pose}`;
}

export interface CrowdAtlasFrame {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every shirt × look × view × pose, one row per shirt. */
export function buildCrowdAtlas(shirts: readonly number[]): { buf: PixelBuffer; frames: CrowdAtlasFrame[] } {
  const perRow = LOOKS.length * CROWD_VIEWS.length * CROWD_POSES.length;
  const buf = new PixelBuffer(perRow * CROWD_FW, shirts.length * CROWD_FH);
  const frames: CrowdAtlasFrame[] = [];
  shirts.forEach((shirt, si) => {
    let col = 0;
    for (let look = 0; look < LOOKS.length; look++) {
      for (const view of CROWD_VIEWS) {
        for (const pose of CROWD_POSES) {
          const x = col * CROWD_FW;
          const y = si * CROWD_FH;
          buf.blit(drawSpectator(shirt, look, view, pose), x, y);
          frames.push({ name: crowdFrameName(si, look, view, pose), x, y, w: CROWD_FW, h: CROWD_FH });
          col++;
        }
      }
    }
  });
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
  return Math.floor(noise2(Math.floor(seat.r * 1e6), 5, 17) * LOOKS.length);
}

/** Crowd excitement: 0 calm … 1 on their feet. */
export interface CrowdMood {
  home: number;
  away: number;
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

/**
 * Pose for one spectator on animation tick `tick`. Calm fans shift (a 1px bob
 * held for two ticks) and the odd one waves; excited fans of the hyped side
 * stand and cycle jump → arms-up → wave, phase-staggered per seat so the stand
 * ripples. WHO stands is mostly stable per seat (with a little per-tick jitter),
 * so a bay fills up as hype rises and empties as it decays, rather than
 * flickering at random.
 */
export function crowdPose(seatR: number, side: 'home' | 'away' | null, tick: number, mood: CrowdMood): CrowdPose {
  const hype = side === 'home' ? mood.home : side === 'away' ? mood.away : Math.max(mood.home, mood.away) * 0.4;
  const id = Math.floor(seatR * 1e6);
  if (hype > 0) {
    const roll = noise2(id, 3, 3) * 0.85 + noise2(id, tick, 3) * 0.15;
    if (roll < cheerShare(hype)) {
      if (hype >= 0.5) {
        const beat = (tick + id) % 3;
        return beat === 0 ? 3 : beat === 1 ? 2 : 4;
      }
      return (tick + id) % 2 === 0 ? 2 : 4;
    }
  }
  const idle = noise2(id, tick >> 1, 11);
  if (idle < IDLE_WAVE) return 4;
  return idle < IDLE_WAVE + IDLE_BOB ? 1 : 0;
}
