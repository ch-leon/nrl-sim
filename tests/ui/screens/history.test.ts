import { describe, it, expect, beforeEach } from 'vitest';
import {
  fmtSeasonSummary,
  fmtSeasonEndToast,
  seasonEndToastKind,
  historyNewestFirst,
  initSeasonEndFeedback,
  fmtRulesNote,
  playedBeforeNines,
  PRE_NINES_NOTE,
} from '../../../src/ui/screens/history';
import { migrateState } from '../../../src/core/save';
import { bus } from '../../../src/core/events';

describe('fmtSeasonSummary', () => {
  it('formats a regular finish', () => {
    expect(fmtSeasonSummary({ season: 1, ladderPosition: 4, premiership: false }))
      .toBe('Season 1 — finished 4th');
  });

  it('formats a premiership', () => {
    expect(fmtSeasonSummary({ season: 2, ladderPosition: 1, premiership: true }))
      .toBe('Season 2 — PREMIERS (ladder 1st)');
  });
});

describe('fmtSeasonEndToast', () => {
  it('celebrates a premiership', () => {
    expect(fmtSeasonEndToast({ season: 3, ladderPosition: 2, premiership: true }))
      .toContain('PREMIERS');
    expect(seasonEndToastKind({ season: 3, ladderPosition: 2, premiership: true }))
      .toBe('success');
  });

  it('reports ladder position otherwise', () => {
    expect(fmtSeasonEndToast({ season: 1, ladderPosition: 9, premiership: false }))
      .toContain('9th');
  });
});

describe('historyNewestFirst', () => {
  it('reverses without mutating', () => {
    const src = [
      { season: 1, ladderPosition: 5, premiership: false },
      { season: 2, ladderPosition: 1, premiership: true },
    ];
    expect(historyNewestFirst(src).map((e) => e.season)).toEqual([2, 1]);
    expect(src.map((e) => e.season)).toEqual([1, 2]);
  });
});

describe('initSeasonEndFeedback', () => {
  beforeEach(() => bus.clear());

  it('emits a toast on season:ended', () => {
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    const off = initSeasonEndFeedback();
    bus.emit('season:ended', { season: 1, ladderPosition: 3, premiership: false });
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toContain('3rd');
    off();
  });
});

// Nines (#77): a season played before the switch says so in History.
describe('the pre-Nines note', () => {
  it('notes a season with no review (before v12) and not one with a review', () => {
    expect(playedBeforeNines({ season: 1, ladderPosition: 4, premiership: false })).toBe(true);
    expect(fmtRulesNote({ season: 1, ladderPosition: 4, premiership: false, wins: 12 })).toBe(PRE_NINES_NOTE);
    expect(fmtRulesNote({ season: 3, ladderPosition: 2, premiership: false, review: {} })).toBe('');
    expect(PRE_NINES_NOTE).toMatch(/80-minute/);
  });

  // The corpus by season: the v9–v11 playthroughs finished season 1 on the old engine (the
  // v9 one before the live sim existed: 2.3 tackles a player a game against the live sim's
  // 9–12); from v12 every season has its review and was played with the live sim on.
  const saves = import.meta.glob('../../fixtures/saves/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
  const withHistory = Object.keys(saves).filter((f) => {
    const raw = saves[f] as { history?: unknown[]; state?: { history?: unknown[] } };
    return (raw.history ?? raw.state?.history ?? []).length > 0;
  });

  it('has corpus saves with past seasons on both sides of the switch', () => {
    const versions = withHistory.map((f) => Number(/\/v(\d+)-/.exec(f)?.[1]));
    expect(versions.some((v) => v < 12)).toBe(true);
    expect(versions.some((v) => v >= 12)).toBe(true);
  });

  for (const file of withHistory) {
    const version = Number(/\/v(\d+)-/.exec(file)?.[1]);
    it(`${file.slice(file.lastIndexOf('/') + 1)}: ${version < 12 ? 'noted' : 'no note'}`, () => {
      const res = migrateState(saves[file]);
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      for (const h of res.state.history) expect(fmtRulesNote(h), `season ${h.season}`).toBe(version < 12 ? PRE_NINES_NOTE : '');
    });
  }
});
