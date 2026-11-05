import { FIT } from './fit';
import type { AttackPreset, DefencePreset } from './presets';

// Strategy counters enabled and calibrated in #465; these defaults now guard replay.
export const COUNTERS = {
  compressed: {
    on: 1,
    tight: 0.04,
    tightFit: 0,
    expansive: 0.26,
    brokenBase: -0.015,
    offloadBase: -0.03,
    commitM: 6,
  },
  rush: {
    on: 1,
    carry: 0.004,
    defenceFit: 0.12,
    kickChase: 0.39,
    allOut: 0.06,
  },
  slide: {
    on: 1,
    expansive: 0.08,
    expansiveFit: 0,
    kickChase: 1.5,
    tight: 0.04,
    allOut: 0.50,
    allOutFit: 0,
  },
  fit: {
    on: 1,
    edge: 0.11,
  },
  tight: {
    on: 1,
    offloadBase: 1,
    // Fit 1 is neutral; a strength-80 pack has Tight fit 1.25.
    offloadPerFit: 12,
  },
};

/** Signed contest edge from a side’s own style; neutral fit and the dormant switch add nothing. */
export function fitEdge(fit: number): number {
  return COUNTERS.fit.on === 1 ? (fit - 1) * COUNTERS.fit.edge : 0;
}

/** Calibrate unequal-fit cells without moving the already-tuned neutral matrix. */
function matchupStrength(cell: number, attackFit: number, defenceFit: number, response = 0): number {
  return cell * attackFit * defenceFit * Math.max(0, 1 + response * Math.abs(attackFit - defenceFit));
}

/** Cell strength × both starting-sheet fits. Balanced and other defences have no Slide effects. */
export function slideCounter(attack: AttackPreset, defence: DefencePreset, attackFit: number, defenceFit: number): number {
  if (COUNTERS.slide.on !== 1 || defence !== 'slide' || attack === 'balanced') return 0;
  const cell = attack === 'grind' ? COUNTERS.slide.tight : attack === 'kick-chase' ? COUNTERS.slide.kickChase
    : attack === 'all-out' ? COUNTERS.slide.allOut : COUNTERS.slide.expansive;
  const response = attack === 'expansive' ? COUNTERS.slide.expansiveFit : attack === 'all-out' ? COUNTERS.slide.allOutFit : 0;
  return matchupStrength(cell, attackFit, defenceFit, response);
}

/** Rush's flat bust concession becomes a carrier v starting-sheet fit contest. */
export function rushBroken(flat: number, defence: DefencePreset, carry: number, defenceFit: number): number {
  if (COUNTERS.rush.on !== 1 || defence !== 'rush') return flat;
  return flat + (carry - FIT.leagueAverage) * COUNTERS.rush.carry - (defenceFit - 1) * COUNTERS.rush.defenceFit;
}

/** Rush has only two base counter cells; the other attacks are decided by fit. */
export function rushCounter(attack: AttackPreset, defence: DefencePreset, attackFit: number, defenceFit: number): number {
  if (COUNTERS.rush.on !== 1 || defence !== 'rush') return 0;
  const cell = attack === 'kick-chase' ? COUNTERS.rush.kickChase : attack === 'all-out' ? COUNTERS.rush.allOut : 0;
  return cell * attackFit * defenceFit;
}

/** Only the two Compressed cells have mechanics; both starting fits scale them. */
export function compressedCounter(attack: AttackPreset, defence: DefencePreset, attackFit: number, defenceFit: number): number {
  if (COUNTERS.compressed.on !== 1 || defence !== 'compressed') return 0;
  const cell = attack === 'grind' ? COUNTERS.compressed.tight : attack === 'expansive' ? COUNTERS.compressed.expansive : 0;
  return matchupStrength(cell, attackFit, defenceFit, attack === 'grind' ? COUNTERS.compressed.tightFit : 0);
}
