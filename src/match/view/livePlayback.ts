// src/match/view/livePlayback.ts — a real match played on the live sim as the
// player watches (BAK-207 §5.1 2g; coach calls #73: the match on screen is the
// match). Matchday holds the week at kick-off; this plays the sheets on the
// match seed tick by tick, records the MatchResult as it goes (MatchRecorder,
// exactly as runMatch would), takes the coach's calls, and hands the result
// over with 'match:finished' at full time. In the Match scene it drives the
// overlay, score banners, crowd and FX, the lab's pop-ups, wrestle bar and
// sprint streaks, speed buttons and Skip. Where the scene offers somewhere else to
// play (the Worker, N10.4), Skip posts the match's record (seed, sheets, calls,
// weather) there and finishes from its result, so the page never freezes; the
// match is deterministic from that record, so the result is the one playing on
// would have given.
import type Phaser from 'phaser';
import { bus } from '../../core/events';
import type { Fixture } from '../../core/state';
import type { MatchResult, TeamSheet, WeatherKind } from '../../sim/events';
import type { PlayerAnim } from '../../art/match/players';
import type { MatchOverlayHandle } from '../../ui/screens/matchOverlay';
import { Runner } from '../core/engine';
import type { Side, SimEvent } from '../core/snapshot';
import { LiveSim } from '../league/live';
import { MatchRecorder, type RunMatchOptions } from '../league/match';
import type { CallInput, CoachCall } from '../league/calls';
import type { PlanInput } from '../league/live';
import type { DifficultyEdge } from '../league/spread';
import type { TeamTactics } from '../league/presets';
import { NINES } from '../league/rules';
import { LiveView, type ViewSurface } from './liveView';
import { PopupLayer } from './popupLayer';
import { SLOWMO_FACTOR, SLOWMO_MS, popupFor } from './popups';
import { SprintLayer } from './sprintLayer';
import { WrestleBar } from './wrestleBar';
import { ZoneLayer, bonusTryEnd } from './zoneLayer';
import { Commentator } from './commentary';
import { liveMatchSaveDue } from '../../systems/liveMatchRecord';

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
/** The bonus zone's glow lies on the ground: over the field (−100k), under the shadows (−80k) and every sprite. */
const DEPTH_ZONE = -85_000;
/** What the commentary says while a skipped match is played elsewhere (N10.4). */
export const SKIPPING_TEXT = 'Skipping to full time…';

/** The rest of a match to play elsewhere: its sheets and runMatch's options (all structured-cloneable). */
export interface SkipJob {
  home: TeamSheet;
  away: TeamSheet;
  opts: RunMatchOptions;
}

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
  /** The difficulty's edge to the rival, after the rating spread (N12.2); absent on Normal. */
  difficultyEdge?: DifficultyEdge;
  calls: CallInput[];
  /** Plan changes at the breaks so far (N11); a resumed match brings its own. */
  plans?: PlanInput[];
  /** The rival's AI coach (N9.6). */
  aiCoach?: ('home' | 'away')[];
  /** A final (N9.4): golden point if level at full time. */
  goldenPoint?: boolean;
  /** A resumed match: played on silently to this tick (the overlay still counts it) before the player takes over. */
  resumeAt?: number;
  /** A call or a plan change was made, or the tick moved on a resumable match: keep the record (resume after the app is killed). */
  onProgress?: (calls: readonly CallInput[], tick: number, plans: readonly PlanInput[]) => void;
  fixture: Fixture | undefined;
  overlay: MatchOverlayHandle | null;
  /** Ease the camera back out after a big moment's close-up. */
  closeUpDone: () => void;
  /**
   * Somewhere else to play a skipped match from its record (the Worker, N10.4).
   * Absent (Node, the tests), Skip plays the rest here, as it always did.
   */
  skipElsewhere?: (job: SkipJob) => Promise<MatchResult>;
}

export class LivePlayback {
  private readonly runner: Runner;
  private readonly view: LiveView;
  private readonly popups: PopupLayer;
  private readonly wrestleBar: WrestleBar;
  private readonly sprintLayer: SprintLayer;
  private readonly zone: ZoneLayer;
  private readonly recorder: MatchRecorder;
  /** The ticker's lines (N15.2): it hears every event, said or not. */
  private readonly commentator: Commentator;
  /** The full-time line of a match skipped here, said once it is over. */
  private finalLine = '';
  private speed: PlaybackSpeed = LIVE_DEFAULT_SPEED;
  private finishEmitted = false;
  private skipping = false;
  /** Skip has posted the match elsewhere and waits for its result (N10.4). */
  private awaitingSkip = false;
  private now = 0;
  private closeupUntil = 0;
  private readonly plans: PlanInput[];
  /** Tick last written to the resume record (calls, hide, the periodic write, Save & exit). */
  private lastSavedTick = 0;

  constructor(
    private readonly scene: LivePlaybackScene & Phaser.Scene,
    private readonly opts: LivePlaybackOptions,
  ) {
    const { home, away } = opts;
    this.plans = opts.plans ?? [];
    this.recorder = new MatchRecorder({ home: home.clubId, away: away.clubId });
    this.commentator = new Commentator(opts.seed, { home: home.name, away: away.name });
    // Exactly the sim runMatch would play: same sheets, seed, weather, injury rate, difficulty and calls.
    const simOpts = { weather: opts.weather, calls: opts.calls, plans: this.plans, ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}), ...(opts.difficultyEdge ? { difficultyEdge: opts.difficultyEdge } : {}), ...(opts.aiCoach?.length ? { aiCoach: opts.aiCoach } : {}), ...(opts.goldenPoint ? { goldenPoint: true } : {}) };
    this.runner = new Runner((seed) => new LiveSim(home, away, seed, simOpts), opts.seed);
    this.runner.onEvents = (events) => this.onSimEvents(events);
    this.runner.onStep = () => {
      this.recorder.clock(this.sim.matchSeconds);
      // A kill with no pagehide loses at most one save interval (liveMatchRecord.ts).
      this.maybePersist();
      // The commentator watches the ball land: a kick picked up off the ground is a scoop, not a catch.
      this.commentator.ball(this.runner.cur.ball, this.runner.cur.tick);
    };
    this.runner.setSpeed(this.speed);
    // A resumed match plays on, silently, to where it was.
    if (opts.resumeAt) {
      this.skipping = true;
      while (!this.runner.finished && this.runner.tick < opts.resumeAt) this.runner.step();
      this.skipping = false;
    }
    // Kick-off and a resume already wrote this tick; the next write is one interval on.
    this.lastSavedTick = this.runner.tick;
    this.runner.play();
    this.view = new LiveView(scene);
    this.popups = new PopupLayer(scene, DEPTH_POPUP);
    this.wrestleBar = new WrestleBar(scene, DEPTH_POPUP);
    this.sprintLayer = new SprintLayer(scene, DEPTH_POPUP - 1);
    this.zone = new ZoneLayer(scene, DEPTH_ZONE, (fx, fy) => scene.fieldToWorld(fx, fy));
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
    if (this.finishEmitted || this.awaitingSkip) return 'full time';
    return this.sim.callRefusal(side, call);
  }

  /** The coach makes a call: it takes effect on the next tick. Returns why not, or null. */
  call(side: Side, call: CoachCall): string | null {
    const why = this.callRefusal(side, call);
    if (why) return why;
    this.opts.calls.push({ tick: this.runner.tick + 1, side, call });
    this.persistProgress();
    return null;
  }

  /** Why the coach can't change the plan now (N11: only at the breaks), or null. */
  planRefusal(): string | null {
    return this.finishEmitted || this.awaitingSkip ? 'full time' : this.sim.planRefusal();
  }

  /** The coach changes the plan: recorded for the next tick, in force from the restart (N11). Returns why not, or null. */
  setTactics(side: Side, tactics: TeamTactics): string | null {
    const why = this.planRefusal();
    if (why) return why;
    this.plans.push({ tick: this.runner.tick + 1, side, tactics: { ...tactics } });
    this.persistProgress();
    return null;
  }

  /** The plan a side plays from the restart: a change waiting for it (this tick's or the next), else the one in force. */
  planFor(side: Side): TeamTactics {
    const waiting = [...this.plans].reverse().find((p) => p.side === side && p.tick > this.runner.tick);
    return waiting ? waiting.tactics : this.sim.planFor(side);
  }

  /** The break the match is at: the half-time (or golden point) break, a score or kick-off ('try'), or neither (N11's half-time card and Plan chip). */
  get breakKind(): 'half-time' | 'try' | null {
    if (this.finishEmitted || this.awaitingSkip) return null;
    const k = this.sim.phaseKind;
    if (k === 'half-time') return 'half-time';
    return this.sim.planRefusal() === null ? 'try' : null;
  }

  /** The half being played (1, 2, then golden point). */
  get half(): number {
    return this.runner.cur.clock?.half ?? 1;
  }

  /** The score, and each side's legs on the field (0..1, BAK-208 §8): the half-time card's numbers. */
  get score(): Record<Side, number> {
    return this.runner.cur.score ?? { home: 0, away: 0 };
  }
  legs(side: Side): number {
    const on = this.runner.cur.players.filter((p) => p.side === side && p.legs !== undefined);
    return on.length ? on.reduce((a, p) => a + p.legs!, 0) / on.length : 1;
  }
  /** Calls made and paid off (#73), for the card. */
  get calls(): { made: Readonly<Record<Side, number>>; paid: Readonly<Record<Side, number>> } {
    return { made: this.sim.callsMade, paid: this.sim.callsPaid };
  }

  /** Hold the match (the half-time card is up, the coach is changing the plan), and let it go on. */
  hold(): void {
    this.runner.pause();
  }
  release(): void {
    if (!this.finishEmitted && !this.awaitingSkip) this.runner.play();
  }

  /** Who has the ball (the chips show attack or defence calls). */
  get inPossession(): Side {
    return this.sim.inPossession;
  }

  /** The tick the match is at (for the resume record). */
  get tick(): number {
    return this.runner.tick;
  }

  /** Keep the resume record up to date (the app is going to the background, or Save & exit). */
  saveProgress(): void {
    this.persistProgress();
  }

  /**
   * Save & exit can park the match. Not while Skip is waiting on the Worker:
   * that result still lands as full time, and parking as well would finish the
   * week out from under the club.
   */
  canPark(): boolean {
    return !this.finishEmitted && !this.awaitingSkip;
  }

  /** Write the record now and start the interval again from this tick. */
  private persistProgress(): void {
    if (this.finishEmitted) return;
    this.opts.onProgress?.(this.opts.calls, this.runner.tick, this.plans);
    this.lastSavedTick = this.runner.tick;
  }

  /**
   * While the match is actually playing (not the silent catch-up, not Skip's
   * tight loop), write the record once a save interval. A frame that steps
   * several ticks still writes on the tick that falls due.
   */
  private maybePersist(): void {
    if (this.finishEmitted || this.skipping || this.awaitingSkip) return;
    if (!liveMatchSaveDue(this.runner.tick, this.lastSavedTick)) return;
    this.persistProgress();
  }

  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
    this.runner.setSpeed(speed);
  }

  /**
   * Play the rest of the match at once: every event still reaches the overlay (the
   * full-time score), no pop-ups. With somewhere else to play, the match goes there
   * from its record and the screen holds on "Skipping…" until the result is back;
   * if that fails, the rest is played here.
   */
  skip(): void {
    if (this.finishEmitted || this.awaitingSkip) return;
    // A kill while Skip is away resumes here, not from the previous interval.
    this.persistProgress();
    const elsewhere = this.opts.skipElsewhere;
    if (!elsewhere) {
      this.skipHere();
      return;
    }
    this.awaitingSkip = true;
    this.skipping = true;
    this.runner.pause();
    this.opts.overlay?.comment(SKIPPING_TEXT);
    void elsewhere({ home: this.opts.home, away: this.opts.away, opts: this.runOptions() })
      .then((result) => this.finishFrom(result))
      .catch((err: unknown) => {
        console.error('the skipped match failed to come back; playing it here', err);
        this.awaitingSkip = false;
        this.skipHere();
      });
  }

  /** The match's record as runMatch options: the same sheets, seed, weather, injury rate, difficulty, calls and plan changes (N11). */
  private runOptions(): RunMatchOptions {
    const o = this.opts;
    return {
      seed: o.seed,
      weather: o.weather,
      calls: [...o.calls],
      ...(this.plans.length ? { plans: this.plans.map((p) => ({ ...p, tactics: { ...p.tactics } })) } : {}),
      ...(o.injuryRate !== undefined ? { injuryRate: o.injuryRate } : {}),
      ...(o.difficultyEdge ? { difficultyEdge: o.difficultyEdge } : {}),
      ...(o.aiCoach?.length ? { aiCoach: o.aiCoach } : {}),
      ...(o.goldenPoint ? { goldenPoint: true } : {}),
    };
  }

  /**
   * Finish from the result played elsewhere: the events still to come reach the
   * overlay (the score, the full-time whistle) in order, the call tallies are set,
   * and the result goes out with 'match:finished'.
   */
  private finishFrom(result: MatchResult): void {
    if (this.finishEmitted) return;
    for (const ev of result.events.slice(this.recorder.events.length)) bus.emit('match:event', ev);
    const golden = result.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
    // The final whistle in the ticker: the same line the match would have ended on here (the whistles hash the seed alone).
    this.opts.overlay?.comment(this.commentator.fullTime({ home: result.homeScore, away: result.awayScore }, golden));
    if (result.calls) {
      const [mh, ma] = result.calls.made;
      const [ph, pa] = result.calls.paid;
      this.opts.overlay?.setCalls?.({ home: mh, away: ma }, { home: ph, away: pa });
    }
    // The clock to full time (a golden-point final keeps the clock it had: its length isn't in the result).
    if (!golden) this.opts.overlay?.setClock(2 * NINES.halfMinutes * 60, 2);
    this.awaitingSkip = false;
    this.skipping = false;
    this.finishEmitted = true;
    if (this.opts.fixture) bus.emit('match:finished', { fixture: this.opts.fixture, result });
  }

  /** Skip on the main thread: step the sim to full time. */
  private skipHere(): void {
    if (this.finishEmitted) return;
    this.skipping = true;
    while (!this.runner.finished) this.runner.step();
    this.skipping = false;
    if (this.finalLine) this.opts.overlay?.comment(this.finalLine);
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
    // Golden point (N9.4) counts its own clock.
    if (c) this.opts.overlay?.setClock(c.half > 2 ? c.seconds : (c.half - 1) * NINES.halfMinutes * 60 + c.seconds, c.half === 1 ? 1 : c.half === 2 ? 2 : 'gp');
  }

  /** Pop-ups, the wrestle bar and sprint streaks, once the camera has moved this frame. */
  late(deltaMs: number): void {
    const zoom = this.scene.cameras.main.zoom;
    const feet = (side: Side, slot: number): { x: number; y: number } | null => {
      const a = this.scene.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y } : null;
    };
    this.popups.update(deltaMs, zoom, feet);
    this.zone.update(deltaMs);
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
    this.zone.destroy();
  }

  private onSimEvents(events: readonly SimEvent[]): void {
    const cur = this.runner.cur;
    for (const e of events) {
      // The ticker reads the commentator (commentary.ts). It hears a resumed or skipped stretch too, silently, so the match reads the same.
      const line = this.commentator.line(e, cur.score);
      if (line && !this.skipping) this.opts.overlay?.comment(line);
      else if (line && e.kind === 'full-time') this.finalLine = line;
      if (e.kind === 'coach-call' || e.kind === 'call-paid') this.opts.overlay?.setCalls?.(this.sim.callsMade, this.sim.callsPaid);
      const p = this.skipping ? null : popupFor(e);
      // A bonus try: the zone it was grounded in lights up under the pop-up (#77).
      const end = this.skipping ? null : bonusTryEnd(e, cur);
      if (end) this.zone.flash(end);
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
