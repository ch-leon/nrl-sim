// src/utils/money.ts — how the game writes a sum of money (#615). One pair for
// every screen, toast and card: fmtMoney in full ("$1,234", "-$45,000") and
// fmtMoneyShort for a chip, a button or a narrow column ("$32k", "$1.6m"). The
// minus goes before the dollar and the grouping is en-US whatever the device's
// locale. Pure; in utils/ so systems/ and ui/ both import it.

/** Whole dollars, thousands-separated: `$1,234`, `$0`, and `-$1,234` below zero. */
export function fmtMoney(n: number): string {
  const rounded = Math.round(n);
  const grouped = Math.abs(rounded).toLocaleString('en-US');
  return rounded < 0 ? `-$${grouped}` : `$${grouped}`;
}

/** How {@link fmtMoneyShort} writes the thousands and the millions. */
export interface MoneyShortOptions {
  /** Decimal places on the thousands: 0 is "$12k" (the default), 1 is "$12.5k". Millions always carry one. */
  places?: 0 | 1;
  /** Keep a ".0" so a column of sums lines up: "$25.0k", "$2.0m". Dropped by default ("$25k", "$2m"). */
  keepZero?: boolean;
  /** Round up, not to the nearest: a shortfall ("NEED $18k") has to cover the gap. */
  roundUp?: boolean;
}

/**
 * Short money: whole dollars under $1,000, then thousands, then millions:
 * "$800", "$32k", "-$4k", "$1.6m". A sum that rounds to a thousand thousands
 * steps up to the million ($999,950 is "$1m", never "$1000k").
 */
export function fmtMoneyShort(n: number, opts: MoneyShortOptions = {}): string {
  const { places = 0, keepZero = false, roundUp = false } = opts;
  const abs = roundUp ? Math.ceil(Math.abs(n)) : Math.abs(Math.round(n));
  const sign = n < 0 && abs > 0 ? '-' : '';
  if (abs < 1000) return `${sign}$${abs}`;
  const scaled = (unit: number, dp: number): string => {
    const text = roundUp ? (Math.ceil(abs / (unit / 10 ** dp)) / 10 ** dp).toFixed(dp) : (abs / unit).toFixed(dp);
    return keepZero ? text : text.replace(/\.0$/, '');
  };
  const thousands = scaled(1000, places);
  return Number(thousands) < 1000 ? `${sign}$${thousands}k` : `${sign}$${scaled(1_000_000, 1)}m`;
}
