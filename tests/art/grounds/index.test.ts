import { describe, it, expect, vi } from 'vitest';
import { ensureFacilityTexture, groundsTextures, paintFacilitiesWhenIdle, registerGroundsArt } from '../../../src/art/grounds';
import { FACILITY_CATALOG } from '../../../src/data/facility';
import type Phaser from 'phaser';

describe('grounds art registration', () => {
  it('texture keys are unique and cover every key other modules use', () => {
    const keys = groundsTextures().map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    const required = [
      'tile-grass',
      'tile-dirt',
      'tile-path',
      'tile-highlight-ok',
      'tile-highlight-bad',
      'char-idle-s',
      'char-walk-n-3',
      ...Object.keys(FACILITY_CATALOG).flatMap((id) => [1, 2, 3].map((l) => `facility-${id}-${l}`)),
    ];
    for (const k of required) expect(keys).toContain(k);
  });

  it('uploads every texture and registers walk-<dir> anims', () => {
    const created: string[] = [];
    const anims: { key: string; frames: { key: string }[] }[] = [];
    const ctx = { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() };
    const scene = {
      textures: {
        exists: () => false,
        remove: vi.fn(),
        createCanvas: (key: string) => {
          created.push(key);
          return { getContext: () => ctx, refresh: vi.fn() };
        },
      },
      anims: { create: (cfg: { key: string; frames: { key: string }[] }) => anims.push(cfg) },
    } as unknown as Phaser.Scene;
    registerGroundsArt(scene);
    expect(created).toEqual(groundsTextures().map((t) => t.key));
    expect(anims.map((a) => a.key)).toEqual(['walk-n', 'walk-e', 'walk-s', 'walk-w']);
    expect(anims[1]!.frames.map((f) => f.key)).toEqual(['char-walk-e-0', 'char-walk-e-1', 'char-walk-e-2', 'char-walk-e-3']);
  });
});

/** A texture manager that remembers what was painted (no canvas). */
function fakeScene(): { scene: Phaser.Scene; painted: string[] } {
  const painted: string[] = [];
  const have = new Set<string>();
  const ctx = { createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() };
  const scene = {
    textures: {
      exists: (k: string) => have.has(k),
      remove: (k: string) => have.delete(k),
      createCanvas: (key: string) => {
        painted.push(key);
        have.add(key);
        return { getContext: () => ctx, refresh: vi.fn() };
      },
    },
    anims: { create: vi.fn() },
  } as unknown as Phaser.Scene;
  return { scene, painted };
}

// N10.6: the boot paints only the facilities placed; the rest on demand or when idle.
describe('lazy facility art (N10.6)', () => {
  const facilityKeys = groundsTextures().map((t) => t.key).filter((k) => k.startsWith('facility-'));

  it('with a facility list, the boot paints every non-facility texture and only those facilities', () => {
    const { scene, painted } = fakeScene();
    registerGroundsArt(scene, [{ defId: 'trainingPaddock', level: 2 }]);
    const nonFacility = groundsTextures().map((t) => t.key).filter((k) => !k.startsWith('facility-'));
    expect(painted.filter((k) => !k.startsWith('facility-')).sort()).toEqual([...nonFacility].sort());
    expect(painted.filter((k) => k.startsWith('facility-'))).toEqual(['facility-trainingPaddock-2']);
  });

  it('a facility texture requested before it is painted is painted then, once', () => {
    const { scene, painted } = fakeScene();
    expect(ensureFacilityTexture(scene, 'weightsRoom', 3)).toBe('facility-weightsRoom-3');
    expect(ensureFacilityTexture(scene, 'weightsRoom', 3)).toBe('facility-weightsRoom-3');
    expect(painted).toEqual(['facility-weightsRoom-3']);
    expect(ensureFacilityTexture(scene, 'weightsRoom', 7)).toBe('facility-weightsRoom-3'); // levels clamp as the key does
    expect(painted).toEqual(['facility-weightsRoom-3']);
  });

  it('idle painting fills in the rest, one texture per slice, skipping what is there', () => {
    const { scene, painted } = fakeScene();
    ensureFacilityTexture(scene, 'weightsRoom', 1);
    const slices: (() => void)[] = [];
    paintFacilitiesWhenIdle(scene, () => false, (fn) => void slices.push(fn));
    let n = 0;
    while (slices.length) { slices.shift()!(); n++; }
    expect(n).toBe(facilityKeys.length - 1);
    expect([...painted].sort()).toEqual([...facilityKeys].sort());
  });

  it('idle painting stops when cancelled', () => {
    const { scene, painted } = fakeScene();
    const slices: (() => void)[] = [];
    const cancel = paintFacilitiesWhenIdle(scene, () => false, (fn) => void slices.push(fn));
    slices.shift()!();
    cancel();
    while (slices.length) slices.shift()!();
    expect(painted.length).toBe(1);
  });

  it('a busy game or a short idle slice paints nothing and waits for the next slice', () => {
    const { scene, painted } = fakeScene();
    const slices: ((slice?: { timeRemaining(): number }) => void)[] = [];
    let busy = true;
    paintFacilitiesWhenIdle(scene, () => busy, (fn) => void slices.push(fn));
    slices.shift()!(); // a match is on
    expect(painted).toEqual([]);
    busy = false;
    slices.shift()!({ timeRemaining: () => 3 }); // too short a slice
    expect(painted).toEqual([]);
    slices.shift()!({ timeRemaining: () => 40 });
    expect(painted.length).toBe(1);
    expect(slices.length).toBe(1);
  });

  it('the grounds and the placement ghost get facility textures only through ensureFacilityTexture', async () => {
    const dynamicImport: (s: string) => Promise<{ readFileSync(p: string, enc: string): string }> = (s) => import(/* @vite-ignore */ s);
    const { readFileSync } = await dynamicImport('node:fs');
    for (const file of ['src/scenes/GroundsScene.ts', 'src/world/ghostPreview.ts']) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/facilityTextureKey\(/);
      expect(src, file).toMatch(/ensureFacilityTexture\(/);
    }
  });
});
