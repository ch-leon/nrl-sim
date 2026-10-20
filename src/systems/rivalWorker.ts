// src/systems/rivalWorker.ts — a Web Worker that plays a round's rival
// fixtures on the live sim (N9.2), so the page keeps painting and taking taps
// while it runs. Receives RivalJob[], posts back MatchResult[] in the same order.
// It imports the match sim only: no game state, no DOM.
import { runMatch } from '../match/league/match';
import type { RivalJob } from './rivalRound';

self.onmessage = (e: MessageEvent<RivalJob[]>): void => {
  self.postMessage(e.data.map((job) => runMatch(job.home, job.away, { seed: job.seed, weather: job.weather, aiCoach: job.aiCoach, goldenPoint: job.goldenPoint })));
};
