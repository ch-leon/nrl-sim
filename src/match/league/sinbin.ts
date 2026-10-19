// src/match/league/sinbin.ts — sin bins and professional fouls (GitHub #71;
// BAK-206 backlog B7). A penalty may send the offender to the sin bin for
// BIN.minutes of match clock: a small chance anywhere, more for a high shot,
// more in his own 20 (a professional foul: the infringement that stops a
// try), more again after repeated infringements there, and more for a Hitman
// or a Hothead. His side plays a man short until the clock says he is back; a
// stand-in takes his duties (the five-eighth kicks for the halfback, the prop
// plays dummy-half, a winger drops back for the fullback). Pure: live.ts rolls
// it on every penalty, whatever the chance, so turning bins off with the knobs
// leaves every match the same until a bin would have happened.

/** The sin-bin knobs (tuning reference §22). Overridable by name in balance experiments (tuning.ts). */
export const BIN = {
  /** Minutes of match clock a binned man sits out (Nines: five, not the thirteen-a-side ten). */
  minutes: 5,
  /** Chance a penalty anywhere else on the field is a sin bin… */
  base: 0.05,
  /** …one conceded inside the offender's own `redZoneM` (a professional foul)… */
  redZone: 0.25,
  redZoneM: 20,
  /** …plus this much more for every earlier penalty his side conceded in its own 20 (repeated infringements). */
  repeat: 0.2,
  /** A high shot. */
  highShot: 0.3,
  /** More per level of Hitman and of Hothead on the offender. */
  hitman: 0.05,
  hothead: 0.05,
  /** A side never has more than this many men in the bin at once. */
  maxOut: 1,
  /** A defence a man short is stretched: the carrier busts and steps this much more often against it. */
  shortBroken: 0.06,
  shortStep: 0.08,
};

/** Why he went: the detail on the `sin-bin` event. */
export type BinReason = 'high' | 'professional' | 'repeat' | 'offside';

export interface BinSituation {
  /** The penalty was a high shot. */
  high: boolean;
  /** Conceded inside the offender's own 20. */
  own20: boolean;
  /** Penalties his side had already conceded in its own 20 this match. */
  prior: number;
  /** The offender's Hitman and Hothead levels (0 without). */
  hitman: number;
  hothead: number;
}

/** Chance the penalty is a sin bin, 0..1. */
export function sinBinChance(s: BinSituation): number {
  const where = s.high ? BIN.highShot : s.own20 ? BIN.redZone : BIN.base;
  const again = s.own20 ? BIN.repeat * s.prior : 0;
  return Math.max(0, Math.min(1, where + again + BIN.hitman * s.hitman + BIN.hothead * s.hothead));
}

/** The reason for the bin, for the commentary. */
export function binReason(s: Pick<BinSituation, 'high' | 'own20' | 'prior'>): BinReason {
  if (s.high) return 'high';
  if (s.own20) return s.prior > 0 ? 'repeat' : 'professional';
  return 'offside';
}

const REASON_TEXT: Readonly<Record<BinReason, string>> = {
  high: 'for the high shot',
  professional: 'a professional foul on his own line',
  repeat: 'repeated infringements on his own line',
  offside: 'for the offside',
};

export function binReasonText(r: BinReason): string {
  return REASON_TEXT[r];
}
