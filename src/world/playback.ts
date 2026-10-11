// src/world/playback.ts — match event timeline → animated players (BAK-194, WU-12).
//
// PlaybackController consumes a MatchResult's timed event log and drives the
// MatchScene's 18 player sprites (Nines), the ball and the camera on a COMPRESSED
// real-time clock (80 sim-minutes → ~90 real seconds at ×1). It re-emits each
// MatchEvent on the bus as 'match:event' BEFORE moving any sprite, so the overlay
// (BAK-196), audio and particles stay in lockstep with the visual. It emits
// 'match:finished' exactly once at full-time (or when skip() completes).
//
// Movement uses the anchored formation model in ./formation: every event sets
// fresh targets from each player's slot + the ball, never from where sprites
// stand, so nothing compounds. Players run (facing their direction of travel)
// to their targets and settle into idle; event beats layer on top: the ball is
// passed to a runner and sits in his hands, tacklers dive and carriers go down,
// try scorers dive over and the team celebrates, kickers wind up and the ball
// arcs to the posts.
//
// PRESENTATION ONLY: this controller MUST NOT mutate GameState, call setState, or
// touch fixtures/ladder. The result/ladder are applied by the WU-7 fixtures tick
// pipeline BEFORE MatchScene starts. Re-running playback must not double-count.
//
// The class depends only on the structural PlaybackScene interface below (no
// Phaser import), so tests drive it with a fake scene.
import type { MatchEvent, MatchResult } from '../sim/events';
import type { Fixture } from '../core/state';
import type { PlayerAnim } from '../art/match/players';
import { bus } from '../core/events';
import {
  FULLBACK_SLOT,
  HOOKER_SLOT,
  KICKER_SLOT,
  PLAYERS,
  attackDir,
  formationTargets,
  nearestIndex,
  otherSide,
  pickRunner,
  type FieldPt,
  type Phase,
  type Side,
} from './formation';

// ── Clock constants (spec) ────────────────────────────────────────────────────
export const SIM_MINUTES = 80;
export const REAL_SECONDS_AT_1X = 90;

export type PlaybackSpeed = 1 | 2 | 4;

/**
 * Real-ms offset from kickoff for an event at sim-minute `t`, at the given speed.
 * Pure. The full clock is ~90s at ×1 (t=80 → 90000ms), halving at ×2, etc.
 */
export function eventTimeMs(t: number, speed: PlaybackSpeed): number {
  return ((t / SIM_MINUTES) * REAL_SECONDS_AT_1X * 1000) / speed;
}

/** Events sorted by `t` (stable — preserves same-minute engine order). */
export function orderedEvents(events: readonly MatchEvent[]): MatchEvent[] {
  // The engine already sorts by t (+ phase rank); we re-sort defensively with a
  // stable sort so a due-check by clockMs is always monotonic.
  return [...events].sort((a, b) => a.t - b.t);
}

/**
 * Base-clock due time (ms at ×1) for each ordered event. Events share whole
 * minutes, so the k events of one minute are spread evenly across it (j/k of a
 * minute apart) instead of all firing on the same frame — each beat gets room
 * to play. The first event of a minute is due exactly at eventTimeMs(t).
 */
export function dueTimes(events: readonly MatchEvent[]): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < events.length) {
    const t = events[i]!.t;
    let j = i;
    while (j < events.length && events[j]!.t === t) j++;
    const k = j - i;
    for (let n = 0; n < k; n++) out.push(eventTimeMs(t + n / k, 1));
    i = j;
  }
  return out;
}

// ── Structural view of MatchScene the controller depends on ───────────────────

/** One player sprite (+ its shadow), positioned by its feet. */
export interface PlaybackActor {
  place(x: number, y: number, depth: number): void;
  /** Play a player animation; no-op when it's already playing. */
  play(anim: PlayerAnim, faceLeft: boolean, timeScale: number): void;
}

/** The ball sprite: ground position + height above it (for passes/kicks). */
export interface PlaybackBall {
  place(x: number, y: number, lift: number, depth: number): void;
}

export interface PlaybackCamera {
  shake(duration: number, intensity: number): void;
}

export interface PlaybackScene {
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
  readonly players: { readonly home: readonly PlaybackActor[]; readonly away: readonly PlaybackActor[] };
  readonly ball: PlaybackBall;
  readonly cameras: { main: PlaybackCamera };
  /** Home team id — decides which side an event's teamId refers to. */
  readonly homeId: string;
}

// ── Tuning ────────────────────────────────────────────────────────────────────

/** Run speed in world px per visual ms at ×1. */
const RUN_PX_PER_MS = 0.2;
const MIN_MOVE_MS = 90;
const MAX_MOVE_MS = 2600;
/** Hand height of a carried ball (px above the ground). */
const CARRY_LIFT = 10;
/** Real pauses (ms at ×1, drained by the speed-scaled clock). */
const HALF_TIME_PAUSE_MS = 1500;
const TRY_PAUSE_MS = 1800;
const GOAL_PAUSE_MS = 1100;

const LYING: ReadonlySet<PlayerAnim> = new Set<PlayerAnim>(['dive', 'down', 'tackled']);

interface Beat {
  anim: PlayerAnim;
  ms: number;
  /** Runs when this beat starts (e.g. launch the ball at the kick). */
  fn?: () => void;
}

interface Actor {
  side: Side;
  slot: number;
  view: PlaybackActor;
  pos: FieldPt;
  from: FieldPt;
  to: FieldPt;
  t0: number;
  dur: number;
  moving: boolean;
  /** Beats queued to play on arrival (in order). */
  queue: Beat[];
  /** Visual time until which the current beat holds the actor in place. */
  lockUntil: number;
  /** Animation to loop once settled (idle unless e.g. celebrating). */
  rest: PlayerAnim;
  anim: PlayerAnim;
  faceLeft: boolean;
}

type BallState =
  | { mode: 'held'; holder: Actor }
  | { mode: 'ground'; at: FieldPt }
  | {
      mode: 'flight';
      from: FieldPt;
      fromLift: number;
      to: FieldPt;
      t0: number;
      dur: number;
      peak: number;
      then: Actor | null;
    };

interface Pending {
  at: number;
  fn: () => void;
}

export class PlaybackController {
  private readonly scene: PlaybackScene;
  private readonly result: MatchResult;
  private readonly events: MatchEvent[];
  private readonly due: number[];
  private readonly fixture: Fixture | undefined;

  private clockMs = 0;
  private cursor = 0;
  private speed: PlaybackSpeed = 1;
  private paused = false;
  private pauseRemainingMs = 0;
  private _finished = false;
  private finishEmitted = false;

  /** Visual clock (ms, speed-scaled) — keeps running through pauses. */
  private vis = 0;
  private readonly actors: Record<Side, Actor[]>;
  private ballState: BallState;
  private pending: Pending[] = [];
  private seed = 0;
  /** +1 when increasing fx moves right on screen (home faces right at rest). */
  private readonly screenDir: number;

  constructor(scene: PlaybackScene, result: MatchResult, fixture?: Fixture) {
    this.scene = scene;
    this.result = result;
    this.events = orderedEvents(result.events);
    this.due = dueTimes(this.events);
    this.fixture = fixture;
    this.screenDir = Math.sign(scene.fieldToWorld(60, 50).x - scene.fieldToWorld(40, 50).x) || 1;

    const start = formationTargets({ attacking: 'home', ball: { fx: 50, fy: 50 }, phase: 'kickoff', seed: 0 });
    const mk = (side: Side): Actor[] =>
      scene.players[side].slice(0, PLAYERS).map((view, slot) => {
        const p = start[side][slot] ?? { fx: 50, fy: 50 };
        return {
          side,
          slot,
          view,
          pos: { ...p },
          from: { ...p },
          to: { ...p },
          t0: 0,
          dur: 0,
          moving: false,
          queue: [],
          lockUntil: 0,
          rest: 'idle',
          anim: 'idle',
          faceLeft: this.restFaceLeft(side),
        };
      });
    this.actors = { home: mk('home'), away: mk('away') };
    this.ballState = { mode: 'ground', at: { fx: 50, fy: 50 } };
    this.renderAll();
  }

  get finished(): boolean {
    return this._finished;
  }

  /** Current playback speed multiplier. */
  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  /** Change accumulation rate only; already-fired events are unaffected. */
  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
  }

  /** Current target of every player (slot-indexed) — for tests/debug. */
  targets(): Record<Side, FieldPt[]> {
    return {
      home: this.actors.home.map((a) => ({ ...a.to })),
      away: this.actors.away.map((a) => ({ ...a.to })),
    };
  }

  /**
   * Advance the clock by `deltaMs` real time (scaled by speed), fire every event
   * now due (in order), then step the animation. Called from MatchScene.update.
   * Sprites keep animating after full-time; events never re-fire.
   */
  update(deltaMs: number): void {
    const scaled = deltaMs * this.speed;
    if (!this._finished) this.advanceClock(scaled);
    this.vis += scaled;
    this.step();
  }

  /**
   * Fire all remaining events instantly (sprites snap, no beats) then trigger
   * full-time. Still emits every 'match:event' in order so the overlay reaches
   * the exact full-time score/stats, then 'match:finished' exactly once.
   */
  skip(): void {
    if (this._finished) return;
    this.paused = false;
    this.pauseRemainingMs = 0;
    while (this.cursor < this.events.length) {
      const ev = this.events[this.cursor] as MatchEvent;
      this.cursor++;
      this.fire(ev, true);
    }
    // If the log somehow lacked a full-time event, still finish exactly once.
    this.emitFinished();
    this.renderAll();
  }

  // ── Clock ───────────────────────────────────────────────────────────────────
  private advanceClock(scaled: number): void {
    // Spend a scaled-time budget across pause windows and the sim clock. A pause
    // holds `clockMs` steady while draining budget as wall-clock only. Taking
    // the smallest of {budget, time-to-next-event} at a time keeps behaviour
    // frame-rate independent.
    let budget = scaled;
    let guard = 0;
    while (budget > 0 && !this._finished) {
      if (this.paused) {
        if (budget < this.pauseRemainingMs) {
          this.pauseRemainingMs -= budget;
          return;
        }
        budget -= this.pauseRemainingMs;
        this.pauseRemainingMs = 0;
        this.paused = false;
        continue;
      }
      const next = this.events[this.cursor];
      if (!next) {
        // Log exhausted: the engine always ends with 'full-time', but don't
        // depend on that sentinel — finish robustly either way.
        this.emitFinished();
        break;
      }
      const dueAt = this.due[this.cursor] ?? eventTimeMs(next.t, 1);
      if (dueAt <= this.clockMs) {
        this.cursor++;
        this.fire(next, false);
      } else {
        const step = Math.min(budget, dueAt - this.clockMs);
        this.clockMs += step;
        budget -= step;
      }
      if (++guard > 100_000) break; // pathological-spin guard
    }
  }

  private beginPause(baseMs: number): void {
    this.paused = true;
    this.pauseRemainingMs = baseMs;
  }

  private emitFinished(): void {
    this._finished = true;
    if (this.finishEmitted) return;
    this.finishEmitted = true;
    if (this.fixture) {
      bus.emit('match:finished', { fixture: this.fixture, result: this.result });
    }
  }

  // ── Per-event firing ────────────────────────────────────────────────────────
  private sideOf(teamId: string): Side {
    return teamId === this.scene.homeId ? 'home' : 'away';
  }

  private fire(ev: MatchEvent, instant: boolean): void {
    // 1. Emit on the bus FIRST so the overlay/score update in lockstep.
    bus.emit('match:event', ev);
    this.seed++;

    // 2. Formation + beat for the event kind.
    const side = this.sideOf(ev.teamId);
    const at: FieldPt | null = ev.x !== undefined && ev.y !== undefined ? { fx: ev.x, fy: ev.y } : null;
    switch (ev.kind) {
      case 'kickoff':
        this.onKickoff(side, instant);
        break;
      case 'set-start':
      case 'penalty':
        if (at) this.onPlay(side, at, 'open', HOOKER_SLOT);
        break;
      case 'run':
      case 'fend':
      case 'break-tackle':
      case 'break':
        if (at) {
          const phase =
            ev.kind === 'break' || ev.kind === 'break-tackle' ? 'break' : 'open';
          this.onPlay(side, at, phase, null);
        }
        break;
      case 'kick':
        if (at) this.onPlay(side, at, 'open', KICKER_SLOT);
        break;
      case 'tackle':
      case 'big-hit':
        // teamId is the DEFENDING side that made the hit.
        if (at) this.onTackle(otherSide(side), at, ev.kind === 'big-hit', instant);
        break;
      case 'error':
        if (at) this.onError(side, at);
        break;
      case 'try':
        this.onTry(side, at);
        if (!instant) this.beginPause(TRY_PAUSE_MS);
        break;
      case 'conversion':
      case 'penalty-goal':
        this.onGoalKick(side, at, ev.detail === 'missed');
        if (!instant) this.beginPause(GOAL_PAUSE_MS);
        break;
      case 'field-goal':
        this.onFieldGoal(side);
        if (!instant) this.beginPause(GOAL_PAUSE_MS);
        break;
      case 'half-time':
        this.onReset('away');
        if (!instant) this.beginPause(HALF_TIME_PAUSE_MS);
        break;
      case 'full-time':
        this.onFullTime();
        this.emitFinished();
        break;
      default:
        break;
    }
    if (instant) this.settle();
  }

  /** Apply fresh formation targets for both teams (the anchored model). */
  private applyFormation(attacking: Side, ball: FieldPt, phase: Phase, except: readonly Actor[] = []): Record<Side, FieldPt[]> {
    const t = formationTargets({ attacking, ball, phase, seed: this.seed });
    for (const side of ['home', 'away'] as const) {
      this.actors[side].forEach((a, i) => {
        if (except.includes(a)) return;
        this.moveTo(a, t[side][i] ?? a.to);
      });
    }
    return t;
  }

  private onKickoff(kicking: Side, instant: boolean): void {
    const centre = { fx: 50, fy: 50 };
    this.applyFormation(kicking, centre, 'kickoff');
    this.ballState = { mode: 'ground', at: centre };
    const kicker = this.actors[kicking][KICKER_SLOT];
    const catcher = this.actors[otherSide(kicking)][FULLBACK_SLOT];
    if (!kicker || !catcher) return;
    const launch = (): void => {
      this.ballState = {
        mode: 'flight',
        from: centre,
        fromLift: 0,
        to: { ...catcher.to },
        t0: this.vis,
        dur: 1000,
        peak: 80,
        then: catcher,
      };
    };
    if (instant) launch();
    else this.beat(kicker, [{ anim: 'kick', ms: 520, fn: () => this.later(180, launch) }]);
  }

  /**
   * Open play: fresh formation around the ball; `carrierSlot` (dummy-half) or a
   * rotating runner takes the ball — a quick pass from the current holder — and
   * runs to the event spot.
   */
  private onPlay(attacking: Side, at: FieldPt, phase: Phase, carrierSlot: number | null): void {
    const t = formationTargets({ attacking, ball: at, phase, seed: this.seed });
    const slot = carrierSlot ?? pickRunner(t[attacking], at, this.seed);
    const carrier = this.actors[attacking][slot];
    this.applyFormation(attacking, at, phase, carrier ? [carrier] : []);
    if (!carrier) return;
    this.moveTo(carrier, at);
    this.giveBall(carrier);
  }

  private onTackle(attacking: Side, at: FieldPt, big: boolean, instant: boolean): void {
    const defending = otherSide(attacking);
    const t = formationTargets({ attacking, ball: at, phase: 'open', seed: this.seed });
    const held = this.ballState.mode === 'held' && this.ballState.holder.side === attacking ? this.ballState.holder : null;
    const carrier = held ?? this.actors[attacking][nearestIndex(t[attacking], at)];
    const tackler = this.actors[defending][nearestIndex(t[defending], at, [HOOKER_SLOT])];
    this.applyFormation(attacking, at, 'open', [carrier, tackler].filter((a): a is Actor => !!a));
    if (carrier) {
      this.moveTo(carrier, at, [
        { anim: 'tackled', ms: big ? 520 : 380 },
        { anim: 'down', ms: big ? 380 : 220 },
      ]);
      this.giveBall(carrier);
    }
    if (tackler) {
      const dir = attackDir(attacking);
      this.moveTo(tackler, { fx: at.fx + dir * 1.4, fy: at.fy + 1 }, [
        { anim: 'tackle', ms: 360 },
        { anim: 'down', ms: big ? 360 : 200 },
      ]);
    }
    if (!instant) this.scene.cameras.main.shake(120, big ? 0.006 : 0.003);
  }

  private onError(side: Side, at: FieldPt): void {
    this.applyFormation(side, at, 'open');
    const from = this.ballPoint();
    const dir = attackDir(side);
    const spill = { fx: at.fx + dir * 3, fy: at.fy + (this.wobble(1) - 0.5) * 8 };
    this.ballState = { mode: 'flight', from: from.p, fromLift: from.lift, to: spill, t0: this.vis, dur: 380, peak: 12, then: null };
  }

  private onTry(side: Side, at: FieldPt | null): void {
    const dir = attackDir(side);
    const goal = dir > 0 ? 100 : 0;
    const fy = at?.fy ?? this.ballPoint().p.fy;
    const spot = { fx: goal + dir * 5, fy };
    const held = this.ballState.mode === 'held' && this.ballState.holder.side === side ? this.ballState.holder : null;
    const others = this.actors[side].map((a) => a.pos);
    const scorer = held ?? this.actors[side][nearestIndex(others, spot)];
    // Defenders trudge back under the posts.
    const t = formationTargets({ attacking: side, ball: spot, phase: 'goal-kick', seed: this.seed });
    this.actors[otherSide(side)].forEach((a, i) => this.moveTo(a, t[otherSide(side)][i] ?? a.to));
    // Teammates swarm the scorer and celebrate.
    this.actors[side].forEach((a, i) => {
      if (a === scorer) return;
      const near = {
        fx: goal + dir * (1 + this.wobble(i * 3) * 6) - dir * 4,
        fy: fy + (this.wobble(i * 3 + 1) - 0.5) * 22,
      };
      this.moveTo(a, near, [], 'celebrate');
    });
    if (scorer) {
      this.moveTo(scorer, spot, [
        { anim: 'dive', ms: 420 },
        { anim: 'down', ms: 320 },
      ], 'celebrate');
      this.giveBall(scorer);
    }
  }

  private onGoalKick(side: Side, at: FieldPt | null, missed: boolean): void {
    const dir = attackDir(side);
    const spot = at ?? { fx: (dir > 0 ? 100 : 0) - dir * 10, fy: 50 };
    this.applyFormation(side, spot, 'goal-kick');
    const kicker = this.actors[side][KICKER_SLOT];
    // Ball is placed on the tee at the mark.
    const from = this.ballPoint();
    this.ballState = { mode: 'flight', from: from.p, fromLift: from.lift, to: spot, t0: this.vis, dur: 260, peak: 6, then: null };
    if (!kicker) return;
    this.moveTo(kicker, { fx: spot.fx - dir * 1.6, fy: spot.fy }, [
      { anim: 'kick', ms: 560, fn: () => this.later(170, () => this.kickAtPosts(side, spot, missed)) },
    ]);
  }

  private onFieldGoal(side: Side): void {
    const held = this.ballState.mode === 'held' ? this.ballState.holder : null;
    const kicker = held && held.side === side ? held : this.actors[side][KICKER_SLOT];
    if (!kicker) return;
    const from = { ...kicker.pos };
    this.beat(kicker, [{ anim: 'kick', ms: 520, fn: () => this.later(160, () => this.kickAtPosts(side, from, false)) }]);
  }

  /** Ball arcs from `from` over (or wide of) the posts at the attacked end. */
  private kickAtPosts(side: Side, from: FieldPt, missed: boolean): void {
    const dir = attackDir(side);
    const goal = dir > 0 ? 100 : 0;
    const wide = missed ? (this.wobble(9) < 0.5 ? -16 : 16) : 0;
    this.ballState = {
      mode: 'flight',
      from,
      fromLift: 0,
      to: { fx: goal + dir * 7, fy: 50 + wide },
      t0: this.vis,
      dur: 900,
      peak: 70,
      then: null,
    };
  }

  private onReset(kicking: Side): void {
    this.actors.home.concat(this.actors.away).forEach((a) => (a.rest = 'idle'));
    this.applyFormation(kicking, { fx: 50, fy: 50 }, 'kickoff');
    this.ballState = { mode: 'ground', at: { fx: 50, fy: 50 } };
  }

  private onFullTime(): void {
    const { homeScore, awayScore } = this.result;
    const winner: Side | null = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : null;
    for (const side of ['home', 'away'] as const) {
      for (const a of this.actors[side]) {
        a.rest = side === winner ? 'celebrate' : 'idle';
        this.moveTo(a, a.pos, [], a.rest);
      }
    }
  }

  // ── Actor control ───────────────────────────────────────────────────────────

  /** Retarget an actor (absolute target; replaces any queued beats). */
  private moveTo(a: Actor, to: FieldPt, queue: Beat[] = [], rest: PlayerAnim = 'idle'): void {
    const start = Math.max(this.vis, a.lockUntil);
    const wa = this.scene.fieldToWorld(a.pos.fx, a.pos.fy);
    const wb = this.scene.fieldToWorld(to.fx, to.fy);
    const dist = Math.hypot(wb.x - wa.x, wb.y - wa.y);
    a.from = { ...a.pos };
    a.to = { ...to };
    a.t0 = start;
    a.dur = Math.max(MIN_MOVE_MS, Math.min(MAX_MOVE_MS, dist / RUN_PX_PER_MS));
    a.moving = dist > 0.5;
    if (Math.abs(wb.x - wa.x) > 0.5) a.faceLeft = wb.x < wa.x;
    a.queue = [...queue];
    a.rest = rest;
  }

  /** Play beats in place right now (interrupting any move). */
  private beat(a: Actor, queue: Beat[]): void {
    a.from = { ...a.pos };
    a.to = { ...a.pos };
    a.moving = false;
    a.lockUntil = 0;
    a.queue = [...queue];
  }

  /** Pass the ball to `to` (a quick flat flight) unless he already has it. */
  private giveBall(to: Actor): void {
    if (this.ballState.mode === 'held' && this.ballState.holder === to) return;
    const from = this.ballPoint();
    const passer = this.ballState.mode === 'held' ? this.ballState.holder : null;
    if (passer && passer.side === to.side && passer.queue.length === 0 && passer.lockUntil <= this.vis) {
      passer.queue = [{ anim: 'pass', ms: 220 }, ...passer.queue];
    }
    this.ballState = {
      mode: 'flight',
      from: from.p,
      fromLift: from.lift,
      to: { ...to.pos },
      t0: this.vis,
      dur: 200,
      peak: 4,
      then: to,
    };
  }

  private later(ms: number, fn: () => void): void {
    this.pending.push({ at: this.vis + ms, fn });
  }

  private wobble(k: number): number {
    // Deterministic 0..1 from the event seed (no Math.random in playback).
    const x = Math.sin((this.seed * 12.9898 + k * 78.233) * 1.0) * 43758.5453;
    return x - Math.floor(x);
  }

  private restFaceLeft(side: Side): boolean {
    return attackDir(side) * this.screenDir < 0;
  }

  /** Snap everything to its end state (used by skip / instant firing). */
  private settle(): void {
    for (const p of this.pending.splice(0)) p.fn();
    for (const a of [...this.actors.home, ...this.actors.away]) {
      // Run beat callbacks (kicks) so their ball effects resolve too.
      for (const b of a.queue) b.fn?.();
      for (const p of this.pending.splice(0)) p.fn();
      a.queue = [];
      a.pos = { ...a.to };
      a.from = { ...a.to };
      a.moving = false;
      a.lockUntil = 0;
      a.anim = a.rest;
      a.faceLeft = this.restFaceLeft(a.side);
    }
    if (this.ballState.mode === 'flight') {
      const f = this.ballState;
      this.ballState = f.then ? { mode: 'held', holder: f.then } : { mode: 'ground', at: { ...f.to } };
    }
  }

  // ── Per-frame stepping ──────────────────────────────────────────────────────
  private step(): void {
    for (const p of this.pending.filter((q) => q.at <= this.vis)) p.fn();
    this.pending = this.pending.filter((q) => q.at > this.vis);
    for (const a of [...this.actors.home, ...this.actors.away]) this.stepActor(a);
    this.stepBall();
    this.renderAll();
  }

  private stepActor(a: Actor): void {
    if (this.vis < a.lockUntil) return; // holding a beat
    if (a.moving) {
      if (this.vis < a.t0) return;
      const u = Math.min(1, (this.vis - a.t0) / a.dur);
      a.pos = { fx: a.from.fx + (a.to.fx - a.from.fx) * u, fy: a.from.fy + (a.to.fy - a.from.fy) * u };
      a.anim = 'run';
      if (u < 1) return;
      a.moving = false;
      a.pos = { ...a.to };
    }
    const next = a.queue.shift();
    if (next) {
      a.anim = next.anim;
      a.faceLeft = this.restFaceLeft(a.side);
      a.lockUntil = this.vis + next.ms;
      next.fn?.();
      return;
    }
    if (a.anim !== a.rest) {
      a.anim = a.rest;
      a.faceLeft = this.restFaceLeft(a.side);
    }
  }

  private stepBall(): void {
    const s = this.ballState;
    if (s.mode !== 'flight') return;
    if (this.vis < s.t0) return;
    if (this.vis - s.t0 >= s.dur) {
      this.ballState = s.then ? { mode: 'held', holder: s.then } : { mode: 'ground', at: { ...s.to } };
    }
  }

  /** Current ball ground point + lift (for starting a new flight from it). */
  private ballPoint(): { p: FieldPt; lift: number } {
    const s = this.ballState;
    if (s.mode === 'held') return { p: { ...s.holder.pos }, lift: LYING.has(s.holder.anim) ? 3 : CARRY_LIFT };
    if (s.mode === 'ground') return { p: { ...s.at }, lift: 0 };
    const u = Math.max(0, Math.min(1, (this.vis - s.t0) / s.dur));
    return {
      p: { fx: s.from.fx + (s.to.fx - s.from.fx) * u, fy: s.from.fy + (s.to.fy - s.from.fy) * u },
      lift: s.fromLift * (1 - u) + 4 * s.peak * u * (1 - u),
    };
  }

  private renderAll(): void {
    const ts = this.speed;
    for (const side of ['home', 'away'] as const) {
      for (const a of this.actors[side]) {
        const w = this.scene.fieldToWorld(a.pos.fx, a.pos.fy);
        // Feet y is the iso sort key; tiny per-slot bias stops z-fighting flicker.
        a.view.place(w.x, w.y, w.y + 1 + a.slot * 0.001 + (side === 'away' ? 0.0005 : 0));
        a.view.play(a.anim, a.faceLeft, ts);
      }
    }
    const s = this.ballState;
    if (s.mode === 'held') {
      const h = s.holder;
      const w = this.scene.fieldToWorld(h.pos.fx, h.pos.fy);
      const lying = LYING.has(h.anim);
      const hand = (h.faceLeft ? -1 : 1) * (lying ? 7 : 4);
      this.scene.ball.place(w.x + hand, w.y, lying ? 3 : CARRY_LIFT, w.y + 1.01 + h.slot * 0.001);
    } else {
      const { p, lift } = this.ballPoint();
      const w = this.scene.fieldToWorld(p.fx, p.fy);
      this.scene.ball.place(w.x, w.y, lift, w.y + 2);
    }
  }
}
