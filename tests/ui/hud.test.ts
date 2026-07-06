import { describe, it, expect } from 'vitest';
import { fmtMoney } from '../../src/ui/hud';

// DOM tests (createHud rendering / flash / bus wiring) are skipped: jsdom is not
// installed and the vitest environment is 'node' (see vite.config.ts). The
// money formatter is extracted as a pure function so it is covered here.
describe('fmtMoney', () => {
  it('formats positive balances with thousands separators and a $ prefix', () => {
    expect(fmtMoney(0)).toBe('$0');
    expect(fmtMoney(200_000)).toBe('$200,000');
    expect(fmtMoney(1_234)).toBe('$1,234');
    expect(fmtMoney(999)).toBe('$999');
    expect(fmtMoney(1_000_000)).toBe('$1,000,000');
  });

  it('formats negative balances with a leading minus and $ (bankruptcy)', () => {
    expect(fmtMoney(-1)).toBe('-$1');
    expect(fmtMoney(-50_000)).toBe('-$50,000');
  });

  it('rounds fractional balances', () => {
    expect(fmtMoney(1_234.6)).toBe('$1,235');
    expect(fmtMoney(-1_234.6)).toBe('-$1,235');
  });
});
