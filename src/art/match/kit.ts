// src/art/match/kit.ts — team kit palettes for generated match art.
//
// A club only carries two hex colours (`colors[0]` jersey, `colors[1]` trim), so
// everything else a pixel kit needs — shades, highlights, shorts, socks and a
// per-club jersey pattern — is derived here, deterministically. Pure and
// Phaser-free (unit-tested in tests/art/match/kit.test.ts).
import { hexToInt, mix, shade } from '../pixel';

/** Shared dark outline for every match sprite (warm near-black, not pure #000). */
export const OUTLINE = 0x1c1424;

/** Jersey decoration drawn in the trim colour. Picked per club from its id. */
export type KitPattern = 'v' | 'hoops' | 'sleeves';

export interface Kit {
  jersey: number;
  jerseyLight: number;
  jerseyShade: number;
  trim: number;
  trimShade: number;
  shorts: number;
  shortsShade: number;
  sock: number;
  sockHoop: number;
  pattern: KitPattern;
}

/** Perceived luminance 0..255 (Rec. 601 weights). */
export function luminance(c: number): number {
  return 0.299 * ((c >> 16) & 0xff) + 0.587 * ((c >> 8) & 0xff) + 0.114 * (c & 0xff);
}

/** Euclidean RGB distance 0..~441. */
export function colorDistance(a: number, b: number): number {
  const dr = ((a >> 16) & 0xff) - ((b >> 16) & 0xff);
  const dg = ((a >> 8) & 0xff) - ((b >> 8) & 0xff);
  const db = (a & 0xff) - (b & 0xff);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Small deterministic string hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const PATTERNS: readonly KitPattern[] = ['v', 'hoops', 'sleeves'];

/** Shade that still reads on very dark colours (lift instead of darken). */
function shadeFor(c: number): number {
  return luminance(c) < 50 ? mix(c, 0x000000, 0.55) : shade(c, 0.72);
}

/** Highlight that still reads on very light colours (tint toward warm white). */
function lightFor(c: number): number {
  return luminance(c) > 215 ? c : mix(c, 0xfff8e8, 0.28);
}

/**
 * Build a kit from a club's two hex colours. `alt` swaps jersey and trim — the
 * "away strip" used when both teams' jerseys would read as the same colour.
 */
export function kitFromColors(colors: readonly [string, string], clubId: string, alt = false): Kit {
  const a = hexToInt(colors[0]);
  const b = hexToInt(colors[1]);
  const jersey = alt ? b : a;
  const trim = alt ? a : b;
  // Shorts: league sides mostly wear dark shorts. Use the trim when it is dark,
  // the trim (lightly shaded) for near-black jerseys so legs don't vanish, and a
  // navy-black otherwise.
  const shorts =
    luminance(jersey) < 60 ? shade(trim, 0.85) : luminance(trim) < 100 ? trim : 0x23263a;
  return {
    jersey,
    jerseyLight: lightFor(jersey),
    jerseyShade: shadeFor(jersey),
    trim,
    trimShade: shadeFor(trim),
    shorts,
    shortsShade: mix(shorts, 0x000000, 0.4),
    sock: jersey,
    sockHoop: trim,
    pattern: PATTERNS[hashString(clubId) % PATTERNS.length] ?? 'v',
  };
}

/** Jerseys closer than this (RGB distance) are treated as a colour clash. */
export const CLASH_DISTANCE = 90;

/**
 * Kits for a fixture. If the two jerseys clash, the away side wears its alternate
 * strip (jersey/trim swapped) — whichever of the two reads more distinct.
 */
export function resolveKits(
  home: { clubId: string; colors: readonly [string, string] },
  away: { clubId: string; colors: readonly [string, string] },
): { home: Kit; away: Kit; awayAlt: boolean } {
  const homeKit = kitFromColors(home.colors, home.clubId);
  const awayKit = kitFromColors(away.colors, away.clubId);
  if (colorDistance(homeKit.jersey, awayKit.jersey) >= CLASH_DISTANCE) {
    return { home: homeKit, away: awayKit, awayAlt: false };
  }
  const alt = kitFromColors(away.colors, away.clubId, true);
  const useAlt = colorDistance(homeKit.jersey, alt.jersey) > colorDistance(homeKit.jersey, awayKit.jersey);
  return useAlt ? { home: homeKit, away: alt, awayAlt: true } : { home: homeKit, away: awayKit, awayAlt: false };
}
