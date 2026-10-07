import { describe, it, expect } from 'vitest';
import { PixelBuffer } from '../../../src/art/pixel';
import { OUTLINE, kitFromColors } from '../../../src/art/match/kit';
import {
  ANIM_ORDER,
  BASE_Y,
  FRAME_H,
  FRAME_W,
  LOOKS,
  PLAYER_ANIMS,
  buildPlayerAtlas,
  drawPlayerFrame,
  lookForSlot,
  opaqueBounds,
  rotate90,
} from '../../../src/art/match/players';

/** Byte-for-byte equality of two pixel arrays. */
function sameData(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const kit = kitFromColors(['#f4d03f', '#1a1a2e'], 'player');
const kit2 = kitFromColors(['#8e1c1c', '#f2c14e'], 'rival-reapers');

function countColor(b: PixelBuffer, c: number): number {
  let n = 0;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (b.get(x, y).alpha && b.get(x, y).color === c) n++;
  return n;
}

describe('player frames', () => {
  it('every anim frame is non-empty, fits its cell and has a dark outline', () => {
    for (const anim of ANIM_ORDER) {
      for (let f = 0; f < PLAYER_ANIMS[anim].frames; f++) {
        const b = drawPlayerFrame(kit, LOOKS[0]!, anim, f);
        expect(b.w).toBe(FRAME_W);
        expect(b.h).toBe(FRAME_H);
        const bb = opaqueBounds(b);
        expect(bb, `${anim}${f}`).not.toBeNull();
        expect(bb!.x0).toBeGreaterThanOrEqual(0);
        expect(bb!.y0, `${anim}${f} clipped at top`).toBeGreaterThan(0);
        expect(countColor(b, OUTLINE)).toBeGreaterThan(20);
        expect(countColor(b, kit.jersey) + countColor(b, kit.jerseyShade)).toBeGreaterThan(0);
      }
    }
  });

  it('standing frames touch the ground line; the jump frame leaves it', () => {
    const idle = opaqueBounds(drawPlayerFrame(kit, LOOKS[0]!, 'idle', 0))!;
    expect(idle.y1).toBe(BASE_Y + 1); // boot row + 1px outline
    const jump = opaqueBounds(drawPlayerFrame(kit, LOOKS[0]!, 'celebrate', 1))!;
    expect(jump.y1).toBeLessThan(idle.y1);
    // Lying frames are wider than tall.
    const down = opaqueBounds(drawPlayerFrame(kit, LOOKS[0]!, 'down', 0))!;
    expect(down.x1 - down.x0).toBeGreaterThan(down.y1 - down.y0);
  });

  it('run cycle frames are all different (a real leg/arm cycle)', () => {
    const frames = Array.from({ length: PLAYER_ANIMS.run.frames }, (_, f) =>
      Array.from(drawPlayerFrame(kit, LOOKS[1]!, 'run', f).data).join(','),
    );
    expect(new Set(frames).size).toBe(frames.length);
  });

  it('palette-swaps per kit and is deterministic', () => {
    const a = drawPlayerFrame(kit, LOOKS[2]!, 'idle', 0);
    const b = drawPlayerFrame(kit, LOOKS[2]!, 'idle', 0);
    const c = drawPlayerFrame(kit2, LOOKS[2]!, 'idle', 0);
    expect(sameData(a.data, b.data)).toBe(true);
    expect(sameData(a.data, c.data)).toBe(false);
    expect(countColor(c, kit2.jersey)).toBeGreaterThan(0);
    expect(countColor(a, kit2.jersey)).toBe(0);
  });

  it('looks vary skin tone across a team', () => {
    const skins = new Set(Array.from({ length: 13 }, (_, i) => LOOKS[lookForSlot(i)]!.skin));
    expect(skins.size).toBeGreaterThanOrEqual(3);
  });
});

describe('rotate90', () => {
  it('four quarter turns are the identity; cw then ccw too', () => {
    const b = drawPlayerFrame(kit, LOOKS[0]!, 'idle', 0);
    const sq = new PixelBuffer(FRAME_H, FRAME_H);
    sq.blit(b, 0, 0);
    const r4 = rotate90(rotate90(rotate90(rotate90(sq, 'cw'), 'cw'), 'cw'), 'cw');
    expect(sameData(r4.data, sq.data)).toBe(true);
    const back = rotate90(rotate90(sq, 'cw'), 'ccw');
    expect(sameData(back.data, sq.data)).toBe(true);
  });
});

describe('buildPlayerAtlas', () => {
  it('packs every look × anim frame with unique names inside the buffer', () => {
    const { buf, frames } = buildPlayerAtlas(kit);
    const perLook = ANIM_ORDER.reduce((n, a) => n + PLAYER_ANIMS[a].frames, 0);
    expect(frames).toHaveLength(perLook * LOOKS.length);
    expect(new Set(frames.map((f) => f.name)).size).toBe(frames.length);
    for (const f of frames) {
      expect(f.x + f.w).toBeLessThanOrEqual(buf.w);
      expect(f.y + f.h).toBeLessThanOrEqual(buf.h);
    }
  });
});
