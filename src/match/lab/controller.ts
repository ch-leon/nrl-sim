// src/match/lab/controller.ts — the lab's state, DOM-free (BAK-207 §4): which
// teams and seed, the Runner, scrubbing, Flag codes and the `#lab` URL hash
// that reproduces all of it. Tested in node; panel.ts is the thin DOM on top.
import { Runner, type MatchSim, type RunSpeed } from '../core/engine';
import { decodeFlag, encodeFlag } from '../core/flag';

export interface LabParams {
  seed: number;
  home: string;
  away: string;
  /** Tick to seek to on load (from a Flag code). */
  tick: number;
  /** Note carried by a loaded Flag code. */
  note: string;
}

export type LabSimFactory = (home: string, away: string, seed: number) => MatchSim;

export const LAB_HASH = '#lab';
export const DEFAULT_SEED = 1;

/** `#lab`, `#lab?seed=7&home=x&away=y&tick=120` or `#lab?flag=nrl1:...` → params. */
export function parseLabHash(hash: string, defaults: { home: string; away: string }): LabParams {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const sp = new URLSearchParams(q);
  const flag = sp.get('flag') ? decodeFlag(sp.get('flag')!) : null;
  if (flag) return { seed: flag.seed, tick: flag.tick, home: flag.home, away: flag.away, note: flag.note };
  const seed = Number(sp.get('seed'));
  const tick = Number(sp.get('tick'));
  return {
    seed: Number.isInteger(seed) && seed > 0 ? seed : DEFAULT_SEED,
    home: sp.get('home') || defaults.home,
    away: sp.get('away') || defaults.away,
    tick: Number.isInteger(tick) && tick > 0 ? tick : 0,
    note: '',
  };
}

export function labHash(p: Pick<LabParams, 'seed' | 'home' | 'away'> & { tick?: number }): string {
  const sp = new URLSearchParams({ seed: String(p.seed), home: p.home, away: p.away });
  if (p.tick) sp.set('tick', String(p.tick));
  return `${LAB_HASH}?${sp.toString()}`;
}

export function isLabHash(hash: string): boolean {
  return hash === LAB_HASH || hash.startsWith(`${LAB_HASH}?`);
}

export class LabController {
  readonly runner: Runner;
  readonly params: LabParams;

  constructor(factory: LabSimFactory, params: LabParams) {
    this.params = { ...params };
    this.runner = new Runner((seed) => factory(params.home, params.away, seed), params.seed);
    if (params.tick > 0) this.runner.seek(params.tick);
  }

  get seed(): number {
    return this.runner.seed;
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
    return labHash({ seed: this.runner.seed, home: this.params.home, away: this.params.away, ...(withTick ? { tick: this.runner.tick } : {}) });
  }
}
