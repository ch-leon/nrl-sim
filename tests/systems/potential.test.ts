import { createLegacyGame } from '../helpers/legacyGame';
import { describe, expect, it } from 'vitest';
import { createCeilings, potentialStars, potentialText } from '../../src/systems/potential';
import { generatePlayer, generatePlayerAround, generateFreeAgent, POSITIONS, shownStats, starsForOverall } from '../../src/data/player';
import { createNewGame, getState } from '../../src/core/state';
import { makeRng } from '../../src/utils/rng';
import { generateProspects, callUpJuniors } from '../../src/systems/youth';
import { initLeague } from '../../src/systems/fixtures';
import { trainPlayer } from '../../src/systems/training';
import { agePlayer } from '../../src/systems/aging';
import { advanceWeeks } from '../../src/core/time';
import { registerAllSystems } from '../../src/qa/soak';
import { WEEKS_PER_SEASON } from '../../src/config';
import { bus } from '../../src/core/events';

const flat = (n: number) => ({ speed: n, strength: n, stamina: n, handling: n, kicking: n, footyIQ: n });

describe('stored potential ceilings (#538)', () => {
  it('pins the deterministic creation/backfill rule without hidden stat ceilings', () => {
    const p = { id: 'p_538', age: 19, position: 'halfback' as const, stats: flat(55) };
    expect(createCeilings(p)).toEqual({ handling: 77, kicking: 83, footyIQ: 75, speed: 79 });
  });
  it('covers every shown stat at creation across all sources, including call-ups and every position', () => {
    const rng = makeRng(538);
    const s = createNewGame('Ceilings', 538);
    initLeague(s);
    const players = [
      ...s.squad, ...s.freeAgents, ...getState().league.clubs.flatMap(c => c.squad ?? []),
      ...[0, 1, 2, 3].flatMap(level => generateProspects(rng, level)),
      ...callUpJuniors(rng, [], 0, 1, 20),
      ...POSITIONS.flatMap(position => [generatePlayer(rng, { position }), generatePlayerAround(rng, 95, { position })]),
      ...Array.from({ length: 100 }, () => generateFreeAgent(rng, 60)),
    ];
    for (const p of players) {
      expect(Object.keys(p.ceilings).sort()).toEqual([...shownStats(p.position)].sort());
      for (const key of shownStats(p.position)) {
        expect(p.ceilings[key]).toBeGreaterThanOrEqual(p.stats[key]);
        expect(p.ceilings[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  it('gives younger players more average headroom at equal current quality', () => {
    const means = [19, 25, 29, 33].map(age => {
      const gaps = Array.from({ length: 200 }, (_, i) => {
        const p = { id: `sample-${i}`, age, position: POSITIONS[i % POSITIONS.length]!, stats: flat(55) };
        const ceilings = createCeilings(p);
        return shownStats(p.position).reduce((sum, key) => sum + ceilings[key]! - p.stats[key], 0) / 4;
      });
      return gaps.reduce((a, b) => a + b, 0) / gaps.length;
    });
    for (let i = 1; i < means.length; i++) expect(means[i - 1]).toBeGreaterThan(means[i]!);
  });

  it('derives stars from the unrounded four-ceiling average using existing bands', () => {
    for (const position of POSITIONS) {
      const p = { position, ceilings: flat(100) };
      shownStats(position).forEach((key, i) => { p.ceilings[key] = [48, 51, 55, 61][i]!; });
      expect(potentialStars(p)).toBe(starsForOverall((48 + 51 + 55 + 61) / 4));
    }
    expect(potentialText({ position: 'prop', ceilings: flat(48) })).toBe('Potential: ★★★★');
    expect(potentialText({ position: 'prop', ceilings: flat(54) })).toBe('Potential: ★★★★½');
    expect(potentialText({ position: 'prop', ceilings: flat(1) })).toBe('Potential: ½');
  });

  it('keeps ceilings unchanged across a simulated season for every surviving player', () => {
    bus.clear();
    createLegacyGame('Season ceilings', 538);
    initLeague(getState());
    const all = () => [...getState().squad, ...getState().freeAgents, ...getState().league.clubs.flatMap(c => c.squad ?? [])];
    const before = new Map(all().map(p => {
      Object.freeze(p.ceilings);
      return [p.id, JSON.stringify(p.ceilings)];
    }));
    registerAllSystems();
    advanceWeeks(WEEKS_PER_SEASON);
    expect(getState().season).toBe(2);
    const survivors = all().filter(p => before.has(p.id));
    expect(survivors.length).toBeGreaterThan(100);
    for (const p of survivors) expect(JSON.stringify(p.ceilings)).toBe(before.get(p.id));
    bus.clear();
  });

  it('preserves veteran decline from current stats without changing ceilings', () => {
    const p = { ...generatePlayer(makeRng(53), { age: 33, position: 'prop' }), stats: flat(80), ceilings: { speed: 100, strength: 100, stamina: 100, footyIQ: 100 }, traits: [] };
    const ceilings = JSON.stringify(p.ceilings);
    let aged = p;
    for (let w = 0; w < WEEKS_PER_SEASON; w++) aged = { ...aged, stats: trainPlayer(aged, [], 'balanced') };
    for (const key of ['speed', 'stamina'] as const) expect(aged.stats[key]).toBeCloseTo(80 - 0.3 * WEEKS_PER_SEASON);
    expect(aged.stats.strength).toBe(80);
    expect(agePlayer(aged).ceilings).toEqual(p.ceilings);
    expect(JSON.stringify(aged.ceilings)).toBe(ceilings);
  });
});
