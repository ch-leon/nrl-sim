// scripts/gen-captain-poses.mjs — the captain icon's four stills as PNGs, for the iOS
// Dynamic Island and lock screen (docs/specs/ios.md §3). Run on demand, not on dev/build:
//
//   npm run gen:captain-poses -- [--out <dir>] [--scales 1,2,3] [--imageset] [--dry-run]
//
// Zero dependencies beyond the repo's own art code and the shared PNG encoder. Pixel art stays
// crisp: every scale is an integer nearest-neighbour enlargement of the art pixels, no smoothing.
//
//   --out <dir>        where to write (default: the scratchpad's phase4/captain-poses)
//   --scales a,b,c     integer art-pixel enlargements, one file each (default 2,4,8)
//   --imageset         write <dir>/Captain<Pose>.imageset/{Contents.json, PNG} for an asset
//                      catalog instead of flat files
//   --idiom-scale N    with --imageset: the device scale the image is declared at (1, 2 or 3;
//                      default 3). With the default --scales, a 3x image is the art enlarged x2,
//                      which draws the 40-row figure about 27 points tall: the island's slot.
//                      The first --scales value is the one used for the image set.
//   --dry-run          print what would be written and write nothing
//
// Size check: points = (art pixels x enlargement) / device scale. 40 x 2 / 3 = 26.7 pt.

import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { captainPoses, CAPTAIN_POSES } from '../src/art/captainPoses';
import { enlarge } from './ios-captain.mjs';

const DEFAULT_OUT = '/private/tmp/claude-501/-Users-leoncreed-baker-Documents-Cavehole-NRL-Sim--claude-worktrees-six-again-repo-access-6fbfe5/eca463fa-55fb-43be-a546-1d5323d53cb8/scratchpad/phase4/captain-poses';
const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };

const imageset = flag('--imageset');
const idiomScale = Number(value('--idiom-scale', '3'));
if (![1, 2, 3].includes(idiomScale)) throw new Error('--idiom-scale must be 1, 2 or 3');
const out = resolve(value('--out', DEFAULT_OUT));
const scales = value('--scales', imageset ? '2' : '2,4,8').split(',').map(Number);
if (scales.some(s => !Number.isInteger(s) || s < 1)) throw new Error('--scales must be positive integers, e.g. 1,2,3');

const dry = flag('--dry-run');

const poses = captainPoses();
const first = poses[CAPTAIN_POSES[0]];
console.log(`[gen-captain-poses] canvas ${first.w}x${first.h} art pixels, scales ${scales.join(',')}, ${imageset ? 'image sets' : 'flat files'} -> ${out}`);

function write(path, data) {
  if (!dry) writeFileSync(path, data);
  const bytes = data.length;
  const sha = createHash('sha256').update(data).digest('hex').slice(0, 12);
  console.log(`[gen-captain-poses] ${dry ? 'would write' : 'wrote'} ${path} (${bytes} bytes, sha256 ${sha})`);
}

for (const pose of CAPTAIN_POSES) {
  const name = 'Captain' + pose[0].toUpperCase() + pose.slice(1);
  const dir = imageset ? join(out, name + '.imageset') : out;
  if (!dry) mkdirSync(dir, { recursive: true });
  for (const scale of imageset ? scales.slice(0, 1) : scales) {
    write(join(dir, imageset ? `${name}@${idiomScale}x.png` : `${name}@${scale}x.png`), enlarge(poses[pose], scale).png);
  }
  if (imageset) {
    const file = `${name}@${idiomScale}x.png`;
    const contents = { images: [{ idiom: 'universal', filename: file, scale: `${idiomScale}x` }], info: { author: 'xcode', version: 1 }, properties: { 'preserves-vector-representation': false } };
    write(join(dir, 'Contents.json'), Buffer.from(JSON.stringify(contents, null, 2) + '\n'));
  }
}
