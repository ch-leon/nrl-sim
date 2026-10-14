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
import type { KickKind, MatchEvent, MatchResult, RosterEntry } from '../sim/events';
import type { Fixture } from '../core/state';
import type { PlayerAnim } from '../art/match/players';
import { bus } from '../core/events';
import {
  FULLBACK_SLOT,
  HOOKER_SLOT,
  KICKER_SLOT,
  PLAYERS,
  SLOTS,
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

/** Kicker wind-up beat, and when in it the boot meets the ball. */
const KICK_BEAT_MS = 420;
const KICK_CONTACT_MS = 150;
/** Leap / gather beat for whoever claims a contested kick. */
const CATCH_BEAT_MS = 360;
/** Longest a single kick may hold the event clock (ms at ×1). */
const MAX_KICK_HOLD_MS = 2600;
/**
 * Slack after the ball lands before the next event may fire: beats and timers
 * start on the frame after they fall due, plus a beat of rest on the ground.
 */
const KICK_SETTLE_MS = 140;

/** Ball flight shape per general-play kick type (#15). */
interface KickFlight {
  dur: number;
  peak: number;
  /** Ground bounces (grubbers) — lift follows decaying |sin| hops. */
  bounces?: number;
  /** Lands over the touchline (dead ball) instead of being claimed. */
  touch?: boolean;
  /** Chaser and defender converge and contest the catch. */
  contest?: boolean;
}

export const KICK_FLIGHTS: Readonly<Record<KickKind, KickFlight>> = {
  bomb: { dur: 1450, peak: 110, contest: true },
  chip: { dur: 750, peak: 38, contest: true },
  grubber: { dur: 900, peak: 9, bounces: 3 },
  'find-touch': { dur: 1250, peak: 62, touch: true },
  '40-20': { dur: 1400, peak: 72, touch: true },
};

/** Fallback flight for an unknown/missing kick detail. */
const DEFAULT_KICK: KickKind = 'find-touch';

export function kickFlight(detail: string | undefined): KickFlight {
  return KICK_FLIGHTS[(detail ?? DEFAULT_KICK) as KickKind] ?? KICK_FLIGHTS[DEFAULT_KICK];
}

/** Lift (px) of a flight at progress u ∈ [0,1] — a parabola or decaying hops. */
export function flightLift(fromLift: number, peak: number, u: number, bounces = 0): number {
  if (bounces > 0) {
    const hop = Math.abs(Math.sin(Math.PI * bounces * u));
    return fromLift * Math.max(0, 1 - u * bounces) + peak * hop * (1 - u);
  }
  return fromLift * (1 - u) + 4 * peak * u * (1 - u);
}

const LYING: ReadonlySet<PlayerAnim> = new Set<PlayerAnim>(['dive', 'down', 'tackled']);

// ── Ruck + contact beats (#19) ────────────────────────────────────────────────
const PTB_MS = 420;
const DUMMY_HALF_MS = 380;
const FEND_MS = 300;
/** Metres a big-hit drives the carrier back toward his own line. */
const DRIVE_BACK = 2.5;
/** Roll from the play-the-ball to the dummy-half before his pass goes out. */
const PTB_ROLL_MS = 170;
/** A line break covers ground this much faster than a normal carry. */
const BREAK_BURST = 1.6;

// ── Movement feel (#20) ──────────────────────────────────────────────────────
/** Share of a move spent accelerating from a standstill. */
const ACCEL_FRAC = 0.25;
/** Share of a move spent pulling up at the target. */
const DECEL_FRAC = 0.3;
/** Run-cycle playback rate is scaled by ground speed, within these bounds. */
const CADENCE_MIN = 0.45;
const CADENCE_MAX = 1.7;
/** Idle players turn to face the ball once it's this far to one side (px). */
const FACE_BALL_PX = 12;

/**
 * Trapezoidal speed profile (#20): progress 0..1 at time fraction u when the
 * first `accel` of the move speeds up from rest, the last `decel` slows to a
 * stop and the middle cruises. accel = 0 for a player already running, so a
 * retarget mid-run doesn't stutter. Monotonic, e(0) = 0, e(1) = 1.
 */
export function moveProgress(u: number, accel: number, decel = DECEL_FRAC): number {
  const x = Math.max(0, Math.min(1, u));
  const k = 1 / (1 - accel / 2 - decel / 2);
  if (accel > 0 && x < accel) return (k * x * x) / (2 * accel);
  if (x <= 1 - decel) return k * (accel / 2 + (x - accel));
  const r = 1 - x;
  return k * (accel / 2 + (1 - decel - accel) + (decel / 2 - (r * r) / (2 * decel)));
}

/** d(progress)/du for moveProgress — the speed relative to the move's average. */
export function moveSpeedFactor(u: number, accel: number, decel = DECEL_FRAC): number {
  const x = Math.max(0, Math.min(1, u));
  const k = 1 / (1 - accel / 2 - decel / 2);
  if (accel > 0 && x < accel) return (k * x) / accel;
  if (x <= 1 - decel) return k;
  return (k * (1 - x)) / decel;
}

/** Peak (cruise) speed over average speed for a profile — scales durations. */
export function cruiseFactor(accel: number, decel = DECEL_FRAC): number {
  return 1 / (1 - accel / 2 - decel / 2);
}

/** Position-based pace before stats: outside backs quickest, props slowest. */
const ROLE_PACE: Readonly<Record<string, number>> = {
  fullback: 1.06,
  winger: 1.07,
  centre: 1.03,
  'five-eighth': 1.0,
  halfback: 1.0,
  hooker: 0.98,
  'second-row': 0.96,
  lock: 0.95,
  prop: 0.92,
};

/**
 * Per-formation-slot run-speed multipliers (#20) from a team sheet roster:
 * each slot takes the first unused roster entry with its role (else any
 * leftover), then pace = role factor × (0.85 + speed/100 × 0.3). A missing or
 * stat-less roster falls back to the role factor alone. Pure + deterministic.
 */
export function slotSpeeds(roster?: readonly RosterEntry[]): number[] {
  const pool = [...(roster ?? [])];
  return SLOTS.map((slot) => {
    let i = pool.findIndex((r) => r.position === slot.role);
    if (i < 0) i = pool.length > 0 ? 0 : -1;
    const entry = i >= 0 ? pool.splice(i, 1)[0] : undefined;
    const role = ROLE_PACE[slot.role] ?? 1;
    const stat = entry?.stats?.speed;
    return stat === undefined ? role : role * (0.85 + (Math.max(1, Math.min(100, stat)) / 100) * 0.3);
  });
}

export interface PlaybackOptions {
  /** Run-speed multiplier per formation slot (see slotSpeeds); default 1. */
  speeds?: Partial<Record<Side, readonly number[]>>;
}

interface Beat {
  anim: PlayerAnim;
  ms: number;
  /** Runs when this beat starts (e.g. launch the ball at the kick). */
  fn?: () => void;
  /** Slide to this spot over the beat (a big-hit driving the carrier back). */
  slide?: FieldPt;
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
  /** Run-speed multiplier from the player's pace (#20). */
  pace: number;
  /** Acceleration share of the current move (0 when already running). */
  accel: number;
  /** Run-cycle rate for this frame, from current ground speed (#20). */
  cadence: number;
  /** In-progress beat slide (big-hit drive-back, fend stumble). */
  slide: { from: FieldPt; to: FieldPt; t0: number; dur: number } | null;
  /** Formation updates leave this actor alone until then (ruck/contact beats). */
  busyUntil: number;
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
      bounces?: number;
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

  constructor(scene: PlaybackScene, result: MatchResult, fixture?: Fixture, opts: PlaybackOptions = {}) {
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
          pace: opts.speeds?.[side]?.[slot] ?? 1,
          accel: ACCEL_FRAC,
          cadence: 1,
          slide: null,
          busyUntil: 0,
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
          this.onPlay(side, at, phase, null, ev.kind);
        }
        break;
      case 'kick':
        if (at) {
          const hold = this.onKick(side, at, ev, instant);
          if (!instant && hold > 0) this.beginPause(hold);
        }
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
        // Players mid play-the-ball / contact beat finish it first (#19).
        if (except.includes(a) || a.busyUntil > this.vis) return;
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
  private onPlay(
    attacking: Side,
    at: FieldPt,
    phase: Phase,
    carrierSlot: number | null,
    kind: MatchEvent['kind'] = 'run',
  ): void {
    const t = formationTargets({ attacking, ball: at, phase, seed: this.seed });
    let slot = carrierSlot ?? pickRunner(t[attacking], at, this.seed);
    // Don't hand it to someone still getting up from the last tackle.
    if (carrierSlot === null && (this.actors[attacking][slot]?.busyUntil ?? 0) > this.vis) {
      const busy = this.actors[attacking].filter((a) => a.busyUntil > this.vis).map((a) => a.slot);
      const alt = nearestIndex(t[attacking], at, [...busy, HOOKER_SLOT]);
      if (alt >= 0) slot = alt;
    }
    const carrier = this.actors[attacking][slot];
    const defending = otherSide(attacking);
    const contact = kind === 'fend' || kind === 'break-tackle';
    const defender = contact ? this.actors[defending][nearestIndex(t[defending], at, [HOOKER_SLOT])] : undefined;
    this.applyFormation(attacking, at, phase, [carrier, defender].filter((a): a is Actor => !!a));
    if (!carrier) return;
    const dir = attackDir(attacking);
    if (contact) {
      // #19: straight-arm fend; the defender is shrugged off / dives and misses.
      this.moveTo(carrier, at, [{ anim: 'fend', ms: FEND_MS }]);
      if (defender) {
        const meet = { fx: at.fx + dir * 1.2, fy: at.fy + 0.8 };
        const beaten =
          kind === 'fend'
            ? [{ anim: 'tackled' as const, ms: 280, slide: { fx: meet.fx + dir * 1.2, fy: meet.fy + 1 } }]
            : [
                { anim: 'tackle' as const, ms: 300, slide: { fx: meet.fx - dir * 0.6, fy: meet.fy + 1.5 } },
                { anim: 'down' as const, ms: 260 },
              ];
        this.moveTo(defender, meet, beaten);
        this.markBusy(defender, beaten);
      }
    } else {
      this.moveTo(carrier, at);
    }
    if (kind === 'break') {
      // Line break: a burst of pace (and a quicker run cycle to match).
      carrier.dur = Math.max(MIN_MOVE_MS, carrier.dur / BREAK_BURST);
    }
    this.giveBall(carrier);
  }

  /** Keep `a` out of formation updates until its queued beats have played. */
  private markBusy(a: Actor, beats: readonly Beat[]): void {
    const arrive = a.moving ? Math.max(this.vis, a.t0) + a.dur : Math.max(this.vis, a.lockUntil);
    a.busyUntil = arrive + beats.reduce((n, b) => n + b.ms, 0);
  }

  /**
   * General-play kick (#15). The kicker winds up and the ball flies by type: a
   * high bomb or short chip that chaser and defender converge on and contest, a
   * bouncing grubber, or a long find-touch / 40-20 that lands over the
   * touchline. Landing spot and who claims it come from the next positioned
   * event (the receiving set-start or a try), so the picture matches the sim.
   * Returns how long (ms at ×1) the event clock must hold so the flight lands
   * before the next event fires.
   */
  private onKick(side: Side, at: FieldPt, ev: MatchEvent, instant: boolean): number {
    const flight = kickFlight(ev.detail);
    const def = otherSide(side);
    const land = this.kickLanding(side, at, flight, ev.teamId);
    const t = formationTargets({ attacking: side, ball: at, phase: 'open', seed: this.seed });
    const held = this.ballState.mode === 'held' && this.ballState.holder.side === side ? this.ballState.holder : null;
    const kicker = held ?? this.actors[side][KICKER_SLOT];
    if (!kicker) return 0;
    const chaser = flight.touch ? undefined : this.actors[side][nearestIndex(t[side], land.p, [kicker.slot])];
    const defender = flight.touch
      ? this.actors[def][nearestIndex(t[def], { fx: land.p.fx, fy: Math.max(5, Math.min(95, land.p.fy)) })]
      : flight.contest && ev.detail === 'bomb'
        ? this.actors[def][FULLBACK_SLOT]
        : this.actors[def][nearestIndex(t[def], land.p)];
    const claimer = land.claim === 'attack' ? chaser : land.claim === 'defence' ? defender : undefined;

    this.applyFormation(side, at, 'open', [kicker, chaser, defender].filter((a): a is Actor => !!a));
    this.moveTo(kicker, at);
    this.giveBall(kicker);

    const launch = (): void => {
      const from = this.ballPoint();
      this.ballState = {
        mode: 'flight',
        from: from.p,
        fromLift: from.lift,
        to: { ...land.p },
        t0: this.vis,
        dur: flight.dur,
        peak: flight.peak,
        bounces: flight.bounces ?? 0,
        then: claimer ?? null,
      };
      const dir = attackDir(side);
      const leap: Beat[] = flight.contest ? [{ anim: 'catch', ms: CATCH_BEAT_MS }] : [];
      const contesters: [Actor | undefined, FieldPt][] = [
        [chaser, { fx: land.p.fx - dir * 1.2, fy: land.p.fy + 1.5 }],
        [defender, flight.touch ? { fx: land.p.fx, fy: land.p.fy < 50 ? 4 : 96 } : { ...land.p }],
      ];
      for (const [a, spot] of contesters) {
        if (!a) continue;
        // The claimer meets the ball exactly where and when it comes down.
        this.moveTo(a, a === claimer ? land.p : spot, leap);
        if (a === claimer) {
          a.t0 = this.vis;
          a.dur = Math.max(MIN_MOVE_MS, flight.dur - 40);
        }
      }
    };

    if (instant) {
      launch();
      return 0;
    }
    kicker.queue = [{ anim: 'kick', ms: KICK_BEAT_MS, fn: () => this.later(KICK_CONTACT_MS, launch) }];

    // Hold the clock until the kicker has arrived, kicked, and the ball is down.
    const lead = kicker.moving ? Math.max(0, kicker.t0 - this.vis) + kicker.dur : 0;
    const total = lead + KICK_CONTACT_MS + flight.dur + (flight.contest ? CATCH_BEAT_MS : 0) + KICK_SETTLE_MS;
    const nextDue = this.due[this.cursor];
    const thisDue = this.due[this.cursor - 1] ?? this.clockMs;
    const gap = nextDue !== undefined ? nextDue - thisDue : 0;
    return Math.max(0, Math.min(MAX_KICK_HOLD_MS, total - gap));
  }

  /**
   * Where a kick comes down and who claims it, read from the next positioned
   * event: a set-start (that team has the ball) or a try (the chaser regathers
   * and scores). Touch kicks land just over the nearer touchline, unclaimed.
   */
  private kickLanding(
    side: Side,
    at: FieldPt,
    flight: KickFlight,
    teamId: string,
  ): { p: FieldPt; claim: 'attack' | 'defence' | null } {
    const dir = attackDir(side);
    let next: MatchEvent | undefined;
    for (let i = this.cursor; i < Math.min(this.events.length, this.cursor + 3); i++) {
      const e = this.events[i] as MatchEvent;
      if ((e.kind === 'set-start' || e.kind === 'try') && e.x !== undefined) {
        next = e;
        break;
      }
    }
    const reach = flight.touch ? 35 : flight.bounces ? 18 : 25;
    let fx = next?.x !== undefined ? next.x - (next.kind === 'try' ? dir * 3 : 0) : at.fx + dir * reach;
    // Always land downfield of the kicker, and never beyond the dead-ball line.
    fx = dir > 0 ? Math.max(fx, at.fx + 8) : Math.min(fx, at.fx - 8);
    fx = Math.max(-8, Math.min(108, fx));
    const laneY = next?.y ?? at.fy;
    if (flight.touch) return { p: { fx, fy: laneY < 50 ? -5 : 105 }, claim: null };
    const claim = next && next.teamId === teamId ? 'attack' : 'defence';
    return { p: { fx, fy: laneY }, claim };
  }

  private onTackle(attacking: Side, at: FieldPt, big: boolean, instant: boolean): void {
    const defending = otherSide(attacking);
    const t = formationTargets({ attacking, ball: at, phase: 'open', seed: this.seed });
    const held = this.ballState.mode === 'held' && this.ballState.holder.side === attacking ? this.ballState.holder : null;
    const carrier = held ?? this.actors[attacking][nearestIndex(t[attacking], at)];
    const tackler = this.actors[defending][nearestIndex(t[defending], at, [HOOKER_SLOT])];
    this.applyFormation(attacking, at, 'open', [carrier, tackler].filter((a): a is Actor => !!a));
    const dir = attackDir(attacking);
    // #19: a big-hit drives the carrier (and his tackler) back toward his line.
    const back = big ? -dir * DRIVE_BACK : 0;
    const groundAt = { fx: at.fx + back, fy: at.fy };
    if (carrier) {
      const beats: Beat[] = [
        { anim: 'tackled', ms: big ? 520 : 380, ...(big ? { slide: groundAt } : {}) },
        { anim: 'down', ms: big ? 380 : 220 },
        // Up, step over it and heel it back to the dummy-half.
        { anim: 'ptb', ms: PTB_MS },
      ];
      this.moveTo(carrier, at, beats);
      this.markBusy(carrier, beats);
      this.giveBall(carrier);
    }
    if (tackler) {
      const tAt = { fx: at.fx + dir * 1.4, fy: at.fy + 1 };
      const beats: Beat[] = [
        { anim: 'tackle', ms: 360, ...(big ? { slide: { fx: tAt.fx + back, fy: tAt.fy } } : {}) },
        { anim: 'down', ms: big ? 360 : 200 },
      ];
      this.moveTo(tackler, tAt, beats);
    }
    // Dummy-half gets in behind the ruck and stoops over the ball.
    const dummyHalf = this.actors[attacking][HOOKER_SLOT];
    if (dummyHalf && dummyHalf !== carrier) {
      const beats: Beat[] = [{ anim: 'dummyHalf', ms: DUMMY_HALF_MS }];
      this.moveTo(dummyHalf, { fx: groundAt.fx - dir * 1.6, fy: groundAt.fy + 0.6 }, beats);
      this.markBusy(dummyHalf, beats);
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
    // Already running → carry the pace (no fresh acceleration); from rest → ramp up.
    a.accel = a.moving && a.anim === 'run' ? 0 : ACCEL_FRAC;
    a.from = { ...a.pos };
    a.to = { ...to };
    a.t0 = start;
    a.dur = Math.max(
      MIN_MOVE_MS,
      Math.min(MAX_MOVE_MS, (dist / (RUN_PX_PER_MS * a.pace)) * cruiseFactor(a.accel)),
    );
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
    a.slide = null;
    a.queue = [...queue];
  }

  /** Pass the ball to `to` (a quick flat flight) unless he already has it. */
  private giveBall(to: Actor): void {
    if (this.ballState.mode === 'held' && this.ballState.holder === to) return;
    // #19: out of a tackle the ball goes through the play-the-ball — rolled
    // back to the dummy-half — before he passes it on.
    const holder = this.ballState.mode === 'held' ? this.ballState.holder : null;
    const dh = holder ? this.actors[holder.side][HOOKER_SLOT] : undefined;
    if (
      holder &&
      dh &&
      holder.side === to.side &&
      holder !== dh &&
      to !== dh &&
      (LYING.has(holder.anim) || holder.anim === 'ptb' || holder.queue.some((b) => b.anim === 'ptb'))
    ) {
      const p = this.ballPoint();
      this.ballState = { mode: 'flight', from: p.p, fromLift: p.lift, to: { ...dh.pos }, t0: this.vis, dur: PTB_ROLL_MS, peak: 1, then: dh };
      this.later(PTB_ROLL_MS + 10, () => this.giveBall(to));
      return;
    }
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
      // A queued or running slide (big-hit drive-back) is where he ends up.
      const slid = [...a.queue].reverse().find((b) => b.slide)?.slide ?? a.slide?.to;
      a.queue = [];
      a.pos = { ...(slid ?? a.to) };
      a.to = { ...a.pos };
      a.from = { ...a.pos };
      a.moving = false;
      a.lockUntil = 0;
      a.slide = null;
      a.busyUntil = 0;
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
    if (this.vis < a.lockUntil) {
      // Holding a beat — possibly sliding (driven back in a big-hit).
      if (a.slide) {
        const u = Math.min(1, (this.vis - a.slide.t0) / a.slide.dur);
        const e = u * (2 - u); // ease-out: the hit's momentum bleeds off
        a.pos = {
          fx: a.slide.from.fx + (a.slide.to.fx - a.slide.from.fx) * e,
          fy: a.slide.from.fy + (a.slide.to.fy - a.slide.from.fy) * e,
        };
      }
      return;
    }
    if (a.slide) {
      a.pos = { ...a.slide.to };
      a.to = { ...a.pos };
      a.slide = null;
    }
    if (a.moving) {
      if (this.vis < a.t0) return;
      const u = Math.min(1, (this.vis - a.t0) / a.dur);
      const e = moveProgress(u, a.accel);
      a.pos = { fx: a.from.fx + (a.to.fx - a.from.fx) * e, fy: a.from.fy + (a.to.fy - a.from.fy) * e };
      a.anim = 'run';
      // #20: legs turn over in step with actual ground speed (no foot-sliding).
      const wa = this.scene.fieldToWorld(a.from.fx, a.from.fy);
      const wb = this.scene.fieldToWorld(a.to.fx, a.to.fy);
      const avg = Math.hypot(wb.x - wa.x, wb.y - wa.y) / a.dur;
      const ground = avg * moveSpeedFactor(u, a.accel);
      a.cadence = Math.max(CADENCE_MIN, Math.min(CADENCE_MAX, ground / RUN_PX_PER_MS));
      if (u < 1) return;
      a.moving = false;
      a.pos = { ...a.to };
    }
    a.cadence = 1;
    const next = a.queue.shift();
    if (next) {
      a.anim = next.anim;
      a.faceLeft = this.restFaceLeft(a.side);
      a.lockUntil = this.vis + next.ms;
      if (next.slide) a.slide = { from: { ...a.pos }, to: { ...next.slide }, t0: this.vis, dur: next.ms };
      next.fn?.();
      return;
    }
    if (a.anim !== a.rest) a.anim = a.rest;
    a.faceLeft = a.rest === 'idle' ? this.idleFaceLeft(a) : this.restFaceLeft(a.side);
  }

  /** Idle players watch the ball (#20); with it roughly level they face upfield. */
  private idleFaceLeft(a: Actor): boolean {
    const me = this.scene.fieldToWorld(a.pos.fx, a.pos.fy);
    const b = this.ballPoint().p;
    const ball = this.scene.fieldToWorld(b.fx, b.fy);
    const dx = ball.x - me.x;
    if (Math.abs(dx) <= FACE_BALL_PX) return this.restFaceLeft(a.side);
    return dx < 0;
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
      lift: flightLift(s.fromLift, s.peak, u, s.bounces),
    };
  }

  private renderAll(): void {
    const ts = this.speed;
    for (const side of ['home', 'away'] as const) {
      for (const a of this.actors[side]) {
        const w = this.scene.fieldToWorld(a.pos.fx, a.pos.fy);
        // Feet y is the iso sort key; tiny per-slot bias stops z-fighting flicker.
        a.view.place(w.x, w.y, w.y + 1 + a.slot * 0.001 + (side === 'away' ? 0.0005 : 0));
        a.view.play(a.anim, a.faceLeft, a.anim === 'run' ? ts * a.cadence : ts);
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
