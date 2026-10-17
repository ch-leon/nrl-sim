// src/match/league/traits.ts — how traits enter the contests (BAK-208 §3).
// Pure: given the two players' traits and the situation, the probability
// points each trait adds (already scaled by level) and which trait gets the
// credit when that outcome lands, so the view can shout "WRECKING BALL II".
// live.ts calls these; contest.ts just adds the numbers to its odds.
import { traitBoost, traitLabel, type TraitId, type TraitInstance } from '../../data/traits';
import type { ContestMods, ContestOutcome, Situation } from './contest';

/** Probability points at level I (BAK-208 §3.1–3.2). */
export const TRAIT_PTS = {
  dancingFeet: 0.15,
  wreckingBall: 0.12,
  dontArgue: 0.12,
  offloadKing: 0.12,
  razzleDazzle: 0.2,
  finisherBust: 0.1,
  finisherFend: 0.05,
  finisherStep: 0.1,
  hitman: 0.12,
  hothead: 0.12,
  pickpocket: 0.08,
  brickWall: 0.1,
  lastLine: 0.1,
  poacher: 0.1,
  gambler: 0.15,
  playmakerPass: 0.1,
  jetsSpeed: 0.08,
  lastLineSpeed: 0.1,
  bigBootDist: 0.1,
  bigBootAcc: 0.15,
} as const;

/** The downside of a double-edged trait is fixed — levels raise only the upside. */
export const EDGE_COST = {
  /** Hothead: busted and stepped this much more often. */
  hothead: 0.08,
  /** Razzle Dazzle: his offloads spill this much more often. */
  razzleDazzle: 0.1,
} as const;

/** Inside this many metres of the try line (the red zone) the Finisher fires. */
export const FINISHER_M = 20;

export interface ContestTraits {
  mods: ContestMods;
  /** Which trait to announce if that outcome lands. */
  credit: Partial<Record<ContestOutcome, TraitInstance>>;
}

const instance = (traits: readonly TraitInstance[], id: TraitId): TraitInstance | undefined => traits.find((t) => t.id === id);

/** Keep the credit on whichever trait added the most to that outcome. */
function add(out: ContestTraits, key: keyof ContestMods, outcome: ContestOutcome, traits: readonly TraitInstance[], id: TraitId, pts: number, best: Map<ContestOutcome, number>): void {
  const boost = traitBoost(traits, id);
  if (boost === 0) return;
  const v = pts * boost;
  out.mods[key] = (out.mods[key] ?? 0) + v;
  if (v > (best.get(outcome) ?? 0)) {
    best.set(outcome, v);
    out.credit[outcome] = instance(traits, id)!;
  }
}

/**
 * Trait modifiers for a contact: the carrier's attacking traits lift his
 * outcomes, the tackler's defensive traits lift his, and the double-edged
 * ones cut both ways. `nearLine`: the carrier is inside the Finisher zone.
 */
export function contestTraits(carrier: readonly TraitInstance[], tackler: readonly TraitInstance[], s: Situation, nearLine: boolean): ContestTraits {
  const out: ContestTraits = { mods: {}, credit: {} };
  const best = new Map<ContestOutcome, number>();
  // Carrier.
  add(out, 'broken', 'broken', carrier, 'wreckingBall', TRAIT_PTS.wreckingBall, best);
  if (s.angle !== 'behind') add(out, 'fend', 'fend', carrier, 'dontArgue', TRAIT_PTS.dontArgue, best);
  if (s.support) {
    add(out, 'offload', 'offload', carrier, 'offloadKing', TRAIT_PTS.offloadKing, best);
    add(out, 'offload', 'offload', carrier, 'razzleDazzle', TRAIT_PTS.razzleDazzle, best);
  }
  if (nearLine) {
    add(out, 'broken', 'broken', carrier, 'finisher', TRAIT_PTS.finisherBust, best);
    add(out, 'fend', 'fend', carrier, 'finisher', TRAIT_PTS.finisherFend, best);
  }
  // Tackler.
  if (s.angle === 'square') add(out, 'bigHit', 'big-hit', tackler, 'hitman', TRAIT_PTS.hitman, best);
  add(out, 'bigHit', 'big-hit', tackler, 'hothead', TRAIT_PTS.hothead, best);
  if (s.defenders === 1) add(out, 'strip', 'strip', tackler, 'pickpocket', TRAIT_PTS.pickpocket, best);
  if (s.defenders >= 2) {
    const wall = traitBoost(tackler, 'brickWall');
    if (wall > 0) {
      out.mods.broken = (out.mods.broken ?? 0) - TRAIT_PTS.brickWall * wall;
      out.mods.offload = (out.mods.offload ?? 0) - TRAIT_PTS.brickWall * wall;
    }
  }
  if (s.defenders === 1) {
    const cover = traitBoost(tackler, 'lastLine');
    if (cover > 0) {
      out.mods.broken = (out.mods.broken ?? 0) - TRAIT_PTS.lastLine * cover;
      out.mods.fend = (out.mods.fend ?? 0) - TRAIT_PTS.lastLine * cover;
    }
  }
  // The hothead flies out of the line: easier to bust.
  if (traitBoost(tackler, 'hothead') > 0) out.mods.broken = (out.mods.broken ?? 0) + EDGE_COST.hothead;
  return out;
}

export interface StepTraits {
  bonus: number;
  credit: TraitInstance | null;
}

/** Trait bonus on the pre-contact step: Dancing Feet, Finisher near the line, a Hothead defender. */
export function stepTraits(carrier: readonly TraitInstance[], defender: readonly TraitInstance[], nearLine: boolean): StepTraits {
  let bonus = 0;
  let credit: TraitInstance | null = null;
  let bestV = 0;
  const feet = traitBoost(carrier, 'dancingFeet');
  if (feet > 0) {
    bonus += TRAIT_PTS.dancingFeet * feet;
    bestV = TRAIT_PTS.dancingFeet * feet;
    credit = instance(carrier, 'dancingFeet')!;
  }
  const fin = nearLine ? traitBoost(carrier, 'finisher') : 0;
  if (fin > 0) {
    const v = TRAIT_PTS.finisherStep * fin;
    bonus += v;
    if (v > bestV) credit = instance(carrier, 'finisher')!;
  }
  if (traitBoost(defender, 'hothead') > 0) bonus += EDGE_COST.hothead;
  return { bonus, credit };
}

export interface InterceptTraits {
  bonus: number;
  credit: TraitInstance | null;
  /** A Gambler who misses the read is beaten. */
  gamble: boolean;
}

/** Trait bonus for a defender in the pass lane: Poacher, or the Gambler's all-or-nothing shot. */
export function interceptTraits(defender: readonly TraitInstance[]): InterceptTraits {
  const poach = traitBoost(defender, 'poacher');
  const gamble = traitBoost(defender, 'gambler');
  let bonus = 0;
  let credit: TraitInstance | null = null;
  if (poach > 0) {
    bonus += TRAIT_PTS.poacher * poach;
    credit = instance(defender, 'poacher')!;
  }
  if (gamble > 0) {
    bonus += TRAIT_PTS.gambler * gamble;
    if (TRAIT_PTS.gambler * gamble >= TRAIT_PTS.poacher * poach) credit = instance(defender, 'gambler')!;
  }
  return { bonus, credit, gamble: gamble > 0 };
}

/** Top-speed multiplier for a trait that quickens a player in a moment (Jets, Last Line). */
export function speedMult(traits: readonly TraitInstance[], id: 'jets' | 'lastLine'): number {
  const b = traitBoost(traits, id);
  return b === 0 ? 1 : 1 + (id === 'jets' ? TRAIT_PTS.jetsSpeed : TRAIT_PTS.lastLineSpeed) * b;
}

/** Big Boot: distance and accuracy multipliers for a kick (1, 1 without it). */
export function bootMult(traits: readonly TraitInstance[]): { dist: number; acc: number } {
  const b = traitBoost(traits, 'bigBoot');
  return b === 0 ? { dist: 1, acc: 1 } : { dist: 1 + TRAIT_PTS.bigBootDist * b, acc: Math.max(0.2, 1 - TRAIT_PTS.bigBootAcc * b) };
}

/** Announce a firing trait: "Dancing Feet II". */
export const announce = (t: TraitInstance | null | undefined): string | undefined => (t ? traitLabel(t) : undefined);
