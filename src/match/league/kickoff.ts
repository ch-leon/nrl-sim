// src/match/league/kickoff.ts — the kick-off (#397): how deep the default goes,
// and the kicking side's two calls in the restart break, Short and Long. Pure:
// live.ts draws the dice and plays the kick; this module says where it lands,
// how high it goes and the odds. Not in tuning.ts while #391 edits it.
import { IN_GOAL } from '../core/field';
import { clamp, type Vec } from '../core/vec';
import { kickoffTarget } from './tactics';

/** The kick-off knobs (tuning reference, kick-off rows). */
export const KICKOFF = {
  /**
   * 1 = the deeper default kick-off (#397 stage 2: it moves the match
   * fingerprints, so it waits for the re-pin); 0 = today's, onto the
   * receivers' 24 m line.
   */
  deepDefault: 0,
  /** Today's kick-off: onto the receivers' this-metre line, `peak` metres high. */
  today: { lineM: 24, peak: 16 },
  /**
   * The deeper default: onto the receivers' `worstM` line with a kicking skill
   * of `skillLo` or less, their `bestM` line at `skillHi` or more (straight
   * between), a little more hang to match.
   */
  deep: { worstM: 15, bestM: 8, skillLo: 30, skillHi: 90, peak: 18 },
  /**
   * Short kick-off: high, `pastHalfwayM` past halfway (the 10 m rule) for the
   * chase. Regathered `base` of the time, plus `perPoint` for each point of the
   * best chaser's Speed over the catcher's Skill, kept to `min`–`max`. The best
   * chaser is the quickest of the `chasers` kicking men nearest the spot.
   */
  short: { pastHalfwayM: 12, peak: 20, base: 0.25, perPoint: 0.005, min: 0.15, max: 0.4, chasers: 3 },
  /**
   * Long kick-off: for the corner of the in-goal and the 5 m line, onto the
   * receivers' `worstM` line at `skillLo` down to `bestM` at `skillHi`. Dead on
   * the full `deadOnFull` of the time (a penalty at halfway), landing
   * `deadPastM` past the dead-ball line. Paid off when it comes down inside
   * their `pinnedM`.
   */
  long: { worstM: 5, bestM: 0, peak: 20, deadOnFull: 0.1, deadPastM: 3, pinnedM: 10 },
};

export type KickoffCall = 'kickoff-short' | 'kickoff-long';

/** Where the kick-off comes down on the receivers' side of halfway, in metres from their own try line, by the kicker's Skill. */
export function kickoffLineM(call: KickoffCall | null, skill: number, deep = KICKOFF.deepDefault > 0): number {
  if (call === 'kickoff-short') return 50 - KICKOFF.short.pastHalfwayM;
  const k = call === 'kickoff-long' ? KICKOFF.long : deep ? KICKOFF.deep : null;
  if (!k) return KICKOFF.today.lineM;
  const s = KICKOFF.deep;
  const t = clamp((skill - s.skillLo) / (s.skillHi - s.skillLo), 0, 1);
  return k.worstM + (k.bestM - k.worstM) * t;
}

/** How high the kick-off goes (hang time follows), metres. */
export function kickoffPeak(call: KickoffCall | null, deep = KICKOFF.deepDefault > 0): number {
  if (call === 'kickoff-short') return KICKOFF.short.peak;
  if (call === 'kickoff-long') return KICKOFF.long.peak;
  return deep ? KICKOFF.deep.peak : KICKOFF.today.peak;
}

/**
 * The kick-off's landing spot and height. With no call and `deep` off it is
 * today's kick to the letter (the same one draw, `jitter01`, across the field).
 * `dead`: a Long that goes dead on the full, past the dead-ball line.
 */
export function kickoffLanding(call: KickoffCall | null, receivingDir: 1 | -1, jitter01: number, skill: number, dead = false, deep = KICKOFF.deepDefault > 0): { to: Vec; peak: number } {
  const line = dead ? -(IN_GOAL + KICKOFF.long.deadPastM) : kickoffLineM(call, skill, deep);
  return { to: kickoffTarget(receivingDir, jitter01, line), peak: kickoffPeak(call, deep) };
}

/** A short kick-off's chance of being regathered: the best chaser's Speed against the catcher's Skill. */
export function regatherChance(chaserSpeed: number, catcherSkill: number): number {
  const s = KICKOFF.short;
  return clamp(s.base + (chaserSpeed - catcherSkill) * s.perPoint, s.min, s.max);
}

/** A Long kick-off pinned them: it came down `lineM` metres from their own try line, inside `pinnedM`. */
export function pinnedDeep(lineM: number): boolean {
  return lineM <= KICKOFF.long.pinnedM;
}
