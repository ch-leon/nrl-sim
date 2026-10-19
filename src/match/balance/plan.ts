// src/match/balance/plan.ts — a balance experiment as data (balance/README.md):
// scenarios (who plays whom, on what legs) × variants (knob overrides, by
// hand or as a sweep) × seeds. Pure: parse, check and expand; the runner
// (scripts/balance.ts) plays the cells and report.ts writes them up.
import type { RosterStats } from '../../sim/events';
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
}

export interface ScenarioSpec {
  name: string;
  home: SideSpec;
  away: SideSpec;
  /** Starting legs: a lab preset or a number 0..1 (default fresh). */
  legs?: Legs | number;
  /** Play a single stretch of this many minutes instead of a whole match (e.g. just the closing stretch on tired legs). */
  minutes?: number;
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
    if (s.legs !== undefined && !(typeof s.legs === 'number' ? s.legs >= 0 && s.legs <= 1 : isLegs(s.legs))) errs.push(`${s.name}: legs must be fresh / late / spent or 0..1`);
    for (const [side, spec] of [['home', s.home], ['away', s.away]] as const) {
      if (!spec) {
        errs.push(`${s.name}: missing ${side}`);
        continue;
      }
      if (spec.tactics?.attack && !isAttackPreset(spec.tactics.attack)) errs.push(`${s.name} ${side}: unknown attack preset "${spec.tactics.attack}"`);
      if (spec.tactics?.defence && !isDefencePreset(spec.tactics.defence)) errs.push(`${s.name} ${side}: unknown defence preset "${spec.tactics.defence}"`);
      if (spec.traits && !['none', 'gen', 'stars'].includes(spec.traits)) errs.push(`${s.name} ${side}: traits must be none / gen / stars`);
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
