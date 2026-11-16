import { createLegacyGame as createNewGame } from '../helpers/legacyGame';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  weeklyWages, weeklyUpkeep, weeklyIncome, gateReceipts, homeGate, recentForm, tickContracts,
  handleBankruptcy, applyEconomy, registerEconomySystem, registerFinanceSystem, financeNet, classifyReason,
  nextStandGate, stampMovement, weeklyOverhead, sponsorIncome, sponsorReturn,
} from '../../src/systems/economy';
import { emptyFinance, setState } from '../../src/core/state';
import { earnMoney, spendMoney } from '../../src/data/club';
import { FACILITY_CATALOG, LEVEL_MULT, facilityUpkeep, upgradeCost } from '../../src/data/facility';
import { renewalWage } from '../../src/systems/contracts';
import {
  getState, loadState,
  type Player, type PlacedFacility, type GameState, type Fixture,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { DIFFICULTY, ECON, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';
import { clearTickHooks, advanceWeek, TICK_ORDER } from '../../src/core/time';

// A player with fully controlled economic fields.
function mkPlayer(over: Partial<Player> = {}): Player {
  const base: Player = {
    id: over.id ?? `p_${Math.random()}`,
    name: over.name ?? 'Test Player',
    age: 25,
    position: 'lock',
    ceilings: { speed: 100, strength: 100, stamina: 100, handling: 100, kicking: 100, footyIQ: 100 },
    stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 },
    morale: 60,
    injuryRisk: 10,
    injuredWeeks: 0,
    traits: [],
    wage: 5000,
    contractWeeks: 20,
  };
  return { ...base, ...over };
}

const pf = (defId: PlacedFacility['defId'], level: PlacedFacility['level'] = 1): PlacedFacility => ({
  id: `f_${defId}_${level}`, defId, level, x: 0, y: 0,
});

/** Replace the whole state with controlled fields on top of a fresh game. */
function setup(patch: Partial<GameState>): void {
  createNewGame('Test Club', 1);
  loadState({ ...getState(), ...patch });
}

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  createNewGame('Test Club', 1);
});

describe('weeklyWages', () => {
  it('sums all squad wages', () => {
    setup({ squad: [mkPlayer({ wage: 1000 }), mkPlayer({ wage: 2500 }), mkPlayer({ wage: 500 })] });
    expect(weeklyWages(getState())).toBe(4000);
  });
  it('empty squad → 0', () => {
    setup({ squad: [] });
    expect(weeklyWages(getState())).toBe(0);
  });
});

describe('weeklyUpkeep (N6, #164)', () => {
  it('sums each built facility\'s upkeep at its level', () => {
    setup({ facilities: [pf('trainingPaddock', 1), pf('grandstand', 2), pf('teamGym', 3)] });
    const want = facilityUpkeep(FACILITY_CATALOG.trainingPaddock, 1)
      + facilityUpkeep(FACILITY_CATALOG.grandstand, 2)
      + facilityUpkeep(FACILITY_CATALOG.teamGym, 3);
    expect(weeklyUpkeep(getState())).toBe(want);
    expect(want).toBe(80 + 1800 + 800);
  });
  it('nothing built → 0', () => {
    setup({ facilities: [] });
    expect(weeklyUpkeep(getState())).toBe(0);
  });
  it('is not scaled by difficulty', () => {
    createNewGame('Hard Club', 1, { difficulty: 'hard' });
    loadState({ ...getState(), facilities: [pf('grandstand', 1)] });
    expect(weeklyUpkeep(getState())).toBe(1200);
  });
});

describe('weeklyOverhead: the club\'s running costs (N12.3)', () => {
  it('is ECON.OVERHEAD_WEEKLY on Normal, ×0.8 on Easy and ×1.2 on Hard', () => {
    expect(ECON.OVERHEAD_WEEKLY).toBe(1500);
    expect(weeklyOverhead(getState())).toBe(ECON.OVERHEAD_WEEKLY);
    expect([DIFFICULTY.easy.overhead, DIFFICULTY.normal.overhead, DIFFICULTY.hard.overhead]).toEqual([0.8, 1, 1.2]);
    createNewGame('Easy Club', 1, { difficulty: 'easy' });
    expect(weeklyOverhead(getState())).toBe(1200);
    createNewGame('Hard Club', 1, { difficulty: 'hard' });
    expect(weeklyOverhead(getState())).toBe(1800);
  });
  it('is the same whatever the club has built or signed', () => {
    setup({ squad: [], facilities: [] });
    const bare = weeklyOverhead(getState());
    setup({ squad: [mkPlayer({ wage: 9000 })], facilities: [pf('grandstand', 3), pf('sponsorBoard', 2)], reputation: 90 });
    expect(weeklyOverhead(getState())).toBe(bare);
  });
  it('an old save with no difficulty pays Normal\'s', () => {
    setup({ settings: { ...getState().settings, difficulty: undefined as never } });
    expect(weeklyOverhead(getState())).toBe(ECON.OVERHEAD_WEEKLY);
  });
});

describe('weeklyIncome', () => {
  it('rep grant only when no sponsor board', () => {
    setup({ reputation: 30, facilities: [] });
    // 40 × 30 = 1200 (#176)
    expect(weeklyIncome(getState())).toBe(30 * ECON.REP_GRANT_PER_POINT);
    expect(ECON.REP_GRANT_PER_POINT).toBe(40);
  });
  it('a sponsor board adds its return at its level and the club\'s reputation (N12)', () => {
    setup({ reputation: 30, facilities: [pf('sponsorBoard', 2)] });
    // (150 + 10×30) × 1.6 = 720 ; grant 40×30 = 1200
    expect(sponsorIncome(getState())).toBe(720);
    expect(weeklyIncome(getState())).toBe(720 + 30 * ECON.REP_GRANT_PER_POINT);
  });
  it('sponsor income is 0 without a board (only rep grant)', () => {
    setup({ reputation: 10, facilities: [pf('grandstand', 3)] });
    // grandstand is not a sponsor board → sponsor part 0; 40×10 = 400
    expect(weeklyIncome(getState())).toBe(10 * ECON.REP_GRANT_PER_POINT);
  });
});

describe('the Sponsor Board\'s return (N12)', () => {
  it('is SPONSOR_BASE + SPONSOR_PER_REP × reputation a week at L1', () => {
    expect(ECON.SPONSOR_BASE).toBe(150);
    expect(ECON.SPONSOR_PER_REP).toBe(10);
    expect(sponsorReturn(1, 0)).toBe(150);
    expect(sponsorReturn(1, 30)).toBe(450);
    expect(sponsorReturn(1, 60)).toBe(750);
    expect(sponsorReturn(1, 31) - sponsorReturn(1, 30)).toBe(ECON.SPONSOR_PER_REP);
  });

  it('is capped at SPONSOR_CAP a level step, from reputation 85', () => {
    expect(ECON.SPONSOR_CAP).toBe(1_000);
    expect(sponsorReturn(1, 85)).toBe(1_000);
    expect(sponsorReturn(1, 84)).toBe(990);
    expect(sponsorReturn(1, 100)).toBe(1_000);
  });

  it('steps by level like every facility (LEVEL_MULT) and is 0 unbuilt', () => {
    expect(LEVEL_MULT).toEqual([1, 1.6, 2.2]);
    expect(sponsorReturn(0, 60)).toBe(0);
    expect([1, 2, 3].map((l) => sponsorReturn(l, 30))).toEqual([450, 720, 990]);
    expect([1, 2, 3].map((l) => sponsorReturn(l, 100))).toEqual([1_000, 1_600, 2_200]);
  });

  it('pays back its build in a season or more at reputation 30, and fast enough at the top to be worth having', () => {
    const def = FACILITY_CATALOG.sponsorBoard;
    const payback = (rep: number): number => upgradeCost(def, 1) / (sponsorReturn(1, rep) - facilityUpkeep(def, 1));
    expect(payback(30)).toBeGreaterThanOrEqual(WEEKS_PER_SEASON); // 10,000 / 350 ≈ 29 weeks (a flat $3,000 paid back in 4)
    expect(payback(30)).toBeLessThan(WEEKS_PER_SEASON + 5);
    expect(Math.round(payback(60))).toBe(15);
    expect(Math.round(payback(100))).toBe(11);
  });

  it('weeklyIncome follows the club\'s reputation through the board', () => {
    setup({ reputation: 80, facilities: [pf('sponsorBoard', 3)] });
    // min(1000, 150 + 800) × 2.2 = 2090 ; grant 40×80 = 3200
    expect(sponsorIncome(getState())).toBe(2090);
    expect(weeklyIncome(getState())).toBe(2090 + 80 * ECON.REP_GRANT_PER_POINT);
  });
});

describe('gateReceipts: min(seats, demand) (N6, #169)', () => {
  const homeFixture = (round: number, awayId = 'rivalX'): Fixture => ({ round, homeId: 'player', awayId });
  const awayFixture = (round: number): Fixture => ({ round, homeId: 'rivalX', awayId: 'player' });
  const won = (f: Fixture): Fixture => ({ ...f, result: f.homeId === 'player' ? { homeScore: 20, awayScore: 10 } : { homeScore: 10, awayScore: 20 } });
  const lost = (f: Fixture): Fixture => ({ ...f, result: f.homeId === 'player' ? { homeScore: 10, awayScore: 20 } : { homeScore: 20, awayScore: 10 } });

  it('returns 0 when league has no fixtures (graceful)', () => {
    setup({ week: 1, reputation: 30, league: { clubs: [], fixtures: [], ladder: [] } });
    expect(gateReceipts(getState())).toBe(0);
  });

  it('returns 0 on an away week', () => {
    setup({
      week: 3, reputation: 30,
      league: { clubs: [], fixtures: [awayFixture(3)], ladder: [] },
    });
    expect(gateReceipts(getState())).toBe(0);
  });

  it('returns 0 on a bye week (no fixture for this round)', () => {
    setup({
      week: 5, reputation: 30,
      league: { clubs: [], fixtures: [homeFixture(1), homeFixture(2)], ladder: [] },
    });
    expect(gateReceipts(getState())).toBe(0);
  });

  it('home week on the hill: demand × ticket price', () => {
    setup({
      week: 3, reputation: 30, facilities: [],
      league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] },
    });
    // demand = 300 + 30×30 = 1,200 (under the hill's 2,000); gate = 1,200 × the ticket.
    expect(gateReceipts(getState())).toBe(1200 * ECON.TICKET_PRICE);
    expect(ECON.TICKET_PRICE).toBe(21);
    const g = homeGate(getState(), homeFixture(3));
    expect(g).toEqual({ capacity: 2000, demand: 1200, attendance: 1200, receipts: 1200 * ECON.TICKET_PRICE, soldOut: false });
  });

  it('Easy pays its factor of the same gate; Hard and Normal pay the full gate', () => {
    const at = (d: 'easy' | 'normal' | 'hard'): number => {
      const settings = { ...getState().settings, difficulty: d };
      setup({
        week: 3, reputation: 30, facilities: [], settings,
        league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] },
      });
      return homeGate(getState(), homeFixture(3)).receipts;
    };
    const full = 1200 * ECON.TICKET_PRICE;
    expect(at('normal')).toBe(full);
    expect(at('hard')).toBe(full);
    expect(at('easy')).toBe(Math.round(full * DIFFICULTY.easy.gate));
    // Form and the occasion still move demand the same way; only the receipt scales.
    expect(at('easy')).toBeLessThan(full);
  });

  it('the hill holds 2,000: a famous club sells out, and a Grandstand lifts the roof', () => {
    const at = (facilities: PlacedFacility[]): ReturnType<typeof homeGate> => {
      setup({ week: 3, reputation: 100, facilities, league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] } });
      return homeGate(getState(), homeFixture(3));
    };
    // demand = 300 + 100×30 = 3,300
    expect(at([])).toEqual({ capacity: 2000, demand: 3300, attendance: 2000, receipts: 2000 * ECON.TICKET_PRICE, soldOut: true });
    expect(at([pf('grandstand', 1)])).toEqual({ capacity: 3500, demand: 3300, attendance: 3300, receipts: 3300 * ECON.TICKET_PRICE, soldOut: false });
    expect(at([pf('grandstand', 2)]).capacity).toBe(5000);
    expect(at([pf('grandstand', 3)]).capacity).toBe(6500);
    expect(gateReceipts(getState())).toBe(3300 * ECON.TICKET_PRICE);
  });

  it('form moves demand ±25% over the last five results, from the matches before the round', () => {
    const run = (results: Fixture[]): number => {
      setup({ week: 7, reputation: 30, facilities: [], league: { clubs: [], fixtures: [...results, homeFixture(7)], ladder: [] } });
      return homeGate(getState(), homeFixture(7)).demand;
    };
    const five = [awayFixture(1), homeFixture(2), awayFixture(3), homeFixture(4), awayFixture(5)];
    expect(run(five.map(won))).toBe(1500);
    expect(run(five.map(lost))).toBe(900);
    expect(run([won(five[0]!), won(five[1]!), won(five[2]!), lost(five[3]!), lost(five[4]!)])).toBe(1260);
    // Six results: only the last five count; a sixth loss before them changes nothing.
    expect(run([lost(awayFixture(6)), ...five.map(won)].map((f) => (f.round === 6 ? { ...f, round: 0 } : f)))).toBe(1500);
    expect(recentForm(getState())).toBe(1);
    setup({ week: 1, league: { clubs: [], fixtures: [homeFixture(1)], ladder: [] } });
    expect(recentForm(getState())).toBe(0);
  });

  it('a top-eight opponent draws 20% more and a home final 50% more', () => {
    const row = (clubId: string, points: number) => ({ clubId, played: 5, wins: points / 2, draws: 0, losses: 5 - points / 2, pointsFor: 0, pointsAgainst: 0, points });
    const ladder = [row('player', 6), ...Array.from({ length: 8 }, (_, i) => row(`top${i}`, 10)), row('rivalX', 0)];
    setup({ week: 6, reputation: 30, facilities: [], league: { clubs: [], fixtures: [homeFixture(6, 'top3')], ladder } });
    expect(homeGate(getState(), homeFixture(6, 'top3')).demand).toBe(1440);
    expect(homeGate(getState(), homeFixture(6, 'rivalX')).demand).toBe(1200);
    // Round 1: nobody has played, so no big match yet.
    setup({ week: 1, reputation: 30, facilities: [], league: { clubs: [], fixtures: [homeFixture(1, 'top3')], ladder: ladder.map((r) => ({ ...r, played: 0, points: 0 })) } });
    expect(homeGate(getState(), homeFixture(1, 'top3')).demand).toBe(1200);
    // A home final (round 25).
    setup({ week: 25, reputation: 30, facilities: [], league: { clubs: [], fixtures: [homeFixture(25)], ladder: [] } });
    expect(homeGate(getState(), homeFixture(25)).demand).toBe(1800);
    expect(gateReceipts(getState())).toBe(1800 * ECON.TICKET_PRICE);
    // A famous club's home final overflows the hill: the roof is why a finals side wants a stand.
    setup({ week: 25, reputation: 60, facilities: [], league: { clubs: [], fixtures: [homeFixture(25)], ladder: [] } });
    expect(homeGate(getState(), homeFixture(25))).toEqual({ capacity: 2000, demand: 3150, attendance: 2000, receipts: 2000 * ECON.TICKET_PRICE, soldOut: true });
  });
});

describe('nextStandGate: what the next Grandstand level would earn (N12)', () => {
  const homeFixture = (round: number): Fixture => ({ round, homeId: 'player', awayId: 'rivalX' });
  const won = (f: Fixture): Fixture => ({ ...f, result: { homeScore: 20, awayScore: 10 } });
  /** Round 26 is a home final (×1.5); five wins before it are form +25%. */
  const run = [21, 22, 23, 24, 25].map((r) => won(homeFixture(r)));
  const at = (reputation: number, level: 0 | 1 | 2 | 3, fixture: Fixture, results: Fixture[] = []): GameState => {
    setup({
      week: fixture.round, reputation, facilities: level ? [pf('grandstand', level)] : [],
      league: { clubs: [], fixtures: [...results, fixture], ladder: [] },
    });
    return getState();
  };
  /** The gate the weekly tick would pay with the next level built. */
  const builtGate = (s: GameState, level: 1 | 2 | 3): number => gateReceipts({ ...s, facilities: [pf('grandstand', level)] });

  it('below capacity at every level: nothing to say', () => {
    // demand 1,200 / 3,300 / 4,950 (a home final at 100) against 2,000 / 3,500 / 5,000 / 6,500
    expect(nextStandGate(at(30, 0, homeFixture(6)), homeFixture(6))).toBeNull();
    expect(nextStandGate(at(100, 1, homeFixture(6)), homeFixture(6))).toBeNull();
    expect(nextStandGate(at(100, 2, homeFixture(26)), homeFixture(26))).toBeNull();
    expect(nextStandGate(at(100, 3, homeFixture(26), run), homeFixture(26))).toBeNull();
  });

  it('the hill sold out: a stand at level 1, up to its seats, against today\'s gate', () => {
    // demand 3,300 fits a stand's 3,500
    const s = at(100, 0, homeFixture(6));
    expect(nextStandGate(s, homeFixture(6))).toEqual({ level: 1, capacity: 3500, attendance: 3300, receipts: 3300 * ECON.TICKET_PRICE, gain: (3300 - 2000) * ECON.TICKET_PRICE });
    expect(nextStandGate(s, homeFixture(6))!.receipts).toBe(builtGate(s, 1));
    // a home final at 100: demand 4,950 fills the stand's 3,500
    const f = at(100, 0, homeFixture(26));
    expect(nextStandGate(f, homeFixture(26))).toEqual({ level: 1, capacity: 3500, attendance: 3500, receipts: 3500 * ECON.TICKET_PRICE, gain: 1500 * ECON.TICKET_PRICE });
  });

  it('a level-1 stand sold out: level 2\'s 5,000 seats', () => {
    const s = at(100, 1, homeFixture(26));
    // demand 4,950 on 3,500 seats
    expect(homeGate(s, homeFixture(26)).soldOut).toBe(true);
    expect(nextStandGate(s, homeFixture(26))).toEqual({ level: 2, capacity: 5000, attendance: 4950, receipts: 4950 * ECON.TICKET_PRICE, gain: 1450 * ECON.TICKET_PRICE });
    expect(nextStandGate(s, homeFixture(26))!.receipts).toBe(builtGate(s, 2));
  });

  it('a level-2 stand sold out: level 3\'s 6,500 seats', () => {
    // a home final on a winning run at 100: 3,300 × 1.25 × 1.5 = 6,188 on 5,000 seats
    const s = at(100, 2, homeFixture(26), run);
    expect(homeGate(s, homeFixture(26))).toMatchObject({ demand: 6188, soldOut: true });
    expect(nextStandGate(s, homeFixture(26))).toEqual({ level: 3, capacity: 6500, attendance: 6188, receipts: 6188 * ECON.TICKET_PRICE, gain: 1188 * ECON.TICKET_PRICE });
    expect(nextStandGate(s, homeFixture(26))!.receipts).toBe(builtGate(s, 3));
  });

  it('the top level sold out (only a test can fill 6,500): nothing above it', () => {
    const s = at(300, 3, homeFixture(26));
    expect(homeGate(s, homeFixture(26)).soldOut).toBe(true);
    expect(nextStandGate(s, homeFixture(26))).toBeNull();
  });
});

describe('tickContracts', () => {
  it('decrements contractWeeks for all squad', () => {
    setup({ squad: [mkPlayer({ id: 'a', contractWeeks: 10 }), mkPlayer({ id: 'b', contractWeeks: 3 })] });
    tickContracts(getState());
    const s = getState();
    expect(s.squad.find((p) => p.id === 'a')!.contractWeeks).toBe(9);
    expect(s.squad.find((p) => p.id === 'b')!.contractWeeks).toBe(2);
  });

  it('does not reprice or release a player when the week count hits zero', () => {
    const p = mkPlayer({
      id: 'renew', wage: 4000, morale: 50, contractWeeks: 1,
      stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 },
    });
    setup({ money: 100, reputation: 30, season: 1, squad: [p] });
    const cash = getState().money;
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'renew')!;
    expect(out.contractWeeks).toBe(0);
    expect(out.wage).toBe(4000);
    expect(getState().money).toBe(cash);
    expect(getState().freeAgents.some((x) => x.id === 'renew')).toBe(false);
    expect(renewalWage(p, { reputation: 30, season: 1 })).toBe(1050);
  });

  it('empty squad is a no-op', () => {
    setup({ squad: [] });
    expect(() => tickContracts(getState())).not.toThrow();
    expect(getState().squad).toHaveLength(0);
  });
});

describe('handleBankruptcy', () => {
  it('does not warn, sell or cut morale when the bank is negative', () => {
    const squad = Array.from({ length: SQUAD_MIN + 2 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 1000 * (i + 1), morale: 50 }));
    setup({ money: -5_000_000, squad });
    let warned = false;
    bus.on('bankruptcy:warning', () => { warned = true; });
    handleBankruptcy(getState());
    expect(warned).toBe(false);
    expect(getState().squad.map(p => p.id)).toEqual(squad.map(p => p.id));
    expect(getState().squad.every(p => p.morale === 50)).toBe(true);
    expect(getState().money).toBe(-5_000_000);
  });

});

describe('applyEconomy — full weekly loop', () => {
  it('credits sponsor and the rep grant without taking wages, upkeep or overhead', () => {
    const reasons: string[] = [];
    bus.on('money:changed', (m) => reasons.push(m.reason));
    setup({
      money: 100_000, reputation: 30,
      squad: [mkPlayer({ wage: 5000, contractWeeks: 30 })],
      facilities: [pf('sponsorBoard', 1)],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    applyEconomy(getState());
    expect(getState().money).toBe(100_000 + 450 + 30 * ECON.REP_GRANT_PER_POINT);
    expect(reasons).toEqual(['sponsor', 'grant']);
    expect(getState().squad).toHaveLength(1);
  });

  it('does not charge facility upkeep or an idle club\'s running costs', () => {
    const seen: { delta: number; reason: string }[] = [];
    bus.on('money:changed', (m) => seen.push({ delta: m.delta, reason: m.reason }));
    setup({
      money: 50_000, reputation: 0, squad: [],
      facilities: [pf('grandstand', 3), pf('trainingPaddock', 2)],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    applyEconomy(getState());
    expect(seen).toEqual([]);
    expect(getState().money).toBe(50_000);
    expect(weeklyUpkeep(getState())).toBe(2400 + 120);
  });

  it('a home gate is cash in, and a huge wage bill does not sell anyone', () => {
    const squad = Array.from({ length: SQUAD_MIN + 1 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 200_000, contractWeeks: 30 }));
    setup({
      money: 0, reputation: 50, squad,
      facilities: [pf('grandstand', 3)],
      league: { clubs: [], fixtures: [{ round: 1, homeId: 'player', awayId: 'r' }], ladder: [] },
      week: 1,
    });
    applyEconomy(getState());
    expect(getState().squad).toHaveLength(SQUAD_MIN + 1);
    expect(getState().money).toBeGreaterThan(0);
  });
});

describe('the club\'s books (N6, #172)', () => {
  it('books every money movement on its line for the open season', () => {
    setup({ season: 2, week: 5, money: 100_000, finance: [emptyFinance(1), emptyFinance(2)] });
    const off = registerFinanceSystem();
    earnMoney(-5000, 'wages');
    earnMoney(30_000, 'gate');
    earnMoney(-800, 'upkeep');
    earnMoney(-1500, 'overhead');
    earnMoney(15_000, 'board grant');
    spendMoney(9000, 'build:canteen');
    earnMoney(2000, 'something new');
    earnMoney(-1200, 'Merch royalties');
    off();
    earnMoney(999, 'gate'); // unsubscribed: not booked
    const f = getState().finance;
    expect(f).toHaveLength(2);
    expect(f[1]).toEqual({ ...emptyFinance(2), wages: -5000, gate: 30_000, upkeep: -800, overhead: -1500, boardGrant: 15_000, facilities: -9000, other: 2000, events: -1200 });
    expect(f[0]).toEqual(emptyFinance(1));
    expect(financeNet(f[1]!)).toBe(-5000 + 30_000 - 800 - 1500 + 15_000 - 9000 + 2000 - 1200 + 2); // + the season number
  });

  it('the rollover\'s prize and grant close the season just played; week 1\'s wages open the new one', () => {
    setup({ season: 1, week: 27, finance: [{ ...emptyFinance(1), wages: -100 }] });
    const off = registerFinanceSystem();
    setState({ season: 2, week: 1 }); // the counters bump before the season hooks run…
    earnMoney(45_000, 'finals prize money'); // …which pay the season just played
    earnMoney(15_000, 'board grant');
    earnMoney(-6000, 'wages'); // week 1 of the new season
    earnMoney(20_000, 'gate');
    setState({ week: 2 });
    earnMoney(-6000, 'wages');
    off();
    const f = getState().finance;
    expect(f.map((e) => e.season)).toEqual([1, 2]);
    expect(f[0]).toEqual({ ...emptyFinance(1), wages: -100, prize: 45_000, boardGrant: 15_000 });
    expect(f[1]).toEqual({ ...emptyFinance(2), wages: -12_000, gate: 20_000 });
  });

  it('a save written before the new season was booked loads right: week 1 goes to the new season', () => {
    // An autosave at the rollover can carry season 2 with only season 1's entry.
    setup({ season: 2, week: 1, finance: [{ ...emptyFinance(1), gate: 300_000, prize: 15_000 }] });
    const off = registerFinanceSystem();
    earnMoney(-6000, 'wages');
    earnMoney(15_000, 'board grant'); // a grant at week 1 with a previous season on the books closes it…
    off();
    const f = getState().finance;
    expect(f.map((e) => e.season)).toEqual([1, 2]);
    expect(f[0]!.boardGrant).toBe(15_000);
    expect(f[1]).toEqual({ ...emptyFinance(2), wages: -6000 });
    // …but with no previous season on the books it stays in the current one.
    setup({ season: 1, week: 1, finance: [] });
    const off2 = registerFinanceSystem();
    earnMoney(15_000, 'board grant');
    off2();
    expect(getState().finance).toEqual([{ ...emptyFinance(1), boardGrant: 15_000 }]);
  });

  it('a save with no books starts them for its season, and entries stay in season order', () => {
    setup({ season: 3, finance: [] });
    const off = registerFinanceSystem();
    earnMoney(1, 'gate');
    off();
    expect(getState().finance).toEqual([{ ...emptyFinance(3), gate: 1 }]);
    setup({ season: 2, week: 5, finance: [emptyFinance(3)] }); // a stray later entry never moves ahead of the current one
    const off2 = registerFinanceSystem();
    earnMoney(1, 'gate');
    off2();
    expect(getState().finance.map((e) => e.season)).toEqual([2, 3]);
  });

  it('through a real week tick the books say what the ledger says', () => {
    setup({
      week: 3, money: 100_000, reputation: 30, facilities: [pf('sponsorBoard', 1)],
      squad: [mkPlayer({ wage: 1000, contractWeeks: 30 })],
      league: { clubs: [], fixtures: [{ round: 3, homeId: 'player', awayId: 'r' }], ladder: [] },
      finance: [emptyFinance(1)],
    });
    const seen: Record<string, number> = {};
    bus.on('money:changed', ({ delta, reason }) => { seen[classifyReason(reason)] = (seen[classifyReason(reason)] ?? 0) + delta; });
    registerEconomySystem();
    const off = registerFinanceSystem();
    advanceWeek();
    off();
    const books = getState().finance[0]!;
    expect(books.season).toBe(1);
    for (const [line, delta] of Object.entries(seen)) expect(books[line as keyof typeof books], line).toBe(delta);
    expect(books.wages).toBe(0);
    expect(books.upkeep).toBe(0);
    expect(books.overhead).toBe(0);
    expect(books.sponsor).toBe(sponsorReturn(1, 30)); // $150 + $10 × 30 (N12)
    expect(books.grant).toBe(30 * ECON.REP_GRANT_PER_POINT);
    expect(books.gate).toBe(1200 * ECON.TICKET_PRICE);
  });
});

describe('stampMovement: where a movement belongs (N12)', () => {
  it('stamps the clock and the books\' line for an ordinary movement', () => {
    setup({ season: 2, week: 5, finance: [emptyFinance(1), emptyFinance(2)] });
    expect(stampMovement(getState(), 'wages')).toEqual({ line: 'wages', season: 2, week: 5 });
    expect(stampMovement(getState(), 'sign:p1')).toEqual({ line: 'transfers', season: 2, week: 5 });
    // Prize money or a grant away from the rollover is an ordinary movement.
    expect(stampMovement(getState(), 'board grant')).toEqual({ line: 'boardGrant', season: 2, week: 5 });
  });

  it('the rollover\'s prize money and board grant go to the last week of the season they close', () => {
    setup({ season: 2, week: 1, finance: [emptyFinance(1)] });
    expect(stampMovement(getState(), 'finals prize money')).toEqual({ line: 'prize', season: 1, week: WEEKS_PER_SEASON });
    expect(stampMovement(getState(), 'board grant')).toEqual({ line: 'boardGrant', season: 1, week: WEEKS_PER_SEASON });
    // Week 1's ordinary movements open the new season.
    expect(stampMovement(getState(), 'wages')).toEqual({ line: 'wages', season: 2, week: 1 });
    expect(stampMovement(getState(), 'gate')).toEqual({ line: 'gate', season: 2, week: 1 });
    // With no season before on the books there is nothing to close.
    setup({ season: 1, week: 1, finance: [] });
    expect(stampMovement(getState(), 'board grant')).toEqual({ line: 'boardGrant', season: 1, week: 1 });
  });
});

describe('registerEconomySystem — hook installation', () => {
  it('installs the economy hook at TICK_ORDER.economy (30) and runs on advanceWeek', () => {
    setup({
      money: 100_000, reputation: 20,
      squad: [mkPlayer({ wage: 3000, contractWeeks: 30 })],
      facilities: [],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    registerEconomySystem();
    expect(TICK_ORDER.economy).toBe(30);
    advanceWeek();
    expect(getState().money).toBe(100_000 + 20 * ECON.REP_GRANT_PER_POINT);
  });

  it('re-registering does not double-apply', () => {
    setup({
      money: 100_000, reputation: 20,
      squad: [mkPlayer({ wage: 3000, contractWeeks: 30 })],
      facilities: [], league: { clubs: [], fixtures: [], ladder: [] },
    });
    registerEconomySystem();
    registerEconomySystem();
    advanceWeek();
    expect(getState().money).toBe(100_000 + 20 * ECON.REP_GRANT_PER_POINT); // single application
  });
});

describe('legacy duplicate facilities', () => {
  it('counts only the best Sponsor Board, not a sum', () => {
    setup({ facilities: [
      { id: 'a', defId: 'sponsorBoard', level: 1, x: 0, y: 0 },
      { id: 'b', defId: 'sponsorBoard', level: 2, x: 5, y: 5 },
    ], reputation: 0 });
    expect(weeklyIncome(getState())).toBe(sponsorReturn(2, 0));
  });
});
