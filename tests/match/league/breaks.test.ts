// tests/match/league/breaks.test.ts — the plan changes at the breaks (N13.5, #316).
// The rule's table, the hook only at half-time and after a try, and no rule
// leaving the match as it was.
import { describe, it, expect } from 'vitest';
import { BREAKS, defaultBreakRule, planWhenBehind, stepPlan, type BreakFacts } from '../../../src/match/league/breaks';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import { checkPlan, type Plan } from '../../../src/match/balance/plan';
import { checkTuning } from '../../../src/match/league/tuning';
import type { TeamTactics } from '../../../src/match/league/presets';
import type { MatchLength } from '../../../src/match/league/rules';
import type { SimEvent } from '../../../src/match/core/snapshot';

const H = sideSheet('H', { rating: 60 });
const A = sideSheet('A', { rating: 60 });
const SHORT: MatchLength = { halves: 2, halfMinutes: 3 };
const BAL: TeamTactics = { attack: 'balanced', defence: 'slide' };

function facts(over: Partial<BreakFacts> = {}): BreakFacts {
  return {
    score: { home: 0, away: 0 },
    minute: 9,
    plan: { ...BAL },
    side: 'home',
    at: 'half-time',
    concededInARow: 0,
    ...over,
  };
}

describe('the break rule’s table (N13.5)', () => {
  it('opens one step when 8 down at half-time, and not when 6 down or after one try', () => {
    expect(defaultBreakRule(facts({ score: { home: 0, away: 8 } }))).toEqual({ attack: 'expansive', defence: 'rush' });
    expect(defaultBreakRule(facts({ score: { home: 0, away: BREAKS.downBy } }))).toEqual(planWhenBehind(BAL));
    expect(defaultBreakRule(facts({ score: { home: 6, away: 12 } }))).toBeNull();
    expect(defaultBreakRule(facts({ at: 'try', score: { home: 0, away: 12 }, concededInARow: 1 }))).toBeNull();
  });

  it('opens after two tries conceded in a row, even in front, and a late lead tightens when the run has not', () => {
    expect(defaultBreakRule(facts({ at: 'try', minute: 16, score: { home: 18, away: 6 }, concededInARow: 2 }))).toEqual({ attack: 'expansive', defence: 'rush' });
    expect(defaultBreakRule(facts({ at: 'try', minute: 16, score: { home: 18, away: 6 }, concededInARow: 1 }))).toEqual({ attack: 'grind', defence: 'compressed' });
    expect(defaultBreakRule(facts({ at: 'try', minute: 11, score: { home: 18, away: 0 }, concededInARow: 0 }))).toBeNull();
    expect(defaultBreakRule(facts({ at: 'try', minute: 12, score: { home: 18, away: 0 }, concededInARow: 0 }))).toEqual({ attack: 'grind', defence: 'compressed' });
    expect(defaultBreakRule(facts({ at: 'half-time', minute: 9, score: { home: 18, away: 0 } }))).toBeNull();
  });

  it('steps the presets, and stops at the ends', () => {
    expect(stepPlan({ attack: 'grind', defence: 'compressed' }, 1)).toEqual({ attack: 'balanced', defence: 'slide' });
    expect(stepPlan({ attack: 'all-out', defence: 'rush' }, 1)).toEqual({ attack: 'all-out', defence: 'rush' });
    expect(defaultBreakRule(facts({ plan: { attack: 'all-out', defence: 'rush' }, score: { home: 0, away: 12 } }))).toBeNull();
    // Kick-chase sits off the line. Assumed: open to Expansive, tighten to Grind.
    expect(stepPlan({ attack: 'kick-chase', defence: 'slide' }, 1)).toEqual({ attack: 'expansive', defence: 'rush' });
    expect(stepPlan({ attack: 'kick-chase', defence: 'slide' }, -1)).toEqual({ attack: 'grind', defence: 'compressed' });
  });

  it('reads the away side’s own margin', () => {
    expect(defaultBreakRule(facts({ side: 'away', score: { home: 10, away: 0 } }))).toEqual({ attack: 'expansive', defence: 'rush' });
    expect(defaultBreakRule(facts({ side: 'away', score: { home: 0, away: 10 } }))).toBeNull();
  });

  it('the thresholds are knobs', () => {
    expect(checkTuning({ 'breaks.downBy': 4, 'breaks.concededRun': 3, 'breaks.upBy': 6, 'breaks.tightenFromMinute': 12 })).toEqual([]);
    expect(checkTuning({ 'breaks.missing': 1 }).join('\n')).toMatch(/no such knob/);
  });
});

describe('the hook fires at the breaks only (N13.5)', () => {
  it('a rule is asked at half-time and after a try, and nowhere else', () => {
    const seen: string[] = [];
    let sim!: LiveSim;
    const rule = (f: { at: string }): null => {
      seen.push(`${f.at}:${sim.phaseKind}`);
      return null;
    };
    for (let seed = 3; seed < 40 && !seen.some((s) => s.startsWith('try:')); seed++) {
      sim = new LiveSim(H, A, seed, { length: SHORT, breakRuleSides: ['home'], breakRule: rule });
      while (!sim.finished) sim.step();
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => s === 'half-time:half-time' || s === 'try:try')).toBe(true);
    expect(seen.some((s) => s.startsWith('half-time:'))).toBe(true);
    expect(seen.some((s) => s.startsWith('try:'))).toBe(true);
  });

  it('the plan it returns is in force from the restart, and the same plan again changes nothing', () => {
    const open: TeamTactics = { attack: 'expansive', defence: 'rush' };
    const sim = new LiveSim(H, A, 3, {
      length: SHORT,
      breakRuleSides: ['home'],
      breakRule: (f) => (f.at === 'half-time' ? open : null),
    });
    const events: SimEvent[] = [];
    while (!sim.finished) {
      sim.step();
      events.push(...sim.tickEvents);
    }
    const plan = events.filter((e) => e.kind === 'plan');
    expect(plan).toHaveLength(1);
    expect(plan[0]!.text).toContain('Expansive / Rush');
    expect(sim.tactics.home).toEqual(open);
    expect(sim.tactics.away).toEqual(BAL);
    expect(sim.planChanges).toEqual([{ minute: expect.any(Number), side: 'home', attack: 'expansive', defence: 'rush', at: 'half-time' }]);

    const same = new LiveSim(H, A, 3, {
      length: SHORT,
      breakRuleSides: ['away'],
      breakRule: () => ({ ...BAL }),
    });
    const sameEvents: SimEvent[] = [];
    while (!same.finished) {
      same.step();
      sameEvents.push(...same.tickEvents);
    }
    expect(sameEvents.some((e) => e.kind === 'plan')).toBe(false);
    expect(same.planChanges).toEqual([]);
  });

  it('a coach who has already chosen this break is not overwritten', () => {
    const plans: { tick: number; side: 'home'; tactics: TeamTactics }[] = [];
    const sim = new LiveSim(H, A, 5, {
      length: SHORT,
      plans,
      breakRuleSides: ['home'],
      breakRule: (f) => (f.at === 'half-time' ? { attack: 'all-out', defence: 'rush' } : null),
    });
    while (!sim.finished) {
      if (sim.phaseKind === 'half-time' && plans.length === 0) plans.push({ tick: sim.tick + 1, side: 'home', tactics: { attack: 'grind', defence: 'compressed' } });
      sim.step();
    }
    expect(sim.tactics.home).toEqual({ attack: 'grind', defence: 'compressed' });
  });

  it('with no rule a match is the match it was, including the result’s shape', () => {
    const plain = runMatch(H, A, { seed: 7, length: SHORT });
    const named = runMatch(H, A, { seed: 7, length: SHORT, breakRuleSides: [] });
    expect(named).toEqual(plain);
    expect(plain.planChanges).toBeUndefined();
    const asked = new LiveSim(H, A, 7, { length: SHORT, breakRule: () => null, breakRuleSides: ['home', 'away'] });
    const events: SimEvent[] = [];
    while (!asked.finished) {
      asked.step();
      events.push(...asked.tickEvents);
    }
    const none = new LiveSim(H, A, 7, { length: SHORT });
    const base: SimEvent[] = [];
    while (!none.finished) {
      none.step();
      base.push(...none.tickEvents);
    }
    expect(events).toEqual(base);
  });

  it('the harness names the sides, and a bad list is refused', () => {
    const plan: Plan = { name: 'p', seeds: 1, scenarios: [{ name: 'e', home: { rating: 60 }, away: { rating: 60 }, breakRule: ['away'], track: 'home', bothWays: true }] };
    expect(checkPlan(plan)).toEqual([]);
    expect(checkPlan({ ...plan, scenarios: [{ name: 'e', home: { rating: 60 }, away: { rating: 60 }, breakRule: ['both'] as never }] }).join('\n')).toMatch(/breakRule/);
  });
});
