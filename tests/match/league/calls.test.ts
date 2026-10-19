// tests/match/league/calls.test.ts — coach calls (#73, docs/specs/coach-calls.md
// step 1): a call is an input to the running sim at a tick. No calls plays
// exactly as runMatch; the same seed and calls give the same match; one call a
// set each way; and each call moves the play it is about.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import { CALLS, chipState, withAttackCall, type CallInput, type CoachCall } from '../../../src/match/league/calls';
import { attackPlan } from '../../../src/match/league/presets';
import type { SimEvent } from '../../../src/match/core/snapshot';
import type { MatchLength } from '../../../src/match/league/rules';

const H = sideSheet('H', { rating: 60 });
const A = sideSheet('A', { rating: 60 });
const SHORT: MatchLength = { halves: 1, halfMinutes: 4 };

/** Play with a coach on `side` who makes `call` whenever he may. */
function play(seed: number, side: 'home' | 'away' | null, call: CoachCall | null, minutes = 4): { sim: LiveSim; events: SimEvent[]; calls: CallInput[] } {
  const calls: CallInput[] = [];
  const sim = new LiveSim(H, A, seed, { length: { halves: 1, halfMinutes: minutes }, calls });
  const events: SimEvent[] = [];
  while (!sim.finished) {
    if (side && call && sim.callRefusal(side, call) === null) calls.push({ tick: sim.tick + 1, side, call });
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { sim, events, calls };
}

describe('coach calls (pure)', () => {
  it('a hit-up tucks it and takes the line on; a shift goes wide', () => {
    const plan = attackPlan('balanced', 'midfield');
    const hit = withAttackCall(plan, 'hit-up');
    expect(hit.hitUps).toBe(plan.hitUps + CALLS.hitUp.hitUps);
    expect(hit.pass).toBeLessThan(plan.pass);
    expect(hit.offload).toBeLessThan(plan.offload);
    const wide = withAttackCall(plan, 'shift-left');
    expect(wide.width).toBeGreaterThan(plan.width);
    expect(wide.edges).toBeGreaterThan(plan.edges);
    expect(withAttackCall(plan, null)).toEqual(plan);
  });
});

describe('the coach’s chips (#73 §4)', () => {
  it('only the calls that make sense now; once one is made, only it, lit, for the rest of the set', () => {
    // With the ball: the attack calls; Rush and Hold hidden.
    expect(chipState('hit-up', null, true, null)).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('rush', 'not while you have the ball', true, null).show).toBe(false);
    // A late-set kick shows only once it is allowed.
    expect(chipState('bomb', 'late in the set', true, null).show).toBe(false);
    expect(chipState('bomb', null, true, null).show).toBe(true);
    expect(chipState('field-goal', 'not in range', true, null).show).toBe(false);
    // Defending: Rush and Hold.
    expect(chipState('hold', null, false, null)).toEqual({ show: true, enabled: true, lit: false });
    expect(chipState('shift-left', 'not your ball', false, null).show).toBe(false);
    // Made this set.
    expect(chipState('shift-left', 'one call a set', true, 'shift-left')).toEqual({ show: true, enabled: false, lit: true });
    expect(chipState('hit-up', 'one call a set', true, 'shift-left').show).toBe(false);
  });
});

describe('coach calls in the live sim', () => {
  it('no calls plays exactly as runMatch; the same seed and calls give the same match', () => {
    const r = runMatch(H, A, { seed: 3, length: SHORT });
    const sim = new LiveSim(H, A, 3, { length: SHORT, calls: [] });
    while (!sim.finished) sim.step();
    expect([sim.points.home, sim.points.away]).toEqual([r.homeScore, r.awayScore]);
    const a = play(5, 'home', 'shift-left');
    const replay = new LiveSim(H, A, 5, { length: SHORT, calls: [...a.calls] });
    const evs: SimEvent[] = [];
    while (!replay.finished) {
      replay.step();
      evs.push(...replay.tickEvents);
    }
    expect(evs).toEqual(a.events);
    expect(a.calls.length).toBeGreaterThan(3);
  }, 30_000);

  it('one call a set each way, and only the calls that make sense now', () => {
    const sim = new LiveSim(H, A, 2, { length: SHORT });
    // Play to an attacking set.
    while (!(sim.phaseKind === 'play' && sim.tackleCount === 1)) sim.step();
    const atk = sim.inPossession;
    const def = atk === 'home' ? 'away' : 'home';
    expect(sim.callRefusal(atk, 'rush')).toBe('not while you have the ball');
    expect(sim.callRefusal(def, 'hit-up')).toBe('not your ball');
    expect(sim.callRefusal(atk, 'run-it')).toBe('late in the set');
    expect(sim.callRefusal(atk, 'field-goal')).toBe('not in range');
    expect(sim.call(atk, 'hit-up')).toBeNull();
    expect(sim.callRefusal(atk, 'shift-left')).toBe('one call a set');
    expect(sim.call(def, 'rush')).toBeNull();
    expect(sim.callRefusal(def, 'hold')).toBe('one call a set');
    // The next set (the ball changes hands or the count goes back) frees both.
    const start = sim.inPossession;
    while (sim.inPossession === start) sim.step();
    expect(sim.callRefusal(start === 'home' ? 'away' : 'home', 'hit-up')).toBeNull();
  }, 30_000);

  it('each call is announced and moves its play: rush hits harder and is busted more; run it kicks less; kick early kicks more', () => {
    const count = (es: SimEvent[], kind: string, side?: string): number => es.filter((e) => e.kind === kind && (!side || e.side === side)).length;
    const runs = (side: 'home' | null, call: CoachCall | null): SimEvent[] => [1, 2, 3, 4, 5, 6].flatMap((s) => play(s, side, call).events);
    const none = runs(null, null);
    const rush = runs('home', 'rush');
    expect(rush.some((e) => e.kind === 'coach-call' && e.detail === 'rush' && e.side === 'home')).toBe(true);
    expect(count(rush, 'big-hit', 'home')).toBeGreaterThan(count(none, 'big-hit', 'home'));
    expect(count(rush, 'break-tackle', 'away')).toBeGreaterThan(count(none, 'break-tackle', 'away'));
    expect(count(runs('home', 'run-it'), 'kick', 'home')).toBeLessThan(count(none, 'kick', 'home') * 0.7);
    expect(count(runs('home', 'kick-early'), 'kick', 'home')).toBeGreaterThan(count(none, 'kick', 'home') * 1.3);
  }, 120_000);
});
