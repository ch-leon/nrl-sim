import { describe, it, expect, beforeEach } from 'vitest';
import {
  moraleTick, nextMorale, unhappiness, facilityMoraleBonus, registerMoraleSystem,
} from '../../src/systems/morale';
import {
  createNewGame, getState, loadState,
  type Player, type PlacedFacility, type GameState,
} from '../../src/core/state';
import { PLAYER_ID } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { MORALE } from '../../src/config';
import { clearTickHooks, advanceWeek } from '../../src/core/time';
import { overallRating } from '../../src/data/player';
import { facilityBlurb } from '../../src/ui/screens/build';
import { FACILITY_CATALOG } from '../../src/data/facility';
import { refreshFreeAgents } from '../../src/systems/freeagency';
import { makeRng } from '../../src/utils/rng';

function mkPlayer(over: Partial<Player> = {}): Player {
  const stats = { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 };
  const p: Player = {
    id: 'p1', name: 'T', age: 25, position: 'lock', stats, morale: 50, injuryRisk: 10,
    injuredWeeks: 0, traits: [], wage: 0, contractWeeks: 30, ...over,
  };
  if (over.wage === undefined) p.wage = Math.round(overallRating(p) * 15 + 100);
  return p;
}
const pf = (defId: PlacedFacility['defId'], level: PlacedFacility['level'] = 1): PlacedFacility => ({
  id: `f_${defId}`, defId, level, x: 0, y: 0,
});

/** State with the player's current-week fixture decided by `us` vs `them` (null = none). */
function setup(squad: Player[], score: [number, number] | null, facilities: PlacedFacility[] = []): GameState {
  createNewGame('Test Club', 1);
  const s = getState();
  const fixtures = s.league.fixtures.filter((f) => f.round !== s.week);
  if (score) {
    fixtures.push({
      round: s.week, homeId: PLAYER_ID, awayId: 'rival-x',
      result: { homeScore: score[0], awayScore: score[1] },
    } as GameState['league']['fixtures'][number]);
  }
  loadState({ ...s, squad, facilities, league: { ...s.league, fixtures } });
  return getState();
}

beforeEach(() => { bus.clear(); clearTickHooks(); });

describe('morale tick', () => {
  it('a win raises morale and a loss lowers it', () => {
    const win = moraleTick(setup([mkPlayer()], [20, 10]))[0]!.morale;
    const loss = moraleTick(setup([mkPlayer()], [10, 20]))[0]!.morale;
    expect(win).toBeGreaterThan(50);
    expect(loss).toBeLessThan(50);
  });

  it('a draw or a bye changes nothing at neutral', () => {
    expect(moraleTick(setup([mkPlayer()], [10, 10]))[0]!.morale).toBe(50);
    expect(moraleTick(setup([mkPlayer()], null))[0]!.morale).toBe(50);
  });

  it('Canteen adds a bonus over the same result without one', () => {
    const base = moraleTick(setup([mkPlayer()], [20, 10]))[0]!.morale;
    const withCanteen = moraleTick(setup([mkPlayer()], [20, 10], [pf('canteen', 3)]))[0]!.morale;
    expect(withCanteen).toBeGreaterThan(base);
    expect(facilityMoraleBonus(setup([], null, [pf('canteen'), pf('coachsOffice')]))).toBe(2);
  });

  it('drifts back toward neutral with no other influence', () => {
    const s = setup([mkPlayer({ morale: 90 }), mkPlayer({ id: 'p2', morale: 10 })], null);
    const [hi, lo] = moraleTick(s);
    expect(hi!.morale).toBeLessThan(90);
    expect(hi!.morale).toBeGreaterThan(50);
    expect(lo!.morale).toBeGreaterThan(10);
  });

  it('clamps to 1..100', () => {
    const p = mkPlayer({ morale: 100 });
    expect(nextMorale(p, 50, 50)).toBe(100);
    expect(nextMorale(mkPlayer({ morale: 1 }), -500, 0)).toBe(1);
  });

  it('low pay and expiring contracts make players unhappy', () => {
    expect(unhappiness(mkPlayer())).toBe(0);
    expect(unhappiness(mkPlayer({ wage: 100 }))).toBe(MORALE.LOW_PAY_PENALTY);
    expect(unhappiness(mkPlayer({ contractWeeks: 3 }))).toBe(MORALE.EXPIRING_PENALTY);
  });

  it('is deterministic and does not mutate the input', () => {
    const s = setup([mkPlayer({ morale: 70 })], [30, 6], [pf('canteen')]);
    const before = JSON.stringify(s.squad);
    expect(moraleTick(s)).toEqual(moraleTick(s));
    expect(JSON.stringify(s.squad)).toBe(before);
  });

  it('the registered hook applies it to state during a week tick', () => {
    setup([mkPlayer({ morale: 50 })], [30, 6]);
    registerMoraleSystem();
    advanceWeek();
    expect(getState().squad[0]!.morale).toBeGreaterThan(50);
  });
});

describe('facility effects', () => {
  it('every special facility blurb states a concrete effect', () => {
    expect(facilityBlurb(FACILITY_CATALOG.canteen)).toMatch(/morale/);
    expect(facilityBlurb(FACILITY_CATALOG.sponsorBoard)).toMatch(/\$3,000/);
    expect(facilityBlurb(FACILITY_CATALOG.grandstand)).toMatch(/attendance/);
    expect(facilityBlurb(FACILITY_CATALOG.academy)).toMatch(/free-agent/);
  });

  it('Academy raises free-agent quality', () => {
    const avg = (facilities: PlacedFacility[]): number => {
      createNewGame('Test Club', 7);
      loadState({ ...getState(), facilities, reputation: 0 });
      const pool = refreshFreeAgents(getState(), makeRng(99)).freeAgents;
      return pool.reduce((a, p) => a + overallRating(p), 0) / pool.length;
    };
    expect(avg([pf('academy', 3)])).toBeGreaterThan(avg([]));
  });
});
