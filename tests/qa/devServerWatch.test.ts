import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type HMRPayload, type ViteDevServer } from 'vite';
import { claudeDirIgnored } from '../../src/utils/devWatch';

// The dev server (`npm run dev`, .claude/launch.json) watches the whole checkout. Claude
// sessions keep their worktrees under .claude/worktrees/, and Vite full-reloads the page for
// any tsconfig.json it sees added or changed, so every worktree a session made or rebased
// reloaded the game mid-match. vite.config.ts now leaves .claude/ out of the watch.

// No @types/node in the tsconfig (see tests/fx/pwa.test.ts): node builtins come in through a
// dynamic import tsc does not resolve.
/* eslint-disable @typescript-eslint/no-explicit-any */
async function nodeRequire(spec: string): Promise<any> {
  const dynamicImport: (s: string) => Promise<any> = (s) => import(/* @vite-ignore */ s);
  return dynamicImport(spec);
}
let fs: any;
let path: any;
let root: string;
let probeDir: string;
let controlDir: string;

let server: ViteDevServer;
const seen: string[] = [];
const sent: HMRPayload[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function until(check: () => boolean, ms: number, every = 50): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end && !check()) await sleep(every);
  return check();
}

beforeAll(async () => {
  fs = await nodeRequire('node:fs');
  path = await nodeRequire('node:path');
  const url = await nodeRequire('node:url');
  root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
  probeDir = path.join(root, '.claude', 'worktrees', 'qa-watch-probe');
  // A control under e2e-output/ (gitignored, still watched): shows the watcher is live and that
  // a new tsconfig.json there does reload, so the .claude/ check is not passing vacuously.
  controlDir = path.join(root, 'e2e-output', 'qa-watch-probe');
  fs.rmSync(probeDir, { recursive: true, force: true });
  fs.rmSync(controlDir, { recursive: true, force: true });
  // As on a machine where sessions use worktrees: the folder is there before the server starts.
  fs.mkdirSync(path.dirname(probeDir), { recursive: true });
  // Not listened on, so no port, no HMR socket and no dependency pre-bundling; the watcher and
  // the plugins' configureServer hooks (which send the reload) still run.
  server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), logLevel: 'silent' });
  server.hot.send = ((payload: HMRPayload) => void sent.push(payload)) as typeof server.hot.send;
  server.watcher.on('all', (_event, file) => void seen.push(file));
  await new Promise<void>((r) => server.watcher.on('ready', () => r()));
  // 'ready' can come before the scan of the root is done, and a file the scan finds counts as
  // already there (no event), so wait for the set of watched folders to stop growing.
  let size = -1;
  await until(() => {
    const now = Object.keys(server.watcher.getWatched()).length;
    const settled = now === size;
    size = now;
    return settled;
  }, 15_000, 500);
}, 30_000);

afterAll(async () => {
  await server?.close();
  fs?.rmSync(probeDir, { recursive: true, force: true });
  fs?.rmSync(controlDir, { recursive: true, force: true });
});

describe('dev server watch', () => {
  it('does not reload the game when a worktree under .claude/ changes', async () => {
    fs.mkdirSync(path.join(probeDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(probeDir, 'tsconfig.json'), '{}\n');
    fs.writeFileSync(path.join(probeDir, 'index.html'), '<!doctype html>\n');
    fs.writeFileSync(path.join(probeDir, 'src', 'main.ts'), 'export {};\n');
    await sleep(1500);
    expect(sent).toEqual([]);
    expect(seen.filter((f) => f.startsWith(probeDir))).toEqual([]);

    fs.mkdirSync(controlDir, { recursive: true });
    fs.writeFileSync(path.join(controlDir, 'tsconfig.json'), '{}\n');
    expect(await until(() => sent.some((p) => p.type === 'full-reload'), 10_000)).toBe(true);
    expect(seen).toContain(path.join(controlDir, 'tsconfig.json'));
  }, 30_000);

  it('watches the game\'s own files, wherever the checkout is', () => {
    expect(Object.keys(server.watcher.getWatched())).toContain(path.join(root, 'src'));
  });
});

describe('claudeDirIgnored', () => {
  it('leaves out only the checkout\'s own .claude/, also when the checkout is a session worktree', () => {
    const plain = claudeDirIgnored('/home/u/nrl-sim');
    expect(plain('/home/u/nrl-sim/.claude')).toBe(true);
    expect(plain('/home/u/nrl-sim/.claude/worktrees/s/tsconfig.json')).toBe(true);
    expect(plain('/home/u/nrl-sim/src/main.ts')).toBe(false);
    expect(plain('/home/u/nrl-sim/.claudette/x.ts')).toBe(false);
    // A checkout under another's .claude/worktrees/ (where sessions work): a `**/.claude/**`
    // glob matched all of it, so its dev server watched nothing (#250's first form).
    const worktree = claudeDirIgnored('/home/u/nrl-sim/.claude/worktrees/s/');
    expect(worktree('/home/u/nrl-sim/.claude/worktrees/s/src/main.ts')).toBe(false);
    expect(worktree('/home/u/nrl-sim/.claude/worktrees/s/tsconfig.json')).toBe(false);
    expect(worktree('/home/u/nrl-sim/.claude/worktrees/s/.claude/worktrees/t/tsconfig.json')).toBe(true);
  });
});
