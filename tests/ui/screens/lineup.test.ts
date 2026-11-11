import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { createNewGame, getState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { overallRating } from '../../../src/data/player';
import { initLeague } from '../../../src/systems/fixtures';
import { openLineupScreen } from '../../../src/ui/screens/lineup';

beforeEach(() => { bus.clear(); stubDocument(); createNewGame('Bench Test', 600); initLeague(getState()); });
afterEach(() => { bus.clear(); vi.unstubAllGlobals(); });

describe('Lineup bench tiles (#600)', () => {
  it('show a whole-number overall, as the list beside them does', () => {
    const s = getState();
    const benched = s.lineup.bench.map((id) => s.squad.find((p) => p.id === id)!);
    expect(benched.length).toBeGreaterThan(0);
    // An average of four stats that is not whole, and not exact in floating point: 46.65000000000002.
    Object.assign(benched[0]!.stats, { speed: 46.6, strength: 46.6, stamina: 46.7, handling: 46.7, kicking: 46.7, footyIQ: 46.7 });
    expect(Number.isInteger(overallRating(benched[0]!))).toBe(false);
    openLineupScreen();
    const body = document.body as unknown as StubNode;
    benched.forEach((p, i) => {
      const tile = body.querySelector(`[data-spot="b${i}"]`)!;
      expect(tile.querySelector('.nrl-lineup-tile-top')!.textContent).toBe(`B${i + 1} ${Math.round(overallRating(p))}`);
    });
    expect(body.querySelector('[data-spot="b0"]')!.querySelector('.nrl-lineup-tile-top')!.textContent).toBe('B1 47');
  });
});
