import { describe, it, expect } from 'vitest';
import {
  ATMOS_CAPS,
  DUSK_SHARE,
  NIGHT_SHARE,
  RAIN_TINT,
  atmosphereGrade,
  atmosphereParticles,
  buildLightmap,
  drawGlow,
  drawGust,
  drawRainStreaks,
  gradeIsNeutral,
  hashUnit,
  lightAt,
  lightingForFixture,
  luma,
  mulColor,
  type Lighting,
} from '../../../src/art/match/atmosphere';
import { FLOODLIGHT_TOWERS, PAL, floodlightLamps, paintBackground, stadiumWorldBounds } from '../../../src/art/match/stadium';
import { kitFromColors } from '../../../src/art/match/kit';
import { MATCH_CAPS, MAX_LIVE_PARTICLES, totalCaps } from '../../../src/fx/particleMath';
import { FIELD_LONG, FIELD_WIDE, fieldOffsetX } from '../../../src/scenes/matchField';
import { isoProject } from '../../../src/art/match/iso3d';
import { SEASON_ROUNDS, WEEKS_PER_SEASON } from '../../../src/config';

const off = fieldOffsetX();
const CLUBS = ['player', 'rival-a', 'rival-b', 'rival-c', 'rival-d', 'rival-e', 'rival-f', 'rival-g'];

/** Every ordered pairing of CLUBS in every regular-season round. */
function allRegularFixtures(): { round: number; homeId: string; awayId: string }[] {
  const out: { round: number; homeId: string; awayId: string }[] = [];
  for (let round = 1; round <= SEASON_ROUNDS; round++) {
    for (const homeId of CLUBS) for (const awayId of CLUBS) if (homeId !== awayId) out.push({ round, homeId, awayId });
  }
  return out;
}

describe('lighting variant per fixture', () => {
  it('is deterministic for the same fixture + season', () => {
    const f = { round: 7, homeId: 'player', awayId: 'rival-c' };
    expect(lightingForFixture(f, 2)).toBe(lightingForFixture({ ...f }, 2));
    expect(hashUnit('abc')).toBe(hashUnit('abc'));
    expect(hashUnit('abc')).not.toBe(hashUnit('abd'));
  });

  it('finals are night games; no fixture is daylight', () => {
    for (let round = SEASON_ROUNDS + 1; round <= WEEKS_PER_SEASON; round++) {
      expect(lightingForFixture({ round, homeId: 'player', awayId: 'rival-a' }, 1)).toBe('night');
    }
    expect(lightingForFixture(undefined)).toBe('day');
  });

  it('regular rounds mix all three variants in roughly the intended shares', () => {
    const counts: Record<Lighting, number> = { day: 0, dusk: 0, night: 0 };
    const fixtures = allRegularFixtures();
    for (const season of [1, 2, 3]) for (const f of fixtures) counts[lightingForFixture(f, season)]++;
    const n = fixtures.length * 3;
    expect(counts.night / n).toBeGreaterThan(NIGHT_SHARE - 0.05);
    expect(counts.night / n).toBeLessThan(NIGHT_SHARE + 0.05);
    expect(counts.dusk / n).toBeGreaterThan(DUSK_SHARE - 0.05);
    expect(counts.dusk / n).toBeLessThan(DUSK_SHARE + 0.05);
    expect(counts.day / n).toBeGreaterThan(0.35);
  });

  it('a club sees a varied season (not all day, not all night)', () => {
    const seen = new Set<Lighting>();
    for (let round = 1; round <= SEASON_ROUNDS; round++) {
      seen.add(lightingForFixture({ round, homeId: round % 2 ? 'player' : 'rival-a', awayId: round % 2 ? 'rival-a' : 'player' }, 1));
    }
    expect(seen.size).toBe(3);
  });

  it('season changes the draw for the same pairing', () => {
    const f = { round: 3, homeId: 'player', awayId: 'rival-b' };
    const variants = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => lightingForFixture(f, s)));
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe('atmosphere grade', () => {
  it('clear and windy daylight are untouched', () => {
    expect(gradeIsNeutral(atmosphereGrade('clear', 'day'))).toBe(true);
    expect(gradeIsNeutral(atmosphereGrade('wind', 'day'))).toBe(true);
  });

  it('rain darkens + cools any light, adds a haze, and switches the lamps on', () => {
    for (const lighting of ['day', 'dusk', 'night'] as const) {
      const dry = atmosphereGrade('clear', lighting);
      const wet = atmosphereGrade('rain', lighting);
      expect(luma(wet.pool)).toBeLessThan(luma(dry.pool));
      expect(luma(wet.edge)).toBeLessThan(luma(dry.edge));
      const coolness = (c: number): number => (c & 0xff) / Math.max(1, (c >> 16) & 0xff); // blue ÷ red
      expect(coolness(wet.pool)).toBeGreaterThan(coolness(dry.pool));
      expect(wet.haze).not.toBeNull();
      expect(wet.glow).toBeGreaterThan(0);
    }
    expect(atmosphereGrade('rain', 'day').pool).toBe(RAIN_TINT);
  });

  it('dusk is warm, night is dark + blue, both with lights and lit stands', () => {
    const dusk = atmosphereGrade('clear', 'dusk');
    const night = atmosphereGrade('clear', 'night');
    expect((dusk.pool >> 16) & 0xff).toBeGreaterThan(dusk.pool & 0xff); // red > blue
    expect(night.edge & 0xff).toBeGreaterThan((night.edge >> 16) & 0xff);
    expect(luma(night.edge)).toBeLessThan(luma(dusk.edge));
    expect(luma(night.edge)).toBeLessThan(90);
    for (const g of [dusk, night]) {
      expect(g.glow).toBeGreaterThan(0);
      expect(g.standGlow).toBeGreaterThan(0);
      expect(gradeIsNeutral(g)).toBe(false);
    }
    expect(night.glow).toBeGreaterThan(dusk.glow);
  });

  it('mulColor multiplies channels', () => {
    expect(mulColor(0xffffff, 0x123456)).toBe(0x123456);
    expect(mulColor(0x808080, 0x808080)).toBe(0x404040);
    expect(mulColor(0x000000, 0xffffff)).toBe(0);
  });
});

describe('light map', () => {
  const night = atmosphereGrade('clear', 'night');

  it('the pitch sits in the pool; the far surrounds fall to the edge colour', () => {
    const mid = isoProject(FIELD_LONG / 2, FIELD_WIDE / 2, 0, off);
    const far = isoProject(-7, -7, 0, off);
    expect(lightAt(mid.x, mid.y, off, night)).toBe(night.pool);
    expect(lightAt(far.x, far.y, off, night)).toBe(night.edge);
    const nearEdge = isoProject(FIELD_LONG + 2, FIELD_WIDE / 2, 0, off);
    const l = luma(lightAt(nearEdge.x, nearEdge.y, off, night));
    expect(l).toBeLessThan(luma(night.pool));
    expect(l).toBeGreaterThan(luma(night.edge));
  });

  it('covers the painted stadium, is opaque and deterministic', () => {
    const a = buildLightmap(off, night, 8);
    const b = buildLightmap(off, night, 8);
    const r = stadiumWorldBounds(off);
    expect(a.buf.w * a.scale).toBeGreaterThanOrEqual(r.width);
    expect(a.buf.h * a.scale).toBeGreaterThanOrEqual(r.height);
    expect(a.buf.w).toBeLessThanOrEqual(1024);
    expect(a.buf.opaqueCount()).toBe(a.buf.w * a.buf.h);
    expect(a.buf.data.every((v, i) => v === b.buf.data[i])).toBe(true);
  });
});

describe('floodlight lamps', () => {
  it('one lamp per tower, on the painted light bank', () => {
    const lamps = floodlightLamps(off);
    expect(lamps).toHaveLength(FLOODLIGHT_TOWERS.length);
    const home = kitFromColors(['#f4d03f', '#1a1a2e'], 'player');
    const away = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');
    const cv = paintBackground(off, home, away);
    for (const l of lamps) {
      const px = cv.buf.get(Math.floor(l.x - cv.ox), Math.floor(l.y - cv.oy));
      // The bank centre is a lamp or the dark frame between lamps.
      expect([PAL.lamp, PAL.board, 0xffffff]).toContain(px.color);
    }
  });
});

describe('atmosphere particles', () => {
  it('rain and wind each get their own emitters; clear gets neither', () => {
    const rain = atmosphereParticles('rain', 'day');
    const wind = atmosphereParticles('wind', 'day');
    const clear = atmosphereParticles('clear', 'day');
    expect(rain.rain).toBeGreaterThan(0);
    expect(rain.leaves).toBe(0);
    expect(wind.leaves).toBeGreaterThan(0);
    expect(wind.gusts).toBeGreaterThan(0);
    expect(wind.rain).toBe(0);
    expect(clear.rain + clear.leaves + clear.gusts + clear.splash).toBe(0);
  });

  it('phone flashes only after dark; reduced motion trims the weather', () => {
    expect(atmosphereParticles('clear', 'day').flashesPerSec).toBe(0);
    expect(atmosphereParticles('clear', 'night').flashesPerSec).toBeGreaterThan(atmosphereParticles('clear', 'dusk').flashesPerSec);
    const calm = atmosphereParticles('rain', 'night', true);
    expect(calm.rain).toBeLessThan(atmosphereParticles('rain', 'night').rain);
    expect(calm.splash).toBe(0);
    expect(calm.flashesPerSec).toBe(0);
  });

  it('atmosphere + match FX stay within the per-scene live particle ceiling', () => {
    for (const w of ['clear', 'rain', 'wind'] as const) {
      const p = atmosphereParticles(w, 'night');
      const atmos = p.rain + p.splash + p.leaves + p.gusts + p.standBurst + p.flashes;
      expect(atmos + totalCaps(MATCH_CAPS)).toBeLessThanOrEqual(MAX_LIVE_PARTICLES);
    }
    expect(ATMOS_CAPS.standBurst % 2).toBe(0);
  });
});

describe('atmosphere textures', () => {
  it('glow is brightest in the centre and clear at the corners', () => {
    const g = drawGlow(32);
    expect(g.get(16, 16).alpha).toBeGreaterThan(200);
    expect(g.get(0, 0).alpha).toBe(0);
    expect(g.get(16, 8).alpha).toBeLessThan(g.get(16, 14).alpha);
  });

  it('rain sprite holds slanted streaks; gust fades at both ends', () => {
    const r = drawRainStreaks();
    expect(r.opaqueCount()).toBeGreaterThan(20);
    const gust = drawGust(28);
    expect(gust.get(0, 0).alpha).toBeLessThan(gust.get(14, 0).alpha);
    expect(gust.get(27, 0).alpha).toBeLessThan(gust.get(14, 0).alpha);
  });
});
