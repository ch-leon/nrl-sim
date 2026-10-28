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
// Since #361 the values live in the active content pack (src/content/au.ts).
import { activeRules } from '../../content';

/**
 * The Nines rules (tuning reference §13). Overridable by name in balance
 * experiments (tuning.ts). The values are the content pack's (src/content/au.ts
 * documents each one); NINES is that same object, so an override reaches every
 * reader of either name.
 */
export const NINES = activeRules();

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
