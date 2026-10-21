import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame, emptyFinance, getState, loadState, type Player } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { applyBoardReview } from '../../src/systems/board';
import { bus } from '../../src/core/events';
import { registerFinanceSystem, tickContracts } from '../../src/systems/economy';
import { BOARD_LOAN, boardLoanRoom, clubWageFactor, repayBoardLoan, renewEarly, renewsOnLoan, renewalFee, renewalWage, renewalWeeklyCost, sellPlayer, transferFee, marketWage } from '../../src/systems/contracts';
import { marketWage as playerMarketWage, wageForOverall } from '../../src/data/player';
import { BOARD, CONTRACTS } from '../../src/config';
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
    loadState({ ...getState(), boardLoan: { owed: BOARD.LOAN_CAP } }); // the board has no room left
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
  it('refuses when broke and the board has no room left', () => {
    setup([mk('a')], 10);
    loadState({ ...getState(), boardLoan: { owed: BOARD.LOAN_CAP } });
    expect(renewEarly(getState(), 'a')).toEqual({ ok: false, reason: 'insufficient-funds' });
    expect(getState().money).toBe(10);
  });
});

// N14.3: a renewal in debt goes on a board loan, repaid at the rollover.
describe('the board loan', () => {
  it('an early renewal the club can\'t afford is advanced by the board: the fee is owed, the balance unchanged', () => {
    setup([mk('a')], -20_000);
    const fee = renewalFee(getState(), getState().squad[0]!);
    expect(renewsOnLoan(getState(), getState().squad[0]!)).toBe(true);
    const reasons: string[] = [];
    bus.on('money:changed', (m) => reasons.push(m.reason));
    expect(renewEarly(getState(), 'a')).toEqual({ ok: true });
    expect(getState().money).toBe(-20_000); // the loan in, the fee out
    expect(getState().boardLoan.owed).toBe(fee);
    expect(reasons).toEqual([BOARD_LOAN, 'renew:a']);
    expect(getState().squad[0]!.contractWeeks).toBe(CONTRACTS.NEW_CONTRACT_WEEKS);
  });

  it('a club that can pay does not borrow', () => {
    setup([mk('a')]);
    expect(renewsOnLoan(getState(), getState().squad[0]!)).toBe(false);
    renewEarly(getState(), 'a');
    expect(getState().boardLoan.owed).toBe(0);
  });

  it('an expiring contract in debt renews on a loan of the four weeks\' wage', () => {
    setup([mk('a', { contractWeeks: 1 }), mk('b')], -5_000);
    const ask = renewalWage(getState().squad[0]!, getState());
    tickContracts(getState());
    expect(getState().squad.find((p) => p.id === 'a')!.contractWeeks).toBe(52);
    expect(getState().boardLoan.owed).toBe(ask * 4);
    expect(getState().money).toBe(-5_000 + ask * 4);
  });

  it('never past the cap, and repaid in full on the board\'s line', () => {
    setup([mk('a')], -1_000_000);
    loadState({ ...getState(), boardLoan: { owed: BOARD.LOAN_CAP - 1 } });
    expect(boardLoanRoom(getState())).toBe(1);
    expect(renewEarly(getState(), 'a').ok).toBe(false);
    const before = getState().money;
    expect(repayBoardLoan()).toBe(BOARD.LOAN_CAP - 1);
    expect(getState().money).toBe(before - (BOARD.LOAN_CAP - 1));
    expect(getState().boardLoan.owed).toBe(0);
    expect(repayBoardLoan()).toBe(0);
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

// The tsconfig has no Node types: the save is read with Vite's JSON import.
const v17MidSeason = Object.values(import.meta.glob('../fixtures/saves/v17-mid-season.json', { eager: true, import: 'default' }))[0];

describe('the board loan at the rollover and in old saves (N14.3)', () => {
  it('the board review repays it after the grant, and the season\'s books still sum', () => {
    setup([mk('a')], -30_000);
    loadState({ ...getState(), season: 2, week: 1, finance: [emptyFinance(1), emptyFinance(2)], boardLoan: { owed: 12_000 } });
    const off = registerFinanceSystem();
    applyBoardReview({ ladderPosition: 1, positions: { player: 1 }, finalsPlayed: 0, playedGrandFinal: false, premiership: false });
    off();
    expect(getState().boardLoan.owed).toBe(0);
    // The repayment closes the season just played, with the grant, on the board's line.
    const closed = getState().finance.find((f) => f.season === 1)!;
    expect(closed.boardGrant).toBe(getState().money - -30_000 - closed.prize);
  });

  it('a v17 save owes the board nothing', () => {
    const raw = structuredClone(v17MidSeason) as Record<string, unknown>;
    expect(raw.version).toBe(17);
    expect(raw.boardLoan).toBeUndefined();
    const res = migrateState(raw);
    expect(res.ok && res.state.boardLoan).toEqual({ owed: 0 });
  });
});
