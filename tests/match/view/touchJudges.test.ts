import { describe, expect, it } from 'vitest';
import { Runner, replayRange, TICK_MS, TICK_S } from '../../../src/match/core/engine';
import { FIELD_LENGTH, FIELD_WIDTH, IN_GOAL, MID_X } from '../../../src/match/core/field';
import type { Snapshot } from '../../../src/match/core/snapshot';
import { dist } from '../../../src/match/core/vec';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { LiveSim } from '../../../src/match/league/live';
import { JUDGE_SPEED_M_S, startingTouchJudges, stepTouchJudges } from '../../../src/match/league/live/touchJudges';
import { CONVERSION_SIGNAL_TICKS, conversionJudges } from '../../../src/match/view/conversionJudges';

const home = labSheet(DEFAULT_HOME);
const away = labSheet(DEFAULT_AWAY);
const factory = (seed: number) => new LiveSim(home, away, seed, { touchJudges: true });

function conversionBeforeKickoff(toward: 1 | -1): Runner {
  const isDecision = (s: Snapshot) => s.conversion?.toward === toward
    && s.conversion.decision?.tick === s.tick && s.phase?.kind === 'restart';
  for (const seed of [15, 37, 26, 18]) {
    const match = new Runner(factory, seed);
    match.skipUntil(isDecision, 7_000);
    if (isDecision(match.cur)) return match;
  }
  throw new Error(`No conversion followed by a kick-off was found toward end ${toward}`);
}

describe('touch judges on the sidelines', () => {
  it('comes level with play on both rails and catches up on foot after a kick and a reversal', () => {
    let judges = startingTouchJudges();
    const rails = judges.map(p => p.y);
    expect(rails[0]).toBeLessThan(0);
    expect(rails[1]).toBeGreaterThan(FIELD_WIDTH);
    expect(judges.map(p => p.x)).toEqual([MID_X, MID_X]);
    const move = (ballX: number, ticks: number) => {
      for (let tick = 0; tick < ticks; tick++) {
        const previous = judges;
        judges = stepTouchJudges(judges, { kind: 'track', ballX });
        for (const [i, now] of judges.entries()) {
          const before = previous[i]!;
          const walked = dist(before, now);
          expect(now.y).toBe(rails[i]);
          expect(walked).toBeLessThanOrEqual(JUDGE_SPEED_M_S * TICK_S + 1e-9);
          expect(now.distance - before.distance).toBeCloseTo(walked);
          expect(now.alpha).toBe(1);
        }
      }
    };
    move(FIELD_LENGTH - 10, 20);
    expect(judges[0].x).toBeGreaterThan(MID_X + 2);
    expect(judges[0].x).toBeLessThan(FIELD_LENGTH - 20);
    const beforeTurn = judges[0].x;
    move(15, 1);
    expect(judges[0].x).toBeGreaterThan(beforeTurn); // First brake, then turn.
    move(15, 500);
    expect(Math.abs(judges[0].x - 15)).toBeLessThanOrEqual(0.8);
    expect(judges[0].dx).toBeCloseTo(0);
  });

  it('matches pause, fast playback, seek and replay without changing the match picture', () => {
    const watched = new Runner(factory, 37);
    watched.setSpeed(8);
    watched.play();
    for (let frame = 0; frame < 100; frame++) watched.update(4 * TICK_MS / 8);
    const at = watched.cur;
    expect(at.tick).toBe(400);
    expect(at.touchJudges?.[0].distance).toBeGreaterThan(10);
    watched.pause();
    watched.update(50 * TICK_MS);
    expect(watched.cur).toBe(at);
    watched.seek(at.tick);
    expect(watched.cur).toEqual(at);
    const replay = replayRange(factory, 37, at.tick - 1, at.tick);
    expect(replay).toEqual([watched.prev, at]);

    const plain = new Runner(seed => new LiveSim(home, away, seed), 37);
    plain.seek(at.tick);
    const { touchJudges, ...match } = at;
    expect(touchJudges).toBeDefined();
    expect(match).toEqual(plain.cur);
    expect(watched.history).toEqual(plain.history);
  });

  it.each([1, -1] as const)('uses the conversion spots and jogs back out at end %i', toward => {
    const match = conversionBeforeKickoff(toward);
    const cue = conversionJudges(match.cur)!;
    expect(conversionJudges(match.prev)).toMatchObject({ feet: cue.feet, pose: 'watch' });
    expect(cue.pose).toBe(match.cur.conversion!.decision!.good ? 'raise' : 'waveOut');
    expect(match.cur.touchJudges).toMatchObject(cue.feet);
    for (let age = 1; age < CONVERSION_SIGNAL_TICKS; age++) {
      match.step();
      expect(conversionJudges(match.cur)?.feet).toEqual(cue.feet);
      expect(match.cur.touchJudges).toMatchObject(cue.feet);
    }
    for (let tick = 0; tick < 160; tick++) {
      match.step();
      const before = match.prev.touchJudges!;
      const judges = match.cur.touchJudges!;
      expect(conversionJudges(match.cur)).toBeNull();
      for (const [i, p] of judges.entries()) {
        expect(dist(before[i]!, p)).toBeLessThanOrEqual(JUDGE_SPEED_M_S * TICK_S + 1e-9);
        if (p.y >= 0 && p.y <= FIELD_WIDTH) {
          expect(Math.min(p.x + IN_GOAL, FIELD_LENGTH + IN_GOAL - p.x)).toBeLessThanOrEqual(1.5 + 1e-9);
        }
      }
      if (judges[0].y < 0 && judges[1].y > FIELD_WIDTH) break;
    }
    expect(match.cur.touchJudges?.[0].y).toBeLessThan(0);
    expect(match.cur.touchJudges?.[1].y).toBeGreaterThan(FIELD_WIDTH);
  }, 30_000);

  it('settles and fades when the whistle ends play', () => {
    const judges = stepTouchJudges(startingTouchJudges(), { kind: 'track', ballX: 100 });
    let stopped = judges;
    for (let tick = 0; tick < 20; tick++) stopped = stepTouchJudges(stopped, { kind: 'whistle' });
    for (const [i, p] of stopped.entries()) {
      expect(p).toMatchObject({ x: judges[i]!.x, y: judges[i]!.y, dx: 0, dy: 0, alpha: 0 });
    }
  });
});
