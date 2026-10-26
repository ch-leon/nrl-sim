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
// Then the landscape screens (#336, #344, #347): every nav screen and the main
// popups at 844×390 with an iPhone 14's safe areas simulated and at 667×375 (see
// runScreens). --screens-only runs just those.
// Screenshots and report.json go to e2e-output/webkit/<WxH>/.
// Then one portrait boot (390×844): the loop must already be asleep, and turning
// to 844×390 must wake it with the canvas filling the screen. The same turn
// mid-match freezes the clock and resumes it, and a parked match stays paused
// until the phone is sideways, including after Continue reopens the page upright.
// With the match up, the full call-chip set (Plan through Hold) is laid in and the
// ticker is checked at 360×640, 390×844, 667×375 and 844×390: it has to sit clear
// of the speed row, the chips and the corner buttons. The open log must scroll
// fully between the scoreboard and ticker, and its icon keeps its hover fill.
// Both Bali choices must fit, retain 44px targets and accept taps at these same
// four sizes. Exits 1 on any failure.
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
  const GUIDE = ['.nrl-guide-modal', ['.nrl-guide-replay', '.nrl-guide-modal .nrl-screen-x', '.nrl-guide-tab']];
  await step('guide', async () => {
    await openNav(page, 'help');
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
  // and Renew / Sell / Release on screen; the nav stays whole and tappable.
  const PLAYER = ['.nrl-player-modal', ['.nrl-player-modal .nrl-screen-x', '[data-player-action="renew"]',
    '[data-player-action="sell"]', '[data-player-action="release"]']];
  await step('player-page', async () => {
    await tap('.nrl-nav .nrl-btn[data-screen="squad"]');
    await tap('.nrl-card-open .nrl-row-name');
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
        if (r.width < 1 || r.height < 1) continue; // a More-sheet row while the sheet is shut
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
    return reachProblems(page, '.nrl-player-modal', ['.nrl-player-modal .nrl-screen-x', '[data-player-action="sell"]']);
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
        // #345: News keeps its feed and shows the card as one row; Answer opens it in its own popup.
        await page.locator('.nrl-nav .nrl-btn[data-screen="news"]').tap();
        await page.waitForSelector('[data-decisions-open]');
        if (await page.locator('.nrl-news .nrl-event-card').count()) problems.push(`${w}×${h}: the decision card is in the News feed`);
        await page.locator('[data-decisions-open]').tap();
        await page.waitForSelector('.nrl-decisions-modal .nrl-event-card');
        await page.waitForTimeout(100);
        const found = await reachProblems(page, '.nrl-decisions-modal', ['[data-event-choice="0"]', '[data-event-choice="1"]', '.nrl-decisions-modal .nrl-screen-x']);
        found.push(...await page.evaluate(() => {
          const box = document.querySelector('.nrl-decisions-modal').getBoundingClientRect();
          const out = [...document.querySelectorAll('.nrl-event-choice')].flatMap((b) => {
            const r = b.getBoundingClientRect();
            const out = [];
            if (r.height < 44 || r.width < 44) out.push(`choice ${b.dataset.eventChoice} is ${r.width}×${r.height}`);
            if (r.top < box.top - 1 || r.bottom > box.bottom + 1) out.push(`choice ${b.dataset.eventChoice} clipped by the popup (${r.top.toFixed(1)}–${r.bottom.toFixed(1)} vs ${box.top.toFixed(1)}–${box.bottom.toFixed(1)})`);
            if (b.scrollHeight > b.clientHeight + 1) out.push(`choice ${b.dataset.eventChoice} clips its text`);
            return out;
          });
          // #346: "Let them go" says what is sure and, on its own line, what is risked.
          const go = document.querySelector('[data-event-choice="0"]');
          if (!/^Sure: squad morale \+6/.test(go?.querySelector('.nrl-event-choice-hint')?.textContent ?? '')) out.push('Let them go has no "Sure:" line');
          if (!/% risk: a 2-3 week ban/.test(go?.querySelector('.nrl-event-choice-risk')?.textContent ?? '')) out.push('Let them go has no risk line');
          return out;
        }));
        problems.push(...found.map((p) => `${w}×${h}: ${p}`));
        await page.screenshot({ path: join(OUT, `bali-${w}x${h}-choice${choice}.png`) });
        await page.locator(`[data-event-choice="${choice}"]`).tap();
        await page.waitForTimeout(150);
        if (await page.locator('.nrl-event-card').count()) problems.push(`${w}×${h}: choice ${choice} did not resolve`);
        if (await page.evaluate(() => window.__nrlState().eventDeck.pending.length)) problems.push(`${w}×${h}: choice ${choice} left the card pending`);
        await page.locator('.nrl-screen-region .nrl-screen-x').first().tap();
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
    // Save & exit is in the pause sheet (#348 M3).
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-save-exit]').tap();
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
          if (!log || log.width < 44 || log.height < 44) hits.push(`Log button ${Math.round(log?.width ?? 0)}×${Math.round(log?.height ?? 0)}`);
          const panel = document.querySelector('.nrl-mo-log')?.getBoundingClientRect();
          const feed = document.querySelector('.nrl-mo-feed');
          if (!panel || panel.height < 1) hits.push('open log not visible');
          else {
            if (score && panel.top < score.bottom - 1) hits.push(`open log behind scoreboard (${panel.top.toFixed(1)} < ${score.bottom.toFixed(1)})`);
            // Open, the log takes the ticker's place on the left half (#348 M4).
            const lines = document.querySelector('.nrl-mo-ticker');
            if (lines && lines.getBoundingClientRect().height > 0) hits.push('the ticker still shows under the open log');
            if (ticker.right > innerWidth / 2 + 1) hits.push(`open log past the left half (${Math.round(ticker.right)} > ${innerWidth / 2})`);
            if (panel.left < 0 || panel.right > innerWidth || panel.top < 0) hits.push('open log off screen');
            if (!feed || feed.clientHeight < 12 || feed.scrollHeight <= feed.clientHeight) hits.push(`open log not scrollable (${feed?.clientHeight}px, panel ${panel.height.toFixed(1)}px)`);
            // A read, not the ticker's two lines again (#348 M4): four lines at least, even with every chip up.
            else if (feed.clientHeight < 60) hits.push(`open log only ${feed.clientHeight}px tall`);
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

// ── Landscape screens (#336, #344, #347, #343, #351) ─────────────────────────
// Every nav screen and the main popups on a phone held sideways. Each must show
// at least four whole rows of its list or one whole card, keep its ✕ and its
// primary action on screen and tappable, and stay out of the unsafe bands. The
// nav has at most five tabs with labels of 12px or more, and marks the open one.
// The toast lane (#339): a burst shows one toast at a time with a "+n" counter and
// each kind's colour, clear of the nav, the bar's buttons and the open screen; in a
// match it keeps off the open log, the scoreboard and every control.
// WebKit on Linux reports zero safe-area insets, so the iPhone's are simulated
// through the --nrl-safe-* properties the UI reads env() into (src/ui/dom.ts).
const SCREEN_RUNS = (process.env.E2E_SCREEN_SIZES ?? '844x390@47,0,47,21 667x375 956x330').split(/\s+/).filter(Boolean).map((s) => {
  const [size, insets] = s.split('@');
  const [w, h] = size.split('x').map(Number);
  const [l, t, r, b] = (insets ?? '0,0,0,0').split(',').map(Number);
  return { w, h, safe: { l, t, r, b } };
});

/** Screens reached from the nav: what shows its content, and what must stay on screen. */
const NAV_SCREENS = [
  { id: 'squad', box: '.nrl-screen-region', rows: '.nrl-screen-body > *' },
  { id: 'lineup', box: '.nrl-screen-region', rows: '.nrl-lineup-list > *', card: '.nrl-lineup-field', primary: ['[data-auto-pick]'] },
  { id: 'recruit', box: '.nrl-screen-region', rows: '.nrl-screen-body > *', primary: ['.nrl-screen-body > :first-child .nrl-row-action'] },
  { id: 'fixtures', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-fixture', card: '.nrl-next-match' },
  { id: 'ladder', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-ladder-table tbody tr' },
  { id: 'news', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-news-item, .nrl-news-empty', card: '.nrl-event-card' },
  { id: 'build', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-build-list > *', primary: ['.nrl-build-list > :first-child'] },
  { id: 'finance', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-finance-row', card: '.nrl-finance-panel' },
  { id: 'staff', box: '.nrl-screen-region', rows: '.nrl-staff-row', primary: ['.nrl-staff-row .nrl-btn'] },
  { id: 'contracts', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-contracts .nrl-finance-panel, .nrl-contracts p', card: '.nrl-contracts .nrl-finance-panel' },
  { id: 'history', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-history-row, .nrl-history p', card: '.nrl-history-list' },
  { id: 'help', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-guide-body :is(p, li, h3)', prose: '.nrl-guide-body', primary: ['.nrl-guide-replay'] },
];

/** Destinations that are a tab inside another screen: the screen, then the tab. */
const NAV_VIA = { ladder: ['fixtures', '.nrl-league-tabs [data-tab="ladder"]'] };

/** Tap a nav destination: its tab, or More and then its row in the sheet. */
async function openNav(page, id) {
  const direct = page.locator(`.nrl-nav .nrl-btn[data-screen="${id}"]`);
  if (await direct.count() && await direct.first().isVisible()) return direct.first().tap();
  if (NAV_VIA[id]) {
    await openNav(page, NAV_VIA[id][0]);
    return page.locator(NAV_VIA[id][1]).first().tap();
  }
  const more = page.locator('.nrl-nav [data-nav-more]');
  if (!(await more.count())) throw new Error(`no nav item for "${id}"`);
  await more.tap();
  await page.locator(`.nrl-nav-sheet [data-screen="${id}"]`).tap();
}

/**
 * What a landscape screen gets wrong: too little of its list or card on screen,
 * a ✕ / Close / primary action off screen or covered, or a control in the
 * simulated unsafe bands. Runs in the page.
 */
function screenProblems(page, spec, safe) {
  return page.evaluate(([spec, safe]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const box = document.querySelector(spec.box);
    if (!box) return [`${spec.box} not shown`];
    /** The part of the viewport `el` is not clipped out of by its scrolling ancestors. */
    const clip = (el) => {
      let t = 0, l = 0, b = H, r = W;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        // A display: contents wrapper (a short screen's two-column layouts) has no box to clip with.
        if (cs.display !== 'contents' && /(auto|scroll|hidden|clip)/.test(`${cs.overflowX} ${cs.overflowY}`)) {
          const ar = a.getBoundingClientRect();
          t = Math.max(t, ar.top); l = Math.max(l, ar.left); b = Math.min(b, ar.bottom); r = Math.min(r, ar.right);
        }
      }
      return { t, l, b, r };
    };
    const whole = (el) => {
      const rr = el.getBoundingClientRect();
      if (rr.width < 1 || rr.height < 1) return false;
      const c = clip(el);
      return rr.top >= c.t - 1 && rr.bottom <= c.b + 1 && rr.left >= c.l - 1 && rr.right <= c.r + 1;
    };
    const tappable = (el, what) => {
      const rr = el.getBoundingClientRect();
      if (!whole(el)) return `${what} off screen (${Math.round(rr.left)},${Math.round(rr.top)}–${Math.round(rr.right)},${Math.round(rr.bottom)})`;
      const hit = document.elementFromPoint((rr.left + rr.right) / 2, (rr.top + rr.bottom) / 2);
      if (!hit || !el.contains(hit)) return `${what} covered (a tap hits ${hit?.className || hit?.tagName})`;
      return null;
    };
    // Seen: whole, and not under something else (a sticky footer, a header) at its middle.
    const seen = (el) => {
      if (!whole(el)) return false;
      const rr = el.getBoundingClientRect();
      const hit = document.elementFromPoint((rr.left + rr.right) / 2, (rr.top + rr.bottom) / 2);
      return !!hit && (el.contains(hit) || hit.contains(el));
    };
    // Rows: four whole ones (or all of them when there are fewer), or one whole card.
    const rows = [...box.querySelectorAll(spec.rows)].filter((e) => e.getBoundingClientRect().height > 0);
    const shown = rows.filter(seen).length;
    const cards = spec.card ? [...box.querySelectorAll(spec.card)].filter(seen).length : 0;
    const need = Math.min(4, rows.length);
    // Prose (the Guide): its paragraphs run to any length, so count the lines of
    // text on show instead, eight being about four short paragraphs.
    let lines = 0;
    if (spec.prose) {
      const body = box.querySelector(spec.prose);
      const first = body?.querySelector('p, li');
      if (body && first) {
        const c = clip(first);
        const br = body.getBoundingClientRect();
        const cs = getComputedStyle(first);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        lines = Math.floor(Math.max(0, Math.min(br.bottom, c.b) - Math.max(br.top, c.t)) / lh);
      }
    }
    const content = `${shown}/${rows.length} rows whole${spec.card ? `, ${cards} whole card(s)` : ''}${spec.prose ? `, ${lines} lines of text` : ''}`;
    if (shown < need && cards < 1 && lines < 8) out.push(`only ${content}`);
    // Every close in the screen, and its primary action. A screen with one named
    // exit (the full-time report's Back to Club) has no ✕ of its own: that exit instead.
    const closes = [...box.querySelectorAll('button')].filter((b) => /^(✕|close)$/i.test(b.textContent.trim()) || b.getAttribute('aria-label') === 'Close');
    if (spec.exit) {
      if (closes.length) out.push(`a ✕ besides ${spec.exit} (one exit wanted)`);
      const exit = document.querySelector(spec.exit);
      if (!exit) out.push(`exit ${spec.exit} missing`);
      else { const p = tappable(exit, `exit ${spec.exit}`); if (p) out.push(p); }
    } else if (!closes.length) out.push('no close button');
    for (const c of closes) {
      const p = tappable(c, `close "${c.textContent.trim()}"`);
      if (p) out.push(p);
    }
    for (const sel of spec.primary ?? []) {
      const el = box.querySelector(sel);
      if (!el) { out.push(`primary ${sel} missing`); continue; }
      const p = tappable(el, `primary ${sel}`);
      if (p) out.push(p);
    }
    // The unsafe bands: no button of the screen or the nav, and no part of the screen, inside one.
    const inSafe = (rr) => rr.left >= safe.l - 1 && rr.right <= W - safe.r + 1 && rr.top >= safe.t - 1 && rr.bottom <= H - safe.b + 1;
    if (safe.l || safe.r || safe.t || safe.b) {
      const unsafe = [...document.querySelectorAll('.nrl-screen-region button, .nrl-nav button, .nrl-hud button, .nrl-screen-title, .nrl-screen-region h2')]
        .filter((e) => { const rr = e.getBoundingClientRect(); return rr.width > 0 && rr.height > 0 && whole(e) && !inSafe(rr); })
        .map((e) => (e.textContent.trim() || e.getAttribute('aria-label') || e.tagName).slice(0, 14));
      if (unsafe.length) out.push(`in the unsafe band: ${[...new Set(unsafe)].slice(0, 6).join(', ')}${unsafe.length > 6 ? '…' : ''}`);
    }
    return { problems: out, content };
  }, [spec, safe]);
}

/**
 * A view with no frame (the title): every control matching `sels` whole on screen
 * without scrolling, clear of the unsafe bands, 44px tall and taking a tap at its
 * middle; and no sideways scroll.
 */
function controlsProblems(page, sels, safe) {
  return page.evaluate(([sels, safe]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const wide = Math.max(document.documentElement.scrollWidth, document.querySelector('.nrl-title')?.scrollWidth ?? 0);
    if (wide > W + 1) out.push(`scrolls sideways (${wide}px wide)`);
    for (const sel of sels) {
      const els = [...document.querySelectorAll(sel)];
      if (!els.length) { out.push(`${sel} missing`); continue; }
      for (const e of els) {
        const r = e.getBoundingClientRect();
        const what = `${sel}${els.length > 1 ? ` "${e.getAttribute('aria-label') ?? e.textContent.trim()}"` : ''}`;
        if (r.left < safe.l - 1 || r.right > W - safe.r + 1 || r.top < safe.t - 1 || r.bottom > H - safe.b + 1) {
          out.push(`${what} off screen or in the unsafe band (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`);
          continue;
        }
        if (r.height < 43.5) out.push(`${what} ${Math.round(r.height)}px tall`);
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (!hit || !e.contains(hit)) out.push(`${what} covered (a tap hits ${hit?.className || hit?.tagName})`);
      }
    }
    return out;
  }, [sels, safe]);
}

/** The chrome: top bar and nav heights, nav tabs, label size and the open tab. */
function chromeReport(page, openId) {
  return page.evaluate((openId) => {
    const hud = document.querySelector('.nrl-hud')?.getBoundingClientRect();
    const nav = document.querySelector('.nrl-nav')?.getBoundingClientRect();
    const tabs = [...document.querySelectorAll('.nrl-nav > .nrl-btn, .nrl-nav-tabs > .nrl-btn')].filter((b) => b.getBoundingClientRect().width > 0);
    const out = [];
    if (tabs.length > 5) out.push(`${tabs.length} nav tabs (want 5 at most)`);
    const small = tabs.map((b) => {
      const label = b.querySelector('.nrl-nav-label') ?? b;
      return { t: b.textContent.trim(), px: parseFloat(getComputedStyle(label).fontSize) };
    }).filter((x) => x.px < 12);
    if (small.length) out.push(`nav labels under 12px: ${small.map((x) => `${x.t} ${x.px.toFixed(1)}px`).slice(0, 3).join(', ')}`);
    if (openId) {
      const cur = document.querySelector('.nrl-nav [aria-current="page"]');
      if (!cur) out.push('no nav tab marked as open (aria-current)');
      else {
        const ids = (cur.getAttribute('data-screen') ?? '') + ' ' + (cur.getAttribute('data-nav-holds') ?? '');
        if (!ids.split(/\s+/).includes(openId)) out.push(`the open tab is "${cur.textContent.trim()}", not ${openId}'s`);
      }
    }
    const note = `top bar ${Math.round(hud?.height ?? 0)}px, nav ${Math.round(nav?.height ?? 0)}px, ${tabs.length} tabs`;
    return { problems: out, note };
  }, openId);
}

/**
 * The toast lane (#339): what shows, and what the toast in view gets wrong. One
 * toast at a time; it must be inside the safe area, take a tap at its middle
 * (`tappable`), and touch none of `avoid` (selectors; every match is checked).
 */
function toastReport(page, avoid, safe, tappable = true) {
  return page.evaluate(([avoid, safe, tappable]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const lane = document.querySelector('.nrl-toast-lane');
    const all = [...document.querySelectorAll('.nrl-toast')];
    const shown = all.filter((t) => getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 0);
    if (shown.length > 1) out.push(`${shown.length} toasts on screen at once`);
    const t = shown[0];
    if (!t) return { problems: out, shown: 0, queued: all.length, text: '', kind: '', more: '', bg: '', lane: lane?.dataset.lane ?? '' };
    const r = t.getBoundingClientRect();
    if (r.left < safe.l - 1 || r.right > W - safe.r + 1 || r.top < safe.t - 1 || r.bottom > H - safe.b + 1) {
      out.push(`the toast is off screen or in the unsafe band (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`);
    }
    if (tappable) {
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!hit || !t.contains(hit)) out.push(`the toast is covered (a tap hits ${hit?.className || hit?.tagName})`);
    }
    const meets = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    for (const sel of avoid) {
      for (const e of document.querySelectorAll(sel)) {
        const er = e.getBoundingClientRect();
        if (er.width < 1 || er.height < 1 || getComputedStyle(e).visibility === 'hidden') continue;
        if (meets(r, er)) out.push(`the toast overlaps ${sel}`);
      }
    }
    const kind = [...t.classList].find((c) => /^nrl-toast-(info|success|danger)$/.test(c)) ?? '';
    return {
      problems: [...new Set(out)], shown: shown.length, queued: all.length - 1,
      text: t.querySelector('.nrl-toast-text')?.textContent ?? '', kind, more: t.querySelector('.nrl-toast-more')?.textContent ?? '',
      bg: getComputedStyle(t).backgroundColor, lane: lane?.dataset.lane ?? '',
    };
  }, [avoid, safe, tappable]);
}

/** What a toast must never touch at the club: the nav, the bar's buttons (the next-match chip too), an open screen or dialog. */
const CLUB_AVOID = ['.nrl-nav', '.nrl-hud-actions', '.nrl-hud-next', '.nrl-hud [data-hud="money"]', '.nrl-audio-launcher', '.nrl-screen-region .nrl-modal', '.nrl-screen-x', '.nrl-screen-head'];
/** …and in a match: the scoreboard, the stats, the ticker or open log, and every control. */
const MATCH_AVOID = ['.nrl-mo-scoreboard', '.nrl-mo-stats', '.nrl-mo-commentary', '.nrl-mo-log', '.nrl-mo-log-toggle', '.nrl-mo-controls', '.nrl-mo-calls', '.nrl-mo-replay', '.nrl-audio-launcher'];
/** The burst the check fires: a problem, a routine stop, good news, a confirmation. */
const TOAST_BURST = [
  { text: 'Kai Smith injured — out 3w', kind: 'danger' },
  { text: 'Stopped after 1 week: Decision needed: Homesick youngster.', kind: 'info' },
  { text: 'Signed Jack Taufa', kind: 'success' },
  { text: 'Advanced 4 weeks.', kind: 'info' },
];
const TOAST_BG = { 'nrl-toast-danger': 'rgb(176, 58, 46)', 'nrl-toast-info': 'rgb(232, 224, 200)', 'nrl-toast-success': 'rgb(46, 125, 50)' };

async function runScreens(browser, { w: W, h: H, safe }) {
  const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
  const OUT = join(OUT_ROOT, 'webkit', `screens-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, safe, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} screens ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const tap = (sel) => page.locator(sel).first().tap();
  const check = async (rec, spec, openId) => {
    await page.waitForTimeout(250);
    const s = await screenProblems(page, spec, safe);
    if (Array.isArray(s)) return s;
    const c = await chromeReport(page, openId);
    rec.notes.push(s.content, c.note);
    return [...s.problems, ...c.problems];
  };
  const closeAll = () => page.evaluate(() => {
    for (const b of document.querySelectorAll('.nrl-modal-backdrop:not(.nrl-screen-backdrop)')) b.remove();
  }).then(() => page.keyboard.press('Escape'));

  const setInsets = () => page.evaluate((s) => {
    const st = document.documentElement.style;
    st.setProperty('--nrl-safe-l', `${s.l}px`); st.setProperty('--nrl-safe-t', `${s.t}px`);
    st.setProperty('--nrl-safe-r', `${s.r}px`); st.setProperty('--nrl-safe-b', `${s.b}px`);
  }, safe);
  // The title (#350 T1, #347): a fresh install opens on the new club's setup, every
  // field and Start on screen with no scrolling, clear of the notch.
  await step('title-setup', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await setInsets();
    await page.waitForTimeout(250);
    return controlsProblems(page, ['[data-nrl-clubname]', '.nrl-title-swatch', '.nrl-title-pick', '[data-nrl-start]'], safe);
  });
  await step('hub', async (rec) => {
    await page.fill('[data-nrl-clubname]', 'Landscape FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-tutorial-skip');
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    const c = await chromeReport(page, null);
    rec.notes.push(c.note);
    return c.problems;
  });
  // The toast lane (#339): the install hint goes through it, clear of the screen's header;
  // a burst shows one toast at a time with a counter, each in its colour, a tap takes the
  // next, and none touches the nav, the bar's buttons or the open screen and its ✕.
  await step('toast-lane', async (rec) => {
    const out = [];
    await page.waitForSelector('.nrl-toast', { timeout: 5000 }).catch(() => {});
    await openNav(page, 'news');
    await page.waitForSelector('.nrl-screen-region .nrl-modal');
    await page.waitForTimeout(250);
    const hint = await toastReport(page, CLUB_AVOID, safe);
    if (!/Add to Home Screen/.test(hint.text)) out.push(`the install hint is not in the lane (it shows "${hint.text}")`);
    else if (hint.lane !== 'hud') out.push(`the install hint is in the ${hint.lane} lane, not the top bar's`);
    out.push(...hint.problems.map((p) => `install hint: ${p}`));
    // Clear whatever is queued, then the burst.
    for (let i = 0; i < 10 && (await page.locator('.nrl-toast').count()); i++) await page.locator('.nrl-toast').first().tap();
    await page.evaluate((burst) => { for (const n of burst) window.__nrlNotify(n); }, TOAST_BURST);
    await page.waitForTimeout(250);
    const seen = [];
    for (let i = 0; i < TOAST_BURST.length; i++) {
      const want = TOAST_BURST[i];
      const r = await toastReport(page, CLUB_AVOID, safe);
      seen.push(`${r.kind.replace('nrl-toast-', '')}${r.more ? ` ${r.more}` : ''}`);
      if (i === 0) await page.screenshot({ path: join(OUT, 'toast-burst.png') });
      out.push(...r.problems);
      if (r.text !== want.text) out.push(`toast ${i + 1} reads "${r.text}", want "${want.text}"`);
      if (r.kind !== `nrl-toast-${want.kind}`) out.push(`toast ${i + 1} ("${want.text}") is ${r.kind || 'unclassed'}, want nrl-toast-${want.kind}`);
      if (r.bg !== TOAST_BG[`nrl-toast-${want.kind}`]) out.push(`toast ${i + 1} is ${r.bg}, want ${TOAST_BG[`nrl-toast-${want.kind}`]} for ${want.kind}`);
      const more = TOAST_BURST.length - 1 - i;
      if (r.more !== (more ? `+${more}` : '')) out.push(`toast ${i + 1}'s counter reads "${r.more}", want "${more ? `+${more}` : ''}"`);
      if (r.lane !== 'hud') out.push(`toast ${i + 1} is in the ${r.lane} lane, not the top bar's`);
      if (i < TOAST_BURST.length - 1) {
        await page.locator('.nrl-toast').first().tap();
        await page.waitForTimeout(200);
      }
    }
    // The last one goes by itself.
    const gone = await page.waitForFunction(() => !document.querySelector('.nrl-toast'), null, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!gone) out.push('the last toast did not go by itself');
    if (await page.evaluate(() => !document.querySelector('.nrl-toast-lane')?.hidden)) out.push('the empty lane is still shown');
    rec.notes.push(`shown in turn: ${seen.join(', ')}`);
    await page.locator('.nrl-screen-region .nrl-screen-x').first().tap();
    return out;
  });
  // The More sheet: every row whole, tappable, 44px tall, 12px labels, clear of the unsafe bands.
  await step('nav-more', async (rec) => {
    await tap('.nrl-nav [data-nav-more]');
    await page.waitForSelector('.nrl-nav-sheet:not([hidden])');
    await page.waitForTimeout(250);
    const out = await page.evaluate((safe) => {
      const W = innerWidth, H = innerHeight;
      const problems = [];
      if (document.querySelector('.nrl-nav [data-nav-more]')?.getAttribute('aria-expanded') !== 'true') problems.push('More is not aria-expanded');
      const items = [...document.querySelectorAll('.nrl-nav-sheet .nrl-btn')];
      for (const b of items) {
        const r = b.getBoundingClientRect();
        const t = b.textContent.trim();
        if (r.left < safe.l - 1 || r.right > W - safe.r + 1 || r.top < safe.t - 1 || r.bottom > H - safe.b + 1) problems.push(`${t} off screen or in the unsafe band`);
        if (r.height < 44) problems.push(`${t} ${Math.round(r.height)}px tall`);
        if (parseFloat(getComputedStyle(b).fontSize) < 12) problems.push(`${t} label under 12px`);
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (!hit || !b.contains(hit)) problems.push(`${t} covered`);
      }
      return { problems, note: `${items.length} rows: ${items.map((b) => b.textContent.trim()).join(', ')}` };
    }, safe);
    rec.notes.push(out.note);
    return out.problems;
  });
  await page.keyboard.press('Escape');
  for (const spec of NAV_SCREENS) {
    await step(`screen-${spec.id}`, async (rec) => {
      await openNav(page, spec.id);
      await page.waitForSelector(spec.box);
      return check(rec, spec, spec.id);
    });
  }
  // Popups: the player page, the kit designer, a rival's squad, a decision card.
  await step('popup-player', async (rec) => {
    await openNav(page, 'squad');
    await tap('.nrl-screen-region [data-player-open] .nrl-row-name');
    await page.waitForSelector('[data-player-page]');
    return check(rec, { box: '.nrl-player-modal', rows: '.nrl-player-stats .nrl-statrow', card: '.nrl-player-stats',
      primary: ['[data-player-action="renew"]', '[data-player-action="sell"]', '[data-player-action="release"]'] }, null);
  });
  await step('popup-kit', async (rec) => {
    await page.locator('.nrl-player-modal .nrl-screen-x').tap().catch(() => {});
    await openNav(page, 'squad');
    await tap('.nrl-squad-kit');
    await page.waitForSelector('.nrl-kit-modal');
    return check(rec, { box: '.nrl-kit-modal', rows: '.nrl-kit-preview', card: '.nrl-kit-preview', primary: ['.nrl-kit-save'] }, null);
  });
  await step('popup-rival-squad', async (rec) => {
    await openNav(page, 'ladder');
    await tap('.nrl-ladder-table .nrl-ladder-club');
    await page.waitForSelector('.nrl-rival-modal');
    return check(rec, { box: '.nrl-rival-modal', rows: '.nrl-rival-row' }, null);
  });
  // Settings (#349 E1): behind the gear, every switch whole; Import asks on its own row first.
  await step('popup-settings', async (rec) => {
    await closeAll();
    await tap('.nrl-audio-gear');
    await page.waitForSelector('.nrl-settings-modal');
    const out = await check(rec, { box: '.nrl-settings-modal', rows: '.nrl-audio-row', primary: ['.nrl-rivals-toggle .nrl-switch', '.nrl-settings-import .nrl-btn'] }, null);
    await tap('.nrl-settings-import .nrl-btn');
    await page.waitForSelector('.nrl-settings-ask');
    const cancel = '.nrl-settings-import .nrl-btn:not(.nrl-settings-import-go)';
    out.push(...(await check(rec, { box: '.nrl-settings-modal', rows: '.nrl-audio-row', primary: ['.nrl-settings-import-go', cancel] }, null))
      .map((p) => `import asking: ${p}`));
    await page.screenshot({ path: join(OUT, 'settings-import-ask.png') });
    await tap(cancel);
    if (await page.locator('.nrl-settings-ask').count()) out.push('Cancel left the import question up');
    await page.locator('.nrl-settings-modal .nrl-screen-x').tap();
    return out;
  });
  // #345: a waiting card is one row on News, which keeps its feed; Answer opens the card.
  await step('news-decision-banner', async (rec) => {
    await closeAll();
    if (!(await page.evaluate(() => window.__nrlShowCard?.('baliTrip')))) throw new Error('card hook failed');
    await openNav(page, 'news');
    await page.waitForSelector('[data-decisions-open]');
    const out = await check(rec, { box: '.nrl-screen-region .nrl-modal', rows: '.nrl-news-item, .nrl-news-empty', primary: ['[data-decisions-open]'] }, 'news');
    if (await page.locator('.nrl-news .nrl-event-card').count()) out.push('the decision card is in the News feed');
    return out;
  });
  await step('popup-decision-card', async (rec) => {
    await tap('[data-decisions-open]');
    await page.waitForSelector('.nrl-decisions-modal .nrl-event-card');
    return check(rec, { box: '.nrl-decisions-modal', rows: '.nrl-event-choice', card: '.nrl-event-card',
      primary: ['[data-event-choice="0"]', '[data-event-choice="1"]'] }, null);
  });
  // #338: with a card waiting, Advance Week asks: it lists the card and takes no default.
  // #350 H1: the button wears the count, and the hub names the next match.
  await step('advance-asks', async (rec) => {
    await tap('.nrl-decisions-modal .nrl-screen-x');
    await page.evaluate(() => document.querySelector('.nrl-screen-region .nrl-screen-x')?.click());
    const before = await page.evaluate(() => { const s = window.__nrlState(); return { week: s.week, pending: s.eventDeck.pending.map((p) => p.id) }; });
    if (!before.pending.length) throw new Error('no card waiting to ask about');
    const out = [];
    const badge = (await page.locator('[data-hud="decisions"]').textContent().catch(() => ''))?.trim();
    if (badge !== String(before.pending.length)) out.push(`Advance Week's badge reads "${badge}", want ${before.pending.length}`);
    const chip = page.locator('[data-hud="next"]');
    if (!(await chip.isVisible())) out.push('no next-match chip on the hub');
    else rec.notes.push(`chip "${(await chip.textContent()).trim()}"`);
    await page.locator('.nrl-hud .nrl-btn', { hasText: 'Advance Week' }).first().tap();
    await page.waitForSelector('[data-advance-ask]');
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => { const s = window.__nrlState(); return { week: s.week, pending: s.eventDeck.pending.map((p) => p.id) }; });
    if (after.week !== before.week) out.push(`the week moved on (W${before.week} → W${after.week}) before the ask was answered`);
    if (after.pending.join() !== before.pending.join()) out.push(`a default was taken without asking (${before.pending} → ${after.pending})`);
    if (await page.locator('.nrl-mo-controls').count()) out.push('the match started without asking');
    const rows = await page.locator('[data-ask-row]').count();
    if (rows !== before.pending.length) out.push(`the ask lists ${rows} of ${before.pending.length} cards`);
    out.push(...await check(rec, { box: '.nrl-decisions-modal', rows: '.nrl-ask-row', primary: ['[data-ask-answer]', '[data-ask-proceed]'] }, null));
    return out;
  });
  // Answer now: the card, then Keep advancing (#350 N4) once it is answered.
  await step('advance-answer-keep', async (rec) => {
    await tap('[data-ask-answer]');
    await page.waitForSelector('.nrl-decisions-modal .nrl-event-card');
    await tap('[data-event-choice="1"]');
    await page.waitForSelector('[data-keep-advancing]');
    const out = await check(rec, { box: '.nrl-decisions-modal', rows: '[data-keep-advancing]', primary: ['[data-keep-advancing]'] }, null);
    const s = await page.evaluate(() => window.__nrlState().eventDeck.pending.length);
    if (s) out.push(`${s} card(s) still pending after answering`);
    return out;
  });
  // The ▾ menu's long runs confirm first (#350 H3); Cancel plays nothing.
  await step('advance-long-confirm', async (rec) => {
    await closeAll();
    await page.keyboard.press('Escape');
    const week = await page.evaluate(() => window.__nrlState().week);
    await tap('.nrl-hud-menu-toggle');
    await page.locator('.nrl-hud-menu-item', { hasText: 'To season end' }).tap();
    await page.waitForSelector('[data-advance-confirm]');
    const q = (await page.locator('[data-advance-confirm] h2').textContent()).trim();
    rec.notes.push(`"${q}"`);
    const out = await check(rec, { box: '.nrl-decisions-modal', rows: '[data-confirm-advance]', primary: ['[data-confirm-advance]'] }, null);
    if (!/^Play \d+ weeks\? It stops for decisions\.$/.test(q)) out.push(`the confirm asks "${q}"`);
    await page.locator('[data-advance-confirm] .nrl-btn', { hasText: 'Cancel' }).tap();
    await page.waitForTimeout(400);
    if (await page.evaluate(() => !!document.querySelector('.nrl-hud[data-advancing]'))) out.push('Cancel started the run');
    if ((await page.evaluate(() => window.__nrlState().week)) !== week) out.push('Cancel moved the week');
    return out;
  });
  // The match's cards (#341, #348): the half-time card, the pause sheet and the calls list
  // each hold the match with every action on screen and uncovered, and the Replay try
  // chip hides under them and comes back after.
  await step('match-cards', async (rec) => {
    await page.locator('.nrl-hud .nrl-btn', { hasText: 'Advance Week' }).first().tap();
    await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
    const out = [];
    // The ticker is never a blank strip: "Kick-off soon…" until the first line (#339).
    const ticker = await page.evaluate(() => document.querySelector('.nrl-mo-ticker .nrl-mo-line:last-child')?.textContent?.trim() ?? '');
    if (!ticker) out.push('the ticker is empty at kick-off');
    else rec.notes.push(`ticker at kick-off: "${ticker.slice(0, 24)}"`);
    await page.waitForFunction(() => window.__nrlGame?.scene.getScene('Match')?.playback, null, { timeout: 30000 });
    const clock = () => page.locator('.nrl-mo-clock').textContent().then((t) => t?.trim());
    /** The clock moves on from `from` (the match is playing, not held). */
    const runs = (from) => page.waitForFunction((f) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== f;
    }, from, { timeout: 15000 });
    await runs('00:00');
    /** Each selector whose centre does not take a tap, with why. */
    const blocked = (sels) => page.evaluate((list) => list.flatMap((sel) => {
      const b = document.querySelector(sel);
      if (!b) return [`${sel} missing`];
      const r = b.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) return [`${sel} ${Math.round(r.width)}×${Math.round(r.height)}`];
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) return [`${sel} off screen`];
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return at === b || b.contains(at) ? [] : [`${sel} covered by ${at?.className || at?.tagName}`];
    }), sels);
    const replayShows = () => page.evaluate(() => {
      const b = document.querySelector('.nrl-mo-replay');
      return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0;
    });
    // A try's offer, then the half-time card over it (the scene's own calls, as the playback makes them).
    await page.evaluate(() => {
      const sc = window.__nrlGame.scene.getScene('Match');
      sc.overlay.offerReplay(() => {});
      sc.openPlanCard('Half-time', ['Landscape FC 4 – 0 Rivals', 'Legs 80% / 78%', 'Calls paid off – / –']);
    });
    if (!(await page.locator('.nrl-mo-plan').count())) return ['no plan card (no plan side in this match)'];
    const at = await clock();
    await page.waitForTimeout(6000);
    if (!(await page.locator('.nrl-mo-plan').count())) out.push('the half-time card closed by itself');
    if ((await clock()) !== at) out.push(`the clock ran under the half-time card (${at} → ${await clock()})`);
    if (await replayShows()) out.push('the Replay chip shows over the half-time card');
    out.push(...await blocked(['.nrl-mo-plan .nrl-mo-plan-go', '.nrl-mo-plan [data-tactic="expansive"]']));
    await page.screenshot({ path: join(OUT, 'half-time-card.png') });
    await page.locator('.nrl-mo-plan .nrl-mo-plan-go').tap();
    await page.waitForSelector('.nrl-mo-plan', { state: 'detached', timeout: 3000 });
    if (!(await replayShows())) out.push('the Replay chip did not come back after the card');
    else out.push(...await blocked(['.nrl-mo-replay']));
    if (!(await runs(at).then(() => true).catch(() => false))) out.push('the match did not go on after Continue');
    // The pause sheet: Resume, Skip to full time and Save & exit, the match held.
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.waitForSelector('.nrl-mo-sheet');
    const paused = await clock();
    await page.waitForTimeout(1500);
    if ((await clock()) !== paused) out.push(`the clock ran under the pause sheet (${paused} → ${await clock()})`);
    if (await replayShows()) out.push('the Replay chip shows over the pause sheet');
    out.push(...await blocked(['.nrl-mo-sheet .nrl-btn:first-of-type', '.nrl-mo-sheet [data-skip]', '.nrl-mo-sheet [data-save-exit]', '.nrl-mo-sheet .nrl-mo-sheet-x']));
    await page.screenshot({ path: join(OUT, 'pause-sheet.png') });
    await page.locator('.nrl-mo-sheet .nrl-btn', { hasText: 'Resume' }).tap();
    await page.waitForSelector('.nrl-mo-sheet', { state: 'detached', timeout: 3000 });
    if (!(await runs(paused).then(() => true).catch(() => false))) out.push('the match did not go on after Resume');
    // The calls list behind "?".
    if (await page.locator('.nrl-mo-calls [data-calls-help]').count()) {
      await page.locator('.nrl-mo-calls [data-calls-help]').tap();
      await page.waitForSelector('.nrl-mo-sheet');
      const rows = await page.locator('.nrl-mo-call-help b').count();
      if (rows < 9) out.push(`the calls list has ${rows} calls`);
      out.push(...await blocked(['.nrl-mo-sheet .nrl-mo-sheet-actions .nrl-btn']));
      await page.screenshot({ path: join(OUT, 'calls-help.png') });
      await page.locator('.nrl-mo-sheet .nrl-mo-sheet-actions .nrl-btn').tap();
      await page.waitForSelector('.nrl-mo-sheet', { state: 'detached', timeout: 3000 });
    } else out.push('no "?" on the calls row');
    rec.notes.push(`card held at ${at}; sheet held at ${paused}`);
    return out;
  });
  // A match toast with the log open (#339): under the scoreboard, clear of the log, the
  // scoreboard, the stats and every control; a club toast fired with it waits for the club;
  // and the lane gives way to the Replay try chip.
  await step('match-toast', async (rec) => {
    const out = [];
    if ((await page.locator('.nrl-mo-log-toggle').getAttribute('aria-expanded')) !== 'true') await page.locator('.nrl-mo-log-toggle').tap();
    await page.waitForTimeout(300);
    // A try just scored puts up the Replay try chip, and the lane waits it out; let it go first.
    await page.waitForFunction(() => !document.querySelector('.nrl-mo-replay:not([hidden])'), null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => {
      window.__nrlNotify({ text: 'Sponsor news for the club', kind: 'info' });
      window.__nrlNotify({ text: 'Kai Smith comes in for the injured Jack Taufa at fullback.', kind: 'info', match: true });
    });
    // A score banner holds the lane; wait for the row to be free.
    const up = await page.waitForFunction(() => {
      const t = document.querySelector('.nrl-toast');
      return !!t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 0;
    }, null, { timeout: 12000 }).then(() => true).catch(() => false);
    if (!up) return ['the match toast never showed'];
    const r = await toastReport(page, MATCH_AVOID, { l: 0, t: 0, r: 0, b: 0 }, false);
    await page.screenshot({ path: join(OUT, 'match-toast-log-open.png') });
    out.push(...r.problems);
    if (!/comes in for/.test(r.text)) out.push(`the toast in view is "${r.text}", not the match's`);
    if (r.more) out.push(`a club toast is queued in the match (counter "${r.more}")`);
    if (r.lane !== 'match') out.push(`the toast is in the ${r.lane} lane in a match`);
    rec.notes.push(`"${r.text.slice(0, 24)}…" in the ${r.lane} lane`);
    // The Replay try chip takes the row: the lane steps aside until it goes.
    await page.evaluate(() => window.__nrlGame.scene.getScene('Match').overlay.offerReplay(() => {}));
    await page.waitForTimeout(400);
    const both = await page.evaluate(() => ({
      chip: !!document.querySelector('.nrl-mo-replay:not([hidden])'),
      lane: !document.querySelector('.nrl-toast-lane')?.hidden,
    }));
    if (both.chip && both.lane) out.push('the toast shows beside the Replay try chip');
    await page.locator('.nrl-mo-log-toggle').tap();
    return out;
  });
  // The full-time report (#351 P0, P2): the result and Player of the Match on screen,
  // Back to Club its one exit, and the plan changes folded into one line.
  await step('popup-fulltime-report', async (rec) => {
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-skip]').tap();
    await page.waitForSelector('.nrl-report', { timeout: 60000 });
    const out = await check(rec, { box: '.nrl-report-modal', rows: '.nrl-report-score, .nrl-report-potm', card: '.nrl-report-head', exit: '.nrl-match-back' }, null);
    if (!(await page.locator('.nrl-report-result').count())) out.push('no WIN / LOSS / DRAW headline');
    if (await page.locator('.nrl-report > .nrl-report-change').count()) out.push('plan changes shown as loose lines, not folded');
    out.push(...await page.evaluate(() => {
      const potm = document.querySelector('.nrl-report-potm');
      if (!potm) return [];
      const r = potm.getBoundingClientRect();
      const card = document.querySelector('.nrl-report-modal').getBoundingClientRect();
      return r.bottom <= card.bottom + 1 && r.top >= card.top - 1 ? [] : ['Player of the Match below the fold'];
    }));
    return out;
  });
  // The title with a saved club (#350 T1, T2): a card per slot, Continue on screen;
  // New game on a slot in use asks before Start replaces it, and Cancel keeps it.
  await step('title-slots', async (rec) => {
    await page.reload();
    await page.waitForSelector('[data-nrl-continue-1]');
    await setInsets();
    await page.waitForTimeout(250);
    rec.notes.push((await page.locator('[data-nrl-slot-label-1]').textContent()) ?? '');
    return controlsProblems(page, ['[data-nrl-continue-1]', '[data-nrl-new-1]', '[data-nrl-delete-1]', '[data-nrl-new-2]', '[data-nrl-import]'], safe);
  });
  await step('title-overwrite-confirm', async () => {
    await tap('[data-nrl-new-1]');
    await page.waitForSelector('[data-nrl-start]');
    await tap('[data-nrl-start]');
    await page.waitForSelector('[data-nrl-confirm]');
    await page.waitForTimeout(200);
    const out = await controlsProblems(page, ['[data-nrl-back]', '[data-nrl-start-confirm]', '[data-nrl-start-cancel]'], safe);
    await tap('[data-nrl-start-cancel]');
    if (await page.locator('[data-nrl-confirm]').count()) out.push('Cancel left the overwrite question up');
    await tap('[data-nrl-back]');
    await page.waitForSelector('[data-nrl-continue-1]');
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

// ── The tutorial, followed (#344, #337) ──────────────────────────────────────
// Every step done the way the bubble says, never skipped: the paddock placed on
// the grass, a player signed, Squad and Lineup, then Advance Week into the first
// match, played to full time with no tutorial over it, and back to the club for
// News, Finance, Contracts and the wrap. Each step opens its own screen; each
// control it points at must be whole, out from under the bubble, and take the tap.
const NO_INSETS = { l: 0, t: 0, r: 0, b: 0 };
const WALK_RUNS = [{ w: 667, h: 375, safe: NO_INSETS }, { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 } }, { w: 956, h: 330, safe: NO_INSETS }];

async function runTutorialWalk(browser, { w: W, h: H, safe }) {
  const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
  const OUT = join(OUT_ROOT, 'webkit', `tutorial-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, safe, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  let n = 0;
  let stop = false;
  const step = async (name, fn) => {
    if (stop) return;
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} tutorial ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
    if (!rec.ok) stop = true; // the steps after this one start from where it left off
  };
  /** The step's target (the first on show, with `text` if given): whole on screen, clear of the bubble, and the one a tap at its middle hits. Then tap it. */
  const tapTarget = async (sel, rec, text = '') => {
    await page.waitForSelector(sel, { state: 'visible' });
    await page.waitForTimeout(700); // the tutorial's anchor poll (500 ms) moves the bubble
    const problem = await page.evaluate(([sel, text]) => {
      const t = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0 && e.textContent.includes(text));
      if (!t) return `no ${sel} ${text}`;
      const r = t.getBoundingClientRect();
      const b = document.querySelector('.nrl-tutorial-bubble')?.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return `${sel} off screen`;
      if (b && !(b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom)) return `the bubble covers ${sel}`;
      const c = document.querySelector('.nrl-tutorial-cutout')?.getBoundingClientRect();
      if (!c || r.left < c.left || r.right > c.right || r.top < c.top || r.bottom > c.bottom) return `the highlight is not round ${sel}`;
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return hit && t.contains(hit) ? null : `${sel}: a tap hits ${hit?.className || hit?.tagName}`;
    }, [sel, text]);
    if (problem) return [problem];
    rec.notes.push(`${text || sel} clear`);
    await page.locator(`${sel} >> visible=true`).filter({ hasText: text }).first().tap();
    return [];
  };
  const atStep = (id) => page.waitForSelector(`.nrl-tutorial-bubble[data-step="${id}"]`);

  await step('welcome', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    if (safe.l || safe.t || safe.r || safe.b) {
      await page.evaluate((s) => {
        const st = document.documentElement.style;
        st.setProperty('--nrl-safe-l', `${s.l}px`); st.setProperty('--nrl-safe-t', `${s.t}px`);
        st.setProperty('--nrl-safe-r', `${s.r}px`); st.setProperty('--nrl-safe-b', `${s.b}px`);
      }, safe);
    }
    await page.fill('[data-nrl-clubname]', 'Tutorial FC');
    await page.locator('[data-nrl-start]').tap();
    await atStep('welcome');
    await page.locator('.nrl-tutorial-next').tap();
    await atStep('build');
  });
  /** The bubble's step: it opened its own screen (#337 U3), and nothing of the tutorial dims the page (U2). */
  const onItsScreen = (key) => page.evaluate((key) => {
    const out = [];
    if (key && !document.querySelector(`[data-screen-key="${key}"]`)) out.push(`the step did not open ${key}`);
    const cut = document.querySelector('.nrl-tutorial-cutout');
    if (cut && /9999px/.test(getComputedStyle(cut).boxShadow)) out.push('the tutorial dims the page');
    return out;
  }, key);
  /** No tutorial on screen: no bubble, frame or overlay box that draws. */
  const tutorialHidden = () => page.evaluate(() => {
    const o = document.querySelector('.nrl-tutorial');
    if (!o) return true;
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    return ![...o.querySelectorAll('.nrl-tutorial-bubble, .nrl-tutorial-cutout')].some(vis);
  });
  const next = async (id) => {
    await page.locator(`.nrl-tutorial-bubble[data-step="${id}"] .nrl-tutorial-next`).tap();
  };

  // Build: the step opens Build itself and frames the Training Paddock row.
  await step('build-paddock', async (rec) => {
    const out = await onItsScreen('build');
    out.push(...await tapTarget('[data-screen-key="build"] [data-facility="trainingPaddock"]', rec));
    return out;
  });
  // Placement: the grass is not dimmed and the bubble leaves the placement bar clear.
  await step('place-on-grass', async (rec) => {
    await page.waitForSelector('.nrl-placebar:not([hidden])');
    await atStep('place');
    await page.waitForTimeout(700);
    const out = await onItsScreen(null);
    const text = (await page.locator('.nrl-tutorial-bubble .nrl-tutorial-text').textContent()).trim();
    if (!/green spot on the grass/.test(text)) out.push(`placement copy reads "${text}"`);
    out.push(...await page.evaluate(() => {
      const bar = document.querySelector('.nrl-placebar').getBoundingClientRect();
      const b = document.querySelector('.nrl-tutorial-bubble').getBoundingClientRect();
      return b.right <= bar.left || b.left >= bar.right || b.bottom <= bar.top || b.top >= bar.bottom ? [] : ['the bubble covers the placement bar'];
    }));
    await page.touchscreen.tap(Math.round(W / 2), Math.round(H / 2) + 10);
    await atStep('recruit');
    rec.notes.push('paddock placed');
    return out;
  });
  // Recruit: opened by the step, the first free agent's row framed and clear of the bubble.
  await step('recruit-sign', async (rec) => {
    await page.waitForSelector('[data-screen-key="recruit"]');
    const out = await onItsScreen('recruit');
    out.push(...await tapTarget('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)', rec));
    if (out.length) return out;
    await atStep('squad');
    rec.notes.push('signed: on to the squad step');
    return out;
  });
  await step('squad', async () => {
    await page.waitForTimeout(300);
    const out = await onItsScreen('squad');
    out.push(...await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-next', '.nrl-tutorial-skip']));
    await next('squad');
    await atStep('lineup');
    return out;
  });
  await step('lineup', async () => {
    await page.waitForTimeout(300);
    const out = await onItsScreen('lineup');
    out.push(...await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-next', '.nrl-tutorial-skip']));
    await next('lineup');
    await atStep('advance');
    return out;
  });
  // Advance Week: framed and clear; tapping it starts the first match, and the
  // tutorial is gone before the match draws and stays gone until Back to Club (#337 U1).
  await step('advance-to-match', async (rec) => {
    const out = await tapTarget('.nrl-hud-actions > .nrl-btn', rec, 'Advance Week');
    if (out.length) return out;
    await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
    if (!(await tutorialHidden())) out.push('the tutorial is up as the match starts');
    return out;
  });
  await step('match-plays-clear', async (rec) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(500);
      if (!(await tutorialHidden())) { out.push(`the tutorial showed over the match after ${(i + 1) * 0.5}s`); break; }
    }
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    rec.notes.push(`clock ${clock}, no tutorial over the match`);
    return out;
  });
  await step('match-full-time', async (rec) => {
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-skip]').tap();
    await page.waitForSelector('.nrl-btn:has-text("Back to Club")', { timeout: 60000 });
    await page.waitForTimeout(700);
    const out = (await tutorialHidden()) ? [] : ['the tutorial showed over the full-time screen'];
    rec.notes.push('match played to full time (the match\'s Skip, not the tutorial\'s)');
    return out;
  });
  // Back at the club the tutorial picks up on News, with the screen open.
  await step('back-to-club-news', async (rec) => {
    await page.locator('.nrl-btn:has-text("Back to Club")').first().evaluate((b) => b.click());
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-hud');
    await atStep('news').catch(async () => { throw new Error(`no News step after the match (step ${await page.locator('.nrl-tutorial-bubble').getAttribute('data-step').catch(() => 'none')})`); });
    await page.waitForTimeout(700);
    const out = await onItsScreen('news');
    out.push(...await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-next', '.nrl-tutorial-skip']));
    rec.notes.push(`week ${await page.evaluate(() => window.__nrlState().week)}`);
    await next('news');
    return out;
  });
  for (const id of ['finance', 'contracts']) {
    await step(id, async () => {
      await atStep(id);
      await page.waitForTimeout(700);
      const out = await onItsScreen(id);
      out.push(...await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-next', '.nrl-tutorial-skip']));
      await next(id);
      return out;
    });
  }
  await step('wrap-done', async (rec) => {
    await atStep('wrap');
    const out = await reachProblems(page, '.nrl-tutorial-bubble', ['.nrl-tutorial-next']);
    await next('wrap');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    if (!(await page.evaluate(() => window.__nrlState().settings.tutorialDone))) out.push('tutorialDone not set at the end');
    rec.notes.push('every step followed, none skipped');
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

const SCREENS_ONLY = argv.includes('--screens-only');
let failed = 0;
try {
  await startServer();
  const browser = await webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {});
  if (!SCREENS_ONLY) {
    for (const [W, H] of SIZES) failed += await runSize(browser, W, H);
    failed += await runPortrait(browser);
  }
  for (const run of WALK_RUNS) failed += await runTutorialWalk(browser, run);
  for (const run of SCREEN_RUNS) failed += await runScreens(browser, run);
  await browser.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  stopServer();
}
log(failed ? `\n${failed} failure(s)` : '\nall WebKit layout checks passed');
process.exit(failed ? 1 : 0);
