import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame, emptyFinance, getState, loadState, type Player } from '../../src/core/state';
import { migrateState } from '../../src/core/save';
import { applyBoardReview } from '../../src/systems/board';
import { bus } from '../../src/core/events';
import { registerFinanceSystem, tickContracts } from '../../src/systems/economy';
import { boardLoanRoom, takeBoardLoan, clubWageFactor, repayBoardLoan, renewEarly, renewsOnLoan, renewalFee, renewalWage, renewalWeeklyCost, sellPlayer, transferFee, marketWage } from '../../src/systems/contracts';
import { marketWage as playerMarketWage, wageForOverall } from '../../src/data/player';
import { BOARD, CONTRACTS } from '../../src/config';
import { marketWage as rivalMarketWage } from '../../src/systems/rivals';
import { overallRating } from '../../src/data/player';
import { SQUAD_MIN } from '../../src/config';

const mk = (id: string, over: Partial<Player> = {}): Player => ({
  id, name: id, age: 25, position: 'lock',
  ceilings: { speed: 100, strength: 100, stamina: 100, handling: 100, kicking: 100, footyIQ: 100 },
  stats: { speed: 60, strength: 60, stamina: 60, handling: 60, kicking: 60, footyIQ: 60 },
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
  it('a week hitting zero does not release the player or borrow', () => {
    setup([mk('a', { contractWeeks: 1 }), mk('b')], 0);
    tickContracts(getState());
    expect(getState().squad.map(p => p.id)).toContain('a');
    expect(getState().squad.find(p => p.id === 'a')!.contractWeeks).toBe(0);
    expect(getState().money).toBe(0);
    expect(getState().boardLoan.owed).toBe(0);
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
  it('the old weekly ask still uses the club factor; a queued renewal does not', () => {
    const p = mk('a', { deal: { salary: 20_000, startSeason: 1, endSeason: 2 } });
    setup([p]);
    loadState({ ...getState(), reputation: 100, season: 3, squad: [{ ...p, deal: { salary: 20_000, startSeason: 1, endSeason: 3 } }] });
    const factor = clubWageFactor(getState());
    const held = getState().squad[0]!;
    expect(renewalWage(held, getState())).toBe(Math.round(marketWage(held) * factor));
    expect(renewalWeeklyCost(getState(), held)).toBe(renewalWage(held, getState()));
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().squad[0]!.wage).toBe(held.wage);
    expect(getState().squad[0]!.deal!.salary).toBe(20_000);
    expect(getState().money).toBe(1_000_000);
  });
});

describe('early renewal', () => {
  it('queues the next season at the ability ask, leaves this deal and the weeks, and charges nothing', () => {
    const deal = { salary: 20_000, startSeason: 1, endSeason: 1 };
    setup([mk('a', { deal, contractWeeks: 40 })]);
    const before = getState();
    const p = before.squad[0]!;
    expect(renewalFee(before, p)).toBe(2 * renewalWeeklyCost(before, p));
    expect(renewEarly(before, 'a').ok).toBe(true);
    const queued = getState().squad[0]!;
    expect(getState().money).toBe(before.money);
    expect(queued.wage).toBe(p.wage);
    expect(queued.contractWeeks).toBe(40);
    expect(queued.deal!.salary).toBe(20_000);
    expect(queued.deal!.renewal).toMatchObject({ startSeason: 2, endSeason: 2 });
    expect(queued.deal!.renewal!.salary).not.toBe(0);
    const again = renewEarly(getState(), 'a');
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('already-renewed');
    expect(getState().money).toBe(before.money);
    expect(getState().squad[0]!.deal).toEqual(queued.deal);
    expect(getState().squad[0]!.contractWeeks).toBe(40);
  });
  it('does not warn that a queued renewal is expiring, and does not reset the weeks to 52', () => {
    setup([mk('a', { contractWeeks: 10, deal: { salary: 20_000, startSeason: 1, endSeason: 1 } })]);
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().squad[0]!.contractWeeks).toBe(10);
    const msgs: string[] = [];
    bus.on('ui:notify', (n) => msgs.push(n.text));
    for (let i = 0; i < 9; i++) tickContracts(getState());
    expect(msgs.filter((text) => text.includes('expires'))).toEqual([]);
    expect(getState().squad[0]!.contractWeeks).toBe(1);
  });
  it('unhappy players ask more on the old weekly formula; difficulty scales that fee only', () => {
    setup([mk('a', { morale: 1 }), mk('b', { morale: 100 })]);
    const [a, b] = getState().squad;
    expect(renewalWage(a, getState())).toBeGreaterThan(renewalWage(b, getState()));
    const normal = renewalFee(getState(), a);
    loadState({ ...getState(), settings: { ...getState().settings, difficulty: 'hard' } });
    expect(renewalFee(getState(), a)).toBeGreaterThan(normal);
  });
  it('a broke club still queues the renewal and does not borrow', () => {
    setup([mk('a', { deal: { salary: 20_000, startSeason: 1, endSeason: 1 } })], 10);
    loadState({ ...getState(), boardLoan: { owed: BOARD.LOAN_CAP } });
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().money).toBe(10);
    expect(getState().boardLoan.owed).toBe(BOARD.LOAN_CAP);
    expect(getState().squad[0]!.contractWeeks).toBe(20);
  });
});

describe('the board loan', () => {
  it('a renewal the club cannot pay is still free, and does not borrow', () => {
    setup([mk('a', { deal: { salary: 20_000, startSeason: 1, endSeason: 1 } })], -20_000);
    expect(takeBoardLoan(5_000)).toBe(false);
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().money).toBe(-20_000);
    expect(getState().boardLoan.owed).toBe(0);
    expect(getState().squad[0]!.contractWeeks).toBe(20);
  });

  it('a club that can pay does not borrow', () => {
    setup([mk('a')]);
    expect(renewsOnLoan(getState(), getState().squad[0]!)).toBe(false);
    renewEarly(getState(), 'a');
    expect(getState().boardLoan.owed).toBe(0);
  });

  it('an expiring week in debt does not renew or borrow', () => {
    setup([mk('a', { contractWeeks: 1 }), mk('b')], -5_000);
    tickContracts(getState());
    expect(getState().squad.find((p) => p.id === 'a')!.contractWeeks).toBe(0);
    expect(getState().boardLoan.owed).toBe(0);
    expect(getState().money).toBe(-5_000);
  });

  it('never past the cap, and repaid in full on the board\'s line', () => {
    setup([mk('a')], -1_000_000);
    loadState({ ...getState(), boardLoan: { owed: BOARD.LOAN_CAP - 1 } });
    expect(boardLoanRoom(getState())).toBe(1);
    expect(renewEarly(getState(), 'a').ok).toBe(true);
    expect(getState().boardLoan.owed).toBe(BOARD.LOAN_CAP - 1);
    const before = getState().money;
    expect(repayBoardLoan()).toBe(BOARD.LOAN_CAP - 1);
    expect(getState().money).toBe(before - (BOARD.LOAN_CAP - 1));
    expect(getState().boardLoan.owed).toBe(0);
    expect(repayBoardLoan()).toBe(0);
  });
});

describe('selling', () => {
  it('refuses, because there is no buyer, and changes nothing', () => {
    const squad = Array.from({ length: SQUAD_MIN + 1 }, (_, i) => mk(`p${i}`));
    setup(squad, 0);
    const fee = transferFee(squad[0]);
    expect(fee).toBe(overallRating(squad[0]) ** 2 * 10);
    const res = sellPlayer(getState(), 'p0');
    expect(res).toMatchObject({ ok: false, reason: 'no-buyer' });
    expect(getState().money).toBe(0);
    expect(getState().squad.find((p) => p.id === 'p0')).toBeDefined();
  });
  it('young high-rated players fetch more than old ones', () => {
    expect(transferFee(mk('y', { age: 20 }))).toBeGreaterThan(transferFee(mk('o', { age: 34 })));
  });
  it('refuses at squad minimum without removing anyone', () => {
    setup(Array.from({ length: SQUAD_MIN }, (_, i) => mk(`p${i}`)), 0);
    expect(sellPlayer(getState(), 'p0')).toMatchObject({ ok: false, reason: 'no-buyer' });
    expect(getState().squad).toHaveLength(SQUAD_MIN);
    expect(getState().money).toBe(0);
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

  it('the board judges solvency after the loan is repaid', () => {
    setup([mk('a')], 30_000);
    loadState({
      ...getState(), season: 2, week: 1, finance: [emptyFinance(1), emptyFinance(2)], boardLoan: { owed: 40_000 },
      objectives: [{ id: 's1-solvent', kind: 'solvent', text: 'Finish solvent', target: 0, status: 'pending' }],
    });
    const review = applyBoardReview({ ladderPosition: 1, positions: { player: 1 }, finalsPlayed: 0, playedGrandFinal: false, premiership: false });
    // $30k in hand, $40k of it borrowed: −$10k after the repayment, so not solvent.
    expect(review.missed).toBe(1);
  });

  it('a loan taken in week 1 is that season\'s, not the one before', () => {
    setup([mk('a')], -10_000);
    loadState({ ...getState(), season: 2, week: 1, finance: [emptyFinance(1), emptyFinance(2)] });
    const off = registerFinanceSystem();
    expect(takeBoardLoan(5_000)).toBe(false);
    off();
    expect(getState().money).toBe(-10_000);
    expect(getState().boardLoan.owed).toBe(0);
    expect(getState().finance.find((f) => f.season === 2)!.boardGrant).toBe(0);
    expect(getState().finance.find((f) => f.season === 1)!.boardGrant).toBe(0);
  });

  it('a v17 save requires a new career', () => {
    const raw = structuredClone(v17MidSeason) as Record<string, unknown>;
    expect(raw.version).toBe(17);
    expect(raw.boardLoan).toBeUndefined();
    const res = migrateState(raw);
    expect(res).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
  });
});
