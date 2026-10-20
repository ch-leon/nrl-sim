// src/systems/matchJobs.ts — matches played off the main thread (N9.2, N10.3).
// A job is two sheets and the match options; the answer is runMatch's result,
// byte for byte. Browsers play the jobs in a Web Worker (matchWorker.ts); Node,
// the tests and the soak have none and play them in place. A worker that fails,
// throws on the post or stays silent past the timeout is replaced by playing the
// jobs here: the same results, later.
import type { MatchResult, TeamSheet } from '../sim/events';
import { runMatch, type RunMatchOptions } from '../match/league/match';

/** One match to play: the sides and the options runMatch takes (all structured-cloneable). */
export interface MatchJob {
  home: TeamSheet;
  away: TeamSheet;
  opts: RunMatchOptions;
}

/** Play one job here, headless. */
export function playMatchJob(job: MatchJob): MatchResult {
  return runMatch(job.home, job.away, job.opts);
}

/** Whether this runtime can play matches in a Web Worker (browsers; not Node or the tests). */
export function canUseWorker(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined';
}

/** Play the jobs in a Web Worker; on any failure or silence past `timeoutMs`, play them here instead. */
export function playMatchesInWorker(jobs: readonly MatchJob[], timeoutMs: number): Promise<MatchResult[]> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./matchWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(jobs.map(playMatchJob));
      return;
    }
    let settled = false;
    const done = (results: () => MatchResult[]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(results());
    };
    // A worker that never answers doesn't hold the week for good: play them here instead.
    const timer = setTimeout(() => done(() => jobs.map(playMatchJob)), timeoutMs);
    worker.onmessage = (e: MessageEvent<MatchResult[]>) => done(() => e.data);
    worker.onerror = () => done(() => jobs.map(playMatchJob));
    try {
      worker.postMessage(jobs);
    } catch {
      done(() => jobs.map(playMatchJob));
    }
  });
}
