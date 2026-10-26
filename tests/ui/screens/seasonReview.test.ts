// tests/ui/screens/seasonReview.test.ts — the season review (N7, #190): the pure
// builders, and a headless season through the real hooks to see the record
// stamped. The modal itself is not rendered (the vitest env is 'node').
import { describe, it, expect, beforeEach } from 'vitest';
import {
  addPotm, buildSeasonReview, finalsRun, fmtMoneyInOut, fmtMovers, fmtPotmTotal, fmtRecord, initSeasonReview, moneyLineBad,
  MOVERS_SHOWN, potmSummary, snapshotBeforeRollover,
} from '../../../src/ui/screens/seasonReview';
import { initSeasonEndFeedback } from '../../../src/ui/screens/history';
import { createNewGame, getState, setState, type GameState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { advanceWeeks, clearSeasonHooks, clearTickHooks } from '../../../src/core/time';
import { registerAllSystems } from '../../../src/qa/soak';
import { initLeague } from '../../../src/systems/fixtures';
import { WEEKS_PER_SEASON } from '../../../src/config';

describe('the player-of-the-match tally', () => {
  it('counts awards by name within a season and starts over with a new one', () => {
    let t = addPotm(undefined, 1, 'A');
    t = addPotm(t, 1, 'B');
    t = addPotm(t, 1, 'A');
    expect(t).toEqual({ season: 1, counts: { A: 2, B: 1 } });
    expect(potmSummary(t, 1)).toEqual({ total: 3, best: { name: 'A', count: 2 } });
    expect(potmSummary(t, 2)).toBeUndefined();
    expect(potmSummary(undefined, 1)).toBeUndefined();
    const next = addPotm(t, 2, 'C');
    expect(next).toEqual({ season: 2, counts: { C: 1 } });
    // Ties go to the first name.
    expect(potmSummary({ season: 3, counts: { Zed: 1, Amy: 1 } }, 3)!.best).toEqual({ name: 'Amy', count: 1 });
  });
});

describe('buildSeasonReview', () => {
  const fresh = (): GameState => {
    bus.clear(); clearTickHooks(); clearSeasonHooks();
    setState(createNewGame('Review FC', 5));
    initLeague(getState());
    return getState();
  };

  it('reads the board, the books, retirements, juniors, movers and reputation off the rolled-over state', () => {
    const s = fresh();
    const before = snapshotBeforeRollover(s);
    expect(before.season).toBe(1);
    expect(before.squad).toHaveLength(s.squad.length);
    // Hand-roll what the hooks would leave: two retirees gone, three juniors in,
    // two rivals moved, the books closed, the objectives reviewed.
    const [gone1, gone2, ...kept] = s.squad;
    const rivals = s.league.clubs.map((c, i) => (i === 1 ? { ...c, strength: c.strength + 5 } : i === 2 ? { ...c, strength: c.strength - 2 } : c));
    const after: GameState = {
      ...s,
      season: 2,
      week: 1,
      squad: kept,
      freeAgents: [...s.freeAgents, ...s.freeAgents.slice(0, 3).map((p, i) => ({ ...p, id: `jr${i}`, junior: true }))],
      league: { ...s.league, clubs: rivals },
      objectives: [
        { id: 'a', kind: 'finals', text: 'Finish in the top 8', target: 8, status: 'met' },
        { id: 'b', kind: 'solvent', text: 'Finish the season with cash in the bank', target: 0, status: 'missed' },
      ],
      boardPatience: 4,
      reputation: 36,
      finance: [{ ...s.finance[0]!, gate: 300_000, grant: 40_000, wages: -420_000, upkeep: -5_000 }],
      potmTally: { season: 1, counts: { [gone1!.name]: 4, [kept[0]!.name]: 2 } },
    };
    const r = buildSeasonReview(before, after);
    expect(r.potm).toEqual({ total: 6, best: { name: gone1!.name, count: 4 } });
    expect(r.board).toEqual({
      met: 1, missed: 1, patience: 4, sacked: false,
      objectives: [{ text: 'Finish in the top 8', met: true }, { text: 'Finish the season with cash in the bank', met: false }],
    });
    expect(r.money).toEqual({ in: 340_000, out: 425_000 });
    expect(r.retired).toEqual([{ name: gone1!.name, age: gone1!.age + 1 }, { name: gone2!.name, age: gone2!.age + 1 }]);
    expect(r.juniors).toBe(3);
    expect(r.movers).toEqual([
      { name: rivals[1]!.name, from: s.league.clubs[1]!.strength, to: rivals[1]!.strength },
      { name: rivals[2]!.name, from: s.league.clubs[2]!.strength, to: rivals[2]!.strength },
    ]);
    expect(r.reputation).toEqual({ from: 30, to: 36 });
  });

  it('leaves out what there is nothing to say about', () => {
    const s = fresh();
    const r = buildSeasonReview(snapshotBeforeRollover(s), { ...s, season: 2, finance: [] });
    expect(r.potm).toBeUndefined();
    expect(r.board).toBeUndefined();
    expect(r.money).toBeUndefined();
    expect(r.retired).toBeUndefined();
    expect(r.juniors).toBeUndefined();
    expect(r.movers).toBeUndefined();
    expect(r.reputation).toEqual({ from: 30, to: 30 });
  });

  it('names at most the biggest movers', () => {
    const s = fresh();
    const rivals = s.league.clubs.map((c, i) => (c.id === 'player' ? c : { ...c, strength: c.strength + (i % 2 ? 3 : -3) }));
    const r = buildSeasonReview(snapshotBeforeRollover(s), { ...s, season: 2, league: { ...s.league, clubs: rivals } });
    expect(r.movers).toHaveLength(MOVERS_SHOWN);
  });
});

describe('how the finals ended (#351 E2)', () => {
  const tie = (round: number, homeId: string, awayId: string, homeScore: number, awayScore: number) =>
    ({ round, homeId, awayId, result: { homeScore, awayScore } });

  it('is the club’s last finals tie, won or lost; regular rounds and unplayed ties do not count', () => {
    expect(finalsRun([tie(24, 'player', 'a', 30, 0)], 'player')).toBeUndefined();
    expect(finalsRun([tie(25, 'a', 'player', 20, 12), tie(25, 'b', 'c', 1, 0)], 'player')).toEqual({ round: 25, won: false });
    expect(finalsRun([tie(25, 'player', 'a', 20, 12), tie(26, 'b', 'player', 10, 18), { round: 27, homeId: 'player', awayId: 'c' }], 'player'))
      .toEqual({ round: 26, won: true });
    // A finals draw goes to the home side, the higher seed.
    expect(finalsRun([tie(27, 'a', 'player', 16, 16)], 'player')).toEqual({ round: 27, won: false });
  });

  it('is taken before the rollover replaces the fixtures and lands on the review', () => {
    bus.clear(); clearTickHooks(); clearSeasonHooks();
    setState(createNewGame('Finals FC', 5));
    initLeague(getState());
    const s = getState();
    const withFinals: GameState = { ...s, league: { ...s.league, fixtures: [...s.league.fixtures, tie(25, 'a', s.clubId, 24, 6)] } };
    const before = snapshotBeforeRollover(withFinals);
    expect(before.finals).toEqual({ round: 25, won: false });
    expect(buildSeasonReview(before, { ...s, season: 2 }).finals).toEqual({ round: 25, won: false });
    expect(snapshotBeforeRollover(s).finals).toBeUndefined();
  });
});

describe('formatting', () => {
  it('says where the player-of-the-match awards came from and reds the money only for a season closed in debt', () => {
    expect(fmtPotmTotal({ total: 6, best: { name: 'Jack Taufa', count: 3 } })).toBe('6 awards in matches you watched · most: Jack Taufa (3)');
    expect(fmtPotmTotal({ total: 1 })).toBe('1 award in matches you watched');
    expect(moneyLineBad(200_000)).toBe(false);
    expect(moneyLineBad(-1)).toBe(true);
    expect(moneyLineBad(undefined)).toBe(false);
  });

  it('reads the record, the books and the movers', () => {
    expect(fmtRecord({ season: 1, ladderPosition: 3, premiership: false, wins: 14, losses: 9, draws: 1, pointsFor: 480, pointsAgainst: 400 }))
      .toBe('W14 L9 D1 · 480 for, 400 against');
    expect(fmtRecord({ season: 1, ladderPosition: 3, premiership: false })).toBe('');
    expect(fmtMoneyInOut({ in: 812_000, out: 790_000 })).toBe('In $812,000 · Out $790,000 · Net +$22,000');
    expect(fmtMoneyInOut({ in: 100, out: 250 })).toBe('In $100 · Out $250 · Net −$150');
    expect(fmtMovers([{ name: 'Reapers', from: 70, to: 73 }, { name: 'Larrikins', from: 42, to: 40 }]))
      .toBe('Reapers 70→73 rising, Larrikins 42→40 sliding');
  });
});

describe('a season through the real hooks', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
  });

  it('stamps the review on the season’s record and, headless, still ends the season with the toast', () => {
    setState(createNewGame('Hooked FC', 21));
    initLeague(getState());
    registerAllSystems();
    const off = initSeasonEndFeedback();
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    advanceWeeks(WEEKS_PER_SEASON);
    const s = getState();
    expect(s.season).toBe(2);
    const entry = s.history.find((h) => h.season === 1)!;
    expect(entry).toBeDefined();
    const r = entry.review!;
    expect(r).toBeDefined();
    expect(r.board!.objectives.length).toBeGreaterThan(0);
    expect(r.board!.met + r.board!.missed).toBe(r.board!.objectives.length);
    expect(r.board!.patience).toBe(s.boardPatience);
    // The finals were played out before the rollover, so a finals side's review says how they ended.
    if (entry.ladderPosition <= 8) expect(r.finals).toEqual({ round: expect.any(Number), won: entry.premiership });
    else expect(r.finals).toBeUndefined();
    expect(r.money!.in).toBeGreaterThan(0);
    expect(r.money!.out).toBeGreaterThan(0);
    expect(r.juniors).toBeGreaterThanOrEqual(3);
    // Reputation moves during a season too (events, results): `from` is the rollover's start.
    expect(r.reputation!.to).toBe(s.reputation);
    expect(r.reputation!.from).toBeGreaterThan(0);
    // The new season's objectives are the board's fresh ones, not the reviewed set.
    expect(s.objectives.every((o) => o.status === 'pending')).toBe(true);
    expect(toasts.some((t) => t.startsWith('Season 1 complete'))).toBe(true);
    off();
  });

  it('initSeasonReview registers its hooks only once per call and the listener unsubscribes', () => {
    setState(createNewGame('Twice FC', 3));
    initLeague(getState());
    registerAllSystems();
    const off = initSeasonReview();
    off();
    const toasts: string[] = [];
    bus.on('ui:notify', ({ text }) => toasts.push(text));
    advanceWeeks(WEEKS_PER_SEASON);
    expect(toasts.some((t) => t.startsWith('Season 1 complete'))).toBe(false);
    expect(getState().history[0]!.review).toBeDefined();
  });
});
