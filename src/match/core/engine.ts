// src/match/core/engine.ts — the fixed-step clock (BAK-207 §3.1).
//
// A MatchSim advances one TICK at a time and can be asked for a Snapshot. The
// Runner feeds it real time: it banks elapsed ms (scaled by the playback speed)
// and steps whole ticks, keeping the previous and current snapshots so the view
// can interpolate at `alpha`. Because every sim is deterministic per seed, any
// tick can be reproduced by building a fresh sim and stepping to it — that is
// how scrubbing and Flag codes work.
import type { Snapshot, SimEvent } from './snapshot';

/** Sim tick length. 20 Hz: decisions and physics run this often. */
export const TICK_MS = 50;
export const TICK_S = TICK_MS / 1000;

export interface MatchSim {
  readonly tick: number;
  readonly finished: boolean;
  /** Advance exactly one tick. */
  step(): void;
  /** Plain-data picture of the current tick. */
  snapshot(): Snapshot;
}

export type SimFactory = (seed: number) => MatchSim;

/** Playback speeds the lab and match offer. */
/** ×8 is the live match screen's fastest (BAK-207 2g); the lab offers up to ×4. */
export type RunSpeed = 0.25 | 0.5 | 1 | 2 | 4 | 8;
export const RUN_SPEEDS: readonly RunSpeed[] = [0.25, 0.5, 1, 2, 4];

/** Longest a single update may fast-forward (a background tab coming back). */
const MAX_TICKS_PER_UPDATE = 200;
/** Recent events kept for the lab log. */
const RECENT_EVENTS = 60;

export class Runner {
  private readonly factory: SimFactory;
  private sim: MatchSim;
  private _seed: number;
  private _prev: Snapshot;
  private _cur: Snapshot;
  private acc = 0;
  private _speed: RunSpeed = 1;
  private _playing = false;
  private _maxTick = 0;
  /** Slow-motion beat: real ms left and the time factor while it lasts. */
  private slowMs = 0;
  private slowFactor = 1;
  /** Last few events, for a live log. */
  readonly recent: SimEvent[] = [];
  /** Every event since tick 0 on this seed (rebuilt by seek), for feeds and stats. */
  readonly history: SimEvent[] = [];
  /** Called with each tick's events as they happen (pop-ups, FX). */
  onEvents: ((events: SimEvent[]) => void) | null = null;

  constructor(factory: SimFactory, seed: number) {
    this.factory = factory;
    this._seed = seed;
    this.sim = factory(seed);
    this._prev = this._cur = this.sim.snapshot();
  }

  get seed(): number {
    return this._seed;
  }
  /** The sim being run (the lab asks it which coach calls it would take now). */
  get current(): MatchSim {
    return this.sim;
  }
  get tick(): number {
    return this.sim.tick;
  }
  /** Highest tick reached on this seed (the scrub range). */
  get maxTick(): number {
    return this._maxTick;
  }
  get playing(): boolean {
    return this._playing;
  }
  get speed(): RunSpeed {
    return this._speed;
  }
  get finished(): boolean {
    return this.sim.finished;
  }
  get prev(): Snapshot {
    return this._prev;
  }
  get cur(): Snapshot {
    return this._cur;
  }
  /** Interpolation fraction between prev and cur, [0, 1). */
  get alpha(): number {
    return Math.min(0.999, this.acc / TICK_MS);
  }

  play(): void {
    this._playing = true;
  }
  pause(): void {
    this._playing = false;
  }
  toggle(): void {
    this._playing = !this._playing;
  }
  setSpeed(s: RunSpeed): void {
    this._speed = s;
  }

  /** Run at `factor` speed for the next `ms` of real time (a beat of slow-motion). */
  slowMo(ms: number, factor: number): void {
    this.slowMs = Math.max(this.slowMs, ms);
    this.slowFactor = Math.max(0.05, Math.min(1, factor));
  }

  /** Feed real elapsed time; steps every tick that has fallen due. */
  update(realMs: number): void {
    if (!this._playing || this.sim.finished) return;
    const ms = Math.max(0, realMs);
    if (this.slowMs > 0) {
      // Spend the slow beat first at its factor, the remainder at full rate.
      const slow = Math.min(ms, this.slowMs);
      this.slowMs -= slow;
      this.acc += (slow * this.slowFactor + (ms - slow)) * this._speed;
    } else this.acc += ms * this._speed;
    let n = 0;
    while (this.acc >= TICK_MS && n < MAX_TICKS_PER_UPDATE) {
      this.stepOnce();
      this.acc -= TICK_MS;
      n++;
    }
    if (n >= MAX_TICKS_PER_UPDATE) this.acc = 0;
    if (this.sim.finished) this._playing = false;
  }

  /** Pause and advance exactly one tick (the lab's Step button). */
  step(): void {
    this._playing = false;
    this.acc = 0;
    if (!this.sim.finished) this.stepOnce();
  }

  /** Jump to `tick` by re-simulating from the seed; pauses. */
  seek(tick: number): void {
    const target = Math.max(0, Math.floor(tick));
    this._playing = false;
    this.acc = 0;
    const cb = this.onEvents;
    this.onEvents = null; // re-simulating: don't replay pop-ups and FX
    this.sim = this.factory(this._seed);
    this.recent.length = 0;
    this.history.length = 0;
    this.slowMs = 0;
    this._prev = this._cur = this.sim.snapshot();
    for (let i = 0; i < target && !this.sim.finished; i++) this.stepOnce();
    this.onEvents = cb;
  }

  /** Run ahead, paused and without pop-ups, until a tick's snapshot satisfies `until` or the match ends (at least one tick). */
  skipUntil(until: (s: Snapshot) => boolean, maxTicks = 100_000): void {
    this._playing = false;
    this.acc = 0;
    const cb = this.onEvents;
    this.onEvents = null;
    for (let i = 0; i < maxTicks && !this.sim.finished; i++) {
      this.stepOnce();
      if (until(this._cur)) break;
    }
    this.onEvents = cb;
  }

  /** Start over on a new seed (tick 0, paused). */
  reseed(seed: number): void {
    this._seed = seed;
    this._maxTick = 0;
    this.seek(0);
  }

  private stepOnce(): void {
    this._prev = this._cur;
    this.sim.step();
    this._cur = this.sim.snapshot();
    this._maxTick = Math.max(this._maxTick, this.sim.tick);
    if (this._cur.events.length) {
      this.recent.push(...this._cur.events);
      if (this.recent.length > RECENT_EVENTS) this.recent.splice(0, this.recent.length - RECENT_EVENTS);
      this.history.push(...this._cur.events);
      this.onEvents?.(this._cur.events);
    }
  }
}

/** The snapshot a fresh sim on `seed` shows at `tick` (what a Flag code points at). */
export function replayTo(factory: SimFactory, seed: number, tick: number): Snapshot {
  const sim = factory(seed);
  for (let i = 0; i < tick && !sim.finished; i++) sim.step();
  return sim.snapshot();
}
