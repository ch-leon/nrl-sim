/** Completed weekly ticks, used by the browser performance report. */
export function weeksAdvanced(before, after) {
  // New careers have two trial ticks before round 1; legacy careers have none.
  // Trials advance `preseason` (1 → 2 → 0), leaving `week` at 1.
  const trials = before.preseason === undefined ? 0 : 2;
  const offset = s => s.preseason ? s.preseason - 1 : trials + s.week - 1;
  return (after.season - before.season) * (27 + trials) + offset(after) - offset(before);
}
