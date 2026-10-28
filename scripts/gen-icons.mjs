// scripts/gen-icons.mjs — BAK-204 (WU-16), #363
// Zero-dependency PNG icon generator for the PWA. The pixels are the brand's
// (src/art/appIcon.ts draws them from src/brand.ts: its colours and icon letters),
// so renaming the game regenerates the icons. This file encodes them as a
// spec-valid PNG by hand (signature, IHDR, IDAT with per-row filter byte 0 + zlib
// deflate, IEND, correct CRC32 per chunk) using only Node builtins.
// Idempotent: overwrites public/icons/icon-192.png and icon-512.png.
//
// Run via the `predev`/`prebuild` npm scripts with vite-node (it reads the brand's
// TypeScript). `--dry-run` prints what it would write and writes nothing.

import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../src/brand';
import { renderIcon } from '../src/art/appIcon';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');
const DRY_RUN = process.argv.includes('--dry-run');

// --- CRC32 (PNG polynomial 0xEDB88320) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** Build one PNG chunk: length(4) + type(4) + data + crc(4). */
function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/** Encode RGBA (size x size) to a PNG Buffer (8-bit, colour type 6). */
function encodePng(size, rgba) {
  const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Prepend a filter byte (0 = None) to each scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(size) {
  const png = encodePng(size, renderIcon(size, BRAND));
  const path = join(OUT_DIR, `icon-${size}.png`);
  if (!DRY_RUN) writeFileSync(path, png);
  return { path, bytes: png.length, sha: createHash('sha256').update(png).digest('hex').slice(0, 12) };
}

if (!DRY_RUN) mkdirSync(OUT_DIR, { recursive: true });
console.log(`[gen-icons] ${BRAND.name}: field ${BRAND.colors.app}, ball ${BRAND.colors.iconBall}, letters "${BRAND.iconLetters}"`);
for (const size of [192, 512]) {
  const { path, bytes, sha } = writeIcon(size);
  console.log(`[gen-icons] ${DRY_RUN ? 'would write' : 'wrote'} ${path} (${bytes} bytes, sha256 ${sha})`);
}
