// tests/sim/grubber.test.ts — grubber try rate on the classic engine (GitHub
// #72): a grubber into the in-goal is a decent attacking option, not a 1-in-3
// try machine. Over 200 seeded equal-strength matches, about 10–16% of grubbers
// become tries (bombs run about 11%), and tries per match stay where they were.
import { describe, it, expect } from 'vitest';
import { simulateMatch, teamSheetFromRival } from '../../src/sim/engine';
import type { MatchResult, TeamSheet } from '../../src/sim/events';

const RUNS = 200;

function rates(home: TeamSheet, away: TeamSheet): { grubber: number; bomb: number; triesPerMatch: number } {
  const kicks = { grubber: { n: 0, tries: 0 }, bomb: { n: 0, tries: 0 } };
  let tries = 0;
  for (let s = 0; s < RUNS; s++) {
    const r: MatchResult = simulateMatch(home, away, { seed: s, weather: 'clear' });
    r.events.forEach((e, i) => {
      if (e.kind === 'try') tries++;
      if (e.kind !== 'kick' || (e.detail !== 'grubber' && e.detail !== 'bomb')) return;
      const k = kicks[e.detail];
      k.n++;
      // Followed by a try for the kicking side.
      const next = r.events[i + 1];
      if (next?.kind === 'try' && next.teamId === e.teamId) k.tries++;
    });
  }
  return { grubber: kicks.grubber.tries / kicks.grubber.n, bomb: kicks.bomb.tries / kicks.bomb.n, triesPerMatch: tries / RUNS };
}

describe('grubber try rate (classic engine, #72)', () => {
  it('about one grubber in seven becomes a try, in line with bombs; tries per match about as before', () => {
    const home = teamSheetFromRival({ id: 'rival-crocs', name: 'Crocs', colors: ['#000', '#fff'], strength: 60 });
    const away = teamSheetFromRival({ id: 'rival-gulls', name: 'Gulls', colors: ['#000', '#fff'], strength: 60 });
    const r = rates(home, away);
    // Before #72: 32% of grubbers (bombs 10%), 6.64 tries a match on these sides.
    expect(r.grubber).toBeGreaterThan(0.1);
    expect(r.grubber).toBeLessThan(0.16);
    expect(Math.abs(r.triesPerMatch - 6.64)).toBeLessThan(0.5);
  }, 120_000);
});
