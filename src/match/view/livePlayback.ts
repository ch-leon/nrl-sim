// src/match/view/livePlayback.ts — a real match watched on the live sim
// (BAK-207 §5.1 2g). Matchday has already played the match headless with
// runMatch for the result; this plays the same sheets on the same seed again,
// tick by tick, so what the player watches is what was recorded. It stands in
// the Match scene where the event-log replay (world/playback.ts) does for the
// classic engine: the same overlay, score banners, crowd and FX (fed the same
// 'match:event' stream runMatch reported), the lab's pop-ups, wrestle bar and
// sprint streaks, speed buttons and Skip, and 'match:finished' at full time.
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Fixture } from '../../core/state';
import type { MatchResult, TeamSheet } from '../../sim/events';
import type { PlaybackSpeed } from '../../world/playback';
import type { MatchOverlayHandle } from '../../ui/screens/matchOverlay';
import { Runner } from '../core/engine';
import type { Side, SimEvent } from '../core/snapshot';
import { toMatchEvent } from '../league/events';
import { LiveSim } from '../league/live';
import { NINES } from '../league/rules';
import { LiveView, type ViewSurface } from './liveView';
import { PopupLayer } from './popupLayer';
import { SLOWMO_FACTOR, SLOWMO_MS, popupFor } from './popups';
import { SprintLayer } from './sprintLayer';
import { WrestleBar } from './wrestleBar';

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
  /** The seed and injury rate matchday gave runMatch; the weather is the result's. */
  seed: number;
  injuryRate?: number;
  result: MatchResult;
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
  private readonly ids: Record<Side, string>;
  private speed: PlaybackSpeed = LIVE_DEFAULT_SPEED;
  private finishEmitted = false;
  private skipping = false;
  private now = 0;
  private closeupUntil = 0;

  constructor(
    private readonly scene: LivePlaybackScene & Phaser.Scene,
    private readonly opts: LivePlaybackOptions,
  ) {
    const { home, away, result } = opts;
    this.ids = { home: home.clubId, away: away.clubId };
    // Exactly the sim runMatch played: same sheets, seed, weather and injury rate.
    const simOpts = { weather: result.weather, ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}) };
    this.runner = new Runner((seed) => new LiveSim(home, away, seed, simOpts), opts.seed);
    this.runner.onEvents = (events) => this.onSimEvents(events);
    this.runner.setSpeed(this.speed);
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
      const p = this.skipping ? null : popupFor(e);
      if (p && e.side !== undefined && e.slot !== undefined) {
        this.popups.show(p, e.side, e.slot);
        if (p.big) {
          this.runner.slowMo(SLOWMO_MS, SLOWMO_FACTOR);
          this.closeupUntil = this.now + CLOSEUP_MS;
        }
      }
      // The same conversion runMatch made, so the overlay counts what the result says.
      const ev = toMatchEvent(e, cur, this.ids);
      if (ev) bus.emit('match:event', ev);
    }
  }

  private finish(): void {
    if (this.finishEmitted) return;
    this.finishEmitted = true;
    const pts = this.runner.cur.score;
    const { result } = this.opts;
    if (pts && (pts.home !== result.homeScore || pts.away !== result.awayScore)) {
      console.warn(`live match: watched ${pts.home}–${pts.away}, recorded ${result.homeScore}–${result.awayScore} (seed ${this.opts.seed})`);
    }
    if (this.opts.fixture) bus.emit('match:finished', { fixture: this.opts.fixture, result });
  }
}
