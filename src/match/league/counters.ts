// Strategy counters ship dormant until the switch-on task (#465).
export const COUNTERS = {
  tight: {
    on: 0,
    offloadBase: 1,
    // Fit 1 is neutral; a strength-80 pack has Tight fit 1.25.
    offloadPerFit: 12,
  },
};
