// src/art/match/kit.ts — team kit palettes for generated match art.
//
// A club only carries two hex colours (`colors[0]` jersey, `colors[1]` trim), so
// everything else a pixel kit needs — shades, highlights, shorts, socks and a
// per-club jersey pattern — is derived here, deterministically. Pure and
// Phaser-free (unit-tested in tests/art/match/kit.test.ts).
import { hexToInt, mix, shade } from '../pixel';

/** Shared dark outline for every match sprite (warm near-black, not pure #000). */
export const OUTLINE = 0x1c1424;

/** Jersey decoration drawn in the trim colour. Picked per club from its id, or chosen in the kit designer (#79). */
export type KitPattern = 'plain' | 'v' | 'hoops' | 'sleeves' | 'stripes';

/** Every pattern, in designer order. */
export const KIT_PATTERNS: readonly KitPattern[] = ['plain', 'v', 'hoops', 'sleeves', 'stripes'];

/**
 * A club's own kit design (GitHub #79): the home jersey stays the club's primary
 * colour; the trim and pattern are chosen, and the alternate strip is chosen
 * outright. Hex colours, like RivalClub.colors.
 */
export interface KitDesign {
  pattern: KitPattern;
  trim: string;
  alt: { jersey: string; trim: string; pattern: KitPattern };
}

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

/** Patterns a club is assigned from its id when it has no design (the pre-#79 set). */
const PATTERNS: readonly KitPattern[] = ['v', 'hoops', 'sleeves'];

/** The pattern a club wears without a design. */
export function defaultPattern(clubId: string): KitPattern {
  return PATTERNS[hashString(clubId) % PATTERNS.length] ?? 'v';
}

/** The design that reproduces a club's current look: so the designer starts from it. */
export function defaultKitDesign(colors: readonly [string, string], clubId: string): KitDesign {
  const pattern = defaultPattern(clubId);
  return { pattern, trim: colors[1], alt: { jersey: colors[1], trim: colors[0], pattern } };
}

// Club id → design. Only clubs with a design are listed; everyone else keeps the
// derived look. main.ts keeps the player's entry in step with GameState.kit, so
// matches, the crowd, grounds characters and portraits all pick it up through
// kitFromColors without knowing about designs.
const designs = new Map<string, KitDesign>();

/** Set (or with null, clear) a club's kit design. */
export function setKitDesign(clubId: string, design: KitDesign | null | undefined): void {
  if (design) designs.set(clubId, design);
  else designs.delete(clubId);
}

/** A club's registered design, if any. */
export function kitDesignFor(clubId: string): KitDesign | undefined {
  return designs.get(clubId);
}

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
  const design = designs.get(clubId);
  if (design) return kitFromDesign(colors[0], design, alt);
  const a = hexToInt(colors[0]);
  const b = hexToInt(colors[1]);
  return buildKit(alt ? b : a, alt ? a : b, defaultPattern(clubId));
}

/** A designed kit: home = the club primary with the chosen trim and pattern; alt = the chosen strip. */
export function kitFromDesign(primary: string, design: KitDesign, alt = false): Kit {
  return alt
    ? buildKit(hexToInt(design.alt.jersey), hexToInt(design.alt.trim), design.alt.pattern)
    : buildKit(hexToInt(primary), hexToInt(design.trim), design.pattern);
}

/** A kit from a jersey, a trim and a pattern; shades and shorts derived the same way as a club's. */
export function buildKit(jersey: number, trim: number, pattern: KitPattern): Kit {
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
    pattern,
  };
}

/**
 * Jerseys closer than this (RGB distance) read as the same colour: the kit
 * designer offers alternate jerseys well clear of it. A fixture's clash is judged
 * on the whole sprite (resolveKits in kitClash.ts).
 */
export const CLASH_DISTANCE = 90;
