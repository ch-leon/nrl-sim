// Strategy counters ship dormant until the switch-on task (#465).
export const COUNTERS = {
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
