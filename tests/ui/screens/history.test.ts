import { describe, it, expect, beforeEach } from 'vitest';
import {
  fmtSeasonSummary,
  fmtFinalsOutcome,
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

  it('says how the season ended past the ladder (#351 E2)', () => {
    const at = (ladderPosition: number, finals?: { round: number; won: boolean }) =>
      fmtSeasonSummary({ season: 1, ladderPosition, premiership: false, review: finals ? { finals } : {} });
    expect(at(4, { round: 25, won: false })).toBe('Season 1 — finished 4th · out in the Qualifying Final');
    expect(at(2, { round: 26, won: false })).toBe('Season 1 — finished 2nd · out in the Semi Final');
    expect(at(1, { round: 27, won: false })).toBe('Season 1 — finished 1st · lost the Grand Final');
    expect(at(11)).toBe('Season 1 — finished 11th · missed the finals');
    // A run cut short (headless catch-up) and a pre-v12 record say only the ladder.
    expect(at(6, { round: 25, won: true })).toBe('Season 1 — finished 6th');
    expect(fmtFinalsOutcome({ season: 1, ladderPosition: 11, premiership: false })).toBe('');
    expect(fmtFinalsOutcome({ season: 1, ladderPosition: 3, premiership: true, review: { finals: { round: 27, won: true } } })).toBe('');
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

// Broadcast Quiet 3l: the History sheet's summary and its rows.
import { fmtHistorySummary, historyRowView } from '../../../src/ui/screens/history';
import { emptyFinance, type SeasonRecord } from '../../../src/core/state';

describe('the History table (3l)', () => {
  const s1: SeasonRecord = { season: 1, ladderPosition: 5, premiership: false, wins: 13, losses: 10, draws: 1, pointsFor: 500, pointsAgainst: 480, topScorer: { name: 'Kobe Hale', tries: 9 }, review: { finals: { round: 25, won: false } } };
  const s2: SeasonRecord = { season: 2, ladderPosition: 2, premiership: true, wins: 18, losses: 6, draws: 0, pointsFor: 600, pointsAgainst: 300, topScorer: { name: 'Kobe Hale', tries: 12 }, review: { potm: { total: 4, best: { name: 'Jett Mbyerson', count: 3 } } } };
  const s3: SeasonRecord = { season: 3, ladderPosition: 11, premiership: false };

  it('sums the seasons up in the head', () => {
    expect(fmtHistorySummary([])).toBe('0 seasons · 0 premierships');
    expect(fmtHistorySummary([s1, s2, s3])).toBe('3 seasons · 1 premiership · best finish 2nd');
  });

  it('a row has the finish, the record (W–D–L once a season drew), ladder points, the player of the season and the net', () => {
    const books = { ...emptyFinance(1), wages: -100000, gate: 120000 };
    const state = { history: [s1, s2, s3], finance: [books], money: 50000 };
    const v1 = historyRowView(s1, state);
    expect(v1).toMatchObject({ season: 'S1', finish: '5th', best: false, wl: '13–1–10', pfpa: '500–480', pts: '27', player: 'Kobe Hale', net: 20000 });
    expect(v1.note).toBe('Out in the Qualifying Final · top try-scorer Kobe Hale (9)');
    const v2 = historyRowView(s2, state);
    expect(v2).toMatchObject({ finish: '2nd', best: true, premiers: true, wl: '18–0–6', pts: '36', player: 'Jett Mbyerson', net: null });
    expect(v2.note).toBe('3 player-of-the-match awards · top try-scorer Kobe Hale (12)');
    // Before the extended record (v4) and the review (v12): dashes, and the rules it was played under.
    expect(historyRowView(s3, state)).toMatchObject({ wl: '—', pts: '—', player: '—', note: PRE_NINES_NOTE });
  });
});
