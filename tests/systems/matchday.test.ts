// tests/systems/matchday.test.ts — player match tick: result toast timing (the
// result comes at full time from the match played on screen, BAK-207),
// SQUAD_MIN forfeit (GitHub #4), big-hit injuries applied to squad (GitHub #7).
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import {
  registerPlayerMatchSystem,
  forfeitResult,
  fitSquadCount,
} from '../../src/systems/matchday';
import { FORFEIT_SCORE, SQUAD_MIN } from '../../src/config';
import { generatePlayer } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';
import type { Fixture, Player } from '../../src/core/state';
import type { MatchResult, TeamSheet } from '../../src/sim/events';
import { runMatch } from '../../src/match/league/match';
import { LINEUP_SLOTS, placeAt, swapSpots } from '../../src/systems/lineup';

function collect(): {
  toasts: string[];
  started: { fixture: Fixture; sim: MatchResult }[];
  stop: () => void;
} {
  const toasts: string[] = [];
  const started: { fixture: Fixture; sim: MatchResult }[] = [];
  const offs = [
    bus.on('ui:notify', ({ text }) => toasts.push(text)),
    // The match the Match scene would play: with no coach calls, runMatch on the seed.
    bus.on('match:started', ({ fixture, home, away, live }) =>
      started.push({ fixture, sim: runMatch(home, away, { seed: live.seed, weather: live.weather, ...(live.injuryRate !== undefined ? { injuryRate: live.injuryRate } : {}) }) })),
  ];
  return { toasts, started, stop: () => offs.forEach((off) => off()) };
}

describe('player matchday result toast', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Tester', 42);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('holds the result until playback finishes', () => {
    const c = collect();
    advanceWeek();
    expect(c.started).toHaveLength(1);
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(0);

    const { fixture, sim } = c.started[0]!;
    bus.emit('match:finished', { fixture, result: sim });
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);

    // Only once, even if match:finished is echoed again.
    bus.emit('match:finished', { fixture, result: sim });
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);
    c.stop();
  });

  it('announces immediately when fast-forwarding (no playback)', () => {
    const c = collect();
    advanceWeeks(1);
    expect(c.started).toHaveLength(0);
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);
    c.stop();
  });
});

describe('player matchday injuries (GitHub #7)', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Tester', 7);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('applies sim injuries onto squad players and notifies', () => {
    // Force high injuryRisk so a big-hit injury is likely across a few seeds.
    const boosted: Player[] = getState().squad.map((p) => ({ ...p, injuryRisk: 95, injuredWeeks: 0 }));
    setState({ squad: boosted });

    let applied = false;
    for (let attempt = 0; attempt < 40 && !applied; attempt++) {
      clearTickHooks();
      clearSeasonHooks();
      clearHeldWeek();
      createNewGame('Tester', 1000 + attempt);
      initLeague(getState());
      setState({
        squad: getState().squad.map((p) => ({ ...p, injuryRisk: 95, injuredWeeks: 0 })),
      });
      registerPlayerMatchSystem();

      const c = collect();
      advanceWeeks(1); // fast-forward: apply + notify immediately
      const injuredNow = getState().squad.filter((p) => p.injuredWeeks > 0);
      if (injuredNow.length > 0) {
        expect(c.toasts.some((t) => t.includes('injured — out'))).toBe(true);
        for (const p of injuredNow) {
          expect(p.injuredWeeks).toBeGreaterThanOrEqual(1);
          expect(p.injuredWeeks).toBeLessThanOrEqual(3);
        }
        applied = true;
      }
      c.stop();
    }
    expect(applied).toBe(true);
  });

  it('holds injury toasts until playback finishes (no spoilers)', () => {
    let checked = false;
    for (let attempt = 0; attempt < 40 && !checked; attempt++) {
      clearTickHooks();
      clearSeasonHooks();
      clearHeldWeek();
      createNewGame('Tester', 1000 + attempt);
      initLeague(getState());
      setState({
        squad: getState().squad.map((p) => ({ ...p, injuryRisk: 95, injuredWeeks: 0 })),
      });
      registerPlayerMatchSystem();

      const c = collect();
      advanceWeek(); // interactive: the match plays on screen
      const { fixture, sim } = c.started[0]!;
      if (sim.injuries.some((i) => i.teamId === PLAYER_ID)) {
        // Nothing is applied or announced at kick-off.
        expect(getState().squad.some((p) => p.injuredWeeks > 0)).toBe(false);
        expect(c.toasts.some((t) => t.includes('injured — out'))).toBe(false);
        bus.emit('match:finished', { fixture, result: sim });
        expect(getState().squad.some((p) => p.injuredWeeks > 0)).toBe(true);
        expect(c.toasts.some((t) => t.includes('injured — out'))).toBe(true);
        checked = true;
      }
      c.stop();
    }
    expect(checked).toBe(true);
  });

  it('still plays when some (not all) players are injured', () => {
    const squad = getState().squad.map((p, i) =>
      i < 3 ? { ...p, injuredWeeks: 2 } : { ...p, injuredWeeks: 0 },
    );
    setState({ squad });
    const c = collect();
    advanceWeek();
    expect(c.started).toHaveLength(1);
    c.stop();
  });
});

describe('forfeit when fit < SQUAD_MIN', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    bus.clear();
    createNewGame('Tester', 42);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('forfeitResult awards FORFEIT_SCORE to the opponent', () => {
    expect(forfeitResult({ homeId: PLAYER_ID, awayId: 'rival-x' })).toEqual({
      homeScore: 0,
      awayScore: FORFEIT_SCORE,
    });
    expect(forfeitResult({ homeId: 'rival-x', awayId: PLAYER_ID })).toEqual({
      homeScore: FORFEIT_SCORE,
      awayScore: 0,
    });
  });

  it('applies a loss and notifies when fit squad is below SQUAD_MIN', () => {
    const injured = Array.from({ length: SQUAD_MIN }, (_, i) => ({
      ...generatePlayer(makeRng(i + 1), { age: 24 }),
      id: `p${i}`,
      injuredWeeks: 1,
    }));
    // Leave a few fit but still under the minimum.
    const fitFew = Array.from({ length: SQUAD_MIN - 2 }, (_, i) => ({
      ...generatePlayer(makeRng(100 + i), { age: 24 }),
      id: `fit${i}`,
      injuredWeeks: 0,
    }));
    setState({ squad: [...injured, ...fitFew], week: 1 });
    expect(fitSquadCount(getState().squad)).toBe(SQUAD_MIN - 2);

    const c = collect();
    const beforePts = getState().league.ladder.find((r) => r.clubId === PLAYER_ID)?.points ?? 0;
    advanceWeeks(1);
    expect(c.started).toHaveLength(0);
    expect(c.toasts.some((t) => t.includes('forfeited'))).toBe(true);

    const fx = getState().league.fixtures.find(
      (f) => f.round === 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID),
    );
    expect(fx?.result).toBeDefined();
    const playerHome = fx!.homeId === PLAYER_ID;
    if (playerHome) {
      expect(fx!.result).toEqual({ homeScore: 0, awayScore: FORFEIT_SCORE });
    } else {
      expect(fx!.result).toEqual({ homeScore: FORFEIT_SCORE, awayScore: 0 });
    }
    const row = getState().league.ladder.find((r) => r.clubId === PLAYER_ID)!;
    expect(row.losses).toBeGreaterThanOrEqual(1);
    expect(row.points).toBe(beforePts); // loss adds 0 pts
    c.stop();
  });
});

describe('rival rosters come from the rival squad (#74)', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
  });

  it('fields the rival\'s own fit players, the same names week to week, and falls back when short', () => {
    createNewGame('Roster FC', 31);
    initLeague(getState());
    registerPlayerMatchSystem();
    const sheets: { home: { clubId: string; roster?: { name: string; id?: string }[] }; away: { clubId: string; roster?: { name: string; id?: string }[] } }[] = [];
    bus.on('match:started', ({ home, away }) => sheets.push({ home, away }));
    advanceWeek();
    const first = sheets[0]!;
    const rivalSheet = first.home.clubId === PLAYER_ID ? first.away : first.home;
    const rival = getState().league.clubs.find((c) => c.id === rivalSheet.clubId)!;
    const ids = new Set(rival.squad!.map((p) => p.id));
    expect(rivalSheet.roster!.length).toBe(9);
    for (const r of rivalSheet.roster!) expect(ids.has(r.id!)).toBe(true);
    // The week holds until full time (BAK-207): finish the match, then the next week.
    clearHeldWeek();

    // With fewer than nine fit, the strength-based sheet steps in (no squad ids).
    const lg = getState().league;
    setState({
      league: { ...lg, clubs: lg.clubs.map((c) => ({ ...c, ...(c.squad ? { squad: c.squad.map((p) => ({ ...p, injuredWeeks: 5 })) } : {}) })) },
    });
    advanceWeek();
    const second = sheets[1]!;
    const rival2 = second.home.clubId === PLAYER_ID ? second.away : second.home;
    expect(rival2.roster!.every((r) => r.id === undefined)).toBe(true);
  });
});

describe('the coach’s lineup is the side that runs out (#69)', () => {
  beforeEach(() => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Lineup FC', 69);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  function playerSheet(c: ReturnType<typeof collectSheets>): TeamSheet {
    const first = c.sheets[0]!;
    return first.home.clubId === PLAYER_ID ? first.home : first.away;
  }
  function collectSheets(): { sheets: { home: TeamSheet; away: TeamSheet; fixture: Fixture; sim?: MatchResult }[]; toasts: string[]; stop: () => void } {
    const sheets: { home: TeamSheet; away: TeamSheet; fixture: Fixture; sim?: MatchResult }[] = [];
    const toasts: string[] = [];
    const offs = [
      // The match the Match scene would play: with no coach calls, runMatch on the seed.
      bus.on('match:started', ({ home, away, fixture, live }) => sheets.push({ home, away, fixture, sim: runMatch(home, away, { seed: live.seed, weather: live.weather, ...(live.injuryRate !== undefined ? { injuryRate: live.injuryRate } : {}) }) })),
      bus.on('ui:notify', ({ text }) => toasts.push(text)),
    ];
    return { sheets, toasts, stop: () => offs.forEach((off) => off()) };
  }

  it('fields the nine picked, in their slots, with the bench and rotation; the result credits them a game', () => {
    const s = getState();
    // Swap two starters' slots and put a bench man in at prop: the sheet must follow.
    let lineup = swapSpots(s.lineup, { kind: 'starter', slot: 1 }, { kind: 'starter', slot: 3 });
    lineup = placeAt(lineup, { kind: 'starter', slot: 7 }, lineup.bench[0]!);
    lineup = { ...lineup, rotation: 'heavy' };
    setState({ lineup });
    const c = collectSheets();
    advanceWeek();
    const mine = playerSheet(c);
    expect(mine.roster!.map((r) => r.id)).toEqual(lineup.starters);
    expect(mine.roster!.map((r) => r.position)).toEqual([...LINEUP_SLOTS]);
    expect(mine.bench!.map((b) => b.id)).toEqual(lineup.bench);
    expect(mine.rotation).toBe('heavy');
    // The rival's coach picks by slot too.
    const theirs = c.sheets[0]!.home.clubId === PLAYER_ID ? c.sheets[0]!.away : c.sheets[0]!.home;
    expect(theirs.roster!.map((r) => r.position)).toEqual([...LINEUP_SLOTS]);
    expect(c.toasts.some((t) => t.startsWith('Lineup:'))).toBe(false); // everyone fit: nothing to say
    bus.emit('match:finished', { fixture: c.sheets[0]!.fixture, result: c.sheets[0]!.sim! });
    const games = new Map(getState().squad.map((p) => [p.id, p.career?.games ?? 0]));
    for (const id of lineup.starters) expect(games.get(id!)).toBe(1);
    for (const p of getState().squad) if (!lineup.starters.includes(p.id)) expect(games.get(p.id)).toBe(0);
    c.stop();
  });

  it('an injured starter is covered for the match and the news says by whom; his slot is kept', () => {
    const s = getState();
    const fbId = s.lineup.starters[0]!;
    setState({ squad: s.squad.map((p) => (p.id === fbId ? { ...p, injuredWeeks: 2 } : p)) });
    const c = collectSheets();
    advanceWeek();
    const mine = playerSheet(c);
    expect(mine.roster![0]!.id).not.toBe(fbId);
    expect(mine.roster![0]!.position).toBe('fullback');
    expect(mine.roster!.map((r) => r.id)).not.toContain(fbId);
    const fb = getState().squad.find((p) => p.id === fbId)!;
    expect(c.toasts.some((t) => t === `Lineup: ${mine.roster![0]!.name} fills in at fullback for the injured ${fb.name}.`)).toBe(true);
    expect(getState().lineup.starters[0]).toBe(fbId);
    c.stop();
  });

  it('a starter who has left the club is replaced in the saved lineup', () => {
    const s = getState();
    const hkId = s.lineup.starters[6]!;
    setState({ squad: s.squad.filter((p) => p.id !== hkId) });
    const c = collectSheets();
    advanceWeek();
    const mine = playerSheet(c);
    expect(mine.roster![6]!.position).toBe('hooker');
    expect(getState().lineup.starters[6]).toBe(mine.roster![6]!.id);
    expect(getState().lineup.starters).not.toContain(hkId);
    expect(getState().lineup.bench).not.toContain(mine.roster![6]!.id);
    expect(c.toasts.some((t) => t.startsWith('Lineup:') && t.includes('comes in at hooker'))).toBe(true);
    c.stop();
  });
});
