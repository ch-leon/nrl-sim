// src/match/league/kickContest.ts — the contests a kick sets up (BAK-208 §4.3–4.4,
// E #99): who wins a high ball, who wins the race to a grubber in the in-goal,
// and when a loose ball is a scramble. The short kick-off's regather (#397,
// kickoff.ts) is the same contest as a bomb's: the chaser's Speed against the
// catcher's Skill. Pure: live.ts draws the dice and plays it out.
import { clamp } from '../core/vec';

/** A chaser's odds under a kick: `base`, plus `perPoint` for each point of his Speed over the catcher's Skill, kept to `min`–`max`. */
export interface ChaseOdds {
  base: number;
  perPoint: number;
  min: number;
  max: number;
}

/** The kick-contest knobs (tuning reference §6). Overridable by name in balance experiments (tuning.ts). */
export const KICK_CONTEST = {
  bomb: {
    /** A bomb is contested when a chaser and a catcher are both this close to where it comes down as it lands. */
    contestM: 3,
    /** The chaser wins it back (taps it back to his side) this often, by his Speed over the catcher's Skill. */
    won: { base: 0.11, perPoint: 0.002, min: 0.05, max: 0.25 } as ChaseOdds,
    /** Not beaten to it, the catcher spills it this often, by the chaser's Speed over his Skill; rain multiplies it (weather.rainHandling). */
    spill: { base: 0.16, perPoint: 0.002, min: 0.08, max: 0.32 } as ChaseOdds,
    /** A bomb's peak, metres, and how much each level of Big Boot adds to it (hang time: the chase gets there). */
    peak: 20,
    bootPeakM: 2,
    /** Each metre of peak over `peak` adds this to the chaser's odds. */
    perPeakM: 0.005,
    /** A Kick-chase side's chasers (BAK-208 §5.1) get this much more. */
    kickChase: 0.03,
  },
  grubber: {
    /** In the in-goal, the nearest attacker and defender race for it if the attacker is within this. */
    raceM: 14,
    /** The bounce: either man's arrival is this many seconds early or late, evenly (one draw). */
    bounceS: 0.45,
    /** A Kick-chase side's chaser is this many seconds quicker to it. */
    kickChaseS: 0.15,
  },
  scramble: {
    /** A loose ball is a scramble when both sides have a man this close to it. */
    nearM: 6,
  },
};

/** The chance the chaser wins a contest under a kick: his Speed against the catcher's Skill, plus `extra`, kept to the odds' range. */
export function chaserWins(o: ChaseOdds, chaserSpeed: number, catcherSkill: number, extra = 0): number {
  return clamp(o.base + (chaserSpeed - catcherSkill) * o.perPoint + extra, o.min, o.max);
}

/** A bomb's peak, metres: higher with Big Boot (more hang, the chase gets under it). */
export function bombPeak(bigBoot: number): number {
  return KICK_CONTEST.bomb.peak + KICK_CONTEST.bomb.bootPeakM * bigBoot;
}

/** What can happen when a chaser and a catcher meet under a bomb, as chances: won back, spilled, else caught clean. */
export interface HighBall {
  won: number;
  spill: number;
}

/**
 * A contested bomb: the chaser's Speed against the catcher's Skill, the kick's
 * height (Big Boot puts it higher), a Kick-chase side, and the wet (`handling`,
 * 1 dry, more in rain) which makes the catcher spill more. The two always
 * leave some clean catches.
 */
export function highBall(chaserSpeed: number, catcherSkill: number, peak: number, kickChase: boolean, handling = 1): HighBall {
  const b = KICK_CONTEST.bomb;
  const extra = Math.max(0, peak - b.peak) * b.perPeakM + (kickChase ? b.kickChase : 0);
  const won = chaserWins(b.won, chaserSpeed, catcherSkill, extra);
  // Not beaten to it, the catcher still has to hold it with the chaser on him.
  const spill = (1 - won) * Math.min(1, chaserWins(b.spill, chaserSpeed, catcherSkill, extra) * handling);
  return { won, spill };
}

/**
 * The race to a grubber in the in-goal: the chance the attacker gets there
 * first, from each man's time to the ball (seconds). The bounce moves the
 * difference by up to `bounceS` either way, so a man who is that much
 * quicker always wins it, and a dead heat is a coin toss.
 */
export function grubberRace(attackerS: number, defenderS: number, kickChase = false): number {
  const g = KICK_CONTEST.grubber;
  const edge = defenderS - attackerS + (kickChase ? g.kickChaseS : 0);
  return clamp((edge + g.bounceS) / (2 * g.bounceS), 0, 1);
}
