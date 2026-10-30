// Labs: match controls (Leon, 30 Oct). Skips retain the event recorder.
import { expect, it, vi } from 'vitest';
import { Runner } from '../../../src/match/core/engine';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import { MatchRecorder, runMatch } from '../../../src/match/league/match';
import { LivePlayback, KeyMoments } from '../../../src/match/view/livePlayback';
import { SET_TACKLES } from '../../../src/config';

it('set skips retain every event, stop at the last or a change of ball, and resume playback', () => {
  const home = sideSheet('H', { rating: 60 }), away = sideSheet('A', { rating: 60 });
  const runner = new Runner((seed) => new LiveSim(home, away, seed), 3);
  const rec = new MatchRecorder({ home: 'H', away: 'A' });
  runner.onEvents = (es) => rec.add(es, runner.cur);
  runner.onStep = () => rec.clock((runner.current as LiveSim).matchSeconds);
  while ((runner.current as LiveSim).phaseKind !== 'play') runner.step();
  const side = (runner.current as LiveSim).inPossession;
  // Thin view wiring replaced by inert surfaces; this is the production skip method.
  const pb = Object.create(LivePlayback.prototype) as LivePlayback;
  Object.assign(pb, {
    runner, opts: { controlsSide: side }, holds: 0, finishEmitted: false, awaitingSkip: false,
    replay: null, keyMoments: new KeyMoments(), view: { draw: vi.fn() },
    scene: { fieldToWorld: (x: number, y: number) => ({ x, y }), cameras: { main: { centerOn: vi.fn() } } },
    showClock: vi.fn(), persistProgress: vi.fn(), finish: vi.fn(),
  });
  runner.play();
  const before = runner.tick;
  pb.skipSet();
  const sim = runner.current as LiveSim;
  expect(runner.tick).toBeGreaterThan(before);
  expect(sim.tackleCount >= SET_TACKLES - 1 || sim.inPossession !== side || sim.tickEvents.some((e) => e.kind === 'try' || e.kind === 'set-start')).toBe(true);
  expect(runner.playing).toBe(true);
  while (!runner.finished) runner.step();
  expect(rec.result(runner.current as LiveSim)).toEqual(runMatch(home, away, { seed: 3 }));
}, 30_000);
