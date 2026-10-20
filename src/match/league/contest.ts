// src/match/league/contest.ts — the tackle contest (BAK-208 §1, §4.1).
//
// Every contact resolves the same way: the SITUATION sets the baseline (how
// many defenders, the angle he arrives from, who's quicker, the tackle count,
// fatigue), the two players' STATS shift it, traits will add their bonus on
// top (C, §3), and ONE seeded roll decides. Pure and unit-tested so the
// numbers in the design doc are the numbers in the game.
import { FATIGUE } from './fatigue';

export type ContestOutcome = 'held' | 'big-hit' | 'broken' | 'fend' | 'offload' | 'strip';

export interface ContestStats {
  strength: number;
  speed: number;
  skill: number;
  footyIQ: number;
}

export const AVERAGE: ContestStats = { strength: 50, speed: 50, skill: 50, footyIQ: 50 };

/** How the tackler arrives relative to the carrier's running line. */
export type Angle = 'square' | 'side' | 'behind';

export interface Situation {
  /** Defenders committed at the carrier when contact is made (1 = one-on-one). */
  defenders: 1 | 2 | 3;
  angle: Angle;
  /** Carrier speed minus tackler speed, m/s (positive: he has the momentum). */
  speedDiff: number;
  /** The defence is set on the last tackle. */
  lastTackle: boolean;
  /** 0 fresh … 1 spent (F, §8). */
  carrierFatigue: number;
  tacklerFatigue: number;
  /** A support runner is close enough to take an offload. */
  support: boolean;
}

export const OPEN: Situation = { defenders: 1, angle: 'square', speedDiff: 0, lastTackle: false, carrierFatigue: 0, tacklerFatigue: 0, support: false };

/** The carrier's edge in the contact from stats alone, 0..1 (0.5 = even). */
export function carrierEdge(atk: ContestStats, def: ContestStats): number {
  const a = atk.strength * 0.5 + atk.speed * 0.3 + atk.skill * 0.2;
  const d = def.strength * 0.6 + def.footyIQ * 0.2 + def.speed * 0.2;
  return 1 / (1 + Math.exp(-(a - d) / 22));
}

/** Even-stats, one-on-one, square baseline (design doc §4.1). */
export const BASE = { bigHit: 0.1, broken: 0.12, fend: 0.07, offload: 0.12, strip: 0.02 };

/** Probability points traits add to (or take from) each outcome, already scaled by level (§3). */
export interface ContestMods {
  broken?: number;
  fend?: number;
  offload?: number;
  bigHit?: number;
  strip?: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(0.95, v));

/**
 * Probability of each outcome for a situation and the stats edge. Stats move
 * the baseline by up to ±(their weight); the situation adds and subtracts the
 * modifiers listed in §4.1; traits add theirs on top. Whatever is left is a
 * plain held tackle.
 */
export function contestOdds(edge: number, s: Situation, mods: ContestMods = {}): Record<ContestOutcome, number> {
  const e = Math.max(0, Math.min(1, edge)) - 0.5; // −0.5 … +0.5, 0 = even
  let broken = BASE.broken + 0.16 * e;
  let fend = BASE.fend + 0.09 * e;
  let offload = s.support ? BASE.offload + 0.1 * e : 0;
  let bigHit = BASE.bigHit - 0.14 * e;
  let strip = s.defenders === 1 ? BASE.strip - 0.02 * e : 0;

  // Numbers at the tackle.
  if (s.defenders === 2) {
    broken -= 0.06;
    fend -= 0.04;
    offload -= 0.03;
    bigHit += 0.04;
  } else if (s.defenders >= 3) {
    broken -= 0.09;
    fend -= 0.06;
    offload -= 0.05;
    bigHit += 0.06;
  }
  // Where he comes from: square is the strongest hit; from the side the arm
  // is there to fend; from behind he's chasing and can only drag.
  if (s.angle === 'side') {
    fend += 0.05;
    bigHit -= 0.04;
  } else if (s.angle === 'behind') {
    broken += 0.04;
    fend += 0.03;
    bigHit -= 0.06;
  }
  // Momentum: ±1% bust per m/s, capped.
  broken += Math.max(-0.04, Math.min(0.04, s.speedDiff * 0.01));
  if (s.lastTackle) bigHit += 0.03;
  // Fatigue (F): a spent carrier can't bust or fend; a spent tackler can't hit.
  const fw = FATIGUE.contest;
  broken -= fw.carrierBust * s.carrierFatigue;
  fend -= fw.carrierFend * s.carrierFatigue;
  offload -= fw.carrierOffload * s.carrierFatigue * (offload > 0 ? 1 : 0);
  bigHit -= fw.tacklerBigHit * s.tacklerFatigue;
  broken += fw.tacklerBust * s.tacklerFatigue;
  // Traits (§3): only where the situation allows the outcome at all.
  broken += mods.broken ?? 0;
  fend += mods.fend ?? 0;
  if (offload > 0) offload += mods.offload ?? 0;
  bigHit += mods.bigHit ?? 0;
  if (strip > 0) strip += mods.strip ?? 0;

  broken = clamp01(broken);
  fend = clamp01(fend);
  offload = clamp01(offload);
  bigHit = clamp01(bigHit);
  strip = clamp01(strip);
  const held = Math.max(0, 1 - broken - fend - offload - bigHit - strip);
  return { held, 'big-hit': bigHit, broken, fend, offload, strip };
}

const ORDER: readonly ContestOutcome[] = ['broken', 'fend', 'offload', 'strip', 'big-hit', 'held'];

/** Resolve a contact from a single roll in [0, 1). */
export function resolveContest(atk: ContestStats, def: ContestStats, roll: number, s: Situation, mods: ContestMods = {}): ContestOutcome {
  const odds = contestOdds(carrierEdge(atk, def), s, mods);
  let acc = 0;
  for (const k of ORDER) {
    acc += odds[k];
    if (roll < acc) return k;
  }
  return 'held';
}

// ── The step (pre-contact, one-on-one) ───────────────────────────────────────

/** Footwork and defence are derived stats (§2). */
export const footwork = (s: ContestStats): number => (s.speed + s.skill) / 2;
export const defence = (s: ContestStats): number => (s.strength + s.footyIQ) / 2;

/**
 * Chance the carrier steps a lone defender before contact (§4.1): 10% at even
 * footwork vs defence, ±1% per 2 points of edge, +5% when the defender comes
 * from the side, less when the carrier is spent, plus any trait bonus (§3).
 * Never against two defenders.
 */
export function stepChance(atk: ContestStats, def: ContestStats, s: Situation, traitBonus = 0): number {
  if (s.defenders !== 1) return 0;
  let p = 0.1 + (footwork(atk) - defence(def)) / 200;
  if (s.angle === 'side') p += 0.05;
  if (s.angle === 'behind') p -= 0.05; // can't step what you can't see
  p -= 0.08 * s.carrierFatigue;
  p += 0.04 * s.tacklerFatigue;
  p += traitBonus;
  return Math.max(0, Math.min(0.7, p));
}

/** Tackler approach angle from the direction he closes on the carrier vs the carrier's heading. */
export function angleFrom(cosApproach: number): Angle {
  if (cosApproach > 0.5) return 'square';
  if (cosApproach < -0.5) return 'behind';
  return 'side';
}

// ── Passing (§4.2) ───────────────────────────────────────────────────────────

/** Chance a pass is spilled on the catch: 4% base, +4% under pressure, −/+ by Skill, +6% rain, + a wild offload's extra. */
export function knockOnChance(receiverSkill: number, pressured: boolean, rain = false, extra = 0): number {
  let p = 0.04 + (50 - receiverSkill) / 1000;
  if (pressured) p += 0.04;
  if (rain) p += 0.06;
  p += extra;
  return Math.max(0.005, Math.min(0.4, p));
}

/** Chance a defender inside the pass lane picks it off: 6% base, more for a cut-out, by his IQ, plus his trait (§3). */
export function interceptChance(defenderIQ: number, cutOut: boolean, traitBonus = 0): number {
  let p = 0.06 + (defenderIQ - 50) / 1000;
  if (cutOut) p *= 2;
  p += traitBonus;
  return Math.max(0.01, Math.min(0.6, p));
}
