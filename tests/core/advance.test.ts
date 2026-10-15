import { describe, it, expect, beforeEach } from 'vitest';
import { advanceUntil } from '../../src/core/advance';
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
  it('plays exactly n weeks when nothing needs attention, then reports the target', () => {
    const start = getState().week;
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.weeksPlayed).toBe(4);
    expect(run.stop.kind).toBe('target');
    expect(getState().week).toBe(start + 4);
    expect(toasts[toasts.length - 1]).toEqual({ text: 'Advanced 4 weeks.', kind: 'info' });
  });

  it('weeks: 0 plays nothing', () => {
    const start = getState().week;
    const run = advanceUntil({ kind: 'weeks', weeks: 0 });
    expect(run.weeksPlayed).toBe(0);
    expect(getState().week).toBe(start);
  });

  it('stops after the week a regular starter is injured, even with weeks remaining', () => {
    injureTopStarterAtWeek(2);
    const start = getState().week;
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('injury');
    expect(run.weeksPlayed).toBe(2);
    expect(getState().week).toBe(start + 2);
    expect(toasts[toasts.length - 1]?.kind).toBe('danger');
    expect(toasts[toasts.length - 1]?.text).toContain('Stopped after 2 weeks');
  });

  it('stops at the first event and ignores later ones', () => {
    injureTopStarterAtWeek(2);
    injureTopStarterAtWeek(3);
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.weeksPlayed).toBe(2);
  });

  it('stops on a bankruptcy warning emitted during the week', () => {
    registerTickHook('test-bankrupt', TICK_ORDER.economy, (ctx) => {
      if (ctx.week === 3) bus.emit('bankruptcy:warning', { balance: -1 });
    });
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('bankruptcy');
    expect(run.weeksPlayed).toBe(3);
  });

  it('stops when a settled contract crosses into the expiring window', () => {
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
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('contract');
    expect(run.weeksPlayed).toBe(1);
  });

  it('forfeit risk: stops before playing when fewer than SQUAD_MIN players are fit', () => {
    const s = getState();
    setState({
      squad: s.squad.map((p, i) => (i < SQUAD_MIN - 1 ? p : { ...p, injuredWeeks: 2 })),
    });
    const start = getState().week;
    const run = advanceUntil({ kind: 'weeks', weeks: 4 });
    expect(run.stop.kind).toBe('forfeit');
    expect(run.weeksPlayed).toBe(0);
    expect(getState().week).toBe(start);
  });
});

describe('advanceUntil — finals and season end targets', () => {
  it('to finals: stops on reaching the first finals week', () => {
    const run = advanceUntil({ kind: 'finals' });
    expect(run.stop.kind).toBe('target');
    expect(getState().week).toBe(25);
    expect(run.weeksPlayed).toBe(24);
  });

  it('to season end: runs through the rollover and stops on the new season', () => {
    const startSeason = getState().season;
    const run = advanceUntil({ kind: 'seasonEnd' });
    expect(run.stop.kind).toBe('target');
    expect(run.weeksPlayed).toBe(WEEKS_PER_SEASON);
    expect(getState().season).toBe(startSeason + 1);
    expect(getState().week).toBe(1);
  });
});
