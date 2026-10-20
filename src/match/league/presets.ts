// src/match/league/presets.ts — team tactics (BAK-208 §5, D): what a side
// wants to do with the ball in each zone of the field, and how its line
// defends. Attack and defence are separate presets (decision 2026-10-17). Pure
// data and lookups; live.ts reads the plan for the carrier's zone each
// decision and adds its numbers to the odds the contest already uses.
import type { KickChoice } from './tactics';

export type AttackPreset = 'grind' | 'balanced' | 'expansive' | 'kick-chase' | 'all-out';
export type DefencePreset = 'slide' | 'rush' | 'compressed';

export const ATTACK_PRESETS: readonly AttackPreset[] = ['grind', 'balanced', 'expansive', 'kick-chase', 'all-out'];
export const DEFENCE_PRESETS: readonly DefencePreset[] = ['slide', 'rush', 'compressed'];

export interface TeamTactics {
  attack: AttackPreset;
  defence: DefencePreset;
}

export const DEFAULT_TACTICS: TeamTactics = { attack: 'balanced', defence: 'slide' };

export const isAttackPreset = (s: string | null | undefined): s is AttackPreset => ATTACK_PRESETS.includes(s as AttackPreset);
export const isDefencePreset = (s: string | null | undefined): s is DefencePreset => DEFENCE_PRESETS.includes(s as DefencePreset);

export const PRESET_LABEL: Readonly<Record<AttackPreset | DefencePreset, string>> = {
  grind: 'Grind',
  balanced: 'Balanced',
  expansive: 'Expansive',
  'kick-chase': 'Kick-chase',
  'all-out': 'All-out',
  slide: 'Slide',
  rush: 'Rush',
  compressed: 'Compressed',
};

/** The five zones from the attacking side's view, by metres to the line he is attacking. */
export type Zone = 'own20' | 'ownHalf' | 'midfield' | 'attackingHalf' | 'redZone';

export function zoneOf(toLine: number): Zone {
  if (toLine > 80) return 'own20';
  if (toLine > 60) return 'ownHalf';
  if (toLine > 40) return 'midfield';
  if (toLine > 20) return 'attackingHalf';
  return 'redZone';
}

/** What the attack wants in a zone. Numbers are deltas / multipliers on the sim's defaults. */
export interface AttackPlan {
  /** Added to the chance of passing when engaged (default 0.3 + Skill/300). */
  pass: number;
  /** Multiplier on the offload odds; 0 forbids them (support is ignored). */
  offload: number;
  /** Chance the carrier tries the step one-on-one rather than tucking it and carrying in. */
  step: number;
  /** Chance per engagement of throwing to the widest man in reach (on top of a Playmaker's). */
  cutOut: number;
  /** Width bias for the receiver choice (0 = the 6 m pass, 0.5 = width is fine). */
  width: number;
  /** Extra preference for the forwards' early hit-ups (tackles 1–3 off the ruck). */
  hitUps: number;
  /** Extra preference for the edges (centres and wingers). */
  edges: number;
  /** Chance of an early attacking kick on the second-last tackle in the red zone. */
  earlyKick: number;
  /** Chance of an early territory kick on the second-last tackle from deep (own 20 / own half). */
  earlyTerritory: number;
  /** Multipliers on the last-tackle kick choice weights. */
  kickBias: Partial<Record<KickChoice, number>>;
}

const BASE_PLAN: AttackPlan = { pass: 0, offload: 1, step: 1, cutOut: 0, width: 0, hitUps: 0, edges: 0, earlyKick: 0.35, earlyTerritory: 0, kickBias: {} };

/** Per preset: a base plan and zone overrides. */
const ATTACK: Readonly<Record<AttackPreset, { base: Partial<AttackPlan>; zones?: Partial<Record<Zone, Partial<AttackPlan>>> }>> = {
  grind: {
    base: { pass: -0.15, offload: 0, step: 0.6, hitUps: 1, earlyKick: 0.2, earlyTerritory: 0.25, kickBias: { long: 1.6, bomb: 0.7, chip: 0.5, 'cross-field': 0.5 } },
    zones: { own20: { pass: -0.25, earlyTerritory: 0.4 }, attackingHalf: { offload: 0.5 }, redZone: { offload: 0.7, step: 0.8 } },
  },
  balanced: {
    base: {},
    zones: { own20: { offload: 0.6, pass: -0.05 } },
  },
  expansive: {
    base: { pass: 0.15, offload: 1.3, cutOut: 0.08, width: 0.35, edges: 0.8, earlyKick: 0.3, kickBias: { 'cross-field': 1.5, long: 0.8 } },
    zones: { own20: { offload: 0.8, cutOut: 0.03 } },
  },
  'kick-chase': {
    base: { pass: -0.05, offload: 0.6, step: 0.9, earlyKick: 0.55, earlyTerritory: 0.35, kickBias: { bomb: 1.8, long: 1.2, grubber: 1.3, 'cross-field': 0.8, chip: 0.8 } },
    zones: { redZone: { offload: 0.8 } },
  },
  'all-out': {
    base: { pass: 0.15, offload: 1.6, cutOut: 0.12, width: 0.45, edges: 0.5, earlyKick: 0.3, kickBias: { chip: 1.6, 'cross-field': 1.3, grubber: 1.2, long: 0.6 } },
    zones: { own20: { offload: 1.2 } },
  },
};

export function attackPlan(preset: AttackPreset, zone: Zone): AttackPlan {
  const p = ATTACK[preset];
  return { ...BASE_PLAN, ...p.base, ...(p.zones?.[zone] ?? {}) };
}

/** How the line defends. */
export interface DefencePlan {
  /** Line rush-up speed, m/s (default 5). */
  lineSpeed: number;
  /** Extra defenders committed to the carrier (0 or 1). */
  commit: number;
  /** Multiplier on how far the lanes slide toward the ball (>1 bunches the middle, opens the edges). */
  pull: number;
  /** Multiplier on how long the markers hold at the ruck (<1 releases them sooner). */
  markerHold: number;
  /** Probability points added to the contest for every tackle this line makes. */
  bigHit: number;
  broken: number;
  offload: number;
  /** Added to the carrier's step chance against this line (an over-eager line is stepped). */
  stepAgainst: number;
}

const DEFENCE: Readonly<Record<DefencePreset, DefencePlan>> = {
  slide: { lineSpeed: 5, commit: 0, pull: 1, markerHold: 1, bigHit: 0, broken: 0, offload: 0, stepAgainst: 0 },
  rush: { lineSpeed: 6.5, commit: 1, pull: 1, markerHold: 0.6, bigHit: 0.04, broken: 0.11, offload: 0, stepAgainst: 0.04 },
  compressed: { lineSpeed: 4.5, commit: 0, pull: 1.4, markerHold: 1.2, bigHit: 0, broken: -0.04, offload: -0.03, stepAgainst: -0.02 },
};

export function defencePlan(preset: DefencePreset): DefencePlan {
  return DEFENCE[preset];
}

/** The preset tables as data, for balance experiments (tuning.ts): the default attack plan, each attack preset's base and zone overrides, and the defence plans. */
export const PRESET_TABLES = { attackDefault: BASE_PLAN, attack: ATTACK, defence: DEFENCE };
/** Attack-plan fields an experiment may set on a preset that doesn't list them yet. */
export const ATTACK_PLAN_KEYS: readonly string[] = Object.keys(BASE_PLAN).filter((k) => k !== 'kickBias');

// ── Rivals: a style from the squad (N11), or from club identity ───────────────

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}

/**
 * How a rival's style follows from its best nine (N11, tuning reference §27): a side's
 * units against its own average, so it reads the same at any strength.
 */
export const RIVAL_STYLE = {
  /** Backs this much quicker than the side's average → Expansive. */
  backsPace: 0.5,
  /** Forwards this much stronger than the side's average → Grind. */
  packStrength: 2.5,
  /** Contenders (strength at least this) with no other mark go All-out. */
  allOutFrom: 65,
  /** Forwards this much stronger → Rush in defence. */
  rushPack: 2,
  /** The nine's stamina this much above its other stats → Compressed. */
  compressedStamina: 1,
};

const BACKS: readonly string[] = ['fullback', 'winger', 'centre'];
const HALVES: readonly string[] = ['five-eighth', 'halfback'];
const PACK: readonly string[] = ['hooker', 'prop', 'second-row', 'lock'];

/** A man of the nine, as the style reads him (a team sheet's roster entry). */
export interface StyleEntry {
  position: string;
  stats?: { speed: number; strength: number; stamina: number; skill: number; footyIQ: number };
  traits?: readonly { id: string }[];
}

/**
 * A rival's tactics. From its nine (N11): a half with Big Boot or Playmaker kicks
 * and chases, quick backs throw it wide, a heavy pack grinds, a contender with none
 * of those goes all out, the rest are balanced; a strong pack rushes in defence and
 * a fit line compresses. Without a nine (a strength-built sheet) it stays as it was:
 * fixed per club from a roll of its identity, by strength tier.
 */
export function rivalTactics(club: { id: string; strength: number }, nine?: readonly StyleEntry[]): TeamTactics {
  if (nine && nine.length > 0 && nine.every((e) => e.stats)) return styleOfNine(club.strength, nine);
  const h = hash(club.id);
  const a = h % 3;
  const d = (h >>> 8) % 3;
  const attack: AttackPreset =
    club.strength >= 65 ? (['expansive', 'all-out', 'balanced'] as const)[a]!
    : club.strength >= 50 ? (['balanced', 'kick-chase', 'expansive'] as const)[a]!
    : (['grind', 'kick-chase', 'balanced'] as const)[a]!;
  const defence: DefencePreset = (['slide', 'rush', 'compressed'] as const)[d]!;
  return { attack, defence };
}

function styleOfNine(strength: number, nine: readonly StyleEntry[]): TeamTactics {
  const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const stat = (units: readonly string[] | null, k: keyof NonNullable<StyleEntry['stats']>): number =>
    mean(nine.filter((e) => !units || units.includes(e.position)).map((e) => e.stats![k]));
  const backs = stat(BACKS, 'speed') - stat(null, 'speed');
  const pack = stat(PACK, 'strength') - stat(null, 'strength');
  const fit = stat(null, 'stamina') - (stat(null, 'strength') + stat(null, 'speed') + stat(null, 'skill') + stat(null, 'footyIQ')) / 4;
  const kicker = nine.some((e) => HALVES.includes(e.position) && (e.traits ?? []).some((t) => t.id === 'bigBoot' || t.id === 'playmaker'));
  const attack: AttackPreset =
    kicker ? 'kick-chase'
    : backs >= RIVAL_STYLE.backsPace ? 'expansive'
    : pack >= RIVAL_STYLE.packStrength ? 'grind'
    : strength >= RIVAL_STYLE.allOutFrom ? 'all-out'
    : 'balanced';
  const defence: DefencePreset = pack >= RIVAL_STYLE.rushPack ? 'rush' : fit >= RIVAL_STYLE.compressedStamina ? 'compressed' : 'slide';
  return { attack, defence };
}

export function tacticsLabel(t: TeamTactics): string {
  return `${PRESET_LABEL[t.attack]} / ${PRESET_LABEL[t.defence]}`;
}
