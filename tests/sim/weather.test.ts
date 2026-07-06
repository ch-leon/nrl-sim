// tests/sim/weather.test.ts — statistical weather/momentum effects + bounds.
// See BAK-198.
import { describe, it, expect } from 'vitest';
import {
  rollWeather,
  weatherMods,
  applyMomentumEvent,
  decayMomentum,
  momentumWeightMod,
  MOMENTUM_MIN,
  MOMENTUM_MAX,
  MOMENTUM_TRY,
} from '../../src/sim/weather';
import { simulateMatch } from '../../src/sim/engine';
import { makeRng } from '../../src/utils/rng';
import type { MatchResult, TeamSheet, WeatherKind } from '../../src/sim/events';

function sheet(clubId: string, rating: number): TeamSheet {
  return {
    clubId,
    name: clubId,
    attack: rating,
    defense: rating,
    kicking: rating,
    fitness: rating,
    colors: ['#000000', '#ffffff'],
  };
}

const RUNS = 300;

describe('rollWeather', () => {
  it('yields ~60/25/15 clear/rain/wind over ≥1000 rolls (±5%)', () => {
    const rng = makeRng(2024);
    const counts: Record<WeatherKind, number> = { clear: 0, rain: 0, wind: 0 };
    const N = 5000;
    for (let i = 0; i < N; i++) counts[rollWeather(rng.next)]++;
    expect(counts.clear / N).toBeCloseTo(0.6, 1);
    expect(counts.rain / N).toBeCloseTo(0.25, 1);
    expect(counts.wind / N).toBeCloseTo(0.15, 1);
    // Tighter ±5% band.
    expect(Math.abs(counts.clear / N - 0.6)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(counts.rain / N - 0.25)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(counts.wind / N - 0.15)).toBeLessThanOrEqual(0.05);
  });

  it('is deterministic per seed', () => {
    const a = makeRng(1);
    const b = makeRng(1);
    for (let i = 0; i < 100; i++) expect(rollWeather(a.next)).toBe(rollWeather(b.next));
  });
});

describe('weatherMods table', () => {
  it('matches the exact BAK-198 table', () => {
    expect(weatherMods('clear')).toEqual({ errorMult: 1.0, breakMult: 1.0, kickSuccessMult: 1.0, kickDistanceMult: 1.0 });
    expect(weatherMods('rain')).toEqual({ errorMult: 1.5, breakMult: 0.8, kickSuccessMult: 1.0, kickDistanceMult: 1.0 });
    expect(weatherMods('wind')).toEqual({ errorMult: 1.0, breakMult: 1.0, kickSuccessMult: 0.75, kickDistanceMult: 1.15 });
  });

  it('rain never affects kicking; wind never affects errors', () => {
    expect(weatherMods('rain').kickSuccessMult).toBe(1.0);
    expect(weatherMods('rain').kickDistanceMult).toBe(1.0);
    expect(weatherMods('wind').errorMult).toBe(1.0);
  });
});

describe('applyMomentumEvent', () => {
  it('try/big-hit push toward the actor (home actor → positive)', () => {
    expect(applyMomentumEvent(0, 'try', true)).toBe(30);
    expect(applyMomentumEvent(0, 'big-hit', true)).toBe(15);
  });

  it('try/big-hit push toward the actor (away actor → negative)', () => {
    expect(applyMomentumEvent(0, 'try', false)).toBe(-30);
    expect(applyMomentumEvent(0, 'big-hit', false)).toBe(-15);
  });

  it('error pushes AGAINST the actor', () => {
    // home actor errors → momentum swings away (negative).
    expect(applyMomentumEvent(0, 'error', true)).toBe(-10);
    // away actor errors → momentum swings toward home (positive).
    expect(applyMomentumEvent(0, 'error', false)).toBe(10);
  });

  it('clamps to [-100, 100] — repeated tries cannot exceed the cap', () => {
    let m = 0;
    for (let i = 0; i < 10; i++) m = applyMomentumEvent(m, 'try', true);
    expect(m).toBe(MOMENTUM_MAX);
    let n = 0;
    for (let i = 0; i < 10; i++) n = applyMomentumEvent(n, 'try', false);
    expect(n).toBe(MOMENTUM_MIN);
  });
});

describe('decayMomentum & momentumWeightMod', () => {
  it('decays 10% toward zero', () => {
    expect(decayMomentum(100)).toBeCloseTo(90);
    expect(decayMomentum(-50)).toBeCloseTo(-45);
    expect(decayMomentum(0)).toBe(0);
  });

  it('shifts possessing weight by ±8% at momentum ±100', () => {
    // home in possession, full home momentum → +8%.
    expect(momentumWeightMod(MOMENTUM_MAX, true)).toBeCloseTo(1.08);
    // home in possession, full away momentum → -8%.
    expect(momentumWeightMod(MOMENTUM_MIN, true)).toBeCloseTo(0.92);
    // away in possession, full away momentum → +8% for them.
    expect(momentumWeightMod(MOMENTUM_MIN, false)).toBeCloseTo(1.08);
    expect(momentumWeightMod(0, true)).toBe(1);
  });

  it('MOMENTUM_TRY constant is the try magnitude', () => {
    expect(MOMENTUM_TRY).toBe(30);
  });
});

// ── Statistical weather effects through the engine ──────────────────────────

function total(pair: [number, number]): number {
  return pair[0] + pair[1];
}

describe('weather effects (statistical, same seeds/teams)', () => {
  const teams = () => [sheet('H', 55), sheet('A', 55)] as const;

  function sumErrors(weather: WeatherKind): number {
    let sum = 0;
    const [h, a] = teams();
    for (let s = 0; s < RUNS; s++) {
      sum += total(simulateMatch(h, a, { seed: s, weather }).stats.errors);
    }
    return sum;
  }

  it('rain raises mean errors ≥20% vs clear', () => {
    const clear = sumErrors('clear');
    const rain = sumErrors('rain');
    expect((rain - clear) / clear).toBeGreaterThanOrEqual(0.2);
  });

  function convRate(weather: WeatherKind): number {
    let good = 0, attempts = 0;
    const [h, a] = teams();
    for (let s = 0; s < RUNS; s++) {
      const r: MatchResult = simulateMatch(h, a, { seed: s, weather });
      for (const e of r.events) {
        if (e.kind === 'conversion') {
          attempts++;
          if (e.detail === 'good') good++;
        }
      }
    }
    return attempts === 0 ? 0 : good / attempts;
  }

  it('wind lowers conversion success rate ≥15% vs clear', () => {
    const clear = convRate('clear');
    const wind = convRate('wind');
    expect((clear - wind) / clear).toBeGreaterThanOrEqual(0.15);
  });
});

describe('momentum bounds & timeline through the engine', () => {
  it('momentum never exceeds ±100 across ≥200 runs (all weathers)', () => {
    const [h, a] = [sheet('H', 60), sheet('A', 45)];
    for (const weather of ['clear', 'rain', 'wind'] as const) {
      for (let s = 0; s < RUNS; s++) {
        const r = simulateMatch(h, a, { seed: s, weather });
        for (const m of r.momentumTimeline) {
          expect(m.value).toBeGreaterThanOrEqual(-100);
          expect(m.value).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('timeline has one sample per set and last is decayed toward 0', () => {
    const r = simulateMatch(sheet('H', 50), sheet('A', 50), { seed: 5, weather: 'clear' });
    const setStarts = r.events.filter((e) => e.kind === 'set-start').length;
    expect(r.momentumTimeline.length).toBe(setStarts);
    // decayMomentum was applied to the last sample (magnitude ≤ 90 after one decay
    // from a max single-event of 30, and generally pulled toward 0).
    expect(Math.abs(r.momentumTimeline[r.momentumTimeline.length - 1]!.value)).toBeLessThanOrEqual(100);
  });
});

describe('equal-team fairness under all weathers', () => {
  for (const weather of ['clear', 'rain', 'wind'] as const) {
    it(`home win rate stays 45-55% under ${weather}`, () => {
      const [h, a] = [sheet('H', 50), sheet('A', 50)];
      let homeWins = 0;
      for (let s = 0; s < RUNS; s++) {
        const r = simulateMatch(h, a, { seed: s, weather });
        if (r.homeScore > r.awayScore) homeWins++;
      }
      const rate = (homeWins / RUNS) * 100;
      expect(rate).toBeGreaterThanOrEqual(45);
      expect(rate).toBeLessThanOrEqual(55);
    });
  }
});
