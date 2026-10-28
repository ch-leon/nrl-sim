// src/art/match/kitClash.ts — can the two sides be told apart on the pitch (#340)?
//
// A kit is judged on the pixels a player sprite actually wears, not on its two
// club colours: the standing and running frames are painted once per pattern with
// a probe kit (one marker colour per kit role) to learn how much of the sprite
// each role covers, and a real kit's coverage is those weights on its colours.
// Two kits clash when a large part of either sprite has no near colour on the
// other (CIE Lab ΔE, weighted by coverage). Darwin (brown jersey, gold shorts and
// trim) against a gold jersey with navy shorts is the case the jersey-only check
// missed: the same two colours in swapped places, one gold-and-dark blob at speed.
//
// Then the away side wears its alternate strip, or failing that a clash strip
// built here from the club's colours, and each side gets a ring colour for the
// marks under its players, drawn solid for home and dashed for away (#371) so the
// sides differ in shape as well as colour. Pure and Phaser-free
// (tests/art/match/kitClash.test.ts).
import { shade } from '../pixel';
import { buildKit, kitFromColors, type Kit, type KitPattern } from './kit';
import { LOOKS, drawPlayerFrame, type PlayerAnim } from './players';

/** Contrast (coverage-weighted ΔE, see kitContrast) below which two kits clash. */
export const KIT_CLASH_MIN = 30;
/** The two sides' ring colours are at least this far apart (ΔE) whenever the kits allow. */
export const RING_MIN_DELTA = 30;

type Role = 'jersey' | 'jerseyLight' | 'jerseyShade' | 'trim' | 'trimShade' | 'shorts' | 'shortsShade' | 'sock' | 'sockHoop';
const ROLES: readonly Role[] = ['jersey', 'jerseyLight', 'jerseyShade', 'trim', 'trimShade', 'shorts', 'shortsShade', 'sock', 'sockHoop'];
/** Marker colours, one per role, that no look (skin, hair, boots, outline) uses. */
const PROBE: readonly number[] = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0x800000, 0x008000, 0x000080];
/** The frames a kit is judged on: standing, and two strides of the run. */
const FRAMES: readonly [PlayerAnim, number][] = [['idle', 0], ['run', 0], ['run', 1]];

const weightsByPattern = new Map<KitPattern, ReadonlyMap<Role, number>>();

/** How much of a player sprite each kit role covers for a pattern (fractions summing to 1). */
export function roleCoverage(pattern: KitPattern): ReadonlyMap<Role, number> {
  const known = weightsByPattern.get(pattern);
  if (known) return known;
  const probe = Object.fromEntries(ROLES.map((r, i) => [r, PROBE[i]!])) as Record<Role, number>;
  const kit: Kit = { ...probe, pattern };
  // Far limbs are drawn darker (players.ts darken): count them for their role too.
  const byColor = new Map<number, Role>();
  ROLES.forEach((r) => {
    byColor.set(probe[r], r);
    byColor.set(shade(probe[r], 0.78), r);
  });
  const counts = new Map<Role, number>();
  let total = 0;
  for (const [anim, frame] of FRAMES) {
    const buf = drawPlayerFrame(kit, LOOKS[0]!, anim, frame);
    for (let y = 0; y < buf.h; y++) {
      for (let x = 0; x < buf.w; x++) {
        const px = buf.get(x, y);
        if (px.alpha === 0) continue;
        const role = byColor.get(px.color);
        if (!role) continue;
        counts.set(role, (counts.get(role) ?? 0) + 1);
        total++;
      }
    }
  }
  const out = new Map<Role, number>();
  for (const [r, n] of counts) out.set(r, n / Math.max(1, total));
  weightsByPattern.set(pattern, out);
  return out;
}

/** A kit's colours, each with the share of the sprite it covers. */
export function kitCoverage(kit: Kit): { color: number; weight: number }[] {
  const merged = new Map<number, number>();
  for (const [role, w] of roleCoverage(kit.pattern)) {
    const c = kit[role];
    merged.set(c, (merged.get(c) ?? 0) + w);
  }
  return [...merged].map(([color, weight]) => ({ color, weight }));
}

// ── CIE Lab (D65) ───────────────────────────────────────────────────────────

type Lab = readonly [number, number, number];
const labCache = new Map<number, Lab>();

/** sRGB 0xRRGGBB to CIE L*a*b*. */
export function toLab(c: number): Lab {
  const hit = labCache.get(c);
  if (hit) return hit;
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = lin((c >> 16) & 0xff);
  const g = lin((c >> 8) & 0xff);
  const b = lin(c & 0xff);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const lab: Lab = [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  labCache.set(c, lab);
  return lab;
}

/** Perceptual distance between two colours (CIE76 ΔE: about 2.3 is just noticeable). */
export function deltaE(a: number, b: number): number {
  const p = toLab(a);
  const q = toLab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Coverage-weighted ΔE from each colour of `from` to the nearest colour of `to`. */
function reach(from: readonly { color: number; weight: number }[], to: readonly { color: number; weight: number }[]): number {
  let sum = 0;
  for (const a of from) sum += a.weight * Math.min(...to.map((b) => deltaE(a.color, b.color)));
  return sum;
}

/**
 * How well two kits read apart on the pitch: the larger of the two directions'
 * coverage-weighted distance to the nearest colour on the other sprite. High when
 * much of either sprite wears a colour the other lacks; low when both wear the
 * same colours, whichever way round.
 */
export function kitContrast(a: Kit, b: Kit): number {
  const ca = kitCoverage(a);
  const cb = kitCoverage(b);
  return Math.max(reach(ca, cb), reach(cb, ca));
}

// ── Clash strips and rings ──────────────────────────────────────────────────

/** Jerseys a clash strip may use, the classic changes first. */
export const CLASH_JERSEYS: readonly number[] = [0xf4f1ea, 0x1a1a2e, 0xc0392b, 0x2e6fd8, 0xe67e22, 0x8e44ad];
const WHITE = 0xf4f1ea;
const NAVY_BLACK = 0x1a1a2e;

/** Which strip the away side wears. */
export type AwayStrip = 'home' | 'alt' | 'clash';

/** A clash strip on `jersey`: trimmed in whichever club colour reads on it (white or near-black if neither does). */
export function clashStrip(jersey: number, colors: readonly [string, string], pattern: KitPattern): Kit {
  const club = colors.map((h) => parseInt(h.replace('#', ''), 16));
  const best = club.reduce((p, c) => (deltaE(c, jersey) > deltaE(p, jersey) ? c : p));
  const trim = deltaE(best, jersey) >= 40 ? best : deltaE(WHITE, jersey) > deltaE(NAVY_BLACK, jersey) ? WHITE : NAVY_BLACK;
  return buildKit(jersey, trim, pattern);
}

/** The pitch's two mown stripes: a ring has to show against them. */
const GRASS: readonly number[] = [0x5fb24a, 0x4fa03f];

/** Ring colours for the marks under each side's players: a colour from each kit, far apart and off the grass. */
export function ringColors(home: Kit, away: Kit): { home: number; away: number } {
  const own = (k: Kit): number[] => [k.jersey, k.trim, k.shorts];
  let best = { home: home.jersey, away: away.jersey, score: -Infinity };
  own(home).forEach((h, i) => {
    own(away).forEach((a, j) => {
      const grass = Math.min(...GRASS.map((g) => Math.min(deltaE(h, g), deltaE(a, g))));
      // Jerseys are the side's colour: prefer them, then the trim, unless they sit too close.
      const score = Math.min(deltaE(h, a), RING_MIN_DELTA * 2) + Math.min(grass, 25) - 6 * (i + j);
      if (score > best.score) best = { home: h, away: a, score };
    });
  });
  return { home: best.home, away: best.away };
}

/** How a side's ring is drawn (#371): home's a solid line, away's dashed, whatever the colours (greyscale, two close kits). */
export type RingStyle = 'solid' | 'dashed';
export const RING_STYLES: Readonly<{ home: RingStyle; away: RingStyle }> = { home: 'solid', away: 'dashed' };
/** Dashes round a dashed ring, and the share of each dash-and-gap the dash takes: few and bold, so they read at the default zoom. */
export const RING_DASHES = 6;
export const RING_DASH_SHARE = 0.6;

/**
 * A ring's outline as polylines, centred on (0, 0), `w` × `h` world px: a solid ring is
 * one closed loop, a dashed one RING_DASHES arcs with gaps between, the first gap
 * straddling the right-hand end so the dashes sit symmetric under the player.
 */
export function ringOutline(style: RingStyle, w: number, h: number, steps = 32): { x: number; y: number }[][] {
  const at = (t: number): { x: number; y: number } => ({ x: (w / 2) * Math.cos(t), y: (h / 2) * Math.sin(t) });
  if (style === 'solid') return [Array.from({ length: steps + 1 }, (_, i) => at((i / steps) * 2 * Math.PI))];
  const span = (2 * Math.PI) / RING_DASHES;
  const dash = span * RING_DASH_SHARE;
  const per = Math.max(2, Math.ceil(steps / RING_DASHES));
  return Array.from({ length: RING_DASHES }, (_, d) => {
    const from = d * span + (span - dash) / 2;
    return Array.from({ length: per + 1 }, (_, i) => at(from + (i / per) * dash));
  });
}

export interface FixtureKitChoice {
  home: Kit;
  away: Kit;
  /** The away side is not in its home strip (its alternate or a clash strip). */
  awayAlt: boolean;
  awayStrip: AwayStrip;
  /** The rings under each side's players (and the carrier's). */
  rings: { home: number; away: number };
  /** How each side's rings are drawn (#371). */
  ringStyles: { home: RingStyle; away: RingStyle };
}

/**
 * Kits for a fixture. The home side always wears its home strip. The away side
 * wears its own unless the two clash on the sprite (kitContrast under
 * KIT_CLASH_MIN); then its alternate strip, and if that clashes too, the clash
 * strip that reads best against the home kit.
 */
export function resolveKits(
  home: { clubId: string; colors: readonly [string, string] },
  away: { clubId: string; colors: readonly [string, string] },
): FixtureKitChoice {
  const homeKit = kitFromColors(home.colors, home.clubId);
  const pick = (kit: Kit, strip: AwayStrip): FixtureKitChoice => ({
    home: homeKit,
    away: kit,
    awayAlt: strip !== 'home',
    awayStrip: strip,
    rings: ringColors(homeKit, kit),
    ringStyles: { ...RING_STYLES },
  });
  const own = kitFromColors(away.colors, away.clubId);
  if (kitContrast(homeKit, own) >= KIT_CLASH_MIN) return pick(own, 'home');
  const alt = kitFromColors(away.colors, away.clubId, true);
  if (kitContrast(homeKit, alt) >= KIT_CLASH_MIN) return pick(alt, 'alt');
  let best = { kit: own, contrast: kitContrast(homeKit, own) };
  for (const jersey of CLASH_JERSEYS) {
    const kit = clashStrip(jersey, away.colors, own.pattern);
    const contrast = kitContrast(homeKit, kit);
    if (contrast > best.contrast) best = { kit, contrast };
  }
  return pick(best.kit, best.kit === own ? 'home' : 'clash');
}
