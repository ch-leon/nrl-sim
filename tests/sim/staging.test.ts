// tests/sim/staging.test.ts — presentation staging of the engine log.
import { describe, it, expect } from 'vitest';
import { simulateMatch } from '../../src/sim/engine';
import { stageEvents, generatedRoster, kickerOf, STANDARD_POSITIONS } from '../../src/sim/staging';
import type { MatchEvent, TeamSheet } from '../../src/sim/events';

function sheet(clubId: string, rating: number, withRoster = false): TeamSheet {
  const s: TeamSheet = {
    clubId, name: clubId, attack: rating, defense: rating, kicking: rating, fitness: rating,
    colors: ['#000000', '#ffffff'],
  };
  if (withRoster) s.roster = STANDARD_POSITIONS.map((position, i) => ({ name: `${clubId}-${i}`, position }));
  return s;
}

describe('stageEvents', () => {
  const H = sheet('H', 60, true);
  const A = sheet('A', 60);

  it('converts attacker-relative x to absolute (home attacks toward 100)', () => {
    const raw: MatchEvent[] = [
      { t: 0, kind: 'kickoff', teamId: 'H', x: 50, y: 50 },
      { t: 1, kind: 'set-start', teamId: 'A', x: 20, y: 50 },
      { t: 2, kind: 'run', teamId: 'A', x: 30, y: 50 },
      { t: 3, kind: 'big-hit', teamId: 'H', x: 30, y: 50 }, // defender id, attacker-relative x
      { t: 4, kind: 'try', teamId: 'A', x: 100, y: 50 },
      { t: 5, kind: 'set-start', teamId: 'H', x: 20, y: 50 },
      { t: 6, kind: 'try', teamId: 'H', x: 100, y: 50 },
    ];
    const s = stageEvents(raw, H, A, 1);
    expect(s.map((e) => e.x)).toEqual([50, 80, 70, 70, 0, 20, 100]);
    expect(raw[2]!.x).toBe(30); // input untouched
  });

  it('spreads play across the width and names actors', () => {
    const m = simulateMatch(H, A, { seed: 99 });
    const ys = new Set(m.events.filter((e) => e.y !== undefined).map((e) => e.y));
    expect(ys.size).toBeGreaterThan(10);
    for (const e of m.events) {
      if (e.y !== undefined) {
        expect(e.y).toBeGreaterThanOrEqual(5);
        expect(e.y).toBeLessThanOrEqual(95);
      }
      if (e.kind === 'run' || e.kind === 'try' || e.kind === 'break') expect(e.player).toBeTruthy();
    }
    // Home names come from its roster; conversions go to its halfback.
    const homeConv = m.events.find((e) => e.kind === 'conversion' && e.teamId === 'H');
    if (homeConv) expect(homeConv.player).toBe('H-6');
  });

  it('home tries land at x=100 and away tries at x=0', () => {
    for (let seed = 0; seed < 40; seed++) {
      const m = simulateMatch(H, A, { seed });
      for (const e of m.events.filter((ev) => ev.kind === 'try')) {
        expect(e.x).toBe(e.teamId === 'H' ? 100 : 0);
      }
    }
  });

  it('tags possession changes on set-start', () => {
    const m = simulateMatch(H, A, { seed: 5 });
    const details = new Set(m.events.filter((e) => e.kind === 'set-start').map((e) => e.detail));
    expect(details.has('kick')).toBe(true);
  });

  it('is deterministic per seed', () => {
    expect(simulateMatch(H, A, { seed: 7 })).toEqual(simulateMatch(H, A, { seed: 7 }));
  });
});

describe('rosters', () => {
  it('generatedRoster is stable per club, 13 unique names in standard positions', () => {
    const r = generatedRoster('broncos');
    expect(r).toEqual(generatedRoster('broncos'));
    expect(r).toHaveLength(13);
    expect(new Set(r.map((p) => p.name)).size).toBe(13);
    expect(r.map((p) => p.position)).toEqual([...STANDARD_POSITIONS]);
    expect(generatedRoster('storm')).not.toEqual(r);
  });

  it('kickerOf prefers halfback, then five-eighth', () => {
    expect(kickerOf([{ name: 'a', position: 'prop' }, { name: 'b', position: 'five-eighth' }])?.name).toBe('b');
    expect(kickerOf([{ name: 'b', position: 'five-eighth' }, { name: 'c', position: 'halfback' }])?.name).toBe('c');
  });
});
