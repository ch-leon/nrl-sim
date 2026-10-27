// tests/match/league/calls.test.ts — coach calls (#73, docs/specs/coach-calls.md
// step 1): a call is an input to the running sim at a tick. No calls plays
// exactly as runMatch; the same seed and calls give the same match; one call a
// set each way; and each call moves the play it is about.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import { CALLS, CallJudge, chipState, withAttackCall, type CallInput, type CoachCall } from '../../../src/match/league/calls';
import { callsLine } from '../../../src/ui/screens/matchOverlay';
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

describe('calls that paid off (spec §3, last column)', () => {
  const ev = (kind: string, side: 'home' | 'away', detail?: string): SimEvent => ({ tick: 1, kind, text: '', side, ...(detail ? { detail } : {}) });

  it('a hit-up pays off on a carry that makes its metres; a shift on a line break', () => {
    const j = new CallJudge();
    j.make('home', 'hit-up', 'home', 1, 40);
    expect(j.observe([], 42, true, false)).toEqual([{ side: 'home', call: 'hit-up', paid: false, metres: 2, how: 'gain' }]);
    j.make('home', 'hit-up', 'home', 1, 43);
    expect(j.observe([], 43 + CALLS.paid.hitUpM, true, false)[0]!.paid).toBe(true);
    j.make('home', 'shift-left', 'home', 1, 50);
    expect(j.observe([ev('line-break', 'home')], 55, false, false)[0]!.paid).toBe(true);
    expect([j.made.home, j.paid.home]).toEqual([3, 2]);
  });

  it('measures the other way for a side attacking the other end', () => {
    const j = new CallJudge();
    j.make('away', 'hit-up', 'away', -1, 60);
    expect(j.observe([], 60 - CALLS.paid.hitUpM - 1, true, false)[0]!.paid).toBe(true);
  });

  it('rush pays off on a turnover; hold on a set kept short; both fail on a try', () => {
    const j = new CallJudge();
    j.make('away', 'rush', 'home', 1, 30);
    expect(j.observe([ev('error', 'home')], 32, false, false)[0]!.paid).toBe(true);
    j.make('away', 'hold', 'home', 1, 30);
    j.observe([], 40, true, false);
    expect(j.observe([], 80, false, true)[0]!.paid).toBe(true); // the kick downfield isn't the set's ground
    j.make('away', 'hold', 'home', 1, 30);
    expect(j.observe([ev('try', 'home')], 100, false, false)[0]!.paid).toBe(false);
    j.make('away', 'rush', 'home', 1, 30);
    expect(j.observe([], 30, false, true)[0]!.paid).toBe(false); // called as the set ended: it lapses
  });

  it('a kick call pays off once kicked: regathered, a drop-out forced, or 30 m gained', () => {
    const j = new CallJudge();
    j.make('home', 'kick-early', 'home', 1, 50);
    expect(j.observe([ev('regather', 'home')], 60, false, false)).toEqual([]); // not kicked yet
    expect(j.observe([ev('kick', 'home')], 60, false, false)).toEqual([]);
    expect(j.kicked('home', CALLS.paid.kickM + 1)[0]!.paid).toBe(true);
    j.make('home', 'bomb', 'home', 1, 70);
    j.observe([ev('kick', 'home')], 70, false, false);
    expect(j.observe([], 95, false, true)).toEqual([]); // dead ball: the drop-out still to come
    expect(j.observe([ev('drop-out', 'away')], 80, false, false)[0]!.paid).toBe(true);
    j.make('home', 'run-it', 'home', 1, 80);
    expect(j.observe([], 85, false, true)[0]!.paid).toBe(false);
    j.make('home', 'field-goal', 'home', 1, 70);
    expect(j.observe([ev('field-goal', 'home', 'good')], 70, false, false)[0]!.paid).toBe(true);
  });

  it('the stats line: paid of made each side, a dash for a side that made none', () => {
    expect(callsLine({ home: 5, away: 0 }, { home: 2, away: 0 })).toBe('Calls paid off 2/5 / –');
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
    // Kicks over twelve stretches: six left about twenty kicks a row, within the noise of a reshuffle.
    const runs12 = (side: 'home' | null, call: CoachCall | null): SimEvent[] => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].flatMap((s) => play(s, side, call).events);
    const none12 = runs12(null, null);
    expect(count(runs12('home', 'run-it'), 'kick', 'home')).toBeLessThan(count(none12, 'kick', 'home') * 0.7);
    expect(count(runs12('home', 'kick-early'), 'kick', 'home')).toBeGreaterThan(count(none12, 'kick', 'home') * 1.3);
  }, 180_000);

  it('judges every call it makes, and some pay off', () => {
    for (const call of ['hit-up', 'shift-right', 'kick-early', 'rush', 'hold'] as const) {
      const side = call === 'rush' || call === 'hold' ? 'away' : 'home';
      let made = 0;
      let paid = 0;
      for (const seed of [1, 2, 3, 4]) {
        const { sim, events } = play(seed, side, call);
        expect(sim.callsMade[side], call).toBe(events.filter((e) => e.kind === 'coach-call').length);
        expect(sim.callsPaid[side], call).toBe(events.filter((e) => e.kind === 'call-paid' && e.side === side && e.detail === call).length);
        made += sim.callsMade[side];
        paid += sim.callsPaid[side];
      }
      expect(paid, call).toBeGreaterThan(0);
      expect(paid, call).toBeLessThan(made);
    }
  }, 120_000);
});
