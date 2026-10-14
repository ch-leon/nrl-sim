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
import { bus } from '../core/events';
import { button, mount } from '../ui/dom';
import type { TeamSheet, MatchResult, MatchEvent } from '../sim/events';
import type { Fixture } from '../core/state';
import {
  PlaybackController,
  type PlaybackActor,
  type PlaybackBall,
  type PlaybackSpeed,
} from '../world/playback';
import { PLAYERS } from '../world/formation';
import { mountMatchOverlay, type MatchOverlayHandle } from '../ui/screens/matchOverlay';
import { attachMatchFx } from '../fx/particles';
import { resolveKits } from '../art/match/kit';
import { BASE_Y, CENTER_X, FRAME_H, FRAME_W, lookForSlot, type PlayerAnim } from '../art/match/players';
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
import { fieldToWorldPoint, fieldOffsetX, panTowards } from './matchField';

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
const DEPTH_CROWD_FRONT = 60_000;

/** Default match zoom: players read clearly, ~half the pitch in view. */
const MATCH_ZOOM = 1.5;
/** Crowd animation tick (real ms). */
const CROWD_TICK_MS = 220;

export interface MatchSceneData {
  home: TeamSheet;
  away: TeamSheet;
  result: MatchResult;
  fixture?: Fixture; // carried through so `match:finished` can echo it (BAK-194)
}

/** A player sprite + ground shadow, driven through PlaybackActor. */
class MatchActor implements PlaybackActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly atlas: string;
  private readonly look: number;
  private current = '';

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

/** The ball sprite + its ground shadow (shown while in the air). */
class MatchBall implements PlaybackBall {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  /** Ground position — what the camera follows. */
  gx = 0;
  gy = 0;

  constructor(scene: Phaser.Scene, key: string, shadowKey: string) {
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(DEPTH_SHADOW + 1);
    this.sprite = scene.add.image(0, 0, key).setOrigin(0.5, 1);
  }

  place(x: number, y: number, lift: number, depth: number): void {
    this.gx = x;
    this.gy = y;
    this.sprite.setPosition(x, y - lift + 2).setDepth(depth);
    this.shadow.setPosition(x, y).setVisible(lift > 3);
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
  public get homeId(): string {
    return this.home.clubId;
  }

  private home!: TeamSheet;
  private away!: TeamSheet;
  private result!: MatchResult;
  private fixture: Fixture | undefined;

  private readonly offsetX = fieldOffsetX();
  private art!: MatchArtRegistry;
  private camController!: CameraController;
  private backBtn: HTMLButtonElement | null = null;

  // Crowd.
  private crowdBobs: { bob: Phaser.GameObjects.Bob; seat: CrowdSeat; shirt: number; look: number; side: 'home' | 'away' | null }[] = [];
  private crowdTick = 0;
  private mood: CrowdMood = { home: 0, away: 0 };
  private moodUntil = { home: 0, away: 0 };
  private offCrowd: (() => void) | null = null;

  // ── WU-12 playback + overlay ──────────────────────────────────────────────
  private playback: PlaybackController | null = null;
  private overlay: MatchOverlayHandle | null = null;
  private controlsEl: HTMLDivElement | null = null;
  private speedButtons: HTMLButtonElement[] = [];
  private finished = false;

  constructor() {
    super('Match'); // scene key per ARCHITECTURE.md §7
  }

  init(data: MatchSceneData): void {
    this.home = data.home;
    this.away = data.away;
    this.result = data.result;
    this.fixture = data.fixture;
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
    for (let i = 0; i < PLAYERS; i++) {
      this.players.home.push(new MatchActor(this, homeAtlas, lookForSlot(i), props.shadow));
      this.players.away.push(new MatchActor(this, awayAtlas, lookForSlot(i + 5), props.shadow));
    }
    this.ball = new MatchBall(this, props.ball, props.ballShadow);
    const centre = this.fieldToWorld(50, 50);
    this.ball.place(centre.x, centre.y, 0, centre.y + 2);

    this.setupCamera();
    this.mountBackButton();
    // Publish sheets for the crowd emitters' kit tints (read by attachMatchFx).
    this.data.set('home', this.home);
    this.data.set('away', this.away);
    attachMatchFx(this); // BAK-201: pooled try/big-hit/crowd particle FX (WU-14)

    // WU-12: overlay first (subscribes to 'match:event'/'match:finished'), then
    // the playback controller which re-emits the event stream on a compressed
    // clock. Both are presentation-only (never mutate GameState).
    this.startPlayback();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private startPlayback(): void {
    if (this.result) {
      this.overlay = mountMatchOverlay({ home: this.home, away: this.away, result: this.result });
      this.playback = new PlaybackController(this, this.result, this.fixture);
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

    // Slow auto-pan toward the ball; Phaser clamps scroll to the camera bounds
    // and roundPixels (global config) avoids shimmering.
    if (!this.ball) return;
    const cam = this.cameras.main;
    const tx = this.ball.gx - cam.width / 2;
    const ty = this.ball.gy - cam.height / 2;
    cam.setScroll(panTowards(cam.scrollX, tx, 0.03), panTowards(cam.scrollY, ty, 0.03));
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
    cam.setZoom(MATCH_ZOOM);
    const c = this.fieldToWorld(50, 50);
    cam.centerOn(c.x, c.y);
  }

  // ── DOM playback controls (speed ×1/×2/×4 + Skip) ────────────────────────────
  private mountPlaybackControls(): void {
    const wrap = document.createElement('div');
    // Positioned by the overlay stylesheet (bottom-centre; the nav bar is hidden
    // while the match overlay is up — including full-time — so nothing sits
    // underneath).
    wrap.className = 'nrl-mo-controls';

    const speeds: PlaybackSpeed[] = [1, 2, 4];
    this.speedButtons = speeds.map((s) => {
      const b = button(`×${s}`, () => this.setSpeed(s));
      if (s === 1) b.setAttribute('data-active', 'true');
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
    const labels: Record<number, string> = { 1: '×1', 2: '×2', 4: '×4' };
    for (const b of this.speedButtons) {
      b.toggleAttribute('data-active', b.textContent === labels[speed]);
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
    btn.style.bottom = this.result ? '0.5rem' : '3.25rem';
    btn.style.zIndex = '20';
    // If no result was provided (defensive), keep the classic fallback visible.
    btn.style.display = this.result ? 'none' : '';
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
    if (!this.finished && this.fixture) {
      bus.emit('match:finished', { fixture: this.fixture, result: this.result });
    }
    this.scene.start('Grounds');
  }

  private teardown(): void {
    this.camController.destroy();
    bus.off('match:finished', this.onFinished);
    this.offCrowd?.();
    this.offCrowd = null;
    this.overlay?.destroy();
    this.overlay = null;
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
