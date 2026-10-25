// src/match/league/penalties.ts — penalties and six-again (BAK-207 §5.1 2e).
// Ruck offences (holding down in a long wrestle, slow off the ruck) give the
// attack six again: the tackle count back to zero. Offside at the ruck (more
// likely in a Rush defence) and high shots (more likely from a Hothead) give a
// penalty, and the captain chooses: a shot at goal (a Nines drop kick, 2
// points) when it is in range and makes sense on the clock and score, a tap
// and go close to the line, or a kick for touch and a tap 10 m in. Sin bins
// later (BAK-206 B7). Pure: live.ts calls the offences and plays the choice.
import type { DefencePreset } from './presets';

/** The penalty knobs (tuning reference §17). Overridable by name in balance experiments (tuning.ts). */
export const PENALTY = {
  /** Six again: at any play-the-ball, a defender lying in or slow off the ruck… */
  ruckSixAgain: 0.008,
  /** …and, after a slow wrestle (BAK-208 §8.1), a tackler holding down. */
  holdDown: 0.08,
  /** Offside when the ball is played, by the defending side's preset: Rush pays for its line speed. */
  offside: { slide: 0.008, rush: 0.02, compressed: 0.006 } as Record<DefencePreset, number>,
  /** A high shot in a made tackle: anyone, and this much more per level of Hothead. */
  highShot: 0.002,
  highShotHothead: 0.03,
  /** Points for a penalty goal (a drop kick in Nines). */
  goalPoints: 2,
  /** The captain takes the shot at goal when it is this likely to go over… */
  shotMin: 0.6,
  /**
   * …and either it is late (this many seconds of the match left) with his side at most this far behind and not more than a point ahead…
   * Was 300 (the last 5:00 of 18:00). 300 × 7/9 ≈ 233, the same share of a 14-minute match.
   */
  shotLateS: 233,
  shotBehind: 6,
  shotAhead: 1,
  /** …or the half is about to end (this many seconds left, or the siren has gone). */
  shotHalfEndS: 20,
  /** Otherwise: inside this many metres of the line, tap and go; further out, kick for touch. */
  tapInsideM: 25,
  /** The captain (N11): the shot needs this much less likelihood per point of Footy IQ above `captainIqMid` (more above it, less below)… */
  captainIq: 0.004,
  captainIqMid: 60,
  /** …and a Hothead captain taps from this much further out per level. */
  captainHotheadM: 8,
  /** A penalty kick for touch gains this much (× Big Boot distance), never to inside the other side's 10 m. */
  touchGainM: 25,
  /** The penalty is taken once the taker is on his mark, after at least this long and at most this long (ticks). */
  minTicks: 40,
  maxTicks: 220,
};

export type PenaltyChoice = 'goal' | 'tap' | 'touch';

/** The offside chance for a defence preset. */
export function offsideChance(preset: DefencePreset): number {
  return PENALTY.offside[preset];
}

export interface PenaltySituation {
  /** Chance the kicker lands it from the mark (goals.goalChance). */
  shotChance: number;
  /** Metres from the mark to the line the side attacks. */
  toLine: number;
  /** Seconds of the match left (both halves), and of this half. */
  matchLeftS: number;
  halfLeftS: number;
  /** The siren has gone (the half ends at the next dead ball). */
  siren: boolean;
  /** Points: the side awarded the penalty minus the other side. */
  margin: number;
  /** Who makes the call (N11); neutral when absent. */
  captain?: CaptainRead;
}

/** The captain as the penalty call reads him (N11). */
export interface CaptainRead {
  footyIQ: number;
  /** Hothead level 0–3. */
  hothead: number;
}

/** A captain who moves nothing: the call as it was before N11 (a sheet that names none). */
export const NEUTRAL_CAPTAIN: CaptainRead = { footyIQ: 60, hothead: 0 };

/**
 * The captain's call: a shot at goal when it is likely to go over and the
 * points matter now (late and close, or the half ending); else tap and go near
 * the line, or kick for touch from further out.
 */
export function choosePenalty(s: PenaltySituation): PenaltyChoice {
  // The captain (N11): a smart one takes the points on a slimmer chance, a Hothead taps and runs from further out.
  const c = s.captain ?? NEUTRAL_CAPTAIN;
  const shotMin = PENALTY.shotMin - (c.footyIQ - PENALTY.captainIqMid) * PENALTY.captainIq;
  const tapInsideM = PENALTY.tapInsideM + c.hothead * PENALTY.captainHotheadM;
  const likely = s.shotChance >= shotMin;
  const lateAndClose = s.matchLeftS <= PENALTY.shotLateS && s.margin >= -PENALTY.shotBehind && s.margin <= PENALTY.shotAhead;
  const halfEnding = s.siren || s.halfLeftS <= PENALTY.shotHalfEndS;
  if (likely && (lateAndClose || halfEnding)) return 'goal';
  return s.toLine <= tapInsideM ? 'tap' : 'touch';
}
