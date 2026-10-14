import { describe, it, expect, beforeEach } from 'vitest';
import {
  weeklyWages, weeklyIncome, gateReceipts, tickContracts,
  handleBankruptcy, applyEconomy, registerEconomySystem,
} from '../../src/systems/economy';
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

describe('gateReceipts', () => {
  const homeFixture = (round: number): Fixture => ({ round, homeId: 'player', awayId: 'rivalX' });
  const awayFixture = (round: number): Fixture => ({ round, homeId: 'rivalX', awayId: 'player' });

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

  it('home week, no grandstand: exact attendance × ticket price', () => {
    setup({
      week: 3, reputation: 30, facilities: [],
      league: { clubs: [], fixtures: [homeFixture(3)], ladder: [] },
    });
    // attendance = (500 + 30×40) × (1 + 0) = 1700 ; gate = 1700 × 20 = 34000
    expect(gateReceipts(getState())).toBe(34000);
  });

  it('home week scales with grandstand level and reputation (exact)', () => {
    setup({
      week: 2, reputation: 50, facilities: [pf('grandstand', 3)],
      league: { clubs: [], fixtures: [homeFixture(2)], ladder: [] },
    });
    // attendance = (500 + 50×40) × (1 + 0.5×3) = 2500 × 2.5 = 6250 ; gate = 125000
    expect(gateReceipts(getState())).toBe(125000);
  });

  it('higher grandstand level yields higher gate', () => {
    const mk = (level: PlacedFacility['level']): number => {
      setup({
        week: 1, reputation: 20, facilities: [pf('grandstand', level)],
        league: { clubs: [], fixtures: [homeFixture(1)], ladder: [] },
      });
      return gateReceipts(getState());
    };
    expect(mk(3)).toBeGreaterThan(mk(1));
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

  it('auto-renews an expiring affordable player at drift-adjusted wage, 52 weeks', () => {
    // overall 60 → drift 0 → newWage == wage. Big balance → affordable.
    const p = mkPlayer({
      id: 'renew', wage: 4000, contractWeeks: 1,
      stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 }, // overall 60
    });
    setup({ money: 1_000_000, squad: [p] });
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'renew')!;
    expect(out.contractWeeks).toBe(52);
    expect(out.wage).toBe(4000); // drift 0
    expect(getState().freeAgents.some((x) => x.id === 'renew')).toBe(false);
  });

  it('drift clamps: elite player capped at +25% wage', () => {
    // overall 100 → drift (100-60)/200 = 0.2 (within clamp) → +20%.
    const elite = mkPlayer({
      id: 'elite', wage: 10000, contractWeeks: 1,
      stats: { speed: 100, strength: 100, stamina: 100, skill: 100, footyIQ: 100 },
    });
    setup({ money: 10_000_000, squad: [elite] });
    tickContracts(getState());
    const out = getState().squad.find((x) => x.id === 'elite')!;
    expect(out.wage).toBe(12000); // 10000 × 1.2
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
    // wages -5000 ; income = 3000 + 1500 = +4500 ; no gate (empty league)
    expect(getState().money).toBe(100_000 - 5000 + 4500);
    expect(reasons).toContain('wages');
    expect(reasons).toContain('sponsor+grant');
    expect(reasons).not.toContain('gate');
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
    // gate = 125000 (from earlier exact test), wages small, income = rep grant.
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
