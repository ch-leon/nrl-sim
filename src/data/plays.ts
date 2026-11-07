// src/data/plays.ts — the set plays catalogue (#326, plan §2.1). Data only: the
// pure rules are src/match/league/plays.ts and the live sim runs them
// (live/play.ts, live/restarts.ts). Ten plays, two or three per attack style,
// each opened by one attack coach's speciality and bought once.
//
// Roles are the nine's slots (src/match/league/roles.ts: fullback 0, wingers
// 1/2, centre 3, five-eighth 4, halfback 5, hooker 6, prop 7, second-row 8).
// `'wing'` is the winger on the side the play runs to, `'edge'` that edge's
// inside man (the centre on the left edge, the second-row on the right). The
// IQ need is footy IQ after the rating spread.
import type { AttackPreset, Zone } from '../match/league/presets';

export type PlayId =
  | 'block-play' | 'inside-ball' | 'short-side-raid'
  | 'cut-out-winger' | 'second-man' | 'block-shift'
  | 'kick-pass' | 'chip-chase'
  | 'tap-rambo' | 'long-ball';

/** The attack coach's speciality that opens a play to buy (plan §2.2). */
export type PlayFamily = 'direct' | 'width' | 'kicking' | 'razzle';

/** The attack style a play leans into: Tight (grind), Expansive, Kick-chase or All-out. */
export type PlayStyle = Extract<AttackPreset, 'grind' | 'expansive' | 'kick-chase' | 'all-out'>;

/** Where a play can start: the play-the-ball, a tap restart, or a scrum (#327, not built yet). */
export type PlayFrom = 'ptb' | 'tap' | 'scrum';

/**
 * Which edge a play runs to: `open` away from the nearer touchline, `short`
 * toward it (only with the ball within `PLAYS.shortSideM` of touch), `near`
 * toward it from anywhere, `overlap` the side with the overlap, else open.
 */
export type PlaySide = 'open' | 'short' | 'near' | 'overlap';

/** A man in a play: a slot, or the play side's winger / edge inside man. */
export type RoleRef = number | 'wing' | 'edge';

export type PlayJob = 'caller' | 'link' | 'receiver' | 'decoy' | 'lead' | 'kicker' | 'chaser' | 'taker';

export interface PlayRole {
  who: RoleRef;
  job: PlayJob;
  /** Footy IQ the job needs. */
  iq: number;
}

/** A step of the script: who takes the ball next, and where he runs to take it (metres across from the man passing; + toward the play's side, − inside). */
export interface PlayStep {
  to: RoleRef;
  latM: number;
}

/** What a play adds to its carrier's first contact when it comes off (contest mods; plan §2.1 "On success"). */
export interface PlayMods {
  broken?: number;
  offload?: number;
  fend?: number;
  stepAgainst?: number;
}

export interface Play {
  id: PlayId;
  name: string;
  /** For the pop-up, the tray tile and the result tag ("Block play +9m"). */
  short: string;
  style: PlayStyle;
  family: PlayFamily;
  from: readonly PlayFrom[];
  when: {
    /** Zones the ball may be in (presets.ts zoneOf); absent = anywhere. */
    zones?: readonly Zone[];
    /** Metres to their line, inclusive both ends (the kick plays). */
    toLineM?: readonly [number, number];
    /** Tackles it may be run on, 1-based and inclusive ("tackles 1–3"); absent = any. */
    tackles?: readonly [number, number];
    side?: PlaySide;
  };
  roles: readonly PlayRole[];
  /** The ball's path after the launch (the dummy-half's pass, or the tap): the first `to` is the caller. */
  script: readonly PlayStep[];
  /** Men running block or decoy lines; a decoy never takes the pass. */
  decoys: readonly PlayStep[];
  /** A kick play's kick, struck by the caller. */
  kick?: 'cross-field' | 'chip';
  /** How far the scripted pass may go, metres (else `PLAYS.reachM`): the cut-outs throw further. */
  reachM?: number;
  /** A cut-out play: its scripted pass is read by the lane defender at `PLAYS.cutOutRead` (the others' are not read). */
  cutOut?: boolean;
  mods: PlayMods;
  /** A botch's intercept base, when not `PLAYS.interceptBase`. */
  interceptBase?: number;
  /** One-off price, dollars. */
  price: number;
  blurb: string;
}

const ANY_BUT_OWN20: readonly Zone[] = ['ownHalf', 'midfield', 'attackingHalf', 'redZone'];

export const PLAY_LIST: readonly Play[] = [
  {
    id: 'block-play', name: 'Block play', short: 'Block play', style: 'grind', family: 'direct', from: ['ptb'],
    when: { zones: ['ownHalf', 'midfield', 'attackingHalf'], tackles: [1, 3] },
    roles: [{ who: 5, job: 'caller', iq: 58 }, { who: 7, job: 'lead', iq: 50 }, { who: 8, job: 'receiver', iq: 52 }],
    script: [{ to: 5, latM: 4 }, { to: 8, latM: 6 }],
    decoys: [{ to: 7, latM: 2 }],
    mods: { broken: 0.1 },
    price: 8000,
    blurb: 'The prop runs a lead line at the near defender; the half holds and passes late behind him to the second-row.',
  },
  {
    id: 'inside-ball', name: 'Inside ball', short: 'Inside ball', style: 'grind', family: 'direct', from: ['ptb'],
    when: { zones: ['attackingHalf', 'redZone'], tackles: [1, 4] },
    roles: [{ who: 5, job: 'caller', iq: 55 }, { who: 7, job: 'receiver', iq: 50 }],
    script: [{ to: 5, latM: 5 }, { to: 7, latM: -3 }],
    decoys: [],
    mods: { broken: 0.08, offload: 0.05 },
    price: 7000,
    blurb: 'The half runs at the line and turns a short ball back inside to the prop hitting the hole.',
  },
  {
    id: 'short-side-raid', name: 'Short-side raid', short: 'Short side', style: 'all-out', family: 'direct', from: ['ptb'],
    when: { zones: ANY_BUT_OWN20, tackles: [1, 3], side: 'short' },
    roles: [{ who: 6, job: 'caller', iq: 55 }, { who: 4, job: 'link', iq: 58 }, { who: 'wing', job: 'receiver', iq: 50 }],
    script: [{ to: 4, latM: 4 }, { to: 'wing', latM: 5 }],
    decoys: [],
    mods: { stepAgainst: 0.08, broken: 0.06 },
    price: 9000,
    blurb: 'Dummy-half to the five-eighth on the blind side, the winger trailing for the second pass.',
  },
  {
    id: 'cut-out-winger', name: 'Cut-out to the winger', short: 'Cut-out', style: 'expansive', family: 'width', from: ['ptb'],
    when: { zones: ['midfield', 'attackingHalf', 'redZone'], tackles: [2, 4], side: 'open' },
    roles: [{ who: 5, job: 'caller', iq: 62 }, { who: 'edge', job: 'decoy', iq: 50 }, { who: 'wing', job: 'receiver', iq: 52 }],
    script: [{ to: 5, latM: 4 }, { to: 'wing', latM: 16 }],
    decoys: [{ to: 'edge', latM: 7 }],
    reachM: 22,
    cutOut: true,
    mods: { broken: 0.08 },
    price: 10000,
    blurb: 'The half throws over the centre, who runs a decoy line, to the winger out wide.',
  },
  {
    id: 'second-man', name: 'Second-man play', short: 'Second man', style: 'expansive', family: 'width', from: ['ptb'],
    when: { zones: ANY_BUT_OWN20, tackles: [1, 4], side: 'open' },
    roles: [{ who: 5, job: 'caller', iq: 60 }, { who: 4, job: 'link', iq: 60 }, { who: 'edge', job: 'receiver', iq: 52 }],
    script: [{ to: 5, latM: 4 }, { to: 4, latM: 5 }, { to: 'edge', latM: 6 }],
    decoys: [],
    mods: { broken: 0.08, fend: 0.03 },
    price: 9000,
    blurb: 'Halfback to the five-eighth, who passes out the back to the centre running onto it.',
  },
  {
    id: 'block-shift', name: 'Block shift', short: 'Block shift', style: 'expansive', family: 'width', from: ['ptb'],
    when: { zones: ['attackingHalf', 'redZone'], tackles: [2, 3], side: 'overlap' },
    roles: [{ who: 5, job: 'caller', iq: 65 }, { who: 0, job: 'link', iq: 58 }, { who: 'wing', job: 'receiver', iq: 50 }, { who: 3, job: 'decoy', iq: 48 }, { who: 8, job: 'decoy', iq: 48 }],
    script: [{ to: 5, latM: 4 }, { to: 0, latM: 6 }, { to: 'wing', latM: 8 }],
    decoys: [{ to: 3, latM: 3 }, { to: 8, latM: 6 }],
    mods: { broken: 0.12, fend: 0.04 },
    price: 14000,
    blurb: 'A sweep: two decoys run block lines, the fullback comes into the line behind them and finds the winger.',
  },
  {
    id: 'kick-pass', name: 'Kick-pass to the corner', short: 'Kick-pass', style: 'kick-chase', family: 'kicking', from: ['ptb'],
    when: { toLineM: [0, 25], tackles: [4, 5], side: 'open' },
    roles: [{ who: 5, job: 'kicker', iq: 60 }, { who: 'wing', job: 'chaser', iq: 55 }],
    script: [{ to: 5, latM: 4 }],
    decoys: [],
    kick: 'cross-field',
    mods: {},
    price: 11000,
    blurb: 'The cross-field kick to the far winger, who is sent early to the corner.',
  },
  {
    id: 'chip-chase', name: 'Chip and chase', short: 'Chip', style: 'kick-chase', family: 'kicking', from: ['ptb'],
    when: { toLineM: [20, 40], tackles: [4, 5], side: 'near' },
    roles: [{ who: 5, job: 'kicker', iq: 62 }, { who: 'wing', job: 'chaser', iq: 55 }],
    script: [{ to: 5, latM: 4 }],
    decoys: [],
    kick: 'chip',
    mods: {},
    price: 9000,
    blurb: 'A chip over the rushing line for the kicker and the near winger to run onto.',
  },
  {
    id: 'tap-rambo', name: 'The Rambo', short: 'Rambo', style: 'all-out', family: 'razzle', from: ['tap', 'scrum'],
    when: { zones: ['attackingHalf', 'redZone'] },
    roles: [{ who: 5, job: 'taker', iq: 66 }, { who: 7, job: 'decoy', iq: 52 }, { who: 8, job: 'decoy', iq: 52 }],
    script: [{ to: 5, latM: 0 }],
    decoys: [{ to: 7, latM: -4 }, { to: 8, latM: 4 }],
    mods: { stepAgainst: 0.15, broken: 0.1 },
    interceptBase: 0.08,
    price: 16000,
    blurb: 'Off the tap the halfback takes it himself, double-pumps behind two hard decoy lines and goes.',
  },
  {
    id: 'long-ball', name: 'The long ball', short: 'Long ball', style: 'all-out', family: 'razzle', from: ['tap', 'scrum', 'ptb'],
    when: { zones: ANY_BUT_OWN20, tackles: [1, 1], side: 'open' },
    roles: [{ who: 5, job: 'caller', iq: 70 }, { who: 'wing', job: 'receiver', iq: 55 }, { who: 3, job: 'decoy', iq: 50 }, { who: 8, job: 'decoy', iq: 50 }],
    script: [{ to: 5, latM: 3 }, { to: 'wing', latM: 20 }],
    decoys: [{ to: 3, latM: 5 }, { to: 8, latM: 10 }],
    reachM: 26,
    cutOut: true,
    mods: { broken: 0.12 },
    interceptBase: 0.1,
    price: 18000,
    blurb: 'The 20 m cut-out across two men to the far winger off the set platform.',
  },
];

export const PLAY_IDS: readonly PlayId[] = PLAY_LIST.map((p) => p.id);

export const PLAYS_BY_ID: Readonly<Record<PlayId, Play>> = Object.fromEntries(PLAY_LIST.map((p) => [p.id, p])) as Record<PlayId, Play>;

export function isPlayId(v: unknown): v is PlayId {
  return PLAY_IDS.includes(v as PlayId);
}

/** The plays a family opens, in catalogue order. */
export function playsOfFamily(family: PlayFamily): Play[] {
  return PLAY_LIST.filter((p) => p.family === family);
}

/** The plays of an attack style, in catalogue order (Balanced has none of its own). */
export function playsOfStyle(style: AttackPreset): Play[] {
  return PLAY_LIST.filter((p) => p.style === style);
}
