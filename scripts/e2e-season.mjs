// scripts/e2e-season.mjs — end-to-end playthrough of a full season on a phone
// (QA pass). Builds the game and serves it with `vite preview`, then in
// Chromium at 844×390 (touch) or 1280×800 (a desktop window, mouse):
//   title (build label) → new game → turn the phone upright (rotate card, loop asleep) and back (the
//   canvas fills the landscape viewport again) → build two facilities → move one →
//   demolish one → sign a free agent → change the kit → play a match on the
//   classic engine → turn on Live match (beta)
//   and watch one on the live sim through the overlay to Back to Club →
//   answer event cards → renew a contract → watch rivals sign from the pool →
//   save, reload and continue → play to the season rollover → into season 2.
// N7's screens ride along (selectors in issue #198): the player page from Squad, an
// update bar raised mid-match (held until Back to Club), the next-match card and the
// ladder's form column, the Guide's How Nines works, the season review at the
// rollover and again from History. Each skips with a note on a build without it.
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
// A promise that rejects unawaited would end the run there, with no report: record it as an error.
process.on('unhandledRejection', (err) => { report.errors.push(`unhandled rejection: ${err?.message?.split('\n')[0] ?? err}`); });
const log = (...a) => console.log(...a);

// ── Server: a production build served by `vite preview` (no hot reload mid-run) ──
let server = null;
async function startServer() {
  if (EXTERNAL) return;
  // Per size: two sizes run side by side would otherwise rebuild one dist under each other's
  // preview, and the page's service worker offered "New version ready" over the season review.
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
/** Close the top modal (a dialog before the screen under it): its Close or its ✕. */
const closeAny = async () => {
  await page.evaluate(() => {
    for (const m of [...document.querySelectorAll('.nrl-modal')].reverse()) {
      for (const b of m.querySelectorAll('.nrl-btn')) {
        const t = b.textContent?.trim().toLowerCase();
        if (t === 'close' || b.getAttribute('aria-label')?.toLowerCase() === 'close') { b.click(); return; }
      }
    }
  });
  await wait(200);
};
/** Open a nav destination by id: its tab, or More then its row in the sheet (#344). */
const navTo = async (id) => {
  const tab = page.locator(`.nrl-nav > .nrl-btn[data-screen="${id}"]`);
  if (await tab.count()) { await press(tab.first()); return; }
  await press(page.locator('.nrl-nav [data-nav-more]').first());
  await press(page.locator(`.nrl-nav-sheet .nrl-btn[data-screen="${id}"]`).first());
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

/**
 * The smallest box among the visible elements a selector matches, for the touch-size
 * read (N14, #263): "W×H", or null when none is on screen.
 */
async function smallestBox(selector) {
  return page.evaluate((sel) => {
    const boxes = [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
    if (!boxes.length) return null;
    const min = boxes.reduce((a, b) => (Math.min(b.width, b.height) < Math.min(a.width, a.height) ? b : a));
    return { w: Math.round(min.width), h: Math.round(min.height) };
  }, selector);
}
/** On a touch screen, a control under 44px is a finding (N7's rule, N14's backlog). */
const TOUCH_MIN = 44;
const tooSmall = (box) => PHONE && box && (box.w < TOUCH_MIN || box.h < TOUCH_MIN);

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
 * first autosave: a week advance, or the page hiding) the live state through the
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

/** A plan card up (the half-time card waits for Continue, #341): play on. */
async function continueCards() {
  const go = page.locator('.nrl-mo-plan .nrl-mo-plan-go');
  if (await go.count()) await press(go.first());
}

/** Skip to full time: the pause button, then Skip in its sheet (#348 M3). */
async function skipMatch() {
  await continueCards();
  await tap('.nrl-mo-controls [data-pause]');
  await tap('.nrl-mo-sheet [data-skip]');
}

/** Why the element's centre does not take a tap (covered, off screen, under 44px on a phone), or null. */
async function untappable(selector) {
  return page.evaluate(([sel, phone]) => {
    const b = document.querySelector(sel);
    if (!b) return 'missing';
    const r = b.getBoundingClientRect();
    if (r.width < 1 || getComputedStyle(b).display === 'none') return 'hidden';
    if (phone && (r.width < 44 || r.height < 44)) return `${Math.round(r.width)}×${Math.round(r.height)}`;
    if (r.left < -1 || r.top < -1 || r.right > window.innerWidth + 1 || r.bottom > window.innerHeight + 1) return `off screen (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`;
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return at === b || b.contains(at) ? null : `covered by "${at?.className || at?.tagName || 'nothing'}"`;
  }, [selector, PHONE]);
}

/**
 * At full time: go back to the club. With the Player of the Match card up, Back to
 * Club must take the first tap (#203) and the card must go with the match view.
 */
async function leaveMatch() {
  const back = page.locator('.nrl-btn:has-text("Back to Club")').first();
  await back.waitFor();
  if (await page.locator('.nrl-potm-modal').count()) {
    const hit = await back.evaluate((b) => {
      const r = b.getBoundingClientRect();
      const at = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return b.contains(at) ? null : at?.className || at?.tagName || 'nothing';
    });
    if (hit) throw new Error(`Back to Club is covered by "${hit}" while Player of the Match is up`);
  }
  await press(back);
  await page.waitForSelector('.nrl-hud .nrl-btn:has-text("Advance Week")');
  if (await page.locator('.nrl-potm-modal').count()) throw new Error('the Player of the Match card stayed up after Back to Club');
}

/**
 * One week with Advance Week, as tapped: skip the match if one opens, or see the round forfeited
 * (a squad short of 13), or nothing at all (a bye or a week out of the finals).
 */
async function weekAsTapped(rec) {
  const at = await page.evaluate(() => { const s = window.__nrlState(); return `${s.season}:${s.week}`; });
  await tapAdvanceWeek();
  // The round's own toast ("… Round 9 forfeited (0–24)."), not the stop's "… would be forfeited."
  const what = await page.waitForFunction((a) => {
    if (document.querySelector('.nrl-mo-controls')) return 'match';
    if ([...document.querySelectorAll('.nrl-toast')].some((t) => /forfeited \(\d+/.test(t.textContent ?? ''))) return 'forfeit';
    const s = window.__nrlState();
    return `${s.season}:${s.week}` !== a ? 'week' : null;
  }, at, { timeout: 15000 }).then((h) => h.jsonValue())
    .catch(() => { throw new Error(`Advance Week did nothing within 15 s at ${at.replace(/(\d+):(\d+)/, 'S$1 W$2')}`); });
  if (what === 'match') {
    await skipMatch();
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 30000 });
    await leaveMatch();
  }
  // The week ends once the rival round is in (as long as held-week allows); wait for it.
  await page.waitForFunction((a) => { const s = window.__nrlState(); return `${s.season}:${s.week}` !== a; }, at, { timeout: 60000 }).catch(() => {});
  rec.notes.push(what === 'forfeit' ? 'the round forfeited' : what === 'match' ? 'a match, skipped' : 'no match that week');
}

/**
 * Advance Week's questions before it goes (#338, #350 H3): a long run's "Play 22
 * weeks?", and the decision cards it would take the defaults of. The playthrough
 * answers its cards first (answerCards), so a card here is one drawn since: go ahead.
 */
async function passAdvanceAsks() {
  for (let i = 0; i < 2; i++) {
    const which = await page.waitForFunction(() => (document.querySelector('[data-advance-confirm]') ? 'confirm'
      : document.querySelector('[data-advance-ask]') ? 'ask' : null), null, { timeout: 600 }).then((h) => h.jsonValue()).catch(() => null);
    if (!which) return;
    await press(page.locator(which === 'confirm' ? '[data-confirm-advance]' : '[data-ask-proceed]'));
    await wait(150);
  }
}

/** Tap Advance Week and get past its questions. */
async function tapAdvanceWeek() {
  await tap('.nrl-hud .nrl-btn:has-text("Advance Week")');
  await passAdvanceAsks();
}

/** Advance with the split-button menu: index 0 = ×4 weeks, 1 = to finals, 2 = to season end. */
async function advanceMenu(i) {
  await tap('.nrl-hud-menu-toggle');
  await tap(`.nrl-hud-menu-item >> nth=${i}`);
  await passAdvanceAsks();
  // N10.2: the advance yields between weeks; wait for the run to end.
  await page.waitForFunction(() => !document.querySelector('.nrl-hud[data-advancing]'), null, { timeout: 240000 });
  await wait(400);
}

/** Answer every waiting event card (first choice, or the second for odd cards so both get exercised). */
async function answerCards(rec) {
  const s = await save();
  const pending = s?.eventDeck?.pending ?? [];
  if (!pending.length) return 0;
  // #345: News lists the waiting cards on one row; its Answer opens them one at a time.
  await navTo('news');
  await tap('[data-decisions-open]');
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
  // The held-week step (#216) needs the rival round's Worker as slow as a phone's (CPU
  // throttling never reaches a Worker): a Worker posts its jobs window.__nrlWorkerDelayMs late.
  // Only the background lane's: the Skip has its own worker (N10.4) and must not wait.
  await ctx.addInitScript(() => {
    const Base = window.Worker;
    if (!Base) return;
    window.Worker = class extends Base {
      constructor(url, opts) { super(url, opts); this.slowed = opts?.name !== 'match-skip'; }
      postMessage(...args) {
        const ms = this.slowed ? window.__nrlWorkerDelayMs ?? 0 : 0;
        if (ms > 0) setTimeout(() => super.postMessage(...args), ms);
        else super.postMessage(...args);
      }
    };
  });
  // The weekly summary card (#368) shows after every advance. The week-summary step
  // checks it once; after that a flag (kept across the reload) closes each one as it
  // opens, so it never sits over the grounds or the update bar in the other steps.
  await ctx.addInitScript(() => {
    new MutationObserver(() => {
      if (sessionStorage.getItem('nrlE2eCloseSummary') !== '1') return;
      document.querySelector('[data-week-summary] [data-summary-close]')?.click();
    }).observe(document, { childList: true, subtree: true });
  });
  page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(`console: ${m.text()}`); });

  await step('title', async (rec) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    // N7 (#182): the build label on the title screen, "Build <date> <sha>".
    const label = (await page.locator('[data-nrl-build]').first().textContent().catch(() => null))?.trim();
    if (label === undefined || label === null) return 'no build label on the title screen';
    if (!/^Build \S+/.test(label)) throw new Error(`build label reads "${label}"`);
    rec.notes.push(label);
    // N14 (#263): the colour swatches are a finger's size on a touch screen.
    const sw = await smallestBox('[data-nrl-primary], [data-nrl-secondary]');
    if (sw) rec.notes.push(`swatches ${sw.w}×${sw.h}`);
    if (tooSmall(sw)) throw new Error(`title swatches ${sw.w}×${sw.h}, under ${TOUCH_MIN}px on touch`);
  });
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
  await step('build-menu', async () => { await navTo('build'); await page.waitForSelector('.nrl-build-row'); });
  await step('build-placing', async () => {
    await press(page.locator('.nrl-build-row:not(.nrl-build-row-disabled)', { hasText: 'Training Paddock' }));
    await page.waitForSelector('.nrl-placebar:not([hidden])');
  });
  await step('built-paddock', async () => { await tapAt(cx, cy); await wait(2200); }, { quietToasts: true });
  await step('build-second', async () => {
    await navTo('build');
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
  await step('recruit', async () => { await navTo('recruit'); await page.waitForSelector('.nrl-screen-title'); });
  await step('signed', async (rec) => {
    const btn = page.locator('.nrl-row .nrl-row-action:not([disabled])').first();
    const name = await page.locator('.nrl-row:has(.nrl-row-action:not([disabled])) .nrl-row-name').first().textContent();
    await press(btn);
    await wait(300);
    rec.notes.push(`signed ${name}`);
  });
  await step('squad', async () => { await closeAny(); await navTo('squad'); await page.waitForSelector('.nrl-squad-kit'); });
  // N11: the squad's training focus, a chip on the Squad screen; the pick is saved at once.
  await step('training-focus', async (rec) => {
    if (!(await page.locator('.nrl-squad-focus [data-focus="speed"]').count())) return 'no training focus on this build';
    await tap('.nrl-squad-focus [data-focus="speed"]');
    const focus = (await save())?.training?.focus;
    if (focus !== 'speed') throw new Error(`the saved training focus is ${focus}, not speed`);
    rec.notes.push('focus Speed');
  });
  // N7 (#187): a card's top row opens the player page; its close returns to the Squad screen.
  await step('player-page', async (rec) => {
    const open = page.locator('[data-player-open]').first();
    if (!(await open.count())) return 'no player page on this build';
    const id = await open.getAttribute('data-player-open');
    // His name: the row's middle can be a trait chip, which says what the trait does instead (#349 S3).
    await press(open.locator('.nrl-row-name'));
    await page.waitForSelector(`[data-player-page="${id}"]`);
    const actions = await page.locator(`[data-player-page="${id}"] [data-player-action]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-player-action')));
    rec.notes.push(`player ${id}; actions ${actions.join(', ') || 'none'}`);
  });
  await step('player-page-closed', async () => {
    if (!(await page.locator('[data-player-page]').count())) return 'skipped';
    await tap('.nrl-player-modal .nrl-screen-x');
    await page.waitForSelector('[data-player-page]', { state: 'detached', timeout: 5000 });
    await page.waitForSelector('.nrl-squad-kit');
  });

  // Kit designer.
  await step('kit-designer', async () => { await tap('.nrl-squad-kit'); await page.waitForSelector('.nrl-kit'); });
  await step('kit-saved', async () => {
    await tap('[data-kit-pattern="hoops"]');
    await tap('[data-kit-alt-pattern="stripes"]');
    await tap('.nrl-kit-save');
  }, { quietToasts: true });

  // A match: Advance Week hands over to the match scene (the live sim since BAK-207 Phase 4).
  await step('match-classic', async () => {
    await tapAdvanceWeek();
    await page.waitForSelector('.nrl-mo-controls', { timeout: 15000 });
    await wait(3000);
  });
  // Save & exit (mid-match save): the record is written, the club comes back, and
  // Advance Week reads Resume match. The ▾ menu must not skip the week.
  await step('save-exit', async (rec) => {
    // Behind the pause button (#348 M3); the sheet holds the match.
    await tap('.nrl-mo-controls [data-pause]');
    await page.waitForSelector('.nrl-mo-sheet');
    const btn = page.locator('.nrl-mo-sheet [data-save-exit]');
    const box = await btn.boundingBox();
    if (!box) throw new Error('no Save & exit control');
    if (PHONE && (box.width < 44 || box.height < 44)) throw new Error(`Save & exit is ${Math.round(box.width)}×${Math.round(box.height)}`);
    const placed = await btn.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: window.innerWidth, h: window.innerHeight };
    });
    if (placed.left < -1 || placed.right > placed.w + 1 || placed.top < -1 || placed.bottom > placed.h + 1) {
      throw new Error(`Save & exit is off-screen (${Math.round(placed.left)}–${Math.round(placed.right)}, ${Math.round(placed.top)}–${Math.round(placed.bottom)})`);
    }
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    await wait(1200);
    const held = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    if (held !== clock) throw new Error(`the clock ran on under the pause sheet (${clock} → ${held})`);
    await tap('.nrl-mo-sheet [data-save-exit]');
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-hud', { timeout: 15000 });
    const label = (await page.locator('.nrl-hud-actions > .nrl-btn').first().textContent())?.trim();
    if (label !== 'Resume match') throw new Error(`Advance Week reads "${label}", not Resume match`);
    await tap('.nrl-hud-menu-toggle');
    await tap('.nrl-hud-menu .nrl-btn:has-text("×4 weeks")');
    await page.waitForFunction(() => [...document.querySelectorAll('.nrl-toast')].some((t) => /still on/.test(t.textContent || '')));
    const toast = (await page.locator('.nrl-toast', { hasText: /still on/ }).last().textContent())?.trim() ?? '';
    const week = await page.evaluate(() => window.__nrlState?.().week);
    rec.notes.push(`left at ${clock}; button "${label}"; week still ${week}; menu: ${toast}`);
  }, { quietToasts: true });
  await step('resume-match', async (rec) => {
    await tap('.nrl-hud .nrl-btn:has-text("Resume match")');
    await page.waitForSelector('.nrl-mo-controls', { timeout: 20000 });
    await page.waitForFunction(() => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== '00:00';
    }, { timeout: 10000 });
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    rec.notes.push(`resumed at ${clock}`);
  });
  await step('match-fulltime', async () => {
    await skipMatch();
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 15000 });
    await wait(500);
  });
  // N7 (#182): a new build waiting during a match: no bar while the match is on screen.
  let updateRaised = false;
  await step('update-held', async (rec) => {
    updateRaised = await page.evaluate(() => { if (!window.__nrlUpdateReady) return false; window.__nrlUpdateReady(); return true; });
    if (!updateRaised) return 'no update hook on this build';
    await wait(500);
    if (await page.locator('.nrl-update-toast:visible').count()) throw new Error('the update bar shows during a match');
    rec.notes.push('build raised mid-match, bar held');
  });
  await step('back-to-club', async (rec) => { await leaveMatch(); await facilitiesDrawn(rec); }, { quietToasts: true });
  // #368: the week's summary, once the club is back: it fits without scrolling, its
  // buttons take a finger, and Close puts it away. Later cards close themselves.
  await step('week-summary', async (rec) => {
    const card = page.locator('[data-week-summary]');
    if (!(await card.count())) await card.waitFor({ timeout: 5000 }).catch(() => {});
    if (!(await card.count())) return 'no weekly summary on this build';
    const fit = await page.evaluate(() => {
      const box = document.querySelector('[data-week-summary]').closest('.nrl-modal-scroll');
      return { scrolls: box.scrollHeight > box.clientHeight + 1, title: document.querySelector('[data-week-summary] h2')?.textContent };
    });
    rec.notes.push(fit.title ?? '');
    if (fit.scrolls) throw new Error('the weekly summary scrolls');
    const small = await smallestBox('[data-summary-advance], [data-summary-close]');
    if (tooSmall(small)) throw new Error(`summary buttons ${small.w}×${small.h}, under ${TOUCH_MIN}px on touch`);
    await tap('[data-summary-close]');
    await card.waitFor({ state: 'detached', timeout: 3000 });
    await page.evaluate(() => sessionStorage.setItem('nrlE2eCloseSummary', '1'));
  });
  await step('update-bar', async (rec) => {
    if (!updateRaised) return 'skipped';
    await page.waitForSelector('.nrl-update-toast', { state: 'visible', timeout: 5000 });
    await tap('.nrl-update-later');
    await page.waitForSelector('.nrl-update-toast', { state: 'hidden', timeout: 5000 });
    rec.notes.push('bar shown after Back to Club; Later dismissed it');
  });

  // N11: a plan and a goal-kicker on the Lineup screen; the half-time card changes the plan below.
  await step('lineup-plan', async (rec) => {
    await closeAny();
    await navTo('lineup');
    await page.waitForSelector('.nrl-lineup-row');
    await tap('.nrl-screen-tools [data-plan]');
    await page.waitForSelector('.nrl-lineup-plan');
    if (!(await page.locator('.nrl-lineup-tac [data-tactic="grind"]').count())) return 'no tactics on this build';
    await tap('.nrl-lineup-tac [data-tactic="grind"]');
    await closeAny();
    // Select a fit starter's tile (an injured one is replaced on the day, and the kick with
    // him), then make him the goal-kicker.
    const fit = page.locator('.nrl-lineup-tile[data-spot^="s"]:not([data-out]):not([data-empty])').first();
    const spot = await fit.getAttribute('data-spot');
    await press(fit);
    await tap('.nrl-lineup-kc .nrl-btn:has-text("Kicker")');
    const l = await page.evaluate(() => window.__nrlState?.().lineup ?? null);
    const slot = Number(spot.slice(1));
    if (l?.tactics?.attack !== 'grind') throw new Error(`the lineup's attack is ${l?.tactics?.attack}, not grind`);
    if (!l?.kicker || l.kicker !== l.starters[slot]) throw new Error(`the kicker is ${l?.kicker}, not ${l?.starters?.[slot]} (${spot})`);
    if (!(await page.locator(`.nrl-lineup-tile[data-spot="${spot}"] [data-kicker]`).count())) throw new Error(`no K badge on ${spot}`);
    rec.notes.push(`Grind / ${l.tactics.defence}; kicker ${l.kicker} (${spot})`);
    await closeAny();
  });

  // Live match (BAK-207 2g): the setting lives on the Fixtures screen. With it on,
  // the next match plays on the live sim and is watched through the overlay at ×8,
  // skipped to full time, and left by Back to Club; the overlay's score must be the
  // saved result. The setting stays on, so the rest of the season's matches run
  // the live sim headless. Since the switch-over (BAK-207 Phase 4) there is no
  // setting and every match is live.
  let liveOn = false;
  await step('live-toggle', async (rec) => {
    await navTo('fixtures');
    await page.waitForSelector('.nrl-league');
    // Two toggles share the class and both mention a live match (hasText is a case-insensitive
    // substring match), so pick the "Live match (beta)" label by a case-sensitive regex.
    const box = page.locator('.nrl-live-toggle', { hasText: /Live match \(beta\)/ }).first().locator('input[type="checkbox"]');
    // Since the switch-over (BAK-207 Phase 4) there is no setting: every match is live.
    if (!(await box.count())) {
      liveOn = true;
      rec.notes.push('no setting: every match is live');
      return;
    }
    await press(box);
    liveOn = await page.evaluate(() => window.__nrlState?.().settings.liveMatch === true);
    if (!liveOn) throw new Error('the live-match setting did not turn on');
    rec.notes.push('Live match (beta) on');
  });
  await step('live-match', async (rec) => {
    await tap('.nrl-league-modal .nrl-screen-x');
    if (!liveOn) return 'skipped: no live-match setting';
    await tapAdvanceWeek();
    await page.waitForSelector('.nrl-mo-controls', { timeout: 15000 });
    await press(page.locator('.nrl-mo-controls .nrl-btn', { hasText: '×8' }));
    await wait(6000);
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    if (!clock || clock === '00:00') throw new Error(`the live match clock did not move (${clock})`);
    rec.notes.push(`×8, clock ${clock}`);
  });
  // Instant replay of a try (N15.5). Additive (N8's playthrough): at ×8, wait for
  // the Replay button, tap it, and check the re-sim did not block the page and
  // the clock is back where the live match left it. Noted in docs/status/2026-10-qa.md.
  // The half-time card waits for Continue (#341): a first half with no try reaches it
  // here, and this step plays the card the way half-time-plan does.
  let halfTimeDone = null;
  const halfTimeCard = () => page.locator('.nrl-mo-plan', { has: page.locator('.nrl-mo-plan-head', { hasText: 'Half-time' }) });
  async function playHalfTime(rec) {
    const card = halfTimeCard();
    // It stays up by itself: at ×8 it used to go on after 4.5 s while the coach was still reading it.
    await wait(6000);
    if (!(await card.count())) throw new Error('the half-time card closed by itself');
    const go = await untappable('.nrl-mo-plan .nrl-mo-plan-go');
    if (go) throw new Error(`the half-time card's Continue is not tappable (${go})`);
    const replay = await page.locator('.nrl-mo-replay:visible').count();
    if (replay) throw new Error('the Replay chip shows over the half-time card');
    await press(card.locator('[data-tactic="expansive"]'));
    if (!(await card.locator('[data-tactic="expansive"][data-active]').count())) throw new Error('Expansive did not light on the half-time card');
    await press(card.locator('.nrl-mo-plan-go'));
    await card.waitFor({ state: 'detached', timeout: 5000 });
    halfTimeDone = 'half-time: waited 6 s, Expansive, Continue';
    rec.notes.push(halfTimeDone);
  }
  await step('try-replay', async (rec) => {
    if (!liveOn) return 'skipped';
    const btn = page.locator('.nrl-mo-replay');
    const until = Date.now() + 150000;
    let seen = false;
    while (!seen && Date.now() < until) {
      const got = await Promise.race([
        btn.waitFor({ state: 'visible', timeout: until - Date.now() }).then(() => 'replay'),
        halfTimeCard().waitFor({ timeout: until - Date.now() }).then(() => 'half-time'),
      ]).catch(() => null);
      if (got === 'half-time' && !halfTimeDone) await playHalfTime(rec);
      else if (got === 'replay') seen = true;
      else break;
    }
    if (!seen) {
      if (await page.locator('.nrl-mo-final').count()) return 'no try before full time';
      throw new Error('no Replay chip within 150 s of the live match');
    }
    // Docked under the scoreboard, its centre takes the tap (the old centred button slid off the finger when pressed).
    const where = await untappable('.nrl-mo-replay');
    if (where) throw new Error(`the Replay chip is not tappable (${where})`);
    // Under a sheet the chip hides and its seconds stop; back on the field it shows again (#341).
    const count = async () => (await page.locator('.nrl-mo-replay-count').textContent().catch(() => null))?.trim();
    await tap('.nrl-mo-controls [data-pause]');
    await page.waitForSelector('.nrl-mo-sheet');
    await wait(400);
    const underSheet = await count();
    if (await btn.isVisible()) throw new Error('the Replay chip shows over the pause sheet');
    await wait(1500);
    if ((await count()) !== underSheet) throw new Error(`the Replay chip's seconds ran under the sheet (${underSheet} → ${await count()})`);
    await tap('.nrl-mo-sheet .nrl-btn:has-text("Resume")');
    await btn.waitFor({ state: 'visible', timeout: 2000 });
    rec.notes.push(`chip under the sheet: hidden, held at ${underSheet} s`);
    // Full time used to hide the button (display:none). The class alone must not cover it.
    const covered = await page.evaluate(() => {
      const b = document.querySelector('.nrl-mo-replay');
      const root = document.querySelector('.nrl-match-overlay');
      if (!b || !root) return 'missing';
      root.classList.add('nrl-mo-final');
      const r = b.getBoundingClientRect();
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const hidden = getComputedStyle(b).display === 'none' || r.height < 44;
      root.classList.remove('nrl-mo-final');
      return hidden || !(at === b || b.contains(at)) ? 'covered' : null;
    });
    if (covered) throw new Error(`Replay is not tappable with the full-time class on (${covered})`);
    // At ×8 the match runs on for a second or more between reading the clock here and the
    // click arriving, and it is back at the tapped second for only a few frames after the
    // replay. So both clocks are noted in the page: at the click, and as the replay tag comes off.
    await page.evaluate(() => {
      const root = document.querySelector('.nrl-match-overlay');
      const clock = () => document.querySelector('.nrl-mo-clock')?.textContent?.trim() ?? '';
      let was = false;
      window.__replayTap = null;
      window.__replayEnd = null;
      const onTap = (e) => {
        if (!e.target.closest?.('.nrl-mo-replay')) return;
        window.__replayTap = clock();
        window.removeEventListener('click', onTap, true);
      };
      window.addEventListener('click', onTap, true);
      const watch = new MutationObserver(() => {
        const on = root.classList.contains('nrl-mo-replaying');
        if (was && !on) {
          window.__replayEnd = clock();
          watch.disconnect();
        }
        was = on;
      });
      watch.observe(root, { attributes: true, attributeFilter: ['class'] });
    });
    await tap('.nrl-mo-replay');
    await page.waitForFunction(() => document.querySelector('.nrl-match-overlay')?.hasAttribute('data-replay-block'), null, { timeout: 15000 });
    const block = Number(await page.locator('.nrl-match-overlay').getAttribute('data-replay-block'));
    if (!Number.isFinite(block)) throw new Error(`replay block is not a number`);
    if (block >= 300) throw new Error(`replay blocked the page for ${block} ms`);
    // The overlay root is only a holder for fixed children, so it has no height and a visibility wait on `.nrl-mo-replaying` never sees it. The tag is the thing on screen.
    await page.waitForSelector('.nrl-mo-replay-tag', { timeout: 5000 });
    const tapped = await page.evaluate(() => window.__replayTap);
    if (!tapped) throw new Error('the click on Replay was not seen');
    await page.waitForFunction((was) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== was;
    }, tapped, { timeout: 4000 });
    // Back where the live match left it: the tapped second, or the next (the pause lands on a tick boundary).
    await page.waitForFunction(() => window.__replayEnd !== null, null, { timeout: 14000 });
    const after = await page.evaluate(() => window.__replayEnd);
    const secs = (c) => { const m = /^(\d+):(\d+)$/.exec(c ?? ''); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };
    const d = secs(after) - secs(tapped);
    if (!(d >= 0 && d <= 1)) throw new Error(`replay ended at ${after}, the live match was tapped at ${tapped}`);
    rec.notes.push(`Replay tapped at ${tapped}, live again at ${after}; main-thread block ${block} ms`);
  });
  // A hard kill: reload mid-match (no pagehide the game can trust) and Continue.
  // The same match comes back, not kick-off.
  await step('live-kill', async (rec) => {
    if (!liveOn) return 'skipped';
    if (!halfTimeDone && (await halfTimeCard().count())) await playHalfTime(rec);
    const before = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    const tick = await page.evaluate(() => {
      const raw = localStorage.getItem('nrl-live-match-1');
      return raw ? JSON.parse(raw).tick : 0;
    });
    if (!(tick > 0)) throw new Error(`the live-match record has no tick (${tick})`);
    await page.reload();
    await page.waitForSelector('[data-nrl-continue-1]', { timeout: 30000 });
    await tap('[data-nrl-continue-1]');
    await page.waitForSelector('.nrl-mo-controls', { timeout: 20000 });
    await page.waitForFunction(() => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== '00:00';
    }, { timeout: 15000 });
    const after = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    const afterTick = await page.evaluate(() => {
      const raw = localStorage.getItem('nrl-live-match-1');
      return raw ? JSON.parse(raw).tick : 0;
    });
    if (afterTick + 40 < tick) throw new Error(`resumed tick ${afterTick} is behind the kill tick ${tick}`);
    rec.notes.push(`killed at ${before} (tick ${tick}); resumed at ${after} (tick ${afterTick})`);
  });
  // Coach calls (#73): the chips under the scoreboard in a live match. Tap the first
  // one on offer and see it lit for the set; skipped when there are no chips.
  await step('coach-call', async (rec) => {
    if (!liveOn) return 'skipped';
    if (!halfTimeDone && (await halfTimeCard().count())) await playHalfTime(rec);
    if (!(await page.locator('.nrl-mo-calls .nrl-btn[data-call]').count())) return 'no coach-call chips on the match screen';
    // At ×8 the chips switch with possession every second or so and are never still
    // long enough for a locator click: call at ×1, tapping the first chip on offer
    // inside the page, then go back to ×8.
    await press(page.locator('.nrl-mo-controls .nrl-btn', { hasText: '×1' }));
    // The tap lights its chip at once (MatchScene.refreshCallChips) unless the call is refused,
    // and the light goes with the set, which can end a tick later: read it in the same task.
    let call = null;
    const refused = [];
    for (let i = 0; i < 40 && !call; i++) {
      const got = await page.evaluate(() => {
        // Call chips only: the Plan chip (N11.2) shares the row and opens the plan card.
        const b = [...document.querySelectorAll('.nrl-mo-calls .nrl-btn[data-call]')].find((e) => !e.hidden && !e.disabled);
        if (!b) return null;
        b.click();
        return { call: b.getAttribute('data-call'), lit: b.hasAttribute('data-made'), why: b.title };
      });
      if (got?.lit) call = got.call;
      else {
        if (got) refused.push(`${got.call}: ${got.why}`);
        await wait(250);
      }
    }
    if (!call) throw new Error(refused.length ? `no call lit its chip (${refused.slice(-2).join('; ')})` : 'no coach-call chip was on offer for 10 s');
    rec.notes.push(`called ${call}${refused.length ? ` (${refused.length} refused first)` : ''}`);
    await press(page.locator('.nrl-mo-controls .nrl-btn', { hasText: '×8' }));
  });
  // N11: the half-time card comes up by itself and waits for Continue (#341); change the attack and play on.
  await step('half-time-plan', async (rec) => {
    if (!liveOn) return 'skipped';
    if (halfTimeDone) return `played during try-replay (${halfTimeDone})`;
    // A 9-minute half at ×8 is about 70 s, but about 105 s on a loaded machine: two runs beside
    // other work ran out of 120 s with the clock at 06:56 and 08:55 of the half. 300 s leaves room.
    await halfTimeCard().waitFor({ timeout: 300000 });
    await playHalfTime(rec);
  });
  await step('live-fulltime', async (rec) => {
    if (!liveOn) return 'skipped';
    await skipMatch();
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
    await navTo('news');
    await page.waitForSelector('.nrl-news-list');
  });
  // N7 (#184): the next-match card on the Fixtures tab, with the opponent's form.
  await step('next-match', async (rec) => {
    await closeAny();
    await navTo('fixtures');
    await page.waitForSelector('.nrl-league');
    const card = page.locator('[data-next-match]');
    if (!(await card.count())) return 'no next-match card on this build';
    const opp = (await page.locator('[data-next-opponent]').first().textContent())?.trim().replace(/\s+/g, ' ');
    const form = await page.locator('[data-next-match] .nrl-form i').count();
    if (!opp) throw new Error('the next-match card names no opponent');
    rec.notes.push(`next: ${opp.slice(0, 60)}; ${form} form cells`);
  });
  await step('ladder', async (rec) => {
    await closeAny();
    await navTo('fixtures'); await tap('.nrl-league-tabs .nrl-btn:has-text("Ladder")');
    await page.waitForSelector('.nrl-ladder-table');
    const form = await page.locator('.nrl-ladder-form').count();
    if (form) rec.notes.push(`form column on ${form} rows`);
  });
  await step('rival-squad', async () => { await tap('.nrl-ladder-club'); await page.waitForSelector('.nrl-rival-squad'); });

  // Contracts: renew someone.
  await step('contracts', async () => {
    await press(page.locator('.nrl-rival-modal .nrl-screen-x'));
    await closeAny();
    await navTo('contracts');
    await wait(300);
  });
  await step('renewed', async (rec) => {
    const renew = page.locator('.nrl-contract-actions .nrl-btn:has-text("Renew")').first();
    if (!(await renew.count())) return 'no contract to renew';
    const label = await renew.textContent();
    await press(renew);
    rec.notes.push(`tapped ${label}`);
  });
  await step('finance', async () => { await closeAny(); await navTo('finance'); await wait(300); });
  // N14.5 (#287): the Staff screen, under More since #344. Hire the Welfare Manager, so the saves
  // dumped after this (after-rollover, live-rivals) carry a staffed club for the corpus.
  await step('staff-hire', async (rec) => {
    if (await page.locator('.nrl-nav [data-screen="staff"]').count()) { await navTo('staff'); await wait(300); }
    const row = page.locator('.nrl-staff-row[data-staff="welfare"]');
    if (!(await row.count())) return 'no Staff section on this build';
    const hire = row.locator('.nrl-btn:has-text("Hire")');
    if (!(await hire.count())) return 'the Welfare Manager is already hired';
    await hire.scrollIntoViewIfNeeded();
    await press(hire);
    await page.waitForSelector('.nrl-staff-row[data-staff="welfare"] .nrl-btn:has-text("Release")', { timeout: 5000 });
    const staff = await page.evaluate(() => window.__nrlState().staff);
    const welfare = staff.find((m) => m.role === 'welfare');
    if (!welfare) throw new Error('Hire tapped but no Welfare Manager in the state');
    rec.notes.push(`hired ${welfare.name}, $${welfare.wage}/wk`);
  });
  // N7 (#189): ? opens the Guide; its How Nines works page; close.
  await step('guide-nines', async (rec) => {
    await closeAny();
    await navTo('help');
    if (!(await page.waitForSelector('[data-guide]', { timeout: 5000 }).catch(() => null))) return 'no Guide on this build';
    await tap('[data-guide-tab="nines"]');
    await page.waitForSelector('[data-guide-page="nines"]');
    const tabs = await page.locator('[data-guide-tab]').count();
    rec.notes.push(`${tabs} Guide pages; How Nines works open`);
  });
  await step('guide-closed', async () => {
    if (!(await page.locator('[data-guide]').count())) return 'skipped';
    await tap('.nrl-guide-modal .nrl-screen-x');
    await page.waitForSelector('[data-guide]', { state: 'detached', timeout: 5000 });
  });

  // N14 (#263): the controls N7 left under 44px on a touch screen, and the League's ✕
  // staying in view while the ladder scrolls.
  await step('control-sizes', async (rec) => {
    await closeAny();
    const found = [];
    await tap('.nrl-audio-gear');
    const mute = await smallestBox('.nrl-audio-row input[type="checkbox"]');
    if (mute) rec.notes.push(`mute ${mute.w}×${mute.h}`);
    if (tooSmall(mute)) found.push(`Mute ${mute.w}×${mute.h}`);
    await closeAny();
    await navTo('lineup');
    await page.waitForSelector('.nrl-lineup-row');
    const row = await smallestBox('.nrl-lineup-row');
    if (row) rec.notes.push(`lineup rows ${row.w}×${row.h}`);
    if (tooSmall(row)) found.push(`lineup row ${row.w}×${row.h}`);
    await closeAny();
    await navTo('fixtures'); await tap('.nrl-league-tabs .nrl-btn:has-text("Ladder")');
    await page.waitForSelector('.nrl-ladder-table');
    const closeInView = await page.evaluate(() => {
      const body = document.querySelector('.nrl-league-body');
      if (!body) return false; // no body to scroll: the check can't pass by not scrolling
      body.scrollTop = body.scrollHeight;
      const c = document.querySelector('.nrl-league-modal .nrl-screen-x')?.getBoundingClientRect();
      return !!c && c.top >= 0 && c.bottom <= window.innerHeight;
    });
    rec.notes.push(closeInView ? 'League ✕ in view after scrolling' : 'League ✕ scrolled away');
    if (!closeInView) found.push('League ✕ scrolled away');
    await closeAny();
    if (found.length) throw new Error(found.join('; '));
  });

  // Save, reload, continue. The game as it stands before the reload (live, not slot 1: a change
  // made since the last week, like the staff hire, must come back too; QA finding 21).
  const pre = await page.evaluate(() => window.__nrlState());
  await step('reload-title', async () => { await page.reload(); await page.waitForSelector('[data-nrl-continue-1]'); });
  await step('continued', async (rec) => {
    await tap('[data-nrl-continue-1]');
    await page.waitForSelector('.nrl-hud');
    await wait(800);
    const s = await page.evaluate(() => window.__nrlState());
    // What the player can change between weeks, some of it free (the kit, a card left open).
    const kept = (x) => ({
      week: x.week, money: x.money, staff: (x.staff ?? []).map((m) => m.role).join(','),
      squad: x.squad.map((p) => p.id).join(','), facilities: x.facilities.map((f) => `${f.defId}${f.level}@${f.x},${f.y}`).join(','),
      cards: x.eventDeck?.pending?.length ?? 0, kit: JSON.stringify(x.kit ?? null),
    });
    const [a, b] = [kept(pre), kept(s)];
    const lost = Object.keys(a).filter((k) => a[k] !== b[k]);
    if (lost.length) throw new Error(`changed across reload: ${lost.map((k) => `${k} ${String(a[k]).slice(0, 40)} → ${String(b[k]).slice(0, 40)}`).join('; ')}`);
    rec.notes.push(`same week ${s.week}, money, staff (${b.staff || 'none'}), squad, facilities, cards and kit after reload`);
    await facilitiesDrawn(rec);
  });

  // Play out the season: to the finals, then to season end, answering cards on the way.
  // Cards, injuries and contracts stop an advance; since N12.5 (#239) debt stops it only on
  // the crossing, a forced sale and the floor, and the season takes up to 12 calls. 24 is
  // twice that: a club stopping every week again (debt or otherwise) runs out of calls
  // and fails 'season-2'. A call that makes no progress fails at once, unless it stopped for
  // a squad short of 13 (#66): the long advance will not play a forfeit, so the week is played
  // with Advance Week, as a player with no money for signings would (QA finding 19).
  for (let i = 0; i < 24; i++) {
    const s = await save();
    if (s.season > 1) break;
    const target = s.week < 25 ? 1 : 2;
    const r = await step(`to-${target === 1 ? 'finals' : 'season-end'}-${i + 1}`, async (rec) => {
      await answerCards(rec);
      await advanceMenu(target);
      let now = await save();
      const stop = await page.locator('.nrl-toast').last().textContent().catch(() => '');
      rec.notes.push(`S${now.season} W${now.week} $${now.money}${stop ? ` · "${stop.trim()}"` : ''}`);
      if (now.season === s.season && now.week === s.week && /Only \d+ fit/.test(stop ?? '')) {
        // Not a failure, but worth seeing (finding 19): since #278 a forced sale keeps 13 fit, and
        // since #285 the Academy calls up juniors to make the side, so Advance Week plays a match.
        // A forfeit here means the squad is at SQUAD_CAP with too many hurt, or one of those regressed.
        const [fit, squad] = await page.evaluate(() => { const l = window.__nrlState(); return [l.squad.filter((p) => p.injuredWeeks <= 0).length, l.squad.length]; });
        report.findings.push(`S${now.season} W${now.week}: a long advance stopped short of 13 fit, ${fit} fit of ${squad} ($${now.money}); the week was played with Advance Week.`);
        await toastsGone();
        await weekAsTapped(rec);
        now = await save();
        rec.notes.push(`played the short week with Advance Week: S${now.season} W${now.week}`);
      }
      if (now.season === s.season && now.week === s.week) throw new Error(`no progress from S${s.season} W${s.week}`);
    }, { quietToasts: true });
    if (!r.ok && !r.errors) break;
  }
  await step('season-2', async (rec) => {
    const s = await save();
    if (s.season !== 2) throw new Error(`still in season ${s.season} week ${s.week}`);
    rec.notes.push(`season 2 week ${s.week}, ${s.history.length} season(s) in history, board patience ${s.boardPatience}`);
    await dumpSave('after-rollover', rec);
  });
  // N7 (#193): the season review opens at the rollover; close it, then reopen it from History.
  await step('season-review', async (rec) => {
    const review = page.locator('[data-season-review="1"]');
    if (!(await review.count())) {
      if (await page.evaluate(() => (window.__nrlState?.().history ?? []).some((h) => h.review))) throw new Error('season 1 has a review but none opened at the rollover');
      return 'no season review on this build';
    }
    rec.notes.push((await review.locator('.nrl-review-finish').textContent())?.trim() ?? '');
    // #351 E2: one header row, title and History beside the frame's ✕, no Close at the bottom.
    await tap('.nrl-review-modal > .nrl-screen-x');
    await page.waitForSelector('[data-season-review]', { state: 'detached', timeout: 5000 });
  });
  await step('history', async () => { await navTo('history'); await wait(300); });
  await step('history-review', async (rec) => {
    const open = page.locator('.nrl-history-review').first();
    if (!(await open.count())) return 'no review link on History';
    await press(open);
    await page.waitForSelector('[data-season-review="1"]');
    await tap('.nrl-review-head .nrl-review-history');
    await page.waitForSelector('.nrl-history-review');
    rec.notes.push('season 1 review reopened from History, and back to History from its header');
  });
  await step('season-2-week-2', async (rec) => {
    await closeAny();
    await answerCards(rec);
    await tapAdvanceWeek();
    await wait(1500);
    // A match week opens the match scene; skip it.
    if (await page.locator('.nrl-mo-controls').count()) {
      await skipMatch();
      await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 15000 });
      await leaveMatch();
    }
    const s = await save();
    rec.notes.push(`S${s.season} W${s.week}`);
    await facilitiesDrawn(rec);
    await dumpSave('season-2', rec);
  }, { quietToasts: true });

  // #216: with rival matches on the match engine (#212) the week holds until the rival round is
  // in, which can outlast the player's match. Back at the club before then, Advance Week and its
  // menu must say so: not drop the tap, nor report weeks advanced that never were.
  await step('held-week', async (rec) => {
    await closeAny();
    await answerCards(rec);
    // The setting is in Settings, behind the gear (#350 X3).
    await tap('.nrl-audio-gear');
    const toggle = page.locator('.nrl-rivals-toggle input[type="checkbox"]');
    if (!(await toggle.count())) return 'no rival-rounds setting on this build';
    await press(toggle);
    await closeAny();
    await page.evaluate(() => { window.__nrlWorkerDelayMs = 30000; });
    const week = await page.evaluate(() => window.__nrlState().week);
    const slotBefore = JSON.stringify(await save());
    await tapAdvanceWeek();
    // A match to skip; or, since #285's Academy call-up only past a full squad (SQUAD_CAP with too
    // many hurt), a forfeit: then the rivals alone hold the week and there is no match screen.
    const match = await page.waitForFunction(() => (document.querySelector('.nrl-mo-controls') ? 'match'
      : [...document.querySelectorAll('.nrl-toast')].some((t) => /forfeited \(\d+/.test(t.textContent ?? '')) ? 'forfeit' : null), null, { timeout: 15000 })
      .then((h) => h.jsonValue());
    if (match === 'match') {
      await skipMatch();
      await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 30000 });
      await leaveMatch();
    } else rec.notes.push('the round forfeited (short of 13 fit at a full squad), so only the rivals hold the week');
    const held = () => page.evaluate((w) => window.__nrlState().week === w, week);
    if (!(await held())) throw new Error('the week finished before the taps: the slowed Worker did not hold it');
    // QA finding 22: the screens that save at once are live during the hold. A change now (the
    // squad's training focus) must not write the half-ticked week: slot 1 stays as the week began.
    await navTo('squad');
    const focus = page.locator('.nrl-squad-focus [data-focus]:not(.nrl-sort-active)').first();
    rec.notes.push(`focus → ${await focus.getAttribute('data-focus')} during the hold`);
    await press(focus);
    // A screen, not a modal: closeAny leaves it up, over the Advance menu the taps below need.
    await press(page.locator('.nrl-screen-region .nrl-screen-x').first());
    await page.waitForSelector('.nrl-squad-focus', { state: 'detached', timeout: 5000 });
    if (!(await held())) throw new Error('the hold ended before the focus change: the slowed Worker was not slow enough');
    const slot = await save();
    if (JSON.stringify(slot) !== slotBefore) {
      throw new Error(`a change during the held week wrote it half-ticked: slot 1 at W${slot.week}, ${slot.league.fixtures.filter((f) => f.round === week && f.result).length} of round ${week}'s results in, $${slot.money}`);
    }
    // Each tap leaves its own message. A toast lasts a few seconds and a busy page can take longer than
    // that between taps, so keep a log of every toast as it is queued and count in that.
    await page.evaluate(() => {
      window.__nrlToastLog = [];
      const stack = document.querySelector('.nrl-toast-lane');
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) window.__nrlToastLog.push(n.textContent ?? ''); })
        .observe(stack, { childList: true });
    });
    const said = (n) => page.waitForFunction((k) => window.__nrlToastLog.filter((t) => /still being played/.test(t)).length >= k, n, { timeout: 10000 });
    await tapAdvanceWeek();
    await said(1).catch(() => { throw new Error('Advance Week during the held week said nothing'); });
    if (await page.locator('.nrl-mo-controls').count()) throw new Error('Advance Week started a match while the week was held');
    if (!(await held())) throw new Error('the hold ended before the second tap: the slowed Worker was not slow enough');
    await advanceMenu(0);
    await said(2).catch(() => { throw new Error('×4 weeks during the held week said nothing'); });
    const claimed = await page.evaluate(() => window.__nrlToastLog.find((t) => /^Advanced/.test(t)));
    if (claimed) throw new Error(`×4 weeks during the held week reported "${claimed}"`);
    if (!(await held())) throw new Error('the week moved on during the hold');
    await page.waitForFunction((w) => window.__nrlState().week !== w, week, { timeout: 60000 });
    const s = await page.evaluate(() => window.__nrlState());
    const round = s.league.fixtures.filter((f) => f.round === week);
    rec.notes.push(`held at W${week}${match === 'match' ? ' after Back to Club' : ''}; both taps said so; W${s.week}, round ${week} ${round.filter((f) => f.result).length}/${round.length} results`);
    if (round.some((f) => !f.result)) throw new Error('the held round finished with fixtures unplayed');
    // A save with rival matches on the match engine, for the corpus (v13's field).
    await dumpSave('live-rivals', rec);
    // Back to the default for whatever runs next.
    await page.evaluate(() => { window.__nrlWorkerDelayMs = 0; });
    await tap('.nrl-audio-gear');
    await press(page.locator('.nrl-rivals-toggle input[type="checkbox"]'));
    await closeAny();
  }, { quietToasts: true });

  // Settings → Import save writes the file over slot 1 and reloads to the title screen. Nothing
  // may save the game being left over it on the way out (#295's checker: the page-hide save did).
  await step('import-save', async (rec) => {
    await closeAny();
    const s = await save();
    const file = join(OUT, 'import.json');
    writeFileSync(file, JSON.stringify({ ...s, clubName: 'Imported FC' }));
    await tap('.nrl-audio-gear');
    // Wait and tap together: a wait started alone rejects unhandled if the tap outlasts it, and
    // Node ends the whole run there (1280×800 under load, 21 Oct 23:10).
    // Import asks first (#349 E1): the file is chosen from the confirm.
    await tap('.nrl-audio-settings .nrl-btn:has-text("Import save")');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 15000 }),
      tap('.nrl-audio-settings .nrl-settings-import-go'),
    ]);
    await chooser.setFiles(file);
    await page.waitForSelector('[data-nrl-continue-1]', { timeout: 30000 });
    const slot = await save();
    if (slot?.clubName !== 'Imported FC') throw new Error(`slot 1 holds "${slot?.clubName}" after the import's reload: the game being left was saved over the import`);
    rec.notes.push(`slot 1 holds "Imported FC" at S${slot.season} W${slot.week} after the reload`);
  });
  await step('import-continued', async (rec) => {
    await tap('[data-nrl-continue-1]');
    await page.waitForSelector('.nrl-hud');
    const live = await page.evaluate(() => window.__nrlState().clubName);
    if (live !== 'Imported FC') throw new Error(`Continue opened "${live}", not the imported club`);
    rec.notes.push('Continue opened the imported club');
  });

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
