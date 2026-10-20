// scripts/e2e-perf.mjs — phone performance budget (QA loop). Builds the game and
// serves it with `vite preview`, then in Chromium at 844×390 with the CPU throttled
// ×4 (CDP Emulation.setCPUThrottlingRate, a mid-range phone) times the moments that
// make or break play on a phone:
//   load → title screen; Start → grounds (BootScene paints what the first frame needs); a week
//   advance (the hand-off to the match scene, then Skip to full time and Back to
//   Club); ×4 advances (the tick pipeline, per week); "to finals" and "to season
//   end" (the rollover); the frame rate on the grounds; and the bundle size.
// Clicks are dispatched from inside the page and timed with performance.now(), so
// a synchronous handler (the week tick) is measured on its own, without the test
// driver's overhead; the async moments (scene hand-offs, the first paint, and since
// N10.2 the multi-week advance, which yields between weeks) are timed from the
// click to the condition. One "to finals" run also times a tap on the Ladder made
// while it is under way, from the touch's timestamp to its click handler. Writes
// e2e-output/perf/perf.json and prints a markdown table (the budget rows in
// docs/status/2026-10-qa.md come from it).
//
// Each moment also gets its longest main-thread block: the longest Long Task
// (PerformanceObserver 'longtask', installed before the page loads) that started
// inside it, or the click handler's own time if that is longer. A block is how long
// the page could not paint or take a tap.
//
// A Worker's replies are held back so its wall time is ×throttle too (CDP throttling
// never reaches a Worker; QA finding 11).
//
// With --budget (N10 item 1, #219) the moments are checked against
// scripts/perf-budget.json (or the file given) and the run fails when one is over;
// report.json and report.md carry every metric, its budget and the verdict. Exit 1
// if the game broke on the way, or with --budget if a budget was missed. (With
// E2E_URL there is no build to measure, so a bundleGzKb budget fails as not reached.)
//
//   npm run e2e:perf
//   npm run e2e:perf -- --budget              (fail on a missed budget; the nightly QA job)
//   npm run e2e:perf -- --budget my.json      (another budget file)
//   npm run e2e:perf -- --throttle 1          (no throttling, for a baseline)
//   CHROMIUM_PATH=/path/to/chrome npm run e2e:perf
//   E2E_URL=http://localhost:5173/ npm run e2e:perf
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const flag = (name, dflt) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : dflt);
const THROTTLE = Number(flag('throttle', 4));
// --budget alone means the checked-in file (next to this script); --budget <file> another one.
const budgetArg = argv.includes('--budget') ? argv[argv.indexOf('--budget') + 1] : undefined;
const BUDGET = argv.includes('--budget')
  ? (budgetArg && !budgetArg.startsWith('--') ? budgetArg : fileURLToPath(new URL('./perf-budget.json', import.meta.url)))
  : null;
// Read it now, so a bad path or bad JSON fails before the ten-minute run, not after it.
const budgetFile = BUDGET ? JSON.parse(readFileSync(BUDGET, 'utf8')) : null;
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
const result = { throttle: THROTTLE, size: `${W}x${H}`, timings: {}, errors: [], bundle: null };
let page;
const state = () => page.evaluate(() => window.__nrlState?.() ?? null);
const wait = (ms) => page.waitForTimeout(ms);
const toastsGone = () => page.waitForFunction(() => document.querySelectorAll('.nrl-toast').length === 0, null, { timeout: 8000 }).catch(() => {});

/** The page's clock: [its time origin, ms since then], or null between pages. */
const pageNow = () => page.evaluate(() => [performance.timeOrigin, performance.now()]).catch(() => null);

/**
 * The longest Long Task that started in [from, to] on the page's clock, in ms (0 if
 * none). Entries the observer has not delivered yet are taken first, so a task that
 * ended just before the read still counts.
 */
const longestTask = (from, to) => page.evaluate(([a, b]) => {
  for (const e of window.__nrlLongObs?.takeRecords() ?? []) window.__nrlLongTasks.push([e.startTime, e.duration]);
  return Math.round((window.__nrlLongTasks ?? []).reduce((m, [start, dur]) => (start >= a && start <= b ? Math.max(m, dur) : m), 0));
}, [from, to]);

/** The longest click handler timed by clickTimed during the current moment. */
let handlerMax = 0;

/**
 * Time `fn` (ms, wall clock); record it under `name` with any notes and the moment's
 * longest main-thread block. A number returned by `fn` replaces the wall clock.
 */
async function timed(name, fn) {
  const t0 = Date.now();
  handlerMax = 0;
  const p0 = await pageNow();
  let notes, inPage;
  try {
    const r = await fn();
    if (typeof r === 'number') inPage = r; else if (r && typeof r === 'object') { inPage = r.ms; notes = r.notes; } else notes = r;
  } catch (err) { result.errors.push(`${name}: ${err.message.split('\n')[0]}`); notes = 'FAILED'; }
  const ms = inPage ?? Date.now() - t0;
  const p1 = await pageNow();
  // A navigation inside the moment starts a new page clock: count from its start.
  const from = p0 && p1 && p0[0] === p1[0] ? p0[1] : 0;
  const blockMs = Math.max(handlerMax, p1 === null ? 0 : await longestTask(from, p1[1]).catch(() => 0));
  result.timings[name] = { ms, blockMs, ...(notes ? { notes } : {}) };
  log(`${String(ms).padStart(6)} ms  ${name}  [block ${blockMs} ms]${notes ? `  (${notes})` : ''}`);
  return ms;
}

/**
 * Click the nth element matching `selector` (optionally the one whose text is `text`)
 * from inside the page and return how long its handlers ran, in ms: the cost of a
 * synchronous handler such as the week tick, without the driver's own overhead.
 */
const clickTimed = async (selector, { nth = 0, text } = {}) => {
  const ms = await page.evaluate(({ selector, nth, text }) => {
    const all = [...document.querySelectorAll(selector)].filter((e) => !text || e.textContent?.trim() === text);
    const el = all[nth];
    if (!el) throw new Error(`no ${selector}${text ? ` "${text}"` : ''}`);
    const t0 = performance.now();
    el.click();
    return Math.round(performance.now() - t0);
  }, { selector, nth, text });
  handlerMax = Math.max(handlerMax, ms);
  return ms;
};

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

/**
 * One multi-week advance (menu index 0 = ×4, 1 = to finals, 2 = to season end).
 * Since N10.2 the run yields a frame between weeks, so this times the click to the
 * end of the run (the HUD drops data-advancing); the moment's block column is the
 * longest week. With `probe`, a tap on the Ladder while the run is under way is
 * timed to its screen (the page answering mid-run) and the progress line read.
 * Returns { ms, weeks, tapMs?, label? }.
 */
async function advance(index, { probe = false } = {}) {
  const before = await state();
  await clickTimed('.nrl-hud-menu-toggle');
  const t0 = Date.now();
  await clickTimed('.nrl-hud-menu-item', { nth: index });
  let tapMs, label, probeMs = 0;
  // Read the progress line in the same breath as checking the run is still going.
  const running = probe ? await page.evaluate(() => (document.querySelector('.nrl-hud[data-advancing]') ? document.querySelector('.nrl-hud-actions .nrl-btn')?.textContent?.trim() || 'running' : null)) : null;
  if (running !== null) {
    const p0 = Date.now();
    label = running;
    // Timed inside the page, from the touch's own timestamp to its click handler:
    // the driver's tap() waits for two steady frames, and a frame now holds a week.
    const box = await page.locator('.nrl-nav .nrl-btn[data-screen="ladder"]').boundingBox();
    await page.evaluate(() => {
      window.__nrlTapDelay = undefined;
      document.addEventListener('click', (e) => { window.__nrlTapDelay = Math.round(performance.now() - e.timeStamp); }, { capture: true, once: true });
    });
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => window.__nrlTapDelay !== undefined, null, { polling: 50, timeout: 60000 });
    tapMs = await page.evaluate(() => window.__nrlTapDelay);
    await page.waitForSelector('.nrl-screen-region');
    await page.screenshot({ path: join(OUT, 'advancing.png') });
    probeMs = Date.now() - p0; // the probe's own driver time is not the run's
  }
  await page.waitForFunction(() => !document.querySelector('.nrl-hud[data-advancing]'), null, { timeout: 240000 });
  const ms = Date.now() - t0 - probeMs;
  if (probe) await page.evaluate(() => { for (const b of document.querySelectorAll('.nrl-screen-region .nrl-btn')) if (/^(close|✕)$/i.test(b.textContent?.trim() ?? '')) { b.click(); break; } });
  const after = await state();
  return { ms, weeks: (after.season - before.season) * 27 + (after.week - before.week), ...(tapMs !== undefined ? { tapMs, label } : {}) };
}

async function run() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  // CDP throttling slows the page but not a Worker (QA finding 11, #216). From N10.3 the
  // fast-forwarded match plays in one, so each Worker reply is held back (throttle − 1) ×
  // the Worker's own time: its wall time is ×throttle like the page's.
  await ctx.addInitScript((throttle) => {
    const Base = window.Worker;
    if (!Base || throttle <= 1) return;
    window.Worker = class extends Base {
      postMessage(...args) {
        this.__nrlPosted = performance.now();
        super.postMessage(...args);
      }
      set onmessage(fn) {
        super.onmessage = fn && ((e) => {
          const took = performance.now() - (this.__nrlPosted ?? performance.now());
          setTimeout(() => fn.call(this, e), took * (throttle - 1));
        });
      }
      get onmessage() { return super.onmessage; }
    };
  }, THROTTLE);
  // Every Long Task from the first script on, for the block column.
  await ctx.addInitScript(() => {
    window.__nrlLongTasks = [];
    try {
      window.__nrlLongObs = new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__nrlLongTasks.push([e.startTime, e.duration]); });
      window.__nrlLongObs.observe({ type: 'longtask', buffered: true });
    } catch { /* no Long Tasks API: the handler times still count */ }
  });
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
    await clickTimed('[data-nrl-start]');
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
  let tickMs = 0;
  await timed('Advance Week → match scene (hand-off)', async () => {
    tickMs = await clickTimed('.nrl-hud .nrl-btn', { text: 'Advance Week' });
    await page.waitForSelector('.nrl-mo-controls');
    return `of which the tick itself ${tickMs} ms`;
  });
  await page.screenshot({ path: join(OUT, 'match.png') });
  await timed('Skip → full time', async () => {
    await clickTimed('.nrl-mo-controls .nrl-btn', { text: 'Skip' });
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")');
  });
  await timed('Back to Club → grounds', async () => {
    const potm = page.locator('.nrl-modal .nrl-btn:has-text("Close")');
    if (await potm.count()) await potm.first().tap();
    await clickTimed('.nrl-btn', { text: 'Back to Club' });
    await page.waitForFunction(() => document.querySelector('.nrl-hud .nrl-btn') && window.__nrlGame?.scene.isActive('Grounds'));
  });
  await toastsGone();

  // ×4 advances: the tick pipeline per week (stops early on cards and injuries, so
  // the weeks covered are counted and a per-week figure reported).
  let msSum = 0, weekSum = 0;
  for (let i = 0; i < 3; i++) {
    await answerCards();
    await timed(`×4 advance #${i + 1}`, async () => {
      const a = await advance(0);
      msSum += a.ms; weekSum += a.weeks;
      return { ms: a.ms, notes: `${a.weeks} week${a.weeks === 1 ? '' : 's'}` };
    });
    await toastsGone();
  }
  const perWeek = weekSum ? Math.round(msSum / weekSum) : null;
  result.timings['tick per week (×4 advances)'] = { ms: perWeek, notes: `${weekSum} weeks in ${msSum} ms` };
  log(`${String(perWeek).padStart(6)} ms  tick per week (×4 advances)`);

  // To the finals, then to the season end: the last call carries the rollover.
  let guard = 0;
  let probed = false;
  while ((await state()).week < 25 && guard++ < 30) {
    await answerCards();
    await timed(`to finals (call ${guard})`, async () => {
      // The first call that runs more than a week also checks the page answers a tap mid-run.
      const a = await advance(1, { probe: !probed });
      if (a.tapMs !== undefined) {
        probed = true;
        result.timings['tap mid-advance (touch to its handler)'] = { ms: a.tapMs, notes: `progress line read "${a.label}"` };
      }
      return { ms: a.ms, notes: `${a.weeks} weeks, now week ${(await state()).week}` };
    });
    await toastsGone();
  }
  guard = 0;
  let rolloverCall = null;
  while ((await state()).season === 1 && guard++ < 10) {
    await answerCards();
    const name = `to season end (call ${guard})`;
    const before = await state();
    const ms = await timed(name, async () => {
      const a = await advance(2);
      return { ms: a.ms, notes: `${a.weeks} weeks` };
    });
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
  result.bundle = bundleSize(); // after the build
  await run();
} catch (err) {
  result.errors.push(`script: ${err.message}`);
} finally {
  stopServer();
}
writeFileSync(join(OUT, 'perf.json'), JSON.stringify(result, null, 2));

// ── Metrics: the named numbers the budget file checks ────────────────────────
const t = result.timings;
const pick = (name, key = 'ms') => (t[name] && typeof t[name][key] === 'number' ? t[name][key] : null);
const advanceRows = Object.entries(t).filter(([k]) => /^(×4 advance|to finals|to season end)/.test(k));
const maxOf = (vals) => { const v = vals.filter((x) => typeof x === 'number'); return v.length ? Math.max(...v) : null; };
const metrics = {
  titleMs: pick('load → title'),
  groundsMs: pick('Start → grounds (textures painted, HUD up)'),
  handoffMs: pick('Advance Week → match scene (hand-off)'),
  handoffBlockMs: pick('Advance Week → match scene (hand-off)', 'blockMs'),
  skipMs: pick('Skip → full time'),
  skipBlockMs: pick('Skip → full time', 'blockMs'),
  backToClubMs: pick('Back to Club → grounds'),
  weekMs: pick('tick per week (×4 advances)'),
  advanceCallMaxMs: maxOf(advanceRows.map(([, v]) => v.ms)),
  advanceBlockMs: maxOf(advanceRows.map(([, v]) => v.blockMs)),
  midAdvanceTapMs: pick('tap mid-advance (touch to its handler)'),
  longestBlockMs: maxOf(Object.values(t).map((v) => v.blockMs)),
  bundleGzKb: result.bundle?.gzKb ?? null,
};

// ── Budget ────────────────────────────────────────────────────────────────────
let verdicts = [];
if (budgetFile) {
  if (budgetFile.throttle !== undefined && budgetFile.throttle !== THROTTLE) {
    result.errors.push(`budget: ${relative(process.cwd(), BUDGET)} is for CPU ×${budgetFile.throttle}, this run is ×${THROTTLE}`);
  }
  verdicts = Object.entries(budgetFile.budgets).map(([metric, max]) => {
    const value = metrics[metric] ?? null;
    // A metric the run never reached (the game broke first) fails its budget.
    return { metric, value, max, ok: value !== null && value <= max };
  });
}
const missed = verdicts.filter((v) => !v.ok);
const budgetName = BUDGET ? relative(process.cwd(), BUDGET) : null;
const report = { throttle: THROTTLE, size: `${W}x${H}`, metrics, budget: budgetName, verdicts, ok: !result.errors.length && !missed.length, errors: result.errors };
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

// Markdown for the log and the job summary.
const rows = Object.entries(t).map(([k, v]) => `| ${k} | ${v.fps !== undefined ? `${v.fps} fps` : `${v.ms} ms`} | ${v.blockMs ?? ''}${v.blockMs !== undefined ? ' ms' : ''} | ${v.notes ?? ''} |`);
const b = result.bundle;
const md = [`| Moment (CPU ×${THROTTLE}, ${W}×${H}) | Time | Longest block | Notes |`, '|---|---|---|---|', ...rows];
if (b) md.push(`| bundle (${b.files} js/css files) | ${b.rawKb} KB raw, ${b.gzKb} KB gzipped | | ${b.biggest.map((x) => `${x.file} ${x.kb} KB`).join(', ')} |`);
if (BUDGET) {
  md.push('', `| Budget (${budgetName}) | Value | Max | |`, '|---|---|---|---|');
  for (const v of verdicts) md.push(`| ${v.metric} | ${v.value ?? 'not reached'} | ${v.max} | ${v.ok ? 'ok' : '**over**'} |`);
  md.push('', missed.length ? `**${missed.length} budget(s) missed:** ${missed.map((v) => v.metric).join(', ')}` : 'Every budget met.');
}
for (const e of result.errors) md.push(`- error: ${e}`);
writeFileSync(join(OUT, 'report.md'), `${md.join('\n')}\n`);
log(`\n${md.join('\n')}`);
process.exit(report.ok ? 0 : 1);
