import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerTickHook, unregisterTickHook, clearTickHooks,
  registerSeasonHook, unregisterSeasonHook, clearSeasonHooks,
  advanceWeek, advanceWeeks, TICK_ORDER,
  type TickContext,
} from '../../src/core/time';
import { createNewGame, getState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { WEEKS_PER_SEASON } from '../../src/config';

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  createNewGame('Tick Test', 1);
});

describe('registerTickHook / advanceWeek ordering', () => {
  it('runs registered tick hooks in ascending order', () => {
    const log: string[] = [];
    // Register out of order to prove sorting, not registration order, wins.
    registerTickHook('autosave', TICK_ORDER.autosave, () => log.push('autosave'));
    registerTickHook('training', TICK_ORDER.training, () => log.push('training'));
    registerTickHook('economy', TICK_ORDER.economy, () => log.push('economy'));
    registerTickHook('injuries', TICK_ORDER.injuries, () => log.push('injuries'));
    registerTickHook('match', TICK_ORDER.match, () => log.push('match'));
    registerTickHook('ladder', TICK_ORDER.ladder, () => log.push('ladder'));
    registerTickHook('freeagents', TICK_ORDER.freeagents, () => log.push('freeagents'));

    advanceWeek();

    expect(log).toEqual([
      'training', 'injuries', 'economy', 'match', 'ladder', 'freeagents', 'autosave',
    ]);
  });

  it('breaks ties by insertion order (stable)', () => {
    const log: string[] = [];
    registerTickHook('a', 10, () => log.push('a'));
    registerTickHook('b', 10, () => log.push('b'));
    registerTickHook('c', 10, () => log.push('c'));
    advanceWeek();
    expect(log).toEqual(['a', 'b', 'c']);
  });

  it('re-registering an existing name replaces (no duplicate execution)', () => {
    const log: string[] = [];
    registerTickHook('dup', 10, () => log.push('first'));
    registerTickHook('dup', 10, () => log.push('second'));
    advanceWeek();
    expect(log).toEqual(['second']);
  });

  it('no hook observes a later hook mutation (synchronous sequencing)', () => {
    const seen: Array<number | undefined> = [];
    // First hook reads reputation, second mutates it. First must see the pre-value.
    registerTickHook('reader', 10, () => seen.push(getState().reputation));
    registerTickHook('writer', 20, () => setState({ reputation: 999 }));
    registerTickHook('reader2', 30, () => seen.push(getState().reputation));
    advanceWeek();
    expect(seen).toEqual([30, 999]);
  });

  it('unregisterTickHook removes a hook', () => {
    const log: string[] = [];
    registerTickHook('gone', 10, () => log.push('gone'));
    unregisterTickHook('gone');
    advanceWeek();
    expect(log).toEqual([]);
  });
});

describe('advanceWeek counters & event', () => {
  it('increments week and emits week:advanced after all hooks with post-tick counters', () => {
    const order: string[] = [];
    let payload: { week: number; season: number } | null = null;
    registerTickHook('h', 10, () => order.push('hook'));
    bus.on('week:advanced', (p) => { order.push('event'); payload = p; });

    expect(getState().week).toBe(1);
    advanceWeek();

    expect(getState().week).toBe(2);
    expect(order).toEqual(['hook', 'event']); // event fires last
    expect(payload).toEqual({ week: 2, season: 1 });
  });

  it('week:advanced subscriber reads settled post-tick state', () => {
    let observedWeek = -1;
    bus.on('week:advanced', () => { observedWeek = getState().week; });
    advanceWeek();
    expect(observedWeek).toBe(2);
  });
});

describe('season rollover', () => {
  it('advancing from the final week lands on week=1, season+1, fires season hooks once, emits season:ended', () => {
    setState({ week: WEEKS_PER_SEASON, season: 1 });
    const seasonHookCalls: number[] = [];
    let ended: { season: number; ladderPosition: number; premiership: boolean } | null = null;
    let advanced: { week: number; season: number } | null = null;

    registerSeasonHook('roll', 10, (ctx) => seasonHookCalls.push(ctx.season));
    bus.on('season:ended', (p) => { ended = p; });
    bus.on('week:advanced', (p) => { advanced = p; });

    advanceWeek();

    expect(getState().week).toBe(1);
    expect(getState().season).toBe(2);
    // Season hook runs once, with the NEW season.
    expect(seasonHookCalls).toEqual([2]);
    // season:ended reports the ENDED season (1) with defaults.
    expect(ended).toEqual({ season: 1, ladderPosition: 0, premiership: false });
    // week:advanced still fires last with post-rollover counters.
    expect(advanced).toEqual({ week: 1, season: 2 });
  });

  it('runs season hooks in ascending order', () => {
    setState({ week: WEEKS_PER_SEASON });
    const log: string[] = [];
    registerSeasonHook('late', 50, () => log.push('late'));
    registerSeasonHook('early', 10, () => log.push('early'));
    advanceWeek();
    expect(log).toEqual(['early', 'late']);
  });

  it('does not roll over on a normal (non-final) week', () => {
    setState({ week: 5, season: 3 });
    let endedFired = false;
    bus.on('season:ended', () => { endedFired = true; });
    advanceWeek();
    expect(getState().week).toBe(6);
    expect(getState().season).toBe(3);
    expect(endedFired).toBe(false);
  });

  it('re-registering a season hook name replaces it', () => {
    setState({ week: WEEKS_PER_SEASON });
    const log: string[] = [];
    registerSeasonHook('dup', 10, () => log.push('first'));
    registerSeasonHook('dup', 10, () => log.push('second'));
    advanceWeek();
    expect(log).toEqual(['second']);
  });

  it('unregisterSeasonHook removes a hook', () => {
    setState({ week: WEEKS_PER_SEASON });
    const log: string[] = [];
    registerSeasonHook('gone', 10, () => log.push('gone'));
    unregisterSeasonHook('gone');
    advanceWeek();
    expect(log).toEqual([]);
  });

  it('reads ladderPosition/premiership from history when a season hook pushed one', () => {
    setState({ week: WEEKS_PER_SEASON });
    let ended: { season: number; ladderPosition: number; premiership: boolean } | null = null;
    registerSeasonHook('history', 10, () => {
      const s = getState();
      setState({ history: [...s.history, { season: 1, ladderPosition: 4, premiership: true }] });
    });
    bus.on('season:ended', (p) => { ended = p; });
    advanceWeek();
    expect(ended).toEqual({ season: 1, ladderPosition: 4, premiership: true });
  });
});

describe('advanceWeeks (fast-forward)', () => {
  it('advances exactly n weeks with fastForward:true in ctx', () => {
    const flags: boolean[] = [];
    registerTickHook('probe', 10, (ctx: TickContext) => flags.push(ctx.fastForward));
    advanceWeeks(3);
    expect(getState().week).toBe(4);
    expect(flags).toEqual([true, true, true]);
  });

  it('single advanceWeek has fastForward:false', () => {
    let ff = true;
    registerTickHook('probe', 10, (ctx) => { ff = ctx.fastForward; });
    advanceWeek();
    expect(ff).toBe(false);
  });

  it('advanceWeeks(0) and negatives are no-ops', () => {
    let called = 0;
    registerTickHook('probe', 10, () => { called++; });
    advanceWeeks(0);
    advanceWeeks(-5);
    expect(called).toBe(0);
    expect(getState().week).toBe(1);
  });

  it('restores fastForward flag after a hook throws (try/finally)', () => {
    registerTickHook('boom', 10, () => { throw new Error('boom'); });
    expect(() => advanceWeeks(1)).toThrow('boom');

    // Flag must be restored: a subsequent single advance sees fastForward:false.
    clearTickHooks();
    let ff = true;
    registerTickHook('probe', 10, (ctx) => { ff = ctx.fastForward; });
    advanceWeek();
    expect(ff).toBe(false);
  });

  it('fast-forwards across a season boundary', () => {
    setState({ week: WEEKS_PER_SEASON - 1, season: 1 });
    let seasonEndedCount = 0;
    bus.on('season:ended', () => { seasonEndedCount++; });
    advanceWeeks(3); // final week, then rollover to season 2 week1, then week2
    expect(getState().season).toBe(2);
    expect(getState().week).toBe(2);
    expect(seasonEndedCount).toBe(1);
  });
});
