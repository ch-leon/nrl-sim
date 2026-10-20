// src/systems/matchJobs.ts — matches played off the main thread (N9.2, N10.3).
// A job is two sheets and the match options; the answer is runMatch's result,
// byte for byte. Browsers play the jobs in one Web Worker for the session
// (matchWorker.ts), in the order asked; Node, the tests and the soak have none
// and play them in place. A worker that fails or stays silent past a timeout is
// dropped and everything it owed is played here; a post that throws plays that
// request here. The same results either way, later.
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

/** A request waiting on the shared worker's answer. */
interface Pending {
  jobs: readonly MatchJob[];
  resolve: (results: MatchResult[]) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * One worker for the session (N10.3), so its match sim is loaded once, not every
 * week: it answers in the order it was asked, so replies match the queue's head.
 */
let shared: { worker: Worker; ctor: unknown; queue: Pending[] } | null = null;

/** Drop the shared worker and play everything it still owes here (it failed or hung). */
function abandonWorker(): void {
  const s = shared;
  if (!s) return;
  shared = null;
  s.worker.terminate();
  for (const p of s.queue) {
    clearTimeout(p.timer);
    p.resolve(p.jobs.map(playMatchJob));
  }
}

function sharedWorker(): NonNullable<typeof shared> {
  // A different Worker constructor (the tests swap it) starts afresh.
  if (shared && shared.ctor !== Worker) abandonWorker();
  if (shared) return shared;
  const worker = new Worker(new URL('./matchWorker.ts', import.meta.url), { type: 'module' });
  const s = { worker, ctor: Worker as unknown, queue: [] as Pending[] };
  worker.onmessage = (e: MessageEvent<MatchResult[]>) => {
    const p = s.queue.shift();
    if (!p) return;
    clearTimeout(p.timer);
    p.resolve(e.data);
  };
  worker.onerror = () => { if (shared === s) abandonWorker(); };
  shared = s;
  return s;
}

/** Play the jobs in the Web Worker; on any failure or silence past `timeoutMs`, play them here instead. */
export function playMatchesInWorker(jobs: readonly MatchJob[], timeoutMs: number): Promise<MatchResult[]> {
  return new Promise((resolve) => {
    let s: NonNullable<typeof shared>;
    try {
      s = sharedWorker();
    } catch {
      resolve(jobs.map(playMatchJob));
      return;
    }
    // A worker that never answers doesn't hold the week for good: give it up and play here.
    const timer = setTimeout(() => { if (shared === s) abandonWorker(); }, timeoutMs);
    const pending: Pending = { jobs, resolve, timer };
    s.queue.push(pending);
    try {
      s.worker.postMessage(jobs);
    } catch {
      // Not cloneable (a DataCloneError): this request is played here; the worker carries on.
      s.queue.splice(s.queue.indexOf(pending), 1);
      clearTimeout(timer);
      resolve(jobs.map(playMatchJob));
    }
  });
}
