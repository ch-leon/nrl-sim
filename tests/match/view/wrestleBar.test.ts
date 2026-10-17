// tests/match/view/wrestleBar.test.ts — the wrestle bar over the carrier (BAK-208 §8.1).
import { describe, it, expect } from 'vitest';
import { FIGHT_COLORS, barSpec } from '../../../src/match/view/wrestleBar';

describe('barSpec', () => {
  it('fills with the fight left, green to yellow to red, a pip per man in the tackle', () => {
    expect(barSpec({ side: 'home', slot: 7, fight: 1, men: 1 })).toEqual({ fill: 1, color: FIGHT_COLORS.strong, pips: 1 });
    expect(barSpec({ side: 'home', slot: 7, fight: 0.4, men: 2 })).toMatchObject({ color: FIGHT_COLORS.fading, pips: 2 });
    expect(barSpec({ side: 'home', slot: 7, fight: 0.1, men: 3 })).toMatchObject({ color: FIGHT_COLORS.gone, pips: 3 });
    expect(barSpec({ side: 'away', slot: 0, fight: -0.2, men: 5 })).toMatchObject({ fill: 0, pips: 3 });
  });
});
