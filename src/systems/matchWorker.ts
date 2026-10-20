// src/systems/matchWorker.ts — a Web Worker that plays matches on the live sim
// off the main thread, so the page keeps painting and taking taps: the rival
// round (N9.2) and the player's fast-forwarded match (N10.3). Receives
// MatchJob[], posts back MatchResult[] in the same order. It imports the match
// sim only: no game state, no DOM.
import { runMatch } from '../match/league/match';
import type { MatchJob } from './matchJobs';

self.onmessage = (e: MessageEvent<MatchJob[]>): void => {
  self.postMessage(e.data.map((job) => runMatch(job.home, job.away, job.opts)));
};
