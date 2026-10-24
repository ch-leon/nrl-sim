// src/systems/matchJobs.ts — matches played off the main thread (N9.2, N10.3).
// A job is two sheets and the match options; the answer is runMatch's result,
// byte for byte. Browsers play the jobs in a Web Worker for the session
// (matchWorker.ts), one per lane, in the order asked; Node, the tests and the
// soak have none and play them in place. A worker that fails or stays silent past a timeout is
// dropped and everything it owed is played here; a post that throws plays that
// request here. The same results either way, later.
import type { Snapshot } from '../match/core/snapshot';
import type { LiveOptions } from '../match/league/live';
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

/** A request waiting on a lane's worker to answer. */
interface Pending {
  jobs: readonly MatchJob[];
  resolve: (results: MatchResult[]) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The lanes a job can queue in (N10.4). Each lane is its own worker, so a Skip the
 * player is waiting on never queues behind a rival round that is still being played.
 */
export type MatchLane = 'background' | 'skip';

/** A worker for the session, answering in the order it was asked: replies match the queue's head. */
interface Lane {
  worker: Worker;
  ctor: unknown;
  queue: Pending[];
}

/**
 * One worker per lane for the session (N10.3), so its match sim is loaded once, not
 * every week.
 */
const lanes = new Map<MatchLane, Lane>();

/** Drop a lane's worker and play everything it still owes here (it failed or hung). */
function abandonWorker(name: MatchLane, s: Lane): void {
  if (lanes.get(name) !== s) return;
  lanes.delete(name);
  s.worker.terminate();
  for (const p of s.queue) {
    clearTimeout(p.timer);
    p.resolve(p.jobs.map(playMatchJob));
  }
}

function laneWorker(name: MatchLane): Lane {
  // A different Worker constructor (the tests swap it) starts afresh.
  const had = lanes.get(name);
  if (had && had.ctor !== Worker) abandonWorker(name, had);
  const live = lanes.get(name);
  if (live) return live;
  // Named for its lane, so the e2e playthrough can slow the rival round's alone. Vite
  // wants the options written out, so one constructor per lane.
  const worker = name === 'skip'
    ? new Worker(new URL('./matchWorker.ts', import.meta.url), { type: 'module', name: 'match-skip' })
    : new Worker(new URL('./matchWorker.ts', import.meta.url), { type: 'module', name: 'match-background' });
  const s: Lane = { worker, ctor: Worker as unknown, queue: [] };
  worker.onmessage = (e: MessageEvent<MatchResult[]>) => {
    const p = s.queue.shift();
    if (!p) return;
    clearTimeout(p.timer);
    p.resolve(e.data);
  };
  worker.onerror = () => abandonWorker(name, s);
  lanes.set(name, s);
  return s;
}

/** A try's replay (N15.5): re-simulate one range off the main thread. Not a match job. */
export interface ReplayRequest {
  kind: 'replay';
  home: TeamSheet;
  away: TeamSheet;
  opts: LiveOptions;
  seed: number;
  from: number;
  to: number;
}

/** What the replay worker posts back. */
export interface ReplayResponse {
  kind: 'replay';
  snaps: Snapshot[];
}

/** The replay's own worker, so it never shares a lane's match-result queue. */
let replayLane: { worker: Worker; ctor: unknown; pending: ((snaps: Snapshot[] | null) => void) | null } | null = null;

function replayWorker(): NonNullable<typeof replayLane> {
  if (replayLane && replayLane.ctor !== Worker) {
    const stale = replayLane;
    replayLane = null;
    stale.pending?.(null);
    stale.worker.terminate();
  }
  if (replayLane) return replayLane;
  const worker = new Worker(new URL('./matchWorker.ts', import.meta.url), { type: 'module', name: 'match-replay' });
  const lane = { worker, ctor: Worker as unknown, pending: null as ((snaps: Snapshot[] | null) => void) | null };
  worker.onmessage = (e: MessageEvent<ReplayResponse>) => {
    if (!e.data || e.data.kind !== 'replay') return;
    const done = lane.pending;
    lane.pending = null;
    done?.(e.data.snaps);
  };
  worker.onerror = () => {
    const done = lane.pending;
    lane.pending = null;
    worker.terminate();
    if (replayLane === lane) replayLane = null;
    done?.(null);
  };
  replayLane = lane;
  return lane;
}

/**
 * Re-simulate a try's range in the replay worker. Null when this runtime has no
 * Worker, one replay is already in flight, or the worker fails or stays silent:
 * the caller plays the range here. The match lanes are left alone.
 */
export function playReplayInWorker(req: Omit<ReplayRequest, 'kind'>, timeoutMs: number): Promise<Snapshot[] | null> {
  if (!canUseWorker()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let lane: NonNullable<typeof replayLane>;
    try {
      lane = replayWorker();
    } catch {
      resolve(null);
      return;
    }
    if (lane.pending) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (snaps: Snapshot[] | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (lane.pending === finish) lane.pending = null;
      resolve(snaps);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      try {
        lane.worker.terminate();
      } catch {
        // Already gone.
      }
      if (replayLane === lane) replayLane = null;
      finish(null);
    }, timeoutMs);
    lane.pending = finish;
    try {
      lane.worker.postMessage({ kind: 'replay', ...req } satisfies ReplayRequest);
    } catch {
      finish(null);
    }
  });
}

/** Play the jobs in the lane's Web Worker; on any failure or silence past `timeoutMs`, play them here instead. */
export function playMatchesInWorker(jobs: readonly MatchJob[], timeoutMs: number, lane: MatchLane = 'background'): Promise<MatchResult[]> {
  return new Promise((resolve) => {
    let s: Lane;
    try {
      s = laneWorker(lane);
    } catch {
      resolve(jobs.map(playMatchJob));
      return;
    }
    // A worker that never answers doesn't hold the week for good: give it up and play here.
    const timer = setTimeout(() => abandonWorker(lane, s), timeoutMs);
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
