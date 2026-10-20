// tests/systems/matchWorker.test.ts — the player's fast-forwarded match in the Worker
// (N10.3). The tests have no Worker, so a stub plays the jobs exactly as
// matchWorker.ts does (runMatch on each job, results back in a later task): an
// async advance that holds each match week for it must end in the same state,
// byte for byte, as one that plays in place; a failing Worker falls back in place.
import { describe, it, expect, afterEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, registerTickHook, resumeWeek, TICK_ORDER, weekHeld, withFastForward } from '../../src/core/time';
import { advanceUntil } from '../../src/core/advance';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { registerAllSystems } from '../../src/qa/soak';
import { runMatch } from '../../src/match/league/match';
import { teamSheetFromRival } from '../../src/match/league/sheets';
import { playMatchesInWorker, type MatchJob } from '../../src/systems/matchJobs';

type Mode = 'play' | 'error';
const g = globalThis as { Worker?: unknown; window?: unknown };
let posted = 0;

/** A Worker that plays its jobs as matchWorker.ts does, one task later (or fails). */
function stubWorker(mode: Mode): void {
  g.window ??= {};
  g.Worker = class {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    postMessage(jobs: MatchJob[]): void {
      posted++;
      const copy = structuredClone(jobs);
      setTimeout(() => {
        if (mode === 'error') this.onerror?.();
        else this.onmessage?.({ data: structuredClone(copy.map((j) => runMatch(j.home, j.away, j.opts))) });
      }, 0);
    }
    terminate(): void {}
  };
}

function newGame(seed: number): void {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  clearHeldWeek();
  createNewGame('Worker FC', seed);
  initLeague(getState());
  registerAllSystems();
}

afterEach(() => {
  delete g.Worker;
  delete g.window;
  posted = 0;
  clearHeldWeek();
});

/** Four fast-forwarded weeks through the async advance; the state after them. */
async function fourWeeks(seed: number): Promise<string> {
  newGame(seed);
  const run = await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {});
  expect(run.weeksPlayed).toBeGreaterThan(0);
  return JSON.stringify({ ...getState(), rngSeed: getState().rngSeed, weeks: run.weeksPlayed });
}

describe('the fast-forwarded match in the Worker (N10.3)', () => {
  it("the Worker's result equals runMatch in place, byte for byte, on 20 seeds", () => {
    createNewGame('Clone', 1);
    initLeague(getState());
    const clubs = getState().league.clubs.filter((c) => c.id !== PLAYER_ID);
    for (let seed = 1; seed <= 20; seed++) {
      const home = teamSheetFromRival(clubs[seed % clubs.length]!);
      const away = teamSheetFromRival(clubs[(seed + 3) % clubs.length]!);
      const opts = { seed: seed * 7919, weather: 'clear' as const };
      const here = runMatch(home, away, opts);
      // What crosses the Worker boundary is a structured clone of the sheets and of the result.
      const there = structuredClone(runMatch(structuredClone(home), structuredClone(away), structuredClone(opts)));
      expect(JSON.stringify(there)).toBe(JSON.stringify(here));
    }
  }, 120_000);

  it('an async advance that plays each match in the Worker ends exactly where one in place does', async () => {
    const inPlace = await fourWeeks(31);
    stubWorker('play');
    const viaWorker = await fourWeeks(31);
    expect(posted).toBeGreaterThan(0);
    expect(viaWorker).toBe(inPlace);
  }, 120_000);

  it('a failing Worker: the match is played here, the same state', async () => {
    const inPlace = await fourWeeks(47);
    stubWorker('error');
    const fallback = await fourWeeks(47);
    expect(posted).toBeGreaterThan(0);
    expect(fallback).toBe(inPlace);
  }, 120_000);

  it('playMatchesInWorker without a Worker plays in place', async () => {
    createNewGame('Here', 2);
    initLeague(getState());
    const [a, b] = getState().league.clubs.filter((c) => c.id !== PLAYER_ID);
    const job: MatchJob = { home: teamSheetFromRival(a!), away: teamSheetFromRival(b!), opts: { seed: 5 } };
    stubWorker('error');
    expect(await playMatchesInWorker([job], 60_000)).toEqual([runMatch(job.home, job.away, job.opts)]);
  }, 60_000);
});

describe('holds under fast-forward (N10.3)', () => {
  it('a fast-forwarded week can hold only when the caller allows it', () => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    createNewGame('Hold', 3);
    const seen: boolean[] = [];
    registerTickHook('probe', TICK_ORDER.match, (ctx) => void seen.push(ctx.hold !== undefined));
    withFastForward(() => advanceWeek());
    withFastForward(() => advanceWeek(), { holds: true });
    expect(seen).toEqual([false, true]);
    setState({});
  });

  it('a held fast-forwarded week stays held until resumed, and keeps fastForward for the rest of it', () => {
    bus.clear();
    clearTickHooks();
    clearSeasonHooks();
    clearHeldWeek();
    createNewGame('Hold', 4);
    const later: boolean[] = [];
    registerTickHook('holder', TICK_ORDER.match, (ctx) => ctx.hold?.());
    registerTickHook('after', TICK_ORDER.ladder, (ctx) => void later.push(ctx.fastForward));
    const week = getState().week;
    withFastForward(() => advanceWeek(), { holds: true });
    expect(weekHeld()).toBe(true);
    expect(getState().week).toBe(week);
    expect(later).toEqual([]);
    resumeWeek(); // outside withFastForward, as the Worker's answer is
    expect(weekHeld()).toBe(false);
    expect(later).toEqual([true]);
    expect(getState().week).toBe(week + 1);
  });
});
