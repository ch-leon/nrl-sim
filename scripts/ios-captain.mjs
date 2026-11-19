// scripts/ios-captain.mjs — the captain icon's four poses as the widget extension's asset
// catalogue (docs/specs/ios.md §3, Phase 4): ios/App/BigCoachWidgets/Assets.xcassets/
// Captain{Carry,Try,Tackle,Fulltime}.imageset/. scripts/gen-ios-captain.mjs writes them (build:ios
// runs it); tests/native/iosCaptainAssets.test.ts fails while the committed files differ from a fresh
// render of src/art/captainPoses.ts. The PNGs are committed so a checkout builds without the script.
//
// Each pose is the 40x40-art-pixel buffer enlarged x2 (nearest neighbour: no smoothing), declared
// as a 3x image: 80x80 pixels, 26.7 points tall on every screen. One image serves every device scale.
import { fileURLToPath } from 'node:url';
import { captainPoses, CAPTAIN_POSES } from '../src/art/captainPoses';
import { encodePng } from './lib/png.mjs';

export const IOS_CAPTAIN_CATALOG = fileURLToPath(new URL('../ios/App/BigCoachWidgets/Assets.xcassets', import.meta.url));
/** Art pixels are enlarged this many times, then declared at IDIOM_SCALE: 40 x 2 / 3 = 26.7 pt. */
export const ART_SCALE = 2;
export const IDIOM_SCALE = 3;

/** Nearest-neighbour: each art pixel becomes a scale x scale block. */
export function enlarge(buf, scale) {
  const w = buf.w * scale, h = buf.h * scale;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (Math.floor(y / scale) * buf.w + Math.floor(x / scale)) * 4;
    rgba.set(buf.data.subarray(si, si + 4), (y * w + x) * 4);
  }
  return { w, h, rgba, png: encodePng(w, h, rgba) };
}

const jsonFile = (v) => Buffer.from(JSON.stringify(v, null, 2) + '\n');

/** Every file of the catalogue, by path relative to it, as Buffers. */
export function captainCatalogFiles() {
  const files = new Map();
  files.set('Contents.json', jsonFile({ info: { author: 'xcode', version: 1 } }));
  const poses = captainPoses();
  for (const pose of CAPTAIN_POSES) {
    const name = 'Captain' + pose[0].toUpperCase() + pose.slice(1);
    const file = `${name}@${IDIOM_SCALE}x.png`;
    files.set(`${name}.imageset/${file}`, enlarge(poses[pose], ART_SCALE).png);
    files.set(`${name}.imageset/Contents.json`, jsonFile({
      images: [{ idiom: 'universal', filename: file, scale: `${IDIOM_SCALE}x` }],
      info: { author: 'xcode', version: 1 },
      properties: { 'preserves-vector-representation': false },
    }));
  }
  return files;
}
