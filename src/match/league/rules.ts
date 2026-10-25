// src/match/league/rules.ts — the Nines ruleset in one place (BAK-207 §5.1,
// 2a; #77: Nines all the way through). Two 7:00 halves of real sim time: the
// clock runs while the ball is in play and stops from a try to the restart.
// When it runs out the siren goes and play carries on until the ball is next
// dead. Set length stays SET_TACKLES in config.ts (the old engine shares it).
//
// Halves were 9:00 (Leon, 2026-10-18). Cut to 7:00 on 2026-10-25 so a match
// watched at ×4, with the dead-time pace, lands near 3½–4 real minutes.
// Windows that were a share of the old match are ×7/9. Legs costs that were
// tuned across a 9-minute half are ×9/7, so full time is still about as tired.

/** The Nines rules (tuning reference §13). Overridable by name in balance experiments (tuning.ts). */
export const NINES = {
  /** Length of each half, minutes of sim time. Was 9. */
  halfMinutes: 7,
  /** Points for a try, a conversion (a drop kick in Nines) and a field goal (penalty goals come with 2e). */
  tryPoints: 4,
  /** A try grounded in the bonus zone, the in-goal between the posts (Nines; goals.ts). */
  bonusTryPoints: 5,
  conversionPoints: 2,
  fieldGoalPoints: 1,
  /** The half-time break on screen, ticks (3 s), before the second-half kick-off. */
  halfTimeTicks: 60,
  /** At half-time each player gets back this share of the legs he has lost (BAK-208 §8.2). */
  halfTimeLegsBack: 0.5,
  /** After the siren the half ends at the next dead ball, or after this many seconds whatever happens. */
  playOnMaxS: 60,
  /**
   * Golden point (N9.4): a final level at full time plays on this many minutes, next score wins (0 = no golden point).
   * Was 5 of an 18-minute match. 5 × 7/9 ≈ 3.9; 4 keeps that share of a 14-minute match (4/14 against 5/18).
   */
  goldenPointMinutes: 4,
  /** The break before golden point, ticks (2 s); no legs come back in it. */
  goldenPointBreakTicks: 40,
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
  return `${half === 1 ? '1st' : half === 2 ? '2nd' : 'GP'} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
