import { describe, it, expect, vi } from 'vitest';
import { groundsTextures, registerGroundsArt } from '../../../src/art/grounds';
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
