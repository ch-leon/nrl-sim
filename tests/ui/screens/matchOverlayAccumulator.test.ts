// tests/ui/screens/matchOverlayAccumulator.test.ts — the core correctness guard
// (BAK-196): folding a full simulateMatch event log through reduceEvent must land
// on MatchResult's final score/tries/errors exactly, and possession/tackles
// self-consistently within rounding. Pure — no DOM.
import { describe, it, expect } from 'vitest';
import {
  initLiveState,
  reduceEvent,
  possessionPct,
  formatClock,
  type LiveState,
} from '../../../src/ui/screens/matchOverlay';
import { simulateMatch } from '../../../src/sim/engine';
import type { MatchResult, TeamSheet, WeatherKind } from '../../../src/sim/events';

function sheet(id: string, rating: number): TeamSheet {
  return { clubId: id, name: id, attack: rating, defense: rating, kicking: rating, fitness: rating, colors: ['#111', '#222'] };
}

function fold(result: MatchResult, homeId: string): LiveState {
  let s = initLiveState();
  for (const ev of result.events) s = reduceEvent(s, ev, homeId);
  return s;
}

describe('reduceEvent — parity with MatchResult', () => {
  const weathers: WeatherKind[] = ['clear', 'rain', 'wind'];

  it('final score, tries, errors match exactly across many seeds', () => {
    for (let seed = 0; seed < 400; seed++) {
      const home = sheet('H', 40 + (seed % 55));
      const away = sheet('A', 40 + ((seed * 13) % 55));
      const weather = weathers[seed % 3] as WeatherKind;
      const res = simulateMatch(home, away, { seed, weather });
      const s = fold(res, 'H');

      expect(s.homeScore, `score home seed ${seed}`).toBe(res.homeScore);
      expect(s.awayScore, `score away seed ${seed}`).toBe(res.awayScore);
      expect(s.tries, `tries seed ${seed}`).toEqual(res.stats.tries);
      expect(s.errors, `errors seed ${seed}`).toEqual(res.stats.errors);
    }
  });

  it('possession and tackles land within rounding of MatchResult', () => {
    // The engine counts tackleCount as internal loop iterations; a small number
    // are not individually represented in the event log (penalty taps / kick
    // restarts), so tackles may differ by a few. Assert a tight tolerance and
    // that possession % is self-consistent with the tackle counts.
    let maxTackleDiff = 0;
    let maxPossDiff = 0;
    for (let seed = 0; seed < 400; seed++) {
      const res = simulateMatch(sheet('H', 55), sheet('A', 45), { seed, weather: 'clear' });
      const s = fold(res, 'H');
      maxTackleDiff = Math.max(
        maxTackleDiff,
        Math.abs(s.tackles[0] - res.stats.tackles[0]),
        Math.abs(s.tackles[1] - res.stats.tackles[1]),
      );
      const [ph] = possessionPct(s);
      maxPossDiff = Math.max(maxPossDiff, Math.abs(ph - res.stats.possession[0]));
    }
    expect(maxTackleDiff).toBeLessThanOrEqual(4);
    expect(maxPossDiff).toBeLessThanOrEqual(3);
  });

  it('half flips to 2 after half-time / t>=40', () => {
    const res = simulateMatch(sheet('H', 50), sheet('A', 50), { seed: 3, weather: 'clear' });
    let s = initLiveState();
    let sawSecondHalf = false;
    for (const ev of res.events) {
      s = reduceEvent(s, ev, 'H');
      if (ev.t >= 40) sawSecondHalf = sawSecondHalf || s.half === 2;
    }
    expect(sawSecondHalf).toBe(true);
    expect(s.half).toBe(2); // full-time is at t=80
  });

  it('missed conversions add no points', () => {
    const s0 = initLiveState();
    const s1 = reduceEvent(s0, { t: 20, kind: 'try', teamId: 'H', x: 100, y: 50 }, 'H');
    const s2 = reduceEvent(s1, { t: 20, kind: 'conversion', teamId: 'H', detail: 'missed', x: 90, y: 50 }, 'H');
    expect(s2.homeScore).toBe(4); // try only
    const s3 = reduceEvent(s2, { t: 21, kind: 'conversion', teamId: 'H', detail: 'good', x: 90, y: 50 }, 'H');
    expect(s3.homeScore).toBe(6);
  });

  it('field-goal +1, penalty-goal +2 to the correct side', () => {
    let s = initLiveState();
    s = reduceEvent(s, { t: 70, kind: 'field-goal', teamId: 'A' }, 'H');
    s = reduceEvent(s, { t: 72, kind: 'penalty-goal', teamId: 'A', x: 70, y: 50 }, 'H');
    expect(s.awayScore).toBe(3);
    expect(s.homeScore).toBe(0);
  });
});

describe('formatClock', () => {
  it('renders MM:SS from sim minute, clamped to 80', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(40)).toBe('40:00');
    expect(formatClock(80)).toBe('80:00');
    expect(formatClock(999)).toBe('80:00');
  });
});

describe('possessionPct', () => {
  it('0/0 → 50/50', () => {
    expect(possessionPct(initLiveState())).toEqual([50, 50]);
  });
});
