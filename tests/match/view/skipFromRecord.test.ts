// tests/match/view/skipFromRecord.test.ts — Skip without a freeze (N10.4). Skip posts
// the match's record (seed, sheets, calls, weather) to the Worker, which plays it with
// runMatch; LivePlayback then sends the events still to come and finishes from that
// result. That is only right if the record replays to exactly the match playing on
// would have given. Here: a match watched the way LivePlayback plays it (a Runner on
// the live sim with a MatchRecorder), a coach call made, then "skipped" at a point:
// playing on and runMatch from the record agree byte for byte, on 20 seeds × 3 points.
import { describe, it, expect } from 'vitest';
import { createNewGame, getState } from '../../../src/core/state';
import { initLeague, PLAYER_ID } from '../../../src/systems/fixtures';
import { MatchRecorder, runMatch, type RunMatchOptions } from '../../../src/match/league/match';
import { Runner } from '../../../src/match/core/engine';
import { LiveSim } from '../../../src/match/league/live';
import type { CallInput } from '../../../src/match/league/calls';
import { teamSheetFromRival } from '../../../src/match/league/sheets';
import type { TeamSheet } from '../../../src/sim/events';

/** Watch to `skipAt` (calling 'hit-up' for home once, as soon as it may), then on to full time. */
function watch(home: TeamSheet, away: TeamSheet, seed: number, skipAt: number) {
  const calls: CallInput[] = [];
  const rec = new MatchRecorder({ home: home.clubId, away: away.clubId });
  const r = new Runner((s) => new LiveSim(home, away, s, { weather: 'clear', calls }), seed);
  r.onEvents = (events) => rec.add(events, r.cur);
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  let called = false;
  while (!r.finished && r.tick < skipAt) {
    if (!called && (r.current as LiveSim).callRefusal('home', 'hit-up') === null) {
      calls.push({ tick: r.tick + 1, side: 'home', call: 'hit-up' });
      called = true;
    }
    r.step();
  }
  const atSkip = rec.events.length;
  const record: RunMatchOptions = { seed, weather: 'clear', calls: structuredClone(calls) };
  while (!r.finished) r.step();
  return { onward: rec.result(r.current as LiveSim), atSkip, record, ticks: r.tick };
}

describe('Skip from the record (N10.4)', () => {
  it('runMatch from the record equals playing on, at any skip point (20 seeds × 3 points)', () => {
    createNewGame('Skip', 8);
    initLeague(getState());
    const clubs = getState().league.clubs.filter((c) => c.id !== PLAYER_ID);
    for (let i = 1; i <= 20; i++) {
      const home = teamSheetFromRival(clubs[i % clubs.length]!);
      const away = teamSheetFromRival(clubs[(i + 5) % clubs.length]!);
      const seed = i * 104_729;
      const length = watch(home, away, seed, Infinity).ticks;
      for (const frac of [0.1, 0.5, 0.9]) {
        const { onward, atSkip, record } = watch(home, away, seed, Math.floor(length * frac));
        // What crosses to the Worker and back is a structured clone.
        const elsewhere = structuredClone(runMatch(structuredClone(home), structuredClone(away), record));
        expect(JSON.stringify(elsewhere), `seed ${seed} skipped at ${frac}`).toBe(JSON.stringify(onward));
        // LivePlayback sends the events from where the screen stopped: they follow on exactly.
        expect(elsewhere.events.slice(0, atSkip)).toEqual(onward.events.slice(0, atSkip));
      }
    }
  }, 300_000);
});
