import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame, getState, loadState, type Player } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { tickContracts } from '../../src/systems/economy';
import { clubWageFactor, renewEarly, renewalFee, renewalWage, renewalWeeklyCost, sellPlayer, transferFee, marketWage } from '../../src/systems/contracts';
import { marketWage as playerMarketWage, wageForOverall } from '../../src/data/player';
import { CONTRACTS } from '../../src/config';
import { marketWage as rivalMarketWage } from '../../src/systems/rivals';
import { refreshFreeAgents } from '../../src/systems/freeagency';
import { makeRng } from '../../src/utils/rng';
import { overallRating } from '../../src/data/player';
import { SQUAD_MIN } from '../../src/config';

const mk = (id: string, over: Partial<Player> = {}): Player => ({
  id, name: id, age: 25, position: 'lock',
  stats: { speed: 60, strength: 60, stamina: 60, skill: 60, footyIQ: 60 },
  morale: 50, injuryRisk: 10, injuredWeeks: 0, traits: [], wage: 5000, contractWeeks: 20, ...over,
});

function setup(squad: Player[], money = 1_000_000): void {
  createNewGame('T', 1);
  loadState({ ...getState(), squad, money, freeAgents: [] });
}

beforeEach(() => bus.clear());

describe('expiry warnings', () => {
  it('fires exactly once at 8, 4 and 1 weeks', () => {
    setup([mk('a', { contractWeeks: 10 })]);
    const msgs: string[] = [];
    bus.on('ui:notify', (n) => msgs.push(n.text));
    for (let i = 0; i < 9; i++) tickContracts(getState()); // 10 → 1
    expect(msgs).toHaveLength(3);
    expect(msgs[0]).toContain('8 weeks');
    expect(msgs[1]).toContain('4 weeks');
    expect(msgs[2]).toContain('1 week.');
  });
});

describe('departures', () => {
  it('expired players stay in the pool through a re-roll', () => {
    setup([mk('a', { contractWeeks: 1 }), mk('b')], 0);
    tickContracts(getState());
    expect(getState().freeAgents.map((p) => p.id)).toContain('a');
    refreshFreeAgents(getState(), makeRng(5));
    expect(getState().freeAgents.map((p) => p.id)).toContain('a');
  });
});

describe('marketWage', () => {
  it('is one formula, owned by data/player.ts and re-exported by contracts and rivals (#146)', () => {
    const p = mk('w');
    expect(marketWage).toBe(playerMarketWage);
    expect(rivalMarketWage).toBe(playerMarketWage);
    expect(marketWage(p)).toBe(wageForOverall(overallRating(p)));
  });
});

describe('renewal asks track the club (N6, #167)', () => {
  const NEW_CLUB = { reputation: 30, season: 1 };
  it('a new club at the baseline reputation pays the market wage at neutral morale', () => {
    expect(clubWageFactor(NEW_CLUB)).toBe(1);
    expect(clubWageFactor({ reputation: 10, season: 1 })).toBe(1);
    expect(renewalWage(mk('a'), NEW_CLUB)).toBe(marketWage(mk('a')));
  });
  it('reputation adds up to RENEW_REP_PREMIUM at 100', () => {
    expect(clubWageFactor({ reputation: 100, season: 1 })).toBeCloseTo(1 + CONTRACTS.RENEW_REP_PREMIUM, 6);
    expect(clubWageFactor({ reputation: 65, season: 1 })).toBeCloseTo(1 + CONTRACTS.RENEW_REP_PREMIUM / 2, 6);
  });
  it('every season after the first adds RENEW_SEASON_INFLATION', () => {
    expect(clubWageFactor({ reputation: 30, season: 5 })).toBeCloseTo(1 + 4 * CONTRACTS.RENEW_SEASON_INFLATION, 6);
    expect(clubWageFactor({ reputation: 100, season: 5 })).toBeCloseTo((1 + CONTRACTS.RENEW_REP_PREMIUM) * (1 + 4 * CONTRACTS.RENEW_SEASON_INFLATION), 6);
  });
  it('the ask, the weekly cost and an early renewal all use the club factor', () => {
    const p = mk('a');
    setup([p]);
    loadState({ ...getState(), reputation: 100, season: 3 });
    const factor = clubWageFactor(getState());
    expect(renewalWage(p, getState())).toBe(Math.round(marketWage(p) * factor));
    expect(renewalWeeklyCost(getState(), p)).toBe(renewalWage(p, getState()));
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().squad[0]!.wage).toBe(Math.round(marketWage(p) * factor));
  });
});

describe('early renewal', () => {
  it('charges 2 × new weekly wage and sets 52 weeks', () => {
    setup([mk('a')]);
    const p = getState().squad[0];
    const wage = renewalWage(p, getState());
    expect(wage).toBe(marketWage(p)); // neutral morale, a new club at the baseline reputation
    expect(renewalFee(getState(), p)).toBe(2 * wage);
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().money).toBe(1_000_000 - 2 * wage);
    expect(getState().squad[0]).toMatchObject({ wage, contractWeeks: 52 });
  });
  it('unhappy players ask more; difficulty scales the fee', () => {
    setup([mk('a', { morale: 1 }), mk('b', { morale: 100 })]);
    const [a, b] = getState().squad;
    expect(renewalWage(a, getState())).toBeGreaterThan(renewalWage(b, getState()));
    const normal = renewalFee(getState(), a);
    loadState({ ...getState(), settings: { ...getState().settings, difficulty: 'hard' } });
    expect(renewalFee(getState(), a)).toBeGreaterThan(normal);
  });
  it('refuses when broke', () => {
    setup([mk('a')], 10);
    expect(renewEarly(getState(), 'a')).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(getState().money).toBe(10);
  });
});

describe('selling', () => {
  it('pays the fee and removes the player', () => {
    const squad = Array.from({ length: SQUAD_MIN + 1 }, (_, i) => mk(`p${i}`));
    setup(squad, 0);
    const fee = transferFee(squad[0]);
    expect(fee).toBe(overallRating(squad[0]) ** 2 * 10);
    expect(sellPlayer(getState(), 'p0').ok).toBe(true);
    expect(getState().money).toBe(fee);
    expect(getState().squad.find((p) => p.id === 'p0')).toBeUndefined();
  });
  it('young high-rated players fetch more than old ones', () => {
    expect(transferFee(mk('y', { age: 20 }))).toBeGreaterThan(transferFee(mk('o', { age: 34 })));
  });
  it('refuses at squad minimum', () => {
    setup(Array.from({ length: SQUAD_MIN }, (_, i) => mk(`p${i}`)), 0);
    expect(sellPlayer(getState(), 'p0')).toEqual({ ok: false, reason: 'squad-min' });
  });
});
