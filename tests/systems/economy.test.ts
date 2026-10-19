import { describe, it, expect, beforeEach } from 'vitest';
import {
  weeklyWages, weeklyUpkeep, weeklyIncome, gateReceipts, homeGate, recentForm, tickContracts,
  handleBankruptcy, applyEconomy, registerEconomySystem,
} from '../../src/systems/economy';
import { FACILITY_CATALOG, facilityUpkeep } from '../../src/data/facility';
import { renewalWage } from '../../src/systems/contracts';
import {
  createNewGame, getState, loadState,
  type Player, type PlacedFacility, type GameState, type Fixture,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { ECON, SQUAD_MIN } from '../../src/config';
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

describe('weeklyIncome', () => {
  it('rep grant only when no sponsor board', () => {
    setup({ reputation: 30, facilities: [] });
    // 50 × 30 = 1500
    expect(weeklyIncome(getState())).toBe(1500);
  });
  it('sponsor board adds 3000 × level', () => {
    setup({ reputation: 30, facilities: [pf('sponsorBoard', 2)] });
    // 3000×2 + 50×30 = 6000 + 1500 = 7500
    expect(weeklyIncome(getState())).toBe(7500);
  });
  it('sponsor income is 0 without a board (only rep grant)', () => {
    setup({ reputation: 10, facilities: [pf('grandstand', 3)] });
    // grandstand is not a sponsor board → sponsor part 0; 50×10 = 500
    expect(weeklyIncome(getState())).toBe(500);
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
    // demand = 300 + 30×30 = 1,200 (under the hill's 2,000) ; gate = 1,200 × 20 = 24,000
    expect(gateReceipts(getState())).toBe(24_000);
    const g = homeGate(getState(), homeFixture(3));
    expect(g).toEqual({ capacity: 2000, demand: 1200, attendance: 1200, receipts: 24_000, soldOut: false });
  });

  it('the hill holds 2,000: a famous club sells out, and a Grandstand lifts the roof', () => {
    const at = (facilities: PlacedFacility[]): ReturnType<typeof homeGate> => {
      setup({ week: 3, reputation: 100, facilities, league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] } });
      return homeGate(getState(), homeFixture(3));
    };
    // demand = 300 + 100×30 = 3,300
    expect(at([])).toEqual({ capacity: 2000, demand: 3300, attendance: 2000, receipts: 40_000, soldOut: true });
    expect(at([pf('grandstand', 1)])).toEqual({ capacity: 3500, demand: 3300, attendance: 3300, receipts: 66_000, soldOut: false });
    expect(at([pf('grandstand', 2)]).capacity).toBe(5000);
    expect(at([pf('grandstand', 3)]).capacity).toBe(6500);
    expect(gateReceipts(getState())).toBe(66_000);
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
    expect(gateReceipts(getState())).toBe(36_000);
    // A famous club's home final overflows the hill: the roof is why a finals side wants a stand.
    setup({ week: 25, reputation: 60, facilities: [], league: { clubs: [], fixtures: [homeFixture(25)], ladder: [] } });
    expect(homeGate(getState(), homeFixture(25))).toEqual({ capacity: 2000, demand: 3150, attendance: 2000, receipts: 40_000, soldOut: true });
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
    // overall 100 → $5,650 on the curve; reputation 100 in season 3 → ×1.25 × 1.06.
    const elite = mkPlayer({
      id: 'elite', wage: 10000, morale: 50, contractWeeks: 1,
      stats: { speed: 100, strength: 100, stamina: 100, skill: 100, footyIQ: 100 },
    });
    setup({ money: 10_000_000, reputation: 100, season: 3, squad: [elite] });
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'elite')!;
    expect(out.wage).toBe(Math.round(5650 * 1.25 * 1.06));
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
    expect(warned).toEqual({ balance: -1000 });
    expect(danger).toBe(true);
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
    setup({ money: -60_000, squad: [cheap, pricey, ...filler] });
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
    setup({ money: -60_000, squad: [pricey, lowMorale, ...filler] });
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
    // wages -5000 ; upkeep -100 (Sponsor Board L1) ; income = 3000 + 1500 = +4500 ; no gate (empty league)
    expect(getState().money).toBe(100_000 - 5000 - 100 + 4500);
    expect(reasons).toEqual(['wages', 'upkeep', 'sponsor+grant']);
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
    expect(seen).toEqual([{ delta: -(2400 + 120), reason: 'upkeep' }]);
    expect(getState().money).toBe(50_000 - 2520);

    seen.length = 0;
    setup({ money: 50_000, reputation: 0, squad: [], facilities: [], league: { clubs: [], fixtures: [], ladder: [] } });
    applyEconomy(getState());
    expect(seen).toEqual([]);
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
    // gate = 1,800 × $20 = $36,000 (rep 50; the L3 stand is not needed), wages small, income = rep grant.
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
    expect(getState().money).toBe(1000 - 5000 + 0); // -4000
    expect(warned).toBe(true);
  });

  it('order is fixed: wages → income → gate → contracts → bankruptcy (terminates)', () => {
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
    // wages -3000 ; income 50×20 = +1000 → 98000
    expect(getState().money).toBe(100_000 - 3000 + 1000);
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
    expect(getState().money).toBe(100_000 - 3000 + 1000); // single application
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
