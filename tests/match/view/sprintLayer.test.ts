// tests/match/view/sprintLayer.test.ts — sprint and gas on screen (BAK-208 §8.2).
import { describe, it, expect } from 'vitest';
import { GAS_COLORS, gasColor, sprintMarks } from '../../../src/match/view/sprintLayer';
import type { PlayerSnap, Snapshot } from '../../../src/match/core/snapshot';

const P = (side: 'home' | 'away', slot: number, x: number, extra: Partial<PlayerSnap> = {}): PlayerSnap => ({ side, slot, x, y: 30, pose: 'run', headX: 1, speed: 7, ...extra });
const snap = (players: PlayerSnap[], holder: { side: 'home' | 'away'; slot: number } | null): Snapshot => ({ tick: 1, players, ball: { x: 0, y: 30, lift: 1, holder }, label: '', events: [] });

describe('sprintMarks', () => {
  it('streaks anyone sprinting; gas bars only on the carrier (sprinting or blown) and the men sprinting at him', () => {
    const s = snap(
      [
        P('home', 1, 50, { sprint: true, gas: 0.6 }), // carrier, going
        P('home', 2, 45, { sprint: true, gas: 0.9 }), // support, going: streak only
        P('away', 0, 56, { sprint: true, gas: 0.3 }), // chasing him, close: bar
        P('away', 3, 80, { sprint: true, gas: 1 }), // far away: streak only
        P('away', 4, 52, { gas: 1 }), // cruising: nothing
      ],
      { side: 'home', slot: 1 },
    );
    const m = sprintMarks(s);
    const of = (side: string, slot: number) => m.find((x) => x.side === side && x.slot === slot);
    expect(of('home', 1)).toMatchObject({ streak: true, bar: 0.6 });
    expect(of('home', 2)).toMatchObject({ streak: true, bar: null });
    expect(of('away', 0)).toMatchObject({ streak: true, bar: 0.3 });
    expect(of('away', 3)).toMatchObject({ streak: true, bar: null });
    expect(of('away', 4)).toBeUndefined();
  });
  it('a blown carrier shows his empty bar in red; no carrier, no bars', () => {
    const blown = sprintMarks(snap([P('home', 1, 50, { blown: true, gas: 0.05 })], { side: 'home', slot: 1 }));
    expect(blown).toEqual([{ side: 'home', slot: 1, streak: false, bar: 0.05, blown: true }]);
    expect(gasColor(0.05, true)).toBe(GAS_COLORS.blown);
    expect(gasColor(0.2, false)).toBe(GAS_COLORS.low);
    expect(gasColor(0.9, false)).toBe(GAS_COLORS.full);
    expect(sprintMarks(snap([P('home', 1, 50, { sprint: true, gas: 0.5 })], null))).toEqual([{ side: 'home', slot: 1, streak: true, bar: null, blown: false }]);
  });
});
