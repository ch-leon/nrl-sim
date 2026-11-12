import { afterEach, describe, expect, it, vi } from 'vitest';
import { fmtMoney, fmtMoneyShort } from '../../src/utils/money';
import { objectiveLine } from '../../src/systems/board';
import { EXPANSION_COPY } from '../../src/ui/expansionCopy';
import { placementBarModel } from '../../src/ui/placementBar';
import { createNewGame, getState, type Objective } from '../../src/core/state';
import type { PlacementAim } from '../../src/world/placement';

afterEach(() => vi.restoreAllMocks());

/** A device set to German: a number grouped with no locale named comes out "45.000". */
function germanDevice(): void {
  const real = Number.prototype.toLocaleString;
  vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number, locales?: Intl.LocalesArgument) {
    return real.call(this, locales ?? 'de-DE');
  });
}

describe('fmtMoney (#615)', () => {
  it('whole dollars, thousands-separated', () => {
    expect([0, 1, 999, 1_000, 1_234, 45_000, 200_000, 1_000_000, 1_234_567].map(fmtMoney))
      .toEqual(['$0', '$1', '$999', '$1,000', '$1,234', '$45,000', '$200,000', '$1,000,000', '$1,234,567']);
  });

  it('the minus goes before the dollar', () => {
    expect([-1, -50, -8_946, -45_000, -100_000, -2_500_000].map(fmtMoney))
      .toEqual(['-$1', '-$50', '-$8,946', '-$45,000', '-$100,000', '-$2,500,000']);
  });

  it('rounds to the dollar, and a few cents under zero is not "-$0"', () => {
    expect([1_234.4, 1_234.6, -1_234.6, 999.5, 0.4, -0.4].map(fmtMoney)).toEqual(['$1,234', '$1,235', '-$1,235', '$1,000', '$0', '$0']);
  });

  it('reads the same whatever the device locale (#417)', () => {
    germanDevice();
    expect((45_000).toLocaleString()).toBe('45.000'); // the device really is German
    expect([-45_000, 0, 1_234.6, 64_000, 1_234_567].map(fmtMoney)).toEqual(['-$45,000', '$0', '$1,235', '$64,000', '$1,234,567']);
  });
});

describe('fmtMoneyShort (#615)', () => {
  it('whole dollars under a thousand, then k, then m', () => {
    expect([0, 800, 999, 1_000, 1_499, 1_500, 20_000, 123_456, 999_499].map((n) => fmtMoneyShort(n)))
      .toEqual(['$0', '$800', '$999', '$1k', '$1k', '$2k', '$20k', '$123k', '$999k']);
    expect([1_000_000, 1_250_000, 1_600_000, 2_000_000, 12_345_678].map((n) => fmtMoneyShort(n)))
      .toEqual(['$1m', '$1.3m', '$1.6m', '$2m', '$12.3m']);
  });

  it('the minus goes before the dollar', () => {
    expect([-800, -4_400, -45_000, -2_500_000, -0.4].map((n) => fmtMoneyShort(n))).toEqual(['-$800', '-$4k', '-$45k', '-$2.5m', '$0']);
  });

  it('a decimal place on the thousands for a button: "$12.5k", and "$12k" not "$12.0k"', () => {
    const btn = (n: number): string => fmtMoneyShort(n, { places: 1 });
    expect([900, 1_000, 1_756, 9_600, 12_000, 12_500, 51_500, -2_500].map(btn))
      .toEqual(['$900', '$1k', '$1.8k', '$9.6k', '$12k', '$12.5k', '$51.5k', '-$2.5k']);
    expect([1_000_000, 1_600_000, 2_000_000].map(btn)).toEqual(['$1m', '$1.6m', '$2m']);
  });

  it('a column keeps its ".0" so the sums line up', () => {
    const col = (n: number): string => fmtMoneyShort(n, { places: 1, keepZero: true });
    expect([999, 2_000, 12_345, 25_000, -30_000, 1_600_000, 2_000_000].map(col))
      .toEqual(['$999', '$2.0k', '$12.3k', '$25.0k', '-$30.0k', '$1.6m', '$2.0m']);
  });

  it('a sum that rounds to a thousand thousands steps up to the million, never "$1000k"', () => {
    expect([999_499, 999_500, 999_950, 999_999].map((n) => fmtMoneyShort(n))).toEqual(['$999k', '$1m', '$1m', '$1m']);
    expect([999_949, 999_950, 999_999].map((n) => fmtMoneyShort(n, { places: 1 }))).toEqual(['$999.9k', '$1m', '$1m']);
    expect([999_949, 999_950].map((n) => fmtMoneyShort(n, { places: 1, keepZero: true }))).toEqual(['$999.9k', '$1.0m']);
    expect([-999_949, -999_950].map((n) => fmtMoneyShort(n, { places: 1 }))).toEqual(['-$999.9k', '-$1m']);
    // 999.5 dollars is a thousand of them.
    expect([999.4, 999.5].map((n) => fmtMoneyShort(n))).toEqual(['$999', '$1k']);
  });

  it('rounds a shortfall up, so the label covers the gap', () => {
    const need = (n: number): string => fmtMoneyShort(n, { roundUp: true });
    expect([0.2, 999, 1_000, 17_001, 18_000, 999_000, 999_001, 1_000_001, 1_200_000].map(need))
      .toEqual(['$1', '$999', '$1k', '$18k', '$18k', '$999k', '$1m', '$1.1m', '$1.2m']);
  });
});

describe('money in a sentence, in debt and on a German device (#615)', () => {
  const solvent: Objective = { id: 's', kind: 'solvent', text: 'Finish the season solvent', target: 0, status: 'pending' };

  it('Staff & Board: "now -$45,000", as the dock writes it', () => {
    createNewGame('Test FC', 7);
    germanDevice();
    expect(objectiveLine(solvent, { ...getState(), money: -45_000 })).toBe('Finish the season solvent — now -$45,000');
    expect(objectiveLine(solvent, { ...getState(), money: 120_000 })).toBe('Finish the season solvent — now $120,000');
  });

  it('the expansion intro: the bank with commas', () => {
    germanDevice();
    expect(EXPANSION_COPY.bank(200_000)).toBe('There is $200,000 in the bank. Keep enough aside for the weekly bills.');
    expect(EXPANSION_COPY.bank(-45_000)).toContain('There is -$45,000 in the bank');
  });

  it('the placement bar: what a build is short by, from a bank in debt', () => {
    germanDevice();
    const aim: PlacementAim = { x: 4, y: 4, v: { ok: false, reason: 'insufficient-funds' }, home: false };
    const m = placementBarModel({ kind: 'build', defId: 'weightsRoom' }, aim, -45_000);
    expect(m).toMatchObject({ action: 'Build here · $15,000', why: 'Need $60,000 more' });
  });
});
