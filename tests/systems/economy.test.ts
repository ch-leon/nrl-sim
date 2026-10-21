import { describe, it, expect, beforeEach } from 'vitest';
import {
  weeklyWages, weeklyUpkeep, weeklyIncome, gateReceipts, homeGate, recentForm, tickContracts,
  handleBankruptcy, applyEconomy, registerEconomySystem, registerFinanceSystem, financeNet, classifyReason,
  nextStandGate, stampMovement, weeklyOverhead,
} from '../../src/systems/economy';
import { emptyFinance, setState } from '../../src/core/state';
import { earnMoney, spendMoney } from '../../src/data/club';
import { FACILITY_CATALOG, facilityUpkeep } from '../../src/data/facility';
import { renewalWage } from '../../src/systems/contracts';
import {
  createNewGame, getState, loadState,
  type Player, type PlacedFacility, type GameState, type Fixture,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { CONTRACTS, DIFFICULTY, ECON, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';
import { clearTickHooks, advanceWeek, TICK_ORDER } from '../../src/core/time';

// A player with fully controlled economic fields.
function mkPlayer(over: Partial<Player> = {}): Player {
  const base: Player = {
    id: over.id ?? `p_${Math.random()}`,
    name: over.name ?? 'Test Player',
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
  it('sponsor board adds 3000 × level', () => {
    setup({ reputation: 30, facilities: [pf('sponsorBoard', 2)] });
    // 3000×2 + 40×30 = 6000 + 1200 = 7200
    expect(weeklyIncome(getState())).toBe(6000 + 30 * ECON.REP_GRANT_PER_POINT);
  });
  it('sponsor income is 0 without a board (only rep grant)', () => {
    setup({ reputation: 10, facilities: [pf('grandstand', 3)] });
    // grandstand is not a sponsor board → sponsor part 0; 40×10 = 400
    expect(weeklyIncome(getState())).toBe(10 * ECON.REP_GRANT_PER_POINT);
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
    // demand = 300 + 30×30 = 1,200 (under the hill's 2,000) ; gate = 1,200 × $18 = 21,600
    expect(gateReceipts(getState())).toBe(1200 * ECON.TICKET_PRICE);
    expect(ECON.TICKET_PRICE).toBe(18);
    const g = homeGate(getState(), homeFixture(3));
    expect(g).toEqual({ capacity: 2000, demand: 1200, attendance: 1200, receipts: 21_600, soldOut: false });
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
    expect(nextStandGate(s, homeFixture(6))).toEqual({ level: 1, capacity: 3500, attendance: 3300, receipts: 59_400, gain: 59_400 - 36_000 });
    expect(nextStandGate(s, homeFixture(6))!.receipts).toBe(builtGate(s, 1));
    // a home final at 100: demand 4,950 fills the stand's 3,500
    const f = at(100, 0, homeFixture(26));
    expect(nextStandGate(f, homeFixture(26))).toEqual({ level: 1, capacity: 3500, attendance: 3500, receipts: 63_000, gain: 1500 * ECON.TICKET_PRICE });
  });

  it('a level-1 stand sold out: level 2\'s 5,000 seats', () => {
    const s = at(100, 1, homeFixture(26));
    // demand 4,950 on 3,500 seats
    expect(homeGate(s, homeFixture(26)).soldOut).toBe(true);
    expect(nextStandGate(s, homeFixture(26))).toEqual({ level: 2, capacity: 5000, attendance: 4950, receipts: 4950 * 18, gain: 1450 * ECON.TICKET_PRICE });
    expect(nextStandGate(s, homeFixture(26))!.receipts).toBe(builtGate(s, 2));
  });

  it('a level-2 stand sold out: level 3\'s 6,500 seats', () => {
    // a home final on a winning run at 100: 3,300 × 1.25 × 1.5 = 6,188 on 5,000 seats
    const s = at(100, 2, homeFixture(26), run);
    expect(homeGate(s, homeFixture(26))).toMatchObject({ demand: 6188, soldOut: true });
    expect(nextStandGate(s, homeFixture(26))).toEqual({ level: 3, capacity: 6500, attendance: 6188, receipts: 6188 * 18, gain: 1188 * ECON.TICKET_PRICE });
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

  it('auto-renews an expiring affordable player at the renewal ask, 52 weeks (#167)', () => {
    // overall 60, neutral morale, a new club at the baseline reputation → the market wage, $1,050.
    const p = mkPlayer({
      id: 'renew', wage: 4000, morale: 50, contractWeeks: 1,
      stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 }, // overall 60
    });
    setup({ money: 1_000_000, reputation: 30, season: 1, squad: [p] });
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'renew')!;
    expect(out.contractWeeks).toBe(52);
    expect(out.wage).toBe(1050);
    expect(out.wage).toBe(renewalWage(p, { reputation: 30, season: 1 }));
    expect(getState().freeAgents.some((x) => x.id === 'renew')).toBe(false);
  });

  it('the ask follows the wage curve and the club, not the old wage (#167)', () => {
    // overall 100 → $5,650 on the curve; reputation 100 in season 3 → ×1.25 × (1 + 2 × the season inflation).
    const elite = mkPlayer({
      id: 'elite', wage: 10000, morale: 50, contractWeeks: 1,
      stats: { speed: 100, strength: 100, stamina: 100, skill: 100, footyIQ: 100 },
    });
    setup({ money: 10_000_000, reputation: 100, season: 3, squad: [elite] });
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'elite')!;
    expect(out.wage).toBe(Math.round(5650 * 1.25 * (1 + 2 * CONTRACTS.RENEW_SEASON_INFLATION)));
  });

  it('unaffordable expiring player departs to freeAgents with a notify', () => {
    let notified: { text: string; kind: string } | null = null;
    bus.on('ui:notify', (n) => { if (n.kind === 'info') notified = n; });
    const p = mkPlayer({ id: 'depart', name: 'Gone Guy', wage: 5000, contractWeeks: 1 });
    // money too low: needs newWage×4 = 20000; give 100.
    setup({ money: 100, squad: [p, mkPlayer({ id: 'other', contractWeeks: 30 })] });
    tickContracts(getState());
    expect(getState().squad.some((x) => x.id === 'depart')).toBe(false);
    expect(getState().freeAgents.some((x) => x.id === 'depart')).toBe(true);
    expect(notified).not.toBeNull();
  });

  it('empty squad is a no-op', () => {
    setup({ squad: [] });
    expect(() => tickContracts(getState())).not.toThrow();
    expect(getState().squad).toHaveLength(0);
  });
});

describe('handleBankruptcy', () => {
  it('money < 0 emits bankruptcy:warning + danger notify', () => {
    let warned: { balance: number } | null = null;
    let danger = false;
    bus.on('bankruptcy:warning', (w) => { warned = w; });
    bus.on('ui:notify', (n) => { if (n.kind === 'danger') danger = true; });
    setup({ money: -1000, squad: [mkPlayer()] });
    handleBankruptcy(getState());
    expect(warned).toEqual({ balance: -1000, forcedSales: [] });
    expect(danger).toBe(true);
  });

  it('the warning names the forced sales, after them, and the toasts keep their order (N12.5)', () => {
    const pricey = mkPlayer({ id: 'pricey', name: 'Big Wage', wage: 20000 });
    const next = mkPlayer({ id: 'next', name: 'Next Wage', wage: 9000 });
    const filler = Array.from({ length: SQUAD_MIN }, (_, i) => mkPlayer({ id: `f${i}`, wage: 500 }));
    setup({ money: ECON.FORCED_SALE_FLOOR - 10_000, squad: [next, pricey, ...filler] });
    const seen: string[] = [];
    let squadAtWarning = -1;
    bus.on('ui:notify', (n) => { seen.push(n.text); });
    bus.on('bankruptcy:warning', (w) => {
      seen.push(`warning: ${(w.forcedSales ?? []).join(', ')}`);
      squadAtWarning = getState().squad.length;
    });
    handleBankruptcy(getState());
    expect(seen).toEqual([
      `The club is in the red ($${(ECON.FORCED_SALE_FLOOR - 10_000).toLocaleString()}). Balance the books!`,
      'Big Wage was force-sold to cover debts (no fee).',
      'Next Wage was force-sold to cover debts (no fee).',
      'warning: Big Wage, Next Wage',
    ]);
    expect(squadAtWarning).toBe(SQUAD_MIN);
  });

  it('no warning when money >= 0', () => {
    let warned = false;
    bus.on('bankruptcy:warning', () => { warned = true; });
    setup({ money: 5000, squad: [mkPlayer()] });
    handleBankruptcy(getState());
    expect(warned).toBe(false);
  });

  it('money < FORCED_SALE_FLOOR force-sells the highest-paid player (no payout)', () => {
    const cheap = mkPlayer({ id: 'cheap', wage: 1000 });
    const pricey = mkPlayer({ id: 'pricey', wage: 20000 });
    // Squad above SQUAD_MIN so a sale is allowed.
    const filler = Array.from({ length: SQUAD_MIN }, (_, i) => mkPlayer({ id: `f${i}`, wage: 500 }));
    setup({ money: ECON.FORCED_SALE_FLOOR - 10_000, squad: [cheap, pricey, ...filler] });
    const balanceBefore = getState().money;
    handleBankruptcy(getState());
    const s = getState();
    // highest-paid removed, no payout (money unchanged by the sale itself)
    expect(s.squad.some((p) => p.id === 'pricey')).toBe(false);
    expect(s.freeAgents.some((p) => p.id === 'pricey')).toBe(true);
    expect(s.money).toBe(balanceBefore); // no fee received
  });

  it('applies squad-wide morale −10 per forced sale, clamped ≥1', () => {
    // Exactly SQUAD_MIN+1 players so precisely one sale (the highest-paid) fires
    // before the loop halts at SQUAD_MIN. (Sales carry no payout, so money never
    // rises inside the loop; termination is by squad size.)
    const pricey = mkPlayer({ id: 'pricey', wage: 30000, morale: 60 });
    const lowMorale = mkPlayer({ id: 'low', wage: 100, morale: 5 });
    const filler = Array.from({ length: SQUAD_MIN - 1 }, (_, i) => mkPlayer({ id: `f${i}`, wage: 100, morale: 50 }));
    setup({ money: ECON.FORCED_SALE_FLOOR - 10_000, squad: [pricey, lowMorale, ...filler] });
    handleBankruptcy(getState());
    const s = getState();
    expect(s.squad.length).toBe(SQUAD_MIN);
    expect(s.squad.some((p) => p.id === 'pricey')).toBe(false); // highest-paid sold
    // remaining players lost 10 morale (one sale); low(5-10) clamps to 1.
    expect(s.squad.find((p) => p.id === 'low')!.morale).toBe(1);
    expect(s.squad.find((p) => p.id === 'f0')!.morale).toBe(40);
  });

  it('stops selling at SQUAD_MIN even if still under the floor (terminates)', () => {
    // Huge debt: would sell forever, but must stop at SQUAD_MIN.
    const squad = Array.from({ length: SQUAD_MIN + 2 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 1000 * (i + 1) }));
    setup({ money: -5_000_000, squad });
    handleBankruptcy(getState());
    const s = getState();
    expect(s.squad.length).toBe(SQUAD_MIN); // sold exactly 2 down to the minimum
    expect(s.money).toBeLessThan(ECON.FORCED_SALE_FLOOR); // still in debt, but stopped
  });

  it('no forced sale when between floor and 0 (warning only)', () => {
    const squad = Array.from({ length: SQUAD_MIN + 3 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 1000 }));
    setup({ money: -10_000, squad });
    handleBankruptcy(getState());
    expect(getState().squad.length).toBe(SQUAD_MIN + 3); // no sales above the floor
  });
});

describe('applyEconomy — full weekly loop', () => {
  it('deducts wages and credits sponsor + rep grant, emitting money:changed per path', () => {
    const reasons: string[] = [];
    bus.on('money:changed', (m) => reasons.push(m.reason));
    setup({
      money: 100_000, reputation: 30,
      squad: [mkPlayer({ wage: 5000, contractWeeks: 30 })],
      facilities: [pf('sponsorBoard', 1)],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    applyEconomy(getState());
    // wages -5000 ; upkeep -100 (Sponsor Board L1) ; running costs -1500 ; sponsor 3000 + grant 40×30 = 1200 ; no gate (empty league)
    expect(getState().money).toBe(100_000 - 5000 - 100 - ECON.OVERHEAD_WEEKLY + 3000 + 30 * ECON.REP_GRANT_PER_POINT);
    expect(reasons).toEqual(['wages', 'upkeep', 'overhead', 'sponsor', 'grant']);
  });

  it('pays upkeep after wages, at the facilities\' levels, and skips it with nothing built (#164)', () => {
    const seen: { delta: number; reason: string }[] = [];
    bus.on('money:changed', (m) => seen.push({ delta: m.delta, reason: m.reason }));
    setup({
      money: 50_000, reputation: 0, squad: [],
      facilities: [pf('grandstand', 3), pf('trainingPaddock', 2)],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    applyEconomy(getState());
    expect(seen).toEqual([{ delta: -(2400 + 120), reason: 'upkeep' }, { delta: -ECON.OVERHEAD_WEEKLY, reason: 'overhead' }]);
    expect(getState().money).toBe(50_000 - 2520 - ECON.OVERHEAD_WEEKLY);

    seen.length = 0;
    setup({ money: 50_000, reputation: 0, squad: [], facilities: [], league: { clubs: [], fixtures: [], ladder: [] } });
    applyEconomy(getState());
    expect(seen).toEqual([{ delta: -ECON.OVERHEAD_WEEKLY, reason: 'overhead' }]);
  });

  it('pays the running costs after upkeep and before any income, every week, built or not, on its own line (N12.3)', () => {
    const seen: { delta: number; reason: string }[] = [];
    bus.on('money:changed', (m) => seen.push({ delta: m.delta, reason: m.reason }));
    for (const [difficulty, cost] of [['easy', 1200], ['normal', 1500], ['hard', 1800]] as const) {
      seen.length = 0;
      createNewGame('Overhead', 1, { difficulty });
      loadState({
        ...getState(), money: 10_000, reputation: 30, week: 2,
        squad: [mkPlayer({ wage: 1000, contractWeeks: 30 })],
        facilities: [pf('trainingPaddock', 1)],
        league: { clubs: [], fixtures: [{ round: 2, homeId: 'player', awayId: 'r' }], ladder: [] },
      });
      applyEconomy(getState());
      expect(seen.map((m) => m.reason), difficulty).toEqual(['wages', 'upkeep', 'overhead', 'grant', 'gate']);
      expect(seen.find((m) => m.reason === 'overhead')!.delta, difficulty).toBe(-cost);
      expect(classifyReason('overhead')).toBe('overhead');
    }
    // An idle club with no money still pays it: it is what pushes an idle club into the red.
    seen.length = 0;
    setup({ money: 1000, reputation: 0, squad: [], facilities: [], league: { clubs: [], fixtures: [], ladder: [] } });
    applyEconomy(getState());
    expect(getState().money).toBe(1000 - ECON.OVERHEAD_WEEKLY);
  });

  it('home gate is credited and can rescue the club before forced sales', () => {
    // Start below the forced-sale floor; a big home gate lifts above it so no sale.
    const squad = Array.from({ length: SQUAD_MIN + 2 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 100, contractWeeks: 30 }));
    setup({
      money: -55_000, reputation: 50, squad,
      facilities: [pf('grandstand', 3)],
      league: { clubs: [], fixtures: [{ round: 1, homeId: 'player', awayId: 'r' }], ladder: [] },
      week: 1,
    });
    applyEconomy(getState());
    // gate = 1,800 × $18 = $32,400 (rep 50; the L3 stand is not needed), wages small, income = rep grant.
    // Net well above the floor → no forced sales.
    expect(getState().squad.length).toBe(SQUAD_MIN + 2);
    expect(getState().money).toBeGreaterThan(ECON.FORCED_SALE_FLOOR);
  });

  it('wages push money negative (below zero allowed) and trigger a warning', () => {
    let warned = false;
    bus.on('bankruptcy:warning', () => { warned = true; });
    setup({
      money: 1000, reputation: 0,
      squad: [mkPlayer({ wage: 5000, contractWeeks: 30 })],
      facilities: [],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    applyEconomy(getState());
    expect(getState().money).toBe(1000 - 5000 - ECON.OVERHEAD_WEEKLY + 0); // -5500
    expect(warned).toBe(true);
  });

  it('order is fixed: wages → upkeep → running costs → income → gate → contracts → bankruptcy (terminates)', () => {
    const squad = Array.from({ length: SQUAD_MIN + 1 }, (_, i) => mkPlayer({ id: `s${i}`, wage: 200000, contractWeeks: 30 }));
    setup({
      money: 0, reputation: 0, squad, facilities: [],
      league: { clubs: [], fixtures: [], ladder: [] },
    });
    // enormous wages drive deep below floor → forced sales down to SQUAD_MIN.
    expect(() => applyEconomy(getState())).not.toThrow();
    expect(getState().squad.length).toBe(SQUAD_MIN);
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
    expect(books.wages).toBe(-1000);
    expect(books.upkeep).toBe(-100);
    expect(books.overhead).toBe(-ECON.OVERHEAD_WEEKLY);
    expect(books.sponsor).toBe(3000);
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
    // wages -3000 ; running costs -1500 ; income 40×20 = +800 → 96300
    expect(getState().money).toBe(100_000 - 3000 - ECON.OVERHEAD_WEEKLY + 20 * ECON.REP_GRANT_PER_POINT);
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
    expect(getState().money).toBe(100_000 - 3000 - ECON.OVERHEAD_WEEKLY + 20 * ECON.REP_GRANT_PER_POINT); // single application
  });
});

describe('legacy duplicate facilities', () => {
  it('counts only the best Sponsor Board, not a sum', () => {
    setup({ facilities: [
      { id: 'a', defId: 'sponsorBoard', level: 1, x: 0, y: 0 },
      { id: 'b', defId: 'sponsorBoard', level: 2, x: 5, y: 5 },
    ], reputation: 0 });
    expect(weeklyIncome(getState())).toBe(ECON.SPONSOR_PER_LEVEL * 2);
  });
});
