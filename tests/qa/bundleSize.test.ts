// tests/qa/bundleSize.test.ts — scripts/bundle-size.mjs on a small made-up build
// (#400): the total (every js and css file under assets/, the budgeted number) and
// the initial load (what index.html loads up front), with the base path GitHub
// Pages builds under.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { bundleLine, bundleSize, initialFiles, initialLine } from '../../scripts/bundle-size.mjs';

const ASSETS: Record<string, string> = {
  'index-aaa.js': 'import "./vendor-bbb.js";\n'.repeat(200),
  'vendor-bbb.js': 'export const v = 1;\n'.repeat(300),
  'index-ccc.css': 'body { margin: 0 }\n'.repeat(50),
  'guide-ddd.js': 'export const g = 2;\n'.repeat(400),
  'matchWorker-eee.js': 'self.onmessage = () => {};\n'.repeat(500),
  'font-fff.woff2': 'not counted',
};

const html = (base: string): string => `<!doctype html><html><head>
  <link rel="icon" href="${base}icon.png">
  <script type="module" crossorigin src="${base}assets/index-aaa.js"></script>
  <link rel="modulepreload" crossorigin href="${base}assets/vendor-bbb.js">
  <link rel="stylesheet" crossorigin href="${base}assets/index-ccc.css">
  <link rel="manifest" href="${base}manifest.webmanifest">
  <script id="vite-plugin-pwa:register-sw" src="${base}registerSW.js"></script>
</head><body></body></html>`;

let dist: string;
const gz = (f: string): number => gzipSync(Buffer.from(ASSETS[f]!)).length;

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), 'nrl-bundle-'));
  mkdirSync(join(dist, 'assets'));
  for (const [f, body] of Object.entries(ASSETS)) writeFileSync(join(dist, 'assets', f), body);
  writeFileSync(join(dist, 'index.html'), html('/'));
});
afterAll(() => rmSync(dist, { recursive: true, force: true }));

describe('initialFiles', () => {
  it('is the module script, its module preloads and the stylesheets; not icons, the manifest or a classic script', () => {
    expect(initialFiles(html('/')).sort()).toEqual(['index-aaa.js', 'index-ccc.css', 'vendor-bbb.js']);
  });

  it('reads past a base path (the GitHub Pages build is under /<repo>/)', () => {
    expect(initialFiles(html('/nrl-sim/')).sort()).toEqual(['index-aaa.js', 'index-ccc.css', 'vendor-bbb.js']);
  });
});

describe('bundleSize', () => {
  it('the total is every js and css file gzipped one by one, the Worker and lazy chunks included', () => {
    const b = bundleSize(dist);
    const all = ['index-aaa.js', 'vendor-bbb.js', 'index-ccc.css', 'guide-ddd.js', 'matchWorker-eee.js'];
    expect(b.files).toBe(5);
    expect(b.gzBytes).toBe(all.reduce((n, f) => n + gz(f), 0));
  });

  it('the initial load is what index.html loads up front, and leaves the lazy chunk and the Worker out', () => {
    const b = bundleSize(dist);
    expect(b.initial!.files).toBe(3);
    expect(b.initial!.gzBytes).toBe(gz('index-aaa.js') + gz('vendor-bbb.js') + gz('index-ccc.css'));
    expect(b.initial!.gzBytes).toBeLessThan(b.gzBytes);
  });

  it('prints both lines; the budget applies to the total only', () => {
    const b = bundleSize(dist);
    expect(bundleLine({ ...b, gzKb: 591 }, 590).over).toBe(true);
    expect(bundleLine({ ...b, gzKb: 590 }, 590).over).toBe(false);
    expect(bundleLine(b, 590).text).toMatch(/^Bundle: [\d,]+ bytes \(\d+ KB\) gzipped, 5 js\/css files; budget 590 KB, \d+ KB to spare\.$/);
    expect(initialLine(b)).toMatch(/^Initial load: [\d,]+ bytes \(\d+ KB\) gzipped, 3 js\/css files .*; 2 more load later\)\.$/);
    const measuredBefore = { ...b };
    delete measuredBefore.initial;
    expect(initialLine(measuredBefore)).toBeNull();
  });
});
