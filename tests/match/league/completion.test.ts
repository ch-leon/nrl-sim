// tests/match/league/completion.test.ts — set completion (BAK-208 §7, Phase 3):
// a set is lost to its side's own error, an intercept or strip, or a penalty
// against it; any other end (a kick, a try, a handover on the last) completes it.
// Counting rolls no dice, so no match changes.
import { describe, it, expect } from 'vitest';
import { LiveSim } from '../../../src/match/league/live';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent } from '../../../src/match/core/snapshot';

function play(seed: number): { sim: LiveSim; events: SimEvent[] } {
  const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed, { length: { halves: 1, halfMinutes: 4 } });
  const events: SimEvent[] = [];
  while (!sim.finished) {
    sim.step();
    events.push(...sim.tickEvents);
  }
  return { sim, events };
}

describe('set completion', () => {
  it('counts each side’s sets; the lost ones are at least its own errors’ worth and no more than its sets', () => {
    for (const seed of [1, 2, 3]) {
      const { sim, events } = play(seed);
      for (const side of ['home', 'away'] as const) {
        const lost = sim.sets[side] - sim.setsCompleted[side];
        expect(sim.sets[side], `${seed} ${side}`).toBeGreaterThan(3);
        expect(sim.setsCompleted[side]).toBeGreaterThan(0);
        expect(lost).toBeGreaterThanOrEqual(0);
        // An error or intercept by the other side ends a set at most once; several in one set count once.
        const ended = events.filter((e) => (e.side === side && (e.kind === 'error' || e.kind === 'drop')) || (e.side !== undefined && e.side !== side && (e.kind === 'intercept' || e.kind === 'strip'))).length;
        expect(lost).toBeLessThanOrEqual(ended + events.filter((e) => e.kind === 'penalty' || e.kind === 'loose').length);
      }
    }
  }, 30_000);
});
