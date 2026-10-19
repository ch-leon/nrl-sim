// scripts/e2e-season.mjs — end-to-end playthrough of a full season on a phone
// (QA pass). Builds the game and serves it with `vite preview`, then in
// Chromium at 844×390 (touch):
//   new game → build two facilities → move one → demolish one → sign a free
//   agent → play a live match → answer event cards → renew a contract → change
//   the kit → watch rivals sign from the pool → save, reload and continue →
//   play to the season rollover → into season 2.
// Every step takes a screenshot and runs layout checks (nothing off-screen, no
// sideways page scroll); page errors and console errors are collected. Writes
// e2e-output/report.json and exits 1 if anything failed.
//
//   npm run e2e:season
//   CHROMIUM_PATH=/path/to/chrome npm run e2e:season
//   E2E_URL=http://localhost:5173/ npm run e2e:season   (against a server you started)
//
// Uses playwright-core with an existing Chromium (never `playwright install`).
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = process.env.E2E_OUT ?? 'e2e-output';
const PORT = Number(process.env.E2E_PORT ?? 4199);
const EXTERNAL = process.env.E2E_URL;
// `?e2e` makes the game expose itself so the grounds can be checked (main.ts).
const BASE = `${EXTERNAL ?? `http://localhost:${PORT}/`}?e2e`;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const SLOT = 'nrl-sim-save-slot-1';
const W = 844;
const H = 390;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const report = { steps: [], errors: [], findings: [] };
const log = (...a) => console.log(...a);

// ── Server: a production build served by `vite preview` (no hot reload mid-run) ──
let server = null;
async function startServer() {
  if (EXTERNAL) return;
  const dist = join(OUT, 'dist');
  log('building…');
  await new Promise((res, rej) => {
    const b = spawn('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir', '--logLevel', 'warn'], { stdio: 'inherit' });
    b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`vite build failed (${code})`))));
  });
  server = spawn('npx', ['vite', 'preview', '--outDir', dist, '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
  for (let i = 0; i < 60; i++) {
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

// ── Page helpers ──────────────────────────────────────────────────────────────
let page;
let stepNo = 0;
const save = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), SLOT);
const tap = async (selector) => {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.tap();
};
const tapAt = (x, y) => page.touchscreen.tap(x, y);
const wait = (ms) => page.waitForTimeout(ms);
const toastsGone = () => page.waitForFunction(() => document.querySelectorAll('.nrl-toast').length === 0, null, { timeout: 8000 }).catch(() => {});
const closeAny = async () => {
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('.nrl-modal .nrl-btn')) {
      const t = b.textContent?.trim().toLowerCase();
      if (t === 'close' || t === 'close') { b.click(); return; }
    }
  });
  await wait(200);
};

/** Layout checks on the current view: problems as strings. */
async function layoutProblems() {
  return page.evaluate(({ W, H }) => {
    const out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px wide)`);
    for (const m of document.querySelectorAll('.nrl-modal')) {
      const r = m.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.left < -1 || r.right > W + 1) out.push(`modal ${m.className} overflows sideways (${Math.round(r.left)}–${Math.round(r.right)})`);
      if (r.top < -1 || r.bottom > H + 1) out.push(`modal ${m.className} overflows vertically (${Math.round(r.top)}–${Math.round(r.bottom)})`);
    }
    // Buttons whose label is clipped by their own box.
    for (const b of document.querySelectorAll('.nrl-modal .nrl-btn, .nrl-hud .nrl-btn, .nrl-placebar .nrl-btn')) {
      if (b.offsetParent === null) continue;
      if (b.scrollWidth > b.clientWidth + 2) out.push(`button text clipped: "${b.textContent?.trim().slice(0, 40)}"`);
    }
    // Nav buttons pushed off-screen.
    const hidden = [...document.querySelectorAll('.nrl-nav .nrl-btn')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.right > W + 1 || r.left < -1);
    }).map((b) => b.textContent?.trim());
    if (hidden.length) out.push(`nav buttons off-screen: ${hidden.join(', ')}`);
    return out;
  }, { W, H });
}

/** Run a step: do it, screenshot it, check the layout, record the outcome. */
async function step(name, fn, { settle = 300, quietToasts = false } = {}) {
  stepNo++;
  const file = `${String(stepNo).padStart(2, '0')}-${name}.png`;
  const rec = { n: stepNo, name, file, ok: true, notes: [] };
  try {
    const note = await fn(rec);
    if (note) rec.notes.push(note);
  } catch (err) {
    rec.ok = false;
    rec.notes.push(`FAILED: ${err.message.split('\n')[0]}`);
  }
  if (quietToasts) await toastsGone();
  await wait(settle);
  await page.screenshot({ path: join(OUT, file) });
  const lay = await layoutProblems();
  if (lay.length) rec.layout = lay;
  report.steps.push(rec);
  log(`${rec.ok ? 'ok ' : 'ERR'} ${file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}${lay.length ? ` [layout: ${lay.join(' | ')}]` : ''}`);
  return rec;
}

/** Facilities the grounds scene actually draws vs the save: problems as strings. */
async function facilitiesDrawn(rec) {
  await wait(2200); // let any build animation finish
  const drawn = await page.evaluate(() => {
    const sc = window.__nrlGame?.scene.getScene('Grounds');
    if (!sc || !sc.sys.isActive()) return -1;
    return sc.children.list.filter((o) => o.alpha > 0.99 && String(o.texture?.key ?? '').startsWith('facility-')).length;
  });
  const s = await save();
  const want = s?.facilities?.length ?? 0;
  rec.notes.push(`facilities drawn ${drawn}/${want}`);
  if (drawn !== want) throw new Error(`grounds draw ${drawn} facilities, the save has ${want}`);
}

/** At full time: close the Player of the Match card if it's up, then go back to the club. */
async function leaveMatch() {
  const potm = page.locator('.nrl-modal .nrl-btn:has-text("Close")');
  if (await potm.count()) { await potm.first().tap(); await wait(200); }
  await tap('.nrl-btn:has-text("Back to Club")');
  await page.waitForSelector('.nrl-hud .nrl-btn:has-text("Advance Week")');
}

/** Advance with the split-button menu: index 0 = ×4 weeks, 1 = to finals, 2 = to season end. */
async function advanceMenu(i) {
  await tap('.nrl-hud-menu-toggle');
  await tap(`.nrl-hud-menu-item >> nth=${i}`);
  await wait(400);
}

/** Answer every waiting event card (first choice, or the second for odd cards so both get exercised). */
async function answerCards(rec) {
  const s = await save();
  const pending = s?.eventDeck?.pending ?? [];
  if (!pending.length) return 0;
  await tap('.nrl-nav .nrl-btn:has-text("News")');
  await page.waitForSelector('.nrl-event-card');
  let n = 0;
  while (await page.locator('.nrl-event-card').count()) {
    const title = await page.locator('.nrl-event-title').first().textContent();
    const choice = n % 2;
    await page.locator(`.nrl-event-card >> nth=0 >> [data-event-choice="${choice}"]`).tap();
    rec?.notes.push(`answered "${title}" with choice ${choice}`);
    n++;
    await wait(150);
  }
  await closeAny();
  return n;
}

// ── The playthrough ───────────────────────────────────────────────────────────
async function play() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`console: ${m.text()}`); });

  await step('title', async () => { await page.goto(BASE); await page.waitForSelector('[data-nrl-start]'); });
  await step('new-game', async () => {
    await page.fill('[data-nrl-clubname]', 'Phone Test FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-hud');
    await wait(1000);
  });
  await step('tutorial', async () => {
    const skip = page.locator('.nrl-tutorial-skip');
    if (!(await skip.count())) return 'no tutorial shown';
  });
  await step('tutorial-skipped', async () => { await tap('.nrl-tutorial-skip'); });

  // Facilities: build two, move one, demolish the other.
  const cx = Math.round(W / 2), cy = Math.round(H / 2) + 10;
  const spotB = [cx - 130, cy + 20], spotMove = [cx + 120, cy + 30];
  await step('build-menu', async () => { await tap('.nrl-nav .nrl-btn:has-text("Build")'); await page.waitForSelector('.nrl-build-row'); });
  await step('build-placing', async () => {
    await page.locator('.nrl-build-row:not(.nrl-build-row-disabled)', { hasText: 'Training Paddock' }).tap();
    await page.waitForSelector('.nrl-placebar:not([hidden])');
  });
  await step('built-paddock', async () => { await tapAt(cx, cy); await wait(2200); }, { quietToasts: true });
  await step('build-second', async () => {
    await tap('.nrl-nav .nrl-btn:has-text("Build")');
    await page.locator('.nrl-build-row:not(.nrl-build-row-disabled)', { hasText: 'Canteen' }).tap();
    await tapAt(...spotB);
    await wait(2200);
  }, { quietToasts: true });
  await step('facility-popup', async () => { await tapAt(cx, cy); await page.waitForSelector('.nrl-facility-popup'); });
  await step('moving', async () => {
    await tap('.nrl-facility-move');
    await page.waitForSelector('.nrl-placebar:not([hidden])');
  });
  await step('moved', async (rec) => {
    await tapAt(...spotMove);
    await wait(2200);
    const s = await save();
    rec.notes.push(`money ${s?.money ?? '(not saved yet)'}`);
  }, { quietToasts: true });
  await step('demolish-confirm', async () => {
    await tapAt(...spotB);
    await page.waitForSelector('.nrl-facility-popup');
    await tap('.nrl-facility-demolish');
  });
  await step('demolished', async () => { await tap('.nrl-facility-demolish'); await wait(2000); }, { quietToasts: true });

  // Recruit: sign the best affordable free agent.
  await step('recruit', async () => { await tap('.nrl-nav .nrl-btn:has-text("Recruit")'); await page.waitForSelector('.nrl-screen-title'); });
  await step('signed', async (rec) => {
    const btn = page.locator('.nrl-card .nrl-card-actions .nrl-btn:not([disabled])').first();
    const name = await page.locator('.nrl-card:has(.nrl-card-actions .nrl-btn:not([disabled])) .nrl-card-name').first().textContent();
    await btn.tap();
    await wait(300);
    rec.notes.push(`signed ${name}`);
  });
  await step('squad', async () => { await closeAny(); await tap('.nrl-nav .nrl-btn:has-text("Squad")'); await page.waitForSelector('.nrl-squad-kit'); });

  // Kit designer.
  await step('kit-designer', async () => { await tap('.nrl-squad-kit'); await page.waitForSelector('.nrl-kit'); });
  await step('kit-saved', async () => {
    await tap('[data-kit-pattern="hoops"]');
    await tap('[data-kit-alt-pattern="stripes"]');
    await tap('.nrl-kit-save');
  }, { quietToasts: true });

  // A live match: Advance Week hands over to the match scene.
  await step('match-live', async () => {
    await tap('.nrl-hud .nrl-btn:has-text("Advance Week")');
    await page.waitForSelector('.nrl-mo-controls', { timeout: 15000 });
    await wait(3000);
  });
  await step('match-fulltime', async () => {
    await tap('.nrl-mo-controls .nrl-btn:has-text("Skip")');
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 15000 });
    await wait(500);
  });
  await step('back-to-club', async (rec) => { await leaveMatch(); await facilitiesDrawn(rec); }, { quietToasts: true });

  // Rivals and the free-agent pool: note who is in the pool, play on, see who rivals took.
  const before = await save();
  const poolIds = new Set((before?.freeAgents ?? []).map((p) => p.id));
  for (let block = 0; block < 3; block++) {
    await step(`advance-block-${block + 1}`, async (rec) => {
      await answerCards(rec);
      await advanceMenu(0);
      const s = await save();
      rec.notes.push(`now S${s.season} W${s.week}, $${s.money}`);
    }, { quietToasts: true });
  }
  await step('rival-signings', async (rec) => {
    const s = await save();
    const taken = s.league.clubs.flatMap((c) => (c.squad ?? []).filter((p) => poolIds.has(p.id)).map((p) => `${c.name} took ${p.name}`));
    rec.notes.push(taken.length ? taken.slice(0, 4).join('; ') : 'no rival signed from the pool yet');
    if (!taken.length) report.findings.push('Rivals made no signings from the pool the player saw in 12 weeks.');
    await tap('.nrl-nav .nrl-btn:has-text("News")');
    await page.waitForSelector('.nrl-news-list');
  });
  await step('ladder', async () => { await closeAny(); await tap('.nrl-nav .nrl-btn:has-text("Ladder")'); await page.waitForSelector('.nrl-ladder-table'); });
  await step('rival-squad', async () => { await tap('.nrl-ladder-club'); await page.waitForSelector('.nrl-rival-squad'); });

  // Contracts: renew someone.
  await step('contracts', async () => {
    await page.locator('.nrl-rival-squad .nrl-btn:has-text("Close")').tap();
    await closeAny();
    await tap('.nrl-nav .nrl-btn:has-text("Contracts")');
    await wait(300);
  });
  await step('renewed', async (rec) => {
    const renew = page.locator('.nrl-contract-actions .nrl-btn:has-text("Renew")').first();
    if (!(await renew.count())) return 'no contract to renew';
    const label = await renew.textContent();
    await renew.tap();
    rec.notes.push(`tapped ${label}`);
  });
  await step('finance', async () => { await closeAny(); await tap('.nrl-nav .nrl-btn:has-text("Finance")'); await wait(300); });

  // Save, reload, continue.
  const pre = await save();
  await step('reload-title', async () => { await page.reload(); await page.waitForSelector('[data-nrl-continue-1]'); });
  await step('continued', async (rec) => {
    await tap('[data-nrl-continue-1]');
    await page.waitForSelector('.nrl-hud');
    await wait(800);
    const s = await save();
    if (s.week !== pre.week || s.money !== pre.money) throw new Error(`state changed across reload (W${pre.week}→${s.week}, $${pre.money}→$${s.money})`);
    rec.notes.push(`same week ${s.week} and money after reload`);
    await facilitiesDrawn(rec);
  });

  // Play out the season: to the finals, then to season end, answering cards on the way.
  for (let i = 0; i < 12; i++) {
    const s = await save();
    if (s.season > 1) break;
    const target = s.week < 25 ? 1 : 2;
    await step(`to-${target === 1 ? 'finals' : 'season-end'}-${i + 1}`, async (rec) => {
      await answerCards(rec);
      await advanceMenu(target);
      const now = await save();
      const stop = await page.locator('.nrl-toast').last().textContent().catch(() => '');
      rec.notes.push(`S${now.season} W${now.week} $${now.money}${stop ? ` · "${stop.trim()}"` : ''}`);
    }, { quietToasts: true });
  }
  await step('season-2', async (rec) => {
    const s = await save();
    if (s.season !== 2) throw new Error(`still in season ${s.season} week ${s.week}`);
    rec.notes.push(`season 2 week ${s.week}, ${s.history.length} season(s) in history, board patience ${s.boardPatience}`);
  });
  await step('history', async () => { await tap('.nrl-nav .nrl-btn:has-text("History")'); await wait(300); });
  await step('season-2-week-2', async (rec) => {
    await closeAny();
    await answerCards(rec);
    await tap('.nrl-hud .nrl-btn:has-text("Advance Week")');
    await wait(1500);
    // A match week opens the match scene; skip it.
    if (await page.locator('.nrl-mo-controls').count()) {
      await tap('.nrl-mo-controls .nrl-btn:has-text("Skip")');
      await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 15000 });
      await leaveMatch();
    }
    const s = await save();
    rec.notes.push(`S${s.season} W${s.week}`);
    await facilitiesDrawn(rec);
  }, { quietToasts: true });

  await browser.close();
}

try {
  await startServer();
  await play();
} catch (err) {
  report.errors.push(`script: ${err.message}`);
} finally {
  stopServer();
}
const failed = report.steps.filter((s) => !s.ok);
const layout = report.steps.filter((s) => s.layout);
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
log(`\n${report.steps.length} steps, ${failed.length} failed, ${layout.length} with layout problems, ${report.errors.length} errors`);
for (const e of report.errors) log(`  ${e}`);
for (const f of report.findings) log(`  finding: ${f}`);
process.exit(failed.length || report.errors.length ? 1 : 0);
