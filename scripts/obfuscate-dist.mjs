// scripts/obfuscate-dist.mjs — APK-only hardening (#89).
//
// Runs after the native build (`npm run build:android`, with NRL_NATIVE=1) and
// before `npx cap sync android`, over the JS the APK ships (dist/assets/*.js). It
// renames identifiers and encodes string literals so the bundle can't be read at a
// glance once pulled out of the APK. This only deters casual inspection — it is NOT
// real protection (see docs/android-test-build.md).
//
// It is never run for the web or GitHub Pages build: those keep readable bundles.
//
// Settings are deliberately moderate. Every chunk gets identifier renaming and a
// string array; control-flow flattening and dead-code injection (which bloat the
// bundle and cost real FPS) are OFF, and renameGlobals stays OFF so the Web Worker
// entry points (self/onmessage/postMessage) keep working. The transform preserves
// behaviour, so the match sim stays deterministic and its fingerprints are unchanged.
//
// String-array *encoding* (base64) is applied only to the Worker chunks — the match
// engine and the art generator, which hold the game's own logic and run off the main
// thread. The big index chunk (Phaser + the UI, on the main thread) gets a plain
// string array with NO encoding: a per-string base64 decode in the render loop drops
// the match to ~18 fps under software GL, while this split holds a steady 60 fps for
// the same ~+22% size (measured; see the PR and docs/android-test-build.md).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'dist', 'assets');

/** Moderate preset: string hiding + name mangling, no control-flow/dead-code cost. */
const BASE = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  identifierNamesGenerator: 'mangled-shuffled',
  renameGlobals: false,
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: false,
  numbersToExpressions: false,
  simplify: true,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  sourceMap: false,
  target: 'browser',
};

/** Vite names the worker chunks `<name>Worker-<hash>.js` (matchWorker, artWorker). */
const isWorkerChunk = (file) => /Worker-[^/]*\.js$/.test(file);

/** Base64-encode strings in the off-thread Worker chunks only; plain array elsewhere. */
const optionsFor = (file) => ({
  ...BASE,
  stringArrayEncoding: isWorkerChunk(file) ? ['base64'] : [],
});

const kib = (n) => (n / 1024).toFixed(1);

let files;
try {
  files = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`obfuscate-dist: ${ASSETS} not found — run the native build first.`);
  process.exit(1);
}
if (files.length === 0) {
  console.error('obfuscate-dist: no .js files in dist/assets — nothing to obfuscate.');
  process.exit(1);
}

let before = 0;
let after = 0;
console.log('Obfuscating the APK JS (dist/assets):');
for (const f of files.sort()) {
  const p = join(ASSETS, f);
  const src = readFileSync(p, 'utf8');
  const out = JavaScriptObfuscator.obfuscate(src, optionsFor(f)).getObfuscatedCode();
  writeFileSync(p, out);
  before += Buffer.byteLength(src);
  after += Buffer.byteLength(out);
  console.log(`  ${f}: ${kib(Buffer.byteLength(src))} → ${kib(Buffer.byteLength(out))} KiB`);
}
const pct = (((after - before) / before) * 100).toFixed(1);
console.log(`APK JS total: ${kib(before)} → ${kib(after)} KiB (${pct >= 0 ? '+' : ''}${pct}%)`);
