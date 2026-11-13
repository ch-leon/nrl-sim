import { afterEach, expect, it, vi } from 'vitest';
import type { MatchJob, ReplayRequest } from '../../src/systems/matchJobs';
import type { TeamSheet } from '../../src/sim/events';

const sheet = (clubId: string): TeamSheet => ({ clubId, name: clubId, attack: 60, defense: 60, kicking: 60, fitness: 60, colors: ['#111', '#eee'] });
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it.each([100, 80, 60] as const)('freezes %sm into each match worker name and keeps fallback results identical', async length => {
  vi.resetModules();
  vi.stubGlobal('name', length === 100 ? 'match-background' : `match-background--field-${length}`);
  const { FIELD_LENGTH } = await import('../../src/match/core/field');
  const { playMatchesInWorker, playReplayInWorker, playMatchJob } = await import('../../src/systems/matchJobs');
  expect(FIELD_LENGTH).toBe(length);
  const names: string[] = [];
  const requests: unknown[] = [];
  let fail = false;
  vi.stubGlobal('window', {});
  vi.stubGlobal('Worker', class {
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_url: URL, options: WorkerOptions) { names.push(options.name!); }
    postMessage(request: MatchJob[] | ReplayRequest): void {
      requests.push(request);
      queueMicrotask(() => {
        if (fail) return this.onerror?.();
        this.onmessage?.({ data: Array.isArray(request) ? request.map(playMatchJob) : { kind: 'replay', snaps: [] } });
      });
    }
    terminate(): void {}
  });
  const jobs = [{ home: sheet('H'), away: sheet('A'), opts: { seed: 127 } }];
  const here = jobs.map(playMatchJob);
  expect(await playMatchesInWorker(jobs, 10_000, 'background')).toEqual(here);
  fail = true;
  expect(await playMatchesInWorker(jobs, 10_000, 'skip')).toEqual(here);
  fail = false;
  const replay = { home: jobs[0]!.home, away: jobs[0]!.away, opts: {}, seed: 127, from: 0, to: 1 };
  expect(await playReplayInWorker(replay, 10_000)).toEqual([]);
  const suffix = length === 100 ? '' : `--field-${length}`;
  expect(names).toEqual(['match-background', 'match-skip', 'match-replay'].map(name => name + suffix));
  expect(requests[0]).toEqual(jobs);
  expect(requests[2]).toEqual({ kind: 'replay', ...replay });
  vi.stubGlobal('Worker', class { constructor() { throw new Error('Worker blocked'); } });
  expect(await playMatchesInWorker(jobs, 10_000, 'background')).toEqual(here);
  expect(await playReplayInWorker(replay, 10_000)).toBeNull();
}, 30_000);
