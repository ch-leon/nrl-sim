// src/world/playback.ts — match event timeline → sprite animation (BAK-194, WU-12).
//
// PlaybackController consumes a MatchResult's timed event log and drives the
// MatchScene's dots/ball/camera on a COMPRESSED real-time clock (80 sim-minutes
// → ~90 real seconds at ×1). It re-emits each MatchEvent on the bus as
// 'match:event' BEFORE moving any sprite, so the overlay (BAK-196) and later
// audio/particles stay in lockstep with the visual. It emits 'match:finished'
// exactly once at full-time (or when skip() completes).
//
// PRESENTATION ONLY: this controller MUST NOT mutate GameState, call setState, or
// touch fixtures/ladder. The result/ladder are applied by the WU-7 fixtures tick
// pipeline BEFORE MatchScene starts. Re-running playback must not double-count.
//
// The pure scheduling maths (eventTimeMs, ordering) are Phaser-free and unit
// tested; the class is manual/preview QA (ARCHITECTURE §8) but is written against
// a minimal structural interface (PlaybackScene) so tests can drive it with a
// fake scene.
import type { MatchEvent, MatchResult } from '../sim/events';
import type { Fixture } from '../core/state';
import { bus } from '../core/events';

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
  // stable sort so a due-check by clockMs is always monotonic. Array.prototype
  // .sort is stable in all supported runtimes, so equal-`t` order is preserved.
  return [...events].sort((a, b) => a.t - b.t);
}

// ── Minimal structural view of MatchScene the controller depends on ───────────
// Declared here (not importing the Phaser class) so playback stays testable and
// its dependency surface on the scene is explicit. MatchScene satisfies this.
export interface PlaybackDot {
  x: number;
  y: number;
}

export interface PlaybackTween {
  add(config: {
    targets: unknown;
    x?: number;
    y?: number;
    duration: number;
    ease?: string;
    yoyo?: boolean;
    onComplete?: () => void;
  }): unknown;
  killTweensOf(target: unknown): void;
}

export interface PlaybackCamera {
  shake(duration: number, intensity: number): void;
}

export interface PlaybackScene {
  fieldToWorld(fx: number, fy: number): { x: number; y: number };
  readonly homeDots: PlaybackDot[];
  readonly awayDots: PlaybackDot[];
  readonly ball: PlaybackDot;
  readonly tweens: PlaybackTween;
  readonly cameras: { main: PlaybackCamera };
  /** Home team id — used to decide try in-goal direction / formation sides. */
  readonly homeId: string;
}

// How far (0..1) formation dots ease their x toward the ball's world x per event.
const FORMATION_DRIFT = 0.25;
// Base tween duration (ms) for a ball move at ×1; scaled down by speed.
const BALL_TWEEN_MS = 350;
// Half-time real pause (ms at ×1); drained via the speed-scaled delta so it stays
// proportional (~4x shorter in real seconds at ×4).
const HALF_TIME_PAUSE_MS = 1500;

export class PlaybackController {
  private readonly scene: PlaybackScene;
  private readonly result: MatchResult;
  private readonly events: MatchEvent[];
  private readonly fixture: Fixture | undefined;

  private clockMs = 0;
  private cursor = 0;
  private speed: PlaybackSpeed = 1;
  private paused = false;
  private pauseRemainingMs = 0;
  private _finished = false;
  private finishEmitted = false;

  constructor(scene: PlaybackScene, result: MatchResult, fixture?: Fixture) {
    this.scene = scene;
    this.result = result;
    this.events = orderedEvents(result.events);
    this.fixture = fixture;
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

  /**
   * Advance the clock by `deltaMs` real time (scaled by speed) and fire every
   * event now due, in order. Called from MatchScene.update(delta). No-op once
   * finished.
   */
  update(deltaMs: number): void {
    if (this._finished) return;

    // Spend a scaled-time budget across pause windows and the sim clock. A pause
    // (half-time) holds `clockMs` steady while draining budget as wall-clock only.
    // Processing the smallest of {budget, time-to-next-event} at a time keeps
    // behaviour frame-rate independent: one big tick drains a half-time pause and
    // continues firing; many tiny ticks accumulate identically.
    let budget = deltaMs * this.speed;
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
        // Event log exhausted. The engine always ends with 'full-time', but
        // don't depend on that sentinel — finish robustly either way.
        this.emitFinished();
        break;
      }
      const dueAt = eventTimeMs(next.t, 1);
      if (dueAt <= this.clockMs) {
        // Already due: fire it now. May set paused=true (half-time).
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

  /**
   * Fire all remaining events instantly (no tweens — sprites snap) then trigger
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
  }

  // ── Per-event firing ─────────────────────────────────────────────────────────
  private fire(ev: MatchEvent, instant: boolean): void {
    // 1. Emit on the bus FIRST so the overlay/score update in lockstep.
    bus.emit('match:event', ev);

    // 2. Move the ball + drift formations toward the event position.
    if (ev.x !== undefined && ev.y !== undefined) {
      const w = this.scene.fieldToWorld(ev.x, ev.y);
      this.moveBall(w, instant);
      this.driftFormations(w.x, instant);
    }

    // 3. Beat by kind.
    switch (ev.kind) {
      case 'try':
        this.playTry(ev, instant);
        break;
      case 'big-hit':
        this.playConverge(ev, instant, true);
        break;
      case 'tackle':
        this.playConverge(ev, instant, false);
        break;
      case 'half-time':
        if (!instant) this.beginPause(HALF_TIME_PAUSE_MS);
        break;
      case 'full-time':
        this.emitFinished();
        break;
      default:
        // run / break / error / kickoff / set-start / conversion / penalty /
        // penalty-goal / field-goal: ball + formation move only (done above).
        break;
    }
  }

  private moveBall(w: { x: number; y: number }, instant: boolean): void {
    const ball = this.scene.ball;
    // Retarget rather than stack: kill any in-flight ball tween first.
    this.scene.tweens.killTweensOf(ball);
    if (instant) {
      ball.x = w.x;
      ball.y = w.y;
      return;
    }
    this.scene.tweens.add({
      targets: ball,
      x: w.x,
      y: w.y,
      duration: this.scaledMs(BALL_TWEEN_MS),
      ease: 'Sine.easeInOut',
    });
  }

  /** Ease each dot's x a fraction toward the ball x, preserving width spread. */
  private driftFormations(ballX: number, instant: boolean): void {
    const all = [...this.scene.homeDots, ...this.scene.awayDots];
    for (const dot of all) {
      const targetX = dot.x + (ballX - dot.x) * FORMATION_DRIFT;
      this.scene.tweens.killTweensOf(dot);
      if (instant) {
        dot.x = targetX;
        continue;
      }
      this.scene.tweens.add({
        targets: dot,
        x: targetX,
        duration: this.scaledMs(BALL_TWEEN_MS),
        ease: 'Sine.easeOut',
      });
    }
  }

  /** Scorer dot sprints to the in-goal, then a brief celebratory bounce. */
  private playTry(ev: MatchEvent, instant: boolean): void {
    const attackingRight = ev.teamId === this.scene.homeId;
    const dots = attackingRight ? this.scene.homeDots : this.scene.awayDots;
    const goal = this.scene.fieldToWorld(attackingRight ? 100 : 0, ev.y ?? 50);
    const scorer = this.nearestDot(dots, goal);
    if (!scorer) return;
    this.scene.tweens.killTweensOf(scorer);
    if (instant) {
      scorer.x = goal.x;
      scorer.y = goal.y;
      return;
    }
    const bounceMs = this.scaledMs(160);
    this.scene.tweens.add({
      targets: scorer,
      x: goal.x,
      y: goal.y,
      duration: this.scaledMs(400),
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // Celebration: a short vertical bounce (yoyo back down).
        this.scene.tweens.add({
          targets: scorer,
          y: goal.y - 12,
          duration: bounceMs,
          ease: 'Quad.easeOut',
          yoyo: true,
        });
      },
    });
  }

  /** Two nearest opposing dots converge on the hit; camera shakes. */
  private playConverge(ev: MatchEvent, instant: boolean, big: boolean): void {
    if (ev.x === undefined || ev.y === undefined) return;
    const w = this.scene.fieldToWorld(ev.x, ev.y);
    const homeNear = this.nearestDot(this.scene.homeDots, w);
    const awayNear = this.nearestDot(this.scene.awayDots, w);
    for (const dot of [homeNear, awayNear]) {
      if (!dot) continue;
      this.scene.tweens.killTweensOf(dot);
      if (instant) {
        dot.x = w.x;
        dot.y = w.y;
      } else {
        this.scene.tweens.add({
          targets: dot,
          x: w.x,
          y: w.y,
          duration: this.scaledMs(220),
          ease: 'Cubic.easeIn',
        });
      }
    }
    if (!instant) {
      // Big-hit shakes harder than a routine tackle.
      this.scene.cameras.main.shake(120, big ? 0.006 : 0.003);
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

  /** Duration scaled inversely with speed so faster playback = snappier tweens. */
  private scaledMs(baseMs: number): number {
    return Math.max(16, baseMs / this.speed);
  }

  private nearestDot(dots: readonly PlaybackDot[], w: { x: number; y: number }): PlaybackDot | undefined {
    let best: PlaybackDot | undefined;
    let bestD = Infinity;
    for (const dot of dots) {
      const d = (dot.x - w.x) ** 2 + (dot.y - w.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = dot;
      }
    }
    return best;
  }
}
