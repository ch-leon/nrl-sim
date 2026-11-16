// src/match/view/impact.ts — how hard a big moment lands (#631). Three tiers,
// all screen-only: the sim's ticks, events and result are the same for a seed,
// because all this does is scale real time (the runner's slow-motion and freeze)
// and nudge the camera. The live match and the lab both call `playImpact`, so
// they feel the same. Off under prefers-reduced-motion.
//
//   1  A try, a clean line break, a 40/20: about ×0.35 for 900 ms, eased in and
//      out, and the close-up.
//   2  A big hit, a bust, a strip, an intercept, a held-up: a ~90 ms freeze on the contact
//      tick, a shake the same size on screen at any zoom, a dust puff there (the
//      contest layer draws it).
//   3  Every other big pop-up: the pop-up alone.
import type { SimEvent } from '../core/snapshot';
import type { Popup } from './popups';
import { screenDensity } from '../../world/viewport';

export type ImpactTier = 1 | 2 | 3;

/** Tier 1: the slow-motion beat, real ms, its time factor and the ease in and out (real ms each). */
export const TIER1_MS = 900;
export const TIER1_FACTOR = 0.35;
export const TIER1_RAMP_MS = 250;

/** Tier 2: the freeze on the contact tick, real ms. */
export const FREEZE_MS = 90;
/** Tier 2: the shake, real ms and how far it throws the picture, in screen px (the same at any zoom). */
export const SHAKE_MS = 110;
export const SHAKE_PX = 4;

const TIER2_KINDS: ReadonlySet<string> = new Set(['big-hit', 'break-tackle', 'strip', 'intercept', 'held-up']);
const TIER1_KINDS: ReadonlySet<string> = new Set(['try', 'line-break', '40-20']);

/**
 * The tier of a pop-up'd event, or null when it is not a big moment. `popup` is
 * what `popupFor` made of the event: a half line break, a missed kick and every
 * small shout have none, or are not big, and so have no tier.
 */
export function impactTier(e: Pick<SimEvent, 'kind'>, popup: Pick<Popup, 'big'> | null): ImpactTier | null {
  if (!popup || !popup.big) return null;
  if (TIER1_KINDS.has(e.kind)) return 1;
  if (TIER2_KINDS.has(e.kind)) return 2;
  return 3;
}

/**
 * Phaser's `camera.shake` throws the picture by `intensity × camera width × zoom`
 * in world px, which the zoom scales again on screen. This is the intensity that
 * throws it `px` screen px at any zoom.
 */
export function shakeIntensity(px: number, cameraWidth: number, zoom: number): number {
  const z = Math.max(zoom, 1e-3);
  return px / (Math.max(cameraWidth, 1) * z * z);
}

/** Prefers-reduced-motion, read the same way as src/fx/atmosphere.ts. */
export function reducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** What an impact moves: the runner's clock and the main camera, read as they are now (the zoom changes with the close-up). */
export interface ImpactRig {
  runner: { slowMo(ms: number, factor: number, rampMs?: number): void; freeze(ms: number): void };
  camera: { zoom: number; width?: number; worldView: { width: number }; shake?(ms: number, intensity: number): unknown };
}

/**
 * Play a tier's beat. Returns whether the moment has a close-up for its playback to let go
 * (tiers 1 and 2: the scene closes in on a try and a big hit, #627). Under
 * reduced motion there is no freeze, shake or slow-motion: the pop-up and the
 * close-up still come.
 */
export function playImpact(tier: ImpactTier, rig: ImpactRig, reduced: boolean = reducedMotion()): boolean {
  if (!reduced) {
    if (tier === 1) rig.runner.slowMo(TIER1_MS, TIER1_FACTOR, TIER1_RAMP_MS);
    else if (tier === 2) {
      rig.runner.freeze(FREEZE_MS);
      const cam = rig.camera;
      const width = cam.width ?? cam.worldView.width * cam.zoom;
      // The camera's units are canvas px (#627): SHAKE_PX is CSS px, so scale it by the screen's density.
      cam.shake?.(SHAKE_MS, shakeIntensity(SHAKE_PX * screenDensity(), width, cam.zoom));
    }
  }
  return tier !== 3;
}
