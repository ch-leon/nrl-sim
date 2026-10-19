import { describe, it, expect, beforeEach } from 'vitest';
import {
  financeSummary, FinanceLedger, initFinanceLedger, fmtMoney, fmtMoneyCompact,
  fmtRunway, EXPIRY_WINDOW_WEEKS,
} from '../../../src/ui/screens/finance';
import {
  createNewGame, getState, loadState,
  type Player, type PlacedFacility, type GameState, type Fixture,
} from '../../../src/core/state';
import { bus, type Events } from '../../../src/core/events';
import { earnMoney } from '../../../src/data/club';
import {
  weeklyWages, weeklyIncome, gateReceipts, applyEconomy,
} from '../../../src/systems/economy';
import { clearTickHooks } from '../../../src/core/time';

function mkPlayer(over: Partial<Player> = {}): Player {
  const base: Player = {
    id: `p_${Math.random()}`,
    name: 'Test Player',
    age: 25,
    position: 'lock',
    stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 },
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

/** Fresh game with controlled fields on top. */
function setup(patch: Partial<GameState>): GameState {
  createNewGame('Test Club', 1);
  loadState({ ...getState(), ...patch });
  return getState();
}

const homeFixture = (round: number): Fixture => ({ round, homeId: 'player', awayId: 'rivalX' });
const awayFixture = (round: number): Fixture => ({ round, homeId: 'rivalX', awayId: 'player' });

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  createNewGame('Test Club', 1);
});

describe('financeSummary — weekly P&L', () => {
  it('splits income into sponsor and grant and matches the economy totals', () => {
    const s = setup({
      week: 3, reputation: 30, facilities: [pf('sponsorBoard', 2)],
      squad: [mkPlayer({ wage: 1000 }), mkPlayer({ wage: 2500 })],
    });
    const f = financeSummary(s);
    // sponsor 3000×2 = 6000 ; grant 50×30 = 1500 ; income 7500 ; wages 3500
    expect(f.sponsorWeekly).toBe(6000);
    expect(f.grantWeekly).toBe(1500);
    expect(f.incomeWeekly).toBe(7500);
    expect(f.incomeWeekly).toBe(weeklyIncome(s));
    expect(f.wagesWeekly).toBe(3500);
    expect(f.wagesWeekly).toBe(weeklyWages(s));
    expect(f.sponsorWeekly + f.grantWeekly).toBe(f.incomeWeekly);
    expect(f.netWeekly).toBe(4000);
    expect(f.burnWeekly).toBe(0);
  });

  it('sponsor part is 0 without a sponsor board; grant covers all income', () => {
    const s = setup({ reputation: 10, facilities: [pf('grandstand', 3)] });
    const f = financeSummary(s);
    expect(f.sponsorWeekly).toBe(0);
    expect(f.grantWeekly).toBe(500);
  });

  it('net is income − wages and burn is the shortfall, with runway = money ÷ burn', () => {
    const s = setup({
      money: 85_000, reputation: 30, facilities: [],
      squad: [mkPlayer({ wage: 10_000 })],
    });
    const f = financeSummary(s);
    // income 1500 ; wages 10000 ; net −8500 ; burn 8500 ; runway 85000/8500 = 10
    expect(f.netWeekly).toBe(-8500);
    expect(f.burnWeekly).toBe(8500);
    expect(f.runwayWeeks).toBe(10);
  });

  it('runway is null when income covers wages (no burn)', () => {
    const s = setup({
      money: 1_000, reputation: 100, facilities: [],
      squad: [mkPlayer({ wage: 1000 })],
    });
    const f = financeSummary(s);
    // income 5000 ≥ wages 1000
    expect(f.burnWeekly).toBe(0);
    expect(f.runwayWeeks).toBeNull();
  });

  it('runway is 0 when the bank is already negative and the club burns cash', () => {
    const s = setup({
      money: -400, reputation: 0, facilities: [],
      squad: [mkPlayer({ wage: 2000 })],
    });
    expect(financeSummary(s).runwayWeeks).toBe(0);
  });
});

describe('financeSummary — next home gate', () => {
  it('picks the earliest home fixture from the current week and projects its gate', () => {
    const s = setup({
      week: 3, reputation: 30, facilities: [],
      league: {
        clubs: [],
        fixtures: [homeFixture(2), awayFixture(4), homeFixture(6), homeFixture(5)],
        ladder: [],
      },
    });
    const f = financeSummary(s);
    // round 2 is past; next home is round 5. Gate at that week = (500+30×40)×20 = 34000.
    expect(f.nextHome).toEqual({ round: 5, projectedGate: 34000 });
    expect(f.nextHome?.projectedGate).toBe(gateReceipts({ ...s, week: 5 }));
  });

  it('includes a home game in the current week', () => {
    const s = setup({
      week: 4, reputation: 30, facilities: [],
      league: { clubs: [], fixtures: [homeFixture(4)], ladder: [] },
    });
    expect(financeSummary(s).nextHome?.round).toBe(4);
  });

  it('projects a grandstand-boosted gate (same formula as gateReceipts)', () => {
    const s = setup({
      week: 2, reputation: 50, facilities: [pf('grandstand', 3)],
      league: { clubs: [], fixtures: [homeFixture(2)], ladder: [] },
    });
    // (500 + 50×40) × (1 + 0.5×3) × 20 = 125000
    expect(financeSummary(s).nextHome?.projectedGate).toBe(125000);
  });

  it('is null when no home game is left (only away / past fixtures)', () => {
    const s = setup({
      week: 5, reputation: 30,
      league: { clubs: [], fixtures: [homeFixture(1), awayFixture(6)], ladder: [] },
    });
    expect(financeSummary(s).nextHome).toBeNull();
  });

  it('is null when the league has no fixtures', () => {
    const s = setup({ week: 1, league: { clubs: [], fixtures: [], ladder: [] } });
    expect(financeSummary(s).nextHome).toBeNull();
  });
});

describe('financeSummary — expiring contracts', () => {
  it(`lists squad players with ≤ ${EXPIRY_WINDOW_WEEKS} weeks left, soonest first`, () => {
    const s = setup({
      squad: [
        mkPlayer({ id: 'a', name: 'Ann', contractWeeks: 8, wage: 3000 }),
        mkPlayer({ id: 'b', name: 'Bob', contractWeeks: 9 }),
        mkPlayer({ id: 'c', name: 'Cal', contractWeeks: 1, wage: 2000 }),
        mkPlayer({ id: 'd', name: 'Dee', contractWeeks: 20 }),
      ],
    });
    expect(financeSummary(s).expiring).toEqual([
      { id: 'c', name: 'Cal', contractWeeks: 1, wage: 2000 },
      { id: 'a', name: 'Ann', contractWeeks: 8, wage: 3000 },
    ]);
  });

  it('is empty when nobody is near the end of contract', () => {
    const s = setup({ squad: [mkPlayer({ contractWeeks: 30 })] });
    expect(financeSummary(s).expiring).toEqual([]);
  });
});

describe('fmtMoney / fmtMoneyCompact / fmtRunway', () => {
  it('formats whole dollars with separators and signs', () => {
    expect(fmtMoney(1234)).toBe('$1,234');
    expect(fmtMoney(-50)).toBe('-$50');
    expect(fmtMoney(1234567)).toBe('$1,234,567');
    expect(fmtMoney(-0.4)).toBe('$0');
  });

  it('compacts large amounts for the ledger table', () => {
    expect(fmtMoneyCompact(12345)).toBe('$12.3k');
    expect(fmtMoneyCompact(-2500)).toBe('-$2.5k');
    expect(fmtMoneyCompact(999)).toBe('$999');
  });

  it('labels runway', () => {
    expect(fmtRunway(null)).toBe('No burn');
    expect(fmtRunway(1)).toBe('1 week');
    expect(fmtRunway(0.9)).toBe('0 weeks');
    expect(fmtRunway(12.7)).toBe('12 weeks');
  });
});

describe('FinanceLedger', () => {
  it('groups movements by week and classifies by reason', () => {
    const l = new FinanceLedger(6);
    l.record({ delta: -3000, reason: 'wages', season: 1, week: 2 });
    l.record({ delta: 1500, reason: 'sponsor+grant', season: 1, week: 2 });
    l.record({ delta: 34000, reason: 'gate', season: 1, week: 2 });
    l.record({ delta: -800, reason: 'build', season: 1, week: 2 });
    expect(l.rows()).toEqual([
      { season: 1, week: 2, wages: -3000, income: 1500, gate: 34000, other: -800, net: 31700 },
    ]);
  });

  it('keeps only the last N weeks, newest first, and returns copies', () => {
    const l = new FinanceLedger(2);
    l.record({ delta: 1, reason: 'gate', season: 1, week: 1 });
    l.record({ delta: 2, reason: 'gate', season: 1, week: 2 });
    l.record({ delta: 3, reason: 'gate', season: 1, week: 3 });
    const rows = l.rows();
    expect(rows.map((r) => r.week)).toEqual([3, 2]);
    rows[0].gate = 999;
    expect(l.rows()[0].gate).toBe(3);
  });

  it('treats the same week number in another season as a new week', () => {
    const l = new FinanceLedger(6);
    l.record({ delta: 1, reason: 'gate', season: 1, week: 5 });
    l.record({ delta: 1, reason: 'gate', season: 2, week: 5 });
    expect(l.rows().map((r) => r.season)).toEqual([2, 1]);
  });
});

describe('initFinanceLedger', () => {
  it('stamps money:changed with the current season and week', () => {
    setup({ season: 2, week: 7 });
    const l = new FinanceLedger(6);
    const off = initFinanceLedger(l);
    earnMoney(500, 'gate');
    off();
    expect(l.rows()).toEqual([
      { season: 2, week: 7, wages: 0, income: 0, gate: 500, other: 0, net: 500 },
    ]);
  });

  it('ignores later money changes after unsubscribing', () => {
    setup({ week: 1 });
    const l = new FinanceLedger(6);
    initFinanceLedger(l)();
    earnMoney(500, 'gate');
    expect(l.rows()).toEqual([]);
  });

  it('ledger rows match the economy functions for a real weekly tick', () => {
    const s = setup({
      week: 3, money: 100_000, reputation: 30, facilities: [pf('sponsorBoard', 1)],
      squad: [mkPlayer({ wage: 1000 }), mkPlayer({ wage: 2500, contractWeeks: 30 })],
      league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] },
    });
    const wages = weeklyWages(s);
    const income = weeklyIncome(s);
    const gate = gateReceipts(s);
    // Sanity: the scenario actually exercises all three movements.
    expect([wages, income, gate].every((v) => v > 0)).toBe(true);

    const l = new FinanceLedger(6);
    const seen: Events['money:changed'][] = [];
    const offRecord = initFinanceLedger(l);
    const offSpy = bus.on('money:changed', (e) => seen.push(e));

    applyEconomy(getState());
    offRecord();
    offSpy();

    expect(seen.map((e) => e.reason)).toEqual(['wages', 'sponsor+grant', 'gate']);
    expect(l.rows()).toEqual([{
      season: 1,
      week: 3,
      wages: -wages,
      income,
      gate,
      other: 0,
      net: -wages + income + gate,
    }]);
    // The ledger's net equals the balance change the tick actually produced.
    expect(getState().money).toBe(100_000 + (-wages + income + gate));
  });
});

describe('financeSummary — average home gate in the run-rate (QA)', () => {
  it('spreads the remaining home gates over the weeks left in the regular season', () => {
    const s = setup({
      week: 21, money: 50_000, reputation: 30, facilities: [],
      squad: [mkPlayer({ wage: 20_000 })],
      league: { clubs: [], fixtures: [homeFixture(20), homeFixture(21), awayFixture(22), homeFixture(23), awayFixture(24)], ladder: [] },
    });
    const f = financeSummary(s);
    const gate = gateReceipts({ ...s, week: 21 });
    // 2 home games left (R21, R23) over 4 weeks (R21–R24)
    expect(f.gateWeekly).toBe(Math.round((gate * 2) / 4));
    expect(f.netWeekly).toBe(f.incomeWeekly + f.gateWeekly - f.wagesWeekly);
    expect(f.burnWeekly).toBe(Math.max(0, f.wagesWeekly - f.incomeWeekly - f.gateWeekly));
  });

  it('a club whose gates cover the wages has no burn and no runway warning', () => {
    const fixtures = Array.from({ length: 24 }, (_, i) => (i % 2 ? awayFixture(i + 1) : homeFixture(i + 1)));
    const s = setup({ week: 1, money: 10_000, reputation: 30, facilities: [], squad: [mkPlayer({ wage: 15_000 })], league: { clubs: [], fixtures, ladder: [] } });
    const f = financeSummary(s);
    // gate at rep 30: (500 + 1200) × $20 = $34,000, every other week = $17,000/wk avg
    expect(f.gateWeekly).toBe(17_000);
    expect(f.burnWeekly).toBe(0);
    expect(f.runwayWeeks).toBeNull();
  });

  it('no home games left means no gate in the average', () => {
    const s = setup({ week: 24, facilities: [], league: { clubs: [], fixtures: [homeFixture(23), awayFixture(24)], ladder: [] } });
    expect(financeSummary(s).gateWeekly).toBe(0);
  });
});
