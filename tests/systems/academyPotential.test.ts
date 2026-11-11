import { afterEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, setState, SAVE_VERSION, type PlacedFacility } from '../../src/core/state';
import { advanceWeeks, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { importSave } from '../../src/core/save';
import { bus } from '../../src/core/events';
import { preparePack, selectPack } from '../../src/content';
import { shownStats } from '../../src/data/player';
import { FACILITY_CATALOG } from '../../src/data/facility';
import { WEEKS_PER_SEASON, STAT_MAX } from '../../src/config';
import { createCeilings } from '../../src/systems/potential';
import { academyLevel, callUpJuniors, generateProspects, registerYouthSystem } from '../../src/systems/youth';
import { makeRng } from '../../src/utils/rng';

const levels = [0, 1, 2, 3];
const facility = (defId: PlacedFacility['defId'], level: PlacedFacility['level']): PlacedFacility =>
  ({ id: defId, defId, level, x: 0, y: 0 });

afterEach(() => {
  selectPack('au'); clearSeasonHooks(); clearTickHooks(); bus.clear();
});

describe('Academy arrival potential (#545)', () => {
  it.each(['au', 'uk'])('raises average ceilings monotonically at Academy 0/1/2/3 in %s', async pack => {
    await preparePack(pack); selectPack(pack);
    const means = levels.map(level => {
      const players = Array.from({ length: 200 }, (_, i) => generateProspects(makeRng(i + 1), level)).flat();
      let total = 0;
      for (const p of players) {
        const baseline = createCeilings(p);
        expect(Object.keys(p.ceilings).sort()).toEqual([...shownStats(p.position)].sort());
        for (const key of shownStats(p.position)) {
          // A real headroom bonus, independent of the pre-existing stat bands.
          expect(p.ceilings[key]).toBe(Math.min(STAT_MAX, baseline[key]! + 2 * level));
          expect(p.ceilings[key]).toBeGreaterThanOrEqual(p.stats[key]);
          total += p.ceilings[key]!;
        }
      }
      return total / (players.length * 4);
    });
    for (let level = 1; level <= 3; level++) expect(means[level]).toBeGreaterThan(means[level - 1]!);
  });

  it.each(['au', 'uk'])('is deterministic per seed, Academy level and %s pack without extra draws', async pack => {
    await preparePack(pack); selectPack(pack);
    for (const level of levels) {
      const rng = makeRng(545);
      const players = generateProspects(rng, level);
      expect(generateProspects(makeRng(545), level)).toEqual(players);
      expect(generateProspects(makeRng(546), level)).not.toEqual(players);
      // Captured on origin/main 12662ef, before the Academy ceiling bonus.
      expect(rng.state()).toBe([3719497068, 3527673477, 3527673477, 3335849886][level]);
    }
  });

  it('gives emergency call-ups the same arrival bonus and deterministic ceilings', () => {
    for (const level of levels) {
      const players = callUpJuniors(makeRng(545), [], level, 2, 10);
      expect(players.length).toBeGreaterThan(0);
      expect(callUpJuniors(makeRng(545), [], level, 2, 10)).toEqual(players);
      for (const p of players) {
        const baseline = createCeilings(p);
        for (const key of shownStats(p.position)) expect(p.ceilings[key]).toBe(Math.min(STAT_MAX, baseline[key]! + 2 * level));
        expect(p.junior).toBeUndefined();
      }
    }
  });

  it('reads Academy from state at rollover; Medical and every other facility leave arrivals and RNG unchanged', () => {
    const rollover = (facilities: PlacedFacility[]) => {
      clearSeasonHooks(); clearTickHooks();
      createNewGame('Academy', 545);
      setState({ facilities, rngSeed: 545, week: WEEKS_PER_SEASON, squad: [], freeAgents: [] });
      registerYouthSystem(); advanceWeeks(1);
      return { players: getState().freeAgents, seed: getState().rngSeed };
    };
    const others = Object.values(FACILITY_CATALOG).filter(f => f.id !== 'academy');
    for (const level of levels) {
      const academy = level === 0 ? [] : [facility('academy', level as 1 | 2 | 3)];
      const baseline = rollover(academy);
      const rng = makeRng((545 ^ Math.imul(2, 0x9e3779b1)) >>> 0);
      expect(baseline.players).toEqual(generateProspects(rng, level));
      expect(baseline.seed).toBe(rng.state());
      for (const other of others) for (const otherLevel of [1, 2, 3] as const) {
        const facilities = [facility(other.id, otherLevel), ...academy];
        expect(academyLevel(facilities)).toBe(level);
        expect(rollover(facilities)).toEqual(baseline);
      }
    }
  });

  it('loads pre-change v24 juniors unchanged and preserves their ceilings after Academy upgrades', () => {
    const state = createNewGame('Existing juniors', 545);
    // Shape and ceilings of juniors generated before #545.
    state.freeAgents = generateProspects(makeRng(545), 1).map(p => ({ ...p, ceilings: createCeilings(p) }));
    const original = JSON.stringify(state.freeAgents);
    for (const level of levels) {
      const result = importSave(JSON.stringify({ ...state, version: 24, facilities: level ? [facility('academy', level as 1 | 2 | 3)] : [] }));
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.state.version).toBe(SAVE_VERSION);
      expect(result.state.rngSeed).toBe(state.rngSeed);
      expect(JSON.stringify(result.state.freeAgents)).toBe(original);
    }
  });
});
