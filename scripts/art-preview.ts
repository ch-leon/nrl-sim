// scripts/art-preview.ts — dev-only contact sheet for generated pixel art.
//
// Renders PixelBuffers to an upscaled PNG so art can be eyeballed without
// booting the game:
//
//   npx vite-node scripts/art-preview.ts <module> [outFile] [scale]
//
// <module> is a path to a TS module whose default export is
//   () => { name: string; buf: PixelBuffer }[]
// Sheets are laid out in a grid on a mid-grey checker so transparency reads.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PixelBuffer } from '../src/art/pixel';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(Buffer.from(type, 'ascii'), 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

async function main(): Promise<void> {
  const [modPath, outFile = 'art-preview.png', scaleArg = '4'] = process.argv.slice(2);
  if (!modPath) throw new Error('usage: art-preview.ts <module> [outFile] [scale]');
  const scale = Math.max(1, Number(scaleArg) || 4);
  const mod = (await import(pathToFileURL(resolve(modPath)).href)) as {
    default: () => { name: string; buf: PixelBuffer }[];
  };
  const items = mod.default();
  const pad = 4;
  const cols = Math.ceil(Math.sqrt(items.length));
  const cellW = Math.max(...items.map((i) => i.buf.w)) + pad * 2;
  const cellH = Math.max(...items.map((i) => i.buf.h)) + pad * 2;
  const rows = Math.ceil(items.length / cols);
  const sheet = new PixelBuffer(cols * cellW, rows * cellH);
  for (let y = 0; y < sheet.h; y++) {
    for (let x = 0; x < sheet.w; x++) sheet.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? 0x6a6a6a : 0x7a7a7a);
  }
  items.forEach((it, i) => sheet.blit(it.buf, (i % cols) * cellW + pad, Math.floor(i / cols) * cellH + pad));
  const W = sheet.w * scale;
  const H = sheet.h * scale;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const si = (Math.floor(y / scale) * sheet.w + Math.floor(x / scale)) * 4;
      out.set(sheet.data.subarray(si, si + 4), (y * W + x) * 4);
    }
  }
  writeFileSync(outFile, encodePng(W, H, out));
  console.log(`wrote ${outFile} (${W}x${H}) — ${items.map((i) => i.name).join(', ')}`);
}

void main();
