import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { createNewGame, getState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { overallRating, playerStars } from '../../../src/data/player';
import { starsLabel } from '../../../src/ui/parts';
import { initLeague } from '../../../src/systems/fixtures';
import { openLineupScreen } from '../../../src/ui/screens/lineup';

beforeEach(() => { bus.clear(); stubDocument(); createNewGame('Bench Test', 600); initLeague(getState()); });
afterEach(() => { bus.clear(); vi.unstubAllGlobals(); });

describe('Lineup bench tiles (#600)', () => {
  it('show the overall as stars, never an unrounded number', () => {
    const s = getState();
    const benched = s.lineup.bench.map((id) => s.squad.find((p) => p.id === id)!);
    expect(benched.length).toBeGreaterThan(0);
    // An average of four stats that is not whole, and not exact in floating point: 46.65000000000002.
    Object.assign(benched[0]!.stats, { speed: 46.6, strength: 46.6, stamina: 46.7, handling: 46.7, kicking: 46.7, footyIQ: 46.7 });
    expect(Number.isInteger(overallRating(benched[0]!))).toBe(false);
    openLineupScreen();
    const body = document.body as unknown as StubNode;
    // SuperCOOKED 30: a bench card shows stars, not the number; nothing unrounded leaks into it.
    benched.forEach((p, i) => {
      const card = body.querySelector(`[data-spot="b${i}"]`)!;
      expect(card.querySelector('.nrl-stars')!.attrs['aria-label']).toBe(starsLabel(playerStars(p)));
      expect(card.textContent).not.toMatch(/\d\.\d/);
    });
  });
});
