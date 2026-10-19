// tests/match/league/weather.test.ts — weather, injuries and the ball lost in
// contact (BAK-207 §5.1 2f): rain spills more ball, wind carries kicks and
// blows goal kicks off line, a big hit can hurt the carrier, who comes off
// first at the next stoppage, and runMatch reports the injuries by squad id.
import { describe, it, expect, afterEach } from 'vitest';
import { WEATHER, injuryChance, lostInContactChance, weatherEffect } from '../../../src/match/league/weather';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { applyTuning } from '../../../src/match/league/tuning';
import { sideSheet } from '../../../src/match/balance/measure';
import { teamSheetFromSquad } from '../../../src/sim/engine';
import { generatePlayer } from '../../../src/data/player';
import { makeRng } from '../../../src/utils/rng';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { WeatherKind } from '../../../src/sim/events';

describe('weather and injuries (pure)', () => {
  it('rain makes the ball slippery; wind carries kicks and spreads goal kicks; clear changes nothing', () => {
    expect(weatherEffect('clear')).toEqual({ handling: 1, kickDistance: 1, goalSpread: 1, jitter: 0 });
    expect(weatherEffect(undefined)).toEqual(weatherEffect('clear'));
    expect(weatherEffect('rain').handling).toBe(WEATHER.rainHandling);
    expect(weatherEffect('rain').kickDistance).toBe(1);
    expect(weatherEffect('wind').kickDistance).toBeGreaterThan(1);
    expect(weatherEffect('wind').goalSpread).toBeGreaterThan(1);
    expect(weatherEffect('wind').handling).toBe(1);
  });
  it('the ball comes loose more on a big hit, less from a skilful carrier, more in the rain', () => {
    expect(lostInContactChance(true, 60, 1)).toBeGreaterThan(lostInContactChance(false, 60, 1));
    expect(lostInContactChance(false, 90, 1)).toBeLessThan(lostInContactChance(false, 50, 1));
    expect(lostInContactChance(false, 60, 1.6)).toBeCloseTo(lostInContactChance(false, 60, 1) * 1.6);
    expect(lostInContactChance(false, 200, 1)).toBe(0);
  });
  it('injury chance: the old engine’s roll — risk, Injury Prone and the difficulty rate', () => {
    const base = injuryChance({ injuryRisk: 20 });
    expect(base).toBeCloseTo(WEATHER.injuryBase + 0.2 * WEATHER.injuryPerRisk);
    expect(injuryChance({ injuryRisk: 80 })).toBeGreaterThan(base);
    expect(injuryChance({ injuryRisk: 20, traits: [{ id: 'injuryProne', level: 1 }] })).toBeCloseTo(base * WEATHER.injuryProne);
    expect(injuryChance({ injuryRisk: 20 }, 0)).toBe(0);
  });
});

function events(seed: number, weather: WeatherKind, minutes = 6): SimEvent[] {
  const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed, { length: { halves: 2, halfMinutes: minutes }, weather });
  const out: SimEvent[] = [];
  while (!sim.finished && sim.tick < 60_000) {
    sim.step();
    out.push(...sim.tickEvents);
  }
  return out;
}

describe('weather in the live sim', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('rain: more errors than the same sides in the clear, over many seeds', () => {
    let clear = 0;
    let rain = 0;
    for (let seed = 1; seed <= 12; seed++) {
      clear += events(seed, 'clear').filter((e) => e.kind === 'error' || e.kind === 'drop').length;
      rain += events(seed, 'rain').filter((e) => e.kind === 'error' || e.kind === 'drop').length;
    }
    expect(rain).toBeGreaterThan(clear * 1.2);
  }, 60_000);

  it('wind: goal kicks go over less often than in the clear', () => {
    const clear = { good: 0, n: 0 };
    const wind = { good: 0, n: 0 };
    const tally = (es: SimEvent[], t: { good: number; n: number }) => {
      for (const e of es) {
        if (e.kind !== 'conversion') continue;
        t.n++;
        if (e.detail === 'good') t.good++;
      }
    };
    for (let seed = 1; seed <= 16; seed++) {
      tally(events(seed, 'clear'), clear);
      tally(events(seed, 'wind'), wind);
    }
    expect(clear.n).toBeGreaterThan(20);
    expect(wind.n).toBeGreaterThan(20);
    expect(wind.good / wind.n).toBeLessThan(clear.good / clear.n);
  }, 60_000);

  it('a ball lost in the tackle is a knock-on: the error, then the other side’s set', () => {
    restore = applyTuning({ 'weather.lostHeld': 0.2 });
    const es = events(3, 'clear', 3);
    const lost = es.findIndex((e) => e.kind === 'error' && e.detail === 'contact');
    expect(lost).toBeGreaterThanOrEqual(0);
    const loser = es[lost]!.side;
    const next = es.slice(lost + 1).find((e) => e.kind === 'set-start');
    expect(next?.side).not.toBe(loser);
  }, 30_000);
});

describe('injuries in the live sim', () => {
  let restore: (() => void) | null = null;
  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('a hurt man comes off at the next stoppage, for a bench man, and does not come back on', () => {
    restore = applyTuning({ 'weather.injuryBase': 0.5 });
    const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), 2, { length: { halves: 2, halfMinutes: 6 } });
    const hurt = new Set<string>();
    let offInjured = 0;
    while (!sim.finished) {
      sim.step();
      for (const e of sim.tickEvents) {
        if (e.kind === 'injury') hurt.add(e.player!);
        if (e.kind === 'interchange') {
          // Nobody hurt comes back on.
          expect(hurt.has(e.player!)).toBe(false);
          const m = /on for the injured (.+)$/.exec(e.text);
          if (m) offInjured++;
        }
      }
    }
    expect(hurt.size).toBeGreaterThan(0);
    expect(sim.injuries.length).toBe(hurt.size);
    expect(offInjured).toBeGreaterThan(0);
    expect(offInjured).toBeLessThanOrEqual(hurt.size);
  }, 30_000);

  it('runMatch reports injuries by squad id, 1–3 weeks, and the same seed gives the same injuries', () => {
    restore = applyTuning({ 'weather.injuryBase': 0.3 });
    const rng = makeRng(5);
    const squad = Array.from({ length: 13 }, (_, i) => generatePlayer(rng, { position: i % 2 ? 'prop' : 'centre' }));
    const mine = teamSheetFromSquad(squad, 'me', 'Me', ['#111', '#eee']);
    const them = { ...sideSheet('them', { rating: 60 }), clubId: 'them' };
    const a = runMatch(mine, them, { seed: 9, weather: 'rain' });
    const b = runMatch(mine, them, { seed: 9, weather: 'rain' });
    expect(a.weather).toBe('rain');
    expect(a.injuries).toEqual(b.injuries);
    const ours = a.injuries.filter((i) => i.teamId === 'me');
    expect(ours.length).toBeGreaterThan(0);
    const ids = new Set(squad.map((p) => p.id));
    for (const i of ours) {
      expect(ids.has(i.playerId!)).toBe(true);
      expect(i.weeks).toBeGreaterThanOrEqual(1);
      expect(i.weeks).toBeLessThanOrEqual(3);
    }
    // No injuries when the difficulty switches them off.
    expect(runMatch(mine, them, { seed: 9, injuryRate: 0 }).injuries).toEqual([]);
  }, 30_000);
});
