// tests/systems/matchday.test.ts — player match tick: result toast timing +
// SQUAD_MIN forfeit (GitHub #4).
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import {
  registerPlayerMatchSystem,
  forfeitResult,
  fitSquadCount,
} from '../../src/systems/matchday';
import { FORFEIT_SCORE, SQUAD_MIN } from '../../src/config';
import { generatePlayer } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';
import type { Fixture } from '../../src/core/state';
import type { MatchResult } from '../../src/sim/events';

function collect(): {
  toasts: string[];
  started: { fixture: Fixture; sim: MatchResult }[];
  stop: () => void;
} {
  const toasts: string[] = [];
  const started: { fixture: Fixture; sim: MatchResult }[] = [];
  const offs = [
    bus.on('ui:notify', ({ text }) => toasts.push(text)),
    bus.on('match:started', ({ fixture, sim }) => started.push({ fixture, sim })),
  ];
  return { toasts, started, stop: () => offs.forEach((off) => off()) };
}

describe('player matchday result toast', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    createNewGame('Tester', 42);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('holds the result until playback finishes', () => {
    const c = collect();
    advanceWeek();
    expect(c.started).toHaveLength(1);
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(0);

    const { fixture, sim } = c.started[0]!;
    bus.emit('match:finished', { fixture, result: sim });
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);

    // Only once, even if match:finished is echoed again.
    bus.emit('match:finished', { fixture, result: sim });
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);
    c.stop();
  });

  it('announces immediately when fast-forwarding (no playback)', () => {
    const c = collect();
    advanceWeeks(1);
    expect(c.started).toHaveLength(0);
    expect(c.toasts.filter((t) => t.startsWith('Round'))).toHaveLength(1);
    c.stop();
  });
});

describe('forfeit when fit < SQUAD_MIN', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    bus.clear();
    createNewGame('Tester', 42);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('forfeitResult awards FORFEIT_SCORE to the opponent', () => {
    expect(forfeitResult({ homeId: PLAYER_ID, awayId: 'rival-x' })).toEqual({
      homeScore: 0,
      awayScore: FORFEIT_SCORE,
    });
    expect(forfeitResult({ homeId: 'rival-x', awayId: PLAYER_ID })).toEqual({
      homeScore: FORFEIT_SCORE,
      awayScore: 0,
    });
  });

  it('applies a loss and notifies when fit squad is below SQUAD_MIN', () => {
    const injured = Array.from({ length: SQUAD_MIN }, (_, i) => ({
      ...generatePlayer(makeRng(i + 1), { age: 24 }),
      id: `p${i}`,
      injuredWeeks: 1,
    }));
    // Leave a few fit but still under the minimum.
    const fitFew = Array.from({ length: SQUAD_MIN - 2 }, (_, i) => ({
      ...generatePlayer(makeRng(100 + i), { age: 24 }),
      id: `fit${i}`,
      injuredWeeks: 0,
    }));
    setState({ squad: [...injured, ...fitFew], week: 1 });
    expect(fitSquadCount(getState().squad)).toBe(SQUAD_MIN - 2);

    const c = collect();
    const beforePts = getState().league.ladder.find((r) => r.clubId === PLAYER_ID)?.points ?? 0;
    advanceWeeks(1);
    expect(c.started).toHaveLength(0);
    expect(c.toasts.some((t) => t.includes('forfeited'))).toBe(true);

    const fx = getState().league.fixtures.find(
      (f) => f.round === 1 && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID),
    );
    expect(fx?.result).toBeDefined();
    const playerHome = fx!.homeId === PLAYER_ID;
    if (playerHome) {
      expect(fx!.result).toEqual({ homeScore: 0, awayScore: FORFEIT_SCORE });
    } else {
      expect(fx!.result).toEqual({ homeScore: FORFEIT_SCORE, awayScore: 0 });
    }
    const row = getState().league.ladder.find((r) => r.clubId === PLAYER_ID)!;
    expect(row.losses).toBeGreaterThanOrEqual(1);
    expect(row.points).toBe(beforePts); // loss adds 0 pts
    c.stop();
  });
});
