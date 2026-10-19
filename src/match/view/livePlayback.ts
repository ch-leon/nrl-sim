// src/match/view/livePlayback.ts — a real match played on the live sim as the
// player watches (BAK-207 §5.1 2g; coach calls #73: the match on screen is the
// match). Matchday holds the week at kick-off; this plays the sheets on the
// match seed tick by tick, records the MatchResult as it goes (MatchRecorder,
// exactly as runMatch would), takes the coach's calls, and hands the result
// over with 'match:finished' at full time. In the Match scene it drives the
// overlay, score banners, crowd and FX, the lab's pop-ups, wrestle bar and
// sprint streaks, speed buttons and Skip.
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Fixture } from '../../core/state';
import type { TeamSheet, WeatherKind } from '../../sim/events';
import type { PlayerAnim } from '../../art/match/players';
import type { MatchOverlayHandle } from '../../ui/screens/matchOverlay';
import { Runner } from '../core/engine';
import type { Side, SimEvent } from '../core/snapshot';
import { LiveSim } from '../league/live';
import { MatchRecorder } from '../league/match';
import type { CallInput, CoachCall } from '../league/calls';
import { NINES } from '../league/rules';
import { LiveView, type ViewSurface } from './liveView';
import { PopupLayer } from './popupLayer';
import { SLOWMO_FACTOR, SLOWMO_MS, popupFor } from './popups';
import { SprintLayer } from './sprintLayer';
import { WrestleBar } from './wrestleBar';

export type PlaybackSpeed = 1 | 2 | 4 | 8;

/** The speeds offered on the match controls, slowest first. */
export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [1, 2, 4, 8];

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

/** A live match starts at ×4: at ×1 a Nines match takes its full 18 minutes to watch (§5.1 decision 1). */
export const LIVE_DEFAULT_SPEED: PlaybackSpeed = 4;
/** Pop-ups sit above the name tag (73k) and below the weather (80k), as in the lab. */
const DEPTH_POPUP = 74_000;
/** A big moment's close-up lasts this long before easing back out. */
const CLOSEUP_MS = 1500;

interface Sprite {
  x: number;
  y: number;
  flipX: boolean;
}

/** What the live playback needs of the Match scene. */
export interface LivePlaybackScene extends ViewSurface {
  players: Record<Side, readonly (ViewSurface['players'][Side][number] & { sprite: Sprite })[]>;
  cameras: { main: { zoom: number } };
}

export interface LivePlaybackOptions {
  home: TeamSheet;
  away: TeamSheet;
  /** The match: its seed, weather and injury rate from matchday, and the coach's calls so far (a resumed match brings its own). */
  seed: number;
  weather: WeatherKind;
  injuryRate?: number;
  calls: CallInput[];
  /** A resumed match: played on silently to this tick (the overlay still counts it) before the player takes over. */
  resumeAt?: number;
  /** A call was made, or the tick moved on a resumable match: keep the record (resume after the app is killed). */
  onProgress?: (calls: readonly CallInput[], tick: number) => void;
  fixture: Fixture | undefined;
  overlay: MatchOverlayHandle | null;
  /** Ease the camera back out after a big moment's close-up. */
  closeUpDone: () => void;
}

export class LivePlayback {
  private readonly runner: Runner;
  private readonly view: LiveView;
  private readonly popups: PopupLayer;
  private readonly wrestleBar: WrestleBar;
  private readonly sprintLayer: SprintLayer;
  private readonly recorder: MatchRecorder;
  private speed: PlaybackSpeed = LIVE_DEFAULT_SPEED;
  private finishEmitted = false;
  private skipping = false;
  private now = 0;
  private closeupUntil = 0;

  constructor(
    private readonly scene: LivePlaybackScene & Phaser.Scene,
    private readonly opts: LivePlaybackOptions,
  ) {
    const { home, away } = opts;
    this.recorder = new MatchRecorder({ home: home.clubId, away: away.clubId });
    // Exactly the sim runMatch would play: same sheets, seed, weather, injury rate and calls.
    const simOpts = { weather: opts.weather, calls: opts.calls, ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}) };
    this.runner = new Runner((seed) => new LiveSim(home, away, seed, simOpts), opts.seed);
    this.runner.onEvents = (events) => this.onSimEvents(events);
    this.runner.onStep = () => this.recorder.clock(this.sim.matchSeconds);
    this.runner.setSpeed(this.speed);
    // A resumed match plays on, silently, to where it was.
    if (opts.resumeAt) {
      this.skipping = true;
      while (!this.runner.finished && this.runner.tick < opts.resumeAt) this.runner.step();
      this.skipping = false;
    }
    this.runner.play();
    this.view = new LiveView(scene);
    this.popups = new PopupLayer(scene, DEPTH_POPUP);
    this.wrestleBar = new WrestleBar(scene, DEPTH_POPUP);
    this.sprintLayer = new SprintLayer(scene, DEPTH_POPUP - 1);
    this.view.draw(this.runner.prev, this.runner.cur, 0, 1);
  }

  get finished(): boolean {
    return this.finishEmitted;
  }

  private get sim(): LiveSim {
    return this.runner.current as LiveSim;
  }

  /** Why `side`'s coach can't make `call` now, or null (#73). */
  callRefusal(side: Side, call: CoachCall): string | null {
    return this.finishEmitted ? 'full time' : this.sim.callRefusal(side, call);
  }

  /** The coach makes a call: it takes effect on the next tick. Returns why not, or null. */
  call(side: Side, call: CoachCall): string | null {
    const why = this.callRefusal(side, call);
    if (why) return why;
    this.opts.calls.push({ tick: this.runner.tick + 1, side, call });
    this.opts.onProgress?.(this.opts.calls, this.runner.tick);
    return null;
  }

  /** Who has the ball (the chips show attack or defence calls). */
  get inPossession(): Side {
    return this.sim.inPossession;
  }

  /** The tick the match is at (for the resume record). */
  get tick(): number {
    return this.runner.tick;
  }

  /** Keep the resume record up to date (the app is going to the background). */
  saveProgress(): void {
    if (!this.finishEmitted) this.opts.onProgress?.(this.opts.calls, this.runner.tick);
  }

  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
    this.runner.setSpeed(speed);
  }

  /** Play the rest of the match at once: every event still reaches the overlay (the full-time score), no pop-ups. */
  skip(): void {
    if (this.finishEmitted) return;
    this.skipping = true;
    while (!this.runner.finished) this.runner.step();
    this.skipping = false;
    this.view.draw(this.runner.prev, this.runner.cur, 1, 0.001);
    this.showClock();
    this.finish();
  }

  /** Step the sim by real time and place the sprites (before the camera follows the ball). */
  update(deltaMs: number): void {
    this.now += deltaMs;
    const r = this.runner;
    r.update(deltaMs);
    this.view.draw(r.prev, r.cur, r.alpha, r.playing ? r.speed : 0.001);
    this.showClock();
    if (this.closeupUntil && this.now > this.closeupUntil) {
      this.closeupUntil = 0;
      this.opts.closeUpDone();
    }
    if (r.finished) this.finish();
  }

  /** The overlay's clock off the sim's: match seconds and the half. */
  private showClock(): void {
    const c = this.runner.cur.clock;
    if (c) this.opts.overlay?.setClock((c.half - 1) * NINES.halfMinutes * 60 + c.seconds, c.half === 1 ? 1 : 2);
  }

  /** Pop-ups, the wrestle bar and sprint streaks, once the camera has moved this frame. */
  late(deltaMs: number): void {
    const zoom = this.scene.cameras.main.zoom;
    const feet = (side: Side, slot: number): { x: number; y: number } | null => {
      const a = this.scene.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y } : null;
    };
    this.popups.update(deltaMs, zoom, feet);
    this.wrestleBar.update(this.runner.cur.wrestle, zoom, (w) => feet(w.side, w.slot));
    this.sprintLayer.update(this.runner.cur, zoom, (side, slot) => {
      const a = this.scene.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y, faceLeft: a.sprite.flipX } : null;
    });
  }

  destroy(): void {
    this.runner.onEvents = null;
    this.popups.destroy();
    this.wrestleBar.destroy();
    this.sprintLayer.destroy();
  }

  private onSimEvents(events: readonly SimEvent[]): void {
    const cur = this.runner.cur;
    for (const e of events) {
      if (e.kind === 'coach-call' && !this.skipping) this.opts.overlay?.comment(e.text);
      const p = this.skipping ? null : popupFor(e);
      if (p && e.side !== undefined && e.slot !== undefined) {
        this.popups.show(p, e.side, e.slot);
        if (p.big) {
          this.runner.slowMo(SLOWMO_MS, SLOWMO_FACTOR);
          this.closeupUntil = this.now + CLOSEUP_MS;
        }
      }
    }
    // The contract's events, recorded for the result and sent to the overlay and FX.
    for (const ev of this.recorder.add(events, cur)) bus.emit('match:event', ev);
  }

  private finish(): void {
    if (this.finishEmitted) return;
    this.finishEmitted = true;
    const result = this.recorder.result(this.sim);
    if (this.opts.fixture) bus.emit('match:finished', { fixture: this.opts.fixture, result });
  }
}
