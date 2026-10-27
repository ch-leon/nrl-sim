import { describe, it, expect, beforeEach } from 'vitest';
import {
  weekSummary, weekSnapshot, boardMood, capList, fmtSigned, summaryCanShow, TOP_GAINS,
  type WeekSnapshot,
} from '../../src/ui/weekSummary';
import { createNewGame, getState, FINANCE_LINES, type FinanceLine, type PlayerStats } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { bus } from '../../src/core/events';
import { BOARD } from '../../src/config';

beforeEach(() => bus.clear());

const stats = (over: Partial<PlayerStats> = {}): PlayerStats => ({ speed: 50, strength: 50, stamina: 50, skill: 50, footyIQ: 50, ...over });
const lines = (over: Partial<Record<FinanceLine, number>> = {}): Record<FinanceLine, number> =>
  ({ ...(Object.fromEntries(FINANCE_LINES.map((l) => [l, 0])) as Record<FinanceLine, number>), ...over });
const man = (id: string, over: Partial<WeekSnapshot['squad'][number]> = {}): WeekSnapshot['squad'][number] =>
  ({ id, name: `Player ${id}`, stats: stats(), injuredWeeks: 0, suspendedWeeks: 0, ...over });

const snap = (over: Partial<WeekSnapshot> = {}): WeekSnapshot => ({
  season: 1, week: 5, squad: [], finance: [{ season: 1, lines: lines() }], boardPatience: BOARD.MAX_PATIENCE, board: null, ...over,
});

describe('weekSummary: training (#368)', () => {
  it('lists the top gains, biggest first, at one decimal', () => {
    const before = snap({ squad: [man('a'), man('b'), man('c')] });
    const after = snap({
      week: 6,
      squad: [
        man('a', { stats: stats({ speed: 51, strength: 50.3 }) }),
        man('b', { stats: stats({ footyIQ: 50.8 }) }),
        man('c', { stats: stats({ skill: 52.25, stamina: 49.7 }) }), // a veteran's decline is not a gain
      ],
    });
    const v = weekSummary(before, after);
    expect(v.title).toBe('Week 5');
    expect(v.weeks).toBe(1);
    expect(v.gains).toEqual(['Player c +2.3 skill', 'Player a +1 speed', 'Player b +0.8 footy IQ']);
    expect(v.gains).toHaveLength(TOP_GAINS);
  });

  it('skips men signed since the last card and gains that round to nothing', () => {
    const v = weekSummary(snap({ squad: [man('a')] }), snap({ week: 6, squad: [man('a', { stats: stats({ speed: 50.04 }) }), man('new', { stats: stats({ speed: 90 }) })] }));
    expect(v.gains).toEqual([]);
  });
});

describe('weekSummary: injuries and bans (#368)', () => {
  it('names the newly hurt and banned, and who is back', () => {
    const before = snap({ squad: [man('a'), man('b'), man('c', { injuredWeeks: 1 }), man('d', { suspendedWeeks: 1 }), man('e', { injuredWeeks: 4 })] });
    const after = snap({ week: 6, squad: [man('a', { injuredWeeks: 3 }), man('b', { suspendedWeeks: 1 }), man('c'), man('d'), man('e', { injuredWeeks: 3 })] });
    const v = weekSummary(before, after);
    expect(v.injuries).toEqual(['Player a out 3 wks']);
    expect(v.bans).toEqual(['Player b banned 1 wk']);
    expect(v.back).toEqual(['Player c', 'Player d']);
  });
});

describe('weekSummary: money (#368)', () => {
  it('each line\'s change, money in first, and the net', () => {
    const before = snap({ finance: [{ season: 1, lines: lines({ wages: -40_000, sponsor: 10_000, gate: 20_000 }) }] });
    const after = snap({ week: 6, finance: [{ season: 1, lines: lines({ wages: -48_000, upkeep: -500, sponsor: 12_000, gate: 35_000 }) }] });
    const v = weekSummary(before, after);
    expect(v.money.map((m) => [m.line, m.amount])).toEqual([['gate', 15_000], ['sponsor', 2_000], ['wages', -8_000], ['upkeep', -500]]);
    expect(v.money[0]!.label).toBe('Gates');
    expect(v.moneyIn).toBe(17_000);
    expect(v.moneyOut).toBe(-8_500);
    expect(v.net).toBe(8_500);
    expect(fmtSigned(v.net)).toBe('+$8,500');
    expect(fmtSigned(-300)).toBe('-$300');
  });

  it('a week with no money moving has no lines and a net of 0', () => {
    const v = weekSummary(snap(), snap({ week: 6 }));
    expect(v.money).toEqual([]);
    expect(v.net).toBe(0);
  });
});

describe('weekSummary: a ▾ run (#368)', () => {
  it('sums the whole run in one card, across the season\'s end', () => {
    const before = snap({
      week: 22,
      squad: [man('a'), man('b')],
      finance: [{ season: 1, lines: lines({ wages: -80_000, gate: 60_000 }) }],
    });
    const after = snap({
      season: 2,
      week: 3,
      squad: [man('a', { stats: stats({ speed: 54 }) }), man('b', { injuredWeeks: 2 })],
      finance: [
        { season: 1, lines: lines({ wages: -100_000, gate: 75_000, prize: 15_000 }) },
        { season: 2, lines: lines({ wages: -8_000, sponsor: 4_000 }) },
      ],
    });
    const v = weekSummary(before, after);
    expect(v.weeks).toBe(8); // 22 → 27, then 1 → 3
    expect(v.title).toBe('Last 8 weeks');
    expect(v.gains).toEqual(['Player a +4 speed']);
    expect(v.injuries).toEqual(['Player b out 2 wks']);
    const by = Object.fromEntries(v.money.map((m) => [m.line, m.amount]));
    expect(by).toEqual({ wages: -28_000, gate: 15_000, prize: 15_000, sponsor: 4_000 });
    expect(v.net).toBe(6_000);
  });

  it('titles a run inside a season by its weeks', () => {
    expect(weekSummary(snap({ week: 5 }), snap({ week: 9 })).title).toBe('Weeks 5–8');
  });
});

describe('weekSummary: board mood (#368)', () => {
  it('happy, watching or worried from patience and the objective most at risk', () => {
    expect(boardMood(5, null)).toBe('happy');
    expect(boardMood(5, 'at-risk')).toBe('watching');
    expect(boardMood(3, null)).toBe('watching');
    expect(boardMood(5, 'off-track')).toBe('worried');
    expect(boardMood(2, null)).toBe('worried');
  });

  it('says why, and the patience', () => {
    const calm = weekSummary(snap(), snap({ week: 6 }));
    expect(calm.board).toEqual({ mood: 'happy', text: `every objective on track · patience 5/${BOARD.MAX_PATIENCE}` });
    const v = weekSummary(snap(), snap({ week: 6, boardPatience: 4, board: { risk: 'at-risk', text: "top 8, you're 11th" } }));
    expect(v.board).toEqual({ mood: 'watching', text: `top 8, you're 11th (at risk) · patience 5 → 4/${BOARD.MAX_PATIENCE}` });
  });
});

describe('weekSnapshot (#368)', () => {
  it('copies what the card compares, and leaves the state alone', () => {
    createNewGame('Test FC', 3);
    initLeague(getState());
    const s = getState();
    const a = weekSnapshot(s, null);
    expect(a.season).toBe(s.season);
    expect(a.week).toBe(s.week);
    expect(a.squad).toHaveLength(s.squad.length);
    a.squad[0]!.stats.speed = -1;
    expect(getState().squad[0]!.stats.speed).not.toBe(-1);
    expect(weekSummary(weekSnapshot(s), weekSnapshot(s)).money).toEqual([]);
  });
});

describe('the card waits (#368)', () => {
  const ready = { due: true, enabled: true, sacked: false, advancing: false, held: false, matchOnScreen: false, dialog: false, screen: false, tutorial: false };

  it('shows when due and nothing is in the way', () => {
    expect(summaryCanShow(ready)).toBe(true);
  });

  it('waits for a run, a held week, the match (Back to Club), a dialog, a screen and the tutorial; never with the setting off', () => {
    for (const k of ['advancing', 'held', 'matchOnScreen', 'dialog', 'screen', 'tutorial', 'sacked'] as const) {
      expect(summaryCanShow({ ...ready, [k]: true })).toBe(false);
    }
    expect(summaryCanShow({ ...ready, enabled: false })).toBe(false);
    expect(summaryCanShow({ ...ready, due: false })).toBe(false);
  });

  it('folds a long list into "+n more"', () => {
    expect(capList(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(capList(['a', 'b', 'c', 'd', 'e'])).toEqual(['a', 'b', '+3 more']);
  });
});
