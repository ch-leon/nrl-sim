// Three isolated preview bundles; normal builds retain the production rules.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, process.argv[2] ?? 'e2e-output/match-preview/dist');
function run(script, args, env = {}) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], {
    cwd: root, env: { ...process.env, ...env }, stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run('node_modules/typescript/bin/tsc', ['--noEmit']);
run('node_modules/vite-node/vite-node.mjs', ['scripts/gen-icons.mjs']);
for (const length of [100, 80, 60]) {
  run('node_modules/vite/bin/vite.js', ['build', '--outDir', resolve(out, `${length}m`)], {
    NRL_MATCH_PREVIEW_LENGTH: String(length), BASE_PATH: `/${length}m/`,
  });
}
mkdirSync(out, { recursive: true });
copyFileSync(resolve(root, 'scripts/match-preview/index.html'), resolve(out, 'index.html'));
console.log(`Match comparison ready: ${out}`);
