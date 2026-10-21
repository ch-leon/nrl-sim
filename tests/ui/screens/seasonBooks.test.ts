// N14 (#262): a past season's books, opened from History. The closing balance is
// derived (today's balance less every later season's net), so it holds only while
// every money movement is booked: the corpus saves check that.
import { describe, it, expect } from 'vitest';
import { seasonBooks, fmtNetClosing } from '../../../src/ui/screens/finance';
import { fmtBooksHeading } from '../../../src/ui/screens/history';
import { emptyFinance, FINANCE_LINES, type GameState, type SeasonFinance } from '../../../src/core/state';
import { migrateState } from '../../../src/core/save';
import { financeNet } from '../../../src/systems/economy';
import { STARTING_MONEY, difficultyMultipliers } from '../../../src/config';

const books = (season: number, lines: Partial<SeasonFinance>): SeasonFinance => ({ ...emptyFinance(season), ...lines, season });
const net = (f: SeasonFinance): number => {
  const { season: _s, ...lines } = f;
  return financeNet(lines);
};

describe("a season's books (N14)", () => {
  const state = {
    money: 150_000,
    finance: [
      books(1, { wages: -400_000, gate: 300_000, sponsor: 90_000, prize: 50_000 }), // net +40k
      books(2, { wages: -420_000, gate: 280_000, sponsor: 90_000 }), // net −50k
      books(3, { wages: -30_000, gate: 20_000 }), // the open season so far: net −10k
    ],
  } satisfies Pick<GameState, 'money' | 'finance'>;

  it('every line in the books order, the net, and the balance each season closed on', () => {
    const s1 = seasonBooks(state, 1)!;
    expect(s1.rows.map((r) => r.line)).toEqual([...FINANCE_LINES]);
    expect(s1.rows.find((r) => r.line === 'prize')!.amount).toBe(50_000);
    expect(s1.net).toBe(40_000);
    // 150k now, less season 3 (−10k) and season 2 (−50k): season 2 closed on 160k, season 1 on 210k.
    expect(seasonBooks(state, 2)!.closing).toBe(160_000);
    expect(s1.closing).toBe(210_000);
    expect(seasonBooks(state, 3)!.closing).toBe(150_000);
  });

  it('a season from before the books were kept has none', () => {
    expect(seasonBooks(state, 0)).toBeNull();
  });

  it('formats the net and closing balance, and the heading', () => {
    expect(fmtNetClosing({ net: 40_000, closing: 210_000 })).toBe('Net +$40,000 · closed on $210,000');
    expect(fmtNetClosing({ net: -50_000, closing: -1_500 })).toBe('Net −$50,000 · closed on -$1,500');
    expect(fmtBooksHeading({ season: 2, ladderPosition: 4, premiership: false, wins: 12, losses: 10, draws: 2, pointsFor: 480, pointsAgainst: 400, topScorer: { name: 'X', tries: 9 } }))
      .toBe('Season 2 — finished 4th · W12 L10 D2 · PF 480 PA 400');
    expect(fmtBooksHeading({ season: 1, ladderPosition: 3, premiership: false })).toBe('Season 1 — finished 3rd');
  });
});

describe('the corpus: every v12+ save opens every season it has, and the books add up to the balance', () => {
  const saves = import.meta.glob('../../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
  const modern = Object.keys(saves).filter((f) => Number(/\/v(\d+)-/.exec(f)?.[1]) >= 12);

  it('has v12+ saves to read', () => {
    expect(modern.length).toBeGreaterThan(0);
  });

  for (const file of modern) {
    it(file.slice(file.lastIndexOf('/') + 1), () => {
      const res = migrateState(saves[file]);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const s = res.state;
      for (const h of s.history) expect(seasonBooks(s, h.season), `season ${h.season}`).not.toBeNull();
      // Every movement booked: the starting balance plus every season's net is today's balance.
      const start = Math.round(STARTING_MONEY * difficultyMultipliers(s.settings.difficulty).startingMoney);
      expect(Math.round(start + s.finance.reduce((sum, f) => sum + net(f), 0))).toBe(Math.round(s.money));
      // So the open season's books close on today's balance.
      const open = s.finance[s.finance.length - 1]!;
      expect(seasonBooks(s, open.season)!.closing).toBe(Math.round(s.money));
    });
  }
});
