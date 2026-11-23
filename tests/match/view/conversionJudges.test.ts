import { describe, expect, it } from 'vitest';
import { Runner, replayRange } from '../../../src/match/core/engine';
import { FIELD_LENGTH, IN_GOAL, MID_Y } from '../../../src/match/core/field';
import { DEFAULT_AWAY, DEFAULT_HOME, labSheet } from '../../../src/match/lab/sheets';
import { GOALS } from '../../../src/match/league/goals';
import { LIVE, LiveSim } from '../../../src/match/league/live';
import { NINES } from '../../../src/match/league/rules';
import { CONVERSION_SIGNAL_TICKS, conversionJudges } from '../../../src/match/view/conversionJudges';

const home = labSheet(DEFAULT_HOME);
const away = labSheet(DEFAULT_AWAY);
const factory = (seed: number) => new LiveSim(home, away, seed);

describe('touch judges at conversions', () => {
  it.each([
    // The bench-side interchange moves this seed's positive-end goal to tick 2234.
    { seed: 37, award: 2234, toward: 1, good: true },
    { seed: 15, award: 1339, toward: -1, good: false },
    { seed: 26, award: 5183, toward: -1, good: true },
    { seed: 18, award: 2116, toward: 1, good: false },
  ])('follows the real decision at end $toward, seed $seed, good $good', ({ seed, award, toward, good }) => {
    const r = new Runner(factory, seed);
    r.seek(award - 1);
    const before = r.cur;
    expect(before.ball.flight?.arrivesTick).toBe(award);
    expect(before.conversion).toMatchObject({ toward });
    expect(before.conversion?.decision).toBeUndefined();
    const judges = conversionJudges(before)!;
    expect(judges.pose).toBe('watch');
    const scoredSide = before.attacking!;
    const goalX = toward === 1 ? FIELD_LENGTH : 0;
    expect(Math.sign(before.ball.flight!.to.x - goalX)).toBe(toward);
    for (const [i, p] of judges.feet.entries()) {
      expect((p.x - goalX) * toward).toBeGreaterThan(3);
      expect((p.x - goalX) * toward).toBeLessThan(IN_GOAL);
      expect((p.y - MID_Y) * (i === 0 ? -1 : 1)).toBeGreaterThan(GOALS.halfPosts);
    }

    r.step();
    expect(r.cur.events).toContainEqual(expect.objectContaining({ kind: 'conversion', tick: award, detail: good ? 'good' : 'missed' }));
    expect(r.cur.conversion?.decision).toEqual({ tick: award, good });
    expect(r.cur.score![scoredSide] - before.score![scoredSide]).toBe(good ? NINES.conversionPoints : 0);
    expect(r.cur.clock?.seconds).toBe(before.clock?.seconds);
    expect(r.cur.phase?.kind).toBe('restart');
    const atDecision = r.cur;
    expect(conversionJudges(atDecision)).toMatchObject({ feet: judges.feet, pose: good ? 'raise' : 'waveOut' });

    const first = before.ball.flight!.startedTick;
    const from = first - 1;
    const last = award + CONVERSION_SIGNAL_TICKS;
    const replay = replayRange(factory, seed, from, last);
    expect(conversionJudges(replay[0]!)?.pose).toBe('ready');
    for (const s of replay.slice(1, award - from)) {
      expect(s.conversion?.decision).toBeUndefined();
      expect(conversionJudges(s)?.pose).toBe('watch');
    }
    const signal = replay.slice(award - from, last - from).map((s, age) => {
      const frame = conversionJudges(s);
      expect(frame).toEqual(conversionJudges(atDecision, age));
      return frame?.pose;
    });
    const changes = signal.filter((pose, age) => age === 0 || pose !== signal[age - 1]);
    expect(changes).toEqual(good ? ['raise', 'up'] : [
      'waveOut', 'waveMidOut', 'waveAcross', 'waveMidIn', 'waveIn',
      'waveMidIn', 'waveAcross', 'waveMidOut', 'waveOut',
      'waveMidOut', 'waveAcross', 'waveMidIn', 'waveIn',
      'waveMidIn', 'waveAcross', 'waveMidOut', 'waveOut', 'ready',
    ]);
    expect(signal[3]).toBe(good ? 'up' : 'waveMidOut');
    expect(signal[CONVERSION_SIGNAL_TICKS - 1]).toBe(good ? 'up' : 'ready');
    expect(conversionJudges(replay[last - from]!)).toBeNull();
    expect(CONVERSION_SIGNAL_TICKS).toBeLessThan(LIVE.restartTicks);

    const duringSignal = replay[award + 7 - from]!;
    r.seek(duringSignal.tick);
    expect(conversionJudges(r.cur)).toEqual(conversionJudges(duringSignal));
    r.seek(from);
    expect(conversionJudges(r.cur)).toEqual(conversionJudges(replay[0]!));
    r.seek(0);
    expect(conversionJudges(r.cur)).toBeNull();
  });

  it.each([
    { seed: 2, halfMinutes: 2, award: 3245, whistle: 'half-time' },
    { seed: 3, halfMinutes: 3, award: 8462, whistle: 'full-time' },
  ])('keeps the decision visible when the conversion ends in $whistle', ({ seed, halfMinutes, award, whistle }) => {
    const r = new Runner(s => new LiveSim(home, away, s, { length: { halves: 2, halfMinutes } }), seed);
    r.seek(award);
    const at = r.cur;
    expect(at.events.map(e => e.kind)).toEqual(expect.arrayContaining(['conversion', whistle]));
    expect(at.phase?.kind).toBe(whistle);
    expect(conversionJudges(at, 3)?.pose).toBe('up');
    expect(conversionJudges(at, CONVERSION_SIGNAL_TICKS)).toBeNull();
    if (whistle === 'full-time') expect(r.finished).toBe(true);
    else {
      r.seek(award + NINES.halfTimeTicks);
      expect(r.cur.phase?.kind).toBe('restart');
      expect(r.cur.conversion).toBeUndefined();
    }
  });
});
