// tests/systems/liveMatch.test.ts — live matches (BAK-207; every match since the
// Phase 4 switch-over) with the result at full time (coach calls #73,
// docs/specs/coach-calls.md §5): matchday holds the week at kick-off and hands the
// Match scene the seed; the match the scene plays (a Runner on the LiveSim and
// a MatchRecorder, as LivePlayback builds it) is the result, applied with the
// rest of the week at 'match:finished'. With no calls it equals runMatch on
// that seed. A killed app resumes the same match with its calls. Fast-forward
// still plays headless, and a whole season plays end to end.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bus, type LiveMatchData } from '../../src/core/events';
import { createNewGame, getState, setState, type Fixture } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearTickHooks, clearSeasonHooks, weekHeld } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { isLiveMatchRecord, LIVE_MATCH_SAVE_SECONDS, LIVE_MATCH_SAVE_TICKS, liveMatchSaveDue, liveMatchSameRules, readLiveMatch, writeLiveMatch } from '../../src/systems/liveMatchRecord';
import { MATCH_RESTARTED_TEXT, playerMatchPending, resumePlayerMatch } from '../../src/systems/matchday';
import { advanceUntil } from '../../src/core/advance';
import { MATCH_STILL_ON_TEXT } from '../../src/ui/hud';
import { MatchRecorder, runMatch } from '../../src/match/league/match';
import { Runner } from '../../src/match/core/engine';
import { LiveSim, type PlanInput } from '../../src/match/league/live';
import type { TeamTactics } from '../../src/match/league/presets';
import type { CallInput, CoachCall } from '../../src/match/league/calls';
import { NINES } from '../../src/match/league/rules';
import { initLiveState, reduceEvent } from '../../src/ui/screens/matchOverlay';
import { SEASON_ROUNDS } from '../../src/config';
import type { MatchResult, TeamSheet } from '../../src/sim/events';

/** The options the Match scene plays: weather, the edge, the rival's coach and his break rule. */
function asPlayed(live: LiveMatchData) {
  return {
    weather: live.weather,
    ...(live.injuryRate !== undefined ? { injuryRate: live.injuryRate } : {}),
    ...(live.difficultyEdge ? { difficultyEdge: live.difficultyEdge } : {}),
    ...(live.aiCoach?.length ? { aiCoach: live.aiCoach } : {}),
    ...(live.breakRuleSides?.length ? { breakRuleSides: live.breakRuleSides } : {}),
    ...(live.goldenPoint ? { goldenPoint: true } : {}),
  };
}

interface Started {
  fixture: Fixture;
  sim?: MatchResult;
  home: TeamSheet;
  away: TeamSheet;
  live?: LiveMatchData;
}

function newGame(seed: number): void {
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Tester', seed);
  initLeague(getState());
  registerPlayerMatchSystem();
}

/**
 * Play the match the way the Match scene's LivePlayback does: a Runner on the
 * live sim with the calls list, recording the result; optionally the player's
 * coach calls `call` whenever he may. Stops at `stopAt` (a killed app) or full time.
 */
function watch(
  s: Started,
  call?: { side: 'home' | 'away'; call: CoachCall },
  stopAt = Infinity,
  plan?: { side: 'home' | 'away'; tactics: TeamTactics },
): { result: MatchResult | null; calls: CallInput[]; plans: PlanInput[]; tick: number } {
  const live = s.live!;
  const calls = live.calls ?? [];
  const plans = live.plans ?? [];
  const rec = new MatchRecorder({ home: s.home.clubId, away: s.away.clubId });
  const r = new Runner((seed) => new LiveSim(s.home, s.away, seed, { ...asPlayed(live), calls, plans }), live.seed);
  r.onEvents = (events) => rec.add(events, r.cur);
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  while (!r.finished && r.tick < stopAt) {
    const sim = r.current as LiveSim;
    if (call && r.tick >= (live.resumeAt ?? 0) && sim.callRefusal(call.side, call.call) === null) {
      calls.push({ tick: r.tick + 1, side: call.side, call: call.call });
      live.onProgress?.(calls, r.tick, plans);
    }
    // The coach changes the plan at half-time (N11), once.
    if (plan && r.tick >= (live.resumeAt ?? 0) && sim.phaseKind === 'half-time' && plans.length === 0) {
      plans.push({ tick: r.tick + 1, side: plan.side, tactics: plan.tactics });
      live.onProgress?.(calls, r.tick, plans);
    }
    r.step();
  }
  if (!r.finished) {
    live.onProgress?.(calls, r.tick, plans);
    return { result: null, calls, plans, tick: r.tick };
  }
  return { result: rec.result(r.current as LiveSim), calls, plans, tick: r.tick };
}

/** A tiny localStorage for the resume record. */
function fakeStorage(): void {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('live match (beta): the match on screen is the match', () => {
  let started: Started[] = [];
  let off: () => void = () => {};
  beforeEach(() => {
    off();
    started = [];
    off = bus.on('match:started', (e) => started.push(e));
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('the week holds at kick-off; the watched match is the result, applied with the rest of the week at full time', () => {
    newGame(42);
    const week = getState().week;
    advanceWeek();
    expect(started).toHaveLength(1);
    const s = started[0]!;
    expect(s.sim).toBeUndefined();
    expect(weekHeld()).toBe(true);
    expect(getState().week).toBe(week);
    advanceWeek(); // nothing while the week is held
    expect(started).toHaveLength(1);
    // With no calls, the watched match is runMatch's on that seed.
    const { result } = watch(s);
    const head = runMatch(s.home, s.away, { seed: s.live!.seed, ...asPlayed(s.live!) });
    expect(result).toEqual(head);
    let st = initLiveState();
    for (const ev of result!.events) st = reduceEvent(st, ev, s.home.clubId, NINES.halfMinutes);
    expect([st.homeScore, st.awayScore]).toEqual([result!.homeScore, result!.awayScore]);
    // Full time: the result lands, then the rest of the week.
    bus.emit('match:finished', { fixture: s.fixture, result: result! });
    expect(weekHeld()).toBe(false);
    expect(getState().week).toBe(week + 1);
    const f = getState().league.fixtures.find((x) => x.round === s.fixture.round && x.homeId === s.fixture.homeId)!;
    expect(f.result).toEqual({ homeScore: result!.homeScore, awayScore: result!.awayScore });
  }, 30_000);

  it('the coach’s calls change the match, and the match with its calls is what counts', () => {
    newGame(42);
    advanceWeek();
    const s = started[0]!;
    const side = s.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const { result, calls } = watch(s, { side, call: 'kick-early' });
    expect(calls.length).toBeGreaterThan(3);
    const plain = runMatch(s.home, s.away, { seed: s.live!.seed, ...asPlayed(s.live!) });
    expect(result!.events).not.toEqual(plain.events);
    expect(runMatch(s.home, s.away, { seed: s.live!.seed, ...asPlayed(s.live!), calls: [...calls] })).toEqual(result);
    bus.emit('match:finished', { fixture: s.fixture, result: result! });
    const f = getState().league.fixtures.find((x) => x.round === s.fixture.round && x.homeId === s.fixture.homeId)!;
    expect(f.result).toEqual({ homeScore: result!.homeScore, awayScore: result!.awayScore });
  }, 30_000);

  it('a killed app resumes the same match where it was, with the calls already made', () => {
    fakeStorage();
    newGame(42);
    const saved = JSON.stringify(getState()); // the game saves only at a week's end
    advanceWeek();
    const first = started[0]!;
    const side = first.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const cut = watch(first, { side, call: 'shift-left' }, 4000);
    expect(cut.result).toBeNull();
    const rec = readLiveMatch()!;
    expect(rec.tick).toBe(cut.tick);
    expect(rec.calls.length).toBeGreaterThan(0);
    // Killed: back to the saved week, advance again — the same match, resumed.
    clearHeldWeek();
    setState(JSON.parse(saved));
    advanceWeek();
    const again = started[1]!;
    expect(again.live!.seed).toBe(first.live!.seed);
    expect(again.live!.resumeAt).toBe(cut.tick);
    expect(again.live!.calls).toEqual(rec.calls);
    const done = watch(again, { side, call: 'shift-left' });
    // Straight through with the same calls gives the same full time.
    const straight = runMatch(first.home, first.away, { seed: first.live!.seed, ...asPlayed(first.live!), calls: [...done.calls] });
    expect(done.result).toEqual(straight);
    bus.emit('match:finished', { fixture: again.fixture, result: done.result! });
    expect(readLiveMatch()).toBeNull();
  }, 60_000);

  it('a mid-match save from the old halves restarts from the kick-off', () => {
    fakeStorage();
    newGame(42);
    const saved = JSON.stringify(getState());
    advanceWeek();
    const first = started[0]!;
    expect(readLiveMatch()!.halfMinutes).toBe(NINES.halfMinutes);
    expect(liveMatchSameRules(readLiveMatch()!)).toBe(true);
    // A v19 record of this match: a tick in, and no half length.
    const old = { ...readLiveMatch()! };
    delete old.halfMinutes;
    writeLiveMatch({ ...old, tick: 800, calls: [{ tick: 10, side: 'home', call: 'hit-up' }] });
    expect(liveMatchSameRules(readLiveMatch()!)).toBe(false);
    clearHeldWeek();
    setState(JSON.parse(saved));
    const notes: string[] = [];
    const offNote = bus.on('ui:notify', ({ text }) => notes.push(text));
    advanceWeek();
    offNote();
    const again = started[1]!;
    expect(again.live!.seed).toBe(first.live!.seed);
    expect(again.live!.resumeAt).toBeUndefined();
    expect(again.live!.calls).toEqual([]);
    expect(notes).toContain(MATCH_RESTARTED_TEXT);
    expect(readLiveMatch()).toMatchObject({ tick: 0, halfMinutes: NINES.halfMinutes, calls: [] });
  });

  it('the periodic save falls due every two seconds of match time and not before', () => {
    expect(LIVE_MATCH_SAVE_SECONDS).toBe(2);
    expect(LIVE_MATCH_SAVE_TICKS).toBe(40);
    expect(liveMatchSaveDue(39, 0)).toBe(false);
    expect(liveMatchSaveDue(40, 0)).toBe(true);
    expect(liveMatchSaveDue(79, 40)).toBe(false);
    expect(liveMatchSaveDue(80, 40)).toBe(true);
  });

  it('a kill between coach calls resumes from the last periodic save, at most one interval behind, and matches playing straight through', () => {
    fakeStorage();
    newGame(42);
    const saved = JSON.stringify(getState());
    advanceWeek();
    const first = started[0]!;
    const live = first.live!;
    const calls = live.calls ?? [];
    const plans = live.plans ?? [];
    const r = new Runner((seed) => new LiveSim(first.home, first.away, seed, { ...asPlayed(live), calls, plans }), live.seed);
    let last = 0;
    // Past one write, short of the next: the ticks after the write are what a kill loses.
    const stopAt = LIVE_MATCH_SAVE_TICKS + 15;
    while (!r.finished && r.tick < stopAt) {
      r.step();
      if (liveMatchSaveDue(r.tick, last)) {
        live.onProgress?.(calls, r.tick, plans);
        last = r.tick;
      }
    }
    expect(r.tick).toBe(stopAt);
    expect(last).toBe(LIVE_MATCH_SAVE_TICKS);
    const rec = readLiveMatch()!;
    expect(rec.tick).toBe(LIVE_MATCH_SAVE_TICKS);
    expect(rec.calls).toEqual([]);
    expect(stopAt - rec.tick).toBeLessThan(LIVE_MATCH_SAVE_TICKS);
    clearHeldWeek();
    setState(JSON.parse(saved));
    advanceWeek();
    const again = started[1]!;
    expect(again.live!.seed).toBe(first.live!.seed);
    expect(again.live!.resumeAt).toBe(LIVE_MATCH_SAVE_TICKS);
    expect(again.live!.calls).toEqual([]);
    const done = watch(again);
    const straight = runMatch(first.home, first.away, { seed: first.live!.seed, ...asPlayed(first.live!) });
    expect(done.result).toEqual(straight);
    bus.emit('match:finished', { fixture: again.fixture, result: done.result! });
    expect(readLiveMatch()).toBeNull();
    expect(playerMatchPending()).toBe(false);
  }, 60_000);

  it('Save & exit leaves the week held, and resuming continues the same match with the same sheets and calls', () => {
    fakeStorage();
    newGame(42);
    const week = getState().week;
    advanceWeek();
    const first = started[0]!;
    const side = first.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const cut = watch(first, { side, call: 'shift-left' }, 80);
    expect(cut.result).toBeNull();
    expect(weekHeld()).toBe(true);
    expect(playerMatchPending()).toBe(true);
    expect(getState().week).toBe(week);
    // The week tick itself still refuses a held week, so nothing can skip the match.
    advanceWeek();
    expect(started).toHaveLength(1);
    expect(getState().week).toBe(week);
    expect(resumePlayerMatch()).toBe(true);
    expect(started).toHaveLength(2);
    const again = started[1]!;
    expect(again.live!.seed).toBe(first.live!.seed);
    expect(again.live!.resumeAt).toBe(cut.tick);
    expect(again.live!.calls).toEqual(cut.calls);
    expect(again.home).toBe(first.home);
    expect(again.away).toBe(first.away);
    const done = watch(again, { side, call: 'shift-left' });
    const straight = runMatch(first.home, first.away, { seed: first.live!.seed, ...asPlayed(first.live!), calls: [...done.calls] });
    expect(done.result).toEqual(straight);
    bus.emit('match:finished', { fixture: again.fixture, result: done.result! });
    expect(readLiveMatch()).toBeNull();
    expect(playerMatchPending()).toBe(false);
    expect(weekHeld()).toBe(false);
    expect(getState().week).toBe(week + 1);
  }, 60_000);

  it('a full storage does not claim the record was written, and the previous record stays', () => {
    fakeStorage();
    newGame(42);
    advanceWeek();
    const live = started[0]!.live!;
    expect(readLiveMatch()!.tick).toBe(0);
    const storage = (globalThis as { localStorage: { setItem: (k: string, v: string) => void } }).localStorage;
    storage.setItem = () => { throw new Error('full'); };
    expect(writeLiveMatch({ ...readLiveMatch()!, tick: 40 })).toBe(false);
    expect(live.onProgress?.(live.calls ?? [], 80, live.plans ?? [])).toBe(false);
    // The kick-off record is still what a reload would resume.
    expect(readLiveMatch()!.tick).toBe(0);
    expect(playerMatchPending()).toBe(true);
    expect(weekHeld()).toBe(true);
    // The match can still be finished; the failed write did not trap the week.
    bus.emit('match:finished', {
      fixture: started[0]!.fixture,
      result: {
        homeScore: 0, awayScore: 0, events: [], injuries: [],
        stats: { possession: [0, 0], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
        weather: live.weather, momentumTimeline: [],
      },
    });
    expect(weekHeld()).toBe(false);
    expect(playerMatchPending()).toBe(false);
  });

  it('a corrupt record is ignored, and Resume still continues the parked match', () => {
    fakeStorage();
    newGame(42);
    advanceWeek();
    const first = started[0]!;
    const side = first.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const cut = watch(first, { side, call: 'shift-left' }, 80);
    expect(readLiveMatch()!.tick).toBe(cut.tick);
    expect(isLiveMatchRecord({ season: 1, week: 1, seed: 1 })).toBe(false);
    (globalThis as { localStorage: { setItem: (k: string, v: string) => void } }).localStorage.setItem('nrl-live-match-1', '{');
    expect(readLiveMatch()).toBeNull();
    expect(playerMatchPending()).toBe(true);
    expect(resumePlayerMatch()).toBe(true);
    const again = started[1]!;
    expect(again.live!.resumeAt).toBe(cut.tick);
    expect(again.live!.calls).toEqual(cut.calls);
    expect(again.live!.seed).toBe(first.live!.seed);
  });

  it('a record missing its calls does not throw when the week starts again', () => {
    fakeStorage();
    newGame(42);
    const saved = JSON.stringify(getState());
    advanceWeek();
    clearHeldWeek();
    setState(JSON.parse(saved));
    (globalThis as { localStorage: { setItem: (k: string, v: string) => void } }).localStorage.setItem(
      'nrl-live-match-1',
      JSON.stringify({ season: getState().season, week: getState().week, seed: started[0]!.live!.seed }),
    );
    expect(readLiveMatch()).toBeNull();
    expect(() => advanceWeek()).not.toThrow();
    expect(started).toHaveLength(2);
    expect(started[1]!.live!.resumeAt).toBeUndefined();
    expect(started[1]!.live!.calls).toEqual([]);
  });

  it('fast-forward does not skip a parked match or wait on it', async () => {
    fakeStorage();
    newGame(42);
    const week = getState().week;
    advanceWeek();
    expect(playerMatchPending()).toBe(true);
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {});
    expect(run.weeksPlayed).toBe(0);
    expect(run.stop).toEqual({ kind: 'stopped', text: MATCH_STILL_ON_TEXT });
    expect(getState().week).toBe(week);
    expect(weekHeld()).toBe(true);
    expect(started).toHaveLength(1);
  });

  it('a change of plan at half-time (N11) changes the match, and the match with its plan is what counts', () => {
    newGame(42);
    advanceWeek();
    const s = started[0]!;
    const side = s.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const { result, plans } = watch(s, undefined, Infinity, { side: side as 'home' | 'away', tactics: { attack: 'expansive', defence: 'rush' } });
    expect(plans).toHaveLength(1);
    const opts = { seed: s.live!.seed, ...asPlayed(s.live!) };
    const plain = runMatch(s.home, s.away, opts);
    expect(result!.events).not.toEqual(plain.events);
    // The first half is the same match: the plan comes in at the second half's kick-off.
    const firstHalf = (r: MatchResult): unknown[] => r.events.filter((e) => e.t < NINES.halfMinutes);
    expect(firstHalf(plain).length).toBeGreaterThan(10);
    expect(firstHalf(result!)).toEqual(firstHalf(plain));
    expect(runMatch(s.home, s.away, { ...opts, plans: [...plans] })).toEqual(result);
  }, 30_000);

  it('a killed app resumes after half-time with the plan change already made', () => {
    fakeStorage();
    newGame(42);
    const saved = JSON.stringify(getState());
    advanceWeek();
    const first = started[0]!;
    const side = first.fixture.homeId === PLAYER_ID ? 'home' : 'away';
    const plan = { side: side as 'home' | 'away', tactics: { attack: 'grind', defence: 'compressed' } as TeamTactics };
    const cut = watch(first, undefined, 16000, plan);
    expect(cut.result).toBeNull();
    const rec = readLiveMatch()!;
    expect(rec.plans).toEqual(cut.plans);
    expect(rec.plans).toHaveLength(1);
    clearHeldWeek();
    setState(JSON.parse(saved));
    advanceWeek();
    const again = started[1]!;
    expect(again.live!.resumeAt).toBe(cut.tick);
    expect(again.live!.plans).toEqual(rec.plans);
    const done = watch(again, undefined, Infinity, plan);
    expect(done.plans).toHaveLength(1);
    const straight = runMatch(first.home, first.away, { seed: first.live!.seed, ...asPlayed(first.live!), plans: [...done.plans] });
    expect(done.result).toEqual(straight);
  }, 60_000);

  it('fast-forward plays headless, and a whole season plays end to end', () => {
    newGame(7);
    const season = getState().season;
    for (let i = 0; i < SEASON_ROUNDS + 8 && getState().season === season; i++) advanceWeeks(1);
    expect(started).toHaveLength(0);
    expect(weekHeld()).toBe(false);
    const mine = getState().league.fixtures.filter((f) => f.round <= SEASON_ROUNDS && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID));
    expect(mine.length).toBeGreaterThan(0);
    for (const f of mine) expect(f.result).toBeDefined();
  }, 180_000);
});
