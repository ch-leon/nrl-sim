// scripts/e2e-season.mjs — end-to-end playthrough of a full season on a phone
// (QA pass). Builds the game and serves it with `vite preview`, then in
// Chromium at 844×390 (touch) or 1280×800 (a desktop window, mouse):
//   new game → turn the phone upright (rotate card, loop asleep) and back (the
//   canvas fills the landscape viewport again) → build two facilities → move one →
//   demolish one → sign a free agent → change the kit → play a match on the
//   classic engine → turn on Live match (beta)
//   and watch one on the live sim through the overlay to Back to Club →
//   answer event cards → renew a contract → watch rivals sign from the pool →
//   save, reload and continue → play to the season rollover → into season 2.
// Every step takes a screenshot and runs layout checks (nothing off-screen, no
// sideways page scroll); a page or console error during a step fails it. Writes
// e2e-output/<WxH>/report.json and exits 1 if anything failed. Slot 1 is dumped
// to e2e-output/<WxH>/saves/v<version>-<point>.json at four points (after the
// tutorial, mid-season, after the rollover, season 2) for the save corpus in
// tests/fixtures/saves (see the README there).
//
//   npm run e2e:season
//   npm run e2e:season -- --size 1280x800                 (or E2E_SIZE=1280x800)
//   CHROMIUM_PATH=/path/to/chrome npm run e2e:season
//   E2E_URL=http://localhost:5173/ npm run e2e:season   (against a server you started)
//
// Uses playwright-core with an existing Chromium (never `playwright install`).
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

// --size WxH (or E2E_SIZE): 844×390 is a landscape phone with touch (the default);
// anything 1000px or wider is a desktop window driven by the mouse.
const argv = process.argv.slice(2);
const sizeArg = argv.includes('--size') ? argv[argv.indexOf('--size') + 1] : process.env.E2E_SIZE;
const [W, H] = (sizeArg ?? '844x390').split('x').map(Number);
if (!(W > 0 && H > 0)) {
  console.error(`bad --size "${sizeArg}": want WxH, e.g. 844x390 or 1280x800`);
  process.exit(2);
}
const PHONE = W < 1000;
const OUT_ROOT = process.env.E2E_OUT ?? 'e2e-output';
const OUT = join(OUT_ROOT, `${W}x${H}`);
const PORT = Number(process.env.E2E_PORT ?? 4199);
const EXTERNAL = process.env.E2E_URL;
// `?e2e` makes the game expose itself so the grounds can be checked (main.ts).
const BASE = `${EXTERNAL ?? `http://localhost:${PORT}/`}?e2e`;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const SLOT = 'nrl-sim-save-slot-1';

const SAVES = join(OUT, 'saves');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(SAVES, { recursive: true });

const report = { size: `${W}x${H}`, phone: PHONE, steps: [], errors: [], findings: [] };
const log = (...a) => console.log(...a);

// ── Server: a production build served by `vite preview` (no hot reload mid-run) ──
let server = null;
async function startServer() {
  if (EXTERNAL) return;
  const dist = join(OUT_ROOT, 'dist');
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
/** Tap (phone) or click (desktop) a locator. */
const press = (loc) => (PHONE ? loc.tap() : loc.click());
const tap = async (selector) => {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await press(el);
};
const tapAt = (x, y) => (PHONE ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
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
  return page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
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
  });
}

/** Run a step: do it, screenshot it, check the layout, record the outcome. */
async function step(name, fn, { settle = 300, quietToasts = false } = {}) {
  stepNo++;
  const errorsBefore = report.errors.length;
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
  // Zero console errors: anything the page logged as an error during the step fails it.
  const errs = report.errors.slice(errorsBefore);
  if (errs.length) {
    rec.ok = false;
    rec.errors = errs;
    rec.notes.push(`${errs.length} page/console error(s): ${errs[0].slice(0, 120)}`);
  }
  report.steps.push(rec);
  log(`${rec.ok ? 'ok ' : 'ERR'} ${file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}${lay.length ? ` [layout: ${lay.join(' | ')}]` : ''}`);
  return rec;
}

/**
 * Dump the game's save for the corpus: slot 1 as the game wrote it, or (before the
 * first autosave, which only happens on a week advance) the live state through the
 * `?e2e` hook. Same JSON either way.
 */
async function dumpSave(point, rec) {
  const s = (await save()) ?? (await page.evaluate(() => window.__nrlState?.() ?? null));
  if (!s) { rec?.notes.push(`nothing to dump at ${point}`); return; }
  const text = JSON.stringify(s);
  const file = `v${s.version}-${point}.json`;
  writeFileSync(join(SAVES, file), text);
  rec?.notes.push(`dumped saves/${file} (${Math.round(text.length / 1024)} KB)`);
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
  if (await potm.count()) { await press(potm.first()); await wait(200); }
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
    await press(page.locator(`.nrl-event-card >> nth=0 >> [data-event-choice="${choice}"]`));
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
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: PHONE, isMobile: PHONE });
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
  await step('tutorial-skipped', async (rec) => { await tap('.nrl-tutorial-skip'); await dumpSave('after-tutorial', rec); });

  // A phone held upright: the rotate card covers the game and the loop sleeps
  // until it is turned sideways again (src/ui/orientation.ts). Turned back, the
  // canvas must fill the landscape viewport again: Phaser's scale manager can
  // refresh from the old bounds while the rotation is still settling and then take
  // the new bounds as "no change", leaving the canvas at the portrait size (every
  // tap after that lands beside the camera); main.ts refreshes it after waking.
  const orientation = () => page.evaluate(() => ({
    coarse: matchMedia('(pointer: coarse)').matches,
    card: getComputedStyle(document.querySelector('.nrl-rotate')).display !== 'none',
    running: window.__nrlGame?.loop.running,
    game: `${window.__nrlGame?.scale.gameSize.width}x${window.__nrlGame?.scale.gameSize.height}`,
    viewport: `${innerWidth}x${innerHeight}`,
  }));
  let rotateCard = false;
  await step('portrait', async (rec) => {
    if (!PHONE) return 'desktop window: no rotate card';
    await page.setViewportSize({ width: H, height: W });
    await wait(600);
    const o = await orientation();
    if (!o.coarse) return 'this Chromium reports a fine pointer in portrait, so the rotate card cannot show';
    if (!o.card) throw new Error('no rotate card in portrait');
    if (o.running !== false) throw new Error('game loop still running under the rotate card');
    rotateCard = true;
    rec.notes.push('rotate card shown, loop asleep');
  });
  await step('landscape-again', async (rec) => {
    if (!PHONE) return 'desktop window';
    await page.setViewportSize({ width: W, height: H });
    await wait(600);
    const o = await orientation();
    if (o.card) throw new Error('rotate card still up in landscape');
    if (rotateCard && o.running !== true) throw new Error('game loop did not wake');
    if (o.game !== o.viewport) throw new Error(`canvas is ${o.game} in a ${o.viewport} viewport after rotating back`);
    rec.notes.push(`${rotateCard ? 'card gone, loop awake' : 'card gone'}, canvas ${o.game}`);
  });

  // Facilities: build two, move one, demolish the other.
  const cx = Math.round(W / 2), cy = Math.round(H / 2) + 10;
  const spotB = [cx - 130, cy + 20], spotMove = [cx + 120, cy + 30];
  await step('build-menu', async () => { await tap('.nrl-nav .nrl-btn:has-text("Build")'); await page.waitForSelector('.nrl-build-row'); });
  await step('build-placing', async () => {
    await press(page.locator('.nrl-build-row:not(.nrl-build-row-disabled)', { hasText: 'Training Paddock' }));
    await page.waitForSelector('.nrl-placebar:not([hidden])');
  });
  await step('built-paddock', async () => { await tapAt(cx, cy); await wait(2200); }, { quietToasts: true });
  await step('build-second', async () => {
    await tap('.nrl-nav .nrl-btn:has-text("Build")');
    await press(page.locator('.nrl-build-row:not(.nrl-build-row-disabled)', { hasText: 'Canteen' }));
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
    await press(btn);
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

  // A match on the classic engine: Advance Week hands over to the match scene.
  await step('match-classic', async () => {
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

  // Live match (BAK-207 2g): the setting lives on the Fixtures screen. With it on,
  // the next match plays on the live sim and is watched through the overlay at ×8,
  // skipped to full time, and left by Back to Club; the overlay's score must be the
  // saved result. The setting stays on, so the rest of the season's matches run
  // the live sim headless. Skipped when the setting isn't there.
  let liveOn = false;
  await step('live-toggle', async (rec) => {
    await tap('.nrl-nav .nrl-btn:has-text("Fixtures")');
    await page.waitForSelector('.nrl-league');
    // Two toggles share the class and both mention a live match (hasText is a case-insensitive
    // substring match), so pick the "Live match (beta)" label by a case-sensitive regex.
    const box = page.locator('.nrl-live-toggle', { hasText: /Live match \(beta\)/ }).first().locator('input[type="checkbox"]');
    if (!(await box.count())) return 'no live-match setting on the Fixtures screen';
    await press(box);
    liveOn = await page.evaluate(() => window.__nrlState?.().settings.liveMatch === true);
    if (!liveOn) throw new Error('the live-match setting did not turn on');
    rec.notes.push('Live match (beta) on');
  });
  await step('live-match', async (rec) => {
    await tap('.nrl-league-close');
    if (!liveOn) return 'skipped: no live-match setting';
    await tap('.nrl-hud .nrl-btn:has-text("Advance Week")');
    await page.waitForSelector('.nrl-mo-controls', { timeout: 15000 });
    await press(page.locator('.nrl-mo-controls .nrl-btn', { hasText: '×8' }));
    await wait(6000);
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    if (!clock || clock === '00:00') throw new Error(`the live match clock did not move (${clock})`);
    rec.notes.push(`×8, clock ${clock}`);
  });
  // Coach calls (#73): the chips under the scoreboard in a live match. Tap the first
  // one on offer and see it lit for the set; skipped when there are no chips.
  await step('coach-call', async (rec) => {
    if (!liveOn) return 'skipped';
    const chips = page.locator('.nrl-mo-calls .nrl-btn:not([disabled])');
    if (!(await chips.count())) return 'no coach-call chips on the match screen';
    const chip = chips.first();
    const call = await chip.getAttribute('data-call');
    await press(chip);
    await page.waitForSelector(`.nrl-mo-calls .nrl-btn[data-call="${call}"][data-made]`, { timeout: 5000 });
    rec.notes.push(`called ${call}`);
  });
  await step('live-fulltime', async (rec) => {
    if (!liveOn) return 'skipped';
    await tap('.nrl-mo-controls .nrl-btn:has-text("Skip")');
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 20000 });
    await wait(500);
    const shown = (await page.locator('.nrl-mo-score').textContent())?.trim();
    // A live match holds the week until full time (#73), so read the live state, not the slot.
    const s = (await page.evaluate(() => window.__nrlState?.() ?? null)) ?? (await save());
    const f = [...s.league.fixtures].reverse().find((x) => x.result && (x.homeId === 'player' || x.awayId === 'player'));
    const saved = f?.result ? `${f.result.homeScore} – ${f.result.awayScore}` : '(no result saved)';
    rec.notes.push(`overlay ${shown}, saved ${saved}`);
    if (shown !== saved) throw new Error(`the overlay shows ${shown} but the saved result is ${saved}`);
  });
  await step('live-back-to-club', async (rec) => {
    if (!liveOn) return 'skipped';
    await leaveMatch();
    await facilitiesDrawn(rec);
  }, { quietToasts: true });

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
    await dumpSave('mid-season', rec);
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
    await press(page.locator('.nrl-rival-squad .nrl-btn:has-text("Close")'));
    await closeAny();
    await tap('.nrl-nav .nrl-btn:has-text("Contracts")');
    await wait(300);
  });
  await step('renewed', async (rec) => {
    const renew = page.locator('.nrl-contract-actions .nrl-btn:has-text("Renew")').first();
    if (!(await renew.count())) return 'no contract to renew';
    const label = await renew.textContent();
    await press(renew);
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
    await dumpSave('after-rollover', rec);
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
    await dumpSave('season-2', rec);
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
log(`\n${report.size}${PHONE ? ' (phone)' : ' (desktop)'}: ${report.steps.length} steps, ${failed.length} failed, ${layout.length} with layout problems, ${report.errors.length} errors`);
for (const s of failed) log(`  failed: ${s.file} — ${s.notes.join('; ')}`);
for (const e of report.errors) log(`  ${e}`);
for (const f of report.findings) log(`  finding: ${f}`);
process.exit(failed.length || report.errors.length ? 1 : 0);
