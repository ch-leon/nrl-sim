// #465's measurement guards. Compare paired win shares, never distance from 50%.
import type { CellResult } from './measure';

export const PRESET_WIN_SHARE_BAND = [0.42, 0.58] as const;
export const COUNTER_SIGNS: Readonly<Record<string, number>> = {
  'grind v slide': 1, 'grind v compressed': -1,
  'expansive v slide': -1, 'expansive v compressed': 1,
  'kick-chase v slide': -1, 'kick-chase v rush': 1,
  'all-out v slide': 1, 'all-out v rush': -1,
};

// Deterministic controls at e8b88be: seeds 1–500, both orientations, 1,000 matches.
// These are dormant-main fingerprints, separate from the acceptance targets.
const DORMANT_MAIN_SHARES: Readonly<Record<string, number>> = {
  'grind v slide': .483, 'grind v rush': .467, 'grind v compressed': .474,
  'balanced v slide': .5, 'balanced v rush': .486, 'balanced v compressed': .4755,
  'expansive v slide': .5, 'expansive v rush': .5145, 'expansive v compressed': .4745,
  'kick-chase v slide': .5275, 'kick-chase v rush': .5215, 'kick-chase v compressed': .4925,
  'all-out v slide': .517, 'all-out v rush': .468, 'all-out v compressed': .478,
};

export function dormantShareProblem(scenario: string, share: number): string | undefined {
  const expected = DORMANT_MAIN_SHARES[scenario.replace(/^full fit /, '')];
  if (expected === undefined || !Number.isFinite(share) || Math.abs(share - expected) > 1e-10) {
    return `${scenario}: dormant control must reproduce main (${expected === undefined ? 'unknown fixture' : (expected * 100).toFixed(2) + '%'}); got ${(share * 100).toFixed(2)}%`;
  }
  return undefined;
}

export function counterSwingProblem(before: number, after: number, sign: number, fullFit = false): string | undefined {
  const signed = sign * (after - before) * 100;
  // Numerical tolerance only; a reported 3.95pp does not meet a 4pp floor.
  if (!Number.isFinite(signed) || signed < (fullFit ? 9 : 4) - 1e-8 || (!fullFit && signed > 6 + 1e-8)) {
    return `${((after - before) * 100).toFixed(2)}pp; expected ${sign > 0 ? '+' : '−'}${fullFit ? '9pp or stronger' : '4–6pp'}`;
  }
  return undefined;
}

export function presetShareProblem(share: number): string | undefined {
  if (!Number.isFinite(share) || share < PRESET_WIN_SHARE_BAND[0] - 1e-10 || share > PRESET_WIN_SHARE_BAND[1] + 1e-10) {
    return `${(share * 100).toFixed(2)}%; expected 42–58%`;
  }
  return undefined;
}

/** Validate complete harness output, including missing/duplicated/undersized cells. */
export function checkCounterRows(rows: readonly CellResult[], fullFit = false): string[] {
  const problems: string[] = [];
  for (const [scenario, sign] of Object.entries(COUNTER_SIGNS)) {
    const name = fullFit ? `full fit ${scenario}` : scenario;
    const pick = (variant: string): CellResult | undefined => {
      const found = rows.filter((r) => r.scenario === name && r.variant === variant);
      if (found.length !== 1 || found[0]!.trackedSeeds !== 1000 || !Number.isFinite(found[0]!.pointsShare?.mean)) {
        problems.push(`${name} / ${variant}: need exactly one 1,000-match cell`);
        return undefined;
      }
      return found[0];
    };
    // The full-fit baseline explicitly holds the independent Tight rebuild on.
    const before = pick('baseline');
    const after = pick(fullFit ? 'enabled defaults' : 'enabled');
    if (before && after) {
      const problem = counterSwingProblem(before.pointsShare!.mean, after.pointsShare!.mean, sign, fullFit);
      if (problem) problems.push(`${name}: ${problem}`);
    }
  }
  return problems;
}
