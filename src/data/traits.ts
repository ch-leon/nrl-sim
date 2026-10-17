// src/data/traits.ts — the trait catalogue (BAK-208 §3): rare special skills
// with a level I–III. Stats make players good; traits make them memorable, so
// each one fires in a specific moment and is announced when it does. Pure
// data + helpers, shared by generation, the save migration, the squad UI, the
// old event-log engine and the live sim. No Phaser, no store.
import type { Position } from '../core/state';
import type { Rng } from '../utils/rng';

export type TraitId =
  // Attack
  | 'dancingFeet' | 'wreckingBall' | 'dontArgue' | 'offloadKing' | 'finisher' | 'jets' | 'playmaker' | 'bigBoot'
  // Defence
  | 'hitman' | 'lastLine' | 'pickpocket' | 'brickWall' | 'poacher'
  // Double-edged: brilliant some days, costly on others
  | 'hothead' | 'razzleDazzle' | 'gambler'
  // Meta (training, career, injuries)
  | 'workhorse' | 'youngGun' | 'veteran' | 'clubLegend' | 'injuryProne';

export type TraitLevel = 1 | 2 | 3;

export interface TraitInstance {
  id: TraitId;
  level: TraitLevel;
}

export type TraitGroup = 'attack' | 'defence' | 'edge' | 'meta';

export interface TraitDef {
  /** Footy-slang display name. */
  name: string;
  /** Badge label on a player card (3–5 characters). */
  short: string;
  group: TraitGroup;
  /** One line for the tooltip / codex: when it fires and what it does at level I. */
  blurb: string;
  /** Positions it is rolled for most often; null = any. */
  fit: readonly Position[] | null;
  /** Rolled at generation (meta traits arrive by age / tenure instead). */
  pool: boolean;
  /** Worth warning about on a card (a downside). */
  bad?: boolean;
}

const FORWARDS: readonly Position[] = ['prop', 'second-row', 'lock', 'hooker'];
const OUTSIDE: readonly Position[] = ['fullback', 'winger', 'centre'];
const HALVES: readonly Position[] = ['five-eighth', 'halfback'];
const BALL_PLAYERS: readonly Position[] = ['five-eighth', 'halfback', 'hooker', 'fullback'];

export const TRAITS: Readonly<Record<TraitId, TraitDef>> = {
  dancingFeet: { name: 'Dancing Feet', short: 'FEET', group: 'attack', blurb: 'Steps a lone defender more often (+15% at I)', fit: OUTSIDE, pool: true },
  wreckingBall: { name: 'Wrecking Ball', short: 'WRECK', group: 'attack', blurb: 'Busts tackles (+12% at I) and keeps driving when held', fit: FORWARDS, pool: true },
  dontArgue: { name: "Don't Argue", short: 'FEND', group: 'attack', blurb: 'Palms off tacklers (+12% fend at I)', fit: [...OUTSIDE, 'second-row'], pool: true },
  offloadKing: { name: 'Offload King', short: 'OFFL', group: 'attack', blurb: 'Gets the ball away in the tackle (+12% offload at I)', fit: FORWARDS, pool: true },
  finisher: { name: 'Finisher', short: 'FIN', group: 'attack', blurb: 'Inside the opposition 20 m: busts and steps more, and gets over', fit: ['winger', 'centre', 'fullback'], pool: true },
  jets: { name: 'Jets', short: 'JETS', group: 'attack', blurb: 'A longer burst after a break; quicker on the kick chase (+8% at I)', fit: OUTSIDE, pool: true },
  playmaker: { name: 'Playmaker', short: 'PLAY', group: 'attack', blurb: 'Reads the shift: passes more, throws the cut-out ball', fit: BALL_PLAYERS, pool: true },
  bigBoot: { name: 'Big Boot', short: 'BOOT', group: 'attack', blurb: 'Kicks longer (+10% at I) and more accurately', fit: HALVES, pool: true },
  hitman: { name: 'Hitman', short: 'HIT', group: 'defence', blurb: 'Square one-on-one: the big hit (+12% at I)', fit: FORWARDS, pool: true },
  lastLine: { name: 'Last Line', short: 'LAST', group: 'defence', blurb: 'Cover defender: quicker chasing a break, harder to beat one-on-one', fit: ['fullback', 'winger'], pool: true },
  pickpocket: { name: 'Pickpocket', short: 'PICK', group: 'defence', blurb: 'Strips the ball one-on-one (+8% at I)', fit: null, pool: true },
  brickWall: { name: 'Brick Wall', short: 'WALL', group: 'defence', blurb: 'In a two-man tackle the carrier busts and offloads less (−10% at I)', fit: FORWARDS, pool: true },
  poacher: { name: 'Poacher', short: 'POACH', group: 'defence', blurb: 'Picks off passes in his lane (+10% at I)', fit: OUTSIDE, pool: true },
  hothead: { name: 'Hothead', short: 'HOT', group: 'edge', blurb: 'Hits hard (+12% big hit at I) but flies out of the line: busted and stepped more', fit: FORWARDS, pool: true, bad: true },
  razzleDazzle: { name: 'Razzle Dazzle', short: 'RAZZ', group: 'edge', blurb: 'Throws the miracle offload (+20% at I) — and spills a few', fit: null, pool: true, bad: true },
  gambler: { name: 'Gambler', short: 'GAMB', group: 'edge', blurb: 'Shoots for the intercept (+15% at I); a wrong read leaves him beaten', fit: OUTSIDE, pool: true, bad: true },
  workhorse: { name: 'Workhorse', short: 'WORK', group: 'meta', blurb: 'Trains harder (×1.2 at I)', fit: null, pool: true },
  youngGun: { name: 'Young Gun', short: 'YNG', group: 'meta', blurb: 'Develops quickly (training ×1.3)', fit: null, pool: false },
  veteran: { name: 'Veteran', short: 'VET', group: 'meta', blurb: 'Been around', fit: null, pool: false },
  clubLegend: { name: 'Club Legend', short: 'LEG', group: 'meta', blurb: 'Club legend', fit: null, pool: false },
  injuryProne: { name: 'Injury Prone', short: 'INJ', group: 'meta', blurb: 'More likely to be hurt', fit: null, pool: false, bad: true },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];
/** Traits a generated player can roll. */
export const POOL_IDS: readonly TraitId[] = TRAIT_IDS.filter((id) => TRAITS[id].pool);

/** Level scales the trait's base bonus: I ×1.0 · II ×1.6 · III ×2.2. */
export const LEVEL_MULT: Readonly<Record<TraitLevel, number>> = { 1: 1, 2: 1.6, 3: 2.2 };
export const ROMAN: Readonly<Record<TraitLevel, string>> = { 1: 'I', 2: 'II', 3: 'III' };

export const isTraitId = (s: string): s is TraitId => s in TRAITS;

export function hasTrait(traits: readonly TraitInstance[] | undefined, id: TraitId): boolean {
  return traits?.some((t) => t.id === id) ?? false;
}

/** 0 when absent, else 1–3. */
export function traitLevel(traits: readonly TraitInstance[] | undefined, id: TraitId): 0 | TraitLevel {
  return traits?.find((t) => t.id === id)?.level ?? 0;
}

/** The level multiplier for a trait the player has, or 0. */
export function traitBoost(traits: readonly TraitInstance[] | undefined, id: TraitId): number {
  const l = traitLevel(traits, id);
  return l === 0 ? 0 : LEVEL_MULT[l];
}

/** "Dancing Feet II" — how a firing trait is announced. */
export function traitLabel(t: TraitInstance): string {
  return `${TRAITS[t.id].name} ${ROMAN[t.level]}`;
}

/** Add a trait, or raise its level if already held (never above III). */
export function withTrait(traits: readonly TraitInstance[], id: TraitId, level: TraitLevel = 1): TraitInstance[] {
  const i = traits.findIndex((t) => t.id === id);
  if (i < 0) return [...traits, { id, level }];
  const cur = traits[i]!;
  if (cur.level >= level) return [...traits];
  return traits.map((t, k) => (k === i ? { id, level } : t));
}

export function withoutTrait(traits: readonly TraitInstance[], id: TraitId): TraitInstance[] {
  return traits.filter((t) => t.id !== id);
}

// ── Generation ───────────────────────────────────────────────────────────────

export type TraitQuality = 'rookie' | 'average' | 'star';

/**
 * How many traits a generated player rolls, by quality: cumulative odds of
 * 0 / 1 / 2 / 3 / 4. Average players follow the design doc (55 / 30 / 12 / 3);
 * rookies have fewer, stars are the superstars with several.
 */
export const TRAIT_COUNT_ODDS: Readonly<Record<TraitQuality, readonly number[]>> = {
  rookie: [0.7, 0.95, 1, 1, 1],
  average: [0.55, 0.85, 0.97, 0.995, 1],
  star: [0.3, 0.65, 0.88, 0.97, 1],
};
/** Generation gives level I or (this often) level II; III is trained. */
export const LEVEL_TWO_CHANCE = 0.25;
/** A position-fit trait is this many times as likely as an off-position one. */
const FIT_WEIGHT = 3;

export function rollTraitCount(roll01: number, quality: TraitQuality): number {
  const odds = TRAIT_COUNT_ODDS[quality];
  for (let n = 0; n < odds.length; n++) if (roll01 < odds[n]!) return n;
  return odds.length - 1;
}

/**
 * Roll a generated player's traits: how many (by quality), which (weighted to
 * the position, never a repeat) and what level. Every draw routes through `rng`.
 */
export function rollTraits(rng: Rng, position: Position, quality: TraitQuality): TraitInstance[] {
  const n = rollTraitCount(rng.next(), quality);
  const out: TraitInstance[] = [];
  const left = [...POOL_IDS];
  for (let i = 0; i < n && left.length > 0; i++) {
    const weights = left.map((id) => (TRAITS[id].fit === null || TRAITS[id].fit!.includes(position) ? FIT_WEIGHT : 1));
    let r = rng.next() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    for (; k < left.length - 1; k++) {
      r -= weights[k]!;
      if (r < 0) break;
    }
    const id = left.splice(k, 1)[0]!;
    out.push({ id, level: rng.next() < LEVEL_TWO_CHANCE ? 2 : 1 });
  }
  return out;
}

// ── Migration from the pre-level string traits (save v5 and earlier) ─────────

const LEGACY: Readonly<Record<string, TraitId>> = { hardMan: 'hitman' };

/** Old `Trait[]` names → instances at level I (unknown names are dropped, repeats merged). */
export function fromLegacy(names: readonly unknown[]): TraitInstance[] {
  let out: TraitInstance[] = [];
  for (const n of names) {
    if (typeof n !== 'string') continue;
    const id = LEGACY[n] ?? n;
    if (isTraitId(id)) out = withTrait(out, id, 1);
  }
  return out;
}
