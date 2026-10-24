// tests/match/league/aiCalls.test.ts — the AI coach (N9.6, coach-calls spec §6) and the
// calls a Coach's Office unlocks. Rules, no dice: a field goal when one is on, a shift
// toward an overlap, Rush defending near his own line. Off by default (calls.ai.on 0),
// so a match with no calls still plays as runMatch.
import { describe, it, expect, afterEach } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { aiCoachSides, COACH_CALLS, unlockedCalls, unlockLevel } from '../../../src/match/league/calls';
import { applyTuning } from '../../../src/match/league/tuning';
import { coachsOfficeLevel } from '../../../src/systems/matchday';
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
function play(seed: number, aiCoach: ('home' | 'away')[]): { events: SimEvent[]; points: Record<string, number> } {
  const sim = new LiveSim(sheet('H'), sheet('A'), seed, aiCoach.length ? { aiCoach } : {});
  const events: SimEvent[] = [];
  while (!sim.finished) {
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { events, points: { ...sim.points } };
}
let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

describe('the AI coach (N9.6)', () => {
  it('makes shift, rush and field-goal calls for its own side only, the same every time on a seed', () => {
    const calls = new Map<string, number>();
    for (const seed of [1, 2, 3]) {
      const a = play(seed, ['home']);
      const b = play(seed, ['home']);
      expect(b.events.map((e) => `${e.tick}:${e.kind}:${e.detail ?? ''}`)).toEqual(a.events.map((e) => `${e.tick}:${e.kind}:${e.detail ?? ''}`));
      for (const e of a.events.filter((x) => x.kind === 'coach-call')) {
        expect(e.side).toBe('home');
        calls.set(e.detail!, (calls.get(e.detail!) ?? 0) + 1);
      }
    }
    expect([...calls.keys()].every((c) => ['shift-left', 'shift-right', 'rush', 'field-goal'].includes(c))).toBe(true);
    expect(calls.get('rush') ?? 0).toBeGreaterThan(0);
    expect((calls.get('shift-left') ?? 0) + (calls.get('shift-right') ?? 0)).toBeGreaterThan(0);
  }, 120_000);

  it('no AI coach, no calls: the match is runMatch’s (the golden rule holds)', () => {
    const live = play(4, []);
    const rm = runMatch(sheet('H'), sheet('A'), { seed: 4 });
    expect(live.events.some((e) => e.kind === 'coach-call')).toBe(false);
    expect([live.points.home, live.points.away]).toEqual([rm.homeScore, rm.awayScore]);
  }, 60_000);

  it('the game gives rivals one only when calls.ai.on', () => {
    expect(aiCoachSides(['away'])).toEqual([]);
    restore = applyTuning({ 'calls.ai.on': 1 });
    expect(aiCoachSides(['away'])).toEqual(['away']);
  });

  it('an explicit flag wins over the knob (N14.1): Hard on, Normal off, the knob stays 0', () => {
    expect(aiCoachSides(['away'], true)).toEqual(['away']);
    expect(aiCoachSides(['home', 'away'], false)).toEqual([]);
    restore = applyTuning({ 'calls.ai.on': 1 });
    expect(aiCoachSides(['away'], false)).toEqual([]);
    expect(aiCoachSides(['home', 'away'], true)).toEqual(['home', 'away']);
  });
});

describe('calls unlocked by the Coach’s Office (N9.6)', () => {
  it('two calls with none built, more with each level, all nine at level 3', () => {
    expect(unlockedCalls(0)).toEqual(['hit-up', 'hold']);
    expect(unlockedCalls(1)).toEqual(['hit-up', 'hold', 'shift-left', 'shift-right', 'rush']);
    expect(unlockedCalls(2)).toHaveLength(7);
    expect([...unlockedCalls(3)].sort()).toEqual([...COACH_CALLS].sort());
    expect(unlockedCalls(9)).toEqual(unlockedCalls(3));
    expect(unlockLevel('field-goal')).toBe(3);
    expect(unlockLevel('hit-up')).toBe(0);
  });
  it('the level is the best Coach’s Office built', () => {
    expect(coachsOfficeLevel({ facilities: [] })).toBe(0);
    expect(coachsOfficeLevel({ facilities: [{ defId: 'canteen', level: 3 }, { defId: 'coachsOffice', level: 1 }, { defId: 'coachsOffice', level: 2 }] })).toBe(2);
  });
});
