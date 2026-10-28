// src/scenes/MatchScene.ts — isometric rugby-league match day (BAK-189, WU-11;
// playback/overlay WU-12).
//
// Presentation only. Builds a generated pixel-art stadium (src/art/match/*):
// a mown field with full markings, H goalposts, hoardings, a grandstand, a hill
// and near terraces full of bobbing spectators in both teams' colours; 26
// palette-swapped animated players with ground shadows; and a ball.
// LivePlayback (src/match/view/livePlayback.ts) plays the match on the live sim
// (BAK-207) and drives the players; this scene only provides sprites through the
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
import { button, getRoot, mount } from '../ui/dom';
import { MATCH_NOT_SAVED_TEXT, MATCH_SAVED_TEXT, SKIPPING_EXIT_TEXT } from '../ui/hud';
import type { TeamSheet, MatchEvent, WeatherKind } from '../sim/events';
import { getState, setState, type Fixture } from '../core/state';
import { CALL_TILE, SKIP_ARM_MS, callCaption, callEffect, callForRole, callsHintSeasoned, callsLockedHint, callsUnlockLine, coachBadge, cssHex, matchSettingsOpener, mountMatchOverlay, showMatchSheet, showPlanCard, trayCallsOn, trayHidden, trayRows, type MatchOverlayHandle, type PlanCardHandle, type TrayButton } from '../ui/screens/matchOverlay';
import { setFullTimeExit, shortName } from '../ui/screens/matchReport';
import { styleLine } from '../ui/tacticsBlurbs';
import {
  LivePlayback,
  keyMomentsOn,
  playbackSpeedOf,
  PLAYBACK_SPEEDS,
  type PlaybackActor,
  type PlaybackBall,
  type PlaybackSpeed,
} from '../match/view/livePlayback';
import { KICK_BACK_PER_S, KICK_OUT_PER_S, KICK_PAN_MAX_PX_PER_MS, KICK_RETURN_MS, cameraFrame, type Frame } from '../match/view/kickLayer';
import { NINES } from '../match/league/rules';
import { ON_FIELD } from '../config';
import type { LiveMatchData } from '../core/events';
import { CALL_LABEL, CALL_RESULT_MS, COACH_CALLS, callIsBench, callIsKickoff, callIsPenalty, callResultText, unlockLevel, type CallVerdict, type CoachCall } from '../match/league/calls';
import { runMatch } from '../match/league/match';
import { canUseWorker, playMatchesInWorker } from '../systems/matchJobs';

import { attachMatchFx } from '../fx/particles';
import { attachMatchAtmosphere } from '../fx/atmosphere';
import { RING_STYLES, resolveKits, type RingStyle } from '../art/match/kitClash';
import { drawRing } from '../match/view/rings';
import { teamLetters, teamLettersOn, teamTags } from '../ui/teamTag';
import { BASE_Y, CENTER_X, FRAME_H, FRAME_W, lookForPlayer, lookForSlot, type PlayerAnim } from '../art/match/players';
import {
  CROSSBAR_Z,
  POST_GX,
  POST_GY,
  cameraWorldBounds,
  crowdSeats,
  type CrowdSeat,
} from '../art/match/stadium';
import { fixtureArtKey, fixtureArtPieces, paintFixtureArt, type FixtureArt } from '../art/match/fixtureArt';
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
import { fixtureArtFor, takeFixtureArt } from './matchArtAhead';
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
/** The in-match labels (name tag, "Kick-off…") in the HUD's label face (Broadcast Quiet). */
const MATCH_LABEL_FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
/** On screen while a live match waits for its art to be painted or uploaded (N10.5). */
export const KICK_OFF_TEXT = 'Kick-off…';

/** The next animation frame. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
/** A flight must rise this high (world px) before it counts as a kick and gets a trail. */
const TRAIL_MIN_LIFT = 30;
/** Crowd animation tick (real ms). */
const CROWD_TICK_MS = 220;
/** Width (world px) of the team ring under every player (#340); the carrier's ring is 22. */
const TEAM_RING_W = 15;
const CARRIER_RING_W = 22;

export interface MatchSceneData {
  home: TeamSheet;
  away: TeamSheet;
  fixture?: Fixture; // carried through so `match:finished` can echo it (BAK-194)
  /** The match lab's weather (2f); a real match takes it from `live`. */
  weather?: WeatherKind;
  /** The match (BAK-207, coach calls #73): played on the live sim as the player watches; the result comes at full time. Absent in the match lab, which drives the sprites itself. */
  live?: LiveMatchData;
}

/** A player sprite + ground shadow + team ring, driven through PlaybackActor. */
export class MatchActor implements PlaybackActor {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  /** The side's ring at his feet (#340): which team he is on, whatever the kits; solid or dashed by side (#371). */
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly atlas: string;
  private look: number;
  private current = '';
  /** Whose look this is (live sim: a slot's player changes at an interchange). */
  private wearing: string | null = null;

  constructor(scene: Phaser.Scene, atlas: string, look: number, shadowKey: string, ringColor: number, ringStyle: RingStyle) {
    this.atlas = atlas;
    this.look = look;
    this.shadow = scene.add.image(0, 0, shadowKey).setDepth(DEPTH_SHADOW);
    this.ring = scene.add.graphics().setDepth(DEPTH_SHADOW + 0.5);
    // #371: away's dashed ring is open (a faint fill), home's filled, so the two differ in shape twice over.
    drawRing(this.ring, 0, 0, TEAM_RING_W, TEAM_RING_W / 2, ringStyle, { color: ringColor, width: 1.5, alpha: 0.9, fillAlpha: ringStyle === 'solid' ? 0.28 : 0.1 });
    this.sprite = scene.add.sprite(0, 0, atlas, `${look}-idle-0`);
    this.sprite.setOrigin((CENTER_X + 0.5) / FRAME_W, (BASE_Y + 1) / FRAME_H);
  }

  place(x: number, y: number, depth: number): void {
    this.sprite.setPosition(x, y).setDepth(depth);
    this.shadow.setPosition(x, y);
    this.ring.setPosition(x, y);
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
 * (fieldToWorld, players, ball, cameras, homeId) to LivePlayback.
 */
/** How long the Worker gets for a skipped match before it is played here (ms): about 1–2 s on a phone. */
const SKIP_WORKER_TIMEOUT_MS = 30_000;

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
  /** The sides' colours (the carrier ring's), for the kick contest's rings (N15.3). */
  public get sideColors(): Readonly<Record<TeamSide, number>> {
    return this.markerColors;
  }

  private home!: TeamSheet;
  private away!: TeamSheet;
  private fixture: Fixture | undefined;
  private weather: WeatherKind | undefined;

  private readonly offsetX = fieldOffsetX();
  private art!: MatchArtRegistry;
  /** The stadium and players are up (N10.5: a live match may wait a moment for its art). */
  private built = false;
  /** Bumped on each wait and on shutdown (teardown), so art that arrives late builds nothing. */
  private buildToken = 0;
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
  private marker: Phaser.GameObjects.Graphics | null = null;
  /** Team letters on players (#371, a setting, off by default): each man's side letter over his head. */
  private letters: { actor: MatchActor; text: Phaser.GameObjects.Text }[] = [];
  /** The side the carrier's ring is drawn for (redrawn only when it changes hands). */
  private markerSide: TeamSide | null = null;
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
  /** A kick in the air: where the camera holds and at what zoom (N15.3), or null to follow the ball. */
  private kickFrame: Frame | null = null;
  /** Until this loop time the camera eases back from a kick's framing at the quick rate; whether it is doing so this frame. */
  private kickBackUntil = 0;
  private kickBack = false;

  // ── WU-12 playback + overlay ──────────────────────────────────────────────
  private playback: LivePlayback | null = null;
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
    this.fixture = data.fixture;
    this.weather = data.live?.weather ?? data.weather;
    this.live = data.live;
    this.players.home = [];
    this.players.away = [];
    this.crowdBobs = [];
    this.finished = false;
    this.built = false;
    // Phaser keeps this scene between matches: the last match's half-time sheet must
    // not count for this one, or no half-time card shows after a session's first match (#408).
    this.planCardHalf = 0;
    // …nor the last match's call: the badge read it as made from the kick-off, until this
    // match's ticks passed the tick it was made on, and never offered a call (#431).
    this.madeCall = null;
    this.madeAt = 0;
  }

  create(): void {
    this.art = new MatchArtRegistry(this);
    const kits = resolveKits(this.home, this.away);
    // N10.5 (#154): the stadium, crowd and kit atlases were painted ahead, in the art
    // worker, after last week, and uploaded in idle slices: this only places them. Not
    // ready (the first match of a session, a kit just changed): a live match shows
    // "Kick-off…" while the worker finishes and the rest goes up a texture a frame, so
    // the tap that started it returns at once; the lab paints here.
    const fixtureKitsNow = { home: kits.home, away: kits.away };
    const key = fixtureArtKey(this.offsetX, fixtureKitsNow);
    const art = takeFixtureArt(key);
    if (!this.live || (art && fixtureArtPieces(art).every((p) => p.texKey))) {
      this.build(kits, art ?? paintFixtureArt(this.offsetX, fixtureKitsNow));
      return;
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    const beat = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, KICK_OFF_TEXT, { fontFamily: MATCH_LABEL_FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', resolution: 2 })
      .setOrigin(0.5)
      .setScrollFactor(0);
    const token = ++this.buildToken;
    // Shutdown bumps the token (teardown). Not isActive(): inside create() the scene
    // is still CREATING, so it reads false and the match would never build.
    const live = (): boolean => token === this.buildToken;
    void (async () => {
      const painted = art ?? (await fixtureArtFor(this.offsetX, fixtureKitsNow));
      if (!live()) return;
      takeFixtureArt(painted.key);
      this.art.adopt(fixtureArtPieces(painted)); // freed by teardown even if we never build
      // What didn't go up during the week goes up one texture a frame (a ×4 phone
      // spends about 50–100 ms on each), so no frame freezes; then the match.
      let n = 0;
      for (const piece of fixtureArtPieces(painted)) {
        if (piece.texKey) continue;
        await nextFrame();
        if (!live()) return;
        piece.texKey = this.art.texture(`kick-off-${n++}`, piece.buf);
      }
      await nextFrame();
      if (!live()) return;
      beat.destroy();
      this.build(kits, painted, false);
    })();
  }

  /** Build the stadium, players and playback from the fixture's painted art. */
  private build(kits: ReturnType<typeof resolveKits>, art: FixtureArt, ownTeardown = true): void {
    // Static stadium layers.
    this.art.layer(art.bg, DEPTH_BG);
    this.art.layer(art.fg, DEPTH_FG);
    const props = this.art.props('match', kits.home);
    this.spawnPosts(props.upright, props.crossbar);
    this.spawnCrowd(this.art.crowd('match-crowd', art.crowd));

    // Players + ball.
    const homeAtlas = this.art.players(`pl-${this.home.clubId}`, art.home);
    const awayAtlas = this.art.players(`pl-${this.away.clubId}${kits.awayStrip === 'home' ? '' : `-${kits.awayStrip}`}`, art.away);
    for (let i = 0; i < ON_FIELD; i++) {
      // #21: each slot wears its player's own look (stable across matches);
      // a slot with no named player falls back to the slot cycle. The live view
      // re-dresses a slot when an interchange puts someone new in it.
      const h = this.home.roster?.[i];
      const a = this.away.roster?.[i];
      const homeLook = h ? lookForPlayer(h.id ?? h.name) : lookForSlot(i);
      const awayLook = a ? lookForPlayer(a.id ?? a.name) : lookForSlot(i + 5);
      this.players.home.push(new MatchActor(this, homeAtlas, homeLook, props.shadow, kits.rings.home, kits.ringStyles.home));
      this.players.away.push(new MatchActor(this, awayAtlas, awayLook, props.shadow, kits.rings.away, kits.ringStyles.away));
    }
    this.ball = new MatchBall(this, props.ball, props.ballShadow);
    this.markerColors = { home: kits.rings.home, away: kits.rings.away };
    this.marker = this.add.graphics().setVisible(false);
    this.markerSide = null;
    this.marker.setDepth(DEPTH_SHADOW + 2); // above the ground shadows, under every sprite
    this.tagText = this.add
      .text(0, 0, '', {
        fontFamily: MATCH_LABEL_FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: 'rgba(14,22,48,0.85)',
        padding: { x: 5, y: 1 },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_TAG)
      .setVisible(false);
    const centre = this.fieldToWorld(50, 50);
    this.ball.place(centre.x, centre.y, 0, centre.y + 2);

    this.setupCamera();
    this.mountBackButton();
    if (ownTeardown) this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.built = true;
    // A live match starts its effects and playback on the next frame (N10.5), so the
    // frame that placed the stadium stays short on a phone; the lab starts at once.
    if (!this.live) {
      this.startMatch();
      return;
    }
    const token = this.buildToken;
    void nextFrame().then(() => {
      if (token === this.buildToken) this.startMatch();
    });
  }

  /** The effects, atmosphere and playback, over the stadium build() placed. */
  private startMatch(): void {
    // Publish sheets for the crowd emitters' kit tints (read by attachMatchFx).
    this.data.set('home', this.home);
    this.data.set('away', this.away);
    attachMatchFx(this); // BAK-201: pooled try/big-hit/crowd particle FX (WU-14)
    // GitHub #16: rain/wind, dusk/night lighting (per fixture), stand reactions.
    attachMatchAtmosphere(this, { weather: this.weather, fixture: this.fixture });

    // WU-12: overlay first (subscribes to 'match:event'/'match:finished'), then
    // the live playback, which plays the match and emits its events as they happen.
    this.startPlayback();
    this.offZoom = bus.on('match:event', (ev) => {
      this.beatZoom = zoomForEvent(ev.kind);
      this.zoomTarget = this.viewZoom(this.beatZoom);
    });
    // #18: rotating / resizing re-derives the zoom for the new viewport; the
    // CameraController re-clamps scroll on the same event.
    this.scale.on('resize', this.onResize);
  }

  private startPlayback(): void {
    if (this.live) {
      // The overlay reads Nines halves and the sim's running clock.
      const live = this.live;
      this.overlay = mountMatchOverlay({
        home: this.home,
        away: this.away,
        weather: live.weather,
        halfMinutes: NINES.halfMinutes,
        worn: { home: cssHex(this.markerColors.home), away: cssHex(this.markerColors.away) },
        ...(live.coachSide ?? live.planSide ? { mine: live.coachSide ?? live.planSide } : {}),
      });
      this.playback = new LivePlayback(this, {
        home: this.home,
        away: this.away,
        seed: live.seed,
        weather: live.weather,
        ...(live.injuryRate !== undefined ? { injuryRate: live.injuryRate } : {}),
        ...(live.difficultyEdge ? { difficultyEdge: live.difficultyEdge } : {}),
        calls: live.calls ?? [],
        ...(live.plans ? { plans: live.plans } : {}),
        ...(live.aiCoach?.length ? { aiCoach: live.aiCoach } : {}),
        ...(live.breakRuleSides?.length ? { breakRuleSides: live.breakRuleSides } : {}),
        ...(live.goldenPoint ? { goldenPoint: true } : {}),
        ...(live.resumeAt ? { resumeAt: live.resumeAt } : {}),
        ...(live.onProgress ? { onProgress: live.onProgress } : {}),
        fixture: this.fixture,
        overlay: this.overlay,
        // N10.4: Skip plays the rest in the Worker, from the match's record, so the page doesn't freeze.
        ...(canUseWorker()
          ? { skipElsewhere: (job) => playMatchesInWorker([job], SKIP_WORKER_TIMEOUT_MS, 'skip').then(([r]) => r ?? runMatch(job.home, job.away, job.opts)) }
          : {}),
        closeUpDone: () => {
          this.beatZoom = ZOOM_DEFAULT;
          this.zoomTarget = this.viewZoom(ZOOM_DEFAULT);
        },
        speed: this.rememberedSpeed(),
        keyMoments: () => this.keyMomentsOn(),
        onCallResult: (v) => this.showCallResult(v),
      });
      this.mountPlaybackControls(this.playback.getSpeed());
      if (live.coachSide) {
        const unlocked = live.unlockedCalls ?? COACH_CALLS;
        this.mountCoach(live.coachSide, unlocked);
        // One ticker line when a club with a season behind it is short of calls (N9.6, #224). Not the calls row, and not week 2 of a new club.
        const club = getState();
        const hint = callsLockedHint(unlocked.length, COACH_CALLS.length, callsHintSeasoned(club.season, club.history.length));
        if (hint) this.overlay?.comment(hint);
      }
      if (live.planSide) this.mountPlanChip(live.planSide);
      bus.on('match:finished', this.onFinished);
      // The full-time card's Back to Club (matchReport.ts) leaves through this scene.
      setFullTimeExit(() => this.exitToGrounds());
      // A phone may kill the app in the background: keep where the match is (#73).
      document.addEventListener('visibilitychange', this.onHidden);
      window.addEventListener('pagehide', this.onHidden);
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

  update(time: number, delta: number): void {
    if (!this.built) return; // "Kick-off…": the art is still being painted (N10.5)
    // Advance playback (fires due events, steps sprites) before panning so the
    // camera follows the freshly-moved ball this frame.
    if (this.playback) this.playback.update(delta);
    // A kick goes wide (N15.3): the camera holds the kicker and where the ball comes down
    // while it is up, then comes back to the ball within a second of the catch or the bounce.
    const cam0 = this.cameras.main;
    // A try's replay (N15.5) frames the ball wide, ahead of a kick's own framing.
    const replayFrame = this.playback?.replayFraming() ?? null;
    const kick = this.playback?.kickFraming({ width: cam0.width, height: cam0.height }, this.zoomTarget) ?? null;
    // A pinch or a wheel has the camera: a kick does not pan it off the ball (note 10).
    this.kickFrame = cameraFrame(replayFrame, kick, this.autoZoom === null);
    if (this.kickFrame) this.kickBackUntil = time + KICK_RETURN_MS;
    this.kickBack = !this.kickFrame && time < this.kickBackUntil;
    // The coach's badge and tray follow the play a few times a second (#73), and at once
    // when the ball changes hands on screen (#348): at ×8 a sixth of a second is two seconds of play.
    this.showSlowed();
    const ball = this.playback instanceof LivePlayback ? this.playback.inPossession : null;
    if ((this.coachBtn || this.planBtn) && (time - this.chipsAt > 150 || ball !== this.chipsBall)) {
      this.chipsAt = time;
      this.chipsBall = ball;
      this.refreshCallChips();
      this.refreshPlan();
    }

    this.updateReadability(delta);

    // Slow auto-pan toward the ball; Phaser clamps scroll to the camera bounds
    // and roundPixels (global config) avoids shimmering.
    if (!this.ball) return;
    const cam = this.cameras.main;
    const kf = this.kickFrame;
    const tx = (kf ? kf.cx : this.ball.gx) - cam.width / 2;
    const ty = (kf ? kf.cy : this.ball.gy) - cam.height / 2;
    // Frame-rate independent; the speed cap scales with ×2/×4 playback. Going out to a
    // kick and back the ease alone sets the pace, so the return takes under a second at ×1 too.
    const kicking = kf !== null || this.kickBack;
    const maxPx = kicking ? KICK_PAN_MAX_PX_PER_MS : PAN_MAX_PX_PER_MS * (this.playback?.getSpeed() ?? 1);
    const rate = kf ? KICK_OUT_PER_S : this.kickBack ? KICK_BACK_PER_S : PAN_RATE_PER_S;
    cam.setScroll(panTowards(cam.scrollX, tx, delta, rate, maxPx), panTowards(cam.scrollY, ty, delta, rate, maxPx));
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
    if (t.side !== this.markerSide) {
      this.markerSide = t.side;
      this.marker.clear();
      drawRing(this.marker, 0, 0, CARRIER_RING_W, CARRIER_RING_W / 2, RING_STYLES[t.side], { color: this.markerColors[t.side], width: 2, alpha: 0.95, fillAlpha: 0.3 });
    }
    this.marker.setPosition(t.x, t.y).setVisible(true);
  }

  /** #371: the side's letter (its tag's first, or H and A) over every player, screen-sized like the name tag; or none. */
  private setLetters(on: boolean): void {
    for (const l of this.letters) l.text.destroy();
    this.letters = [];
    if (!on) return;
    const letters = teamLetters(teamTags(this.home.name, this.away.name));
    for (const side of ['home', 'away'] as const) {
      const letter = side === 'home' ? letters[0] : letters[1];
      for (const actor of this.players[side]) {
        const text = this.add
          .text(0, 0, letter, { fontFamily: MATCH_LABEL_FONT, fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: 'rgba(14,22,48,0.7)', padding: { x: 3, y: 0 }, resolution: 2 })
          .setOrigin(0.5, 1)
          .setDepth(DEPTH_TAG - 1);
        this.letters.push({ actor, text });
      }
    }
  }

  private updateReadability(delta: number): void {
    const cam = this.cameras.main;
    // Team letters follow the Settings switch, the pause sheet's included; off in the lab, which has no save.
    const lettersOn = teamLettersOn(() => getState().settings);
    if (this.built && lettersOn !== this.letters.length > 0) this.setLetters(lettersOn);
    for (const { actor, text } of this.letters) {
      // The name tag takes the letter's place over its man while it shows.
      const show = actor.sprite.visible && actor !== this.tagActor;
      text.setVisible(show);
      if (show) text.setScale(1 / cam.zoom).setPosition(actor.sprite.x, actor.sprite.y - TAG_LIFT);
    }
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
    // Ease toward this beat's zoom, or a kick's (N15.3), unless the player has taken over (wheel/pinch).
    if (this.autoZoom !== null) {
      if (Math.abs(cam.zoom - this.autoZoom) > 0.01) {
        this.autoZoom = null;
      } else {
        const kf = this.kickFrame;
        const rate = kf ? KICK_OUT_PER_S : this.kickBack ? KICK_BACK_PER_S : undefined;
        cam.setZoom(easeZoom(cam.zoom, kf ? kf.zoom : this.zoomTarget, delta, rate));
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

  // ── The speed pill (3m): pause, 1×/2×/4×/8×, SKIP, in the overlay's bottom row ──
  private mountPlaybackControls(start: PlaybackSpeed = 1): void {
    const pill = document.createElement('div');
    pill.className = 'nrl-mo-controls';
    pill.setAttribute('role', 'group');
    pill.setAttribute('aria-label', 'Playback');
    // Skip to full time and Save & exit also wait behind the pause (#348 M3).
    const pause = button('❚❚', () => this.openPauseSheet(), { class: 'nrl-mo-pause' });
    pause.setAttribute('aria-label', 'Pause');
    pause.setAttribute('data-pause', '');
    pill.append(pause);
    this.speedButtons = PLAYBACK_SPEEDS.map((s) => {
      const b = button(`${s}×`, () => this.setSpeed(s), { class: 'nrl-mo-speed' });
      b.dataset.speed = String(s);
      b.setAttribute('aria-label', `Speed ×${s}`);
      pill.append(b);
      return b;
    });
    this.markSpeed(start);
    const divider = document.createElement('span');
    divider.className = 'nrl-mo-pill-div';
    // SKIP has no undo and sits a finger's width from 8× (#348 M3): the first tap
    // arms it, the second goes. The live sim can only skip to full time (no break in between).
    const skip = button('Skip ▸▸', () => this.tapSkip(skip), { class: 'nrl-mo-skip' });
    skip.setAttribute('data-skip-pill', '');
    skip.title = 'Skip to full time';
    pill.append(divider, skip);
    this.controlsEl = pill;
    const slot = this.overlay?.slot?.('speed');
    if (slot) slot.append(pill);
    else mount(pill);
  }

  /** SKIP's first tap arms it ("Full time?") for a few seconds; the second skips. */
  private skipArm: ReturnType<typeof setTimeout> | null = null;

  private tapSkip(btn: HTMLButtonElement): void {
    if (!this.skipArm) {
      btn.textContent = 'Full time? ▸▸';
      btn.setAttribute('data-armed', '');
      this.skipArm = setTimeout(() => this.disarmSkip(btn), SKIP_ARM_MS);
      return;
    }
    this.disarmSkip(btn);
    this.toggleTray(false);
    this.playback?.skip();
  }

  private disarmSkip(btn?: HTMLButtonElement): void {
    if (this.skipArm) clearTimeout(this.skipArm);
    this.skipArm = null;
    if (!btn) return;
    btn.textContent = 'Skip ▸▸';
    btn.removeAttribute('data-armed');
  }

  /** The sheet over the field (the pause menu): the match holds while it is up. */
  private sheet: PlanCardHandle | null = null;

  private openSheet(make: (onDone: () => void) => PlanCardHandle): void {
    const pb = this.playback;
    if (!(pb instanceof LivePlayback) || this.finished || this.sheet || this.planCard) return;
    this.toggleTray(false);
    pb.hold();
    this.sheet = make(() => {
      this.sheet = null;
      pb.release();
    });
  }

  private openPauseSheet(): void {
    const pb = this.playback;
    if (!(pb instanceof LivePlayback)) return;
    const s = pb.score;
    const half = pb.half >= 3 ? 'Golden point' : pb.half === 2 ? '2nd half' : '1st half';
    const score = document.createElement('div');
    score.className = 'nrl-mo-sheet-line';
    const pts = document.createElement('span');
    pts.className = 'nrl-mo-sheet-score';
    pts.textContent = `${s.home} – ${s.away}`;
    score.append(`${this.home.name} `, pts, ` ${this.away.name}`);
    const settings = matchSettingsOpener();
    this.openSheet((onDone) =>
      showMatchSheet({
        head: 'Paused',
        lines: [score, half],
        actions: [
          { label: 'Resume', onTap: () => {}, primary: true },
          { label: 'Skip to full time', onTap: () => this.playback?.skip(), attrs: { 'data-skip': '' } },
          // The Office's Settings dialog (sound, coach calls…), the match still held under it.
          ...(settings ? [{ label: 'Settings', onTap: () => this.openSettings(settings), attrs: { 'data-settings': '' } }] : []),
          // Save & exit: write the resume record and go back to the club. The week
          // stays held, so Advance Week reads Resume match and continues this one.
          { label: 'Save & exit', onTap: () => this.saveAndExit(), attrs: { 'data-save-exit': '', 'aria-label': 'Save and exit to club' } },
        ],
        onDone,
      }),
    );
  }

  /**
   * Watches the Settings dialog opened from the pause sheet. Closing it goes back to
   * the sheet, still paused (#421): only the sheet's Resume plays on. The sheet is
   * built again, so a text size picked in Settings lays it out afresh.
   */
  private settingsWatch: MutationObserver | null = null;

  private openSettings(open: () => void): void {
    const pb = this.playback;
    if (!(pb instanceof LivePlayback) || this.finished) return;
    pb.hold();
    // The sheet takes its own hold before this one goes, so the clock never runs between.
    const back = (): void => {
      this.openPauseSheet();
      pb.release();
    };
    open();
    const dialog = document.querySelector('.nrl-settings-modal')?.closest('.nrl-modal-backdrop') ?? null;
    if (!dialog) {
      back();
      return;
    }
    const watch = new MutationObserver(() => {
      if (dialog.isConnected) return;
      watch.disconnect();
      this.settingsWatch = null;
      back();
    });
    watch.observe(getRoot(), { childList: true });
    this.settingsWatch = watch;
  }

  // ── Coach calls (#73, 3o): COACH in the bottom row and its tray of the calls on now ──
  private coachBtn: HTMLButtonElement | null = null;
  private coachLabel: HTMLSpanElement | null = null;
  private coachBadgeEl: HTMLSpanElement | null = null;
  /** The tray (`.nrl-mo-calls`): only while it is open do its rows exist. */
  private callsEl: HTMLDivElement | null = null;
  private trayTitle: HTMLSpanElement | null = null;
  private trayList: HTMLDivElement | null = null;
  private trayFoot: HTMLDivElement | null = null;
  /** The calls the rows were last built for, so a row isn't rebuilt under the finger. */
  private trayKey = '';
  private callSide: 'home' | 'away' = 'home';
  /** The calls his Coach's Office has unlocked (N9.6). */
  private unlocked: readonly CoachCall[] = COACH_CALLS;
  /** The call made this set (the badge names it until the set ends). */
  private madeCall: CoachCall | null = null;
  /** The tick the call was made on (it takes effect on the next). */
  private madeAt = 0;
  private chipsAt = 0;
  /** The side with the ball on screen when the chips last looked (#348). */
  private chipsBall: 'home' | 'away' | null = null;

  private mountCoach(side: 'home' | 'away', unlocked: readonly CoachCall[]): void {
    this.callSide = side;
    this.unlocked = unlocked;
    const label = document.createElement('span');
    label.className = 'nrl-mo-coach-label';
    label.textContent = 'COACH';
    const badge = document.createElement('span');
    badge.className = 'nrl-mo-coach-badge';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nrl-mo-coach';
    btn.setAttribute('data-coach', '');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'nrl-mo-tray');
    btn.append(label, badge);
    btn.addEventListener('click', () => this.toggleTray());
    const title = document.createElement('span');
    title.className = 'nrl-mo-tray-title';
    const note = document.createElement('span');
    note.className = 'nrl-mo-tray-note';
    note.textContent = 'Match keeps playing';
    const head = document.createElement('div');
    head.className = 'nrl-mo-tray-head';
    head.append(title, note);
    const list = document.createElement('div');
    list.className = 'nrl-mo-tray-list';
    const foot = document.createElement('div');
    foot.className = 'nrl-mo-tray-foot';
    const tray = document.createElement('div');
    tray.className = 'nrl-mo-tray nrl-mo-calls';
    tray.id = 'nrl-mo-tray';
    tray.setAttribute('role', 'dialog');
    tray.setAttribute('aria-label', 'Coach calls');
    tray.hidden = true;
    tray.append(head, list, foot);
    this.coachBtn = btn;
    this.coachLabel = label;
    this.coachBadgeEl = badge;
    this.callsEl = tray;
    this.trayTitle = title;
    this.trayList = list;
    this.trayFoot = foot;
    const slot = this.overlay?.slot?.('coach');
    if (slot) slot.append(btn);
    else mount(btn);
    mount(tray);
    this.refreshCallChips();
  }

  private trayOpen(): boolean {
    return !!this.callsEl && !this.callsEl.hidden;
  }

  /** Open or close the tray. The match does not pause for it. */
  private toggleTray(open = !this.trayOpen()): void {
    if (!this.callsEl || !this.coachBtn) return;
    if (open && (this.finished || this.sheet || this.planCard)) return;
    if (open === this.trayOpen()) return;
    this.callsEl.hidden = !open;
    this.coachBtn.setAttribute('aria-expanded', String(open));
    if (this.coachLabel) this.coachLabel.textContent = open ? 'COACH ▾' : 'COACH';
    this.overlay?.setTrayOpen?.(open);
    this.trayKey = '';
    if (open) this.refreshCallChips();
  }

  /** The badge and the tray follow the play (a few times a second): the calls the sim takes now. */
  private refreshCallChips(): void {
    if (!this.coachBtn || !(this.playback instanceof LivePlayback)) return;
    const pb = this.playback;
    const side = this.callSide;
    const attacking = pb.inPossession === side;
    const why = new Map(this.unlocked.map((call) => [call, pb.callRefusal(side, call)] as const));
    // The set is over once the call has landed and the side may call again.
    const used = [...why.values()].includes('one call a set');
    if (!used && pb.tick > this.madeAt + 1) this.madeCall = null;
    // His calls for the play now: attack calls with the ball, defence calls without it; Fresh legs (#367) and a penalty won (#396) either way.
    const role = this.unlocked.filter((c) => callForRole(c, attacking));
    // The rows the tray shows (#396): at most five, so it never scrolls.
    const buttons = role.map((call) => ({ call, why: why.get(call) ?? null }));
    const rows = trayRows(buttons, attacking);
    const badge = coachBadge(trayCallsOn(rows), attacking, this.madeCall);
    if (this.coachBadgeEl && this.coachBadgeEl.textContent !== badge.text) this.coachBadgeEl.textContent = badge.text;
    if (this.coachBadgeEl) this.coachBadgeEl.dataset.state = badge.state;
    if (!this.trayOpen() || !this.trayList || !this.trayTitle || !this.trayFoot) return;
    // The kick-off pair (#397) is up: the break before his side's kick-off.
    const title = rows.some((r) => r.id === 'kickoff') ? 'Kick-off' : attacking ? 'Your ball' : 'Their ball';
    if (this.trayTitle.textContent !== title) this.trayTitle.textContent = title;
    const key = `${title}:${rows.map((r) => r.buttons.map((b) => `${b.call}${b.why === null ? '' : '-'}`).join('+')).join(',')}`;
    if (key !== this.trayKey) {
      this.trayKey = key;
      const tile = ({ call, why: off }: TrayButton): HTMLButtonElement => {
        const b = button('', () => this.makeCall(call), { class: 'nrl-mo-tray-call' });
        const name = document.createElement('b');
        name.textContent = CALL_LABEL[call];
        const what = document.createElement('span');
        // A pair's greyed half (#396) says why it is off: "captain’s call". The tile's text is short; the whole line is its title.
        what.textContent = off === null ? CALL_TILE[call] : callCaption(off, false);
        b.replaceChildren(name, what);
        b.title = `${CALL_LABEL[call]}: ${callEffect(call)}`;
        b.setAttribute('data-call', call);
        b.disabled = off !== null;
        return b;
      };
      const els: HTMLElement[] = rows.map((r) => {
        if (r.buttons.length === 1) return tile(r.buttons[0]!);
        const pair = document.createElement('div');
        pair.className = 'nrl-mo-tray-pair';
        pair.setAttribute('data-row', r.id);
        pair.append(...r.buttons.map(tile));
        return pair;
      });
      if (els.length === 0) {
        const none = document.createElement('div');
        none.className = 'nrl-mo-tray-none';
        none.textContent = 'Nothing to call right now.';
        els.push(none);
      }
      this.trayList.replaceChildren(...els);
    }
    // The penalty pair (#396) only ever shows on a penalty won, so the footer doesn't list it as locked.
    const locked = COACH_CALLS.filter((c) => !this.unlocked.includes(c) && callForRole(c, attacking) && !callIsPenalty(c)).map((call) => ({ call, level: unlockLevel(call) }));
    const foot = callsUnlockLine(buttons, locked, trayHidden(buttons, attacking, rows));
    if (this.trayFoot.textContent !== foot) this.trayFoot.textContent = foot;
  }

  /** A call from the tray: in on the next tick, the tray closes, the log says it (and later whether it paid off). */
  private makeCall(call: CoachCall): void {
    const pb = this.playback;
    if (!(pb instanceof LivePlayback)) return;
    if (pb.call(this.callSide, call) === null) {
      // Fresh legs (#367), a penalty call (#396) and a kick-off call (#397) aren't the set's call: the badge keeps the set's own.
      if (!callIsBench(call) && !callIsPenalty(call) && !callIsKickoff(call)) {
        this.madeCall = call;
        this.madeAt = pb.tick;
      }
      this.overlay?.noteCall?.(CALL_LABEL[call]);
      this.toggleTray(false);
    }
    // A refusal (the play moved on under the finger) just rebuilds the rows.
    this.refreshCallChips();
  }

  // ── What each call did (#366): a tag over COACH for two seconds ──────────
  private callResultEl: HTMLDivElement | null = null;
  private callResultTimer: ReturnType<typeof setTimeout> | null = null;

  /** Only the coach's own calls get a tag; the rival's stay in the log. A new result replaces the one up. */
  private showCallResult(v: CallVerdict): void {
    if (!this.coachBtn || v.side !== this.callSide || this.finished) return;
    let tag = this.callResultEl;
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'nrl-mo-call-result';
      tag.setAttribute('role', 'status');
      this.callResultEl = tag;
      mount(tag);
    }
    tag.textContent = callResultText(v);
    tag.toggleAttribute('data-paid', v.paid);
    // Not over the open tray: its rows are where the finger is.
    tag.hidden = this.trayOpen();
    if (this.callResultTimer) clearTimeout(this.callResultTimer);
    this.callResultTimer = setTimeout(() => this.clearCallResult(), CALL_RESULT_MS);
  }

  private clearCallResult(): void {
    if (this.callResultTimer) clearTimeout(this.callResultTimer);
    this.callResultTimer = null;
    this.callResultEl?.remove();
    this.callResultEl = null;
  }

  // ── Key moments (#366): the pill shows the match slowed for one ───────────
  private slowShown: number | null = null;

  /** Slow down for big moments: on unless the player turned it off (an old save has no setting). */
  private keyMomentsOn(): boolean {
    try {
      return keyMomentsOn(getState().settings);
    } catch {
      return true;
    }
  }

  /** The speed a key moment holds the match at pulses in the pill; the chosen one stays yellow. */
  private showSlowed(): void {
    const pb = this.playback;
    const to = pb instanceof LivePlayback && !this.finished ? pb.slowedTo : null;
    if (to === this.slowShown) return;
    this.slowShown = to;
    for (const b of this.speedButtons) b.toggleAttribute('data-slow', to !== null && b.dataset.speed === String(to));
    this.controlsEl?.toggleAttribute('data-slowed', to !== null);
  }

  /** The speed the player last picked, or ×4 for an old save and a match opened with no game loaded. */
  private rememberedSpeed(): PlaybackSpeed {
    try {
      return playbackSpeedOf(getState().settings.playbackSpeed);
    } catch {
      return playbackSpeedOf(undefined);
    }
  }

  /** The speed playing now: a yellow circle in the pill (#348 M3). */
  private markSpeed(speed: PlaybackSpeed): void {
    for (const b of this.speedButtons) {
      const on = b.dataset.speed === String(speed);
      b.toggleAttribute('data-active', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  private setSpeed(speed: PlaybackSpeed): void {
    this.playback?.setSpeed(speed);
    this.markSpeed(speed);
    try {
      const settings = getState().settings;
      if (settings.playbackSpeed !== speed) setState({ settings: { ...settings, playbackSpeed: speed } });
    } catch {
      // No game loaded. The buttons still change this match.
    }
  }

  // ── The plan at the breaks (N11, 3r): the half-time sheet and the Plan chip after a try ──
  private planSide: 'home' | 'away' | null = null;
  private planBtn: HTMLButtonElement | null = null;
  private planCard: PlanCardHandle | null = null;
  /** The half whose break has had its sheet (one a break). */
  private planCardHalf = 0;

  private mountPlanChip(side: 'home' | 'away'): void {
    this.planSide = side;
    const btn = button('Plan ▸', () => this.openPlanCard('Change the plan'), { class: 'nrl-mo-planchip' });
    btn.setAttribute('data-plan', '');
    btn.title = 'Change the plan from the restart';
    btn.hidden = true;
    this.planBtn = btn;
    const slot = this.overlay?.slot?.('plan');
    if (slot) slot.append(btn);
    else mount(btn);
  }

  /** At half-time the sheet comes up by itself, once; after a try the Plan chip shows until the restart is kicked. */
  private refreshPlan(): void {
    const pb = this.playback;
    if (!this.planSide || !(pb instanceof LivePlayback) || this.finished) return;
    const at = pb.breakKind;
    if (this.planBtn) this.planBtn.hidden = at !== 'try' || this.planCard !== null;
    if (at === 'half-time' && !this.planCard && this.planCardHalf !== pb.half) {
      this.planCardHalf = pb.half;
      // Every speed: the sheet waits for the coach (#341).
      this.openPlanCard(pb.half >= 2 ? 'Golden point' : 'Half-time');
    }
  }

  /** The half-time sheet's one line: who leads, possession, legs, his calls. */
  private planSummary(pb: LivePlayback, side: 'home' | 'away'): string {
    const other = side === 'home' ? 'away' : 'home';
    const s = pb.score;
    const margin = s[side] - s[other];
    const lead = margin > 0 ? `You lead by ${margin}` : margin < 0 ? `You trail by ${-margin}` : 'Level';
    const [ph, pa] = this.overlay?.possession?.() ?? [50, 50];
    const legs = (x: 'home' | 'away'): number => Math.round(pb.legs(x) * 100);
    const c = pb.calls;
    const calls = c.made[side] > 0 ? ` · calls ${c.paid[side]}/${c.made[side]}` : '';
    return `${lead} · ${side === 'home' ? ph : pa}% possession · legs ${legs(side)}% v ${legs(other)}%${calls}`;
  }

  private openPlanCard(head: string): void {
    const pb = this.playback;
    const side = this.planSide;
    if (!(pb instanceof LivePlayback) || !side || this.planCard) return;
    this.sheet?.close();
    this.toggleTray(false);
    pb.hold();
    if (this.planBtn) this.planBtn.hidden = true;
    const other = side === 'home' ? 'away' : 'home';
    const s = pb.score;
    this.planCard = showPlanCard({
      head,
      score: `${s.home}–${s.away}`,
      summary: this.planSummary(pb, side),
      // How the other side plays (the ladder shows it too, N11).
      tendency: `${shortName(other === 'home' ? this.home.name : this.away.name)} play ${styleLine(pb.planFor(other))}`,
      go: head === 'Half-time' ? 'Start 2nd half ▸' : head === 'Golden point' ? 'Golden point ▸' : 'Continue ▸',
      tactics: pb.planFor(side),
      onPick: (t) => pb.setTactics(side, t),
      onDone: () => {
        this.planCard = null;
        pb.release();
      },
    });
  }

  private closePlan(): void {
    const card = this.planCard;
    this.planCard = null;
    card?.close();
    this.planBtn?.remove();
    this.planBtn = null;
  }

  /** The coach's row and tray go (full time, leaving). */
  private removeCoach(): void {
    this.toggleTray(false);
    this.coachBtn?.remove();
    this.coachBtn = null;
    this.callsEl?.remove();
    this.callsEl = null;
  }

  // ── Back to Club: the full-time card's (matchReport.ts); this one only with no match ──
  private mountBackButton(): void {
    // A live match leaves from its full-time card. The lab removes this one; a scene
    // opened with no match (defensive) shows it at once, clear of the dock.
    const btn = button('Back to Club ▸', () => this.exitToGrounds(), { class: 'nrl-btn-primary nrl-match-back' });
    btn.style.position = 'fixed';
    btn.style.left = '0';
    btn.style.right = '0';
    btn.style.margin = '0 auto';
    btn.style.width = 'max-content';
    const playing = this.live !== undefined;
    btn.style.bottom = playing ? 'calc(12px + var(--nrl-safe-b, 0px))' : 'calc(var(--nrl-nav-h, 0px) + 12px)';
    btn.style.zIndex = '20';
    btn.style.display = playing ? 'none' : '';
    this.backBtn = btn;
    mount(btn);
  }

  /** On full time: the winners' end goes up, the controls go, the full-time card has the way out. */
  private onFinished = ({ result }: { result: { homeScore: number; awayScore: number } }): void => {
    if (this.finished) return;
    this.finished = true;
    this.clearCallResult();
    if (result.homeScore !== result.awayScore) this.hype(result.homeScore > result.awayScore ? 'home' : 'away', 0.9, 60_000);
    this.removeCoach();
    this.closePlan();
    this.sheet?.close();
    this.disarmSkip();
    if (this.controlsEl) {
      this.controlsEl.remove();
      this.controlsEl = null;
    }
    // The full-time card opened on the same event (it subscribed first). Without one, the old way out.
    if (this.backBtn && !document.querySelector('.nrl-mo-ft')) this.backBtn.style.display = '';
  };

  private exitToGrounds(): void {
    // Playback owns the single 'match:finished' emission (full time or Skip).
    this.scene.start('Grounds');
  }

  /** Persist the live match and return to the club without finishing the week. */
  private saveAndExit(): void {
    const pb = this.playback;
    if (!(pb instanceof LivePlayback) || this.finished) return;
    if (!pb.canPark()) {
      bus.emit('ui:notify', { text: SKIPPING_EXIT_TEXT, kind: 'info', match: true });
      return;
    }
    // Leave only once the record is actually stored. A failed write would hold
    // the week with nothing for Advance Week to resume.
    if (!pb.saveProgress()) {
      bus.emit('ui:notify', { text: MATCH_NOT_SAVED_TEXT, kind: 'danger', match: true });
      return;
    }
    const tick = pb.tick;
    bus.emit('ui:notify', { text: MATCH_SAVED_TEXT, kind: 'success', match: true });
    bus.emit('match:parked', { tick });
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
    this.buildToken++;
    document.removeEventListener('visibilitychange', this.onHidden);
    window.removeEventListener('pagehide', this.onHidden);
    this.scale.off('resize', this.onResize);
    if (this.built) this.camController.destroy();
    bus.off('match:finished', this.onFinished);
    this.offCrowd?.();
    this.offCrowd = null;
    this.offZoom?.();
    this.offZoom = null;
    this.tagText = null;
    this.tagActor = null;
    this.marker = null;
    this.markerSide = null;
    this.letters = [];
    this.overlay?.destroy();
    this.overlay = null;
    if (this.playback instanceof LivePlayback) this.playback.destroy();
    this.playback = null;
    if (this.controlsEl) {
      this.controlsEl.remove();
      this.controlsEl = null;
    }
    this.removeCoach();
    this.closePlan();
    this.sheet?.close();
    this.disarmSkip();
    this.settingsWatch?.disconnect();
    this.settingsWatch = null;
    setFullTimeExit(null);
    this.clearCallResult();
    this.slowShown = null;
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
// PUBLIC SURFACE FOR PLAYBACK (structural, src/match/view/livePlayback.ts):
//   scene.fieldToWorld(fx, fy): { x, y }   — sim field coords -> Phaser world.
//   scene.players.home / .away: PlaybackActor[ON_FIELD] — animated player sprites.
//   scene.ball: PlaybackBall              — ball sprite + shadow.
//   scene.cameras.main.shake(...)          — tackle / big-hit shake.
//   scene.homeId                           — which side an event's teamId is.
// ─────────────────────────────────────────────────────────────────────────────
