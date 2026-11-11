import { describe, expect, it } from 'vitest';
import { annualCapQuote, annualSalaryQuote, capUpgradePrice, matchCashQuote, openingSalaryOffers, releasePayoutQuote, saleOfferQuote, signingFeeQuote } from '../../src/data/financeRules';

describe('finance prototype quotes', () => {
  it('keeps a losing league season viable without an optional event', () => {
    const home = matchCashQuote({ matchBase: 8_000, kind: 'played', venue: 'home', result: 'loss' });
    const away = matchCashQuote({ matchBase: 8_000, kind: 'played', venue: 'away', result: 'loss' });
    expect(home.total).toBe(12_000); expect(away.total).toBe(8_000);
    expect(7 * home.total + 7 * away.total).toBe(140_000);
  });
  it('adds modest performance cash and shares a neutral gate equally', () => {
    expect(matchCashQuote({ matchBase: 8_000, kind: 'played', venue: 'home', result: 'win' }))
      .toEqual({ base: 8_000, home: 4_000, performance: 800, sponsor: 0, total: 12_800 });
    expect(matchCashQuote({ matchBase: 8_000, kind: 'played', venue: 'neutral', result: 'draw' }).total).toBe(10_400);
  });
  it.each(['home', 'away', 'neutral'] as const)('never pays trial facility/score bonuses at %s', venue => {
    expect(matchCashQuote({ matchBase: 8_000, kind: 'trial', venue, result: 'win', sponsorLevel: 3, grandstandLevel: 3 }))
      .toEqual({ base: 2_000, home: 0, performance: 0, sponsor: 0, total: 2_000 });
  });
  it('never fabricates an ordinary receipt for a bye, forfeit or cancellation', () => {
    expect(matchCashQuote({ matchBase: 8_000, kind: 'unplayed', venue: 'home', result: 'win', sponsorLevel: 3, grandstandLevel: 3 }))
      .toEqual({ base: 0, home: 0, performance: 0, sponsor: 0, total: 0 });
  });
  it('rewards a home investment without creating an away or neutral stand', () => {
    const common = { matchBase: 8_000, kind: 'played' as const, result: 'loss' as const, sponsorLevel: 3 as const, grandstandLevel: 3 as const };
    expect(matchCashQuote({ ...common, venue: 'home' }).total).toBe(20_640);
    expect(matchCashQuote({ ...common, venue: 'away' }).total).toBe(9_440);
    expect(matchCashQuote({ ...common, venue: 'neutral' }).total).toBe(11_440);
  });
  it('composes purchased and earned allowances against the same tier base', () => {
    expect(annualCapQuote('local', 1, 500)).toBe(385_000);
    expect(annualCapQuote('local', 3, 500)).toBe(420_000);
    expect(annualCapQuote('local', 3, 1_000)).toBe(437_500);
    expect(annualCapQuote('premier', 3, 1_000)).toBe(750_000);
    expect(annualCapQuote('championship', 0)).toBe(450_000);
  });
  it('has no fourth purchasable level and prices the current tier', () => {
    expect([0, 1, 2, 3].map(n => capUpgradePrice('local', n as 0 | 1 | 2 | 3))).toEqual([40_000, 80_000, 160_000, null]);
    expect(capUpgradePrice('premier', 2)).toBe(360_000);
  });
  it('prices ability strongly and age/potential modestly in fixed annual units', () => {
    expect(annualSalaryQuote(40, 25)).toBe(14_000);
    expect(annualSalaryQuote(70, 25)).toBe(32_000);
    expect(annualSalaryQuote(90, 25)).toBe(78_000);
    expect(annualSalaryQuote(40, 18, 100)).toBe(15_000);
    expect(annualSalaryQuote(40, 36)).toBe(13_300);
    expect(annualSalaryQuote(70, 25, 0, true)).toBe(31_000);
  });
  it('keeps a signed salary separate from market demand', () => {
    const salaryAtSigning = annualSalaryQuote(40, 18, 20);
    const newDemand = annualSalaryQuote(70, 21, 20);
    expect(salaryAtSigning).toBe(14_600); expect(newDemand).toBe(33_300);
    expect(signingFeeQuote(newDemand, false)).toBe(33_300);
    expect(releasePayoutQuote(salaryAtSigning, 2)).toBe(7_300);
  });
  it('does not make signing then immediately selling a profitable cash loop', () => {
    expect(saleOfferQuote(32_000)).toBe(19_200);
    for (const scout of [0, 1, 2, 3] as const)
      expect(signingFeeQuote(32_000, false, scout)).toBeGreaterThan(saleOfferQuote(32_000));
    // Academy graduates can earn a feeder-club return, from the finite annual
    // intake. The Academy discount ends when that player is first signed.
    expect(signingFeeQuote(32_000, true)).toBe(8_000);
  });
  it('charges release against the remaining promise and handles expiry', () => {
    expect(releasePayoutQuote(40_000, 3)).toBe(30_000);
    expect(releasePayoutQuote(40_000, 0.5)).toBe(5_000);
    expect(releasePayoutQuote(40_000, 0)).toBe(0);
  });
  it('admits only bounded fresh-world offers and never edits the quoted roster', () => {
    const demands = [20_000, 20_000];
    expect(openingSalaryOffers(demands, 40_000)).toEqual(demands);
    expect(openingSalaryOffers(demands, 39_000)).toEqual([19_500, 19_500]);
    expect(openingSalaryOffers(demands, 37_900)).toBeNull();
    expect(openingSalaryOffers([100], 95)).toEqual([95]);
    expect(openingSalaryOffers([100], 94)).toBeNull();
    expect(demands).toEqual([20_000, 20_000]);
  });
  it('rejects corrupt/unbounded entitlements and money instead of quoting NaN or excess cap', () => {
    expect(() => annualCapQuote('local', 4 as 3)).toThrow();
    expect(() => annualCapQuote('local', 1, 1_500)).toThrow();
    expect(() => annualCapQuote('local', 1, 1)).toThrow();
    expect(() => annualSalaryQuote(NaN, 20)).toThrow();
    expect(() => signingFeeQuote(-1, false)).toThrow();
    expect(() => releasePayoutQuote(1, Infinity)).toThrow();
    expect(() => matchCashQuote({ matchBase: Infinity, kind: 'played', venue: 'home', result: 'win' })).toThrow();
  });
});
