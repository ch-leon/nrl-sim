/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { formatBuildLabel } from './src/ui/buildInfo';
import { claudeDirIgnored } from './src/utils/devWatch';
import { minifyCssConsts } from './src/utils/cssMinify';
import { PWA_MANIFEST, brandIndexHtml } from './src/brandBuild';

// BAK-204 (WU-16): installable, offline-capable PWA via generateSW.
// The Phaser chunk is large, so the Workbox precache size cap is raised to ~6MB.
// devOptions stays disabled so `vite`/`vitest` never register a SW or cache churn.
// GitHub Pages serves the site from /<repo>/ (GitHub #76): CI sets BASE_PATH
// for that build only, so `npm run dev`, tests and the root build stay at '/'.
const base = process.env.BASE_PATH ?? '/';

// Build label (N7, GitHub #181): the date and the short SHA of the commit being
// built, shown on the title screen and in the Guide so a phone can tell which
// deploy it is on. `git` first; GITHUB_SHA when there is no checkout to ask;
// `local` otherwise.
function shortSha(): string | null {
  try {
    const out = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (out) return out;
  } catch {
    // Not a git checkout (a tarball build).
  }
  const env = process.env.GITHUB_SHA;
  return env ? env.slice(0, 7) : null;
}
const BUILD_LABEL = formatBuildLabel(new Date(), shortSha());

export default defineConfig({
  base,
  define: { __NRL_BUILD__: JSON.stringify(BUILD_LABEL) },
  plugins: [
    // The UI's stylesheets without their comments and indents (about 5 KB gzipped);
    // build only, so tests and the dev server read them as written.
    {
      name: 'nrl-css-minify',
      apply: 'build',
      transform(code, id) {
        if (!/[\\/]src[\\/]ui[\\/].*\.ts$/.test(id) || !code.includes('CSS = `')) return null;
        return { code: minifyCssConsts(code), map: null };
      },
    },
    // The brand (#363): index.html's %BRAND_*% placeholders, for the dev server and the build.
    {
      name: 'nrl-brand-html',
      transformIndexHtml: { order: 'pre', handler: (html) => brandIndexHtml(html) },
    },
    VitePWA({
      // 'prompt' (N7, #181): a new build waits for the player to tap Reload on
      // the update bar (src/fx/pwa.ts, src/ui/updatePrompt.ts) instead of
      // swapping itself in mid-session, which could reload a match in progress.
      registerType: 'prompt',
      strategies: 'generateSW',
      manifest: PWA_MANIFEST,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6_000_000,
      },
      devOptions: { enabled: false },
    }),
  ],
  // Claude sessions keep their worktrees in .claude/worktrees/; Vite full-reloads the page for
  // any tsconfig.json it sees change there, which restarted the game mid-match on the dev
  // server (tests/qa/devServerWatch.test.ts). Only this checkout's own .claude/: a checkout
  // that is itself one of those worktrees still watches its own files.
  server: { watch: { ignored: [claudeDirIgnored(fileURLToPath(new URL('.', import.meta.url)))] } },
  test: { globals: true, environment: 'node', include: ['tests/**/*.test.ts'] },
});
