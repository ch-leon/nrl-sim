// src/fx/particles.ts — pooled particle effects for key moments (BAK-201, WU-14).
//
// Two attach functions a scene calls in its create():
//   attachMatchFx(scene)   — try burst + gold shower, big-hit ring + camera
//                            shake, ambient crowd specks along the sidelines.
//   attachGroundsFx(scene) — coin sparkle on positive money, dust puff on
//                            facility placement, premiership confetti.
//
// Design (ARCHITECTURE §7 + spec BAK-201):
//   • Uses the boot-generated 'particle-square' texture; generated locally here
//     (guarded by textures.exists) if absent so we never edit BootScene.
//   • Emitters are created ONCE, kept idle/pooled, and reused via explode()/
//     start()/stop() — never created per event. Each has a bounded
//     maxAliveParticles; per-scene subtotals stay ≤ MAX_LIVE_PARTICLES.
//   • Idempotent attach: a prior handle stored on scene.data is destroyed first.
//   • Full teardown on the scene 'shutdown' event: every bus subscription is
//     unsubscribed and every emitter destroyed, leaving nothing running.
//
// Pure math (world mapping + cap allocation) lives in ./particleMath so it is
// unit-testable in the node env (Phaser can't import there). We re-export it.
import Phaser from 'phaser';
import { TILE_W } from '../config';
import { bus } from '../core/events';
import type { MatchEvent } from '../sim/events';
import {
  MATCH_CAPS,
  GROUNDS_CAPS,
  fieldToWorld,
  facilityToWorld,
  matchEffectFor,
} from './particleMath';
import { fieldWorldBounds, fieldOffsetX, colorToInt } from '../scenes/matchField';

export {
  MAX_LIVE_PARTICLES,
  MATCH_CAPS,
  GROUNDS_CAPS,
  totalCaps,
  fieldToWorld,
  facilityToWorld,
  matchEffectFor,
  type MatchFxEffect,
} from './particleMath';

const KEY_PARTICLE = 'particle-square'; // ARCHITECTURE §7

/** Handle returned to the caller so it can force teardown independently. */
export interface FxHandle {
  destroy(): void;
}

/** scene.data key under which the active handle is stored (idempotency guard). */
const DATA_KEY = 'nrlFxHandle';

const CONFETTI_TINTS = [0xff3b3b, 0x3b8bff, 0xffd23b, 0x3bd47a, 0xff7ad4, 0xffffff];

/** A no-op handle used when we cannot attach (e.g. missing texture). */
const NOOP_HANDLE: FxHandle = { destroy: () => {} };

/**
 * Ensure the 'particle-square' texture exists. If BootScene already generated
 * it (§7) this is a no-op. Returns false (with a warning) only if we somehow
 * cannot provide one — callers then no-op rather than throw.
 */
function ensureParticleTexture(scene: Phaser.Scene): boolean {
  if (scene.textures.exists(KEY_PARTICLE)) return true;
  try {
    const size = 4;
    const gfx = scene.add.graphics();
    gfx.fillStyle(0xffffff, 1); // white so per-emitter tints read true
    gfx.fillRect(0, 0, size, size);
    gfx.generateTexture(KEY_PARTICLE, size, size);
    gfx.destroy();
    return scene.textures.exists(KEY_PARTICLE);
  } catch {
    console.warn('[particles] could not generate particle-square texture; FX disabled');
    return false;
  }
}

/** Destroy any FX handle previously attached to this scene (idempotent attach). */
function clearExisting(scene: Phaser.Scene): void {
  const prior = scene.data?.get(DATA_KEY) as FxHandle | undefined;
  if (prior) prior.destroy();
}

// ── Match FX ─────────────────────────────────────────────────────────────────

/**
 * Attach match particle effects. Subscribes to 'match:event' (try / big-hit)
 * and drives ambient crowd emitters for the life of the match.
 */
export function attachMatchFx(scene: Phaser.Scene): FxHandle {
  clearExisting(scene);
  if (!ensureParticleTexture(scene)) return NOOP_HANDLE;

  const offsetX = fieldOffsetX();
  const bounds = fieldWorldBounds(offsetX);

  // Home/away kit colours (fixture) tint the two crowd emitters. Fall back to
  // neutral tints if the scene didn't expose team sheets on scene.data.
  const home = scene.data?.get('home') as { colors?: [string, string] } | undefined;
  const away = scene.data?.get('away') as { colors?: [string, string] } | undefined;
  const homeTint = home?.colors ? colorToInt(home.colors[0]) : 0xffd23b;
  const awayTint = away?.colors ? colorToInt(away.colors[0]) : 0x3b8bff;

  const topY = bounds.y;
  const botY = bounds.y + bounds.height;
  const midDepth = 10_000; // above field sprites (depth == screenY, well below this)

  // Gold burst at the try position — idle emitter reused via explode().
  const tryBurst = scene.add.particles(0, 0, KEY_PARTICLE, {
    lifespan: 700,
    speed: { min: 60, max: 180 },
    scale: { start: 1.6, end: 0 },
    tint: [0xffe680, 0xffd23b, 0xffb020],
    gravityY: 220,
    emitting: false,
    maxAliveParticles: MATCH_CAPS.tryBurst,
  });
  tryBurst.setDepth(midDepth);

  // Slow gold shower falling from above the try line (~1.2s bursts).
  const goldShower = scene.add.particles(0, 0, KEY_PARTICLE, {
    lifespan: 1200,
    speedY: { min: 40, max: 90 },
    speedX: { min: -20, max: 20 },
    scale: { start: 1.2, end: 0.4 },
    tint: [0xffe680, 0xffd23b],
    alpha: { start: 1, end: 0.2 },
    emitting: false,
    maxAliveParticles: MATCH_CAPS.goldShower,
  });
  goldShower.setDepth(midDepth);

  // White radial impact ring for big hits.
  const bigHitRing = scene.add.particles(0, 0, KEY_PARTICLE, {
    lifespan: 400,
    speed: { min: 120, max: 200 },
    scale: { start: 1.4, end: 0 },
    tint: 0xffffff,
    emitting: false,
    maxAliveParticles: MATCH_CAPS.bigHitRing,
  });
  bigHitRing.setDepth(midDepth);

  // Ambient crowd: drifting specks along each sideline, low rate, started now.
  const crowdHome = scene.add.particles(0, 0, KEY_PARTICLE, {
    x: { min: bounds.x, max: bounds.x + bounds.width },
    y: topY,
    lifespan: 2200,
    frequency: 260,
    quantity: 1,
    speedY: { min: -18, max: -6 },
    speedX: { min: -10, max: 10 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: homeTint,
    maxAliveParticles: MATCH_CAPS.crowdHome,
  });
  crowdHome.setDepth(midDepth);

  const crowdAway = scene.add.particles(0, 0, KEY_PARTICLE, {
    x: { min: bounds.x, max: bounds.x + bounds.width },
    y: botY,
    lifespan: 2200,
    frequency: 260,
    quantity: 1,
    speedY: { min: -18, max: -6 },
    speedX: { min: -10, max: 10 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: awayTint,
    maxAliveParticles: MATCH_CAPS.crowdAway,
  });
  crowdAway.setDepth(midDepth);

  const emitters = [tryBurst, goldShower, bigHitRing, crowdHome, crowdAway];

  const onEvent = (ev: MatchEvent): void => {
    const effect = matchEffectFor(ev.kind);
    if (!effect) return;
    const w = fieldToWorld(ev.x ?? 50, ev.y ?? 50, bounds);
    if (effect === 'try') {
      tryBurst.explode(MATCH_CAPS.tryBurst, w.x, w.y);
      // Shower rains from above the try line down toward the event position.
      goldShower.emitParticleAt(w.x, bounds.y, MATCH_CAPS.goldShower);
    } else {
      // big-hit: radial ring + a short, sharp camera shake.
      bigHitRing.explode(MATCH_CAPS.bigHitRing, w.x, w.y);
      scene.cameras.main.shake(100, 0.008);
    }
  };

  const stopCrowd = (): void => {
    crowdHome.stop();
    crowdAway.stop();
  };

  const offs: Array<() => void> = [
    bus.on('match:event', onEvent),
    bus.on('match:finished', stopCrowd),
  ];

  return makeHandle(scene, offs, emitters);
}

// ── Grounds FX ───────────────────────────────────────────────────────────────

/**
 * Attach club-grounds particle effects. Subscribes to money / facility / season
 * events for sparkle, dust and confetti respectively.
 */
export function attachGroundsFx(scene: Phaser.Scene): FxHandle {
  clearExisting(scene);
  if (!ensureParticleTexture(scene)) return NOOP_HANDLE;

  // GroundsScene centres tiles by offsetX = GRID_H * TILE_W/2 (= 20 * 32 = 640).
  const offsetX = 20 * (TILE_W / 2);
  const uiDepth = 100_000; // confetti/sparkle sit above everything in the scene
  const cam = scene.cameras.main;

  // Coin sparkle burst near the HUD money corner (idle, reused). Screen-anchored.
  const coinSparkle = scene.add.particles(0, 0, KEY_PARTICLE, {
    lifespan: 800,
    speed: { min: 40, max: 120 },
    scale: { start: 1.4, end: 0 },
    tint: [0xffe680, 0xffd23b, 0xfff4c0],
    gravityY: 160,
    emitting: false,
    maxAliveParticles: GROUNDS_CAPS.coinSparkle,
  });
  coinSparkle.setDepth(uiDepth);

  // Grey dust puff at a placed facility's iso position (idle, reused).
  const dustPuff = scene.add.particles(0, 0, KEY_PARTICLE, {
    lifespan: 600,
    speed: { min: 20, max: 70 },
    scale: { start: 1.8, end: 0 },
    tint: [0x9a9a9a, 0xb5b5b5, 0x808080],
    alpha: { start: 0.8, end: 0 },
    gravityY: -20,
    emitting: false,
    maxAliveParticles: GROUNDS_CAPS.dustPuff,
  });
  dustPuff.setDepth(uiDepth);

  // Full-screen premiership confetti (idle; started for 3s on a premiership).
  const confetti = scene.add.particles(0, 0, KEY_PARTICLE, {
    x: { min: 0, max: cam.width },
    y: -10,
    lifespan: 3000,
    frequency: 40,
    quantity: 2,
    speedY: { min: 60, max: 160 },
    speedX: { min: -40, max: 40 },
    rotate: { min: 0, max: 360 },
    scale: { start: 2, end: 1 },
    tint: CONFETTI_TINTS,
    gravityY: 60,
    emitting: false,
    maxAliveParticles: GROUNDS_CAPS.confetti,
  });
  confetti.setScrollFactor(0); // screen-space full-screen effect
  confetti.setDepth(uiDepth);

  const emitters = [coinSparkle, dustPuff, confetti];

  const onMoney = (p: { delta: number }): void => {
    if (p.delta <= 0) return;
    const hud = document.querySelector<HTMLElement>('[data-hud="money"]');
    if (!hud) return; // HUD not mounted → skip rather than throw (spec)
    const r = hud.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    // Map the HUD money corner (screen px) into world space.
    const world = cam.getWorldPoint(r.left + r.width / 2, r.top + r.height / 2);
    coinSparkle.explode(GROUNDS_CAPS.coinSparkle, world.x, world.y);
  };

  const onFacility = (f: { x: number; y: number }): void => {
    const w = facilityToWorld(f.x, f.y, offsetX);
    dustPuff.explode(GROUNDS_CAPS.dustPuff, w.x, w.y);
  };

  const onSeason = (p: { premiership: boolean }): void => {
    if (!p.premiership) return;
    confetti.start();
    scene.time.delayedCall(3000, () => confetti.stop());
  };

  const offs: Array<() => void> = [
    bus.on('money:changed', onMoney),
    bus.on('facility:placed', onFacility),
    bus.on('season:ended', onSeason),
  ];

  return makeHandle(scene, offs, emitters);
}

// ── Shared teardown wiring ───────────────────────────────────────────────────

/**
 * Common teardown wiring (spec-explicit): unsubscribe every bus handler, destroy
 * every emitter, detach the shutdown listener. Registered on the scene
 * 'shutdown' event and returned as the handle's destroy() for forced teardown.
 */
function makeHandle(
  scene: Phaser.Scene,
  offs: Array<() => void>,
  emitters: Phaser.GameObjects.Particles.ParticleEmitter[],
): FxHandle {
  let done = false;
  const teardown = (): void => {
    if (done) return;
    done = true;
    offs.forEach((fn) => fn()); // bus.on returns an unsubscribe fn
    emitters.forEach((e) => e.destroy());
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, teardown);
    if (scene.data?.get(DATA_KEY) === handle) scene.data.remove(DATA_KEY);
  };
  const handle: FxHandle = { destroy: teardown };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, teardown);
  scene.data?.set(DATA_KEY, handle);
  return handle;
}
