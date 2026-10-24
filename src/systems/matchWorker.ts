// src/systems/matchWorker.ts — a Web Worker that plays matches on the live sim
// off the main thread, so the page keeps painting and taking taps: the rival
// round (N9.2) and the player's fast-forwarded match (N10.3). Receives
// MatchJob[], posts back MatchResult[] in the same order. A replay of a try
// (N15.5) is one object with kind 'replay', answered the same way: the array
// protocol is unchanged. It imports the match sim only: no game state, no DOM.
import { replayRange } from '../match/core/engine';
import { LiveSim } from '../match/league/live';
import { runMatch } from '../match/league/match';
import type { MatchJob, ReplayRequest } from './matchJobs';

self.onmessage = (e: MessageEvent<MatchJob[] | ReplayRequest>): void => {
  const data = e.data;
  if (!Array.isArray(data) && data?.kind === 'replay') {
    const snaps = replayRange((seed) => new LiveSim(data.home, data.away, seed, data.opts), data.seed, data.from, data.to);
    self.postMessage({ kind: 'replay', snaps });
    return;
  }
  self.postMessage((data as MatchJob[]).map((job) => runMatch(job.home, job.away, job.opts)));
};
