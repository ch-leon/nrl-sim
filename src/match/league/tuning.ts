// src/match/league/tuning.ts — every live-sim knob by name, for balance
// experiments (docs/specs/BAK-208-tuning.md, balance/README.md). The knobs
// stay where they live (LIVE in live.ts, FATIGUE, WRESTLE, the contest BASE,
// TRAIT_PTS, the preset tables); this module names them by dotted path
// ("wrestle.gripBase", "presets.defence.rush.lineSpeed") and applies a set of
// overrides with a way back. Overrides are module state: apply, run, restore
// — one experiment at a time, never in the game.
import { BASE, MOMENTUM } from './contest';
import { PACE } from '../core/body';
import { TOUCH } from './touch';
import { PENALTY } from './penalties';
import { FATIGUE } from './fatigue';
import { GAS } from './gas';
import { LIVE } from './live';
import { ATTACK_PLAN_KEYS, PRESET_TABLES } from './presets';
import { NINES } from './rules';
import { BENCH } from './bench';
import { GOALS } from './goals';
import { EDGE_COST, TRAIT_PTS } from './traits';
import { WEATHER } from './weather';
import { RATING } from './spread';
import { BREAKS } from './breaks';
import { CALLS } from './calls';
import { WRESTLE } from './wrestle';
import { BIN } from './sinbin';
import { DIFFICULTIES, DIFFICULTY } from '../../config';

/**
 * The difficulty's edge (N12.2) by name, `difficulty.hard.rivalEdge`: it lives
 * in config.ts's DIFFICULTY beside the club-side numbers (money, wages), which
 * are not match knobs, so only this field is named, read and written through.
 */
const DIFFICULTY_EDGE = Object.fromEntries(
  DIFFICULTIES.map((d) => [
    d,
    {
      get rivalEdge(): number {
        return DIFFICULTY[d].rivalEdge;
      },
      set rivalEdge(v: number) {
        DIFFICULTY[d].rivalEdge = v;
      },
    },
  ]),
);

/** The knob groups, by the first segment of a path. */
export const KNOBS = {
  pace: PACE,
  live: LIVE,
  contest: BASE,
  momentum: MOMENTUM,
  fatigue: FATIGUE,
  gas: GAS,
  wrestle: WRESTLE,
  traits: TRAIT_PTS,
  edge: EDGE_COST,
  presets: PRESET_TABLES,
  rules: NINES,
  bench: BENCH,
  touch: TOUCH,
  penalty: PENALTY,
  weather: WEATHER,
  rating: RATING,
  calls: CALLS,
  breaks: BREAKS,
  goals: GOALS,
  bin: BIN,
  difficulty: DIFFICULTY_EDGE,
} as const;

export type Overrides = Readonly<Record<string, number>>;

const KICKS = ['long', 'bomb', 'grubber', 'chip', 'cross-field'];
const ZONES = ['own20', 'ownHalf', 'midfield', 'attackingHalf', 'redZone'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;

/**
 * May this path create a key that isn't there yet? Only an attack preset's
 * plan fields (its base or a zone) and kick biases, which the tables list
 * sparsely; every other path must name an existing number, so a typo fails.
 */
function creatable(parts: readonly string[]): boolean {
  if (parts[0] !== 'presets' || parts[1] !== 'attack' || parts.length < 5) return false;
  let i = 3;
  if (parts[i] === 'zones') {
    if (!ZONES.includes(parts[i + 1] ?? '')) return false;
    i += 2;
  } else if (parts[i] === 'base') i += 1;
  else return false;
  const rest = parts.slice(i);
  if (rest.length === 1) return ATTACK_PLAN_KEYS.includes(rest[0]!);
  return rest.length === 2 && rest[0] === 'kickBias' && KICKS.includes(rest[1]!);
}

/** Whether a path names a knob: an existing number, or a sparse preset field it may create. */
function resolves(path: string): boolean {
  const parts = path.split('.');
  let obj: unknown = KNOBS;
  for (let i = 0; i < parts.length; i++) {
    if (!isObj(obj)) return false;
    const k = parts[i]!;
    if (!(k in obj)) return creatable(parts);
    obj = obj[k];
  }
  return typeof obj === 'number';
}

/** Problems with a set of overrides, one line each (empty when it is fine). */
export function checkTuning(over: Overrides): string[] {
  const errors: string[] = [];
  for (const [path, value] of Object.entries(over)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${path}: value must be a number`);
    else if (!resolves(path)) errors.push(`${path}: no such knob (see \`npm run balance -- --list\`)`);
  }
  return errors;
}

interface Change {
  obj: Obj;
  key: string;
  had: boolean;
  old: unknown;
}

/**
 * Apply overrides; returns a function that puts every knob back exactly as it
 * was. Throws on an unknown path or a non-number value, before changing anything.
 */
export function applyTuning(over: Overrides): () => void {
  const errors = checkTuning(over);
  if (errors.length) throw new Error(`Bad tuning:\n  ${errors.join('\n  ')}`);
  const changes: Change[] = [];
  for (const [path, value] of Object.entries(over)) {
    const parts = path.split('.');
    let obj = KNOBS as unknown as Obj;
    for (const k of parts.slice(0, -1)) {
      if (!isObj(obj[k])) {
        changes.push({ obj, key: k, had: false, old: undefined });
        obj[k] = {};
      }
      obj = obj[k] as Obj;
    }
    const leaf = parts[parts.length - 1]!;
    changes.push({ obj, key: leaf, had: leaf in obj, old: obj[leaf] });
    obj[leaf] = value;
  }
  return (): void => {
    for (const c of changes.reverse()) {
      if (c.had) c.obj[c.key] = c.old;
      else delete c.obj[c.key];
    }
  };
}

/** Every numeric knob and its current value, by path (for `--list` and the docs). */
export function listKnobs(): { path: string; value: number }[] {
  const out: { path: string; value: number }[] = [];
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number') out.push({ path, value: v });
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(KNOBS, '');
  return out;
}
