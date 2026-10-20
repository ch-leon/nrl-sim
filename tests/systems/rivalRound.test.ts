// tests/systems/rivalRound.test.ts — rival rounds on the live sim (N9.2): with
// "Rival matches on the match engine" on, an interactive week plays the rival
// fixtures on the live sim (here on the main thread: the tests have no Worker),
// with the same results as runMatch on their seeds, and the rivals' players get
// the games, stats and injuries; fast-forward and the default keep the cheap sim.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearTickHooks, clearSeasonHooks, registerTickHook, resumeWeek, TICK_ORDER } from '../../src/core/time';
import type { GameState } from '../../src/core/state';
import { initLeague, PLAYER_ID, registerFixturesSystem, simulateRivalRound } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { playRivalJob, playRivalJobsInWorker, rivalJobs } from '../../src/systems/rivalRound';
import { makeRng } from '../../src/utils/rng';

/** The state just before the rival round runs (a hook of the same order registered first). */
let atRivals: GameState | null = null;

function newGame(liveRivals: boolean): void {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Rivals FC', 92);
  initLeague(getState());
  atRivals = null;
  registerTickHook('spy', TICK_ORDER.match, () => void (atRivals = getState()));
  registerFixturesSystem();
  registerPlayerMatchSystem();
  setState({ settings: { ...getState().settings, liveRivals } });
}

const rivalFixtures = (round: number) =>
  getState().league.fixtures.filter((f) => f.round === round && f.homeId !== PLAYER_ID && f.awayId !== PLAYER_ID);

describe('rival rounds on the live sim (N9.2)', () => {
  beforeEach(() => clearHeldWeek());

  it('on: the rival fixtures are played on the live sim, with their players’ games, stats and injuries', () => {
    newGame(true);
    const round = getState().week;
    advanceWeek(); // the player's match holds the week; the rival round has already landed
    // The jobs the hook built, from the same state and dice.
    const before = atRivals!;
    const jobs = rivalJobs(before, makeRng(before.rngSeed), PLAYER_ID);
    expect(jobs.length).toBeGreaterThan(0);
    const expected = jobs.map(playRivalJob);
    for (const [i, job] of jobs.entries()) {
      const f = getState().league.fixtures.find((x) => x.round === round && x.homeId === job.homeId)!;
      expect(f.result).toEqual({ homeScore: expected[i]!.homeScore, awayScore: expected[i]!.awayScore });
    }
    // Every rival starter who played has a game on his record; a rival's injuries land on its squad.
    const job = jobs[0]!;
    const club = getState().league.clubs.find((c) => c.id === job.homeId)!;
    for (const r of job.home.roster ?? []) {
      if (!r.id) continue;
      expect(club.squad!.find((p) => p.id === r.id)!.career?.games).toBe(1);
    }
    const hurt = expected.flatMap((r) => r.injuries).filter((x) => x.playerId);
    for (const h of hurt) {
      const p = getState().league.clubs.find((c) => c.id === h.teamId)!.squad!.find((x) => x.id === h.playerId)!;
      expect(p.injuredWeeks).toBeGreaterThanOrEqual(h.weeks);
    }
    resumeWeek();
  }, 60_000);

  it('the scores sit on the cheap sim’s scale: about 30 a match', () => {
    newGame(true);
    advanceWeek();
    const fs = rivalFixtures(getState().week);
    const pts = fs.reduce((a, f) => a + f.result!.homeScore + f.result!.awayScore, 0) / fs.length;
    expect(pts).toBeGreaterThan(12);
    expect(pts).toBeLessThan(55);
    resumeWeek();
  }, 60_000);

  it('off (the default) and fast-forward: the cheap sim', () => {
    newGame(false);
    advanceWeek();
    const s = atRivals!;
    const cheap = simulateRivalRound(s, makeRng(s.rngSeed));
    for (const f of rivalFixtures(s.week)) {
      const c = cheap.league.fixtures.find((x) => x.round === f.round && x.homeId === f.homeId)!;
      expect(f.result).toEqual(c.result);
    }
    resumeWeek();
    newGame(true);
    advanceWeeks(1);
    const t = atRivals!;
    const cheapT = simulateRivalRound(t, makeRng(t.rngSeed));
    for (const f of getState().league.fixtures.filter((x) => x.round === t.week && x.homeId !== PLAYER_ID && x.awayId !== PLAYER_ID)) {
      const c = cheapT.league.fixtures.find((x) => x.round === f.round && x.homeId === f.homeId)!;
      expect(f.result).toEqual(c.result);
    }
  }, 60_000);
});

describe('the rival round worker falls back to the main thread', () => {
  const real = (globalThis as { Worker?: unknown }).Worker;
  afterEach(() => {
    (globalThis as { Worker?: unknown }).Worker = real;
    vi.useRealTimers();
  });
  /** A stand-in Worker that never answers, or fails as soon as it gets the jobs. */
  const stub = (mode: 'hang' | 'error' | 'throw' | 'short') =>
    class {
      onmessage: ((e: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      terminated = false;
      postMessage(): void {
        if (mode === 'throw') throw new Error('DataCloneError');
        if (mode === 'error') setTimeout(() => this.onerror?.(), 0);
        if (mode === 'short') setTimeout(() => this.onmessage?.({ data: [] }), 0);
      }
      terminate(): void {
        this.terminated = true;
      }
    };
  const someJobs = () => {
    newGame(true);
    return rivalJobs(getState(), makeRng(5), PLAYER_ID).slice(0, 1);
  };

  it('a worker that never answers: played here after the timeout, same results', async () => {
    const jobs = someJobs();
    (globalThis as { Worker?: unknown }).Worker = stub('hang');
    vi.useFakeTimers();
    const p = playRivalJobsInWorker(jobs, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await p).toEqual(jobs.map(playRivalJob));
  }, 60_000);

  it('a worker that fails: played here, same results', async () => {
    const jobs = someJobs();
    (globalThis as { Worker?: unknown }).Worker = stub('error');
    expect(await playRivalJobsInWorker(jobs, 60_000)).toEqual(jobs.map(playRivalJob));
  }, 60_000);

  it('postMessage throwing (a DataCloneError): played here, same results', async () => {
    const jobs = someJobs();
    (globalThis as { Worker?: unknown }).Worker = stub('throw');
    expect(await playRivalJobsInWorker(jobs, 60_000)).toEqual(jobs.map(playRivalJob));
  }, 60_000);

  it('a worker answering with no results: every rival fixture is still played, and the week resumes', async () => {
    const g = globalThis as { Worker?: unknown; window?: unknown };
    const hadWindow = 'window' in g;
    g.Worker = stub('short');
    if (!hadWindow) g.window = {};
    try {
      newGame(true);
      const round = getState().week;
      advanceWeek(); // the player's match and the rival round both hold the week
      expect(rivalFixtures(round).some((f) => !f.result)).toBe(true); // went to the (stub) worker, not played in place
      const before = atRivals!;
      const expected = rivalJobs(before, makeRng(before.rngSeed), PLAYER_ID).map(playRivalJob);
      await vi.waitFor(() => expect(rivalFixtures(round).every((f) => f.result)).toBe(true), { timeout: 60_000 });
      const fs = rivalFixtures(round);
      expect(fs.map((f) => f.result!.homeScore)).toEqual(expected.map((r) => r.homeScore));
      resumeWeek(); // the player's match
      expect(getState().week).toBe(round + 1);
    } finally {
      if (!hadWindow) delete g.window;
    }
  }, 120_000);
});
