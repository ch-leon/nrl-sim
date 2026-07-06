// scripts/gen-icons.mjs — BAK-204 (WU-16)
// Zero-dependency PNG icon generator for the PWA. Uses only Node builtins.
// Draws a solid #1a1a2e background with a light-tinted rugby-ball ellipse motif
// into a raw RGBA buffer and encodes a spec-valid PNG by hand (signature, IHDR,
// IDAT with per-row filter byte 0 + zlib deflate, IEND, correct CRC32 per chunk).
// Idempotent: overwrites public/icons/icon-192.png and icon-512.png.
//
// Run via the `prebuild` npm script (node scripts/gen-icons.mjs).

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

// --- Palette (matches theme_color/background_color #1a1a2e) ---
const BG = [0x1a, 0x1a, 0x2e]; // dark navy
const BALL = [0xe8, 0xe4, 0xd8]; // warm off-white leather
const SEAM = [0x1a, 0x1a, 0x2e]; // seam/lace drawn in bg colour for contrast

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

/**
 * Render a size x size RGBA icon: navy field with a centred rugby-ball ellipse
 * (pointy oval, long axis diagonal-ish) plus a central seam and lace strokes.
 */
function renderRgba(size) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  // Ellipse radii: tall/narrow oval (rugby ball on its point-ish).
  const rx = size * 0.24;
  const ry = size * 0.40;

  const set = (x, y, rgb, a = 255) => {
    const o = (y * size + x) * 4;
    px[o] = rgb[0];
    px[o + 1] = rgb[1];
    px[o + 2] = rgb[2];
    px[o + 3] = a;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      set(x, y, BG); // fill background
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) {
        set(x, y, BALL);
        // Vertical central seam (a couple px wide).
        if (Math.abs(x - cx) <= Math.max(1, size * 0.012)) {
          set(x, y, SEAM);
        }
        // Horizontal lace rungs across the seam near the centre.
        const rung = Math.abs(y - cy) % Math.max(6, Math.round(size * 0.06));
        if (rung < Math.max(1, size * 0.012) && Math.abs(x - cx) <= size * 0.05) {
          set(x, y, SEAM);
        }
      }
    }
  }
  return px;
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
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
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
  const png = encodePng(size, renderRgba(size));
  const path = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(path, png);
  return { path, bytes: png.length };
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const { path, bytes } = writeIcon(size);
  console.log(`[gen-icons] wrote ${path} (${bytes} bytes)`);
}
