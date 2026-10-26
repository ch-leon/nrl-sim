// scripts/e2e-webkit.mjs — Safari-shaped checks: long DOM panels (#206, #203) and
// a phone that opens already upright (#315).
// Builds the game, serves it with `vite preview`, and in Playwright's WebKit as an
// iPhone (touch, DPR 3, iOS user agent). Landscape at 956×330 (16 Pro Max with
// Safari's address bar and tab strip) and 844×390 checks:
//   - the page pins text-size-adjust to 100% (iOS Safari's landscape text boost off);
//   - at the authored text size, every tutorial step's copy fits its bubble unscrolled (#208);
//   - the welcome tutorial bubble sits inside the viewport with Skip and Next on
//     screen and tappable; Next and Skip work;
//   - the same with every font in the bubble boosted 2.17× (what Safari's boost did
//     on Leon's phone, issue #206; WebKit on Linux never boosts by itself): the copy
//     scrolls inside the bubble and Skip / Next stay reachable;
//   - the Guide boosted the same way: the page scrolls, Replay and Close reachable,
//     and Replay brings the tutorial back with its buttons on screen;
//   - the player page (#203) between HUD and nav: ✕, Renew / Sell / Release / Close
//     tappable, the nav uncovered; the ✕ closes it back to Squad.
// Screenshots and report.json go to e2e-output/webkit/<WxH>/.
// Then one portrait boot (390×844): the loop must already be asleep, and turning
// to 844×390 must wake it with the canvas filling the screen. The same turn
// mid-match freezes the clock and resumes it, and a parked match stays paused
// until the phone is sideways, including after Continue reopens the page upright.
// With the match up, the full call-chip set (Plan through Hold) is laid in and the
// ticker is checked at 360×640, 390×844, 667×375 and 844×390: it has to sit clear
// of the speed row, the chips and the corner buttons, and the open log icon keeps
// its fill under hover. Exits 1 on any failure.
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
  // #208: at the authored text size every step's copy fits without scrolling. Each
  // step's text is put in the welcome bubble in turn (one rule sizes them all here).
  await step('tutorial-every-step-fits', () => page.evaluate(() => {
    const text = document.querySelector('.nrl-tutorial-text');
    const steps = window.__nrlTutorialText ?? [];
    if (!text || !steps.length) return ['no tutorial copy to check (?e2e hook missing)'];
    const original = text.textContent;
    const out = [];
    steps.forEach((copy, i) => {
      text.textContent = copy;
      if (text.scrollHeight > text.clientHeight + 1) out.push(`step ${i + 1} copy overflows (${text.scrollHeight} > ${text.clientHeight}px): "${copy.slice(0, 30)}…"`);
    });
    text.textContent = original;
    return out;
  }));
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

// #315: the page opened upright, not turned upright after boot. 390×844 is the
// portrait pair of the 844×390 phone. Clicks go through element.click(): the
// rotate card covers the title and the HUD, so a Playwright tap never lands.
async function runPortrait(browser) {
  const OUT = join(OUT_ROOT, 'webkit', '390x844-boot');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: '390x844-boot', steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} 390x844 ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const press = (sel) => page.locator(sel).first().evaluate((el) => el.click());
  const state = () => page.evaluate(() => {
    const g = window.__nrlGame;
    const card = document.querySelector('.nrl-rotate');
    const canvas = document.querySelector('#game-root canvas');
    const box = canvas?.getBoundingClientRect();
    return {
      coarse: matchMedia('(pointer: coarse)').matches,
      portrait: matchMedia('(orientation: portrait)').matches,
      card: !!card && getComputedStyle(card).display !== 'none',
      started: !!g?.loop.started,
      running: g ? g.loop.running : null,
      game: g ? `${g.scale.gameSize.width}x${g.scale.gameSize.height}` : '',
      canvas: box ? `${Math.round(box.width)}x${Math.round(box.height)}` : '',
      viewport: `${innerWidth}x${innerHeight}`,
      clock: document.querySelector('.nrl-mo-clock')?.textContent?.trim() ?? '',
      advance: document.querySelector('.nrl-hud-actions > .nrl-btn')?.textContent?.trim() ?? '',
      controls: document.querySelectorAll('.nrl-mo-controls').length,
    };
  });
  // `started` stays true once the loop has been started; `running` drops when it sleeps.
  // Waiting only on `running === false` would pass in the gap before Phaser starts it.
  const asleep = (label) => page.waitForFunction(() => {
    const loop = window.__nrlGame?.loop;
    const card = document.querySelector('.nrl-rotate');
    return !!loop?.started && loop.running === false && !!card && getComputedStyle(card).display !== 'none';
  }, null, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: loop not asleep under the rotate card (${JSON.stringify(await state())})`);
  });
  const awake = (label) => page.waitForFunction(() => {
    const g = window.__nrlGame;
    if (!g?.loop.running) return false;
    const card = document.querySelector('.nrl-rotate');
    if (card && getComputedStyle(card).display !== 'none') return false;
    const canvas = document.querySelector('#game-root canvas')?.getBoundingClientRect();
    if (!canvas) return false;
    const size = `${g.scale.gameSize.width}x${g.scale.gameSize.height}`;
    const fills = size === `${innerWidth}x${innerHeight}`
      && Math.abs(canvas.width - innerWidth) <= 1
      && Math.abs(canvas.height - innerHeight) <= 1;
    return fills;
  }, null, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: loop did not resume with the canvas filling the screen (${JSON.stringify(await state())})`);
  });
  const turn = (width, height) => page.setViewportSize({ width, height });

  await step('portrait-boot', async (rec) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await press('[data-nrl-start]');
    await page.waitForSelector('.nrl-hud');
    await asleep('opened upright');
    const o = await state();
    if (!o.coarse) throw new Error('WebKit did not report a coarse pointer, so this is not a phone');
    rec.notes.push(`loop asleep, canvas ${o.canvas} in ${o.viewport}`);
  });
  await step('landscape-boot', async (rec) => {
    await turn(844, 390);
    await awake('turned sideways from boot');
    const o = await state();
    rec.notes.push(`loop awake, canvas ${o.canvas}`);
  });
  await step('tutorial-skipped', async () => {
    const skip = page.locator('.nrl-tutorial-skip');
    if (!(await skip.count())) return [];
    await skip.tap();
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
  });
  // Inspect the event UI in both orientations. Hide only the rotate prompt:
  // portrait gameplay is still paused, but DOM choices must fit and accept taps.
  await step('bali-choices-fit', async (rec) => {
    await page.addStyleTag({ content: '.nrl-rotate { display: none !important; }' });
    const problems = [];
    for (const [w, h] of [[360, 640], [390, 844], [667, 375], [844, 390]]) {
      for (const choice of [0, 1]) {
        await turn(w, h);
        if (!(await page.evaluate(() => window.__nrlShowCard?.('baliTrip')))) throw new Error('Bali hook failed');
        await page.locator('.nrl-nav .nrl-btn[data-screen="news"]').tap();
        await page.waitForSelector('.nrl-event-card');
        await page.waitForTimeout(100);
        const found = await reachProblems(page, '.nrl-event-card', ['[data-event-choice="0"]', '[data-event-choice="1"]']);
        found.push(...await page.evaluate(() => {
          const body = document.querySelector('.nrl-news-body').getBoundingClientRect();
          return [...document.querySelectorAll('.nrl-event-choice')].flatMap((b) => {
            const r = b.getBoundingClientRect();
            const out = [];
            if (r.height < 44 || r.width < 44) out.push(`choice ${b.dataset.eventChoice} is ${r.width}×${r.height}`);
            if (r.top < body.top - 1 || r.bottom > body.bottom + 1) out.push(`choice ${b.dataset.eventChoice} clipped by News body (${r.top.toFixed(1)}–${r.bottom.toFixed(1)} vs ${body.top.toFixed(1)}–${body.bottom.toFixed(1)})`);
            if (b.scrollHeight > b.clientHeight + 1) out.push(`choice ${b.dataset.eventChoice} clips its text`);
            return out;
          });
        }));
        problems.push(...found.map((p) => `${w}×${h}: ${p}`));
        await page.screenshot({ path: join(OUT, `bali-${w}x${h}-choice${choice}.png`) });
        await page.locator(`[data-event-choice="${choice}"]`).tap();
        if (await page.locator('.nrl-event-card').count()) problems.push(`${w}×${h}: choice ${choice} did not resolve`);
        await page.locator('.nrl-news-close').tap();
      }
      rec.notes.push(`${w}×${h}: both choices tapped`);
    }
    // Restore the real portrait prompt for the remaining orientation checks.
    await page.evaluate(() => {
      for (const style of document.querySelectorAll('style')) {
        if (style.textContent === '.nrl-rotate { display: none !important; }') style.remove();
      }
    });
    await turn(844, 390);
    return problems;
  });
  await step('match-running', async (rec) => {
    await page.locator('.nrl-hud .nrl-btn', { hasText: 'Advance Week' }).first().tap();
    await page.waitForSelector('.nrl-mo-controls');
    await page.waitForFunction(() => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== '00:00';
    });
    rec.notes.push(`clock ${(await state()).clock}`);
  });
  await step('mid-match-portrait', async (rec) => {
    const before = (await state()).clock;
    await turn(390, 844);
    await asleep('mid-match');
    await page.waitForTimeout(1200);
    const o = await state();
    if (o.running !== false) throw new Error('loop woke itself while the phone was still upright');
    if (o.clock !== before) throw new Error(`clock moved under the card (${before} → ${o.clock})`);
    rec.notes.push(`clock held at ${o.clock}`);
  });
  await step('mid-match-landscape', async (rec) => {
    const before = (await state()).clock;
    await turn(844, 390);
    await awake('mid-match');
    await page.waitForFunction((from) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== from;
    }, before);
    const o = await state();
    rec.notes.push(`clock ${before} → ${o.clock}, canvas ${o.canvas}`);
  });
  await step('parked', async (rec) => {
    await page.locator('[data-save-exit]').tap();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-hud');
    const o = await state();
    if (o.advance !== 'Resume match') throw new Error(`Advance Week reads "${o.advance}", not Resume match`);
    rec.notes.push('Advance Week reads Resume match');
  });
  await step('parked-portrait', async (rec) => {
    await turn(390, 844);
    await asleep('parked at the club');
    const o = await state();
    if (o.advance !== 'Resume match') throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push('still Resume match, loop asleep');
  });
  await step('parked-landscape', async (rec) => {
    await turn(844, 390);
    await awake('parked at the club');
    const o = await state();
    if (o.advance !== 'Resume match') throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push(`still Resume match, canvas ${o.canvas}`);
  });
  // Continue with a live-match record auto-starts the match. Opened upright, the
  // loop is already asleep, so the match may draw under the card (the same as a
  // phone turned upright mid-match) but its clock must not move until landscape.
  await step('reopen-portrait', async (rec) => {
    await turn(390, 844);
    await page.reload();
    await page.waitForSelector('[data-nrl-continue-1]');
    await press('[data-nrl-continue-1]');
    await asleep('reopened upright');
    await page.waitForSelector('.nrl-mo-controls').catch(() => {});
    const held = await state();
    await page.waitForTimeout(1200);
    const o = await state();
    if (o.running !== false || !o.started) throw new Error(`loop did not stay asleep (${JSON.stringify(o)})`);
    if (o.clock !== held.clock) throw new Error(`clock moved under the card (${held.clock} → ${o.clock})`);
    rec.notes.push(`loop asleep, clock held at ${o.clock || 'not shown'}`);
  });
  await step('reopen-landscape', async (rec) => {
    await turn(844, 390);
    await awake('reopened match');
    await page.waitForSelector('.nrl-mo-controls');
    const before = (await state()).clock;
    await page.waitForFunction((from) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== from;
    }, before);
    const o = await state();
    rec.notes.push(`clock ${before} → ${o.clock}, canvas ${o.canvas}`);
  });
  // The full chip set wraps past a fixed offset (level-2 stack, three-line speed
  // row). The ticker has to follow the measured chrome at each of those sizes.
  await step('chip-clearance', async (rec) => {
    await page.evaluate(() => {
      let calls = document.querySelector('.nrl-mo-calls');
      if (!calls) {
        calls = document.createElement('div');
        calls.className = 'nrl-mo-calls';
        document.getElementById('ui-root').append(calls);
      }
      const labels = ['Plan', 'Hit-up', 'Shift left', 'Shift right', 'Kick early', 'Run it', 'Bomb', 'Field goal', 'Rush', 'Hold'];
      calls.replaceChildren();
      for (const label of labels) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nrl-btn';
        b.textContent = label;
        if (label === 'Plan') b.setAttribute('data-plan', '');
        calls.append(b);
      }
    });
    await page.locator('.nrl-mo-log-toggle').evaluate((el) => el.click());
    await page.evaluate(() => {
      const feed = document.querySelector('.nrl-mo-feed');
      for (let i = 0; i < 80; i++) {
        const line = document.createElement('div');
        line.className = 'nrl-mo-line';
        line.textContent = `Layout regression commentary line ${i}`;
        feed.append(line);
      }
    });
    const problems = [];
    const sizes = [[360, 640], [390, 844], [667, 375], [844, 390]];
    for (const [w, h] of sizes) {
      await turn(w, h);
      let found = null;
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(50);
        found = await page.evaluate(() => {
          const ticker = document.querySelector('.nrl-mo-commentary')?.getBoundingClientRect();
          const log = document.querySelector('.nrl-mo-log-toggle')?.getBoundingClientRect();
          if (!ticker || ticker.width < 1) return { pending: true, problems: ['ticker not laid out'] };
          const hits = [];
          const overlap = (r) => {
            const w = Math.min(ticker.right, r.right) - Math.max(ticker.left, r.left);
            const h = Math.min(ticker.bottom, r.bottom) - Math.max(ticker.top, r.top);
            return w > 1 && h > 1;
          };
          for (const el of document.querySelectorAll('.nrl-mo-controls .nrl-btn, .nrl-mo-calls .nrl-btn, .nrl-audio-launcher .nrl-btn, .nrl-mo-log-toggle')) {
            const r = el.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) continue;
            if (overlap(r)) hits.push(el.textContent.trim() || el.getAttribute('aria-label') || 'button');
          }
          const score = document.querySelector('.nrl-mo-scoreboard')?.getBoundingClientRect();
          if (score && overlap(score)) hits.push('scoreboard');
          if (!log || log.width < 44 || log.height < 44) hits.push(`log icon ${Math.round(log?.width ?? 0)}×${Math.round(log?.height ?? 0)}`);
          const panel = document.querySelector('.nrl-mo-log')?.getBoundingClientRect();
          const feed = document.querySelector('.nrl-mo-feed');
          if (!panel || panel.height < 1) hits.push('open log not visible');
          else {
            if (score && panel.top < score.bottom - 1) hits.push(`open log behind scoreboard (${panel.top.toFixed(1)} < ${score.bottom.toFixed(1)})`);
            if (panel.bottom > ticker.top + 1) hits.push('open log overlaps ticker');
            if (panel.left < 0 || panel.right > innerWidth || panel.top < 0) hits.push('open log off screen');
            if (!feed || feed.clientHeight < 12 || feed.scrollHeight <= feed.clientHeight) hits.push(`open log not scrollable (${feed?.clientHeight}px, panel ${panel.height.toFixed(1)}px)`);
          }
          const chips = document.querySelectorAll('.nrl-mo-calls .nrl-btn').length;
          if (chips < 10) hits.push(`only ${chips} chips`);
          return { pending: hits.length > 0, problems: hits };
        });
        if (!found.pending) break;
      }
      await page.screenshot({ path: join(OUT, `open-log-${w}x${h}.png`) });
      if (found?.problems?.length) problems.push(`${w}×${h}: ${found.problems.join(', ')}`);
      else rec.notes.push(`${w}×${h} clear`);
    }
    await turn(844, 390);
    await page.locator('.nrl-mo-log-toggle').hover();
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.nrl-mo-log-toggle')).backgroundColor);
    if (bg !== 'rgb(255, 246, 194)') problems.push(`open log hover fill is ${bg}, want rgb(255, 246, 194)`);
    else rec.notes.push('open fill holds under hover');
    return problems;
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
  failed += await runPortrait(browser);
  await browser.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  stopServer();
}
log(failed ? `\n${failed} failure(s)` : '\nall WebKit layout checks passed');
process.exit(failed ? 1 : 0);
