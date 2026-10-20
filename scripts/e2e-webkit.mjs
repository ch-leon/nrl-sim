// scripts/e2e-webkit.mjs — Safari-shaped layout check for the long DOM panels (#206, #203).
// Builds the game, serves it with `vite preview`, and in Playwright's WebKit as an
// iPhone in landscape (touch, DPR 3, iOS user agent) at 956×330 (16 Pro Max with
// Safari's address bar and tab strip) and 844×390, checks:
//   - the page pins text-size-adjust to 100% (iOS Safari's landscape text boost off);
//   - the welcome tutorial bubble sits inside the viewport with Skip and Next on
//     screen and tappable; Next and Skip work;
//   - the same with every font in the bubble boosted 2.17× (what Safari's boost did
//     on Leon's phone, issue #206; WebKit on Linux never boosts by itself): the copy
//     scrolls inside the bubble and Skip / Next stay reachable;
//   - the Guide boosted the same way: the page scrolls, Replay and Close reachable,
//     and Replay brings the tutorial back with its buttons on screen;
//   - the player page (#203) between HUD and nav: ✕, Renew / Sell / Release / Close
//     tappable, the nav uncovered; the ✕ closes it back to Squad.
// Screenshots and report.json go to e2e-output/webkit/<WxH>/. Exits 1 on any failure.
//
//   npm run e2e:webkit
//   npm run e2e:webkit -- --size 956x330           (or E2E_SIZES="956x330 844x390")
//   WEBKIT_PATH=/path/to/pw_run.sh npm run e2e:webkit
//   E2E_URL=http://localhost:5173/ npm run e2e:webkit   (against a server you started)
//
// WebKit comes from WEBKIT_PATH or playwright-core's browser registry
// (PLAYWRIGHT_BROWSERS_PATH); CI fetches it with `playwright-core install --with-deps webkit`.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { webkit } from 'playwright-core';

const argv = process.argv.slice(2);
const sizeArg = argv.includes('--size') ? argv[argv.indexOf('--size') + 1] : process.env.E2E_SIZES;
const SIZES = (sizeArg ?? '956x330 844x390').split(/\s+/).filter(Boolean).map((s) => s.split('x').map(Number));
if (SIZES.some(([w, h]) => !(w > 0 && h > 0))) {
  console.error(`bad --size "${sizeArg}": want WxH, e.g. 956x330`);
  process.exit(2);
}
/** Safari's landscape boost on a 16 Pro Max: 956 / 440, its landscape over portrait width. */
const BOOST = 2.17;
const OUT_ROOT = process.env.E2E_OUT ?? 'e2e-output';
const PORT = Number(process.env.E2E_PORT ?? 4198);
const EXTERNAL = process.env.E2E_URL;
const BASE = `${EXTERNAL ?? `http://localhost:${PORT}/`}?e2e`;
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const log = (...a) => console.log(...a);

// ── Server: a production build served by `vite preview` ──────────────────────
let server = null;
async function startServer() {
  if (EXTERNAL) return;
  const dist = join(OUT_ROOT, 'dist-webkit');
  log('building…');
  await new Promise((res, rej) => {
    const b = spawn('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir', '--logLevel', 'warn'], { stdio: 'inherit' });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`vite build failed (${code})`))));
  });
  server = spawn('npx', ['vite', 'preview', '--outDir', dist, '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    // --strictPort: a taken port makes preview exit; don't test whatever else answers there.
    if (server.exitCode !== null) throw new Error(`vite preview exited (${server.exitCode}); is port ${PORT} taken? Set E2E_PORT.`);
    try {
      const r = await fetch(BASE.replace('?e2e', ''));
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
}
function stopServer() {
  if (server) try { process.kill(-server.pid); } catch { /* gone */ }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopServer(); process.exit(130); });

// ── In-page probes ───────────────────────────────────────────────────────────
/**
 * Problems with `box` and `buttons` (selectors): the box must lie inside the
 * viewport, each button too, and the button must be what a tap at its centre hits.
 */
function reachProblems(page, box, buttons) {
  return page.evaluate(([box, buttons]) => {
    const W = window.innerWidth, H = window.innerHeight;
    const out = [];
    const inside = (r) => r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
    const b = document.querySelector(box);
    if (!b) return [`${box} not shown`];
    const br = b.getBoundingClientRect();
    if (!inside(br)) out.push(`${box} outside the ${W}×${H} viewport (${Math.round(br.left)},${Math.round(br.top)}–${Math.round(br.right)},${Math.round(br.bottom)})`);
    for (const sel of buttons) {
      const el = document.querySelector(sel);
      if (!el) { out.push(`${sel} missing`); continue; }
      const r = el.getBoundingClientRect();
      if (!inside(r)) { out.push(`${sel} off screen (${Math.round(r.top)}–${Math.round(r.bottom)} of ${H})`); continue; }
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!hit || !el.contains(hit)) out.push(`${sel} covered (a tap hits ${hit?.className || hit?.tagName})`);
    }
    return out;
  }, [box, buttons]);
}

/** Multiply the used font size of every element under `root` by `k` (Safari's boost, reconstructed). */
function boostFonts(page, root, k) {
  return page.evaluate(([root, k]) => {
    const r = document.querySelector(root);
    if (!r) return 0;
    const els = [r, ...r.querySelectorAll('*')];
    const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
    els.forEach((e, i) => { e.style.fontSize = `${sizes[i] * k}px`; });
    return sizes[0] * k;
  }, [root, k]);
}

/** Whether `sel` scrolls (its content is taller than its box and it can scroll). */
function scrolls(page, sel) {
  return page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return false;
    const oy = getComputedStyle(e).overflowY;
    return e.scrollHeight > e.clientHeight + 1 && (oy === 'auto' || oy === 'scroll');
  }, sel);
}

// ── One size ─────────────────────────────────────────────────────────────────
async function runSize(browser, W, H) {
  const OUT = join(OUT_ROOT, 'webkit', `${W}x${H}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: `${W}x${H}`, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  let n = 0;
  const step = async (name, fn) => {
    n++;
    const rec = { n, name, ok: true, notes: [] };
    try {
      const problems = (await fn(rec)) ?? [];
      if (problems.length) { rec.ok = false; rec.notes.push(...problems); }
    } catch (err) {
      rec.ok = false;
      rec.notes.push(`threw: ${err.message.split('\n')[0]}`);
    }
    rec.file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: join(OUT, rec.file) }).catch(() => {});
    report.steps.push(rec);
    log(`${rec.ok ? 'ok ' : 'FAIL'} ${W}x${H} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const tap = (sel) => page.locator(sel).first().tap();
  const TUT = ['.nrl-tutorial-bubble', ['.nrl-tutorial-skip', '.nrl-tutorial-next']];

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.fill('[data-nrl-clubname]', 'Safari FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="welcome"]');
    await page.waitForTimeout(500);
    // WebKit on Linux has no text autosizer and drops the property from computed
    // style, so read what the page's own <style> asks for.
    const adjust = await page.evaluate(() =>
      [...document.querySelectorAll('style')].some((st) => /html\s*\{[^}]*-webkit-text-size-adjust:\s*100%/.test(st.textContent ?? '')));
    return adjust ? [] : ['the page does not set html { -webkit-text-size-adjust: 100% }'];
  });
  await step('tutorial-welcome', () => reachProblems(page, ...TUT));
  await step('tutorial-boosted', async (rec) => {
    const px = await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    rec.notes.push(`copy at ${Math.round(px)}px`);
    const out = await reachProblems(page, ...TUT);
    if (!(await scrolls(page, '.nrl-tutorial-text'))) out.push('the copy does not scroll inside the bubble');
    return out;
  });
  await step('tutorial-next', async () => {
    await tap('.nrl-tutorial-next');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
    return reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-skip']);
  });
  // The build step is anchored (cutout round the Build tab): the docked bubble, boosted.
  await step('tutorial-anchored-boosted', async () => {
    await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    const out = await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-skip']);
    if (!(await scrolls(page, '.nrl-tutorial-text'))) out.push('the copy does not scroll inside the bubble');
    return out;
  });
  await step('tutorial-skipped', async () => {
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
  });
  const GUIDE = ['.nrl-guide-modal', ['.nrl-guide-replay', '.nrl-guide-close', '.nrl-guide-tab']];
  await step('guide', async () => {
    await tap('.nrl-nav .nrl-btn[data-screen="help"]');
    await page.waitForSelector('[data-guide]');
    return reachProblems(page, ...GUIDE);
  });
  await step('guide-boosted', async () => {
    await boostFonts(page, '.nrl-guide-modal', BOOST);
    const out = await reachProblems(page, ...GUIDE);
    if (!(await scrolls(page, '.nrl-guide-body'))) out.push('the Guide page does not scroll between its tabs and foot');
    return out;
  });
  await step('replay-boosted', async () => {
    await tap('.nrl-guide-replay');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="welcome"]');
    await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    const out = await reachProblems(page, ...TUT);
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    return out;
  });
  // #203: the player page (Squad → a player) sits between HUD and nav, with a ✕
  // and Renew / Sell / Release / Close on screen; the nav stays whole and tappable.
  const PLAYER = ['.nrl-player-modal', ['.nrl-player-modal .nrl-screen-x', '[data-player-action="renew"]',
    '[data-player-action="sell"]', '[data-player-action="release"]', '.nrl-player-close']];
  await step('player-page', async () => {
    await tap('.nrl-nav .nrl-btn[data-screen="squad"]');
    await tap('.nrl-card-open');
    await page.waitForSelector('[data-player-page]');
    await page.waitForTimeout(300);
    const out = await reachProblems(page, ...PLAYER);
    out.push(...await page.evaluate(() => {
      const box = document.querySelector('.nrl-player-modal').getBoundingClientRect();
      const nav = document.querySelector('.nrl-nav').getBoundingClientRect();
      const hud = document.querySelector('.nrl-hud').getBoundingClientRect();
      const problems = box.bottom > nav.top + 1 ? [`the player page runs into the nav (${Math.round(box.bottom)} > ${Math.round(nav.top)})`] : [];
      if (box.top < hud.bottom - 1) problems.push(`the player page runs under the HUD (${Math.round(box.top)} < ${Math.round(hud.bottom)})`);
      for (const b of document.querySelectorAll('.nrl-nav .nrl-btn')) {
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (!hit || !b.contains(hit)) problems.push(`nav "${b.textContent.trim()}" covered`);
      }
      return problems;
    }));
    return out;
  });
  // A renewal re-renders the page from state: the ✕ and the actions must survive it.
  await step('player-page-renewed', async (rec) => {
    const renew = page.locator('[data-player-action="renew"]');
    if (await renew.isDisabled()) { rec.notes.push('renew not offered for this player'); return []; }
    await renew.tap();
    await page.waitForTimeout(300);
    return reachProblems(page, '.nrl-player-modal', ['.nrl-player-modal .nrl-screen-x', '[data-player-action="sell"]', '.nrl-player-close']);
  });
  await step('player-page-closed', async () => {
    await tap('.nrl-player-modal .nrl-screen-x');
    await page.waitForSelector('[data-player-page]', { state: 'detached' });
    return (await page.locator('.nrl-card-open').count()) ? [] : ['the Squad screen did not stay open under the player page'];
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

let failed = 0;
try {
  await startServer();
  const browser = await webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {});
  for (const [W, H] of SIZES) failed += await runSize(browser, W, H);
  await browser.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  stopServer();
}
log(failed ? `\n${failed} failure(s)` : '\nall WebKit layout checks passed');
process.exit(failed ? 1 : 0);
