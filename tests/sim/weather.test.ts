// tests/sim/weather.test.ts — the weather roll and the momentum model (BAK-198).
// The live sim's weather effects are tested in tests/match/league/weather.test.ts.
import { describe, it, expect } from 'vitest';
import {
  rollWeather,
  applyMomentumEvent,
  decayMomentum,
  MOMENTUM_MIN,
  MOMENTUM_MAX,
  MOMENTUM_TRY,
} from '../../src/sim/weather';
import { makeRng } from '../../src/utils/rng';
import type { WeatherKind } from '../../src/sim/events';

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

describe('decayMomentum', () => {
  it('decays 10% toward zero', () => {
    expect(decayMomentum(100)).toBeCloseTo(90);
    expect(decayMomentum(-50)).toBeCloseTo(-45);
    expect(decayMomentum(0)).toBe(0);
  });

  it('MOMENTUM_TRY constant is the try magnitude', () => {
    expect(MOMENTUM_TRY).toBe(30);
  });
});
