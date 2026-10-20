// src/match/lab/controller.ts — the lab's state, DOM-free (BAK-207 §4): which
// teams and seed, the Runner, scrubbing, Flag codes and the `#lab` URL hash
// that reproduces all of it. Tested in node; panel.ts is the thin DOM on top.
import { Runner, type MatchSim, type RunSpeed } from '../core/engine';
import { decodeFlag, encodeFlag } from '../core/flag';
import { isTraitMode, type TraitMode } from './sheets';
import { isAttackPreset, isDefencePreset, type TeamTactics } from '../league/presets';
import { isLegs, type Legs } from '../league/fatigue';
import { DEFAULT_ROTATION, isRotation, type Rotation } from '../league/bench';
import type { WeatherKind } from '../../sim/events';
import type { CallInput, CoachCall } from '../league/calls';

/** Per-side preset overrides for the lab; a missing field keeps the club's own style. */
export interface LabTactics {
  home: Partial<TeamTactics>;
  away: Partial<TeamTactics>;
}
const NO_TACTICS: LabTactics = { home: {}, away: {} };

export interface LabParams {
  seed: number;
  home: string;
  away: string;
  /** Tick to seek to on load (from a Flag code). */
  tick: number;
  /** Note carried by a loaded Flag code. */
  note: string;
  /** Trait sandbox (BAK-208 §3): as rolled, none, or everyone a superstar. */
  traits: TraitMode;
  /** Tactics picker (BAK-208 §5): preset overrides per side. */
  tactics: LabTactics;
  /** Legs (BAK-208 §8): start fresh, as in the last ten minutes, or cooked. */
  legs: Legs;
  /** Bench (BAK-207 2b): how hard both coaches rotate; standard when absent. */
  bench?: Rotation;
  /** Weather (BAK-207 2f): clear when absent. */
  weather?: WeatherKind;
  /** Coach-call chips for both sides (#73, `calls=1`). */
  calls?: boolean;
  /** Played as a final (N9.4, `final=1`): golden point if level at full time. */
  final?: boolean;
}

export type LabSimFactory = (home: string, away: string, seed: number, traits: TraitMode, tactics: LabTactics, legs: Legs, bench: Rotation, weather: WeatherKind, calls: CallInput[]) => MatchSim;

const WEATHERS: readonly WeatherKind[] = ['clear', 'rain', 'wind'];
export function isWeather(v: unknown): v is WeatherKind {
  return WEATHERS.includes(v as WeatherKind);
}

export const LAB_HASH = '#lab';
export const DEFAULT_SEED = 1;

/** `#lab`, `#lab?seed=7&home=x&away=y&tick=120` or `#lab?flag=nrl1:...` → params. */
export function parseLabHash(hash: string, defaults: { home: string; away: string }): LabParams {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const sp = new URLSearchParams(q);
  const flag = sp.get('flag') ? decodeFlag(sp.get('flag')!) : null;
  const traits: TraitMode = isTraitMode(sp.get('traits')) ? (sp.get('traits') as TraitMode) : 'gen';
  const tactics = parseTactics(sp);
  const legs: Legs = isLegs(sp.get('legs')) ? (sp.get('legs') as Legs) : 'fresh';
  const bench: Rotation = isRotation(sp.get('bench')) ? (sp.get('bench') as Rotation) : DEFAULT_ROTATION;
  const wx = sp.get('wx');
  const weather: WeatherKind = isWeather(wx) ? wx : 'clear';
  const calls = sp.get('calls') === '1';
  const final = sp.get('final') === '1';
  if (flag) return { seed: flag.seed, tick: flag.tick, home: flag.home, away: flag.away, note: flag.note, traits, tactics, legs, bench, weather, ...(calls ? { calls } : {}), ...(final ? { final } : {}) };
  const seed = Number(sp.get('seed'));
  const tick = Number(sp.get('tick'));
  return {
    seed: Number.isInteger(seed) && seed > 0 ? seed : DEFAULT_SEED,
    home: sp.get('home') || defaults.home,
    away: sp.get('away') || defaults.away,
    tick: Number.isInteger(tick) && tick > 0 ? tick : 0,
    note: '',
    traits,
    tactics,
    legs,
    bench,
    weather,
    ...(calls ? { calls } : {}),
    ...(final ? { final } : {}),
  };
}

/** `hatk=grind&hdef=rush&aatk=…&adef=…` → per-side overrides (unknown values ignored). */
function parseTactics(sp: URLSearchParams): LabTactics {
  const side = (a: string, d: string): Partial<TeamTactics> => {
    const out: Partial<TeamTactics> = {};
    const atk = sp.get(a);
    const def = sp.get(d);
    if (isAttackPreset(atk)) out.attack = atk;
    if (isDefencePreset(def)) out.defence = def;
    return out;
  };
  return { home: side('hatk', 'hdef'), away: side('aatk', 'adef') };
}

export function labHash(p: Pick<LabParams, 'seed' | 'home' | 'away'> & { tick?: number; traits?: TraitMode; tactics?: LabTactics; legs?: Legs; bench?: Rotation | undefined; weather?: WeatherKind | undefined; calls?: boolean | undefined; final?: boolean | undefined }): string {
  const sp = new URLSearchParams({ seed: String(p.seed), home: p.home, away: p.away });
  if (p.tick) sp.set('tick', String(p.tick));
  if (p.traits && p.traits !== 'gen') sp.set('traits', p.traits);
  const t = p.tactics ?? NO_TACTICS;
  if (t.home.attack) sp.set('hatk', t.home.attack);
  if (t.home.defence) sp.set('hdef', t.home.defence);
  if (t.away.attack) sp.set('aatk', t.away.attack);
  if (t.away.defence) sp.set('adef', t.away.defence);
  if (p.legs && p.legs !== 'fresh') sp.set('legs', p.legs);
  if (p.bench && p.bench !== DEFAULT_ROTATION) sp.set('bench', p.bench);
  if (p.weather && p.weather !== 'clear') sp.set('wx', p.weather);
  if (p.calls) sp.set('calls', '1');
  if (p.final) sp.set('final', '1');
  return `${LAB_HASH}?${sp.toString()}`;
}

export function isLabHash(hash: string): boolean {
  return hash === LAB_HASH || hash.startsWith(`${LAB_HASH}?`);
}

export class LabController {
  readonly runner: Runner;
  readonly params: LabParams;
  /** Coach calls made in the lab, by tick: replayed when the match is rebuilt to seek (#73). */
  readonly calls: CallInput[] = [];

  constructor(factory: LabSimFactory, params: LabParams) {
    this.params = { ...params };
    this.runner = new Runner((seed) => factory(params.home, params.away, seed, params.traits, params.tactics, params.legs, params.bench ?? DEFAULT_ROTATION, params.weather ?? 'clear', this.calls), params.seed);
    if (params.tick > 0) this.runner.seek(params.tick);
  }

  get seed(): number {
    return this.runner.seed;
  }

  /** Why `side` can't make `call` now, or null (#73). */
  callRefusal(side: 'home' | 'away', call: CoachCall): string | null {
    const sim = this.runner.current as unknown as { callRefusal?: (s: 'home' | 'away', c: CoachCall) => string | null };
    return sim.callRefusal ? sim.callRefusal(side, call) : 'no calls in this sim';
  }

  /** The coach makes a call: it takes effect on the next tick, and replays if the match is rebuilt. */
  call(side: 'home' | 'away', call: CoachCall): string | null {
    const why = this.callRefusal(side, call);
    if (why) return why;
    // Calls after this tick belong to a future the lab has stepped back from: drop them.
    while (this.calls.length && this.calls[this.calls.length - 1]!.tick > this.runner.tick) this.calls.pop();
    this.calls.push({ tick: this.runner.tick + 1, side, call });
    return null;
  }
  get tick(): number {
    return this.runner.tick;
  }

  play(): void {
    this.runner.play();
  }
  pause(): void {
    this.runner.pause();
  }
  toggle(): void {
    this.runner.toggle();
  }
  step(): void {
    this.runner.step();
  }
  setSpeed(s: RunSpeed): void {
    this.runner.setSpeed(s);
  }
  /** Jump ahead to the next half-time or full time. */
  skipToWhistle(): void {
    this.runner.skipUntil((s) => s.events.some((e) => e.kind === 'half-time' || e.kind === 'full-time'));
  }
  seek(tick: number): void {
    this.runner.seek(tick);
  }
  reseed(seed: number): void {
    this.params.seed = seed;
    this.runner.reseed(seed);
  }
  update(realMs: number): void {
    this.runner.update(realMs);
  }

  /** A Flag code for the moment on screen now. */
  flag(note: string): string {
    return encodeFlag({ seed: this.runner.seed, tick: this.runner.tick, home: this.params.home, away: this.params.away, note });
  }

  /** The URL hash that reopens the lab on these teams and seed (and this tick). */
  hash(withTick = false): string {
    return labHash({ seed: this.runner.seed, home: this.params.home, away: this.params.away, traits: this.params.traits, tactics: this.params.tactics, legs: this.params.legs, bench: this.params.bench, weather: this.params.weather, calls: this.params.calls, final: this.params.final, ...(withTick ? { tick: this.runner.tick } : {}) });
  }
}
