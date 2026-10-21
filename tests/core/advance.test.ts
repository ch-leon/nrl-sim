import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { advanceUntil, advanceInProgress, stopAdvance, nextFrame, STOPPED_BY_YOU } from '../../src/core/advance';
import { createNewGame, getState, setState } from '../../src/core/state';
import {
  registerTickHook, clearTickHooks, clearSeasonHooks, TICK_ORDER,
} from '../../src/core/time';
import { bus, type Events } from '../../src/core/events';
import { initLeague } from '../../src/systems/fixtures';
import { overallRating } from '../../src/data/player';
import { earnMoney } from '../../src/data/club';
import { handleBankruptcy } from '../../src/systems/economy';
import type { AdvanceTarget } from '../../src/core/advanceRules';
import { ECON, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';

let toasts: Events['ui:notify'][] = [];

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  createNewGame('Advance Test', 11);
  initLeague(getState());
  toasts = [];
  bus.on('ui:notify', (t) => toasts.push(t));
});

/** Injure the highest-rated fit player (always a regular starter) at the given week. */
function injureTopStarterAtWeek(week: number): void {
  registerTickHook(`test-injure-${week}`, TICK_ORDER.injuries, (ctx) => {
    if (ctx.week !== week) return;
    const s = getState();
    const top = [...s.squad].sort((a, b) => overallRating(b) - overallRating(a))[0]!;
    setState({ squad: s.squad.map((p) => (p.id === top.id ? { ...p, injuredWeeks: 3 } : p)) });
  });
}

/**
 * Stand-in for the economy tick: a fixed weekly burn, then the real bankruptcy
 * cascade (its warning every week in the red, forced sales below the floor).
 */
function burnEachWeek(amount: number): void {
  registerTickHook('test-burn', TICK_ORDER.economy, () => {
    earnMoney(-amount, 'wages');
    handleBankruptcy(getState());
  });
}

describe('advanceUntil — weeks target', () => {
  it('plays exactly n weeks when nothing needs attention, then reports the target', async () => {
    const start = getState().week;
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.weeksPlayed).toBe(4);
    expect(run.stop.kind).toBe('target');
    expect(getState().week).toBe(start + 4);
    expect(toasts[toasts.length - 1]).toEqual({ text: 'Advanced 4 weeks.', kind: 'info' });
  });

  it('weeks: 0 plays nothing', async () => {
    const start = getState().week;
    const run = await advanceUntil({ kind: 'weeks', weeks: 0 });
    expect(run.weeksPlayed).toBe(0);
    expect(getState().week).toBe(start);
  });

  it('stops after the week a regular starter is injured, even with weeks remaining', async () => {
    injureTopStarterAtWeek(2);
    const start = getState().week;
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('injury');
    expect(run.weeksPlayed).toBe(2);
    expect(getState().week).toBe(start + 2);
    expect(toasts[toasts.length - 1]?.kind).toBe('danger');
    expect(toasts[toasts.length - 1]?.text).toContain('Stopped after 2 weeks');
  });

  it('stops at the first event and ignores later ones', async () => {
    injureTopStarterAtWeek(2);
    injureTopStarterAtWeek(3);
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.weeksPlayed).toBe(2);
  });

  it('stops the week the club goes into the red', async () => {
    setState({ money: 25_000 });
    burnEachWeek(10_000);
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop).toEqual({ kind: 'bankruptcy', text: 'Club has gone into debt.' });
    expect(run.weeksPlayed).toBe(3);
    expect(toasts[toasts.length - 1]).toEqual({ text: 'Stopped after 3 weeks: Club has gone into debt.', kind: 'danger' });
  });

  it('stops when a settled contract crosses into the expiring window', async () => {
    const first = getState().squad[0]!.id;
    setState({
      squad: getState().squad.map((p) => (p.id === first ? { ...p, contractWeeks: 9 } : p)),
    });
    // Stand-in for tickContracts (not registered in this test): tick every contract down one week.
    registerTickHook('test-contracts', TICK_ORDER.economy, () => {
      setState({
        squad: getState().squad.map((p) => ({ ...p, contractWeeks: Math.max(1, p.contractWeeks - 1) })),
      });
    });
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('contract');
    expect(run.weeksPlayed).toBe(1);
  });

  it('forfeit risk: stops before playing when fewer than SQUAD_MIN players are fit', async () => {
    const s = getState();
    setState({
      squad: s.squad.map((p, i) => (i < SQUAD_MIN - 1 ? p : { ...p, injuredWeeks: 2 })),
    });
    const start = getState().week;
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('forfeit');
    expect(run.weeksPlayed).toBe(0);
    expect(getState().week).toBe(start);
  });
});

describe('advanceUntil — finals and season end targets', () => {
  it('to finals: stops on reaching the first finals week', async () => {
    const run = await advanceUntil({ kind: 'finals' });
    expect(run.stop.kind).toBe('target');
    expect(getState().week).toBe(25);
    expect(run.weeksPlayed).toBe(24);
  });

  it('to season end: runs through the rollover and stops on the new season', async () => {
    const startSeason = getState().season;
    const run = await advanceUntil({ kind: 'seasonEnd' });
    expect(run.stop.kind).toBe('target');
    expect(run.weeksPlayed).toBe(WEEKS_PER_SEASON);
    expect(getState().season).toBe(startSeason + 1);
    expect(getState().week).toBe(1);
  });
});

// N12.5 (QA finding 10): in debt, a multi-week advance stops once on the crossing
// into the red, then only on a forced sale or at the fire-sale floor.
describe('advanceUntil — a club in debt', () => {
  /** Advance to `target` as a player would, again after every stop; the stops' texts in order. */
  async function playThrough(target: AdvanceTarget): Promise<{ stops: string[]; calls: number }> {
    const stops: string[] = [];
    for (let calls = 1; calls <= 30; calls++) {
      const run = await advanceUntil(target, async () => {});
      if (run.stop.kind === 'target') return { stops, calls };
      expect(run.stop.kind).toBe('bankruptcy');
      stops.push(run.stop.text);
    }
    throw new Error(`no target after 30 calls: ${stops.join(' / ')}`);
  }

  it('already in the red, runs to season end in one call (it used to stop every week)', async () => {
    setState({ money: -20_000 });
    burnEachWeek(2_000);
    const startSeason = getState().season;
    const run = await advanceUntil({ kind: 'seasonEnd' }, async () => {});
    expect(run.stop.kind).toBe('target');
    expect(run.weeksPlayed).toBe(WEEKS_PER_SEASON);
    expect(getState().season).toBe(startSeason + 1);
    expect(getState().money).toBe(-20_000 - 2_000 * WEEKS_PER_SEASON);
    // The economy still warns every week in the red; only the advance stopped stopping.
    expect(toasts.filter((t) => t.text.startsWith('The club is in the red')).length).toBe(WEEKS_PER_SEASON);
  });

  it('into the red, then one forced sale a week down to the minimum, each a stop, then the target (N14.3)', async () => {
    setState({ money: 25_000 });
    burnEachWeek(10_000);
    const squadBefore = getState().squad.length;
    expect(squadBefore).toBeGreaterThan(SQUAD_MIN);
    const sold = squadBefore - SQUAD_MIN;
    const { stops, calls } = await playThrough({ kind: 'finals' });
    expect(stops[0]).toBe('Club has gone into debt.');
    // The club sinks in steps: a sale a week, each named, until the squad is at the minimum.
    expect(stops.slice(1)).toHaveLength(sold);
    for (const stop of stops.slice(1)) expect(stop).toMatch(/^Forced sale: [^,]+ sold to cover debts\.$/);
    expect(calls).toBe(sold + 2);
    expect(getState().squad.length).toBe(SQUAD_MIN);
    expect(getState().week).toBe(25);
    expect(getState().money).toBeLessThan(ECON.FORCED_SALE_FLOOR);
  });

  it('with nobody left to sell, the floor stops it once instead', async () => {
    setState({ money: 25_000, squad: getState().squad.slice(0, SQUAD_MIN) });
    burnEachWeek(10_000);
    const { stops, calls } = await playThrough({ kind: 'finals' });
    expect(stops).toEqual(['Club has gone into debt.', 'Balance below the fire-sale floor (-$100,000).']);
    expect(calls).toBe(3);
    expect(getState().week).toBe(25);
  });

  it('back above $0 and into the red again is a new crossing', async () => {
    setState({ money: 5_000 });
    // −10k a week, but +20k in week 3: 5k → −5k → −15k → +5k → −5k → −15k …
    registerTickHook('test-burn', TICK_ORDER.economy, (ctx) => {
      earnMoney(ctx.week === 3 ? 20_000 : -10_000, 'wages');
      handleBankruptcy(getState());
    });
    const first = await advanceUntil({ kind: 'weeks', weeks: 6 }, async () => {});
    expect(first).toEqual({ weeksPlayed: 1, stop: { kind: 'bankruptcy', text: 'Club has gone into debt.' } });
    const second = await advanceUntil({ kind: 'weeks', weeks: 6 }, async () => {});
    expect(second).toEqual({ weeksPlayed: 3, stop: { kind: 'bankruptcy', text: 'Club has gone into debt.' } });
    const third = await advanceUntil({ kind: 'weeks', weeks: 6 }, async () => {});
    expect(third.stop.kind).toBe('target');
  });
});

// N10.2: the run yields between weeks so the page paints and takes taps.
describe('advanceUntil — yields between weeks, Stop', () => {
  it('awaits one frame between weeks, none before the first, and plays the same weeks', async () => {
    let frames = 0;
    const weeksAtFrame: number[] = [];
    const start = getState().week;
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 }, async () => { frames++; weeksAtFrame.push(getState().week); });
    expect(run.weeksPlayed).toBe(4);
    expect(frames).toBe(3);
    expect(weeksAtFrame).toEqual([start + 1, start + 2, start + 3]);
  });

  it('is in progress during the run and not after it', async () => {
    const seen: boolean[] = [];
    expect(advanceInProgress()).toBe(false);
    await advanceUntil({ kind: 'weeks', weeks: 3 }, async () => { seen.push(advanceInProgress()); });
    expect(seen).toEqual([true, true]);
    expect(advanceInProgress()).toBe(false);
  });

  it('Stop finishes the week in hand, then stops with a "Stopped after" toast', async () => {
    const start = getState().week;
    let frames = 0;
    const run = await advanceUntil({ kind: 'finals' }, async () => { if (++frames === 2) stopAdvance(); });
    expect(run.stop).toEqual({ kind: 'stopped', text: STOPPED_BY_YOU });
    expect(run.weeksPlayed).toBe(2);
    expect(getState().week).toBe(start + 2);
    expect(toasts[toasts.length - 1]).toEqual({ text: `Stopped after 2 weeks: ${STOPPED_BY_YOU}`, kind: 'danger' });
  });

  it('a second advance while one runs does nothing', async () => {
    const start = getState().week;
    let inner: Awaited<ReturnType<typeof advanceUntil>> | null = null;
    const run = await advanceUntil({ kind: 'weeks', weeks: 3 }, async () => {
      if (!inner) inner = await advanceUntil({ kind: 'weeks', weeks: 4 });
    });
    expect(run.weeksPlayed).toBe(3);
    expect(inner!.weeksPlayed).toBe(0);
    expect(getState().week).toBe(start + 3);
  });

  it('Stop with no run under way is a no-op and does not stop the next run', async () => {
    stopAdvance();
    const run = await advanceUntil({ kind: 'weeks', weeks: 2 }, async () => {});
    expect(run.weeksPlayed).toBe(2);
    expect(run.stop.kind).toBe('target');
  });

  it('each week runs under fast-forward', async () => {
    const flags: boolean[] = [];
    registerTickHook('test-ff', TICK_ORDER.economy, (ctx) => { flags.push(ctx.fastForward); });
    await advanceUntil({ kind: 'weeks', weeks: 3 }, async () => {});
    expect(flags).toEqual([true, true, true]);
  });

  it('a week that throws ends the run (not in progress after it) and the next run works', async () => {
    registerTickHook('test-throw', TICK_ORDER.economy, (ctx) => { if (ctx.week === 3) throw new Error('boom'); });
    await expect(advanceUntil({ kind: 'weeks', weeks: 4 }, async () => {})).rejects.toThrow('boom');
    expect(advanceInProgress()).toBe(false);
    clearTickHooks();
    const run = await advanceUntil({ kind: 'weeks', weeks: 1 }, async () => {});
    expect(run.weeksPlayed).toBe(1);
  });

  it('a second advance while one runs reports busy, not success', async () => {
    let inner: Awaited<ReturnType<typeof advanceUntil>> | null = null;
    await advanceUntil({ kind: 'weeks', weeks: 2 }, async () => { inner = await advanceUntil({ kind: 'finals' }); });
    expect(inner!.stop.kind).toBe('busy');
  });
});

// The real frame wait: a requestAnimationFrame, then a task (so the page has painted).
describe('nextFrame (N10.2)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('a run waits one animation frame and one timer per week after the first', async () => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; });
    const start = getState().week;
    let done = false;
    const run = advanceUntil({ kind: 'weeks', weeks: 3 }).then((r) => { done = true; return r; });
    await Promise.resolve();
    expect(getState().week).toBe(start + 1); // the first week runs in the tap
    for (let week = 2; week <= 3; week++) {
      expect(frames.length).toBe(week - 1);
      expect(done).toBe(false);
      frames[week - 2]!(0); // the frame paints…
      expect(getState().week).toBe(start + week - 1); // …but the week waits for the task after it
      await vi.advanceTimersByTimeAsync(0);
      expect(getState().week).toBe(start + week);
    }
    expect((await run).weeksPlayed).toBe(3);
    expect(frames.length).toBe(2);
  });

  it('resolves at once where there is no page', async () => {
    await expect(nextFrame()).resolves.toBeUndefined();
  });
});
