import { describe, expect, it } from 'vitest';
import { bounceFlight, kickFlight, passFlight, rollFlight, type BallState } from '../../../src/match/core/ball';
import { replayRange } from '../../../src/match/core/engine';
import { toFieldPt } from '../../../src/match/core/field';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { applyTuning } from '../../../src/match/league/tuning';
import { LiveView, type BallMotion, type ViewSurface } from '../../../src/match/view/liveView';
import { fieldOffsetX, fieldToWorldPoint } from '../../../src/scenes/matchField';

function pitch(x: number, y: number) {
  return fieldToWorldPoint(x, y, fieldOffsetX());
}

class FlightProbe extends LiveSim {
  observe(ball: BallState): Snapshot {
    this.ball = ball;
    return this.snapshot();
  }
}

function picture(mirror = 1) {
  let shown: { x: number; y: number; lift: number; tumble?: BallMotion['tumble'] };
  const surface: ViewSurface = {
    fieldToWorld: (x, y) => { const p = pitch(x, y); return { x: p.x * mirror, y: p.y }; },
    players: { home: [], away: [] },
    ball: { place: (x, y, lift, _depth, motion) => { shown = { x, y, lift, tumble: motion?.tumble }; } },
  };
  const view = new LiveView(surface);
  return (prev: Snapshot, cur: Snapshot, alpha: number) => { view.draw(prev, cur, alpha); return shown; };
}

describe('grubber tumble', () => {
  it('follows a real grubber through fractional ground contacts and settles before the chase gets there', () => {
    // Seed 5's cross-field grubber deliberately has contacts between the 20 Hz snapshots.
    // The corner dive moves that kick. With it off, the strike is still tick 891.
    const restore = applyTuning({ 'cornerCover.on': 0 });
    const seed = 5, strike = 891, arrival = 953;
    const home = labSheet(DEFAULT_HOME), away = labSheet(DEFAULT_AWAY);
    const snaps = replayRange(n => new LiveSim(home, away, n), seed, 0, arrival + 1);
    restore();
    const launch = snaps[strike]!;
    expect(launch.events).toContainEqual(expect.objectContaining({ kind: 'kick', detail: 'grubber' }));
    const flight = launch.ball.flight!;
    expect(flight).toMatchObject({ via: 'kick', startedTick: strike, arrivesTick: arrival, grubber: { bounces: 4 } });

    const draw = picture(), mirrored = picture(-1);
    const at = (t: number, render = draw) => {
      const prev = Math.floor(t), cur = Math.ceil(t);
      return render(snaps[prev]!, snaps[cur]!, t - prev);
    };
    const skipTicks = (arrival - strike) / 4;
    const heights = Array.from({ length: 4 }, (_, i) => at(strike + (i + 0.5) * skipTicks).lift);
    expect(heights).toEqual([...heights].sort((a, b) => b - a));
    expect(new Set(heights).size).toBe(4);
    for (const i of [1, 2, 3]) {
      const t = strike + i * skipTicks;
      const contact = at(t), reverse = at(t, mirrored);
      const { fx, fy } = toFieldPt({ x: flight.from.x + (flight.to.x - flight.from.x) * i / 4, y: flight.from.y + (flight.to.y - flight.from.y) * i / 4 });
      const point = pitch(fx, fy);
      expect(contact).toMatchObject({ x: Math.round(point.x), y: Math.round(point.y), lift: 0, tumble: { shadowAlpha: 1 } });
      expect(Math.abs(contact.tumble!.angle)).toBeCloseTo((i + 0.5) * Math.PI);
      expect(reverse.tumble!.angle).toBeCloseTo(-contact.tumble!.angle);
      expect(at(t, picture())).toEqual(contact); // A fresh view after a seek has the same pose.
      expect(at(t)).toEqual(contact); // A paused frame has the same pose.
    }
    expect(at(strike - 0.1).tumble).toBeUndefined();
    expect(at(arrival - 0.5).tumble!.shadowAlpha).toBeLessThan(1);
    const landing = draw(snaps[arrival - 1]!, snaps[arrival]!, 1);
    expect(snaps[arrival]!.ball).toMatchObject({ ...flight.to, lift: 0, holder: null });
    expect(landing).toMatchObject({ lift: 0, tumble: { shadowAlpha: 0 } });
    expect(Math.abs(landing.tumble!.angle)).toBeCloseTo(4 * Math.PI);
    expect(at(arrival + 0.5)).toMatchObject({ x: landing.x, y: landing.y, lift: 0, tumble: undefined });
  });

  it('leaves other kicks, passes, rolls and spill bounces on their usual rendering path', () => {
    const sim = new FlightProbe(labSheet(DEFAULT_HOME), labSheet(DEFAULT_AWAY), 5);
    const from = { x: 70, y: 34 }, to = { x: 90, y: 34 };
    const draw = picture();
    for (const ball of [kickFlight(from, to, 0, null), passFlight(from, to, 0, null), rollFlight(from, to, 0, 0, 4), bounceFlight(from, { x: 1, y: 0 }, 0)]) {
      const s = sim.observe(ball);
      expect(s.ball.flight).toBeDefined();
      expect(s.ball.flight?.grubber).toBeUndefined();
      expect(draw(s, s, 0).tumble).toBeUndefined();
    }
  });
});
