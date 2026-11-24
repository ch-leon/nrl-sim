/** Repeat sets on the goal line (#657). Overridable as `goalLineStand.*`. */
export const GOAL_LINE_STAND = {
  on: 1,
  zoneM: 20,
  compression: 0.30,
  defenceLegs: 0.4,
  podWeight: 0.55,
  edgeWeight: 1.1,
  earlyKick: 0.08,
  cornerBombWeight: 0.5,
};

/** Only passages that reach the third straight set enter the stand tallies. */
export const STAND_SETS = 3;

export const STAND_OUTCOMES = ['try', 'strip', 'error', 'held-up', 'turnover', 'outside-20', 'goal-attempt', 'clock'] as const;
export type StandOutcome = typeof STAND_OUTCOMES[number];
