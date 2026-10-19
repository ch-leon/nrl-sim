// tests/ui/screens/scoreBanner.test.ts — the centre-screen pop-up for every
// scoring attempt: who scored, what it was, and how many points. Pure — no DOM.
import { describe, it, expect } from 'vitest';
import { BANNER_MS, initLiveState, inkFor, reduceEvent, scoreBanner } from '../../../src/ui/screens/matchOverlay';
import { simulateMatch } from '../../../src/sim/engine';
import type { MatchEvent, TeamSheet } from '../../../src/sim/events';

const NAMES = ['Storm', 'Bears'] as const;
const ev = (over: Partial<MatchEvent>): MatchEvent => ({ t: 20, kind: 'try', teamId: 'H', player: 'Jarrah Kavanagh', ...over });

describe('scoreBanner', () => {
  it('a try: TRY!, the scorer, his team, +4', () => {
    expect(scoreBanner(ev({}), 'H', NAMES)).toEqual({
      side: 0,
      headline: 'TRY!',
      scorer: 'Jarrah Kavanagh',
      team: 'Storm',
      points: 4,
      conversion: false,
    });
  });
  it('a Nines bonus-zone try (between the posts): BONUS TRY!, +5, and the overlay counts five', () => {
    expect(scoreBanner(ev({ detail: 'bonus' }), 'H', NAMES)).toMatchObject({ headline: 'BONUS TRY!', points: 5 });
    const s = reduceEvent(initLiveState(), ev({ detail: 'bonus' }), 'H');
    expect([s.homeScore, s.awayScore]).toEqual([5, 0]);
    expect(s.tries).toEqual([1, 0]);
  });

  it('kicks: converted / penalty goal +2, field goal +1, for the kicking side', () => {
    const conv = scoreBanner(ev({ kind: 'conversion', teamId: 'A', player: 'Rhys Radbourne', detail: 'good' }), 'H', NAMES);
    expect(conv).toMatchObject({ side: 1, headline: 'CONVERTED', scorer: 'Rhys Radbourne', team: 'Bears', points: 2, conversion: true });
    expect(scoreBanner(ev({ kind: 'penalty-goal', detail: 'good' }), 'H', NAMES)).toMatchObject({ headline: 'PENALTY GOAL', points: 2 });
    expect(scoreBanner(ev({ kind: 'field-goal', detail: 'good' }), 'H', NAMES)).toMatchObject({ headline: 'FIELD GOAL!', points: 1 });
  });

  it('misses still pop up, for no points', () => {
    for (const kind of ['conversion', 'penalty-goal', 'field-goal'] as const) {
      const b = scoreBanner(ev({ kind, detail: 'missed' }), 'H', NAMES)!;
      expect(b.headline).toMatch(/MISSED$/);
      expect(b.points).toBe(0);
    }
  });

  it('falls back to the team name when the event has no player', () => {
    const { player: _p, ...anon } = ev({ kind: 'penalty-goal', detail: 'good' });
    expect(scoreBanner(anon, 'H', NAMES)?.scorer).toBe('Storm');
  });

  it('is null for everything that is not a scoring attempt', () => {
    for (const kind of ['run', 'tackle', 'big-hit', 'kick', 'error', 'set-start', 'penalty', 'half-time', 'full-time'] as const) {
      expect(scoreBanner(ev({ kind }), 'H', NAMES)).toBeNull();
    }
  });

  it('every point in a simulated match comes with a banner', () => {
    const sheet = (id: string): TeamSheet => ({ clubId: id, name: id, attack: 70, defense: 50, kicking: 70, fitness: 60, colors: ['#111', '#eee'] });
    for (let seed = 0; seed < 40; seed++) {
      const res = simulateMatch(sheet('H'), sheet('A'), { seed, weather: 'clear' });
      const pts = [0, 0];
      for (const e of res.events) {
        const b = scoreBanner(e, 'H', ['H', 'A']);
        if (b) pts[b.side]! += b.points;
      }
      expect(pts, `seed ${seed}`).toEqual([res.homeScore, res.awayScore]);
    }
  });

  it('holds a try banner longer than a kick banner', () => {
    expect(BANNER_MS.try).toBeGreaterThan(BANNER_MS.kick);
    expect(BANNER_MS.kick).toBeGreaterThanOrEqual(2000);
  });
});

describe('inkFor', () => {
  it('picks black on light team colours and white on dark ones', () => {
    expect(inkFor('#f4d03f')).toBe('#000');
    expect(inkFor('#ffffff')).toBe('#000');
    expect(inkFor('#1a1a2e')).toBe('#fff');
    expect(inkFor('#b03a2e')).toBe('#fff');
    expect(inkFor('#fff')).toBe('#000');
    expect(inkFor('not-a-colour')).toBe('#fff');
  });
});
