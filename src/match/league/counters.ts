import type { AttackPreset, DefencePreset } from './presets';

// Strategy counters ship dormant until the switch-on task (#465).
export const COUNTERS = {
  slide: {
    on: 0,
    expansive: 0.08,
    kickChase: 1,
    tight: 0.04,
    allOut: 0.60,
  },
  fit: {
    on: 0,
    edge: 0.11,
  },
  tight: {
    on: 0,
    offloadBase: 1,
    // Fit 1 is neutral; a strength-80 pack has Tight fit 1.25.
    offloadPerFit: 12,
  },
};

/** Signed contest edge from a side’s own style; neutral fit and the dormant switch add nothing. */
export function fitEdge(fit: number): number {
  return COUNTERS.fit.on === 1 ? (fit - 1) * COUNTERS.fit.edge : 0;
}

/** Cell strength × both starting-sheet fits. Balanced and other defences have no Slide effects. */
export function slideCounter(attack: AttackPreset, defence: DefencePreset, attackFit: number, defenceFit: number): number {
  if (COUNTERS.slide.on !== 1 || defence !== 'slide' || attack === 'balanced') return 0;
  const cell = attack === 'grind' ? COUNTERS.slide.tight : attack === 'kick-chase' ? COUNTERS.slide.kickChase
    : attack === 'all-out' ? COUNTERS.slide.allOut : COUNTERS.slide.expansive;
  return cell * attackFit * defenceFit;
}
