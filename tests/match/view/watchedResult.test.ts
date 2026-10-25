// A watched result is the match, at every speed. Runner.update used to keep
// stepping after the sim finished, and LiveSim.step left the last tick's events
// in place, so the final tackle and full time were recorded twice. Career
// tackles, possession and player of the match are counted from that log.
// Smart pace (dead time at 2×) is what makes the default ×4 watch hit it.
import { describe, it, expect } from 'vitest';
import { Runner } from '../../../src/match/core/engine';
import { MatchRecorder, runMatch } from '../../../src/match/league/match';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { blendPace, playbackPace } from '../../../src/match/view/livePlayback';
import type { MatchResult, TeamSheet } from '../../../src/sim/events';

const FRAME_MS = 1000 / 60;

/** The screen's loop: smart pace on the phase, then a frame of Runner.update. */
function watch(home: TeamSheet, away: TeamSheet, seed: number, speed: number): MatchResult {
  const rec = new MatchRecorder({ home: home.clubId, away: away.clubId });
  const r = new Runner((s) => new LiveSim(home, away, s, { weather: 'clear' }), seed);
  r.onEvents = (events) => rec.add(events, r.cur);
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  r.setSpeed(speed);
  r.play();
  let pace = 1;
  let frames = 0;
  while (!r.finished) {
    pace = blendPace(pace, playbackPace((r.current as LiveSim).phaseKind), FRAME_MS);
    r.setSpeed(speed * pace);
    r.update(FRAME_MS);
    if (++frames > 500_000) throw new Error(`seed ${seed} at ×${speed} did not finish`);
  }
  return rec.result(r.current as LiveSim);
}

/** Skip on the main thread: step to full time, the same recorder. */
function skip(home: TeamSheet, away: TeamSheet, seed: number): MatchResult {
  const rec = new MatchRecorder({ home: home.clubId, away: away.clubId });
  const r = new Runner((s) => new LiveSim(home, away, s, { weather: 'clear' }), seed);
  r.onEvents = (events) => rec.add(events, r.cur);
  r.onStep = () => rec.clock((r.current as LiveSim).matchSeconds);
  while (!r.finished) r.step();
  return rec.result(r.current as LiveSim);
}

describe('a watched result does not depend on playback speed', () => {
  it('×1, ×4 and ×8 with smart pace, and Skip, match runMatch', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const home = sideSheet('H', { rating: 60 });
      const away = sideSheet('A', { rating: 60 });
      const head = runMatch(home, away, { seed, weather: 'clear' });
      for (const speed of [1, 4, 8]) {
        const watched = watch(home, away, seed, speed);
        expect(watched.homeScore, `seed ${seed} ×${speed} score`).toBe(head.homeScore);
        expect(watched.awayScore, `seed ${seed} ×${speed} score`).toBe(head.awayScore);
        expect(watched.stats, `seed ${seed} ×${speed} stats`).toEqual(head.stats);
        expect(watched.events, `seed ${seed} ×${speed} events`).toEqual(head.events);
      }
      const skipped = skip(home, away, seed);
      expect(skipped.stats, `seed ${seed} skip stats`).toEqual(head.stats);
      expect(skipped.events, `seed ${seed} skip events`).toEqual(head.events);
    }
  }, 180_000);

  it('a step after full time keeps no events to record again', () => {
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 1, { weather: 'clear' });
    while (!sim.finished) sim.step();
    expect(sim.tickEvents.length).toBeGreaterThan(0);
    sim.step();
    expect(sim.tickEvents).toEqual([]);
  }, 30_000);
});
