// tests/native/iosCaptainAssets.test.ts — the widget extension's captain images are a render of
// src/art/captainPoses.ts (docs/specs/ios.md §3). The committed catalogue under
// ios/App/BigCoachWidgets/Assets.xcassets must match a fresh render, byte for byte; this fails
// while it is out of date. Fix: `npx vite-node scripts/gen-ios-captain.mjs` (build:ios does it).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { ART_SCALE, IDIOM_SCALE, IOS_CAPTAIN_CATALOG, captainCatalogFiles } from '../../scripts/ios-captain.mjs';
import { CAPTAIN_POSES, captainPoses } from '../../src/art/captainPoses';

/** Decode an 8-bit RGBA, filter-0 PNG (what scripts/lib/png.mjs writes) to its size and pixels. */
function decode(png: Buffer): { w: number; h: number; rgba: Buffer } {
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  expect([png[24], png[25]]).toEqual([8, 6]);
  const raw = inflateSync(png.subarray(png.indexOf('IDAT') + 4, png.indexOf('IEND') - 4));
  const stride = w * 4;
  const rgba = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    expect(raw[y * (stride + 1)]).toBe(0);
    raw.copy(rgba, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
  }
  return { w, h, rgba };
}

describe('iOS captain assets', () => {
  const fresh = captainCatalogFiles();

  it('the committed catalogue is a fresh render of captainPoses.ts (run npx vite-node scripts/gen-ios-captain.mjs)', () => {
    for (const [rel, data] of fresh) {
      const path = join(IOS_CAPTAIN_CATALOG, rel);
      expect(existsSync(path), `${rel} is missing`).toBe(true);
      expect(readFileSync(path).equals(data), `${rel} is out of date`).toBe(true);
    }
  });

  it('holds nothing else (no stale pose left behind)', () => {
    const onDisk: string[] = [];
    for (const e of readdirSync(IOS_CAPTAIN_CATALOG, { withFileTypes: true })) {
      if (e.isDirectory()) for (const f of readdirSync(join(IOS_CAPTAIN_CATALOG, e.name))) onDisk.push(`${e.name}/${f}`);
      else onDisk.push(e.name);
    }
    expect(onDisk.sort()).toEqual([...fresh.keys()].sort());
  });

  it('every pose is its pixels enlarged x2, declared 3x: 80 px, about 26.7 points', () => {
    const poses = captainPoses();
    for (const pose of CAPTAIN_POSES) {
      const name = 'Captain' + pose[0]!.toUpperCase() + pose.slice(1);
      const { w, h, rgba } = decode(fresh.get(`${name}.imageset/${name}@${IDIOM_SCALE}x.png`)!);
      const art = poses[pose];
      expect([w, h]).toEqual([art.w * ART_SCALE, art.h * ART_SCALE]);
      expect(w / IDIOM_SCALE).toBeCloseTo(26.67, 1);
      for (const [x, y] of [[0, 0], [w - 1, h - 1], [Math.floor(w / 2), Math.floor(h / 2)], [w / 2 - 1, h - 3]] as const) {
        const si = (Math.floor(y / ART_SCALE) * art.w + Math.floor(x / ART_SCALE)) * 4;
        expect([...rgba.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)]).toEqual([...art.data.subarray(si, si + 4)]);
      }
      const contents = JSON.parse(fresh.get(`${name}.imageset/Contents.json`)!.toString());
      expect(contents.images).toEqual([{ idiom: 'universal', filename: `${name}@3x.png`, scale: '3x' }]);
    }
  });
});
