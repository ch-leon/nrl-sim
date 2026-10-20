// src/match/balance/plan.ts — a balance experiment as data (balance/README.md):
// scenarios (who plays whom, on what legs) × variants (knob overrides, by
// hand or as a sweep) × seeds. Pure: parse, check and expand; the runner
// (scripts/balance.ts) plays the cells and report.ts writes them up.
import type { RosterStats, WeatherKind } from '../../sim/events';
import { DIFFICULTIES, type Difficulty } from '../../config';
import { isCoachCall, type CoachCall } from '../league/calls';
import { isRotation, type Rotation } from '../league/bench';
import { isLegs, type Legs } from '../league/fatigue';
import { isAttackPreset, isDefencePreset, type TeamTactics } from '../league/presets';
import { checkTuning, type Overrides } from '../league/tuning';

export interface SideSpec {
  /** A league club's generated roster (lab sheets); otherwise a flat squad of `rating`. */
  club?: string;
  /** Every stat of every player (default 60) when no club is given. */
  rating?: number;
  /** Per-stat overrides on the flat squad (e.g. stamina 30). */
  stats?: Partial<RosterStats>;
  tactics?: Partial<TeamTactics>;
  /** Special skills: none (default for a flat squad), as rolled (default for a club), all superstars. */
  traits?: 'none' | 'gen' | 'stars';
  /** Interchange players, 0–4 (default 4; a flat squad's bench has the squad's stats). */
  bench?: number;
  /** How hard the coach rotates them: off / standard (default) / heavy. */
  rotation?: Rotation;
  /**
   * A squad-built side (N12.2), a new squad every seed, played through the game's
   * own sheet builder and the coach's pick by slot as matchday.ts builds it:
   * `player` a new game's squad (one star, a first-grader and a depth man a
   * position) and its opening lineup; `rival` a rival club's generated squad of
   * strength `rating`, or level with the other side's best nine when `rating` is
   * left out. `traits`, `tactics`, `bench` and `rotation` override what it gets.
   */
  squad?: 'player' | 'rival';
  /** A `player` squad's difficulty (its start rating); normal unless given. */
  difficulty?: Difficulty;
  /** A `player` squad with its star swapped for a first-grader at his position (what the squad's shape is worth). */
  noStar?: boolean;
  /** This side is the rival of a player on this difficulty: it plays with the difficulty's edge after the spread (`difficulty.<d>.rivalEdge`), as matchday.ts gives it (N12.2). */
  rivalOf?: Difficulty;
}

export interface ScenarioSpec {
  name: string;
  home: SideSpec;
  away: SideSpec;
  /** Starting legs: a lab preset or a number 0..1 (default fresh). */
  legs?: Legs | number;
  /** Play a single stretch of this many minutes instead of a whole match (e.g. just the closing stretch on tired legs). */
  minutes?: number;
  /** Rain or wind (2f); clear unless given. */
  weather?: WeatherKind;
  /** Sides with an AI coach (N9.6). Absent: both when `calls.ai.on`, else none. */
  aiCoach?: ('home' | 'away')[];
  /** A final (N9.4): golden point if level at full time. */
  finals?: boolean;
  /** Coach calls (#73) each side makes whenever it can, or only on a given tackle ("shift left on tackle 2"). */
  calls?: Partial<Record<'home' | 'away', CallRule[]>>;
  /** Plan changes at the breaks (N11): each made once, at the first break it names. */
  plans?: PlanRule[];
}

export interface PlanRule {
  side: 'home' | 'away';
  /** The half-time break, or the first try scored (by either side, or by the other side: "after we concede"). */
  at: 'half-time' | 'try' | 'conceded';
  /** The new presets; what is left out stays as it is. */
  tactics: Partial<TeamTactics>;
}

export interface CallRule {
  call: CoachCall;
  /** Only with this many tackles made in the set; any time it is allowed when absent. */
  tackle?: number;
}

export interface VariantSpec {
  name: string;
  tuning?: Overrides;
}

export interface Plan {
  name: string;
  description?: string;
  /** Matches per cell (seeds seedStart … seedStart + seeds − 1). */
  seeds: number;
  /** Leave out for whole matches (two 9:00 halves, half-time, full time). A number plays one stretch of that many minutes instead, counts scaled to 18. */
  minutes?: number;
  seedStart?: number;
  /** Overrides under every variant (the experiment's fixed ground). */
  base?: Overrides;
  scenarios: ScenarioSpec[];
  /** Hand-written variants; a "baseline" with no overrides is added first unless one is listed. */
  variants?: VariantSpec[];
  /** Every combination of these values becomes a variant (crossed with `variants`). */
  sweep?: Record<string, number[]>;
}

/** One unit of work: a variant on a scenario. */
export interface Cell {
  variant: VariantSpec;
  scenario: ScenarioSpec;
}

export const cellKey = (c: { variant: { name: string }; scenario: { name: string } }): string => `${c.variant.name} | ${c.scenario.name}`;

/** Problems with a plan, one line each (empty when it is fine). */
export function checkPlan(p: Plan): string[] {
  const errs: string[] = [];
  if (!p.name) errs.push('plan needs a name');
  if (!Number.isInteger(p.seeds) || p.seeds < 1) errs.push('seeds must be a whole number ≥ 1');
  if (p.minutes !== undefined && !(p.minutes > 0)) errs.push('minutes must be > 0 (or left out for whole matches)');
  if (!Array.isArray(p.scenarios) || p.scenarios.length === 0) errs.push('at least one scenario');
  const names = new Set<string>();
  for (const s of p.scenarios ?? []) {
    if (!s.name) errs.push('every scenario needs a name');
    if (names.has(s.name)) errs.push(`scenario "${s.name}" is listed twice`);
    names.add(s.name);
    if (s.minutes !== undefined && !(s.minutes > 0)) errs.push(`${s.name}: minutes must be > 0`);
    if (s.weather !== undefined && !['clear', 'rain', 'wind'].includes(s.weather)) errs.push(`${s.name}: weather must be clear / rain / wind`);
    if (s.aiCoach !== undefined && (!Array.isArray(s.aiCoach) || s.aiCoach.some((x) => x !== 'home' && x !== 'away'))) errs.push(`${s.name}: aiCoach must list home / away`);
    for (const side of ['home', 'away'] as const) {
      for (const r of s.calls?.[side] ?? []) if (!isCoachCall(r.call)) errs.push(`${s.name}: unknown call "${String(r.call)}" for ${side}`);
    }
    for (const r of s.plans ?? []) {
      if (r.side !== 'home' && r.side !== 'away') errs.push(`${s.name}: a plan change needs side home / away`);
      if (!['half-time', 'try', 'conceded'].includes(r.at)) errs.push(`${s.name}: a plan change is at half-time / try / conceded`);
      if (r.tactics?.attack && !isAttackPreset(r.tactics.attack)) errs.push(`${s.name}: unknown attack preset "${r.tactics.attack}" in a plan change`);
      if (r.tactics?.defence && !isDefencePreset(r.tactics.defence)) errs.push(`${s.name}: unknown defence preset "${r.tactics.defence}" in a plan change`);
    }
    if (s.home?.rivalOf && s.away?.rivalOf) errs.push(`${s.name}: only one side is the rival (rivalOf)`);
    if (s.legs !== undefined && !(typeof s.legs === 'number' ? s.legs >= 0 && s.legs <= 1 : isLegs(s.legs))) errs.push(`${s.name}: legs must be fresh / late / spent or 0..1`);
    for (const [side, spec] of [['home', s.home], ['away', s.away]] as const) {
      if (!spec) {
        errs.push(`${s.name}: missing ${side}`);
        continue;
      }
      if (spec.tactics?.attack && !isAttackPreset(spec.tactics.attack)) errs.push(`${s.name} ${side}: unknown attack preset "${spec.tactics.attack}"`);
      if (spec.tactics?.defence && !isDefencePreset(spec.tactics.defence)) errs.push(`${s.name} ${side}: unknown defence preset "${spec.tactics.defence}"`);
      if (spec.traits && !['none', 'gen', 'stars'].includes(spec.traits)) errs.push(`${s.name} ${side}: traits must be none / gen / stars`);
      if (spec.bench !== undefined && !(Number.isInteger(spec.bench) && spec.bench >= 0 && spec.bench <= 4)) errs.push(`${s.name} ${side}: bench must be 0–4`);
      if (spec.rotation !== undefined && !isRotation(spec.rotation)) errs.push(`${s.name} ${side}: rotation must be off / standard / heavy`);
      if (spec.squad !== undefined && spec.squad !== 'player' && spec.squad !== 'rival') errs.push(`${s.name} ${side}: squad must be player / rival`);
      if (spec.squad !== undefined && spec.club !== undefined) errs.push(`${s.name} ${side}: a side is a club or a squad, not both`);
      if (spec.difficulty !== undefined && !DIFFICULTIES.includes(spec.difficulty)) errs.push(`${s.name} ${side}: difficulty must be easy / normal / hard`);
      if (spec.rivalOf !== undefined && !DIFFICULTIES.includes(spec.rivalOf)) errs.push(`${s.name} ${side}: rivalOf must be easy / normal / hard`);
    }
  }
  if (p.base) errs.push(...checkTuning(p.base).map((e) => `base: ${e}`));
  for (const v of p.variants ?? []) {
    if (!v.name) errs.push('every variant needs a name');
    if (v.tuning) errs.push(...checkTuning(v.tuning).map((e) => `${v.name}: ${e}`));
  }
  for (const [k, vals] of Object.entries(p.sweep ?? {})) {
    if (!Array.isArray(vals) || vals.length === 0) errs.push(`sweep ${k}: needs a list of values`);
    else errs.push(...checkTuning(Object.fromEntries([[k, vals[0]!]])).map((e) => `sweep ${e}`));
  }
  const vnames = expandVariants(p).map((v) => v.name);
  if (new Set(vnames).size !== vnames.length) errs.push('two variants share a name');
  return errs;
}

const fmt = (v: number): string => String(+v.toPrecision(6));

/** The plan's variants in run order: baseline first, then the hand-written ones crossed with the sweep. */
export function expandVariants(p: Plan): VariantSpec[] {
  const hand = p.variants?.length ? p.variants : [];
  const axes = Object.entries(p.sweep ?? {});
  let combos: Overrides[] = [{}];
  for (const [k, vals] of axes) combos = combos.flatMap((c) => vals.map((v) => ({ ...c, [k]: v })));
  const label = (o: Overrides): string => Object.entries(o).map(([k, v]) => `${k}=${fmt(v)}`).join(', ');
  const out: VariantSpec[] = [];
  const add = (name: string, tuning: Overrides): void => {
    out.push({ name, tuning: { ...(p.base ?? {}), ...tuning } });
  };
  if (!hand.some((v) => !v.tuning || Object.keys(v.tuning).length === 0)) add('baseline', {});
  const sources = hand.length ? hand : [{ name: '', tuning: {} }];
  for (const h of sources) {
    for (const c of combos) {
      const name = [h.name, label(c)].filter(Boolean).join(' · ') || 'baseline';
      if (name === 'baseline' && out.some((v) => v.name === 'baseline')) continue;
      add(name, { ...(h.tuning ?? {}), ...c });
    }
  }
  return out;
}

/** Every cell, variant-major (all scenarios of a variant run together). */
export function cellsOf(p: Plan): Cell[] {
  return expandVariants(p).flatMap((variant) => p.scenarios.map((scenario) => ({ variant, scenario })));
}
