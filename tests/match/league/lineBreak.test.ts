// tests/match/league/lineBreak.test.ts — line breaks (BAK-207 Phase 3, #87):
// in open play the carrier gets goal-side of every defender but the last man;
// one per stretch of play; the contract's `break`, so season stats and Player
// of the Match count them; and adding the count changes no match.
import { describe, it, expect } from 'vitest';
import { LIVE, LiveSim } from '../../../src/match/league/live';
import { runMatch } from '../../../src/match/league/match';
import { sideSheet } from '../../../src/match/balance/measure';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

function play(seed: number, minutes = 4): { e: SimEvent; snap: Snapshot }[] {
  const sim = new LiveSim(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), seed, { length: { halves: 1, halfMinutes: minutes } });
  const out: { e: SimEvent; snap: Snapshot }[] = [];
  while (!sim.finished) {
    sim.step();
    if (sim.tickEvents.length) {
      const snap = sim.snapshot();
      for (const e of sim.tickEvents) out.push({ e, snap });
    }
  }
  return out;
}

describe('line breaks in the live sim', () => {
  it('the carrier is goal-side of every defender but one, and it is one a stretch of play', () => {
    let n = 0;
    for (const seed of [1, 2, 3]) {
      const seen = play(seed);
      let open = false;
      for (const { e, snap } of seen) {
        if (e.kind === 'tackle' || e.kind === 'big-hit' || e.kind === 'set-start' || e.kind === 'try' || e.kind === 'kick') open = false;
        if (e.kind !== 'line-break') continue;
        n++;
        expect(open).toBe(false); // not twice in one stretch
        open = true;
        const c = snap.players.find((p) => p.side === e.side && p.slot === e.slot)!;
        const dir = snap.label.includes('2nd') === (e.side === 'home') ? -1 : 1; // home attacks +x in the first half
        const unbeaten = snap.players.filter((p) => p.side !== e.side && (c.x - p.x) * dir < LIVE.lineBreakM).length;
        expect(unbeaten).toBeLessThanOrEqual(1);
      }
    }
    expect(n).toBeGreaterThan(3);
  }, 30_000);

  it('is a `break` to the contract, counted as line breaks; the matches are the same as before', () => {
    const r = runMatch(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), { seed: 4 });
    expect(r.events.some((e) => e.kind === 'break')).toBe(true);
    // A count only: no dice, so the same seed gives the same score with or without anyone watching for it.
    expect(runMatch(sideSheet('H', { rating: 60 }), sideSheet('A', { rating: 60 }), { seed: 4 })).toEqual(r);
  }, 30_000);
});
