// tests/systems/matchday.test.ts — the player's match tick: the result toast
// must not spoil a match that is about to be played back.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import type { Fixture } from '../../src/core/state';
import type { MatchResult } from '../../src/sim/events';

function collect(): { toasts: string[]; started: { fixture: Fixture; sim: MatchResult }[]; stop: () => void } {
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
