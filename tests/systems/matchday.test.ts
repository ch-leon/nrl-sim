// tests/systems/matchday.test.ts — the player's match tick: the result toast
// must not spoil a match that is about to be played back; injuries apply to squad.
import { describe, it, expect, beforeEach } from 'vitest';
import { bus } from '../../src/core/events';
import { createNewGame, getState, setState } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearTickHooks, clearSeasonHooks } from '../../src/core/time';
import { initLeague } from '../../src/systems/fixtures';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import type { Fixture, Player } from '../../src/core/state';
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

describe('player matchday injuries (GitHub #7)', () => {
  beforeEach(() => {
    clearTickHooks();
    clearSeasonHooks();
    createNewGame('Tester', 7);
    initLeague(getState());
    registerPlayerMatchSystem();
  });

  it('applies sim injuries onto squad players and notifies', () => {
    // Force high injuryRisk so a big-hit injury is likely across a few seeds.
    const boosted: Player[] = getState().squad.map((p) => ({ ...p, injuryRisk: 95, injuredWeeks: 0 }));
    setState({ squad: boosted });

    let applied = false;
    for (let attempt = 0; attempt < 40 && !applied; attempt++) {
      clearTickHooks();
      clearSeasonHooks();
      createNewGame('Tester', 1000 + attempt);
      initLeague(getState());
      setState({
        squad: getState().squad.map((p) => ({ ...p, injuryRisk: 95, injuredWeeks: 0 })),
      });
      registerPlayerMatchSystem();

      const c = collect();
      advanceWeeks(1); // fast-forward: apply + notify immediately
      const injuredNow = getState().squad.filter((p) => p.injuredWeeks > 0);
      if (injuredNow.length > 0) {
        expect(c.toasts.some((t) => t.includes('injured — out'))).toBe(true);
        for (const p of injuredNow) {
          expect(p.injuredWeeks).toBeGreaterThanOrEqual(1);
          expect(p.injuredWeeks).toBeLessThanOrEqual(3);
        }
        applied = true;
      }
      c.stop();
    }
    expect(applied).toBe(true);
  });

  it('still plays when some (not all) players are injured', () => {
    const squad = getState().squad.map((p, i) =>
      i < 3 ? { ...p, injuredWeeks: 2 } : { ...p, injuredWeeks: 0 },
    );
    setState({ squad });
    const c = collect();
    advanceWeek();
    expect(c.started).toHaveLength(1);
    c.stop();
  });
});
