// tests/systems/setPlaysClub.test.ts — set plays from the club side (#326, plan
// §10 phase 2 "done when", §11): a new club hires the direct coach, buys the
// block play, takes it in, and its half calls it in the match ("Smith calls
// the block play"); the club's sheet carries the three it owns, in order, and
// nothing when it takes none; a killed app resumes the match with them; a v22
// export loads with no coach and no plays; and the soak's v22 save lacks both.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLegacyGame } from '../helpers/legacyGame';
import { bus, type LiveMatchData } from '../../src/core/events';
import { getState, setState, SAVE_VERSION, type Fixture } from '../../src/core/state';
import { importSave, migrateState, MIGRATIONS } from '../../src/core/save';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { readLiveMatch } from '../../src/systems/liveMatchRecord';
import { hireAttackCoach, releaseStaff } from '../../src/systems/staff';
import { buyPlay, ownedPlays, togglePlay } from '../../src/systems/playbook';
import { asOldSave } from '../../src/qa/soak';
import { MatchRecorder, runMatch } from '../../src/match/league/match';
import { Runner } from '../../src/match/core/engine';
import { LiveSim } from '../../src/match/league/live';
import { Commentator } from '../../src/match/view/commentary';
import type { CallInput } from '../../src/match/league/calls';
import type { PlayId } from '../../src/data/plays';
import type { MatchResult, TeamSheet } from '../../src/sim/events';
import type { SimEvent } from '../../src/match/core/snapshot';

interface Started { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData }

function newClub(seed = 42): void {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createLegacyGame('Playbook FC', seed);
  initLeague(getState());
  registerPlayerMatchSystem();
  setState({ money: 500_000, reputation: 60 });
}

function kickOff(): Started {
  let match: Started | undefined;
  const off = bus.on('match:started', (m) => { match = m as Started; });
  advanceWeek();
  off();
  expect(match).toBeDefined();
  return match!;
}

const mine = (m: Started): TeamSheet => (m.home.clubId === PLAYER_ID ? m.home : m.away);
const mySide = (m: Started): 'home' | 'away' => (m.home.clubId === PLAYER_ID ? 'home' : 'away');

/** The options the Match scene plays a live match with. */
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

/** Play the match as LivePlayback does, keeping every sim event (the log's source); stop at `stopAt` like a killed app. */
function watch(s: Started, stopAt = Infinity): { result: MatchResult | null; events: SimEvent[]; tick: number } {
  const live = s.live;
  const calls: CallInput[] = live.calls ?? [];
  const plans = live.plans ?? [];
  const rec = new MatchRecorder({ home: s.home.clubId, away: s.away.clubId });
  const events: SimEvent[] = [];
  const r = new Runner((seed) => new LiveSim(s.home, s.away, seed, { ...asPlayed(live), calls, plans }), live.seed);
  r.onEvents = (evs) => { rec.add(evs, r.cur); events.push(...evs); };
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  while (!r.finished && r.tick < stopAt) r.step();
  if (!r.finished) {
    live.onProgress?.(calls, r.tick, plans);
    return { result: null, events, tick: r.tick };
  }
  return { result: rec.result(r.current as LiveSim), events, tick: r.tick };
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

afterEach(() => {
  clearHeldWeek();
  clearTickHooks();
  clearSeasonHooks();
  bus.clear();
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('hire the direct coach, buy the block play, take it in: the half calls it (plan §10 phase 2)', () => {
  beforeEach(() => newClub());

  it('the log has "<halfback> calls the block play" for the club’s side', () => {
    expect(hireAttackCoach('direct')).not.toBeNull();
    expect(buyPlay('block-play')).toBe(true);
    setState({ lineup: togglePlay(getState().lineup, 'block-play', ownedPlays(getState())) });
    const m = kickOff();
    expect(mine(m).plays).toEqual(['block-play']);
    // The live match data is unchanged by plays: the sheet carries them.
    expect(m.live).not.toHaveProperty('plays');
    const side = mySide(m);
    const { result, events } = watch(m);
    const called = events.filter((e) => e.kind === 'set-play' && e.side === side && e.detail === 'block-play');
    expect(called.length).toBeGreaterThan(0);
    const halfback = mine(m).roster![5]!.name;
    expect(called.some((e) => e.text === `${halfback} calls the block play`)).toBe(true);
    // The commentary line the log reads off it names the man and the play.
    const say = new Commentator(m.live.seed, { home: m.home.name, away: m.away.name }, { home: m.home, away: m.away });
    const lines = events.map((e) => say.line(e));
    const calledLines = events.flatMap((e, i) => (called.includes(e) ? [lines[i]!] : []));
    expect(calledLines.length).toBe(called.length);
    for (const l of calledLines) expect(l).toContain('the block play');
    // The rival carries no plays in phase 2 (rivals are phase 4).
    const theirs = m.home.clubId === PLAYER_ID ? m.away : m.home;
    expect(theirs).not.toHaveProperty('plays');
    expect(events.some((e) => e.kind === 'set-play' && e.side !== side)).toBe(false);
    // The match on screen is the result, as with every live match.
    expect(result).toEqual(runMatch(m.home, m.away, { seed: m.live.seed, ...asPlayed(m.live) }));
  }, 60_000);
});

describe('the club’s sheet carries the three it owns (teamSheetFromSquad, matchday)', () => {
  beforeEach(() => newClub());

  it('only owned plays, at most three, in the coach’s order; none taken = no plays on the sheet at all', () => {
    hireAttackCoach('direct');
    for (const id of ['block-play', 'inside-ball', 'short-side-raid'] as PlayId[]) expect(buyPlay(id)).toBe(true);
    // An unowned play and a dropped id slipped into the saved lineup are left out at kick-off.
    setState({ lineup: { ...getState().lineup, plays: ['short-side-raid', 'cut-out-winger', 'block-play', 'gone-play' as PlayId, 'inside-ball'] } });
    const m = kickOff();
    expect(mine(m).plays).toEqual(['short-side-raid', 'block-play', 'inside-ball']);
  }, 30_000);

  it('a club with a coach and plays bought but none taken runs out the sheet it always did', () => {
    hireAttackCoach('direct');
    buyPlay('block-play');
    const m = kickOff();
    expect(mine(m)).not.toHaveProperty('plays');
  }, 30_000);

  it('releasing the coach keeps the play bought and taken: it still runs out', () => {
    hireAttackCoach('direct');
    buyPlay('block-play');
    setState({ lineup: togglePlay(getState().lineup, 'block-play', ownedPlays(getState())) });
    releaseStaff('attackCoach');
    expect(getState().playbook.owned).toEqual(['block-play']);
    const m = kickOff();
    expect(mine(m).plays).toEqual(['block-play']);
  }, 30_000);
});

describe('a killed app resumes the match with the plays (plan §8)', () => {
  it('the same sheet, the same match, the same full time', () => {
    fakeStorage();
    newClub();
    hireAttackCoach('direct');
    buyPlay('block-play');
    buyPlay('inside-ball');
    setState({ lineup: { ...getState().lineup, plays: ['block-play', 'inside-ball'] } });
    const saved = JSON.stringify(getState()); // the game saves only at a week's end
    const first = kickOff();
    expect(mine(first).plays).toEqual(['block-play', 'inside-ball']);
    const cut = watch(first, 4000);
    expect(cut.result).toBeNull();
    expect(readLiveMatch()!.tick).toBe(cut.tick);
    // Killed: back to the saved week, advance again: the same match, resumed with the same three.
    clearHeldWeek();
    setState(JSON.parse(saved));
    const again = kickOff();
    expect(again.live.seed).toBe(first.live.seed);
    expect(again.live.resumeAt).toBe(cut.tick);
    expect(mine(again)).toEqual(mine(first));
    const done = watch(again);
    expect(done.result).toEqual(runMatch(first.home, first.away, { seed: first.live.seed, ...asPlayed(first.live) }));
  }, 60_000);
});

describe('save v23 (plan §2.3, §8)', () => {
  beforeEach(() => newClub());

  it('one migration step, v22 → v23, fills an empty playbook and an empty three', () => {
    expect(SAVE_VERSION).toBe(26);
    expect(MIGRATIONS.filter((m) => m.from === 22 && m.to === 23)).toHaveLength(1);
    const step = MIGRATIONS.find((m) => m.from === 22)!;
    const raw = { version: 22, lineup: { starters: [], bench: [] }, staff: [] };
    const out = step.run(raw);
    expect(out).toEqual({ version: 22, lineup: { starters: [], bench: [], plays: [] }, staff: [], playbook: { owned: [] } });
    expect(raw).toEqual({ version: 22, lineup: { starters: [], bench: [] }, staff: [] }); // never mutates
  });

  it('a v22 export requires a new career without installing plays', () => {
    const old = JSON.stringify(asOldSave(getState(), 22));
    const before = getState();
    expect(importSave(old)).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
    expect(getState()).toBe(before);
  });

  it('asOldSave strips the playbook and the three below 23 and keeps both at 23', () => {
    hireAttackCoach('direct');
    buyPlay('block-play');
    setState({ lineup: togglePlay(getState().lineup, 'block-play', ownedPlays(getState())) });
    const at23 = asOldSave(getState(), 23);
    expect(at23.playbook).toEqual({ owned: ['block-play'] });
    expect((at23.lineup as { plays: PlayId[] }).plays).toEqual(['block-play']);
    for (const v of [22, 14, 12]) {
      const old = asOldSave(getState(), v);
      expect(old, `v${v}`).not.toHaveProperty('playbook');
      if (old.lineup) expect(old.lineup as object, `v${v}`).not.toHaveProperty('plays');
      const back = migrateState(old);
      expect(back).toMatchObject({ ok: false, message: expect.stringMatching(/start a new career/i) });
    }
  });
});
