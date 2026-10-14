import { describe, it, expect } from 'vitest';
import { personAtlas, personFrameX, personKey, personLook, lifePropTextures, PERSON_FRAMES_PER_DIR } from '../../../src/art/grounds/people';
import { charFrame, CHAR_DIRS, CHAR_W, CHAR_H } from '../../../src/art/grounds/manager';
import { kitFromColors } from '../../../src/art/match/kit';
import { LOOKS, lookForPlayer } from '../../../src/art/match/players';

const kit = kitFromColors(['#d81e2c', '#f4f1e8'], 'player');

function colours(buf: { data: Uint8ClampedArray }): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < buf.data.length; i += 4) {
    if (buf.data[i + 3]! > 0) out.add((buf.data[i]! << 16) | (buf.data[i + 1]! << 8) | buf.data[i + 2]!);
  }
  return out;
}

describe('people art', () => {
  it('uses the same per-player look and club kit as the match', () => {
    const look = personLook('player', 'pl-07', kit);
    const m = LOOKS[lookForPlayer('pl-07')]!;
    expect(look.skin).toBe(m.skin);
    expect(look.hair).toBe(m.hair);
    expect(look.shirt).toBe(kit.jersey);
    expect(look.trim).toBe(kit.trim);
    const used = colours(personAtlas(look));
    expect(used.has(kit.jersey)).toBe(true);
    expect(used.has(m.skin)).toBe(true);
    expect(used.has(0xf4c430)).toBe(false); // manager gold fully swapped out
  });

  it('is deterministic and shares one atlas per look', () => {
    const a = personLook('player', 'pl-01', kit);
    expect(personAtlas(a).data).toEqual(personAtlas(personLook('player', 'pl-01', kit)).data);
    expect(personKey(a)).toBe(personKey(personLook('player', 'pl-01', kit)));
    expect(personKey(a)).not.toBe(personKey(personLook('coach', 'coach', kit)));
  });

  it('keeps the manager silhouette: same opaque pixels per frame', () => {
    const atlas = personAtlas(personLook('fan', 'fan-2', kit));
    expect(atlas.w).toBe(CHAR_W * CHAR_DIRS.length * PERSON_FRAMES_PER_DIR);
    for (const dir of CHAR_DIRS) {
      for (const f of [null, 0, 1, 2, 3]) {
        const src = charFrame(dir, f);
        const x0 = personFrameX(dir, f);
        for (let y = 0; y < CHAR_H; y++) {
          for (let x = 0; x < CHAR_W; x++) expect(atlas.get(x0 + x, y).alpha).toBe(src.get(x, y).alpha);
        }
      }
    }
  });

  it('draws props and emotes', () => {
    for (const { buf } of lifePropTextures()) expect(colours(buf).size).toBeGreaterThan(1);
  });
});
