// tests/match/league/goldenPoint.test.ts — golden point in drawn finals (N9.4):
// a final level at full time plays on, and the next score wins it (a try with
// no conversion, a penalty goal or a field goal); still level when golden
// point is up, it stays a draw (the higher seed goes through, fixtures.ts).
// Anything not drawn plays exactly as before.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { clockText, NINES } from '../../../src/match/league/rules';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { TeamSheet } from '../../../src/sim/events';

const POSITIONS = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'] as const;
const sheet = (id: string): TeamSheet => ({
  clubId: id,
  name: id,
  attack: 60,
  defense: 60,
  kicking: 60,
  fitness: 60,
  colors: ['#111', '#eee'],
  roster: POSITIONS.map((position, i) => ({ name: `${id} ${position} ${i}`, position, stats: { speed: 60, strength: 60, stamina: 50, skill: 60, footyIQ: 60 } })),
});

interface Played {
  events: SimEvent[];
  points: { home: number; away: number };
  ticks: number;
}
function play(seed: number, goldenPoint: boolean): Played {
  const sim = new LiveSim(sheet('H'), sheet('A'), seed, goldenPoint ? { goldenPoint } : {});
  const events: SimEvent[] = [];
  while (!sim.finished) {
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { events, points: { ...sim.points }, ticks: sim.tick };
}

/** Seeds whose match is drawn at full time (about one in ten between even sides). */
const drawn: number[] = [];
for (let seed = 1; drawn.length < 6 && seed <= 120; seed++) {
  const p = play(seed, false);
  if (p.points.home === p.points.away) drawn.push(seed);
}

describe('golden point (N9.4)', () => {
  it('a drawn final plays on from full time: the same match up to then, then the next score wins', () => {
    expect(drawn.length).toBeGreaterThanOrEqual(3);
    let decided = 0;
    for (const seed of drawn) {
      const reg = play(seed, false);
      const gp = play(seed, true);
      // Identical until the full-time whistle, which becomes golden point.
      const ftAt = reg.events.findIndex((e) => e.kind === 'full-time');
      const gpAt = gp.events.findIndex((e) => e.kind === 'golden-point');
      expect(gpAt).toBe(ftAt);
      expect(gp.events.slice(0, gpAt).map((e) => `${e.tick}:${e.kind}`)).toEqual(reg.events.slice(0, ftAt).map((e) => `${e.tick}:${e.kind}`));
      expect(gp.events[gpAt]!.text).toMatch(/golden point/i);
      const end = gp.events[gp.events.length - 1]!;
      expect(end.kind).toBe('full-time');
      const after = gp.events.slice(gpAt + 1);
      if (end.detail === 'golden-point') {
        decided++;
        // One score decides it, by its own points, and nothing after it: no conversion.
        const scores = after.filter((e) => e.kind === 'try' || (e.detail === 'good' && (e.kind === 'penalty-goal' || e.kind === 'field-goal')));
        expect(scores).toHaveLength(1);
        expect(after.some((e) => e.kind === 'conversion')).toBe(false);
        expect(Math.abs(gp.points.home - gp.points.away)).toBeGreaterThan(0);
        expect(end.text).toMatch(/^Golden point to /);
      } else {
        // Nobody scored in time: still a draw (the seeding decides, fixtures.ts).
        expect(gp.points.home).toBe(gp.points.away);
      }
      // Golden point is no longer than its minutes plus the play-on after its siren.
      const gpStart = gp.events[gpAt]!.tick;
      expect(gp.ticks - gpStart).toBeLessThanOrEqual(((NINES.goldenPointMinutes * 60 + NINES.playOnMaxS) / 0.05) + NINES.goldenPointBreakTicks + 400);
    }
    expect(decided).toBeGreaterThan(0);
  }, 300_000);

  it('a final that is not drawn plays exactly as before', () => {
    let checked = 0;
    for (let seed = 1; checked < 3 && seed <= 20; seed++) {
      if (drawn.includes(seed)) continue;
      const reg = play(seed, false);
      const gp = play(seed, true);
      expect(gp.points).toEqual(reg.points);
      expect(gp.ticks).toBe(reg.ticks);
      expect(gp.events.some((e) => e.kind === 'golden-point')).toBe(false);
      checked++;
    }
  }, 120_000);

  it('the clock reads GP in golden point', () => {
    expect(clockText(1, 65)).toBe('1st 1:05');
    expect(clockText(2, 65)).toBe('2nd 1:05');
    expect(clockText(3, 65)).toBe('GP 1:05');
  });
});
