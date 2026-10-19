// src/match/league/rules.ts — the Nines ruleset in one place (BAK-207 §5.1,
// 2a; #77: Nines all the way through). Two 9:00 halves of real sim time: the
// clock runs while the ball is in play and stops from a try to the restart.
// When it runs out the siren goes and play carries on until the ball is next
// dead. Set length stays SET_TACKLES in config.ts (the old engine shares it).

/** The Nines rules (tuning reference §13). Overridable by name in balance experiments (tuning.ts). */
export const NINES = {
  /** Length of each half, minutes of sim time. */
  halfMinutes: 9,
  /** Points for a try, a conversion (a drop kick in Nines) and a field goal (penalty goals come with 2e). */
  tryPoints: 4,
  conversionPoints: 2,
  fieldGoalPoints: 1,
  /** The half-time break on screen, ticks (3 s), before the second-half kick-off. */
  halfTimeTicks: 60,
  /** At half-time each player gets back this share of the legs he has lost (BAK-208 §8.2). */
  halfTimeLegsBack: 0.5,
  /** After the siren the half ends at the next dead ball, or after this many seconds whatever happens. */
  playOnMaxS: 60,
};

/** How long a match lasts: two halves of NINES.halfMinutes by default; tests and the balance harness can play a single stretch. */
export interface MatchLength {
  halves: 1 | 2;
  halfMinutes: number;
}

export const fullMatch = (): MatchLength => ({ halves: 2, halfMinutes: NINES.halfMinutes });

/** "1st 4:32" for the readout: the half and the time gone in it. */
export function clockText(half: number, seconds: number): string {
  const s = Math.floor(seconds);
  return `${half === 1 ? '1st' : '2nd'} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
