// Export a self-contained review artifact; no server, assets or network needed.
// node scripts/export-art-preview.mjs /tmp/nrl-art-preview.html
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? '/tmp/nrl-art-preview.html');
const result = await build({
  stdin: { contents: `import { bootArtLab } from './src/labs/art/boot'; bootArtLab(); document.querySelector('header a').href = 'https://ch-leon.github.io/nrl-sim/'; document.querySelector('#contact-cases').click();`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, format: 'iife', minify: true, target: 'es2020',
});
let fonts = '';
for (const [name, folder, weight] of [['Barlow Condensed', 'barlow-condensed', 600], ['IBM Plex Sans', 'ibm-plex-sans', 400], ['IBM Plex Mono', 'ibm-plex-mono', 400]]) {
  const data = await readFile(`node_modules/@fontsource/${folder}/files/${folder}-latin-${weight}-normal.woff2`);
  fonts += `@font-face{font-family:'${name}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');font-display:swap;}`;
}
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NRL Sim · Match art prototype</title><style>${fonts}body{margin:0;font-family:'IBM Plex Sans',sans-serif;-webkit-font-smoothing:antialiased}canvas{image-rendering:pixelated}</style><body><script>${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, html);
console.log(`Wrote ${out} (${Math.ceil(Buffer.byteLength(html) / 1024)} KiB)`);
