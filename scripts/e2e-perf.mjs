// scripts/e2e-perf.mjs — phone performance budget (QA loop). Builds the game and
// serves it with `vite preview`, then in Chromium at 844×390 with the CPU throttled
// ×4 (CDP Emulation.setCPUThrottlingRate, a mid-range phone) times the moments that
// make or break play on a phone:
//   load → title screen; Start → grounds (BootScene paints every texture); a week
//   advance (the hand-off to the match scene, then Skip to full time and Back to
//   Club); ×4 advances (the tick pipeline, per week); "to finals" and "to season
//   end" (the rollover); the frame rate on the grounds; and the bundle size.
// Writes e2e-output/perf/perf.json and prints a markdown table (the budget rows in
// docs/status/2026-10-qa.md come from it). Exit 1 only if the game broke on the way.
//
//   npm run e2e:perf
//   npm run e2e:perf -- --throttle 1          (no throttling, for a baseline)
//   CHROMIUM_PATH=/path/to/chrome npm run e2e:perf
//   E2E_URL=http://localhost:5173/ npm run e2e:perf
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : dflt);
const THROTTLE = Number(flag('throttle', 4));
const OUT_ROOT = process.env.E2E_OUT ?? 'e2e-output';
const OUT = join(OUT_ROOT, 'perf');
const DIST = join(OUT_ROOT, 'dist');
const PORT = Number(process.env.E2E_PORT ?? 4198);
const EXTERNAL = process.env.E2E_URL;
const BASE = `${EXTERNAL ?? `http://localhost:${PORT}/`}?e2e`;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const W = 844, H = 390;

mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

// ── Server ────────────────────────────────────────────────────────────────────
let server = null;
async function startServer() {
  if (EXTERNAL) return;
  log('building…');
  await new Promise((res, rej) => {
    const b = spawn('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir', '--logLevel', 'warn'], { stdio: 'inherit' });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`vite build failed (${code})`))));
  });
  server = spawn('npx', ['vite', 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE.replace('?e2e', ''))).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not start');
}
function stopServer() {
  if (server) try { process.kill(-server.pid); } catch { /* gone */ }
}

/** The built bundle: raw and gzipped bytes of everything the page loads. */
function bundleSize() {
  if (EXTERNAL) return null;
  const assets = join(DIST, 'assets');
  const files = readdirSync(assets).filter((f) => /\.(js|css)$/.test(f));
  let raw = 0, gz = 0; const biggest = [];
  for (const f of files) {
    const buf = readFileSync(join(assets, f));
    raw += buf.length; gz += gzipSync(buf).length;
    biggest.push({ file: f, kb: Math.round(buf.length / 1024), gzKb: Math.round(gzipSync(buf).length / 1024) });
  }
  biggest.sort((a, b) => b.kb - a.kb);
  const html = statSync(join(DIST, 'index.html')).size;
  return { files: files.length, rawKb: Math.round((raw + html) / 1024), gzKb: Math.round(gz / 1024), biggest: biggest.slice(0, 3) };
}

// ── Measurements ───────────────────────────────────────────────────────────────
const result = { throttle: THROTTLE, size: `${W}x${H}`, timings: {}, errors: [], bundle: bundleSize() };
let page;
const state = () => page.evaluate(() => window.__nrlState?.() ?? null);
const wait = (ms) => page.waitForTimeout(ms);
const toastsGone = () => page.waitForFunction(() => document.querySelectorAll('.nrl-toast').length === 0, null, { timeout: 8000 }).catch(() => {});

/** Time `fn` (ms, wall clock); record it under `name` with any notes. */
async function timed(name, fn) {
  const t0 = Date.now();
  let notes;
  try { notes = await fn(); } catch (err) { result.errors.push(`${name}: ${err.message.split('\n')[0]}`); notes = 'FAILED'; }
  const ms = Date.now() - t0;
  result.timings[name] = { ms, ...(notes ? { notes } : {}) };
  log(`${String(ms).padStart(6)} ms  ${name}${notes ? `  (${notes})` : ''}`);
  return ms;
}

/** Answer every waiting decision card (choice 0) so a multi-week advance can run. */
async function answerCards() {
  const s = await state();
  if (!s?.eventDeck?.pending?.length) return 0;
  await page.locator('.nrl-nav .nrl-btn:has-text("News")').tap();
  await page.waitForSelector('.nrl-event-card');
  let n = 0;
  while (await page.locator('.nrl-event-card').count()) {
    await page.locator('.nrl-event-card >> nth=0 >> [data-event-choice="0"]').tap();
    n++;
    await wait(100);
  }
  await page.evaluate(() => { for (const b of document.querySelectorAll('.nrl-modal .nrl-btn')) if (b.textContent?.trim() === 'Close') { b.click(); break; } });
  await wait(150);
  return n;
}

/** One multi-week advance (menu index 0 = ×4, 1 = to finals, 2 = to season end); returns weeks covered. */
async function advance(index) {
  const before = await state();
  await page.locator('.nrl-hud-menu-toggle').tap();
  await page.locator(`.nrl-hud-menu-item >> nth=${index}`).tap();
  await page.waitForFunction(({ w, s }) => { const n = window.__nrlState?.(); return n && (n.week !== w || n.season !== s); }, { w: before.week, s: before.season });
  const after = await state();
  return (after.season - before.season) * 27 + (after.week - before.week);
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => result.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') result.errors.push(`console: ${m.text()}`); });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  await timed('load → title', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    const t = await page.evaluate(() => Math.round(performance.now()));
    return `${t} ms since navigation start in-page`;
  });
  await timed('Start → grounds (textures painted, HUD up)', async () => {
    await page.fill('[data-nrl-clubname]', 'Budget FC');
    await page.locator('[data-nrl-start]').tap();
    await page.waitForFunction(() => document.querySelector('.nrl-hud') && window.__nrlGame?.scene.isActive('Grounds'));
  });
  if (await page.locator('.nrl-tutorial-skip').count()) await page.locator('.nrl-tutorial-skip').tap();
  await wait(500);
  await timed('grounds frame rate (3 s)', async () => {
    const fps = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(Math.round(n / ((performance.now() - t0) / 1000))); };
      requestAnimationFrame(tick);
    }));
    result.timings['grounds fps'] = { fps };
    return `${fps} fps`;
  });
  await page.screenshot({ path: join(OUT, 'grounds.png') });

  // A week advance: the match week hands over to the match scene.
  await timed('Advance Week → match scene (hand-off)', async () => {
    await page.locator('.nrl-hud .nrl-btn:has-text("Advance Week")').tap();
    await page.waitForSelector('.nrl-mo-controls');
  });
  await page.screenshot({ path: join(OUT, 'match.png') });
  await timed('Skip → full time', async () => {
    await page.locator('.nrl-mo-controls .nrl-btn:has-text("Skip")').tap();
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")');
  });
  await timed('Back to Club → grounds', async () => {
    const potm = page.locator('.nrl-modal .nrl-btn:has-text("Close")');
    if (await potm.count()) await potm.first().tap();
    await page.locator('.nrl-btn:has-text("Back to Club")').tap();
    await page.waitForFunction(() => document.querySelector('.nrl-hud .nrl-btn') && window.__nrlGame?.scene.isActive('Grounds'));
  });
  await toastsGone();

  // ×4 advances: the tick pipeline per week (stops early on cards and injuries, so
  // the weeks covered are counted and a per-week figure reported).
  const weeks = [];
  for (let i = 0; i < 3; i++) {
    await answerCards();
    const ms = await timed(`×4 advance #${i + 1}`, async () => `${await advance(0)} weeks`);
    const n = Number(result.timings[`×4 advance #${i + 1}`].notes?.split(' ')[0] ?? 0);
    if (n > 0) weeks.push(ms / n);
    await toastsGone();
  }
  const perWeek = weeks.length ? Math.round(weeks.reduce((t, x) => t + x, 0) / weeks.length) : null;
  result.timings['tick per week (×4 advances)'] = { ms: perWeek };
  log(`${String(perWeek).padStart(6)} ms  tick per week (×4 advances)`);

  // To the finals, then to the season end: the last call carries the rollover.
  let guard = 0;
  while ((await state()).week < 25 && guard++ < 30) {
    await answerCards();
    await timed(`to finals (call ${guard})`, async () => `${await advance(1)} weeks, now week ${(await state()).week}`);
    await toastsGone();
  }
  guard = 0;
  let rolloverCall = null;
  while ((await state()).season === 1 && guard++ < 10) {
    await answerCards();
    const name = `to season end (call ${guard})`;
    const before = await state();
    const ms = await timed(name, async () => `${await advance(2)} weeks`);
    const after = await state();
    if (after.season > before.season) rolloverCall = { ms, weeks: 27 - before.week + 1 };
    await toastsGone();
  }
  if (rolloverCall && perWeek) {
    const est = Math.max(0, rolloverCall.ms - (rolloverCall.weeks - 1) * perWeek);
    result.timings['rollover (season end call minus its weeks)'] = { ms: est, notes: `${rolloverCall.ms} ms call, ${rolloverCall.weeks - 1} plain weeks before it` };
    log(`${String(est).padStart(6)} ms  rollover (season end call minus its weeks)`);
  }
  const s = await state();
  result.end = { season: s.season, week: s.week, money: s.money };
  await page.screenshot({ path: join(OUT, 'season-2.png') });
  await browser.close();
}

try {
  await startServer();
  await run();
} catch (err) {
  result.errors.push(`script: ${err.message}`);
} finally {
  stopServer();
}
writeFileSync(join(OUT, 'perf.json'), JSON.stringify(result, null, 2));

// Markdown table for the log.
const rows = Object.entries(result.timings).map(([k, v]) => `| ${k} | ${v.fps !== undefined ? `${v.fps} fps` : `${v.ms} ms`} | ${v.notes ?? ''} |`);
const b = result.bundle;
log(`\n| Moment (CPU ×${THROTTLE}, ${W}×${H}) | Time | Notes |\n|---|---|---|\n${rows.join('\n')}`);
if (b) log(`| bundle (${b.files} js/css files) | ${b.rawKb} KB raw, ${b.gzKb} KB gzipped | ${b.biggest.map((x) => `${x.file} ${x.kb} KB`).join(', ')} |`);
for (const e of result.errors) log(`  error: ${e}`);
process.exit(result.errors.length ? 1 : 0);
