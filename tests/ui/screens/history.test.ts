import { describe, it, expect, beforeEach } from 'vitest';
import {
  fmtSeasonSummary,
  fmtSeasonEndToast,
  seasonEndToastKind,
  historyNewestFirst,
  initSeasonEndFeedback,
} from '../../../src/ui/screens/history';
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
