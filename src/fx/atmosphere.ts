// src/fx/atmosphere.ts — match-day atmosphere layer (GitHub #16): rain / wind,
// dusk / night lighting, and the stands' reaction to tries and big hits.
//
// One attach call from MatchScene.create(), after attachMatchFx():
//   attachMatchAtmosphere(scene, { weather, fixture })
//
// What it draws (all pure numbers/textures come from src/art/match/atmosphere):
//   • Light map — a low-res multiply image over the whole stadium (LINEAR
//     filtered so it reads as smooth light, not blocks): a pool of light on the
//     pitch falling off toward darker stands. Dusk is warm/mauve, night navy.
//     Rain cools + darkens any grade, plus a grey haze wash (desaturation).
//   • Floodlight glows (additive) on the painted lamp banks, faint beams, and a
//     warm glow along the back grandstand's boxes + seat rows ("lit stands").
//   • Rain — screen-space slanted streaks (scrollFactor 0, spawn zone follows
//     the camera zoom) + tiny splashes on the visible ground.
//   • Wind — drifting leaves / grass clippings and faint gust lines.
//   • Crowd FX — streamers thrown up from the scoring side's seats on a try
//     (smaller for a big hit) and, at dusk/night, camera-phone flashes.
//
// Pooled like src/fx/particles.ts: every emitter is created once with a bounded
// maxAliveParticles (ATMOS_CAPS; with MATCH_CAPS it stays ≤ MAX_LIVE_PARTICLES)
// and torn down with every bus subscription on scene shutdown. Honours
// prefers-reduced-motion (less rain, no splashes / phone flashes).
//
// Depths (ARCHITECTURE §7; MatchScene's front crowd is 60 000):
//   splashes 9 000 (on the ground, under the FX bursts at 10 000)
//   < light map 70 000 < haze 70 500 < glows/beams 71 000
//   < crowd streamers/flashes 72 000 < rain/wind 80 000.
import Phaser from 'phaser';
import { bus } from '../core/events';
import { getState, type Fixture, type WeatherKind } from '../core/state';
import type { MatchEvent } from '../sim/events';
import { PixelBuffer, toTexture } from '../art/pixel';
import {
  RAIN_ANGLE,
  atmosphereGrade,
  atmosphereParticles,
  buildLightmap,
  drawGlow,
  drawGust,
  drawLeaf,
  drawRainStreaks,
  gradeIsNeutral,
  lightingForFixture,
  type AtmosphereGrade,
  type Lighting,
} from '../art/match/atmosphere';
import {
  FLOODLIGHT_TOWERS,
  HOARD,
  backStandTiers,
  backStandWindowBand,
  crowdSeats,
  floodlightLamps,
} from '../art/match/stadium';
import { isoProject, isoUnproject } from '../art/match/iso3d';
import { shirtForSeat, shirtSide } from '../art/match/crowd';
import { FIELD_LONG, FIELD_WIDE, colorToInt, fieldOffsetX } from '../scenes/matchField';

export const DEPTH_SPLASH = 9_000;
export const DEPTH_LIGHTMAP = 70_000;
export const DEPTH_HAZE = 70_500;
export const DEPTH_GLOW = 71_000;
export const DEPTH_CROWD_FX = 72_000;
export const DEPTH_WEATHER = 80_000;

const KEY_GLOW = 'atm-glow';
const KEY_RAIN = 'atm-rain';
const KEY_LEAF = 'atm-leaf';
const KEY_GUST = 'atm-gust';
const KEY_DOT = 'atm-dot';
const DATA_KEY = 'nrlAtmosHandle';

// Autumn leaves, straw and the odd chip wrapper — warm/pale so they read on grass.
const LEAF_TINTS = [0xe0a030, 0xc87828, 0xf0d070, 0xa85a20, 0xe8e0c0, 0xd8c060, 0xffffff];

export interface AtmosphereOptions {
  weather?: WeatherKind | undefined;
  fixture?: Fixture | undefined;
  /** Season for the lighting hash; read from GameState when omitted. */
  season?: number;
  /** Override prefers-reduced-motion (tests / settings). */
  reducedMotion?: boolean;
}

export interface AtmosphereHandle {
  readonly lighting: Lighting;
  readonly grade: AtmosphereGrade;
  destroy(): void;
}

let serial = 0;

function currentSeason(): number {
  try {
    return getState().season;
  } catch {
    return 1;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Shared (session-lifetime) white textures; tiny, so never freed. */
function ensureTextures(scene: Phaser.Scene): void {
  const make = (key: string, buf: PixelBuffer, linear = false): void => {
    if (scene.textures.exists(key)) return;
    toTexture(scene, key, buf);
    if (linear) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  };
  make(KEY_GLOW, drawGlow(64), true);
  make(KEY_RAIN, drawRainStreaks());
  make(KEY_LEAF, drawLeaf());
  make(KEY_GUST, drawGust());
  const dot = new PixelBuffer(2, 2);
  dot.fillRect(0, 0, 2, 2, 0xffffff);
  make(KEY_DOT, dot);
}

type Pt = { x: number; y: number };

/** Random spawn point inside what the camera shows, in scrollFactor-0 space. */
function screenZone(cam: Phaser.Cameras.Scene2D.Camera, padX = 0, padTop = 0): Phaser.Types.GameObjects.Particles.RandomZoneSource {
  return {
    getRandomPoint(p: Phaser.Types.Math.Vector2Like) {
      // scrollFactor-0 objects still zoom about the camera centre, so the
      // visible region shrinks/grows by 1/zoom around it.
      const vw = cam.width / cam.zoom;
      const vh = cam.height / cam.zoom;
      p.x = cam.width / 2 - vw / 2 + Math.random() * (vw + padX);
      p.y = cam.height / 2 - vh / 2 - padTop + Math.random() * (vh + padTop);
      return p;
    },
  };
}

/**
 * Attach the atmosphere layer to a match scene. Idempotent per scene; tears
 * itself down on scene shutdown.
 */
export function attachMatchAtmosphere(scene: Phaser.Scene, opts: AtmosphereOptions = {}): AtmosphereHandle {
  (scene.data?.get(DATA_KEY) as AtmosphereHandle | undefined)?.destroy();

  const weather: WeatherKind = opts.weather ?? 'clear';
  const lighting = lightingForFixture(opts.fixture, opts.season ?? currentSeason());
  const grade = atmosphereGrade(weather, lighting);
  const reduced = opts.reducedMotion ?? prefersReducedMotion();
  const budget = atmosphereParticles(weather, lighting, reduced);
  const offsetX = fieldOffsetX();
  const cam = scene.cameras.main;

  ensureTextures(scene);

  const objects: Phaser.GameObjects.GameObject[] = [];
  const ownTextures: string[] = [];
  const offs: Array<() => void> = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
    objects.push(o);
    return o;
  };

  // ── Light ──────────────────────────────────────────────────────────────────
  if (!gradeIsNeutral(grade)) {
    if (grade.pool !== 0xffffff || grade.edge !== 0xffffff) {
      const lm = buildLightmap(offsetX, grade, 8);
      const key = `atm-lightmap~${++serial}`;
      toTexture(scene, key, lm.buf);
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      ownTextures.push(key);
      add(
        scene.add
          .image(lm.rect.x, lm.rect.y, key)
          .setOrigin(0, 0)
          .setScale(lm.scale)
          .setDepth(DEPTH_LIGHTMAP)
          .setBlendMode(Phaser.BlendModes.MULTIPLY),
      );
      if (grade.haze) {
        add(
          scene.add
            .image(lm.rect.x, lm.rect.y, '__WHITE')
            .setOrigin(0, 0)
            .setDisplaySize(lm.buf.w * lm.scale, lm.buf.h * lm.scale)
            .setTint(grade.haze.color)
            .setAlpha(grade.haze.alpha)
            .setDepth(DEPTH_HAZE),
        );
      }
    }
    spawnLights(scene, grade, offsetX, add);
  }

  // ── Weather emitters ───────────────────────────────────────────────────────
  if (budget.rain > 0) {
    const rain = add(
      scene.add.particles(0, 0, KEY_RAIN, {
        emitZone: { type: 'random', source: screenZone(cam, 60, 30) },
        lifespan: { min: 300, max: 460 },
        angle: { min: RAIN_ANGLE - 1.5, max: RAIN_ANGLE + 1.5 },
        speed: { min: 560, max: 720 },
        alpha: { start: 0.85, end: 0.35 },
        tint: [0xe4ecf6, 0xc8d4e4, 0xffffff],
        frequency: 16,
        quantity: Math.max(1, Math.ceil((budget.rain * 16) / 380)),
        maxAliveParticles: budget.rain,
      }),
    );
    rain.setScrollFactor(0).setDepth(DEPTH_WEATHER);
  }
  if (budget.splash > 0) {
    const ground = {
      getRandomPoint(p: Phaser.Types.Math.Vector2Like) {
        const v = cam.worldView;
        for (let i = 0; i < 6; i++) {
          p.x = v.x + Math.random() * v.width;
          p.y = v.y + Math.random() * v.height;
          const g = isoUnproject(p.x, p.y, offsetX);
          if (g.gx > -HOARD && g.gx < FIELD_LONG + HOARD && g.gy > -HOARD && g.gy < FIELD_WIDE + HOARD) return p;
        }
        p.y = -1e6; // nothing on the ground in view this time — spawn off-world
        return p;
      },
    };
    add(
      scene.add.particles(0, 0, KEY_DOT, {
        emitZone: { type: 'random', source: ground },
        lifespan: 220,
        scaleX: { start: 0.5, end: 1.6 },
        scaleY: { start: 0.5, end: 0.4 },
        alpha: { start: 0.75, end: 0 },
        tint: 0xe8f0fa,
        frequency: 30,
        quantity: 2,
        maxAliveParticles: budget.splash,
      }),
    ).setDepth(DEPTH_SPLASH);
  }
  if (budget.leaves > 0) {
    const fade = (_p: unknown, _k: string, t: number): number => Math.sin(Math.PI * t);
    add(
      scene.add.particles(0, 0, KEY_LEAF, {
        emitZone: { type: 'random', source: screenZone(cam) },
        lifespan: { min: 1800, max: 2800 },
        speedX: { min: 170, max: 320 },
        speedY: { min: -25, max: 50 },
        accelerationY: { min: -90, max: 90 },
        rotate: { start: 0, end: 900 },
        scale: { min: 1.8, max: 2.8 },
        alpha: { onEmit: () => 0, onUpdate: fade },
        tint: LEAF_TINTS,
        frequency: 40,
        quantity: 1,
        maxAliveParticles: budget.leaves,
      }),
    )
      .setScrollFactor(0)
      .setDepth(DEPTH_WEATHER);
    add(
      scene.add.particles(0, 0, KEY_GUST, {
        emitZone: { type: 'random', source: screenZone(cam) },
        lifespan: 900,
        speedX: { min: 560, max: 800 },
        speedY: { min: 30, max: 60 },
        rotate: 4,
        scaleX: { min: 1.5, max: 3.2 },
        alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(Math.PI * t) * 0.75 },
        frequency: 70,
        quantity: 1,
        maxAliveParticles: budget.gusts,
      }),
    )
      .setScrollFactor(0)
      .setDepth(DEPTH_WEATHER);
  }

  // ── Crowd reaction FX ──────────────────────────────────────────────────────
  const home = scene.data?.get('home') as { clubId?: string; colors?: [string, string] } | undefined;
  const away = scene.data?.get('away') as { clubId?: string; colors?: [string, string] } | undefined;
  const seats = { home: [] as Pt[], away: [] as Pt[], all: [] as Pt[] };
  for (const seat of crowdSeats()) {
    if (seat.layer !== 'back') continue; // the stands that face the camera
    const w = isoProject(seat.gx, seat.gy, seat.z, offsetX);
    const pt = { x: w.x, y: w.y - 7 };
    seats.all.push(pt);
    const side = shirtSide(shirtForSeat(seat));
    if (side) seats[side].push(pt);
  }
  const pick = (list: Pt[]): Pt | undefined => list[Math.floor(Math.random() * list.length)];
  const streamer = (tint: number[]) =>
    add(
      scene.add.particles(0, 0, KEY_DOT, {
        lifespan: { min: 800, max: 1200 },
        speedX: { min: -35, max: 35 },
        speedY: { min: -140, max: -60 },
        gravityY: 230,
        scale: { start: 1.6, end: 0.9 },
        tint,
        emitting: false,
        maxAliveParticles: Math.floor(budget.standBurst / 2),
      }),
    ).setDepth(DEPTH_CROWD_FX);
  const homeTint = home?.colors ? colorToInt(home.colors[0]) : 0xffd23b;
  const awayTint = away?.colors ? colorToInt(away.colors[0]) : 0x3b8bff;
  const streamers = {
    home: streamer([homeTint, home?.colors ? colorToInt(home.colors[1]) : 0xffffff, 0xffffff]),
    away: streamer([awayTint, away?.colors ? colorToInt(away.colors[1]) : 0xffffff, 0xffffff]),
  };
  const flashes = add(
    scene.add.particles(0, 0, KEY_DOT, {
      lifespan: { min: 80, max: 150 },
      scale: { start: 1.3, end: 0.8 },
      alpha: { start: 1, end: 0.2 },
      tint: 0xffffff,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      maxAliveParticles: budget.flashes,
    }),
  ).setDepth(DEPTH_CROWD_FX);

  const flashAt = (list: Pt[]): void => {
    const p = pick(list);
    if (p) flashes.emitParticleAt(p.x, p.y - 2, 1);
  };
  if (budget.flashesPerSec > 0) {
    timers.push(
      scene.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          if (Math.random() < budget.flashesPerSec / 10) flashAt(seats.all);
        },
      }),
    );
  }

  const homeId = home?.clubId ?? (scene as unknown as { homeId?: string }).homeId;
  const onEvent = (ev: MatchEvent): void => {
    if (ev.kind !== 'try' && ev.kind !== 'big-hit') return;
    const side = ev.teamId === homeId ? 'home' : 'away';
    const list = seats[side].length > 0 ? seats[side] : seats.all;
    const bursts = ev.kind === 'try' ? 10 : 4;
    for (let i = 0; i < bursts; i++) {
      const p = pick(list);
      if (p) streamers[side].emitParticleAt(p.x, p.y, ev.kind === 'try' ? 2 : 1);
    }
    if (ev.kind === 'try' && lighting !== 'day' && !reduced) {
      // A ripple of phone flashes from the celebrating bay over ~1.5s.
      timers.push(scene.time.addEvent({ delay: 110, repeat: 13, callback: () => flashAt(list) }));
    }
  };
  offs.push(bus.on('match:event', onEvent));

  // ── Teardown ───────────────────────────────────────────────────────────────
  let done = false;
  const teardown = (): void => {
    if (done) return;
    done = true;
    offs.forEach((off) => off());
    timers.forEach((t) => t.remove(false));
    objects.forEach((o) => o.destroy());
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, teardown);
    if (scene.data?.get(DATA_KEY) === handle) scene.data.remove(DATA_KEY);
    // Deferred a tick (like MatchArtRegistry) so nothing still references it.
    const textures = scene.textures;
    setTimeout(() => ownTextures.forEach((k) => textures.exists(k) && textures.remove(k)), 0);
  };
  const handle: AtmosphereHandle = { lighting, grade, destroy: teardown };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
  scene.data?.set(DATA_KEY, handle);
  return handle;
}

/** Floodlight glows + beams and the lit grandstand (all additive). */
function spawnLights(
  scene: Phaser.Scene,
  grade: AtmosphereGrade,
  offsetX: number,
  add: <T extends Phaser.GameObjects.GameObject>(o: T) => T,
): void {
  const lamps = floodlightLamps(offsetX);

  if (grade.beams > 0) {
    const g = add(scene.add.graphics()).setDepth(DEPTH_GLOW).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(grade.lampColor, grade.beams);
    FLOODLIGHT_TOWERS.forEach((t, i) => {
      const lamp = lamps[i]!;
      // Aim each bank part-way from its nearest field corner toward the centre.
      const cx = Math.max(0, Math.min(FIELD_LONG, t.gx));
      const cy = Math.max(0, Math.min(FIELD_WIDE, t.gy));
      const aim = isoProject(cx + (FIELD_LONG / 2 - cx) * 0.45, cy + (FIELD_WIDE / 2 - cy) * 0.45, 0, offsetX);
      const dx = aim.x - lamp.x;
      const dy = aim.y - lamp.y;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len;
      const py = dx / len;
      g.fillPoints(
        [
          { x: lamp.x + px * 7, y: lamp.y + py * 7 },
          { x: aim.x + px * 150, y: aim.y + py * 150 },
          { x: aim.x - px * 150, y: aim.y - py * 150 },
          { x: lamp.x - px * 7, y: lamp.y - py * 7 },
        ],
        true,
      );
    });
  }

  if (grade.standGlow > 0) {
    const strip = (seg: { a: Pt; b: Pt }, thick: number, alpha: number, tint: number): void => {
      const len = Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y);
      add(
        scene.add
          .image((seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2, KEY_GLOW)
          .setDisplaySize(len * 1.08, thick)
          .setRotation(Math.atan2(seg.b.y - seg.a.y, seg.b.x - seg.a.x))
          .setTint(tint)
          .setAlpha(alpha)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH_GLOW),
      );
    };
    strip(backStandWindowBand(offsetX), 34, grade.standGlow * 0.55, 0xffdc9a);
    strip(backStandTiers(offsetX), 90, grade.standGlow * 0.32, 0xfff0d0);
  }

  if (grade.glow > 0) {
    for (const lamp of lamps) {
      add(
        scene.add
          .image(lamp.x, lamp.y, KEY_GLOW)
          .setDisplaySize(230, 230)
          .setTint(grade.lampColor)
          .setAlpha(grade.glow * 0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH_GLOW),
      );
      add(
        scene.add
          .image(lamp.x, lamp.y, KEY_GLOW)
          .setDisplaySize(52, 44)
          .setTint(0xffffff)
          .setAlpha(Math.min(1, grade.glow * 1.1))
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(DEPTH_GLOW),
      );
    }
  }
}
