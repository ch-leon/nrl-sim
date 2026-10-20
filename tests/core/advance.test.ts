import { describe, it, expect, beforeEach } from 'vitest';
import { advanceUntil, advanceInProgress, stopAdvance, STOPPED_BY_YOU } from '../../src/core/advance';
import { createNewGame, getState, setState } from '../../src/core/state';
import {
  registerTickHook, clearTickHooks, clearSeasonHooks, TICK_ORDER,
} from '../../src/core/time';
import { bus, type Events } from '../../src/core/events';
import { initLeague } from '../../src/systems/fixtures';
import { overallRating } from '../../src/data/player';
import { SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';

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

  it('stops on a bankruptcy warning emitted during the week', async () => {
    registerTickHook('test-bankrupt', TICK_ORDER.economy, (ctx) => {
      if (ctx.week === 3) bus.emit('bankruptcy:warning', { balance: -1 });
    });
    const run = await advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('bankruptcy');
    expect(run.weeksPlayed).toBe(3);
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
});
