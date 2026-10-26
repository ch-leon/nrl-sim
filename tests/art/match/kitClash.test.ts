// Kit clash (#340): kits are judged on the colours a player sprite actually wears,
// and every pairing the game can field reads apart on the pitch.
import { afterEach, describe, expect, it } from 'vitest';
import { KIT_PATTERNS, kitFromColors, setKitDesign, type KitDesign } from '../../../src/art/match/kit';
import {
  CLASH_JERSEYS, KIT_CLASH_MIN, RING_MIN_DELTA, clashStrip, deltaE, kitContrast, kitCoverage, resolveKits, roleCoverage,
} from '../../../src/art/match/kitClash';
import { RIVAL_CLUBS } from '../../../src/data/league';
import { DEFAULT_PLAYER_COLORS, PLAYER_PRIMARY_COLORS, PLAYER_SECONDARY_COLORS, isValidColorPair } from '../../../src/config';
import { altJerseyOptions, trimOptions } from '../../../src/ui/screens/kit';

type Side = { clubId: string; colors: readonly [string, string] };
const rivals: Side[] = RIVAL_CLUBS.map((c) => ({ clubId: c.id, colors: c.colors }));
const player: Side = { clubId: 'player', colors: DEFAULT_PLAYER_COLORS };
const drovers = rivals.find((c) => c.clubId === 'rival-drovers')!;
/** Every club colour pair the new-game form accepts. */
const playerPairs: Side[] = PLAYER_PRIMARY_COLORS.flatMap((p) =>
  PLAYER_SECONDARY_COLORS.filter((s) => isValidColorPair(p, s)).map((s) => ({ clubId: 'player', colors: [p, s] as const })));

/** Problems with a fixture's kits: too little contrast, rings too close, or the home side not in its own strip. */
function problems(home: Side, away: Side): string[] {
  const r = resolveKits(home, away);
  const out: string[] = [];
  const name = `${home.clubId} ${home.colors.join('/')} v ${away.clubId} ${away.colors.join('/')} (${r.awayStrip})`;
  const c = kitContrast(r.home, r.away);
  if (c < KIT_CLASH_MIN) out.push(`${name}: contrast ${c.toFixed(1)} < ${KIT_CLASH_MIN}`);
  const ring = deltaE(r.rings.home, r.rings.away);
  if (ring < RING_MIN_DELTA) out.push(`${name}: rings ΔE ${ring.toFixed(1)} < ${RING_MIN_DELTA}`);
  if (JSON.stringify(r.home) !== JSON.stringify(kitFromColors(home.colors, home.clubId))) out.push(`${name}: home side not in its home strip`);
  return out;
}

afterEach(() => setKitDesign('player', null));

describe('kit coverage', () => {
  it('weighs every pattern over the whole sprite, the jersey family first', () => {
    for (const p of KIT_PATTERNS) {
      const w = roleCoverage(p);
      const sum = [...w.values()].reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
      const jersey = (w.get('jersey') ?? 0) + (w.get('jerseyLight') ?? 0) + (w.get('jerseyShade') ?? 0);
      // Shorts and socks are a real share too: that is why a jersey-only check missed Darwin.
      expect(jersey).toBeGreaterThan(0.25);
      expect((w.get('shorts') ?? 0) + (w.get('sock') ?? 0)).toBeGreaterThan(0.1);
    }
  });

  it('merges roles that share a colour', () => {
    const k = kitFromColors(['#3e2723', '#ffb300'], 'rival-drovers');
    const cov = kitCoverage(k);
    expect(new Set(cov.map((c) => c.color)).size).toBe(cov.length);
    expect(cov.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 6);
  });
});

describe('kitContrast', () => {
  it('is symmetric and zero for the same kit', () => {
    const a = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');
    const b = kitFromColors(['#0d47a1', '#ffffff'], 'rival-gulls');
    expect(kitContrast(a, a)).toBe(0);
    expect(kitContrast(a, b)).toBeCloseTo(kitContrast(b, a), 9);
  });

  it('sees Darwin and a gold-and-navy club as a clash although their jerseys differ (#340)', () => {
    const us = kitFromColors(player.colors, 'player');
    const them = kitFromColors(drovers.colors, drovers.clubId);
    expect(kitContrast(us, them)).toBeLessThan(KIT_CLASH_MIN);
    // Their alternate strip is the same two colours swapped back: no better.
    expect(kitContrast(us, kitFromColors(drovers.colors, drovers.clubId, true))).toBeLessThan(KIT_CLASH_MIN);
  });

  it('reads clearly different kits apart', () => {
    const us = kitFromColors(player.colors, 'player');
    expect(kitContrast(us, kitFromColors(['#0d47a1', '#ffffff'], 'rival-gulls'))).toBeGreaterThan(KIT_CLASH_MIN);
    expect(kitContrast(us, kitFromColors(['#4a148c', '#ce93d8'], 'rival-swagmen'))).toBeGreaterThan(KIT_CLASH_MIN);
  });
});

describe('resolveKits', () => {
  it('leaves distinct kits alone', () => {
    const r = resolveKits(player, { clubId: 'rival-gulls', colors: ['#0d47a1', '#ffffff'] });
    expect(r.awayStrip).toBe('home');
    expect(r.awayAlt).toBe(false);
    expect(r.away.jersey).toBe(0x0d47a1);
  });

  it('puts Darwin in a clash strip at our ground, and us in one at theirs', () => {
    const atHome = resolveKits(player, drovers);
    expect(atHome.awayStrip).toBe('clash');
    expect(atHome.awayAlt).toBe(true);
    expect(kitContrast(atHome.home, atHome.away)).toBeGreaterThanOrEqual(KIT_CLASH_MIN);
    const away = resolveKits(drovers, player);
    expect(away.awayAlt).toBe(true);
    expect(kitContrast(away.home, away.away)).toBeGreaterThanOrEqual(KIT_CLASH_MIN);
  });

  it('uses the alternate strip when that is enough', () => {
    const r = resolveKits({ clubId: 'rival-mariners', colors: ['#01579b', '#4fc3f7'] }, { clubId: 'rival-gulls', colors: ['#0d47a1', '#ffffff'] });
    expect(r.awayStrip).toBe('alt');
    expect(r.away.jersey).toBe(0xffffff);
  });

  it('is deterministic', () => {
    expect(resolveKits(player, drovers)).toEqual(resolveKits(player, drovers));
  });

  it('every pairing of the league reads apart, both ways round', () => {
    const clubs = [player, ...rivals];
    const found = clubs.flatMap((h) => clubs.filter((a) => a.clubId !== h.clubId).flatMap((a) => problems(h, a)));
    expect(found).toEqual([]);
  });

  it('every club colour pair the player can pick reads apart from every rival, home and away', () => {
    expect(playerPairs.length).toBeGreaterThan(20);
    const found = playerPairs.flatMap((p) => rivals.flatMap((r) => [...problems(p, r), ...problems(r, p)]));
    expect(found).toEqual([]);
  });

  it('every alternate strip the kit designer offers still leaves the away side readable', () => {
    const found: string[] = [];
    let designs = 0;
    for (const primary of PLAYER_PRIMARY_COLORS) {
      const secondary = PLAYER_SECONDARY_COLORS.find((s) => isValidColorPair(primary, s))!;
      for (const jersey of altJerseyOptions(primary)) {
        for (const trim of trimOptions(jersey)) {
          const pattern = KIT_PATTERNS[designs % KIT_PATTERNS.length]!;
          const design: KitDesign = { pattern, trim: trimOptions(primary)[0]!, alt: { jersey, trim, pattern } };
          setKitDesign('player', design);
          designs++;
          const us: Side = { clubId: 'player', colors: [primary, secondary] };
          for (const r of rivals) found.push(...problems(us, r), ...problems(r, us));
        }
      }
    }
    expect(designs).toBeGreaterThan(100);
    expect(found).toEqual([]);
  });
});

describe('clashStrip', () => {
  it('trims in a club colour that reads on the jersey', () => {
    for (const jersey of CLASH_JERSEYS) {
      for (const r of rivals) {
        const k = clashStrip(jersey, r.colors, 'v');
        expect(k.jersey).toBe(jersey);
        expect(deltaE(k.jersey, k.trim)).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
