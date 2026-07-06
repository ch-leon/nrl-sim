// src/scenes/MatchScene.ts — isometric rugby-league match field (BAK-189, WU-11).
//
// Static presentation only: an iso field (~30x18) with 10m stripe shading, white
// try-lines, darker in-goal areas and a halfway line; 26 kit-tinted player dots
// in loose formation lines; a ball at centre; a camera that frames the whole
// field and slow-pans following the ball's x. Event playback/animation is BAK-194
// (WU-12) and consumes the public surface documented at the bottom of this file.
//
// Textures are generated locally in create() (guarded by this.textures.exists) so
// this scene owns its assets without editing BootScene (owned by another agent
// this wave). See ARCHITECTURE.md §7 for the texture keys.
//
// Pure geometry/formation math lives in ./matchField (Phaser-free, unit-tested).
import Phaser from 'phaser';
import { TILE_W, TILE_H } from '../config';
import { gridToScreen, depth } from '../world/iso';
import { CameraController } from '../world/camera';
import { bus } from '../core/events';
import { button, mount } from '../ui/dom';
import type { TeamSheet, MatchResult } from '../sim/events';
import type { Fixture } from '../core/state';
import { PlaybackController, type PlaybackSpeed } from '../world/playback';
import { mountMatchOverlay, type MatchOverlayHandle } from '../ui/screens/matchOverlay';
import {
  FIELD_LONG,
  FIELD_WIDE,
  IN_GOAL_DEPTH,
  colorToInt,
  fieldToGrid,
  fieldToWorldPoint,
  fieldOffsetX,
  fieldWorldBounds,
  formationPositions,
  panTowards,
  tileVariantFor,
} from './matchField';

// Re-export the pure helpers so playback (BAK-194) and tests have a single import
// site alongside the scene class.
export {
  FIELD_LONG,
  FIELD_WIDE,
  IN_GOAL_DEPTH,
  STRIPE_BAND,
  PLAYERS_PER_TEAM,
  colorToInt,
  fieldToGrid,
  fieldToWorldPoint,
  fieldOffsetX,
  fieldWorldBounds,
  formationPositions,
  panTowards,
  tileVariantFor,
} from './matchField';

// Texture keys generated locally (ARCHITECTURE.md §7). Two stripe variants of
// field-tile so alternating bands read as mown grass.
const KEY_TILE_LIGHT = 'field-tile'; // §7 canonical key = the light stripe
const KEY_TILE_DARK = 'field-tile-dark';
const KEY_TILE_INGOAL = 'field-tile-ingoal';
const KEY_LINE = 'field-line';
const KEY_BALL = 'ball';
const KEY_DOT = 'player-dot';

// Palette (spec): distinct from Grounds' `tile-grass #3a7d34` via striping + lines.
const GRASS_LIGHT = 0x3f8b39;
const GRASS_DARK = 0x357a2f;
const GRASS_INGOAL = 0x28601f;
const LINE_COLOR = 0xf5f5f5;

// Iso diamond outline (2:1) in local texture space.
const DIAMOND: Phaser.Types.Math.Vector2Like[] = [
  { x: TILE_W / 2, y: 0 },
  { x: TILE_W, y: TILE_H / 2 },
  { x: TILE_W / 2, y: TILE_H },
  { x: 0, y: TILE_H / 2 },
];

const TILE_KEY = { ingoal: KEY_TILE_INGOAL, light: KEY_TILE_LIGHT, dark: KEY_TILE_DARK } as const;

export interface MatchSceneData {
  home: TeamSheet;
  away: TeamSheet;
  result: MatchResult;
  fixture?: Fixture; // carried through so `match:finished` can echo it (BAK-194)
}

/**
 * MatchScene renders the isometric match field and exposes a minimal, typed
 * public surface for WU-12 playback (see bottom of file).
 */
export class MatchScene extends Phaser.Scene {
  // ── Public surface consumed by WU-12 playback (BAK-194) ────────────────────
  /** Home player dots (length 13), tinted with home.colors[0]. */
  public readonly homeDots: Phaser.GameObjects.Image[] = [];
  /** Away player dots (length 13), tinted with away.colors[0]. */
  public readonly awayDots: Phaser.GameObjects.Image[] = [];
  /** The single ball sprite (starts at field centre). */
  public ball!: Phaser.GameObjects.Image;
  /** Home team id — consumed by PlaybackController (in-goal direction / sides). */
  public get homeId(): string {
    return this.home.clubId;
  }

  private home!: TeamSheet;
  private away!: TeamSheet;
  private result!: MatchResult;
  private fixture: Fixture | undefined;

  private offsetX = fieldOffsetX();
  private camController!: CameraController;
  private backBtn: HTMLButtonElement | null = null;

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
  }

  create(): void {
    this.generateTextures();
    this.renderField();
    this.setupCamera();
    this.spawnDots();
    this.spawnBall();
    this.mountBackButton();

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
   * Map sim field coords (fx 0-100 length, fy 0-100 width) to Phaser world x/y.
   * Public — WU-12 playback positions sprites through this. `fieldToWorld(0,50)`
   * and `fieldToWorld(100,50)` land on opposite try-line ends.
   */
  fieldToWorld(fx: number, fy: number): { x: number; y: number } {
    return fieldToWorldPoint(fx, fy, this.offsetX);
  }

  /** Depth for a sprite sitting on the field at the given field coords. */
  fieldDepth(fx: number, fy: number, layer = 1): number {
    const { gx, gy } = fieldToGrid(fx, fy);
    return depth(gx, gy, layer);
  }

  update(_time: number, delta: number): void {
    // Advance playback (fires due events, moves sprites) before panning so the
    // camera follows the freshly-tweened ball this frame.
    if (this.playback) this.playback.update(delta);

    // Slow auto-pan: ease camera scrollX toward the ball's world x. The
    // controller's clamp keeps the view inside world bounds; roundPixels (global
    // config) avoids shimmering.
    if (!this.ball) return;
    const cam = this.cameras.main;
    const targetX = this.ball.x - cam.width / 2 / cam.zoom;
    cam.setScroll(panTowards(cam.scrollX, targetX), cam.scrollY);
  }

  // ── Texture generation (local; guarded against duplicate keys) ─────────────
  private generateTextures(): void {
    this.makeTile(KEY_TILE_LIGHT, GRASS_LIGHT);
    this.makeTile(KEY_TILE_DARK, GRASS_DARK);
    this.makeTile(KEY_TILE_INGOAL, GRASS_INGOAL);
    this.makeLine();
    this.makeBall();
    this.makeDot();
  }

  private makeTile(key: string, fill: number): void {
    if (this.textures.exists(key)) return;
    const gfx = this.add.graphics();
    gfx.fillStyle(fill, 1);
    gfx.fillPoints(DIAMOND, true);
    // Faint darker edge so tile seams read in iso.
    gfx.lineStyle(1, 0x000000, 0.12);
    gfx.strokePoints(DIAMOND, true, true);
    gfx.generateTexture(key, TILE_W, TILE_H);
    gfx.destroy();
  }

  /** A thin white diamond overlay used for try-lines and the halfway line. */
  private makeLine(): void {
    if (this.textures.exists(KEY_LINE)) return;
    const gfx = this.add.graphics();
    gfx.lineStyle(3, LINE_COLOR, 0.95);
    gfx.strokePoints(DIAMOND, true, true);
    gfx.generateTexture(KEY_LINE, TILE_W, TILE_H);
    gfx.destroy();
  }

  /** A small tan football (near-white body so any later tint reads true). */
  private makeBall(): void {
    if (this.textures.exists(KEY_BALL)) return;
    const gfx = this.add.graphics();
    const r = 4;
    gfx.fillStyle(0x2a1a10, 1);
    gfx.fillEllipse(r + 1, r + 1, r * 2 + 2, r * 2 - 1);
    gfx.fillStyle(0xe8d8b0, 1); // tan football
    gfx.fillEllipse(r + 1, r + 1, r * 2, r * 2 - 3);
    gfx.generateTexture(KEY_BALL, r * 2 + 2, r * 2 + 2);
    gfx.destroy();
  }

  /** Near-white round dot so setTint shows the true kit colour (spec risk). */
  private makeDot(): void {
    if (this.textures.exists(KEY_DOT)) return;
    const gfx = this.add.graphics();
    const r = 6;
    gfx.fillStyle(0x111111, 1);
    gfx.fillCircle(r + 1, r + 1, r + 1); // dark outline for contrast
    gfx.fillStyle(0xf2f2f2, 1); // near-white body (tint target)
    gfx.fillCircle(r + 1, r + 1, r);
    gfx.generateTexture(KEY_DOT, (r + 1) * 2, (r + 1) * 2);
    gfx.destroy();
  }

  // ── Field render ───────────────────────────────────────────────────────────
  private renderField(): void {
    for (let gy = 0; gy < FIELD_WIDE; gy++) {
      for (let gx = 0; gx < FIELD_LONG; gx++) {
        const p = gridToScreen(gx, gy);
        const img = this.add.image(p.x + this.offsetX, p.y, TILE_KEY[tileVariantFor(gx)]);
        img.setOrigin(0.5, 0); // diamond top vertex anchors at the projected point
        img.setDepth(depth(gx, gy));
      }
    }
    this.renderLines();
  }

  /** White line overlays: a try-line at each in-goal edge + the halfway line. */
  private renderLines(): void {
    const lineCols = [
      IN_GOAL_DEPTH, // near try-line
      FIELD_LONG - 1 - IN_GOAL_DEPTH, // far try-line
      Math.floor(FIELD_LONG / 2), // halfway
    ];
    for (const gx of lineCols) {
      for (let gy = 0; gy < FIELD_WIDE; gy++) {
        const p = gridToScreen(gx, gy);
        const img = this.add.image(p.x + this.offsetX, p.y, KEY_LINE);
        img.setOrigin(0.5, 0);
        img.setDepth(depth(gx, gy, 0.5)); // just above the floor tile, below sprites
      }
    }
  }

  // ── Sprites ────────────────────────────────────────────────────────────────
  private spawnDots(): void {
    const homeTint = colorToInt(this.home.colors[0]);
    const awayTint = colorToInt(this.away.colors[0]);
    // Home attacks right (toward far try-line); away attacks left.
    this.placeTeam(this.homeDots, formationPositions(true), homeTint);
    this.placeTeam(this.awayDots, formationPositions(false), awayTint);
  }

  private placeTeam(
    into: Phaser.GameObjects.Image[],
    formation: { fx: number; fy: number }[],
    tint: number,
  ): void {
    for (const spot of formation) {
      const w = this.fieldToWorld(spot.fx, spot.fy);
      const dot = this.add.image(w.x, w.y, KEY_DOT);
      dot.setOrigin(0.5, 0.5);
      dot.setTint(tint);
      dot.setDepth(this.fieldDepth(spot.fx, spot.fy, 1));
      into.push(dot);
    }
  }

  private spawnBall(): void {
    const w = this.fieldToWorld(50, 50);
    this.ball = this.add.image(w.x, w.y, KEY_BALL);
    this.ball.setOrigin(0.5, 0.5);
    this.ball.setDepth(this.fieldDepth(50, 50, 2));
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  private setupCamera(): void {
    this.camController = new CameraController(this, { world: fieldWorldBounds(this.offsetX) });
    // Centre on the field initially so the whole thing is framed before panning.
    const b = fieldWorldBounds(this.offsetX);
    this.cameras.main.centerOn(b.x + b.width / 2, b.y + b.height / 2);
  }

  // ── DOM playback controls (speed ×1/×2/×4 + Skip) ────────────────────────────
  private mountPlaybackControls(): void {
    const wrap = document.createElement('div');
    wrap.className = 'nrl-mo-controls';
    wrap.style.position = 'fixed';
    wrap.style.left = '50%';
    wrap.style.bottom = '0.5rem';
    wrap.style.transform = 'translateX(-50%)';
    wrap.style.zIndex = '20';
    wrap.style.display = 'flex';
    wrap.style.gap = '0.35rem';
    wrap.style.pointerEvents = 'auto';

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
    btn.style.left = '0.5rem';
    btn.style.bottom = '0.5rem';
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SURFACE FOR WU-12 PLAYBACK (BAK-194):
//   scene.fieldToWorld(fx, fy): { x, y }   — sim field coords -> Phaser world.
//   scene.fieldDepth(fx, fy, layer?): number — depth for a sprite at field coords.
//   scene.homeDots: Image[13]              — home kit-tinted dots.
//   scene.awayDots: Image[13]              — away kit-tinted dots.
//   scene.ball: Image                      — ball sprite (centre at kickoff).
// Pure helpers (re-exported from ./matchField for headless tests / tween math):
//   FIELD_LONG, FIELD_WIDE, IN_GOAL_DEPTH, STRIPE_BAND, PLAYERS_PER_TEAM,
//   colorToInt, fieldToGrid, fieldToWorldPoint, fieldOffsetX, fieldWorldBounds,
//   formationPositions, panTowards, tileVariantFor.
// ─────────────────────────────────────────────────────────────────────────────
