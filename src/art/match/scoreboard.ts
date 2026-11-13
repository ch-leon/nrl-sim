// src/art/match/scoreboard.ts — the ground's LED scoreboard (#673), standing on the
// grandstand roof behind halfway. The face is drawn flat (both sides' tags and points
// in the 3×5 hoarding font at double size) and sheared onto the stand's 2:1 line like
// the hoardings; after a score it flashes TRY!/GOAL in the scorer's colours. Pure +
// Phaser-free: MatchScene paints it into one texture whenever what it shows changes.
import { PixelBuffer, mix, shade } from '../pixel';
import { OUTLINE, luminance, type Kit } from './kit';
import { drawText, textWidth, GLYPH_H } from './font';
import { BACK_FAR, BACK_TIERS, BACK_WALL_H, TIER_BASE, TIER_RISE } from './stadium';
import { isoProject } from './iso3d';

/** The face, flat: two lines of double-size text. */
export const BOARD_W = 58;
export const BOARD_H = 32;
/** Legs from the face down to the roof (px). */
const LEG_H = 9;
/** The text's scale: each font pixel a 2×2 LED block. */
const SCALE = 2;

/** Where it stands: the roof's middle, behind halfway (grid units), its feet on the roof. */
export const BOARD_GX = 15 - BOARD_W / 64;
export const BOARD_GY = BACK_FAR - 0.6;
export const BOARD_FOOT_Z = TIER_BASE + (BACK_TIERS - 1) * TIER_RISE + BACK_WALL_H + 2;

/** The painted buffer: the face sheared down-right (half a px per px), the legs under it. */
export const BOARD_TEX_W = BOARD_W + 2;
export const BOARD_TEX_H = BOARD_H + Math.ceil(BOARD_W / 2) + LEG_H + 2;

/** World position of the painted buffer's top-left corner. */
export function scoreboardOrigin(offsetX: number): { x: number; y: number } {
  const foot = isoProject(BOARD_GX, BOARD_GY, BOARD_FOOT_Z, offsetX);
  return { x: Math.round(foot.x) - 1, y: Math.round(foot.y) - LEG_H - BOARD_H - 1 };
}

/** The flash after a score: the word, and whether this beat is the lit one. */
export interface BoardFlash {
  word: string;
  side: 'home' | 'away';
  on: boolean;
}

export interface BoardState {
  tags: readonly [string, string];
  score: readonly [number, number];
  flash?: BoardFlash | null;
}

const LED_AMBER = 0xffb22e;
const LED_BG = 0x111318;
const LED_DOT = 0x191c22;
const CASE = 0x2b2f38;
const CASE_LIGHT = 0x4a505c;

/** A team colour that reads on the black face: the jersey, or the trim when the jersey is too dark. */
export function boardColor(kit: Kit): number {
  const c = luminance(kit.jersey) >= 70 ? kit.jersey : luminance(kit.trim) >= 70 ? kit.trim : 0xf2f0ea;
  return mix(c, 0xffffff, 0.15);
}

/** The word a score flashes: a try (4 or 5), a goal (2), a field goal (1). */
export function flashWord(points: number): string {
  return points >= 4 ? 'TRY!' : points === 2 ? 'GOAL' : 'POINT';
}

function textAt(face: PixelBuffer, text: string, x: number, y: number, color: number, scale = SCALE): void {
  drawText(text, (gx, gy) => face.fillRect(x + gx * scale, y + gy * scale, scale, scale, color));
}

/** The flat face for a state. */
export function drawBoardFace(state: BoardState, colors: readonly [number, number]): PixelBuffer {
  const face = new PixelBuffer(BOARD_W, BOARD_H);
  // The casing, then the LED field with its dot grid.
  face.fillRect(0, 0, BOARD_W, BOARD_H, CASE);
  face.fillRect(0, 0, BOARD_W, 1, CASE_LIGHT);
  const f = state.flash;
  const lit = f && f.on;
  const bg = lit ? shade(colors[f.side === 'home' ? 0 : 1], 0.55) : LED_BG;
  face.fillRect(2, 2, BOARD_W - 4, BOARD_H - 4, bg);
  for (let y = 2; y < BOARD_H - 2; y += 2) for (let x = 2 + ((y >> 1) & 1); x < BOARD_W - 2; x += 2) face.set(x, y, lit ? shade(bg, 1.15) : LED_DOT);
  if (f) {
    // The word, big and centred, in the scorer's colour (white on the lit beat).
    const scale = textWidth(f.word) * 3 <= BOARD_W - 8 ? 3 : SCALE;
    const w = textWidth(f.word) * scale;
    const h = GLYPH_H * scale;
    textAt(face, f.word, Math.floor((BOARD_W - w) / 2), Math.floor((BOARD_H - h) / 2), lit ? 0xffffff : colors[f.side === 'home' ? 0 : 1], scale);
    return face;
  }
  // Two lines: a tag in its side's colour, the points right-aligned in amber.
  const line = (i: 0 | 1, y: number): void => {
    textAt(face, state.tags[i].slice(0, 3), 5, y, colors[i]);
    const pts = String(Math.max(0, Math.min(999, Math.round(state.score[i]))));
    textAt(face, pts, BOARD_W - 5 - textWidth(pts) * SCALE, y, LED_AMBER);
  };
  line(0, 4);
  line(1, 18);
  return face;
}

/** The whole board: the face sheared onto the stand's line, on two legs, outlined. */
export function drawScoreboard(state: BoardState, colors: readonly [number, number]): PixelBuffer {
  const face = drawBoardFace(state, colors);
  const out = new PixelBuffer(BOARD_TEX_W, BOARD_TEX_H);
  for (let x = 0; x < BOARD_W; x++) {
    const dy = Math.floor(x / 2);
    for (let y = 0; y < BOARD_H; y++) {
      const p = face.get(x, y);
      if (p.alpha) out.set(x + 1, y + 1 + dy, p.color);
    }
    // The legs, a little in from each end, down to the roof.
    if (x === 8 || x === 9 || x === BOARD_W - 10 || x === BOARD_W - 9) {
      for (let y = BOARD_H; y < BOARD_H + LEG_H; y++) out.set(x + 1, y + 1 + dy, x % 2 ? shade(CASE, 0.8) : CASE_LIGHT);
    }
  }
  out.outline(OUTLINE);
  return out;
}
