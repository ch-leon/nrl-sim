// src/art/portrait.ts — head-and-shoulders pixel portraits for player cards (#26).
//
// A portrait is the same figure the match draws, cropped to the head and
// shoulders of the idle frame: same LOOKS entry (lookForPlayer on the player id,
// exactly as MatchScene keys it), same kit palette. Squad players wear their club
// kit; free agents wear TRAINING_KIT. Pure and Phaser-free except encodeCanvas,
// which is the only DOM step and is injectable so tests run under node.
import { PixelBuffer } from './pixel';
import { kitFromColors, type Kit } from './match/kit';
import { LOOKS, drawPlayerFrame, lookForPlayer } from './match/players';

/** Portrait size in source pixels; the UI shows it at PORTRAIT_SCALE×. */
export const PORTRAIT_W = 16;
export const PORTRAIT_H = 16;
export const PORTRAIT_SCALE = 3;

/**
 * Top-left of the crop inside an idle frame (FRAME_W × FRAME_H = 28 × 30). The
 * head starts on row 5 and the torso ends on row 18, so this box holds the head,
 * the shoulders and a sliver of shorts, centred on the body origin (x = 13).
 */
const CROP_X = 6;
const CROP_Y = 4;

/** Backdrop behind the figure: a flat navy that sits under the card's UI palette. */
const BACKDROP = 0x2b3150;
/** Hard border so the portrait reads as a framed badge, not a cut-out. */
const FRAME = 0x0d0b14;

/** Neutral grey training top for free agents (not tied to any club). */
export const TRAINING_KIT: Kit = kitFromColors(['#5c6370', '#c8ccd4'], 'training');

/**
 * Cache key for a kit. Kits built from the same two colours and club pattern
 * compare equal; the shorts and shades are derived from these, so they add
 * nothing to the key.
 */
export function kitKey(kit: Kit): string {
  return `${kit.jersey.toString(16)}.${kit.trim.toString(16)}.${kit.pattern}`;
}

/** Cache key for a look + kit pair: `look|kit`. */
export function portraitKey(look: number, kit: Kit): string {
  return `${look}|${kitKey(kit)}`;
}

/**
 * Paint one portrait: a framed backdrop with the cropped head-and-shoulders of
 * the idle pose. Pure and deterministic for a given look index and kit.
 */
export function buildPortrait(look: number, kit: Kit): PixelBuffer {
  const lk = LOOKS[look] ?? LOOKS[0]!;
  const figure = drawPlayerFrame(kit, lk, 'idle', 0);
  const buf = new PixelBuffer(PORTRAIT_W, PORTRAIT_H);
  buf.fillRect(0, 0, PORTRAIT_W, PORTRAIT_H, BACKDROP);
  for (let y = 0; y < PORTRAIT_H; y++) {
    for (let x = 0; x < PORTRAIT_W; x++) {
      const { color, alpha } = figure.get(CROP_X + x, CROP_Y + y);
      if (alpha > 0) buf.set(x, y, color, alpha / 255);
    }
  }
  // Frame: the outermost ring of pixels.
  buf.fillRect(0, 0, PORTRAIT_W, 1, FRAME);
  buf.fillRect(0, PORTRAIT_H - 1, PORTRAIT_W, 1, FRAME);
  buf.fillRect(0, 0, 1, PORTRAIT_H, FRAME);
  buf.fillRect(PORTRAIT_W - 1, 0, 1, PORTRAIT_H, FRAME);
  return buf;
}

/** Turns a portrait buffer into an image URL. Injected so tests skip the DOM. */
export type PortraitEncoder = (buf: PixelBuffer) => string;

/** Browser encoder: paints the buffer onto an off-DOM canvas and reads a PNG data URL. */
export function encodeCanvas(buf: PixelBuffer): string {
  const canvas = document.createElement('canvas');
  canvas.width = buf.w;
  canvas.height = buf.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(buf.w, buf.h);
  img.data.set(buf.data);
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

const cache = new Map<string, string>();

/**
 * Data URL for a player's portrait, drawn once per look + kit and then reused.
 * `playerKey` is the id the match keys on (`id ?? name`), so a player has the
 * same face on their card and on the pitch.
 */
export function portraitDataUrl(playerKey: string, kit: Kit, encode: PortraitEncoder = encodeCanvas): string {
  const look = lookForPlayer(playerKey);
  const key = portraitKey(look, kit);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const url = encode(buildPortrait(look, kit));
  cache.set(key, url);
  return url;
}

/** Drop every cached portrait (tests, or after a palette change). */
export function clearPortraitCache(): void {
  cache.clear();
}

/** Number of portraits currently cached. */
export function portraitCacheSize(): number {
  return cache.size;
}
