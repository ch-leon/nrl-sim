// src/match/league/plays.ts — set plays, the pure half (#326, plan §3.1). The
// catalogue is src/data/plays.ts; the live sim launches and scripts a play
// (live/play.ts, live/restarts.ts). Everything here is rules and sums, no dice:
// the one roll a play takes is the live sim's, at the launch.
//
// A play is a script on top of the side's presets: who takes the ball, who
// runs a decoy line, and a bonus on the carrier's first contact when it comes
// off. Its odds of breaking down are its men's footy IQ against the play's
// needs, the side's attack style and the defence it meets.
import type { Difficulty } from '../../config';
import { PLAYS_BY_ID, playsOfFamily, type Play, type PlayFamily, type PlayFrom, type PlayId, type PlayMods, type RoleRef } from '../../data/plays';
import { COUNTER_MATRIX } from './counterMatrix';
import { zoneOf, type AttackPreset, type DefencePreset } from './presets';

/** The set-play knobs (tuning reference §37). Overridable by name in balance experiments (tuning.ts, group `plays`). */
export const PLAYS = {
  /** 1 = sheets' plays are run; 0 = every sheet's plays are ignored (a kill switch for the harness and the soak, not a game setting). */
  on: 1,
  /** A play breaks down this often with every man's IQ need met… */
  failBase: 0.12,
  /** …plus this per IQ point short, summed over the play's roles, never above `failCap`. */
  failPerPoint: 0.015,
  failCap: 0.65,
  /** Of the botches, this share is an intercept (plus `interceptPerPoint` per point short, capped); the rest a wasted tackle. */
  interceptBase: 0.05,
  interceptPerPoint: 0.005,
  interceptCap: 0.3,
  /** The side's attack preset is the play's style: this much on the fail odds. */
  styleFail: -0.05,
  /** The play's style against their defence (COUNTER_MATRIX −1 / +1): this much on the fail odds. */
  counterFail: { against: 0.05, for: -0.03 },
  /** 1 = a play of the side's own style scales its success mods by the side's plan fit (planFit.attack); 0 = never. */
  bonusByFit: 1,
  /** The cut-out plays' scripted pass: the lane defender's intercept read is multiplied by this (0 = never read, 1 = as any pass). */
  cutOutRead: 0.5,
  /** Kick-pass: the chance the sent winger takes a cross-field kick a defender was under. */
  kickPassChase: 0.1,
  /** Chip and chase: the chance the kicker (or the winger) regathers a chip a defender was under. */
  chipRegather: 0.1,
  /** The short side is within this many metres of touch. */
  shortSideM: 20,
  /** How far a scripted pass may go (metres), unless the play says further. */
  reachM: 14,
  /** Decoys run at a line this many metres ahead of the caller. */
  decoyLeadM: 2,
  /** A play left unfinished this long (ticks) is over. */
  scriptTicks: 60,
  /** The half's own calls from the three: not the same play again for this many sets, and at most this many a half. */
  auto: { cooldownSets: 2, perHalf: 4 },
  /** The Razzle coach needs this much reputation (phase 2). */
  razzleRep: 50,
  /** Plays taken into a match. */
  takeMax: 3,
  /** Plays a rival carries, by difficulty (phase 4). */
  aiPlays: { easy: 0, normal: 1, hard: 3 } as Record<Difficulty, number>,
};

/** Which edge of the field: the left (wingers' and centre's lanes near y = 0) or the right. */
export type Edge = 'left' | 'right';

/** The slot a play's man is in, for the edge the play runs to: the winger, or the edge's inside man (centre on the left, second-row on the right). */
export function roleSlot(who: RoleRef, edge: Edge): number {
  if (who === 'wing') return edge === 'left' ? 1 : 2;
  if (who === 'edge') return edge === 'left' ? 3 : 8;
  return who;
}

/** A man of the nine as the play reads him: his name and footy IQ (after the spread, in the sim). */
export interface PlayMan {
  name: string;
  footyIQ: number;
}

export interface PlayFitRole {
  slot: number;
  job: Play['roles'][number]['job'];
  name: string;
  iq: number;
  need: number;
  /** Points short of the need (0 when met). */
  short: number;
}

export interface PlayFit {
  roles: PlayFitRole[];
  /** Points short, summed over the roles. */
  shortfall: number;
  /** The man furthest short (the first role when every need is met). */
  worst: PlayFitRole;
}

/**
 * Each of the play's men against his IQ need: the nine by slot (index = slot),
 * the edge the play runs to. With no edge given, the edge that leaves the play
 * further short (a sheet or a screen that doesn't know the side yet reads the
 * worse one). Used by the engine, and later the Playbook and the tray caption,
 * so every "needs IQ" reads the same.
 */
export function playFit(play: Play, nine: readonly PlayMan[], edge?: Edge): PlayFit {
  if (edge === undefined) {
    const l = playFit(play, nine, 'left');
    const r = playFit(play, nine, 'right');
    return r.shortfall > l.shortfall ? r : l;
  }
  const roles = play.roles.map((role) => {
    const slot = roleSlot(role.who, edge);
    const man = nine[slot];
    const iq = man?.footyIQ ?? 50;
    return { slot, job: role.job, name: man?.name ?? `#${slot + 1}`, iq, need: role.iq, short: Math.max(0, role.iq - iq) };
  });
  const shortfall = roles.reduce((a, r) => a + r.short, 0);
  const worst = roles.reduce((w, r) => (r.short > w.short ? r : w), roles[0]!);
  return { roles, shortfall, worst };
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The style term on the fail odds: a play of the side's own attack style breaks down less. */
function styleTerm(play: Play, style: AttackPreset): number {
  return play.style === style ? PLAYS.styleFail : 0;
}

/** The counter term: their defence reads the play's style (−1 in COUNTER_MATRIX) or leaves room for it (+1). */
function counterTerm(play: Play, defence: DefencePreset): number {
  const c = COUNTER_MATRIX[play.style][defence];
  return c < 0 ? PLAYS.counterFail.against : c > 0 ? PLAYS.counterFail.for : 0;
}

/**
 * The play's odds (plan §3.1): `fail` that it breaks down, and `intercept` the
 * share of those botches that are picked off (a pass thrown to the lane
 * defender), the rest a wasted tackle. `shortfall` from playFit, the side's
 * attack preset, their defence. `fit` (the side's plan fit) is taken for the
 * success mods only (playBonus); the odds don't read it.
 */
export function playOdds(play: Play, shortfall: number, style: AttackPreset, defence: DefencePreset): { fail: number; intercept: number } {
  const fail = clamp(PLAYS.failBase + PLAYS.failPerPoint * shortfall + styleTerm(play, style) + counterTerm(play, defence), 0, PLAYS.failCap);
  const intercept = clamp((play.interceptBase ?? PLAYS.interceptBase) + PLAYS.interceptPerPoint * shortfall, 0, PLAYS.interceptCap);
  return { fail, intercept };
}

/** The success mods on the carrier's first contact: the play's own, × the side's plan fit when it plays the play's style (`bonusByFit`). */
export function playBonus(play: Play, style: AttackPreset, fit: number): PlayMods {
  const k = PLAYS.bonusByFit > 0 && play.style === style ? fit : 1;
  const out: PlayMods = {};
  for (const [key, v] of Object.entries(play.mods) as [keyof PlayMods, number][]) out[key] = v * k;
  return out;
}

/** The one launch roll's outcome: `r` the draw in [0, 1). Under fail × intercept an intercept, under fail a breakdown, else it comes off. */
export function playOutcome(r: number, odds: { fail: number; intercept: number }): 'ok' | 'breakdown' | 'intercept' {
  if (r < odds.fail * odds.intercept) return 'intercept';
  return r < odds.fail ? 'breakdown' : 'ok';
}

/** Where the ball is for a play: what the live sim's refusal and the half's auto rule both read. */
export interface PlayFacts {
  from: PlayFrom;
  /** The tackle the play would be run on, 1-based (tackles made + 1). */
  tackle: number;
  /** Metres to the line the side attacks. */
  toLine: number;
  /** Metres from the ball to the nearer touchline. */
  touchM: number;
  /** The last tackle. */
  last: boolean;
  /** The set's kick is already struck. */
  kickAway: boolean;
}

/** Why a play can't be run from here (plan §3.2), or null when it can: zone, tackle, launch point, side, a kick play's distance. */
export function playWhen(play: Play, f: PlayFacts): string | null {
  if (f.kickAway) return 'the kick’s away';
  if (f.last && !play.kick) return 'last tackle';
  if (!play.from.includes(f.from)) return 'not from here';
  const w = play.when;
  if (w.zones && !w.zones.includes(zoneOf(f.toLine))) return 'not from here';
  if (w.toLineM && (f.toLine < w.toLineM[0] || f.toLine > w.toLineM[1])) return 'not from here';
  if (w.tackles && (f.tackle < w.tackles[0] || f.tackle > w.tackles[1])) return 'not from here';
  if (w.side === 'short' && f.touchM > PLAYS.shortSideM) return 'not from here';
  return null;
}

/** What the half remembers of his own calls: this half's count, and the set each play last went on. */
export interface AutoUsed {
  half: number;
  launched: number;
  lastSet: Partial<Record<PlayId, number>>;
}

export const NO_AUTO_USED: AutoUsed = { half: 1, launched: 0, lastSet: {} };

/**
 * The half's own call from the side's three (plan §3.1): the first in the list
 * that can be run from here, not run in the last `auto.cooldownSets` sets, and
 * under `auto.perHalf` this half. `set` is the side's set count now. Rules only, no dice.
 */
export function pickAutoPlay(list: readonly PlayId[], facts: PlayFacts, used: AutoUsed, set: number): PlayId | null {
  if (used.launched >= PLAYS.auto.perHalf) return null;
  for (const id of list) {
    const last = used.lastSet[id];
    if (last !== undefined && set - last < PLAYS.auto.cooldownSets) continue;
    if (playWhen(PLAYS_BY_ID[id], facts) === null) return id;
  }
  return null;
}

/** The family a style's plays come from: Balanced borrows the width coach's (plan §6). */
export const STYLE_FAMILY: Readonly<Record<AttackPreset, PlayFamily>> = {
  grind: 'direct',
  balanced: 'width',
  expansive: 'width',
  'kick-chase': 'kicking',
  'all-out': 'razzle',
};

/** The plays of a style's family, in catalogue order (the Lab's `?plays=1` takes the first three). */
export function stylePlays(style: AttackPreset): PlayId[] {
  return playsOfFamily(STYLE_FAMILY[style]).map((p) => p.id);
}

/**
 * A rival's plays (plan §5): `aiPlays[difficulty]` of his style's family, the
 * ones his nine is least short for, ties in catalogue order. Pure and no RNG,
 * so a rival's plays are the same every time his sheet is built.
 */
export function rivalPlays(style: AttackPreset, nine: readonly PlayMan[], difficulty: Difficulty): PlayId[] {
  const n = Math.max(0, Math.min(PLAYS.takeMax, PLAYS.aiPlays[difficulty] ?? 0));
  if (n === 0) return [];
  return playsOfFamily(STYLE_FAMILY[style])
    .map((p, i) => ({ id: p.id, short: playFit(p, nine).shortfall, i }))
    .sort((a, b) => a.short - b.short || a.i - b.i)
    .slice(0, n)
    .map((p) => p.id);
}

/** "the block play", "the Rambo": a play named in a line of commentary. */
export function playTitle(play: Play): string {
  return play.name.startsWith('The ') ? `the ${play.name.slice(4)}` : `the ${play.name.charAt(0).toLowerCase()}${play.name.slice(1)}`;
}

/** "the block play", "the cut-out", "the Rambo": a play by its short name, for the ticker (short enough for its line). */
export function playShortTitle(play: Play): string {
  return play.name.startsWith('The ') ? `the ${play.name.slice(4)}` : `the ${play.short.charAt(0).toLowerCase()}${play.short.slice(1)}`;
}

/** The play a set-play event names: `set-play` and `play-breaks-down` carry its id, a coach's call `set-play:<id>`. */
export function playOfDetail(detail: string | undefined): Play | null {
  const id = detail?.startsWith('set-play:') ? detail.slice('set-play:'.length) : detail;
  return id && id in PLAYS_BY_ID ? PLAYS_BY_ID[id as PlayId] : null;
}

/** A sheet's plays as the sim runs them: known ids, no repeats, at most `takeMax`; none when `plays.on` is 0. */
export function sheetPlays(plays: readonly PlayId[] | undefined): PlayId[] {
  if (!plays || PLAYS.on <= 0) return [];
  const out: PlayId[] = [];
  for (const id of plays) if (PLAYS_BY_ID[id] && !out.includes(id) && out.length < PLAYS.takeMax) out.push(id);
  return out;
}
