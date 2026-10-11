// tests/sim/engine.test.ts — statistical calibration (≥200 seeded runs),
// determinism, contract conformance, and performance. See BAK-191 / BAK-206 /
// GitHub #6 (fitness), #7 (injury), #8 (home advantage).
import { describe, it, expect } from 'vitest';
import { simulateMatch } from '../../src/sim/engine';
import type { MatchResult, RosterEntry, TeamSheet } from '../../src/sim/events';

function sheet(clubId: string, rating: number, extras: Partial<TeamSheet> = {}): TeamSheet {
  return {
    clubId,
    name: clubId,
    attack: rating,
    defense: rating,
    kicking: rating,
    fitness: rating,
    colors: ['#000000', '#ffffff'],
    ...extras,
  };
}

function rosterWithRisk(names: string[], injuryRisk: number): RosterEntry[] {
  const positions = [
    'fullback',
    'winger',
    'winger',
    'centre',
    'five-eighth',
    'halfback',
    'hooker',
    'prop',
    'second-row',
  ] as const;
  return names.map((name, i) => ({
    name,
    position: positions[i % positions.length]!,
    stats: { speed: 50, strength: 50, stamina: 50, skill: 50, footyIQ: 50 },
    id: `p-${name}`,
    injuryRisk,
  }));
}

const RUNS = 300; // ≥200 per acceptance criteria

function runMany(home: TeamSheet, away: TeamSheet, seedBase = 0): MatchResult[] {
  const out: MatchResult[] = [];
  for (let s = 0; s < RUNS; s++) {
    out.push(simulateMatch(home, away, { seed: seedBase + s, weather: 'clear' }));
  }
  return out;
}

describe('simulateMatch — contract conformance', () => {
  const r = simulateMatch(sheet('H', 50), sheet('A', 50), { seed: 42, weather: 'clear' });

  it('returns all §6 fields populated', () => {
    expect(typeof r.homeScore).toBe('number');
    expect(typeof r.awayScore).toBe('number');
    expect(Array.isArray(r.events)).toBe(true);
    expect(r.stats.possession).toHaveLength(2);
    expect(r.stats.tackles).toHaveLength(2);
    expect(r.stats.errors).toHaveLength(2);
    expect(r.stats.tries).toHaveLength(2);
    expect(r.weather).toBe('clear');
    expect(Array.isArray(r.momentumTimeline)).toBe(true);
    expect(r.momentumTimeline.length).toBeGreaterThan(0);
    expect(Array.isArray(r.injuries)).toBe(true);
  });

  it('events are ordered by t; first is kickoff, last is full-time', () => {
    expect(r.events[0]?.kind).toBe('kickoff');
    expect(r.events[r.events.length - 1]?.kind).toBe('full-time');
    for (let i = 1; i < r.events.length; i++) {
      expect(r.events[i]!.t).toBeGreaterThanOrEqual(r.events[i - 1]!.t);
    }
  });

  it('scores are integers', () => {
    expect(Number.isInteger(r.homeScore)).toBe(true);
    expect(Number.isInteger(r.awayScore)).toBe(true);
  });

  it('possession sums to 100', () => {
    expect(r.stats.possession[0] + r.stats.possession[1]).toBe(100);
  });

  it('emits exactly one half-time', () => {
    expect(r.events.filter((e) => e.kind === 'half-time')).toHaveLength(1);
  });

  it('momentum timeline values stay within [-100, 100]', () => {
    for (const m of r.momentumTimeline) {
      expect(m.value).toBeGreaterThanOrEqual(-100);
      expect(m.value).toBeLessThanOrEqual(100);
    }
  });
});

describe('simulateMatch — determinism', () => {
  it('same seed twice → deep-equal results', () => {
    const a = simulateMatch(sheet('H', 63), sheet('A', 57), { seed: 12345, weather: 'rain' });
    const b = simulateMatch(sheet('H', 63), sheet('A', 57), { seed: 12345, weather: 'rain' });
    expect(a).toEqual(b);
  });

  it('different seeds → generally different results', () => {
    const a = simulateMatch(sheet('H', 50), sheet('A', 50), { seed: 1, weather: 'clear' });
    const b = simulateMatch(sheet('H', 50), sheet('A', 50), { seed: 2, weather: 'clear' });
    // Not a hard guarantee, but scorelines or event counts should differ.
    const differ = a.homeScore !== b.homeScore || a.awayScore !== b.awayScore || a.events.length !== b.events.length;
    expect(differ).toBe(true);
  });
});

describe('simulateMatch — statistical calibration (equal teams)', () => {
  const results = runMany(sheet('H', 50), sheet('A', 50));

  // BAK-206: Nines + contest/kicks raise event density; score band widened vs BAK-191.
  it('mean total score is 18-60', () => {
    const meanTotal = results.reduce((sum, r) => sum + r.homeScore + r.awayScore, 0) / results.length;
    expect(meanTotal).toBeGreaterThanOrEqual(18);
    expect(meanTotal).toBeLessThanOrEqual(60);
  });

  // GitHub #8: small home attack/defense nudge → expect ~52–58% home wins (was 45–55%).
  it('home win rate is 52-58% (home advantage)', () => {
    const homeWins = results.filter((r) => r.homeScore > r.awayScore).length;
    const rate = (homeWins / results.length) * 100;
    expect(rate).toBeGreaterThanOrEqual(52);
    expect(rate).toBeLessThanOrEqual(58);
  });

  it('≤2% of runs end 0-0', () => {
    const zeros = results.filter((r) => r.homeScore === 0 && r.awayScore === 0).length;
    expect(zeros / results.length).toBeLessThanOrEqual(0.02);
  });

  it('emits tackles and last-tackle kicks across the sample', () => {
    const withTackle = results.filter((r) => r.events.some((e) => e.kind === 'tackle')).length;
    const withKick = results.filter((r) => r.events.some((e) => e.kind === 'kick')).length;
    expect(withTackle / results.length).toBeGreaterThan(0.9);
    expect(withKick / results.length).toBeGreaterThan(0.9);
  });

  it('produces more break-like events than a quiet baseline', () => {
    const meanBreaks =
      results.reduce(
        (sum, r) =>
          sum + r.events.filter((e) => e.kind === 'break' || e.kind === 'break-tackle' || e.kind === 'fend').length,
        0,
      ) / results.length;
    expect(meanBreaks).toBeGreaterThan(3);
  });
});

describe('simulateMatch — statistical calibration (mismatched teams)', () => {
  const results = runMany(sheet('H', 80), sheet('A', 40), 9000);

  it('strong side wins ≥80% and <100%', () => {
    const strongWins = results.filter((r) => r.homeScore > r.awayScore).length;
    const rate = strongWins / results.length;
    expect(rate).toBeGreaterThanOrEqual(0.8);
    expect(rate).toBeLessThan(1.0);
  });
});

describe('simulateMatch — late-match fitness (GitHub #6)', () => {
  // Equal attack/defense/kicking; only fitness differs. High fitness should
  // commit fewer late errors and keep more break-like outcomes after t≥60.
  const hiFit = runMany(sheet('H', 50, { fitness: 90 }), sheet('A', 50, { fitness: 90 }), 20000);
  const loFit = runMany(sheet('H', 50, { fitness: 20 }), sheet('A', 50, { fitness: 20 }), 20000);

  function lateErrors(results: MatchResult[]): number {
    return (
      results.reduce(
        (sum, r) => sum + r.events.filter((e) => e.kind === 'error' && e.t >= 60).length,
        0,
      ) / results.length
    );
  }

  function lateBreaks(results: MatchResult[]): number {
    return (
      results.reduce(
        (sum, r) =>
          sum +
          r.events.filter(
            (e) => (e.kind === 'break' || e.kind === 'break-tackle') && e.t >= 60,
          ).length,
        0,
      ) / results.length
    );
  }

  it('higher fitness → fewer late errors than low fitness', () => {
    expect(lateErrors(hiFit)).toBeLessThan(lateErrors(loFit));
  });

  it('higher fitness → more late break retention than low fitness', () => {
    expect(lateBreaks(hiFit)).toBeGreaterThan(lateBreaks(loFit));
  });
});

describe('simulateMatch — big-hit injuries (GitHub #7)', () => {
  const names = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'];
  const home = sheet('H', 50, { roster: rosterWithRisk(names, 90) });
  const away = sheet('A', 50, { roster: rosterWithRisk(names.map((n) => `B${n}`), 90) });

  it('injury rolls are deterministic per seed', () => {
    const a = simulateMatch(home, away, { seed: 4242, weather: 'clear' });
    const b = simulateMatch(home, away, { seed: 4242, weather: 'clear' });
    expect(a.injuries).toEqual(b.injuries);
  });

  it('high injuryRisk produces some injuries across a sample; weeks in 1..3', () => {
    let any = 0;
    for (let s = 0; s < 200; s++) {
      const r = simulateMatch(home, away, { seed: 50000 + s, weather: 'clear' });
      for (const inj of r.injuries) {
        any++;
        expect(inj.weeks).toBeGreaterThanOrEqual(1);
        expect(inj.weeks).toBeLessThanOrEqual(3);
        expect(inj.playerId).toBeTruthy();
        expect(inj.playerName).toBeTruthy();
      }
    }
    expect(any).toBeGreaterThan(0);
  });

  it('marks big-hit detail with injured when an injury lands', () => {
    let found = false;
    for (let s = 0; s < 400 && !found; s++) {
      const r = simulateMatch(home, away, { seed: 70000 + s, weather: 'clear' });
      if (r.injuries.length === 0) continue;
      const tagged = r.events.some((e) => e.kind === 'big-hit' && e.detail === 'driven|injured');
      expect(tagged).toBe(true);
      found = true;
    }
    expect(found).toBe(true);
  });
});

describe('simulateMatch — performance', () => {
  it('a single call completes in <50ms', () => {
    const start = performance.now();
    simulateMatch(sheet('H', 55), sheet('A', 48), { seed: 777, weather: 'wind' });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
