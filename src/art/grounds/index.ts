// src/art/grounds/index.ts — club grounds art registration.
//
// groundsTextures() is the pure list of every generated grounds texture
// (tiles, manager frames, facilities, decor); registerGroundsArt() uploads them
// with toTexture and registers the manager's walk-<dir> animations. BootScene
// calls registerGroundsArt once at boot (ARCHITECTURE §1.4/§7: no binary art).
//
// N10.6: facility art is most of the boot's painting (36 textures, every defId at
// three levels), so BootScene paints only the facilities placed, at their levels;
// ensureFacilityTexture() paints any other one the moment it is first shown, and
// paintFacilitiesWhenIdle() fills in the rest in idle slices after the first frame.
import type Phaser from 'phaser';
import { toTexture, type PixelBuffer } from '../pixel';
import { tileTextures } from './tiles';
import { charTextures, CHAR_DIRS, CHAR_WALK_FRAMES } from './manager';
import { facilityArt, facilityTextureKey, facilityTextures, FACILITY_LEVELS, type FacilityLevel } from './facilities';
import { FACILITY_CATALOG, type FacilityDefId } from '../../data/facility';
import { decorTextures } from './decor';

/** Walk animation frame rate (frames/sec). */
const WALK_FPS = 8;

/** Every grounds texture as { key, buf } — pure, deterministic. */
export function groundsTextures(): { key: string; buf: PixelBuffer }[] {
  return [...tileTextures(), ...charTextures(), ...facilityTextures(), ...decorTextures()];
}

/**
 * Upload the grounds textures and register `walk-<dir>` (looping, 8fps). With
 * `facilities`, only those facility textures are painted (the ones placed; N10.6),
 * the rest on demand; without, every facility (tools and tests).
 */
export function registerGroundsArt(scene: Phaser.Scene, facilities?: readonly { defId: FacilityDefId; level: number }[]): void {
  if (facilities) {
    for (const { key, buf } of [...tileTextures(), ...charTextures(), ...decorTextures()]) toTexture(scene, key, buf);
    for (const f of facilities) ensureFacilityTexture(scene, f.defId, f.level);
  } else {
    for (const { key, buf } of groundsTextures()) toTexture(scene, key, buf);
  }
  for (const dir of CHAR_DIRS) {
    const frames: Phaser.Types.Animations.AnimationFrame[] = [];
    for (let f = 0; f < CHAR_WALK_FRAMES; f++) frames.push({ key: `char-walk-${dir}-${f}` });
    scene.anims.create({ key: `walk-${dir}`, frames, frameRate: WALK_FPS, repeat: -1 });
  }
}

/** The facility's texture key, painted first if it is not there yet (N10.6). */
export function ensureFacilityTexture(scene: Phaser.Scene, defId: FacilityDefId, level: number): string {
  const key = facilityTextureKey(defId, level);
  if (!scene.textures.exists(key)) {
    const lvl = Number(key.slice(key.lastIndexOf('-') + 1)) as FacilityLevel;
    toTexture(scene, key, facilityArt(defId, lvl).buf);
  }
  return key;
}

/** Runs `fn` when the page is idle (or soon, where there is no idle callback). */
function whenIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(() => fn(), { timeout: 2000 });
  else setTimeout(fn, 50);
}

/**
 * Paint every facility texture not painted yet, one per idle slice, so the Build
 * menu's placements and upgrades find them ready. Returns a cancel function.
 */
export function paintFacilitiesWhenIdle(scene: Phaser.Scene, schedule: (fn: () => void) => void = whenIdle): () => void {
  const todo = (Object.keys(FACILITY_CATALOG) as FacilityDefId[])
    .flatMap((defId) => FACILITY_LEVELS.map((level) => ({ defId, level })))
    .filter(({ defId, level }) => !scene.textures.exists(facilityTextureKey(defId, level)));
  let cancelled = false;
  const step = (): void => {
    if (cancelled) return;
    const next = todo.shift();
    if (!next) return;
    ensureFacilityTexture(scene, next.defId, next.level);
    if (todo.length) schedule(step);
  };
  if (todo.length) schedule(step);
  return () => { cancelled = true; };
}
