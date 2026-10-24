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
import { replayRange, Runner, TICK_MS, type SimFactory } from '../core/engine';
import type { Side, SimEvent, Snapshot } from '../core/snapshot';
import { LiveSim, type LiveOptions, type PlanInput } from '../league/live';
import { MatchRecorder, type RunMatchOptions } from '../league/match';
import type { CallInput, CoachCall } from '../league/calls';
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
import { KickLayer, KickWatch, framingHeld, kickFrame, kickPoints, type Frame } from './kickLayer';
import { TRAIT_FAST_FROM, TRAIT_SLOW_FACTOR, TRAIT_SLOW_MS, TraitLayer } from './traitLayer';
import { ContestLayer } from './contestLayer';
import type { PopupView } from './popups';
import { replayFrame, replayFrom, REPLAY_WORKER_MS } from './replay';
import { toFieldPt } from '../core/field';
import { canUseWorker, playReplayInWorker } from '../../systems/matchJobs';
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
/** A kick's landing mark, skids and contest rings lie on the ground: over the shadows (−80k), under the carrier's ring (−79,998) and every sprite. Its trail is in the air, over the players and under the pop-ups. */
const DEPTH_KICK_GROUND = -79_999;
const DEPTH_KICK_AIR = DEPTH_POPUP - 2;
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
  cameras: { main: { zoom: number; worldView: { x: number; y: number; width: number; height: number } } };
  /** The sides' colours (the carrier ring's), for the kick contest's rings. */
  readonly sideColors?: Readonly<Record<Side, number>>;
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
  /** A call, a plan change, the periodic write, Save & exit, or the app going to the background. False when the write did not land. */
  onProgress?: (calls: readonly CallInput[], tick: number, plans: readonly PlanInput[]) => boolean;
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
  /** Kicks go wide (N15.3): the kick being watched, and its trail and contest. */
  private readonly kicks = new KickWatch();
  private readonly kickLayer: KickLayer;
  /** Traits you can see (N15.4): the arm, the cut, the cut-out line, the drive, the shock. */
  private readonly traits: TraitLayer;
  /** Line-break flash and the driven tackle's dust (N15.6). */
  private readonly contest: ContestLayer;
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
  /** The sim the runner plays, so a replay can build the same one from the seed. */
  private readonly factory: SimFactory;
  private readonly simOpts: LiveOptions;
  /** Half-time (and a plan card) holds the match; a replay does not resume over one. */
  private holds = 0;
  /** off, waiting on the re-sim, or playing the snaps. */
  private replayGate: 'off' | 'loading' | 'playing' = 'off';
  /** Bumped to drop a re-sim that comes back after Skip or destroy. */
  private replayGen = 0;
  private replay: { snaps: Snapshot[]; index: number; acc: number } | null = null;
  /** The replay's own kick watch: the live one only goes forward (N15.3's note). */
  private readonly replayKicks = new KickWatch();
  /** Tries that have already been offered a replay (one each). */
  private readonly replayedTries = new Set<number>();

  constructor(
    private readonly scene: LivePlaybackScene & Phaser.Scene,
    private readonly opts: LivePlaybackOptions,
  ) {
    const { home, away } = opts;
    this.plans = opts.plans ?? [];
    this.recorder = new MatchRecorder({ home: home.clubId, away: away.clubId });
    this.commentator = new Commentator(opts.seed, { home: home.name, away: away.name });
    // Exactly the sim runMatch would play: same sheets, seed, weather, injury rate, difficulty and calls.
    const simOpts: LiveOptions = { weather: opts.weather, calls: opts.calls, plans: this.plans, ...(opts.injuryRate !== undefined ? { injuryRate: opts.injuryRate } : {}), ...(opts.difficultyEdge ? { difficultyEdge: opts.difficultyEdge } : {}), ...(opts.aiCoach?.length ? { aiCoach: opts.aiCoach } : {}), ...(opts.goldenPoint ? { goldenPoint: true } : {}) };
    this.simOpts = simOpts;
    this.factory = (seed) => new LiveSim(home, away, seed, simOpts);
    // Over the kick's trail, under the pop-ups. Built before a resume steps the sim, which clears it.
    this.traits = new TraitLayer(scene, DEPTH_POPUP - 0.5);
    this.contest = new ContestLayer(scene, DEPTH_POPUP - 3);
    this.runner = new Runner(this.factory, opts.seed);
    this.runner.onEvents = (events) => this.onSimEvents(events);
    this.runner.onStep = () => {
      this.recorder.clock(this.sim.matchSeconds);
      // A kill with no pagehide loses at most one save interval (liveMatchRecord.ts).
      this.maybePersist();
      // The commentator watches the ball land: a kick picked up off the ground is a scoop, not a catch.
      this.commentator.ball(this.runner.cur.ball, this.runner.cur.tick);
      if (!this.skipping) this.kicks.tick(this.runner.cur);
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
    this.kickLayer = new KickLayer(scene, { air: DEPTH_KICK_AIR, ground: DEPTH_KICK_GROUND }, () => scene.sideColors ?? { home: 0xffffff, away: 0xffffff });
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
    this.holds++;
    this.runner.pause();
  }
  release(): void {
    this.holds = Math.max(0, this.holds - 1);
    if (this.holds === 0 && this.replayGate === 'off' && !this.finishEmitted && !this.awaitingSkip) this.runner.play();
  }

  /** Who has the ball (the chips show attack or defence calls). */
  get inPossession(): Side {
    return this.sim.inPossession;
  }

  /** The tick the match is at (for the resume record). */
  get tick(): number {
    return this.runner.tick;
  }

  /**
   * Keep the resume record up to date (the app is going to the background, or Save & exit).
   * False when the write did not land.
   */
  saveProgress(): boolean {
    return this.persistProgress();
  }

  /**
   * Save & exit can park the match. Not while Skip is waiting on the Worker:
   * that result still lands as full time, and parking as well would finish the
   * week out from under the club.
   */
  canPark(): boolean {
    return !this.finishEmitted && !this.awaitingSkip;
  }

  /** Write the record now and start the interval again from this tick. False when the write did not land. */
  private persistProgress(): boolean {
    if (this.finishEmitted) return false;
    const wrote = this.opts.onProgress?.(this.opts.calls, this.runner.tick, this.plans) ?? true;
    if (!wrote) return false;
    this.lastSavedTick = this.runner.tick;
    return true;
  }

  /**
   * While the match is actually playing (not the silent catch-up, not Skip's
   * tight loop), write the record once a save interval. A frame that steps
   * several ticks still writes on the tick that falls due.
   */
  private maybePersist(): void {
    if (this.finishEmitted || this.skipping || this.awaitingSkip) return;
    if (!liveMatchSaveDue(this.runner.tick, this.lastSavedTick)) return;
    // A failed write backs off a whole interval, so a full disk is not hit every tick.
    if (!this.persistProgress()) this.lastSavedTick = this.runner.tick;
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
    this.abortReplay();
    // A kill while Skip is away resumes here, not from the previous interval.
    this.persistProgress();
    const elsewhere = this.opts.skipElsewhere;
    if (!elsewhere) {
      this.skipHere();
      return;
    }
    this.awaitingSkip = true;
    this.skipping = true;
    this.kicks.clear();
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
    if (this.replay) {
      this.stepReplay(deltaMs);
      return;
    }
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

  /** The overlay's clock off a snapshot: match seconds and the half. */
  private showClockFrom(c: Snapshot['clock']): void {
    // Golden point (N9.4) counts its own clock.
    if (c) this.opts.overlay?.setClock(c.half > 2 ? c.seconds : (c.half - 1) * NINES.halfMinutes * 60 + c.seconds, c.half === 1 ? 1 : c.half === 2 ? 2 : 'gp');
  }

  /** The overlay's clock off the sim's: match seconds and the half. */
  private showClock(): void {
    this.showClockFrom(this.runner.cur.clock);
  }

  /** Pop-ups, the wrestle bar and sprint streaks, once the camera has moved this frame. */
  late(deltaMs: number): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;
    const feet = (side: Side, slot: number): { x: number; y: number } | null => {
      const a = this.scene.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y } : null;
    };
    // worldView is the visible rectangle. scrollX is not its left edge once the camera is zoomed (Phaser adds half the screen width, not half the world width).
    const v = cam.worldView;
    const view: PopupView = { left: v.x, top: v.y, width: v.width, height: v.height };
    this.popups.update(deltaMs, zoom, feet, view);
    this.zone.update(deltaMs);
    const kick = this.replay ? this.replayKicks.kick : this.kicks.kick;
    this.kickLayer.update(kick, deltaMs, zoom, (fx, fy) => this.scene.fieldToWorld(fx, fy), feet);
    this.traits.update(deltaMs, zoom, (fx, fy) => this.scene.fieldToWorld(fx, fy), feet, this.replay ? 1 : this.runner.speed);
    this.contest.update(deltaMs, zoom, (fx, fy) => this.scene.fieldToWorld(fx, fy), feet);
    // The picture on screen is the replay's tick, not the live match still paused underneath.
    const shown = this.replay ? this.replay.snaps[this.replay.index]! : this.runner.cur;
    this.wrestleBar.update(shown.wrestle, zoom, (w) => feet(w.side, w.slot));
    this.sprintLayer.update(shown, zoom, (side, slot) => {
      const a = this.scene.players[side][slot];
      return a ? { x: a.sprite.x, y: a.sprite.y, faceLeft: a.sprite.flipX } : null;
    });
  }

  destroy(): void {
    this.abortReplay();
    this.runner.onEvents = null;
    this.popups.destroy();
    this.wrestleBar.destroy();
    this.sprintLayer.destroy();
    this.zone.destroy();
    this.kickLayer.destroy();
    this.traits.destroy();
    this.contest.destroy();
  }

  /**
   * The framing a kick asks of the camera (N15.3): where it comes down, the kicker and
   * the top of its flight, at the widest whole-number zoom from `base` they need, while
   * it is up and for a moment after it comes down; null otherwise (the camera follows
   * the ball again).
   */
  kickFraming(view: { width: number; height: number }, base: number): Frame | null {
    if (this.replay) return null;
    const k = this.kicks.kick;
    if (!k || !this.kickLayer.active || !framingHeld(this.kickLayer.msSinceDown)) return null;
    return kickFrame(kickPoints(k, (fx, fy) => this.scene.fieldToWorld(fx, fy)), view, base);
  }

  /**
   * The replay's wider framing, centred on the ball it is showing (N15.5).
   * Null while the live match is on screen. The live kick watch is not rewound.
   */
  replayFraming(): Frame | null {
    const replay = this.replay;
    if (!replay) return null;
    const cur = replay.snaps[replay.index];
    const prev = replay.snaps[Math.max(0, replay.index - 1)];
    if (!cur || !prev) return null;
    const a = replay.index === 0 ? 0 : Math.min(0.999, replay.acc / TICK_MS);
    const f = toFieldPt({ x: prev.ball.x + (cur.ball.x - prev.ball.x) * a, y: prev.ball.y + (cur.ball.y - prev.ball.y) * a });
    const w = this.scene.fieldToWorld(f.fx, f.fy);
    return replayFrame(w);
  }

  private onSimEvents(events: readonly SimEvent[]): void {
    const cur = this.runner.cur;
    for (const e of events) {
      // A kick struck or brought down (N15.3); a skipped or resumed stretch shows none.
      if (this.skipping) {
        this.kicks.clear();
        this.traits.clear();
        this.contest.clear();
      } else {
        this.kicks.event(e, cur);
        // At ×4 and ×8 a one-second move is gone before it can be read. Ease the match; the mark also holds longer.
        if (this.traits.note(e, cur) && this.runner.speed >= TRAIT_FAST_FROM) this.runner.slowMo(TRAIT_SLOW_MS, TRAIT_SLOW_FACTOR);
        this.contest.note(e, cur);
      }
      // The ticker reads the commentator (commentary.ts). It hears a resumed or skipped stretch too, silently, so the match reads the same.
      const line = this.commentator.line(e, cur.score);
      if (line && !this.skipping) this.opts.overlay?.comment(line);
      else if (line && e.kind === 'full-time') this.finalLine = line;
      if (e.kind === 'try' && !this.skipping) this.offerTryReplay(e.tick);
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

  /** One replay per try: the button stays up for eight seconds, including after the siren. */
  private offerTryReplay(tryTick: number): void {
    if (this.replayedTries.has(tryTick)) return;
    this.replayedTries.add(tryTick);
    this.opts.overlay?.offerReplay(() => void this.beginReplay(tryTick));
  }

  /** Pause, re-simulate the eight seconds before the try, and play them at ×1. */
  private async beginReplay(tryTick: number): Promise<void> {
    // Full time does not cancel the offer: at ×8 the siren often beats the eight seconds.
    if (this.replayGate !== 'off' || this.awaitingSkip) return;
    const gen = ++this.replayGen;
    this.replayGate = 'loading';
    this.runner.pause();
    const from = replayFrom(tryTick);
    const req = { home: this.opts.home, away: this.opts.away, opts: this.simOpts, seed: this.opts.seed, from, to: tryTick };
    let snaps: Snapshot[] | null = null;
    let block = 0;
    if (canUseWorker()) {
      // The Worker's time is not main-thread block: time only the hand-off, and the fallback if it fails.
      const t0 = performance.now();
      const pending = playReplayInWorker(req, REPLAY_WORKER_MS);
      block = performance.now() - t0;
      snaps = await pending;
    } else snaps = null;
    // Skip or leaving the match bumps the generation. The siren, during the wait, does not.
    if (gen !== this.replayGen) {
      if (this.replayGate === 'loading') this.replayGate = 'off';
      return;
    }
    if (snaps === null) {
      const t1 = performance.now();
      snaps = replayRange(this.factory, this.opts.seed, from, tryTick);
      block = performance.now() - t1;
    }
    this.opts.overlay?.noteReplayBlock(block);
    if (snaps.length === 0) {
      this.replayGate = 'off';
      if (this.holds === 0 && !this.finishEmitted && !this.awaitingSkip) this.runner.play();
      return;
    }
    this.replayKicks.clear();
    this.traits.clear();
    this.popups.clear();
    this.contest.clear();
    this.replay = { snaps, index: 0, acc: 0 };
    this.feedReplay(snaps[0]!);
    this.replayGate = 'playing';
    this.opts.overlay?.setReplaying(true);
    this.showReplayPicture();
  }

  /** One replayed tick: its kicks and trait moves, on the replay's own watch. */
  private feedReplay(snap: Snapshot): void {
    for (const e of snap.events) {
      this.replayKicks.event(e, snap);
      this.traits.note(e, snap);
      this.contest.note(e, snap);
    }
    this.replayKicks.tick(snap);
  }

  /** Draw the replay's current tick and put its clock and score on the overlay. */
  private showReplayPicture(): void {
    const replay = this.replay;
    if (!replay) return;
    const cur = replay.snaps[replay.index]!;
    const prev = replay.snaps[Math.max(0, replay.index - 1)]!;
    const a = replay.index === 0 ? 0 : Math.min(0.999, replay.acc / TICK_MS);
    this.view.draw(prev, cur, a, 1);
    this.showClockFrom(cur.clock);
    if (cur.score) this.opts.overlay?.setScore(cur.score.home, cur.score.away);
  }

  /** Play the stored ticks at ×1 (real time, not the live match's speed). */
  private stepReplay(deltaMs: number): void {
    const replay = this.replay;
    if (!replay) return;
    replay.acc += deltaMs;
    while (replay.acc >= TICK_MS && replay.index < replay.snaps.length - 1) {
      replay.acc -= TICK_MS;
      replay.index++;
      this.feedReplay(replay.snaps[replay.index]!);
    }
    this.showReplayPicture();
    if (replay.index >= replay.snaps.length - 1 && replay.acc >= TICK_MS) this.endReplay();
  }

  /** Back to the live picture, the live clock and the speed the match was on. */
  private endReplay(): void {
    this.replay = null;
    this.replayKicks.clear();
    this.traits.clear();
    this.contest.clear();
    this.replayGate = 'off';
    this.opts.overlay?.setReplaying(false);
    this.opts.overlay?.showLiveScore();
    const r = this.runner;
    this.view.draw(r.prev, r.cur, r.alpha, r.playing ? r.speed : 0.001);
    this.showClock();
    if (this.holds === 0 && !this.finishEmitted && !this.awaitingSkip) this.runner.play();
  }

  /** Drop a replay (Skip, leaving the match) without starting the live clock. */
  private abortReplay(): void {
    this.replayGen++;
    const was = this.replayGate;
    this.replay = null;
    this.replayKicks.clear();
    this.replayGate = 'off';
    if (was === 'off') return;
    this.traits.clear();
    this.popups.clear();
    this.contest.clear();
    this.opts.overlay?.setReplaying(false);
    this.opts.overlay?.showLiveScore();
  }

  private finish(): void {
    if (this.finishEmitted) return;
    this.finishEmitted = true;
    const result = this.recorder.result(this.sim);
    if (this.opts.fixture) bus.emit('match:finished', { fixture: this.opts.fixture, result });
  }
}
