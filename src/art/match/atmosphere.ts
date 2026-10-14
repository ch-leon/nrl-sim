// src/art/match/atmosphere.ts — match-day atmosphere: lighting variant, weather
// grade and the small generated textures the atmosphere layer draws with
// (GitHub #16).
//
// Pure + deterministic + Phaser-free (unit-tested under node). The Phaser side
// (src/fx/atmosphere.ts) turns these numbers into a multiply "light map", glows,
// and pooled rain / wind emitters.
//
//   • lightingForFixture() — 'day' | 'dusk' | 'night', a pure function of the
//     fixture (season, round, home, away). Finals are always under lights;
//     regular rounds hash to roughly 45% day / 30% dusk / 25% night.
//   • atmosphereGrade() — the colour grade for a weather × lighting pair: the
//     multiply colour on the pitch ("pool") and far from it ("edge"), a grey
//     haze (rain desaturation), and floodlight / stand glow strengths.
//   • buildLightmap() — a low-res RGB buffer over the stadium extent, sampled
//     from lightAt(); the scene uploads it with LINEAR filtering and draws it
//     with MULTIPLY blend above every world layer.
//   • atmosphereParticles() — emitter budgets for rain / splashes / leaves /
//     gusts / the try reaction, halved under prefers-reduced-motion.
//   • drawGlow / drawRainStreaks / drawLeaf / drawGust — tiny white textures
//     (tinted at runtime).
import { PixelBuffer, mix, noise2 } from '../pixel';
import { isoUnproject } from './iso3d';
import { stadiumWorldBounds, type WorldRect } from './stadium';
import { FIELD_LONG, FIELD_WIDE } from '../../scenes/matchField';
import { SEASON_ROUNDS } from '../../config';
import type { WeatherKind } from '../../core/state';

export type Lighting = 'day' | 'dusk' | 'night';

/** The bits of a Fixture the lighting choice depends on. */
export interface FixtureKey {
  round: number;
  homeId: string;
  awayId: string;
}

/** Regular-round lighting split (cumulative thresholds on the fixture hash). */
export const NIGHT_SHARE = 0.25;
export const DUSK_SHARE = 0.3;

/** FNV-1a over a string, finished through noise2 → [0, 1). Stable everywhere. */
export function hashUnit(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return noise2(h | 0, key.length, 1607);
}

/**
 * Lighting for a fixture. Deterministic: same (season, round, home, away) →
 * same variant on every device and every replay. Finals (rounds past the
 * regular season) are night games; no fixture (defensive) means daylight.
 */
export function lightingForFixture(fixture: FixtureKey | undefined, season = 1): Lighting {
  if (!fixture) return 'day';
  if (fixture.round > SEASON_ROUNDS) return 'night';
  const h = hashUnit(`${season}|${fixture.round}|${fixture.homeId}|${fixture.awayId}`);
  if (h < NIGHT_SHARE) return 'night';
  if (h < NIGHT_SHARE + DUSK_SHARE) return 'dusk';
  return 'day';
}

// ── Grade ────────────────────────────────────────────────────────────────────

export interface AtmosphereGrade {
  lighting: Lighting;
  weather: WeatherKind;
  /** Multiply colour on the pitch (white = untouched). */
  pool: number;
  /** Multiply colour far from the pitch (stands, trees, roof). */
  edge: number;
  /** Tiles beyond the field edge over which pool → edge. */
  falloff: number;
  /** Normal-blend wash over everything (rain mist → desaturation), or null. */
  haze: { color: number; alpha: number } | null;
  /** Floodlight lamp glow strength 0..1 (0 = lights off). */
  glow: number;
  /** Lit-stand glow strength 0..1 (corporate boxes + seat rows). */
  standGlow: number;
  /** Floodlight beam alpha (additive), 0 = none. */
  beams: number;
  /** Warm tint of the lamp glows. */
  lampColor: number;
}

const WHITE = 0xffffff;
/** Multiply applied on top of the lighting grade in rain (cool, ~25% darker). */
export const RAIN_TINT = 0xaeb6c2;

/** Channel-wise multiply of two colours (both 0xRRGGBB). */
export function mulColor(a: number, b: number): number {
  const ch = (s: number) => Math.round((((a >> s) & 0xff) * ((b >> s) & 0xff)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Perceived luminance 0..255 of a colour (Rec. 601 weights). */
export function luma(c: number): number {
  return ((c >> 16) & 0xff) * 0.299 + ((c >> 8) & 0xff) * 0.587 + (c & 0xff) * 0.114;
}

const BASE: Record<Lighting, Omit<AtmosphereGrade, 'lighting' | 'weather' | 'haze'>> = {
  day: { pool: WHITE, edge: WHITE, falloff: 8, glow: 0, standGlow: 0, beams: 0, lampColor: 0xfff4d0 },
  dusk: { pool: 0xffcfa2, edge: 0x6e5888, falloff: 7, glow: 0.65, standGlow: 0.5, beams: 0.04, lampColor: 0xffe2a8 },
  night: { pool: 0xaeb9e4, edge: 0x1e2448, falloff: 5, glow: 1, standGlow: 0.9, beams: 0.07, lampColor: 0xfff2cc },
};

/**
 * Colour grade for a weather × lighting pair. Rain cools + darkens the whole
 * grade and adds a grey mist (desaturates); in daylight it also switches the
 * floodlights on, dimly, as grounds do on a grim afternoon. Wind keeps the
 * light as-is — it reads through the drifting leaves and gusts instead.
 */
export function atmosphereGrade(weather: WeatherKind, lighting: Lighting): AtmosphereGrade {
  const b = BASE[lighting];
  if (weather !== 'rain') return { ...b, lighting, weather, haze: null };
  return {
    ...b,
    lighting,
    weather,
    pool: mulColor(b.pool, RAIN_TINT),
    edge: mulColor(b.edge, mix(RAIN_TINT, 0x8a92a0, 0.5)),
    haze: { color: lighting === 'night' ? 0x4a5468 : 0x8e98a6, alpha: lighting === 'day' ? 0.16 : 0.12 },
    glow: Math.max(b.glow, 0.35),
    beams: lighting === 'day' ? 0 : b.beams * 1.6, // rain catches the beams
  };
}

/** True when the grade changes the picture at all (else skip the light map). */
export function gradeIsNeutral(g: AtmosphereGrade): boolean {
  return g.pool === WHITE && g.edge === WHITE && g.haze === null && g.glow === 0 && g.standGlow === 0;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Multiply colour at a world point. Distance is measured on the ground plane
 * (z = 0 unprojection), so raised structures — whose pixels unproject to points
 * further "behind" — fall off naturally toward the edge colour, while the pitch
 * sits in the pool.
 */
export function lightAt(wx: number, wy: number, offsetX: number, g: AtmosphereGrade): number {
  if (g.pool === g.edge) return g.pool;
  const { gx, gy } = isoUnproject(wx, wy, offsetX);
  const dx = gx < 0 ? -gx : gx > FIELD_LONG ? gx - FIELD_LONG : 0;
  const dy = gy < 0 ? -gy : gy > FIELD_WIDE ? gy - FIELD_WIDE : 0;
  const d = Math.hypot(dx, dy);
  return mix(g.pool, g.edge, smoothstep(0.5, g.falloff, d));
}

export interface Lightmap {
  buf: PixelBuffer;
  /** World rect the buffer covers (each buffer pixel = `scale` world px). */
  rect: WorldRect;
  scale: number;
}

/** Low-res light map over the whole painted stadium (one pixel per `scale`²). */
export function buildLightmap(offsetX: number, g: AtmosphereGrade, scale = 8): Lightmap {
  const rect = stadiumWorldBounds(offsetX);
  const w = Math.ceil(rect.width / scale);
  const h = Math.ceil(rect.height / scale);
  const buf = new PixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    const wy = rect.y + (y + 0.5) * scale;
    for (let x = 0; x < w; x++) {
      buf.set(x, y, lightAt(rect.x + (x + 0.5) * scale, wy, offsetX, g));
    }
  }
  return { buf, rect, scale };
}

// ── Particles ────────────────────────────────────────────────────────────────

/**
 * Live-particle budgets for the atmosphere emitters. Rain and wind are mutually
 * exclusive, so a match runs at most one weather set; the try reaction is
 * shared. Kept so atmosphere + MATCH_CAPS stays within MAX_LIVE_PARTICLES.
 */
export const ATMOS_CAPS = {
  rain: 96,
  splash: 16,
  leaves: 64,
  gusts: 16,
  standBurst: 36, // streamers, split evenly between the two sides' emitters
  flashes: 12, // camera-phone flashes in the stands
} as const;

export interface AtmosphereParticles {
  /** Rain streak sprites alive at once (each sprite holds 3 streaks). */
  rain: number;
  splash: number;
  leaves: number;
  gusts: number;
  standBurst: number;
  flashes: number;
  /** Idle camera-phone flashes in the stands (per second), dusk/night only. */
  flashesPerSec: number;
}

/** Emitter budgets for a match; reduced motion halves the moving weather. */
export function atmosphereParticles(weather: WeatherKind, lighting: Lighting, reducedMotion = false): AtmosphereParticles {
  const k = reducedMotion ? 0.5 : 1;
  return {
    rain: weather === 'rain' ? Math.round(ATMOS_CAPS.rain * k) : 0,
    splash: weather === 'rain' && !reducedMotion ? ATMOS_CAPS.splash : 0,
    leaves: weather === 'wind' ? Math.round(ATMOS_CAPS.leaves * k) : 0,
    gusts: weather === 'wind' ? Math.round(ATMOS_CAPS.gusts * k) : 0,
    standBurst: ATMOS_CAPS.standBurst,
    flashes: ATMOS_CAPS.flashes,
    flashesPerSec: reducedMotion || lighting === 'day' ? 0 : lighting === 'night' ? 2.5 : 1.2,
  };
}

/** Rain falls down-and-left at this angle (Phaser degrees: 90 = straight down). */
export const RAIN_ANGLE = 90 + 18;

// ── Textures (white; tinted per emitter) ─────────────────────────────────────

/** Soft radial glow, alpha (1 - r)² — drawn additively, scaled up. */
export function drawGlow(size = 64): PixelBuffer {
  const b = new PixelBuffer(size, size);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - c, y - c) / (size / 2);
      if (r >= 1) continue;
      const a = (1 - r) * (1 - r);
      const i = (y * size + x) * 4;
      b.data[i] = 255;
      b.data[i + 1] = 255;
      b.data[i + 2] = 255;
      b.data[i + 3] = Math.round(a * 255);
    }
  }
  return b;
}

/**
 * Three slanted rain streaks of different lengths in one sprite, so each live
 * particle draws three drops. Slope matches RAIN_ANGLE (≈1px left per 3px down).
 */
export function drawRainStreaks(): PixelBuffer {
  const b = new PixelBuffer(16, 18);
  const streak = (x0: number, y0: number, len: number, alpha: number): void => {
    for (let i = 0; i < len; i++) b.set(x0 - Math.floor(i / 3), y0 + i, 0xffffff, alpha * (0.55 + (0.45 * i) / len));
  };
  streak(5, 0, 9, 0.9);
  streak(14, 4, 12, 0.75);
  streak(9, 10, 7, 0.65);
  return b;
}

/** A 4×3 leaf / grass clipping / chip wrapper, outlined dark so it reads on grass. */
export function drawLeaf(): PixelBuffer {
  const b = new PixelBuffer(4, 3);
  b.set(0, 0, 0xffffff);
  b.set(1, 0, 0xffffff);
  b.set(1, 1, 0xffffff);
  b.set(2, 1, 0xffffff);
  b.set(3, 2, 0xb0b0b0);
  b.set(2, 2, 0x8a8a8a);
  b.set(0, 1, 0x8a8a8a);
  return b;
}

/** A long wind-gust streak (2px: bright core over a faint trail), fading at both ends. */
export function drawGust(len = 40): PixelBuffer {
  const b = new PixelBuffer(len, 2);
  for (let x = 0; x < len; x++) {
    const a = Math.sin((Math.PI * (x + 0.5)) / len);
    b.set(x, 0, 0xffffff, a);
    b.set(x, 1, 0xffffff, a * 0.35);
  }
  return b;
}
