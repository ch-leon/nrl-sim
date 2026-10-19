// src/scenes/MatchScene.ts — isometric rugby-league match day (BAK-189, WU-11;
// playback/overlay WU-12).
//
// Presentation only. Builds a generated pixel-art stadium (src/art/match/*):
// a mown field with full markings, H goalposts, hoardings, a grandstand, a hill
// and near terraces full of bobbing spectators in both teams' colours; 26
// palette-swapped animated players with ground shadows; and a ball. The
// PlaybackController (src/world/playback.ts) drives the players from the
// MatchResult event log; this scene only provides sprites through the
// structural PlaybackActor/PlaybackBall interfaces and keeps the camera on the
// ball.
//
// Depth convention (ARCHITECTURE §7): depth = world (screen) y of a thing's
// ground contact + layer. Static layers sit outside the field's y range:
//   BG (field, back stands)  < back crowd < shadows < players/posts/ball (y+1)
//   < particles (10 000) < FG near terraces < front crowd.
//
// Pure geometry lives in ./matchField and src/art/match (Phaser-free, tested).
import Phaser from 'phaser';
import { CameraController } from '../world/camera';
import { zoomForViewport } from '../world/viewport';
import { bus } from '../core/events';
import { button, mount } from '../ui/dom';
import type { TeamSheet, MatchResult, MatchEvent, WeatherKind } from '../sim/events';
import type { Fixture } from '../core/state';
import {
  PlaybackController,
  PLAYBACK_SPEEDS,
  slotRoster,
  slotSpeeds,
  type PlaybackActor,
  type PlaybackBall,
  type PlaybackSpeed,
} from '../world/playback';
import { PLAYERS } from '../world/formation';
import { mountMatchOverlay, type MatchOverlayHandle } from '../ui/screens/matchOverlay';
import { LivePlayback, LIVE_DEFAULT_SPEED } from '../match/view/livePlayback';
import { NINES } from '../match/league/rules';
import type { LiveMatchData } from '../core/events';
import { attachMatchFx } from '../fx/particles';
import { attachMatchAtmosphere } from '../fx/atmosphere';
import { resolveKits } from '../art/match/kit';
import { BASE_Y, CENTER_X, FRAME_H, FRAME_W, lookForPlayer, lookForSlot, type PlayerAnim } from '../art/match/players';
import {
  CROSSBAR_Z,
  POST_GX,
  POST_GY,
  cameraWorldBounds,
  crowdSeats,
  paintBackground,
  paintForeground,
  type CrowdSeat,
} from '../art/match/stadium';
import { CROSSBAR_AX, CROSSBAR_AY, UPRIGHT_H, UPRIGHT_W } from '../art/match/props';
import {
  CROWD_BASE,
  CROWD_FW,
  crowdFrameName,
  crowdPose,
  lookForSeat,
  shirtForSeat,
  shirtSide,
  type CrowdMood,
} from '../art/match/crowd';
import { isoProject } from '../art/match/iso3d';
import { MatchArtRegistry, playerAnimKey } from './matchArt';
import {
  NAME_TAG_MS,
  ZOOM_DEFAULT,
  easeZoom,
  zoomForEvent,
  type NameTag,
  type TeamSide,
} from '../world/readability';
import {
  fieldToWorldPoint,
  fieldOffsetX,
  panTowards,
  PAN_MAX_PX_PER_MS,
  PAN_RATE_PER_S,
} from './matchField';

// Re-export the pure helpers so tests and playback have a single import site.
export {
  FIELD_LONG,
  FIELD_WIDE,
  IN_GOAL_DEPTH,
  PLAYERS_PER_TEAM,
  colorToInt,
  fieldToGrid,
  fieldToWorldPoint,
  fieldOffsetX,
  fieldWorldBounds,
  panTowards,
} from './matchField';

// Static layer depths (see header).
const DEPTH_BG = -100_000;
const DEPTH_CROWD_BACK = -90_000;
const DEPTH_SHADOW = -80_000;
const DEPTH_FG = 50_000;
/** Name tags sit above the light map and crowd FX (70–72k), below weather (80k). */
const DEPTH_TAG = 73_000;
const DEPTH_CROWD_FRONT = 60_000;

/** Default match zoom (#17): a player stands ~36px tall at 1280×800. Eases
 *  tighter/wider per beat (see world/readability). */
const MATCH_ZOOM = ZOOM_DEFAULT;
/** Name tag sits this many world px above a player's feet (just over his head). */
const TAG_LIFT = 26;
/** Ghost balls trailing a kicked ball. */
const TRAIL_LEN = 5;
/** A flight must rise this high (world px) before it counts as a kick and gets a trail. */
const TRAIL_MIN_LIFT = 30;
/** Crowd animation tick (real ms). */
const CROWD_TICK_MS = 220;

export interface MatchSceneData {
  home: TeamSheet;
  away: TeamSheet;
  /** Absent in the match lab (BAK-207), which drives the sprites itself. */
  result?: MatchResult;
  fixture?: Fixture; // carried through so `match:finished` can echo it (BAK-194)
  /** The weather when there is no result to take it from (the match lab, 2f). */
  weather?: WeatherKind;
  /** Live match (BAK-207 2g, coach calls #73): played on the live sim as the player watches; the result comes at full time. */
  live?: LiveMatchData;
}

/** A player sprite + ground shadow, driven through PlaybackActor. */
export class MatchActor implements PlaybackActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly atlas: string;
  private look: number;
  private current = '';
  /** Whose look this is (live sim: a slot's player changes at an interchange). */
  private wearing: string | null = null;

  constructor(scene: Phaser.Scene, atlas: string, look: number, shadowKey: string) {
    this.atlas = atlas;
    this.look = look;
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(DEPTH_SHADOW);
    this.sprite = scene.add.sprite(0, 0, atlas, `${look}-idle-0`);
    this.sprite.setOrigin((CENTER_X + 0.5) / FRAME_W, (BASE_Y + 1) / FRAME_H);
  }

  place(x: number, y: number, depth: number): void {
    this.sprite.setPosition(x, y).setDepth(depth);
    this.shadow.setPosition(x, y);
  }

  /** Wear a player's own look (#21) by squad id or name; the next play() switches the sprite to it. */
  wear(who: string): void {
    if (who === this.wearing) return;
    this.wearing = who;
    this.look = lookForPlayer(who);
    this.current = '';
  }

  play(anim: PlayerAnim, faceLeft: boolean, timeScale: number): void {
    const key = playerAnimKey(this.atlas, this.look, anim);
    if (key !== this.current) {
      this.current = key;
      this.sprite.play(key);
    }
    this.sprite.setFlipX(faceLeft);
    this.sprite.anims.timeScale = timeScale;
  }
}

/** The ball sprite + its ground shadow (shown while in the air) + flight trail. */
export class MatchBall implements PlaybackBall {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly trail: Phaser.GameObjects.Image[] = [];
  private readonly recent: { x: number; y: number }[] = [];
  /** This flight has gone high enough to be a kick (trail shown). */
  private highFlight = false;
  /** Ground position — what the camera follows. */
  gx = 0;
  gy = 0;

  constructor(scene: Phaser.Scene, key: string, shadowKey: string) {
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(DEPTH_SHADOW + 1);
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
    for (let i = 0; i < TRAIL_LEN; i++) {
      this.trail.push(scene.add.image(0, 0, key).setOrigin(0.5, 1).setVisible(false));
    }
  }

  place(x: number, y: number, lift: number, depth: number): void {
    this.gx = x;
    this.gy = y;
    const sy = y - lift + 2;
    this.sprite.setPosition(x, sy).setDepth(depth);
    this.shadow.setPosition(x, y).setVisible(lift > 3);
    // Short trail while a KICK is in the air: fading ghosts of its last spots.
    // Passes stay low and short; a trail on them just reads as blur (BAK-207).
    if (lift <= 3) this.highFlight = false;
    else if (lift > TRAIL_MIN_LIFT) this.highFlight = true;
    const flying = lift > 3 && this.highFlight;
    const last = this.recent[this.recent.length - 1];
    if (!flying || (last && Math.hypot(x - last.x, sy - last.y) > 400)) this.recent.length = 0;
    if (flying && (!last || Math.hypot(x - last.x, sy - last.y) >= 4)) {
      this.recent.push({ x, y: sy });
      if (this.recent.length > TRAIL_LEN) this.recent.shift();
    }
    this.trail.forEach((g, i) => {
      const p = this.recent[this.recent.length - 2 - i];
      if (!flying || !p) return void g.setVisible(false);
      g.setPosition(p.x, p.y).setDepth(depth - 0.01).setAlpha(0.5 - i * 0.09).setScale(1 - i * 0.12).setVisible(true);
    });
  }
}

/**
 * MatchScene renders the stadium and exposes the PlaybackScene surface
 * (fieldToWorld, players, ball, cameras, homeId) to the PlaybackController.
 */
export class MatchScene extends Phaser.Scene {
  // ── Public surface consumed by playback (structural PlaybackScene) ─────────
  public readonly players: { home: MatchActor[]; away: MatchActor[] } = { home: [], away: [] };
  public ball!: MatchBall;
  /** Readability hooks driven by playback (#17): name tags + carrier ring. */
  public readonly focus = {
    tag: (t: NameTag): void => this.showTag(t),
    carrier: (t: { side: TeamSide; x: number; y: number } | null): void => this.moveMarker(t),
  };
  public get homeId(): string {
    return this.home.clubId;
  }

  private home!: TeamSheet;
  private away!: TeamSheet;
  private result: MatchResult | undefined;
  private fixture: Fixture | undefined;
  private weather: WeatherKind | undefined;

  private readonly offsetX = fieldOffsetX();
  private art!: MatchArtRegistry;
  private camController!: CameraController;
  protected backBtn: HTMLButtonElement | null = null;

  // Crowd.
  private crowdBobs: { bob: Phaser.GameObjects.Bob; seat: CrowdSeat; shirt: number; look: number; side: 'home' | 'away' | null }[] = [];
  private crowdTick = 0;
  private mood: CrowdMood = { home: 0, away: 0 };
  private moodUntil = { home: 0, away: 0 };
  private offCrowd: (() => void) | null = null;
  private offZoom: (() => void) | null = null;

  // Readability (#17).
  private tagText: Phaser.GameObjects.Text | null = null;
  private tagActor: MatchActor | null = null;
  private tagUntil = 0;
  private marker: Phaser.GameObjects.Ellipse | null = null;
  private markerColors: Record<TeamSide, number> = { home: 0xffffff, away: 0xffffff };
  protected zoomTarget = MATCH_ZOOM;
  /** Authored (desktop) zoom for the current beat; zoomTarget is this scaled for the viewport. */
  protected beatZoom = MATCH_ZOOM;
  private onResize = (): void => {
    this.zoomTarget = this.viewZoom(this.beatZoom);
    if (this.autoZoom !== null) this.autoZoom = this.cameras.main.zoom;
  };
  /** Zoom this scene last set; a mismatch means the player zoomed by hand. */
  private autoZoom: number | null = MATCH_ZOOM;

  // ── WU-12 playback + overlay ──────────────────────────────────────────────
  private playback: PlaybackController | LivePlayback | null = null;
  private live: LiveMatchData | undefined;
  private overlay: MatchOverlayHandle | null = null;
  private controlsEl: HTMLDivElement | null = null;
  private speedButtons: HTMLButtonElement[] = [];
  private finished = false;

  constructor(key = 'Match') {
    super(key); // scene key per ARCHITECTURE.md §7; the lab subclasses with its own
  }

  init(data: MatchSceneData): void {
    this.home = data.home;
    this.away = data.away;
    this.result = data.result;
    this.fixture = data.fixture;
    this.weather = data.result?.weather ?? data.weather;
    this.live = data.live;
    this.players.home = [];
    this.players.away = [];
    this.crowdBobs = [];
    this.finished = false;
  }

  create(): void {
    this.art = new MatchArtRegistry(this);
    const kits = resolveKits(this.home, this.away);

    // Static stadium layers.
    this.art.layer('match-bg', paintBackground(this.offsetX, kits.home, kits.away), DEPTH_BG);
    this.art.layer('match-fg', paintForeground(this.offsetX, kits.home, kits.away), DEPTH_FG);
    const props = this.art.props('match', kits.home);
    this.spawnPosts(props.upright, props.crossbar);
    this.spawnCrowd(this.art.crowd('match-crowd', kits.home, kits.away));

    // Players + ball.
    const homeAtlas = this.art.players(`pl-${this.home.clubId}`, kits.home);
    const awayAtlas = this.art.players(`pl-${this.away.clubId}${kits.awayAlt ? '-alt' : ''}`, kits.away);
    const homeSlots = slotRoster(this.home.roster);
    const awaySlots = slotRoster(this.away.roster);
    for (let i = 0; i < PLAYERS; i++) {
      // #21: each slot wears its player's own look (stable across matches);
      // a slot with no named player falls back to the slot cycle.
      const h = homeSlots[i];
      const a = awaySlots[i];
      const homeLook = h ? lookForPlayer(h.id ?? h.name) : lookForSlot(i);
      const awayLook = a ? lookForPlayer(a.id ?? a.name) : lookForSlot(i + 5);
      this.players.home.push(new MatchActor(this, homeAtlas, homeLook, props.shadow));
      this.players.away.push(new MatchActor(this, awayAtlas, awayLook, props.shadow));
    }
    this.ball = new MatchBall(this, props.ball, props.ballShadow);
    this.markerColors = { home: kits.home.jersey, away: kits.away.jersey };
    this.marker = this.add.ellipse(0, 0, 22, 11).setStrokeStyle(2, 0xffffff, 0.95).setFillStyle(0xffffff, 0.22).setVisible(false);
    this.marker.setDepth(DEPTH_SHADOW + 2); // above the ground shadows, under every sprite
    this.tagText = this.add
      .text(0, 0, '', {
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(16,16,28,0.82)',
        padding: { x: 4, y: 1 },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_TAG)
      .setVisible(false);
    const centre = this.fieldToWorld(50, 50);
    this.ball.place(centre.x, centre.y, 0, centre.y + 2);

    this.setupCamera();
    this.mountBackButton();
    // Publish sheets for the crowd emitters' kit tints (read by attachMatchFx).
    this.data.set('home', this.home);
    this.data.set('away', this.away);
    attachMatchFx(this); // BAK-201: pooled try/big-hit/crowd particle FX (WU-14)
    // GitHub #16: rain/wind, dusk/night lighting (per fixture), stand reactions.
    attachMatchAtmosphere(this, { weather: this.weather, fixture: this.fixture });

    // WU-12: overlay first (subscribes to 'match:event'/'match:finished'), then
    // the playback controller which re-emits the event stream on a compressed
    // clock. Both are presentation-only (never mutate GameState).
    this.startPlayback();
    this.offZoom = bus.on('match:event', (ev) => {
      this.beatZoom = zoomForEvent(ev.kind);
      this.zoomTarget = this.viewZoom(this.beatZoom);
    });
    // #18: rotating / resizing re-derives the zoom for the new viewport; the
    // CameraController re-clamps scroll on the same event.
    this.scale.on('resize', this.onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private startPlayback(): void {
    if (this.live) {
      // Live match (2g): the overlay reads Nines halves and the sim's running clock.
      const live = this.live;
      this.overlay = mountMatchOverlay({ home: this.home, away: this.away, weather: live.weather, seed: live.seed, halfMinutes: NINES.halfMinutes });
      this.playback = new LivePlayback(this, {
        home: this.home,
        away: this.away,
        seed: live.seed,
        weather: live.weather,
        ...(live.injuryRate !== undefined ? { injuryRate: live.injuryRate } : {}),
        calls: live.calls ?? [],
        ...(live.resumeAt ? { resumeAt: live.resumeAt } : {}),
        ...(live.onProgress ? { onProgress: live.onProgress } : {}),
        fixture: this.fixture,
        overlay: this.overlay,
        closeUpDone: () => {
          this.beatZoom = ZOOM_DEFAULT;
          this.zoomTarget = this.viewZoom(ZOOM_DEFAULT);
        },
      });
      this.mountPlaybackControls(LIVE_DEFAULT_SPEED);
      bus.on('match:finished', this.onFinished);
      // A phone may kill the app in the background: keep where the match is (#73).
      document.addEventListener('visibilitychange', this.onHidden);
      window.addEventListener('pagehide', this.onHidden);
    } else if (this.result) {
      this.overlay = mountMatchOverlay({ home: this.home, away: this.away, result: this.result });
      // #20: each slot runs at its player's pace (team-sheet speed stats).
      this.playback = new PlaybackController(this, this.result, this.fixture, {
        speeds: { home: slotSpeeds(this.home.roster), away: slotSpeeds(this.away.roster) },
      });
      this.mountPlaybackControls();
      // 'match:finished' (fired by playback at full-time or on skip) reveals the
      // Back-to-Club button and swaps the controls out.
      bus.on('match:finished', this.onFinished);
    }
  }

  /**
   * Map sim field coords (fx 0-100 try-line to try-line, fy 0-100 width) to
   * Phaser world x/y. `fieldToWorld(0,50)` and `fieldToWorld(100,50)` land on
   * the two try-lines.
   */
  fieldToWorld(fx: number, fy: number): { x: number; y: number } {
    return fieldToWorldPoint(fx, fy, this.offsetX);
  }

  update(_time: number, delta: number): void {
    // Advance playback (fires due events, steps sprites) before panning so the
    // camera follows the freshly-moved ball this frame.
    if (this.playback) this.playback.update(delta);

    this.updateReadability(delta);

    // Slow auto-pan toward the ball; Phaser clamps scroll to the camera bounds
    // and roundPixels (global config) avoids shimmering.
    if (!this.ball) return;
    const cam = this.cameras.main;
    const tx = this.ball.gx - cam.width / 2;
    const ty = this.ball.gy - cam.height / 2;
    // Frame-rate independent; the speed cap scales with ×2/×4 playback.
    const maxPx = PAN_MAX_PX_PER_MS * (this.playback?.getSpeed() ?? 1);
    cam.setScroll(
      panTowards(cam.scrollX, tx, delta, PAN_RATE_PER_S, maxPx),
      panTowards(cam.scrollY, ty, delta, PAN_RATE_PER_S, maxPx),
    );
    // A live match's pop-ups and bars sit over the sprites where the camera now has them.
    if (this.playback instanceof LivePlayback) this.playback.late(delta);
  }

  // ── Readability (#17): name tag, carrier ring, situational zoom ───────────
  private showTag(t: NameTag): void {
    const actor = this.players[t.side][t.slot];
    if (!actor || !this.tagText) return;
    this.tagActor = actor;
    this.tagUntil = this.time.now + NAME_TAG_MS;
    this.tagText.setText(t.text.toUpperCase());
  }

  private moveMarker(t: { side: TeamSide; x: number; y: number } | null): void {
    if (!this.marker) return;
    if (!t) {
      this.marker.setVisible(false);
      return;
    }
    const c = this.markerColors[t.side];
    this.marker.setStrokeStyle(2, c, 0.95).setFillStyle(c, 0.3).setPosition(t.x, t.y).setVisible(true);
  }

  private updateReadability(delta: number): void {
    const cam = this.cameras.main;
    if (this.tagText) {
      const a = this.tagActor;
      if (a && this.time.now < this.tagUntil) {
        // Pinned above the sprite's head, counter-scaled so it stays screen-sized.
        this.tagText
          .setScale(1 / cam.zoom)
          .setPosition(a.sprite.x, a.sprite.y - TAG_LIFT)
          .setVisible(true);
      } else {
        this.tagText.setVisible(false);
        this.tagActor = null;
      }
    }
    // Ease toward this beat's zoom unless the player has taken over (wheel/pinch).
    if (this.autoZoom !== null) {
      if (Math.abs(cam.zoom - this.autoZoom) > 0.01) {
        this.autoZoom = null;
      } else {
        cam.setZoom(easeZoom(cam.zoom, this.zoomTarget, delta));
        this.autoZoom = cam.zoom;
      }
    }
  }

  // ── Stadium pieces ─────────────────────────────────────────────────────────
  private spawnPosts(uprightKey: string, crossbarKey: string): void {
    for (const gx of POST_GX) {
      const a = isoProject(gx, POST_GY[0], 0, this.offsetX);
      const b = isoProject(gx, POST_GY[1], 0, this.offsetX);
      for (const p of [a, b]) {
        this.add
          .image(p.x, p.y, uprightKey)
          .setOrigin((Math.floor(UPRIGHT_W / 2) + 0.5) / UPRIGHT_W, (UPRIGHT_H - 1) / UPRIGHT_H)
          .setDepth(p.y + 1);
      }
      // Crossbar: its A end pinned to upright A at crossbar height; sorts at the
      // midpoint between the two uprights' bases.
      this.add
        .image(a.x - CROSSBAR_AX + 0.5, a.y - CROSSBAR_Z - CROSSBAR_AY, crossbarKey)
        .setOrigin(0, 0)
        .setDepth((a.y + b.y) / 2 + 1);
    }
  }

  private spawnCrowd(atlas: string): void {
    const back = this.add.blitter(0, 0, atlas).setDepth(DEPTH_CROWD_BACK);
    const front = this.add.blitter(0, 0, atlas).setDepth(DEPTH_CROWD_FRONT);
    const seats = crowdSeats()
      .map((seat) => ({ seat, w: isoProject(seat.gx, seat.gy, seat.z, this.offsetX) }))
      .sort((p, q) => p.w.y - q.w.y); // bobs draw in insertion order → y-sorted
    for (const { seat, w } of seats) {
      const shirt = shirtForSeat(seat);
      const look = lookForSeat(seat);
      const blitter = seat.layer === 'back' ? back : front;
      const bob = blitter.create(
        Math.round(w.x - Math.floor(CROWD_FW / 2)),
        Math.round(w.y - CROWD_BASE),
        crowdFrameName(shirt, look, seat.view, 0),
      );
      this.crowdBobs.push({ bob, seat, shirt, look, side: shirtSide(shirt) });
    }
    this.time.addEvent({ delay: CROWD_TICK_MS, loop: true, callback: () => this.animateCrowd() });
    this.offCrowd = bus.on('match:event', (ev) => this.crowdReact(ev));
  }

  /** Raise a side's excitement for a while (decays on the crowd tick). */
  private hype(side: 'home' | 'away', level: number, ms: number): void {
    this.mood[side] = Math.max(this.mood[side], level);
    this.moodUntil[side] = Math.max(this.moodUntil[side], this.time.now + ms);
  }

  private crowdReact(ev: MatchEvent): void {
    const side = ev.teamId === this.home.clubId ? 'home' : 'away';
    switch (ev.kind) {
      case 'try':
        this.hype(side, 0.95, 3200);
        break;
      case 'conversion':
        if (ev.detail !== 'missed') this.hype(side, 0.7, 1800);
        break;
      case 'penalty-goal':
      case 'field-goal':
        this.hype(side, 0.7, 1800);
        break;
      case 'break':
        this.hype(side, 0.35, 1200);
        break;
      case 'big-hit':
        this.hype(side, 0.3, 900);
        break;
      case 'full-time': {
        if (!this.result) break;
        const { homeScore, awayScore } = this.result;
        if (homeScore !== awayScore) this.hype(homeScore > awayScore ? 'home' : 'away', 0.9, 60_000);
        break;
      }
      default:
        break;
    }
  }

  private animateCrowd(): void {
    this.crowdTick++;
    for (const s of ['home', 'away'] as const) {
      if (this.time.now > this.moodUntil[s]) this.mood[s] = Math.max(0, this.mood[s] - 0.2);
    }
    for (const c of this.crowdBobs) {
      const pose = crowdPose(c.seat.r, c.side, this.crowdTick, this.mood);
      c.bob.setFrame(crowdFrameName(c.shirt, c.look, c.seat.view, pose));
    }
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  private setupCamera(): void {
    this.camController = new CameraController(this, { world: cameraWorldBounds(this.offsetX), minZoom: 0.75, maxZoom: 2.5 });
    const cam = this.cameras.main;
    this.beatZoom = MATCH_ZOOM;
    this.zoomTarget = this.viewZoom(MATCH_ZOOM);
    cam.setZoom(this.zoomTarget);
    this.autoZoom = this.zoomTarget;
    const c = this.fieldToWorld(50, 50);
    cam.centerOn(c.x, c.y);
  }

  // ── DOM playback controls (speed ×1/×2/×4/×8 + Skip) ────────────────────────────
  private mountPlaybackControls(start: PlaybackSpeed = 1): void {
    const wrap = document.createElement('div');
    // Positioned by the overlay stylesheet (bottom-centre; the nav bar is hidden
    // while the match overlay is up — including full-time — so nothing sits
    // underneath).
    wrap.className = 'nrl-mo-controls';

    this.speedButtons = PLAYBACK_SPEEDS.map((s) => {
      const b = button(`×${s}`, () => this.setSpeed(s));
      if (s === start) b.setAttribute('data-active', 'true');
      wrap.append(b);
      return b;
    });

    const skip = button('Skip', () => this.playback?.skip());
    wrap.append(skip);

    this.controlsEl = wrap;
    mount(wrap);
  }

  private setSpeed(speed: PlaybackSpeed): void {
    this.playback?.setSpeed(speed);
    for (const b of this.speedButtons) {
      b.toggleAttribute('data-active', b.textContent === `×${speed}`);
    }
  }

  // ── DOM return button (shown only at full-time) ──────────────────────────────
  private mountBackButton(): void {
    // Hidden until full-time; before then, playback + Skip drive the flow.
    const btn = button('Back to Club', () => this.exitToGrounds());
    btn.style.position = 'fixed';
    // Bottom-centre, taking the playback controls' slot at full-time: the
    // match overlay keeps the HUD/nav hidden until this is pressed (#14). The
    // no-result fallback has no overlay, so it clears the visible nav instead.
    btn.style.left = '50%';
    btn.style.transform = 'translateX(-50%)';
    const playing = this.result !== undefined || this.live !== undefined;
    btn.style.bottom = playing ? '0.5rem' : '3.25rem';
    btn.style.zIndex = '20';
    // If no result was provided (defensive), keep the classic fallback visible.
    btn.style.display = playing ? 'none' : '';
    this.backBtn = btn;
    mount(btn);
  }

  /** On full-time: reveal Back-to-Club, remove the playback controls. */
  private onFinished = (): void => {
    if (this.finished) return;
    this.finished = true;
    if (this.backBtn) this.backBtn.style.display = '';
    if (this.controlsEl) {
      this.controlsEl.remove();
      this.controlsEl = null;
    }
  };

  private exitToGrounds(): void {
    // Playback owns the single 'match:finished' emission; if it never fired
    // (e.g. no result / early exit before full-time), emit the fallback here.
    if (!this.finished && this.fixture && this.result) {
      bus.emit('match:finished', { fixture: this.fixture, result: this.result });
    }
    this.scene.start('Grounds');
  }

  protected viewZoom(base: number): number {
    return zoomForViewport(base, { width: this.cameras.main.width, height: this.cameras.main.height });
  }

  /** The app is going to the background: a live match records where it is (#73). */
  private onHidden = (e: Event): void => {
    if ((e.type === 'pagehide' || document.visibilityState === 'hidden') && this.playback instanceof LivePlayback) this.playback.saveProgress();
  };

  private teardown(): void {
    document.removeEventListener('visibilitychange', this.onHidden);
    window.removeEventListener('pagehide', this.onHidden);
    this.scale.off('resize', this.onResize);
    this.camController.destroy();
    bus.off('match:finished', this.onFinished);
    this.offCrowd?.();
    this.offCrowd = null;
    this.offZoom?.();
    this.offZoom = null;
    this.tagText = null;
    this.tagActor = null;
    this.marker = null;
    this.overlay?.destroy();
    this.overlay = null;
    if (this.playback instanceof LivePlayback) this.playback.destroy();
    this.playback = null;
    if (this.controlsEl) {
      this.controlsEl.remove();
      this.controlsEl = null;
    }
    this.speedButtons = [];
    if (this.backBtn) {
      this.backBtn.remove(); // DOM overlay persists across scenes (§7) — clean it up.
      this.backBtn = null;
    }
    // Game objects are destroyed by the scene; free the per-fixture textures
    // and animations once they are no longer displayed.
    this.crowdBobs = [];
    this.players.home = [];
    this.players.away = [];
    // Deferred a tick so the scene has finished destroying its game objects.
    const art = this.art;
    setTimeout(() => art.destroy(), 0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SURFACE FOR PLAYBACK (structural PlaybackScene, src/world/playback.ts):
//   scene.fieldToWorld(fx, fy): { x, y }   — sim field coords -> Phaser world.
//   scene.players.home / .away: PlaybackActor[ON_FIELD] — animated player sprites.
//   scene.ball: PlaybackBall              — ball sprite + shadow.
//   scene.cameras.main.shake(...)          — tackle / big-hit shake.
//   scene.homeId                           — which side an event's teamId is.
// ─────────────────────────────────────────────────────────────────────────────
