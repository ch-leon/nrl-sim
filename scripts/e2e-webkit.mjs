// scripts/e2e-webkit.mjs — Safari-shaped checks: long DOM panels (#206, #203) and
// a phone that opens already upright (#315).
// Builds the game, serves it with `vite preview`, and in Playwright's WebKit as an
// iPhone (touch, DPR 3, iOS user agent). Landscape at 956×330 (16 Pro Max with
// Safari's address bar and tab strip) and 844×390 checks:
//   - the page pins text-size-adjust to 100% (iOS Safari's landscape text boost off);
//   - at the authored text size, every tutorial step's copy fits its bubble unscrolled (#208);
//   - the first guided tap's bubble (#370) sits inside the viewport with Skip on
//     screen and tappable; Skip works;
//   - the same with every font in the bubble boosted 2.17× (what Safari's boost did
//     on Leon's phone, issue #206; WebKit on Linux never boosts by itself): the copy
//     scrolls inside the bubble and Skip / Next stay reachable;
//   - the Guide boosted the same way: the page scrolls, Replay and the dock's CLUB
//     (a sheet's way out) reachable, and Replay brings the tutorial back with Skip
//     and Next on screen;
//   - the player page (#203) above the dock: ◂ SQUAD, Renew / Sell / Release
//     tappable, the dock's tabs uncovered; ◂ SQUAD goes back to Squad.
// Then the landscape screens (#336, #344, #347): every nav screen and the main
// popups at 844×390 with an iPhone 14's safe areas simulated and at 667×375 (see
// runScreens). --screens-only runs just those.
// Then the dock at Normal, Large and Larger text (#344, see runDockTextSize) at those
// three sizes, 568×320, and 375×667 and 320×568 with a mouse (two rows there): nothing
// overlapping or off screen, no label clipped, 44px tabs and PLAY WEEK, the open tab
// marked by its fill and a bar that reads in greyscale, and each tab's spoken name with
// its alert.
// Screenshots and report.json go to e2e-output/webkit/<WxH>/.
// Then one portrait boot (390×844): the menus work upright (#350), so it opens on the
// Club home sheet with no rotate card and the loop already asleep, and turning to
// 844×390 must wake it with the canvas filling the screen. The same turn mid-match
// freezes the clock under the rotate card and resumes it; a match parked at the club
// is Club home upright (no card, the loop asleep, Resume match kept), and the live
// match Continue reopens upright stays paused under the card until the phone is sideways.
// With the match up, the coach tray is filled with the most it shows (#396: six
// calls in five rows), which must not scroll, and the commentary checked: the line (log = line) clear of the bottom row and the
// score bug at 360×640, 390×844, 667×375 and 844×390; the full log (log = full) clear
// of them and of the open tray, and scrolling, at 667×375 and 844×390; and the LOG
// switch keeps its fill under hover. The full tray is checked once more, alone, at 956×330.
// Both Bali choices must fit, retain 44px targets and accept taps at these same
// four sizes. Last, the ladder's form column after five rounds at every text size (#426,
// see runLadderForm). Exits 1 on any failure.
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
import { webkit, chromium } from 'playwright-core';

/**
 * The weekly summary card (#368) opens after each advance once the club is back.
 * This probe measures other screens, so every page closes the card as it opens.
 */
function closeWeekSummary() {
  new MutationObserver(() => {
    document.querySelector('[data-week-summary] [data-summary-close]')?.click();
  }).observe(document, { childList: true, subtree: true });
}

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

/**
 * Whether the copy in `sel` is all readable: it fits its box unscrolled, or it
 * scrolls inside it. The dock (Broadcast Quiet) gives the bubble more room than
 * the old nav did, so boosted welcome copy can fit whole at 844×390; what #206
 * guards against is copy cut off with no way to reach it.
 */
function fitsOrScrolls(page, sel) {
  return page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return false;
    const oy = getComputedStyle(e).overflowY;
    return e.scrollHeight <= e.clientHeight + 1 || oy === 'auto' || oy === 'scroll';
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
  await ctx.addInitScript(closeWeekSummary);
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
  // #370: a new game's first tap is anchored and offers Skip; a replay also offers Next.
  const TUT = ['.nrl-tutorial-bubble', ['.nrl-tutorial-skip']];
  const REPLAY = ['.nrl-tutorial-bubble', ['.nrl-tutorial-skip', '.nrl-tutorial-next']];

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.fill('[data-nrl-clubname]', 'Safari FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
    await page.waitForTimeout(700);
    // WebKit on Linux has no text autosizer and drops the property from computed
    // style, so read what the page's own <style> asks for.
    const adjust = await page.evaluate(() =>
      [...document.querySelectorAll('style')].some((st) => /html\s*\{[^}]*-webkit-text-size-adjust:\s*100%/.test(st.textContent ?? '')));
    return adjust ? [] : ['the page does not set html { -webkit-text-size-adjust: 100% }'];
  });
  await step('tutorial-first-tap', () => reachProblems(page, ...TUT));
  // #208: at the authored text size every step's copy fits without scrolling. Each
  // step's text is put in the first tap's bubble in turn (one rule sizes them all here).
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
    if (!(await fitsOrScrolls(page, '.nrl-tutorial-text'))) out.push('the copy is cut off and does not scroll inside the bubble');
    return out;
  });
  await step('tutorial-skipped', async () => {
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
  });
  // A sheet has no ✕ (Broadcast Quiet): its way out is the dock's CLUB.
  const GUIDE = ['.nrl-guide-modal', ['.nrl-guide-replay', '.nrl-nav [data-nav-home]', '.nrl-guide-tab']];
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
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
    await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    const out = await reachProblems(page, ...REPLAY);
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    return out;
  });
  // #203: the player page (Squad → a player) sits above the dock (there is no top bar
  // any more), with ◂ SQUAD (it has no ✕) and Renew / Sell / Release on screen; the
  // dock's tabs stay whole and tappable.
  const PLAYER = ['.nrl-player-modal', ['.nrl-player-modal [data-back]', '[data-player-action="renew"]',
    '[data-player-action="sell"]', '[data-player-action="release"]']];
  await step('player-page', async () => {
    await tap('.nrl-nav .nrl-btn[data-screen="squad"]');
    await tap('.nrl-card-open .nrl-row-name');
    await page.waitForSelector('[data-player-page]');
    await page.waitForTimeout(300);
    const out = await reachProblems(page, ...PLAYER);
    out.push(...await page.evaluate(() => {
      const box = document.querySelector('.nrl-player-modal').getBoundingClientRect();
      const dock = document.querySelector('.nrl-dock').getBoundingClientRect();
      const problems = box.bottom > dock.top + 1 ? [`the player page runs into the dock (${Math.round(box.bottom)} > ${Math.round(dock.top)})`] : [];
      if (box.top < -1) problems.push(`the player page runs off the top (${Math.round(box.top)})`);
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
    return reachProblems(page, '.nrl-player-modal', ['.nrl-player-modal [data-back]', '[data-player-action="sell"]']);
  });
  await step('player-page-closed', async () => {
    await tap('.nrl-player-modal [data-back]');
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
  await ctx.addInitScript(closeWeekSummary);
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
      // PLAY WEEK's words, less the decisions count beside them.
      advance: (() => {
        const l = document.querySelector('.nrl-dock-advance-label')?.cloneNode(true);
        l?.querySelector('.nrl-hud-alert')?.remove();
        return l?.textContent?.trim() ?? '';
      })(),
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
  // #350: upright on a menu the loop sleeps with no rotate card: Club home, or a new game's tour,
  // which opens on Build (#370).
  const asleepOnMenu = (label, menu = '[data-club-home]') => page.waitForFunction((menu) => {
    const loop = window.__nrlGame?.loop;
    const card = document.querySelector('.nrl-rotate');
    return !!loop?.started && loop.running === false && !!document.querySelector(menu)
      && !!card && getComputedStyle(card).display === 'none';
  }, menu, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: not on ${menu} with the loop asleep and no rotate card (${JSON.stringify(await state())})`);
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
  /** PLAY WEEK's label (uppercase in the DOM) while a match is parked. */
  const RESUME = 'RESUME MATCH ▸';

  await step('portrait-boot', async (rec) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await press('[data-nrl-start]');
    await page.waitForSelector('.nrl-dock');
    await asleepOnMenu('opened upright', '[data-club-home], [data-screen-key="build"]');
    const o = await state();
    if (!o.coarse) throw new Error('WebKit did not report a coarse pointer, so this is not a phone');
    rec.notes.push(`a menu (the tour's Build), no card, loop asleep, canvas ${o.canvas} in ${o.viewport}`);
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
    // The tour's first step opened Build (#370); back to the grounds, where the decisions chip shows.
    await page.keyboard.press('Escape');
    await page.waitForSelector('.nrl-screen-region', { state: 'detached', timeout: 5000 }).catch(() => {});
    if (await page.locator('.nrl-screen-region').count()) throw new Error('Build stayed open after the tour was skipped');
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
        // 3a: the decisions chip on the grounds; its REVIEW opens the card in its own popup. Upright
        // (#350) home is Club home, whose decisions row opens it. (The card's News row is checked
        // sideways in runScreens' news-decision-banner.)
        const review = w < h ? '.nrl-club-home-alert' : '[data-decisions-chip]:not([hidden]) .nrl-decisions-review';
        await page.waitForSelector(review);
        await page.locator(review).tap();
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
        // The decisions dialog's ✕ if it is still up.
        if (await page.locator('.nrl-decisions-modal .nrl-screen-x').count()) await page.locator('.nrl-decisions-modal .nrl-screen-x').tap();
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
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
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
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`PLAY WEEK reads "${o.advance}", not ${RESUME}`);
    rec.notes.push(`PLAY WEEK reads ${RESUME}`);
  });
  await step('parked-portrait', async (rec) => {
    await turn(390, 844);
    await asleepOnMenu('parked at the club');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push(`Club home, still ${RESUME}, loop asleep`);
  });
  await step('parked-landscape', async (rec) => {
    await turn(844, 390);
    await awake('parked at the club');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push(`still ${RESUME}, canvas ${o.canvas}`);
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
  // The coach calls were a row of chips that wrapped past a fixed offset; since Broadcast
  // Quiet they are a tray over the COACH button (3o) listing the calls legal now. The
  // tray is filled with the most it shows (#396: six, Shift as a pair) and must not
  // scroll, the log given 80 lines, and at each size: the
  // commentary line (log = line, tray shut) clear of the bottom row and the score bug;
  // then the full log (log = full, tray open) clear of the score bug, the bottom row and
  // the tray, scrolling, at least four lines tall (sideways only). The LOG switch keeps its fill under hover.
  await step('chip-clearance', async (rec) => {
    await page.evaluate(() => {
      const sc = window.__nrlGame.scene.getScene('Match');
      // Hold the tray's rows still: the scene rebuilds them with the play a few times a second.
      sc.refreshCallChips = () => {};
      sc.toggleTray(true);
      const list = document.querySelector('.nrl-mo-tray-list');
      const tile = ([id, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nrl-btn nrl-mo-tray-call';
        b.setAttribute('data-call', id);
        const name = document.createElement('b');
        name.textContent = label;
        const what = document.createElement('span');
        what.textContent = 'What the call does, in plain words';
        b.append(name, what);
        return b;
      };
      const pair = document.createElement('div');
      pair.className = 'nrl-mo-tray-pair';
      pair.append(tile(['shiftLeft', 'Shift left']), tile(['shiftRight', 'Shift right']));
      list.replaceChildren(tile(['hitUp', 'Hit-up']), pair, tile(['offload', 'Offload']), tile(['kickEarly', 'Kick early']), tile(['freshLegs', 'Fresh legs']));
      document.querySelector('.nrl-mo-tray-foot').textContent = 'Run it, Bomb, Grubber, 40/20 from tackle 4 · Field goal when in range · Take the two, Tap and go at Coach’s Office level 2, more above';
      sc.toggleTray(false);
      const feed = document.querySelector('.nrl-mo-feed');
      for (let i = 0; i < 80; i++) {
        const line = document.createElement('div');
        line.className = 'nrl-mo-line';
        line.textContent = `Layout regression commentary line ${i}`;
        feed.append(line);
      }
    });
    /** Problems with the commentary in `mode` ('line' or 'full'), measured in the page. */
    const measure = (mode) => page.evaluate((mode) => {
      const overlay = document.querySelector('.nrl-match-overlay');
      const box = (sel) => { const e = document.querySelector(sel); const r = e?.getBoundingClientRect(); return r && r.width > 0 && r.height > 0 ? r : null; };
      const meets = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const hits = [];
      if (overlay?.dataset.log !== mode) return { pending: true, problems: [`log is ${overlay?.dataset.log}, want ${mode}`] };
      const what = box(mode === 'full' ? '.nrl-mo-full' : '.nrl-mo-strip');
      if (!what) return { pending: true, problems: [`the ${mode === 'full' ? 'full log' : 'commentary line'} is not laid out`] };
      if (what.left < 0 || what.top < 0 || what.right > innerWidth || what.bottom > innerHeight) hits.push(`${mode === 'full' ? 'full log' : 'line'} off screen`);
      for (const el of document.querySelectorAll('.nrl-mo-bar .nrl-btn, .nrl-mo-bar [data-coach], .nrl-mo-log-toggle')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (meets(what, r)) hits.push(el.getAttribute('aria-label') || el.textContent.trim() || 'button');
      }
      const score = box('.nrl-mo-scoreboard');
      if (score && meets(what, score)) hits.push('score bug');
      const log = box('.nrl-mo-log-toggle');
      if (!log || log.width < 44 || log.height < 44) hits.push(`LOG switch ${Math.round(log?.width ?? 0)}×${Math.round(log?.height ?? 0)}`);
      if (mode === 'full') {
        const tray = box('.nrl-mo-calls');
        if (!tray) hits.push('the coach tray is not open');
        else if (meets(what, tray)) hits.push(`the coach tray (${Math.round(tray.right)} > ${Math.round(what.left)})`);
        const feed = document.querySelector('.nrl-mo-feed');
        if (!feed || feed.clientHeight < 12 || feed.scrollHeight <= feed.clientHeight) hits.push(`full log not scrollable (${feed?.clientHeight}px, panel ${what.height.toFixed(1)}px)`);
        else if (feed.clientHeight < 60) hits.push(`full log only ${feed.clientHeight}px tall`);
        const rows = document.querySelectorAll('.nrl-mo-calls [data-call]').length;
        if (rows < 6) hits.push(`only ${rows} calls in the tray`);
        const t = document.querySelector('.nrl-mo-calls');
        if (t.scrollHeight > t.clientHeight + 1) hits.push(`the coach tray scrolls (${t.scrollHeight} > ${t.clientHeight}px)`);
      }
      return { pending: hits.length > 0, problems: hits };
    }, mode);
    const setMode = async (mode) => {
      const sc = () => page.evaluate((open) => window.__nrlGame.scene.getScene('Match').toggleTray(open), mode === 'full');
      if (mode === 'full') {
        if (await page.locator('.nrl-match-overlay[data-log="hidden"]').count()) await page.locator('.nrl-mo-log-toggle').evaluate((el) => el.click());
        if (await page.locator('.nrl-match-overlay[data-log="line"]').count()) await page.locator('.nrl-mo-strip').evaluate((el) => el.click());
      } else if (await page.locator('.nrl-match-overlay[data-log="full"]').count()) await page.locator('.nrl-mo-full-x').evaluate((el) => el.click());
      else if (await page.locator('.nrl-match-overlay[data-log="hidden"]').count()) await page.locator('.nrl-mo-log-toggle').evaluate((el) => el.click());
      await sc();
    };
    const problems = [];
    // The full log is a fixed 330px right panel (3m), drawn for a phone held sideways; upright the
    // rotate card covers the match, so it is checked at the landscape sizes only.
    const sizes = { line: [[360, 640], [390, 844], [667, 375], [844, 390]], full: [[667, 375], [844, 390]] };
    for (const mode of ['line', 'full']) {
      await setMode(mode);
      for (const [w, h] of sizes[mode]) {
        await turn(w, h);
        let found = null;
        for (let i = 0; i < 12; i++) {
          await page.waitForTimeout(50);
          found = await measure(mode);
          if (!found.pending) break;
        }
        await page.screenshot({ path: join(OUT, `log-${mode}-${w}x${h}.png`) });
        if (found?.problems?.length) problems.push(`${mode} ${w}×${h}: ${found.problems.join(', ')}`);
        else rec.notes.push(`${mode} ${w}×${h} clear`);
      }
    }
    // The tray at its fullest on the shortest phone (#396): 956×330 lays it three a line and
    // it must not scroll either (the full log is not checked here: its four lines are for 375+).
    for (const [w, h] of [[956, 330]]) {
      await turn(w, h);
      await page.waitForTimeout(300);
      const tray = await page.evaluate(() => {
        const t = document.querySelector('.nrl-mo-calls');
        const r = t?.getBoundingClientRect();
        if (!t || !r || r.height < 1) return ['the coach tray is not open'];
        const out = [];
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) out.push('the coach tray is off screen');
        if (t.scrollHeight > t.clientHeight + 1) out.push(`the coach tray scrolls (${t.scrollHeight} > ${t.clientHeight}px)`);
        const rows = [...t.querySelectorAll('[data-call]')];
        if (rows.length < 6) out.push(`only ${rows.length} calls in the tray`);
        for (const b of rows) {
          const q = b.getBoundingClientRect();
          if (q.height < 44) out.push(`call ${b.dataset.call} is ${Math.round(q.height)}px tall`);
          const at = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2);
          if (!(at && b.contains(at))) out.push(`call ${b.dataset.call} covered by ${at?.className || at?.tagName}`);
        }
        return out;
      });
      await page.screenshot({ path: join(OUT, `tray-full-${w}x${h}.png`) });
      if (tray.length) problems.push(`tray ${w}×${h}: ${tray.join(', ')}`);
      else rec.notes.push(`tray ${w}×${h} clear`);
    }
    await turn(844, 390);
    await setMode('line');
    await page.locator('.nrl-mo-log-toggle').hover();
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.nrl-mo-log-toggle .nrl-mo-switch')).backgroundColor);
    if (bg !== 'rgb(244, 208, 63)') problems.push(`the LOG switch's on fill is ${bg} under hover, want rgb(244, 208, 63)`);
    else rec.notes.push('LOG switch keeps its fill under hover');
    return problems;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

// ── Portrait menus (#350 P1) ─────────────────────────────────────────────────
/**
 * Problems with what is on screen under `root` upright (#350): the page scrolling
 * sideways; text cut off, ellipsised or line-clamped where nothing scrolls to it;
 * and every tappable control under `root` and in the dock that is whole on screen
 * not 44×44 to a finger (a ::after hit area counts: the points 21.5px out from its
 * middle must reach it too), not what a tap at its middle hits, or in an unsafe band.
 */
function portraitFitProblems(page, root, safe) {
  return page.evaluate(([rootSel, safe]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.className || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24);
    if (document.documentElement.scrollWidth > W + 1) out.push(`the page scrolls sideways (${document.documentElement.scrollWidth}px)`);
    const roots = [...document.querySelectorAll(rootSel)].filter((r) => r.getBoundingClientRect().width > 0);
    if (!roots.length) return [`${rootSel} not shown`];
    const shown = (e) => {
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const cs = getComputedStyle(e);
      return cs.visibility !== 'hidden' && cs.opacity !== '0';
    };
    /** The box `e` is clipped to by its ancestors, and whether one of them scrolls sideways. */
    const clip = (e) => {
      let t = 0, l = 0, b = H, r = W, sx = false;
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.display === 'contents' || !/(auto|scroll|hidden|clip)/.test(`${cs.overflowX} ${cs.overflowY}`)) continue;
        const ar = a.getBoundingClientRect();
        t = Math.max(t, ar.top); l = Math.max(l, ar.left); b = Math.min(b, ar.bottom); r = Math.min(r, ar.right);
        if (/(auto|scroll)/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) sx = true;
      }
      return { t, l, b, r, sx };
    };
    for (const root of roots) {
      const rr = root.getBoundingClientRect();
      if (rr.left < -1 || rr.right > W + 1 || rr.top < -1 || rr.bottom > H + 1) out.push(`${rootSel} outside the ${W}×${H} viewport`);
      for (const e of root.querySelectorAll('*')) {
        if (!shown(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.push(`"${name(e)}" ellipsised`);
        else if (/(hidden|clip)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) out.push(`"${name(e)}" clipped`);
        if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 1) out.push(`"${name(e)}" cut to ${cs.webkitLineClamp} lines`);
        const c = clip(e);
        if (!c.sx && r.width < W && (r.right > c.r + 1 || r.left < c.l - 1)) out.push(`"${name(e)}" cut off at the side`);
      }
    }
    const seen = new Set();
    const sel = 'button, a[href], input:not([type="hidden"]), select, [role="button"], [role="menuitem"]';
    for (const root of [...roots, ...document.querySelectorAll('.nrl-dock')]) {
      for (const e of root.querySelectorAll(sel)) {
        if (seen.has(e) || !shown(e)) continue;
        seen.add(e);
        const r = e.getBoundingClientRect();
        const c = clip(e);
        if (r.top < c.t - 1 || r.bottom > c.b + 1 || r.left < c.l - 1 || r.right > c.r + 1) continue; // scrolled out of its box
        if (r.top < safe.t - 1 || r.bottom > H - safe.b + 1) out.push(`"${name(e)}" in the unsafe band`);
        const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        // A toast passing over a control is gone in a few seconds and goes on a tap (#339's checks are its own).
        const hits = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (e.contains(h) || !!h.closest('.nrl-toast-lane')); };
        if (!hits(cx, cy)) { const h = document.elementFromPoint(cx, cy); out.push(`"${name(e)}" covered (a tap hits ${h?.className || h?.tagName})`); continue; }
        if (/^(checkbox|radio|range)$/.test(e.type)) continue;
        const wide = r.width >= 43.5 || (hits(cx - 21.5, cy) && hits(cx + 21.5, cy));
        const tall = r.height >= 43.5 || (hits(cx, cy - 21.5) && hits(cx, cy + 21.5));
        if (!wide || !tall) out.push(`"${name(e)}" is ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return [...new Set(out)];
  }, [root, safe]);
}

/**
 * The bottom bar upright (#350): five tabs in one row inside the safe area, 44px
 * tall with whole labels; money, week and PLAY WEEK in one row over them (nothing
 * wrapping further); `marked` (a dock id) carrying aria-current, its fill and the
 * bar under its label, and no other tab.
 */
function portraitDockProblems(page, marked, safe) {
  return page.evaluate(([marked, safe]) => {
    const H = innerHeight, W = innerWidth;
    const out = [];
    const tabs = [...document.querySelectorAll('.nrl-nav > .nrl-btn')];
    if (tabs.length !== 5) out.push(`${tabs.length} tabs, not 5`);
    const tops = new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top)));
    if (tops.size !== 1) out.push(`the tabs are on ${tops.size} rows`);
    for (const t of tabs) {
      const r = t.getBoundingClientRect();
      const label = t.querySelector('.nrl-nav-label');
      const what = t.getAttribute('data-label') ?? t.textContent.trim();
      if (r.height < 43.5 || r.width < 43.5) out.push(`${what} tab ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.left < -1 || r.right > W + 1 || r.bottom > H - safe.b + 1) out.push(`${what} tab off screen or under the home indicator`);
      if (label && label.scrollWidth > label.clientWidth + 1) out.push(`${what} label cut (${label.scrollWidth} > ${label.clientWidth})`);
      const on = t.getAttribute('aria-current') === 'page';
      const want = t.getAttribute('data-screen') === marked;
      if (on !== want) out.push(`${what} ${on ? 'marked' : 'not marked'}`);
      if (marked === null && t.hasAttribute('data-nav-more') && t.getAttribute('aria-expanded') !== 'true') out.push('OFFICE not shown open over its tiles');
      if (on) {
        const bar = getComputedStyle(label, '::after');
        if (bar.content === 'none' || parseFloat(bar.height) < 3) out.push(`${what} has no bar under its label`);
      }
    }
    // The row over the tabs: what shows of money, week and PLAY WEEK sits on one line.
    const row = [...document.querySelectorAll('.nrl-dock-statusbox, .nrl-dock-play-group')].filter((e) => e.getBoundingClientRect().height > 0);
    const tabTop = Math.min(...tabs.map((t) => t.getBoundingClientRect().top));
    for (const e of row) {
      const r = e.getBoundingClientRect();
      if (r.bottom > tabTop + 1) out.push(`${e.className} is not above the tabs`);
    }
    if (new Set(row.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2))).size > 1) out.push('money, week and PLAY WEEK are not on one row');
    if (row.length === 2 && row[0].getBoundingClientRect().right > row[1].getBoundingClientRect().left + 1) out.push('PLAY WEEK runs over the money');
    for (const e of row) if (e.scrollWidth > e.clientWidth + 1) out.push(`${e.className} cut short`);
    // Club home shows the money and week itself: PLAY WEEK takes the row.
    const group = document.querySelector('.nrl-dock-play-group')?.getBoundingClientRect();
    const bar = document.querySelector('.nrl-dock-tabs')?.getBoundingClientRect();
    if (document.querySelector('[data-club-home]') && group && bar && group.width < bar.width - 2) out.push(`PLAY WEEK ${Math.round(group.width)}px of the ${Math.round(bar.width)}px row on Club home`);
    const advance = document.querySelector('.nrl-dock [data-hud="advance"]')?.getBoundingClientRect();
    if (!advance || advance.height < 43.5) out.push(`PLAY WEEK ${advance ? Math.round(advance.height) : 0}px tall`);
    return out;
  }, [marked, safe]);
}

/** The sizes upright (#350): an SE, an 8, a 14 and a 16 Pro Max, the notch and home indicator simulated on the last two. */
const PORTRAIT_RUNS = [
  { w: 320, h: 568, dpr: 2, safe: { t: 20, b: 0 } },
  { w: 375, h: 667, dpr: 2, safe: { t: 20, b: 0 } },
  { w: 390, h: 844, dpr: 3, safe: { t: 47, b: 34 }, match: true },
  { w: 430, h: 932, dpr: 3, safe: { t: 59, b: 34 } },
].filter((r) => !process.env.E2E_PORTRAIT || process.env.E2E_PORTRAIT.split(/\s+/).includes(`${r.w}x${r.h}`));
const TEXT_SIZES = { normal: null, large: 1.15, larger: 1.3 };
/**
 * Every menu upright, how it is reached and what the dock marks for it. `root` is
 * what the fit probe measures (a sheet, Office's tiles or a dialog).
 */
const PORTRAIT_MENUS = [
  { id: 'club', mark: 'club', root: '[data-club-home]' },
  { id: 'squad', mark: 'squad' },
  { id: 'lineup', mark: 'squad', via: '.nrl-sq-tabs [data-seg="lineup"]' },
  { id: 'recruit', mark: 'squad', via: '.nrl-sq-tabs [data-seg="recruit"]' },
  { id: 'player', mark: 'squad', from: 'squad', via: '.nrl-grid-body > .nrl-row .nrl-row-name', root: '.nrl-player-modal' }, // the name: a trait chip says what it does instead
  { id: 'fixtures', mark: 'fixtures' },
  { id: 'build', mark: 'build' },
  { id: 'office', mark: null, root: '.nrl-nav-sheet' }, // OFFICE is aria-expanded, no tab current
  { id: 'finance', mark: 'office' },
  { id: 'contracts', mark: 'office', from: 'finance', via: '[data-finance-contracts]' },
  { id: 'staff', mark: 'office' },
  { id: 'news', mark: 'office' },
  { id: 'history', mark: 'office' },
  { id: 'kit', mark: 'office', optional: true },
  { id: 'help', mark: 'office', wait: '.nrl-guide-body' },
  { id: 'settings', mark: 'club', root: '.nrl-modal-backdrop:not(.nrl-screen-backdrop)' }, // a dialog over home, as sideways
];

/**
 * #350 P1, Leon's Option B: on a phone held upright the menus work with the five
 * tabs along the bottom, and the rotate card covers only the live match and the
 * grounds. At 320×568, 375×667, 390×844 and 430×932 (WebKit as an iPhone): the title
 * fits; then every tab, every Office tile and the sheets inside them at Normal,
 * Large and Larger (switched in place, one context a size) fit (portraitFitProblems),
 * with the dock whole and the open tab marked (portraitDockProblems), and no rotate
 * card. At Normal: See the grounds brings the card up over a sleeping loop and ◂ Back
 * takes it down; a tile from Build goes into placement under the card, which turns
 * to the placement bar sideways, and Cancel then upright is Club home again. At
 * 390×844, a watched match: kicked off upright under the card with the clock held,
 * running sideways, held under the card again when turned upright mid-match, and
 * at full time the report readable upright, its Back to Club landing on Club home.
 * Last, a reload upright: the slots fit at the three text sizes, and Continue resumes
 * the save onto Club home.
 */
async function runPortraitMenus(browser) {
  let failed = 0;
  const started = Date.now();
  for (const run of PORTRAIT_RUNS) {
    const { w: W, h: H, safe } = run;
    const tag = `${W}x${H}`;
    const OUT = join(OUT_ROOT, 'webkit', `portrait-menus-${tag}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const report = { size: tag, safe, steps: [], errors: [] };
    // Reduced motion: the sheets come up without their 180ms rise, so each of the ~200 opens
    // is measured at once (the CI job's 20 minutes are close to full).
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: run.dpr, hasTouch: true, isMobile: true, userAgent: IPHONE_UA, reducedMotion: 'reduce',
    });
    await ctx.addInitScript(closeWeekSummary);
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
      log(`${rec.ok ? 'ok ' : 'FAIL'} portrait ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
    };
    const press = (sel) => page.locator(sel).first().tap();
    const turn = (w, h) => page.setViewportSize({ width: w, height: h });
    /** Settings › Text size's effect on <html> (src/ui/textSize.ts), set in place: the save is not touched. */
    const textSize = (t) => page.evaluate(([t, k]) => {
      const root = document.documentElement;
      if (k) { root.style.setProperty('--nrl-text-scale', String(k)); root.setAttribute('data-text-size', t); }
      else { root.style.removeProperty('--nrl-text-scale'); root.removeAttribute('data-text-size'); }
    }, [t, TEXT_SIZES[t]]);
    const view = () => page.evaluate(() => {
      const card = document.querySelector('.nrl-rotate');
      return {
        card: !!card && getComputedStyle(card).display !== 'none',
        back: !!document.querySelector('[data-rotate-back]:not([hidden])'),
        running: window.__nrlGame?.loop.running ?? null,
        home: !!document.querySelector('[data-club-home]'),
        placing: !!document.querySelector('.nrl-placebar:not([hidden])'),
        clock: document.querySelector('.nrl-mo-clock')?.textContent?.trim() ?? '',
      };
    });
    /** Upright on a menu: no card. */
    const cardDown = async (where) => ((await view()).card ? [`the rotate card is up on ${where}`] : []);
    const home = async () => {
      await page.keyboard.press('Escape');
      // A dialog's way out: its ✕, or the player page's ◂ back.
      const exit = '.nrl-modal-backdrop:not(.nrl-screen-backdrop) :is(.nrl-screen-x, [data-back])';
      if (await page.locator(exit).count()) await press(exit);
      if (await page.locator('.nrl-nav-sheet:not([hidden])').count()) await press('.nrl-nav [data-nav-more]');
      await press('.nrl-nav [data-nav-home]');
      await page.waitForSelector('[data-club-home]');
    };
    const open = async (m) => {
      await home();
      if (m.id === 'club') return;
      if (m.from) await openNav(page, m.from);
      else if (m.via) await openNav(page, 'squad');
      if (m.via) await press(m.via);
      else if (m.id === 'office') await press('.nrl-nav [data-nav-more]');
      else if (!m.from) await openNav(page, m.id);
      if (m.wait) await page.waitForSelector(m.wait);
      await page.waitForTimeout(50); // a frame for the sheet's layout (no rise: reduced motion)
    };

    await step('title', async (rec) => {
      await page.goto(BASE);
      await page.evaluate((s) => {
        for (const k of ['t', 'b']) document.documentElement.style.setProperty(`--nrl-safe-${k}`, `${s[k]}px`);
      }, safe);
      await page.waitForSelector('[data-nrl-start]');
      const out = [];
      for (const t of Object.keys(TEXT_SIZES)) {
        await textSize(t);
        out.push(...(await portraitFitProblems(page, '.nrl-title', safe)).map((p) => `${t}: ${p}`));
      }
      out.push(...await cardDown('the title'));
      await textSize('normal');
      rec.notes.push('new-game setup at three text sizes');
      return out;
    });
    await step('club-home', async (rec) => {
      await page.fill('[data-nrl-clubname]', 'Upright FC');
      await press('[data-nrl-start]');
      await press('.nrl-tutorial-skip');
      await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
      // A decision waiting: PLAY WEEK carries its count, the dock's widest row (and Club home its row).
      if (!(await page.evaluate(() => window.__nrlShowCard?.('baliTrip')))) throw new Error('Bali hook failed');
      await home();
      await page.waitForSelector('.nrl-club-home-alert');
      const v = await view();
      const out = await cardDown('Club home');
      if (v.running !== false) out.push('the loop is running behind the menus');
      rec.notes.push('Club home upright, the loop asleep');
      return out;
    });
    for (const t of Object.keys(TEXT_SIZES)) {
      await step(`menus-${t}`, async (rec) => {
        await textSize(t);
        const out = [];
        let checked = 0;
        for (const m of PORTRAIT_MENUS) {
          if (m.optional && !(await page.locator(`.nrl-nav-sheet [data-screen="${m.id}"]`).count())) continue;
          try {
            await open(m);
          } catch (err) {
            out.push(`${m.id}: did not open (${err.message.split('\n')[0]})`);
            continue;
          }
          const found = [
            ...await portraitFitProblems(page, m.root ?? '.nrl-screen-region', safe),
            ...await portraitDockProblems(page, m.mark, safe),
            ...await cardDown(m.id),
          ];
          out.push(...found.map((p) => `${m.id}: ${p}`));
          if (found.length) await page.screenshot({ path: join(OUT, `${t}-${m.id}.png`) });
          checked++;
        }
        await home();
        rec.notes.push(`${checked} menus`);
        return out;
      });
    }
    await textSize('normal');
    await step('see-the-grounds', async (rec) => {
      await home();
      await press('[data-club-home-grounds]');
      await page.waitForTimeout(200);
      const v = await view();
      const out = [];
      if (!v.card) out.push('no rotate card over the grounds');
      if (!v.back) out.push('no ◂ Back on the card over the grounds');
      if (v.running !== false) out.push('the loop runs under the card');
      await press('[data-rotate-back]');
      await page.waitForSelector('[data-club-home]');
      out.push(...await cardDown('Club home after ◂ Back'));
      rec.notes.push('card up over the grounds, ◂ Back to Club home');
      return out;
    });
    await step('placement', async (rec) => {
      await openNav(page, 'build');
      await press('.nrl-build-list > :not(:disabled)');
      await page.waitForFunction(() => !!document.querySelector('.nrl-placebar:not([hidden])'));
      const out = [];
      let v = await view();
      if (!v.card) out.push('no rotate card over placement');
      if (v.back) out.push('◂ Back offered over placement (Cancel is on the bar)');
      await turn(H, W);
      await page.waitForTimeout(500);
      v = await view();
      if (v.card) out.push('the card stayed up sideways');
      if (!v.placing) out.push('placement did not carry on sideways');
      if (v.running !== true) out.push('the loop did not wake sideways');
      out.push(...await reachProblems(page, '.nrl-placebar', ['.nrl-placebar-cancel']));
      await press('.nrl-placebar-cancel');
      await turn(W, H);
      await page.waitForSelector('[data-club-home]');
      out.push(...await cardDown('Club home after Cancel'));
      rec.notes.push('placement under the card upright, the bar sideways, Cancel back to Club home');
      return out;
    });
    if (run.match) {
      const clock = async () => (await view()).clock;
      const moves = (from) => page.waitForFunction((from) => {
        const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
        return !!t && t !== from;
      }, from, { timeout: 10000 }).then(() => true, () => false);
      await step('kick-off-upright', async (rec) => {
        // The decision planted above, answered from Club home first, so PLAY WEEK plays.
        await home();
        await press('.nrl-club-home-alert');
        await press('[data-event-choice="1"]');
        await page.waitForFunction(() => window.__nrlState().eventDeck.pending.length === 0);
        await home();
        await press('.nrl-dock [data-hud="advance"]');
        await page.waitForSelector('.nrl-mo-controls');
        await page.waitForTimeout(300);
        const held = await clock();
        await page.waitForTimeout(1200);
        const v = await view();
        const out = [];
        if (!v.card) out.push('no rotate card over the match');
        if (v.running !== false) out.push('the loop runs under the card');
        if (v.clock !== held) out.push(`the clock moved under the card (${held} → ${v.clock})`);
        rec.notes.push(`card up, clock held at ${v.clock}`);
        return out;
      });
      await step('mid-match-turns', async (rec) => {
        const out = [];
        await turn(H, W);
        if (!(await moves(await clock()))) out.push('the match did not start sideways');
        await turn(W, H);
        await page.waitForTimeout(300);
        const held = await clock();
        await page.waitForTimeout(1200);
        const v = await view();
        if (!v.card) out.push('no card when turned upright mid-match');
        if (v.clock !== held) out.push(`the clock moved under the card (${held} → ${v.clock})`);
        await turn(H, W);
        if (!(await moves(held))) out.push('the match did not go on sideways');
        rec.notes.push(`held at ${held} upright, on again sideways`);
        return out;
      });
      await step('report-upright', async (rec) => {
        await press('[data-skip-pill]');
        await press('[data-skip-pill]');
        await page.waitForSelector('[data-back-to-club]', { timeout: 30000 });
        await turn(W, H);
        await page.waitForTimeout(400);
        const out = [...await cardDown('the full-time report'), ...await portraitFitProblems(page, '.nrl-mo-ft', safe)];
        await press('[data-back-to-club]');
        await page.waitForSelector('[data-club-home]');
        out.push(...await cardDown('Club home after the match'));
        rec.notes.push('the report upright, Back to Club to Club home');
        return out;
      });
    }
    await step('reload-upright', async (rec) => {
      await page.reload();
      await page.waitForSelector('[data-nrl-continue-1]');
      const out = [];
      for (const t of Object.keys(TEXT_SIZES)) {
        await textSize(t);
        out.push(...(await portraitFitProblems(page, '.nrl-title', safe)).map((p) => `slots ${t}: ${p}`));
      }
      await textSize('normal');
      await press('[data-nrl-continue-1]');
      await page.waitForSelector('[data-club-home]');
      out.push(...await cardDown('Club home after Continue'));
      rec.notes.push('the slots at three text sizes, then the save resumed onto Club home');
      return out;
    });
    for (const e of report.errors) log(`  error: ${e}`);
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    failed += report.steps.filter((s) => !s.ok).length + report.errors.length;
    await ctx.close();
  }
  log(`portrait menus: ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return failed;
}

/**
 * #421 and #414 at 667×375 and 844×390: in a match, ❚❚ → Settings (text size Large)
 * → ✕ comes back to the pause sheet with the clock where it stopped, the sheet laid
 * out afresh and its buttons tappable; only Resume plays on. Then the full log's
 * Your calls and Scoring filters say so when they have nothing to list.
 */
async function runPauseSettings(browser) {
  let failed = 0;
  for (const [W, H] of [[667, 375], [844, 390]]) {
    const OUT = join(OUT_ROOT, 'webkit', `pause-settings-${W}x${H}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
    });
    await ctx.addInitScript(closeWeekSummary);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    const clock = () => page.locator('.nrl-mo-clock').textContent();
    let n = 0;
    const step = async (name, fn) => {
      const file = `${String(++n).padStart(2, '0')}-${name}.png`;
      let problems;
      try {
        problems = (await fn()) ?? [];
      } catch (err) {
        problems = [`threw: ${err.message.split('\n')[0]}`];
      }
      await page.screenshot({ path: join(OUT, file) }).catch(() => {});
      log(`${problems.length ? 'FAIL' : 'ok '} pause-settings ${W}x${H} ${file}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
      failed += problems.length ? 1 : 0;
    };
    await step('kick-off', async () => {
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
      await page.locator('[data-nrl-start]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let i = 0; i < 2; i++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        if (await ask.count()) await ask.first().tap();
      }
      await page.waitForSelector('.nrl-mo-controls', { timeout: 20000 });
      await page.locator('.nrl-mo-controls [data-speed="8"]').tap();
      const start = await clock();
      await page.waitForFunction((t) => document.querySelector('.nrl-mo-clock')?.textContent !== t, start, { timeout: 20000 });
    });
    let held = '';
    await step('settings-closed', async () => {
      await page.locator('.nrl-mo-pause').tap();
      await page.waitForSelector('.nrl-mo-sheet [data-settings]');
      held = await clock();
      await page.locator('.nrl-mo-sheet [data-settings]').tap();
      await page.waitForSelector('.nrl-settings-modal');
      await page.locator('.nrl-settings-seg [data-seg="large"]').tap();
      await page.locator('.nrl-modal .nrl-screen-x').first().tap();
      await page.waitForSelector('.nrl-mo-sheet [data-settings]');
      await page.waitForTimeout(1500);
      const after = await clock();
      return [
        ...(after === held ? [] : [`the clock ran under Settings: ${held} → ${after}`]),
        ...(await reachProblems(page, '.nrl-mo-sheet-card', ['.nrl-mo-sheet .nrl-btn-primary', '.nrl-mo-sheet [data-settings]', '.nrl-mo-sheet [data-save-exit]'])),
      ];
    });
    await step('resumed', async () => {
      await page.locator('.nrl-mo-sheet .nrl-btn-primary').tap();
      await page.waitForFunction((t) => document.querySelector('.nrl-mo-clock')?.textContent !== t, held, { timeout: 10000 });
      return (await page.locator('.nrl-mo-sheet').count()) ? ['the pause sheet stayed up after Resume'] : [];
    });
    await step('log-filters-empty', async () => {
      await page.locator('.nrl-mo-strip').tap();
      await page.waitForSelector('.nrl-mo-full');
      const problems = [];
      for (const f of ['calls', 'scoring']) {
        await page.locator(`.nrl-mo-filter[data-filter="${f}"]`).tap();
        const { lines, empty } = await page.evaluate((f) => ({
          lines: [...document.querySelectorAll('.nrl-mo-feed .nrl-mo-line')].filter((l) => getComputedStyle(l).display !== 'none').length,
          empty: getComputedStyle(document.querySelector(`.nrl-mo-log-empty[data-for="${f}"]`)).display !== 'none',
        }), f);
        await page.waitForTimeout(400); // the filter's fill settles before the screenshot
        if (empty !== (lines === 0)) problems.push(`${f}: ${lines} line(s) listed, the empty line ${empty ? 'shown' : 'hidden'}`);
      }
      return problems;
    });
    for (const e of errors) log(`  error: ${e}`);
    failed += errors.length;
    await ctx.close();
  }
  return failed;
}


// ── Landscape screens (#336, #344, #347, #343, #351) ─────────────────────────
// Every nav screen and the main popups on a phone held sideways. Each must show
// at least four whole rows of its list or one whole card, keep its way out (a
// sheet's is the dock's CLUB since Broadcast Quiet; a dialog's its ✕) and its
// primary action on screen and tappable, and stay out of the unsafe bands. The
// dock has at most five tabs with labels of 12px or more, and marks the open one.
// The toast lane (#339): a burst shows one toast at a time with a "+n" counter and
// each kind's colour, just above the dock, clear of it, the decisions chip and the
// open sheet's header row; in a match it keeps off the full log, the score bug and
// every control.
// WebKit on Linux reports zero safe-area insets, so the iPhone's are simulated
// through the --nrl-safe-* properties the UI reads env() into (src/ui/dom.ts).
const SCREEN_RUNS = (process.env.E2E_SCREEN_SIZES ?? '844x390@47,0,47,21 667x375 956x330').split(/\s+/).filter(Boolean).map((s) => {
  const [size, insets] = s.split('@');
  const [w, h] = size.split('x').map(Number);
  const [l, t, r, b] = (insets ?? '0,0,0,0').split(',').map(Number);
  return { w, h, safe: { l, t, r, b } };
});

/** A sheet's way out (Broadcast Quiet): sheets have no ✕; CLUB in the dock closes them. */
const SHEET_EXIT = '.nrl-nav [data-nav-home]';
/** Screens reached from the dock: what shows its content, and what must stay on screen. */
const NAV_SCREENS = [
  { id: 'squad', box: '.nrl-screen-region', rows: '.nrl-grid-body > .nrl-row', primary: ['[data-focus-menu]'] },
  { id: 'lineup', box: '.nrl-screen-region', rows: '.nrl-lineup-list > *', card: '.nrl-lineup-field', primary: ['[data-auto-pick]'] },
  { id: 'recruit', box: '.nrl-screen-region', rows: '.nrl-grid-body > .nrl-row', primary: ['.nrl-grid-body > :first-child .nrl-row-action'] },
  { id: 'fixtures', box: '.nrl-screen-region', rows: '.nrl-fixture-row', primary: ['[data-next-row]'] },
  { id: 'ladder', box: '.nrl-screen-region', rows: '.nrl-ladder-table tbody tr' },
  { id: 'news', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-news-item, .nrl-news-empty', card: '.nrl-event-card' },
  { id: 'build', box: '.nrl-screen-region', rows: '.nrl-build-list > *', primary: ['.nrl-build-list > :first-child'] },
  { id: 'finance', box: '.nrl-screen-region', rows: '.nrl-finance-row', card: '.nrl-finance-tile', primary: ['[data-finance-contracts]'] },
  { id: 'staff', box: '.nrl-screen-region', rows: '.nrl-staff-row', primary: ['.nrl-staff-row .nrl-btn'] },
  { id: 'contracts', box: '.nrl-screen-region', rows: '.nrl-contracts-table tbody tr', primary: ['[data-back]'] },
  { id: 'history', box: '.nrl-screen-region', rows: '.nrl-history-body tr, .nrl-history-empty', card: '.nrl-history-body' },
  { id: 'help', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-guide-body :is(p, li, h3)', prose: '.nrl-guide-body', primary: ['.nrl-guide-replay'] },
].map((s) => ({ exit: SHEET_EXIT, ...s }));

/**
 * Destinations inside another sheet: the sheet, then what opens them there. The
 * ladder shares League's sheet (3h); Lineup and Recruit are Squad's segments;
 * Contracts is Finance's VIEW ▸.
 */
const NAV_VIA = {
  ladder: ['fixtures', null],
  lineup: ['squad', '.nrl-sq-tabs [data-seg="lineup"]'],
  recruit: ['squad', '.nrl-sq-tabs [data-seg="recruit"]'],
  contracts: ['finance', '[data-finance-contracts]'],
};

/**
 * Open a destination as a player would: its dock tab, OFFICE then its tile, or
 * the sheet that holds it then the control there. A tab tapped while its own
 * sheet is open closes it (the dock is a toggle), so an open sheet is left as it is.
 */
async function openNav(page, id) {
  if (await page.locator(`.nrl-screen-region[data-screen-key="${id}"]`).count()) return;
  if (NAV_VIA[id]) {
    const [via, sel] = NAV_VIA[id];
    await openNav(page, via);
    if (sel) await page.locator(sel).first().tap();
    return;
  }
  const direct = page.locator(`.nrl-nav > .nrl-btn[data-screen="${id}"]`);
  if (await direct.count() && await direct.first().isVisible()) {
    // Lit for another of its sheets (Squad for Lineup): CLUB first, or the tap would close that.
    if ((await direct.first().getAttribute('aria-current')) === 'page' && (await page.locator('.nrl-screen-region').count())) {
      await page.locator(SHEET_EXIT).tap();
    }
    return direct.first().tap();
  }
  const more = page.locator('.nrl-nav [data-nav-more]');
  if (!(await more.count())) throw new Error(`no nav item for "${id}"`);
  if (!(await page.locator('.nrl-nav-sheet:not([hidden])').count())) await more.tap();
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
    // Rows: four whole ones (or all of them when there are fewer), or one whole card. At
    // 956×330 (Safari's toolbars up) too since Wave 3: a 52px dock and slimmer sheet frames
    // leave room for four 44px tap rows on Squad, Lineup, Recruit, Contracts and a rival's squad.
    // A check can still ask for fewer there (`shortRows`), for a list under a banner.
    const rows = [...box.querySelectorAll(spec.rows)].filter((e) => e.getBoundingClientRect().height > 0);
    const shown = rows.filter(seen).length;
    const cards = spec.card ? [...box.querySelectorAll(spec.card)].filter(seen).length : 0;
    const need = Math.min(spec.shortRows && window.innerHeight < 340 ? spec.shortRows : 4, rows.length);
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
      const unsafe = [...document.querySelectorAll('.nrl-screen-region button, .nrl-dock button, .nrl-screen-title, .nrl-screen-region h2')]
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

/** The chrome: the dock's height, its tabs, label size and the open tab. */
function chromeReport(page, openId) {
  return page.evaluate((openId) => {
    const dock = document.querySelector('.nrl-dock')?.getBoundingClientRect();
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
    const note = `dock ${Math.round(dock?.height ?? 0)}px, ${tabs.length} tabs`;
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

/**
 * What a toast must never touch at the club: the dock (its tabs, money, PLAY WEEK and ▾, the ▾ menu), Office's tiles,
 * the decisions and board chips, a sheet's header row or a dialog's ✕. The lane sits just above the
 * dock (Broadcast Quiet), so it may lie over the foot of an open sheet's list.
 */
const CLUB_AVOID = ['.nrl-dock', '.nrl-hud-menu:not([hidden])', '.nrl-nav-sheet:not([hidden])', '[data-decisions-chip]:not([hidden])', '.nrl-board-chip:not([hidden])', '.nrl-screen-x', '.nrl-screen-head', '.nrl-news-head'];
/** …and in a match: the score bug, the stats, the commentary line or full log, and every control. */
const MATCH_AVOID = ['.nrl-mo-scoreboard', '.nrl-mo-statsheet', '.nrl-mo-strip', '.nrl-mo-full', '.nrl-mo-log-toggle', '.nrl-mo-bar [data-coach]', '.nrl-mo-controls', '.nrl-mo-calls', '.nrl-mo-replay'];
/** The burst the check fires: a problem, a routine stop, good news, a confirmation. */
const TOAST_BURST = [
  { text: 'Kai Smith injured — out 3w', kind: 'danger' },
  { text: 'Stopped after 1 week: Decision needed: Homesick youngster.', kind: 'info' },
  { text: 'Signed Jack Taufa', kind: 'success' },
  { text: 'Advanced 4 weeks.', kind: 'info' },
];
/** Each kind's fill (Broadcast Quiet's tokens: info on the navy sheet, success green, danger red; src/ui/dom.ts). */
const TOAST_BG = { 'nrl-toast-danger': 'rgb(122, 42, 36)', 'nrl-toast-info': 'rgba(14, 22, 48, 0.97)', 'nrl-toast-success': 'rgb(29, 90, 51)' };

async function runScreens(browser, { w: W, h: H, safe }) {
  const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
  const OUT = join(OUT_ROOT, 'webkit', `screens-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, safe, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
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
    else if (hint.lane !== 'dock') out.push(`the install hint is in the ${hint.lane} lane, not the dock's`);
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
      if (r.lane !== 'dock') out.push(`toast ${i + 1} is in the ${r.lane} lane, not the dock's`);
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
    await page.locator(SHEET_EXIT).tap();
    return out;
  });
  // Toasts keep off the rows (Wave 3, #339): with a toast up over Build, News and Squad, the
  // list under it keeps room at its foot, so its last row scrolls whole into view above the
  // toast; the toast covers no ✕, primary action or dock control; and the room goes with it.
  await step('toast-reserve', async (rec) => {
    const out = [];
    for (const id of ['build', 'news', 'squad']) {
      const spec = NAV_SCREENS.find((s) => s.id === id);
      await openNav(page, id);
      await page.waitForSelector(spec.box);
      if (await page.locator('.nrl-hint-x').count()) await page.locator('.nrl-hint-x').tap();
      for (let i = 0; i < 10 && (await page.locator('.nrl-toast').count()); i++) await page.locator('.nrl-toast').first().tap();
      await page.evaluate(() => window.__nrlNotify({ text: 'Signed Jack Taufa from the player pool, on a two-year deal', kind: 'success', ms: 60000 }));
      await page.waitForTimeout(500);
      const r = await page.evaluate(([spec]) => {
        const problems = [];
        const t = document.querySelector('.nrl-toast')?.getBoundingClientRect();
        if (!t || t.height < 1) return { problems: ['no toast on show'], note: '' };
        // What must take a tap with the toast up: the sheet's ✕ (if any), its primary actions, the dock.
        const must = [...document.querySelectorAll('.nrl-screen-region .nrl-screen-x, .nrl-dock button')];
        for (const sel of spec.primary ?? []) must.push(...document.querySelectorAll(`${spec.box} ${sel}`));
        for (const e of must) {
          const er = e.getBoundingClientRect();
          if (er.width < 1 || er.height < 1) continue;
          const hit = document.elementFromPoint((er.left + er.right) / 2, (er.top + er.bottom) / 2);
          if (!hit || !e.contains(hit)) problems.push(`${(e.textContent.trim() || e.getAttribute('aria-label') || e.tagName).slice(0, 14)} covered (a tap hits ${hit?.className || hit?.tagName})`);
        }
        // The last row, its list scrolled to the end: whole, and above the toast.
        const rows = [...document.querySelectorAll(`${spec.box} :is(${spec.rows})`)].filter((e) => e.getBoundingClientRect().height > 0);
        const last = rows.at(-1);
        if (!last) return { problems: [...problems, 'no rows'], note: '' };
        let list = last.parentElement;
        while (list && !/(auto|scroll)/.test(getComputedStyle(list).overflowY)) list = list.parentElement;
        if (list) list.scrollTop = list.scrollHeight;
        const lr = last.getBoundingClientRect();
        if (lr.bottom > t.top + 0.5) problems.push(`the last row ends at ${Math.round(lr.bottom)}, under the toast (from ${Math.round(t.top)})`);
        if (list && lr.bottom > list.getBoundingClientRect().bottom + 1) problems.push('the last row does not scroll whole into view');
        const room = list ? getComputedStyle(list, '::after').height : '';
        return { problems, note: `${list?.className.split(' ')[0] ?? 'no list'} keeps ${room}` };
      }, [spec]);
      out.push(...r.problems.map((p) => `${id}: ${p}`));
      rec.notes.push(`${id}: ${r.note}`);
      await page.screenshot({ path: join(OUT, `toast-reserve-${id}.png`) });
      await page.locator('.nrl-toast').first().tap();
      await page.waitForTimeout(300);
      const left = await page.evaluate(() => document.querySelectorAll('.nrl-toast-reserve').length);
      if (left) out.push(`${id}: ${left} list(s) still keep room after the toast went`);
    }
    await page.locator(SHEET_EXIT).tap();
    return out;
  });
  // The Office sheet (was More): every tile whole, tappable, 44px tall, 12px labels, clear of the unsafe bands.
  await step('nav-more', async (rec) => {
    await tap('.nrl-nav [data-nav-more]');
    await page.waitForSelector('.nrl-nav-sheet:not([hidden])');
    await page.waitForTimeout(250);
    const out = await page.evaluate((safe) => {
      const W = innerWidth, H = innerHeight;
      const problems = [];
      if (document.querySelector('.nrl-nav [data-nav-more]')?.getAttribute('aria-expanded') !== 'true') problems.push('OFFICE is not aria-expanded');
      const items = [...document.querySelectorAll('.nrl-nav-sheet .nrl-btn')];
      for (const b of items) {
        const r = b.getBoundingClientRect();
        const t = (b.querySelector('.nrl-office-name') ?? b).textContent.trim();
        if (r.left < safe.l - 1 || r.right > W - safe.r + 1 || r.top < safe.t - 1 || r.bottom > H - safe.b + 1) problems.push(`${t} off screen or in the unsafe band`);
        if (r.height < 44) problems.push(`${t} ${Math.round(r.height)}px tall`);
        if (parseFloat(getComputedStyle(b.querySelector('.nrl-office-name') ?? b).fontSize) < 12) problems.push(`${t} label under 12px`);
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (!hit || !b.contains(hit)) problems.push(`${t} covered`);
      }
      return { problems, note: `${items.length} tiles: ${items.map((b) => (b.querySelector('.nrl-office-name') ?? b).textContent.trim()).join(', ')}` };
    }, safe);
    rec.notes.push(out.note);
    return out.problems;
  });
  await page.keyboard.press('Escape');
  for (const spec of NAV_SCREENS) {
    await step(`screen-${spec.id}`, async (rec) => {
      await openNav(page, spec.id);
      await page.waitForSelector(spec.box);
      // #370: a first visit's hint line is checked in the tutorial walk; the screen is measured without it.
      if (await page.locator('.nrl-hint-x').count()) {
        await page.locator('.nrl-hint-x').tap();
        rec.notes.push('first-visit hint dismissed');
      }
      return check(rec, spec, spec.id);
    });
  }
  // Popups: the player page, the kit designer, a rival's squad, a decision card.
  await step('popup-player', async (rec) => {
    await openNav(page, 'squad');
    await tap('.nrl-screen-region [data-player-open] .nrl-row-name');
    await page.waitForSelector('[data-player-page]');
    // No ✕ (Broadcast Quiet): ◂ SQUAD is its one way out.
    return check(rec, { box: '.nrl-player-modal', rows: '.nrl-player-stats .nrl-statrow', card: '.nrl-player-stats', exit: '.nrl-player-modal [data-back]',
      primary: ['[data-player-action="renew"]', '[data-player-action="sell"]', '[data-player-action="release"]'] }, null);
  });
  // The kit designer: Office's Kit & colours tile (it was a button on Squad).
  await step('popup-kit', async (rec) => {
    await page.locator('.nrl-player-modal [data-back]').tap().catch(() => {});
    await openNav(page, 'kit');
    await page.waitForSelector('.nrl-kit-modal');
    return check(rec, { box: '.nrl-kit-modal', rows: '.nrl-kit-preview', card: '.nrl-kit-preview', exit: SHEET_EXIT, primary: ['.nrl-kit-save'] }, null);
  });
  await step('popup-rival-squad', async (rec) => {
    await openNav(page, 'ladder');
    await tap('.nrl-ladder-table .nrl-ladder-club');
    await page.waitForSelector('.nrl-rival-modal');
    return check(rec, { box: '.nrl-rival-modal', rows: '.nrl-rival-row' }, null);
  });
  // Settings (#349 E1): an Office tile (the gear is gone), every switch whole; Import asks on its own row first.
  await step('popup-settings', async (rec) => {
    await closeAll();
    await openNav(page, 'settings');
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
    // At 956×330 the banner's row leaves room for three whole news rows (a fourth part shows).
    const out = await check(rec, { box: '.nrl-screen-region .nrl-modal', rows: '.nrl-news-item, .nrl-news-empty', shortRows: 3, exit: SHEET_EXIT, primary: ['[data-decisions-open]'] }, 'news');
    if (await page.locator('.nrl-news .nrl-event-card').count()) out.push('the decision card is in the News feed');
    return out;
  });
  await step('popup-decision-card', async (rec) => {
    await tap('[data-decisions-open]');
    await page.waitForSelector('.nrl-decisions-modal .nrl-event-card');
    return check(rec, { box: '.nrl-decisions-modal', rows: '.nrl-event-choice', card: '.nrl-event-card',
      primary: ['[data-event-choice="0"]', '[data-event-choice="1"]'] }, null);
  });
  // #338: with a card waiting, Advance Week (PLAY WEEK) asks: it lists the card and takes no default.
  // #350 H1: the button wears the count, and names the next match on its sub-line.
  await step('advance-asks', async (rec) => {
    await tap('.nrl-decisions-modal .nrl-screen-x');
    await page.locator(SHEET_EXIT).tap();
    const before = await page.evaluate(() => { const s = window.__nrlState(); return { week: s.week, pending: s.eventDeck.pending.map((p) => p.id) }; });
    if (!before.pending.length) throw new Error('no card waiting to ask about');
    const out = [];
    const badge = (await page.locator('[data-hud="decisions"]').textContent().catch(() => ''))?.trim();
    if (badge !== String(before.pending.length)) out.push(`Advance Week's badge reads "${badge}", want ${before.pending.length}`);
    const chip = page.locator('[data-hud="next"]');
    if (!(await chip.isVisible())) out.push('PLAY WEEK does not name the next match');
    else rec.notes.push(`sub-line "${(await chip.textContent()).trim()}"`);
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
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
    if (await page.evaluate(() => !!document.querySelector('.nrl-dock[data-advancing]'))) out.push('Cancel started the run');
    if ((await page.evaluate(() => window.__nrlState().week)) !== week) out.push('Cancel moved the week');
    return out;
  });
  // The match's cards (#341, #348): the half-time card, the pause sheet and the calls list
  // each hold the match with every action on screen and uncovered, and the Replay try
  // chip hides under them and comes back after.
  await step('match-cards', async (rec) => {
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
    await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
    const out = [];
    // The commentary line is never a blank strip: "Kick-off soon…" until the first line (#339).
    const ticker = await page.evaluate(() => document.querySelector('.nrl-mo-strip .nrl-mo-strip-text')?.textContent?.trim() ?? '');
    if (!ticker) out.push('the commentary line is empty at kick-off');
    else rec.notes.push(`line at kick-off: "${ticker.slice(0, 24)}"`);
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
    out.push(...await blocked(['.nrl-mo-sheet .nrl-mo-sheet-actions .nrl-btn:first-child', '.nrl-mo-sheet [data-skip]', '.nrl-mo-sheet [data-save-exit]']));
    // The sheet's ✕ is 36×36 (3m) with a 44px hit area (an ::after 4px past its box): that area must reach 44 and take the tap.
    out.push(...await page.evaluate(() => {
      const x = document.querySelector('.nrl-mo-sheet .nrl-mo-sheet-x');
      if (!x) return ['.nrl-mo-sheet .nrl-mo-sheet-x missing'];
      const r = x.getBoundingClientRect();
      const after = getComputedStyle(x, '::after');
      const grow = after.position === 'absolute' ? Math.max(0, -parseFloat(after.left) || 0) : 0;
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const out = [];
      if (r.width + 2 * grow < 44 || r.height + 2 * grow < 44) out.push(`the pause sheet's ✕ hits only ${Math.round(r.width + 2 * grow)}×${Math.round(r.height + 2 * grow)}`);
      if (!(at === x || x.contains(at))) out.push(`the pause sheet's ✕ covered by ${at?.className || at?.tagName}`);
      return out;
    }));
    await page.screenshot({ path: join(OUT, 'pause-sheet.png') });
    await page.locator('.nrl-mo-sheet .nrl-btn', { hasText: 'Resume' }).tap();
    await page.waitForSelector('.nrl-mo-sheet', { state: 'detached', timeout: 3000 });
    if (!(await runs(paused).then(() => true).catch(() => false))) out.push('the match did not go on after Resume');
    // The calls (3o): the "?" list of every call is gone; COACH opens a tray of the calls
    // legal now, with a line on when the others unlock. The match keeps playing under it
    // (it is not a card), its rows take a tap, and COACH again shuts it.
    if (await page.locator('.nrl-mo-bar [data-coach]').count()) {
      out.push(...await blocked(['.nrl-mo-bar [data-coach]']));
      // A try's offer is up as the tray opens (#348): the chip steps out from over the tray and waits.
      await page.evaluate(() => window.__nrlGame.scene.getScene('Match').overlay.offerReplay(() => {}));
      await page.locator('.nrl-mo-bar [data-coach]').tap();
      await page.waitForSelector('.nrl-mo-calls:not([hidden])', { timeout: 3000 });
      const trayAt = Date.now();
      const traying = await clock();
      if (!(await runs(traying).then(() => true).catch(() => false))) out.push('the match stopped under the coach tray');
      // Measure the tray settled (#390): mid slide-in (nrl-mo-up, 180ms) WebKit reports its 44px rows as 43.99998px.
      await page.evaluate(() => Promise.all(document.querySelector('.nrl-mo-calls').getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));
      const tray = await page.evaluate(() => {
        const t = document.querySelector('.nrl-mo-calls');
        const r = t.getBoundingClientRect();
        const rows = [...t.querySelectorAll('[data-call]')];
        const problems = [];
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) problems.push('the coach tray is off screen');
        if (!t.querySelector('.nrl-mo-tray-title')?.textContent?.trim()) problems.push('the coach tray has no title');
        if (!rows.length && !t.querySelector('.nrl-mo-tray-none')) problems.push('the coach tray lists nothing, not even "nothing to call"');
        for (const b of rows) {
          const br = b.getBoundingClientRect();
          if (br.height < 44) problems.push(`call ${b.dataset.call} is ${Math.round(br.height)}px tall`);
          const at = document.elementFromPoint((br.left + br.right) / 2, (br.top + br.bottom) / 2);
          if (br.bottom > r.bottom + 1 && getComputedStyle(t).overflowY === 'visible') problems.push(`call ${b.dataset.call} is below the tray`);
          else if (br.bottom <= r.bottom + 1 && !(at && b.contains(at))) problems.push(`call ${b.dataset.call} covered by ${at?.className || at?.tagName}`);
        }
        return { problems, rows: rows.length };
      });
      out.push(...tray.problems);
      const overTray = await page.evaluate(() => {
        const c = document.querySelector('.nrl-mo-replay');
        const t = document.querySelector('.nrl-mo-calls').getBoundingClientRect();
        if (!c || getComputedStyle(c).display === 'none') return null;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top ? 'over' : 'beside';
      });
      if (overTray === 'over') out.push('the Replay try chip sits over the coach tray');
      else if (overTray === 'beside') out.push('the Replay try chip shows while the coach tray is open');
      await page.screenshot({ path: join(OUT, 'coach-tray.png') });
      await page.locator('.nrl-mo-bar [data-coach]').tap();
      if (!(await page.locator('.nrl-mo-calls[hidden]').count())) out.push('COACH did not shut its tray');
      // Shut inside its eight seconds, the tray hands the chip back with the time it had.
      const back = await page.waitForFunction(() => {
        const c = document.querySelector('.nrl-mo-replay');
        return !!c && getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().height > 0;
      }, null, { timeout: 1500 }).then(() => true).catch(() => false);
      if (!back && Date.now() - trayAt < 7000) out.push('the Replay try chip did not come back when the tray shut');
      rec.notes.push(`tray: ${tray.rows} call(s) on, the match playing under it`);
    } else out.push('no COACH button in the bottom row');
    rec.notes.push(`card held at ${at}; sheet held at ${paused}`);
    return out;
  });
  // A match toast with the full log open (#339): under the score bug, clear of the log, the
  // score bug, the stats and every control; a club toast fired with it waits for the club;
  // and the lane gives way to the Replay try chip.
  await step('match-toast', async (rec) => {
    const out = [];
    // The log's three modes (3m): the LOG switch brings the line back, the line opens the full log.
    if (await page.locator('.nrl-match-overlay[data-log="hidden"]').count()) await page.locator('.nrl-mo-log-toggle').tap();
    if (await page.locator('.nrl-match-overlay[data-log="line"]').count()) await page.locator('.nrl-mo-strip').tap();
    if (!(await page.locator('.nrl-match-overlay[data-log="full"]').count())) out.push('the full log did not open from the commentary line');
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
    await page.locator('.nrl-mo-full-x').tap();
    return out;
  });
  // Full time (3s): a card with the result, Player of the Match and Back to Club, its one
  // exit beside REPORT. The report (#351 P0, P2; 3t) no longer opens by itself: REPORT
  // opens it, with the result and Player of the Match on screen, Back to Club its one exit,
  // and the plan changes folded into one line.
  await step('popup-fulltime-report', async (rec) => {
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-skip]').tap();
    await page.waitForSelector('.nrl-mo-ft .nrl-ft-card', { timeout: 60000 });
    await page.waitForTimeout(250);
    const out = (await check(rec, { box: '.nrl-mo-ft .nrl-ft-card', rows: '.nrl-ft-score, .nrl-ft-potm', card: '.nrl-ft-head',
      exit: '.nrl-mo-ft [data-back-to-club]', primary: ['.nrl-mo-ft [data-report]'] }, null)).map((p) => `full time: ${p}`);
    if (!(await page.locator('.nrl-mo-ft .nrl-rp-tag').count())) out.push('full time: no WIN / LOSS / DRAW tag');
    await page.screenshot({ path: join(OUT, 'full-time-card.png') });
    await page.locator('.nrl-mo-ft [data-report]').tap();
    await page.waitForSelector('.nrl-report', { timeout: 5000 });
    out.push(...await check(rec, { box: '.nrl-report-modal', rows: '.nrl-rp-team, .nrl-report-potm', card: '.nrl-rp-head', exit: '.nrl-report-modal [data-back-to-club]' }, null));
    if (!(await page.locator('.nrl-report .nrl-rp-tag').count())) out.push('no WIN / LOSS / DRAW headline');
    if (await page.locator('.nrl-report .nrl-report-change:not(details .nrl-report-change)').count()) out.push('plan changes shown as loose lines, not folded');
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

// ── The tutorial, followed (#344, #337, #370) ────────────────────────────────
// The three guided taps done the way the bubble says, never skipped: the paddock
// placed on the grass, a player signed (then the Undo taken, which brings the run
// back to tap 2, and signed again), then Play Week into the first match, played
// to full time with no tutorial over it, and back to the club with the run over.
// Each tap opens its own screen; each control it points at must be whole, out
// from under the bubble, and take the tap. Then the first-visit hints: Lineup's
// shows once, with a 44px ✕; and a build's Undo puts the money back.
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
  await ctx.addInitScript(closeWeekSummary);
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

  await step('new-game', async () => {
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
    await atStep('build');
    const count = (await page.locator('.nrl-tutorial-count').textContent())?.trim();
    return count === '1 of 3' ? [] : [`the first tap reads "${count}"`];
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
  /** The Undo toast's button, once it is on show: whole, 44px, and the one a tap at its middle hits. Then tap it. */
  const tapUndo = async () => {
    await page.waitForSelector('.nrl-toast-action .nrl-toast-btn', { state: 'visible' });
    await page.waitForTimeout(300); // past the toast's entry slide
    const problem = await page.evaluate(() => {
      const t = document.querySelector('.nrl-toast-action .nrl-toast-btn');
      const r = t.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) return `Undo is ${Math.round(r.width)}×${Math.round(r.height)}px`;
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return 'Undo off screen';
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return hit && t.contains(hit) ? null : `Undo: a tap hits ${hit?.className || hit?.tagName}`;
    });
    if (problem) return [problem];
    await page.locator('.nrl-toast-action .nrl-toast-btn').tap();
    return [];
  };
  const money = () => page.evaluate(() => window.__nrlState().money);

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
    if (!/green spot, then Build here/.test(text)) out.push(`placement copy reads "${text}"`);
    out.push(...await page.evaluate(() => {
      const bar = document.querySelector('.nrl-placebar').getBoundingClientRect();
      const b = document.querySelector('.nrl-tutorial-bubble').getBoundingClientRect();
      return b.right <= bar.left || b.left >= bar.right || b.bottom <= bar.top || b.top >= bar.bottom ? [] : ['the bubble covers the placement bar'];
    }));
    // Aim, then build (#395): a tap on the grass moves the ghost and spends nothing.
    const cash = await money();
    await page.touchscreen.tap(Math.round(W / 2) + 70, Math.round(H / 2) + 30);
    await page.waitForTimeout(300);
    if ((await page.evaluate(() => window.__nrlState().facilities.length)) !== 0 || (await money()) !== cash) {
      out.push('a tap on the grass built before Build here');
    }
    const go = page.locator('.nrl-placebar [data-place-go]');
    const box = await go.boundingBox();
    if (!box || box.height < 44) out.push(`Build here is ${box ? Math.round(box.height) : 0}px tall`);
    // If that tap aimed at a bad spot, Cancel and start again: the ghost starts on a free spot.
    if (await go.isDisabled()) {
      rec.notes.push(`aimed at a bad spot: ${(await go.textContent()).trim()}`);
      await page.locator('.nrl-placebar-cancel').tap();
      await openNav(page, 'build');
      await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
      await page.waitForSelector('.nrl-placebar:not([hidden])');
    }
    await go.tap();
    await atStep('recruit');
    rec.notes.push('paddock placed with Build here');
    return out;
  });
  // Recruit: opened by the step, the first free agent's row framed and clear of the bubble.
  await step('recruit-sign', async (rec) => {
    await page.waitForSelector('[data-screen-key="recruit"]');
    const out = await onItsScreen('recruit');
    out.push(...await tapTarget('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)', rec));
    if (out.length) return out;
    await atStep('advance');
    rec.notes.push('signed: on to tap 3');
    return out;
  });
  // #370: Undo the signing inside 5 s: the fee comes back and the run returns to tap 2.
  await step('undo-sign', async (rec) => {
    const squad = await page.evaluate(() => window.__nrlState().squad.length);
    const out = await tapUndo();
    if (out.length) return out;
    await atStep('recruit');
    const after = await page.evaluate(() => window.__nrlState().squad.length);
    if (after !== squad - 1) out.push(`squad ${squad} → ${after} after Undo`);
    rec.notes.push('signing undone: back to tap 2');
    out.push(...await tapTarget('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)', rec));
    await atStep('advance');
    return out;
  });
  // Advance Week: framed and clear; tapping it starts the first match, and the
  // tutorial is gone before the match draws and stays gone until Back to Club (#337 U1).
  await step('advance-to-match', async (rec) => {
    const out = await tapTarget('.nrl-hud-actions > [data-hud="advance"]', rec, 'PLAY WEEK');
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
    await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 60000 });
    await page.waitForTimeout(700);
    const out = (await tutorialHidden()) ? [] : ['the tutorial showed over the full-time screen'];
    rec.notes.push('match played to full time (the match\'s Skip, not the tutorial\'s)');
    return out;
  });
  // Back at the club the run is over: three taps, none skipped (#370).
  await step('back-to-club-done', async (rec) => {
    await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate((b) => b.click());
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
    await page.waitForTimeout(700);
    const out = [];
    if (await page.locator('.nrl-tutorial').count()) out.push('the tutorial is still up after the first match');
    if (!(await page.evaluate(() => window.__nrlState().settings.tutorialDone))) out.push('tutorialDone not set at the end');
    rec.notes.push(`week ${await page.evaluate(() => window.__nrlState().week)}, every tap followed, none skipped`);
    return out;
  });
  // First-visit hints (#370): Lineup's line shows the first time, with a 44px ✕, and not again.
  await step('lineup-hint-once', async (rec) => {
    await openNav(page, 'lineup');
    await page.waitForSelector('[data-screen-key="lineup"] [data-hint="lineup"]');
    const out = await reachProblems(page, '[data-hint="lineup"]', ['.nrl-hint-x']);
    const x = await page.locator('.nrl-hint-x').boundingBox();
    // To the hundredth: on a sheet at a fractional y (the notch's inset) WebKit measures 44px as 43.99999.
    const px = (v) => Math.round(v * 100) / 100;
    if (!x || px(x.width) < 44 || px(x.height) < 44) out.push(`the hint's ✕ is ${x?.width}×${x?.height}px`);
    await page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-lineup-hint-first.png`) }).catch(() => {});
    await page.locator('.nrl-hint-x').tap();
    await page.locator('.nrl-nav [data-nav-home]').tap();
    await openNav(page, 'lineup');
    await page.waitForTimeout(400);
    if (await page.locator('[data-hint]').count()) out.push('the Lineup hint showed twice');
    rec.notes.push('shown once');
    return out;
  });
  // #370: a build's Undo inside 5 s takes the facility away and gives every dollar back.
  await step('undo-build', async (rec) => {
    await page.locator('.nrl-nav [data-nav-home]').tap();
    const before = await money();
    const built = await page.evaluate(() => window.__nrlState().facilities.length);
    await openNav(page, 'build');
    await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
    await page.waitForSelector('.nrl-placebar:not([hidden])');
    await page.locator('.nrl-placebar [data-place-go]').tap(); // the ghost starts on a free spot (#395)
    await page.waitForFunction((k) => window.__nrlState().facilities.length === k + 1, built);
    const out = await tapUndo();
    await page.waitForTimeout(300);
    const after = await money();
    if (after !== before) out.push(`money ${before} → ${after} after Undo`);
    if ((await page.evaluate(() => window.__nrlState().facilities.length)) !== built) out.push('the facility is still there');
    rec.notes.push(`built and undone, money back to $${after}`);
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

// ── The dock at every text size (#344) ──────────────────────────────────────
/**
 * The sizes the dock phase runs at: #344's three (844×390 with an iPhone 14's insets, 667×375,
 * 956×330); an iPhone SE on its side (568×320, where Settings scrolls to Coach calls); and two
 * narrow upright windows with a mouse (375×667, 320×568: a desktop window, which keeps the
 * stacked two-row dock; a phone held upright gets the portrait bar, runPortraitMenus), where the
 * dock stacks into two rows.
 */
const DOCK_RUNS = [
  { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 } },
  { w: 667, h: 375, safe: NO_INSETS },
  { w: 956, h: 330, safe: NO_INSETS },
  { w: 568, h: 320, safe: NO_INSETS, settingsScroll: true },
  { w: 375, h: 667, safe: NO_INSETS, mouse: true },
  { w: 320, h: 568, safe: NO_INSETS, mouse: true },
];
/** What the phase opens at each text size: home, each tab's sheet, Office's sheet up, a screen from a tile. */
const DOCK_STATES = [
  { name: 'home', open: null, marked: 'club' },
  { name: 'squad', open: 'squad', marked: 'squad' },
  { name: 'league', open: 'fixtures', marked: 'fixtures' },
  { name: 'build', open: 'build', marked: 'build' },
  { name: 'office-up', open: 'office', marked: 'office' },
  { name: 'staff-tile', open: 'staff', marked: 'office' },
];

/**
 * What the dock gets wrong (#344): the five tabs and PLAY WEEK not on one row (or, stacked in a
 * narrow window, the tabs not on one row under PLAY WEEK), anything overlapping, off screen or
 * in the unsafe bands, a label clipped or under 12px (`cut`: ellipsized allowed, and noted), a
 * tab under 44×44, PLAY WEEK under 44px or its label not whole, the open tab (`marked`) without
 * its fill and its 3px bar, or a bar that doesn't read in greyscale (3:1 against the fill,
 * WCAG 1.4.11). Runs in the page.
 */
function dockProblems(page, marked, safe, cut = false) {
  return page.evaluate(([marked, safe, cut]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const notes = [];
    const tabs = [...document.querySelectorAll('.nrl-nav > .nrl-btn')];
    const play = document.querySelector('.nrl-dock-play-group');
    if (tabs.length !== 5) out.push(`${tabs.length} tabs (want 5)`);
    if (!play) return { problems: [...out, 'no PLAY WEEK'], note: '' };
    const name = (b) => b.getAttribute('data-label') ?? b.textContent.trim();
    const dockEl = document.querySelector('.nrl-dock');
    const stacked = getComputedStyle(dockEl).flexWrap === 'wrap';
    const items = [...tabs.map((b) => [name(b), b]), ['PLAY WEEK', play]].map(([n, e]) => [n, e.getBoundingClientRect()]);
    const mid = (r) => (r.top + r.bottom) / 2;
    const tabMids = items.slice(0, -1).map(([, r]) => mid(r));
    const pr = items[items.length - 1][1];
    if (Math.max(...tabMids) - Math.min(...tabMids) > 4) out.push('the tabs are not on one row');
    if (!stacked && Math.abs(mid(pr) - tabMids[0]) > 4) out.push('the tabs and PLAY WEEK are not on one row');
    if (stacked && Math.abs(mid(pr) - tabMids[0]) < 4 && pr.left < items[tabs.length - 1][1].right) out.push('PLAY WEEK and the tabs share a row in the wrong order');
    // Nothing overlaps, nothing leaves the screen or the safe area, and the dock doesn't spill.
    for (let i = 0; i < items.length; i++) {
      const [n, r] = items[i];
      if (r.left < safe.l - 0.5 || r.right > W - safe.r + 0.5 || r.bottom > H - safe.b + 0.5) out.push(`${n} is off screen or in the unsafe band (${Math.round(r.left)}–${Math.round(r.right)} of ${W})`);
      for (let j = i + 1; j < items.length; j++) {
        const [m, q] = items[j];
        if (r.left < q.right - 0.5 && q.left < r.right - 0.5 && r.top < q.bottom - 0.5 && q.top < r.bottom - 0.5) out.push(`${n} overlaps ${m}`);
      }
    }
    if (dockEl.scrollWidth > dockEl.clientWidth + 0.5) out.push(`the dock spills (${dockEl.scrollWidth} in ${dockEl.clientWidth}px)`);
    const cuts = [];
    for (const b of tabs) {
      const r = b.getBoundingClientRect();
      const label = b.querySelector('.nrl-nav-label');
      // To the hundredth: WebKit measures 44px as 43.99999 at a fractional x.
      if (Math.round(r.width * 100) < 4400 || Math.round(r.height * 100) < 4400) out.push(`${name(b)} is ${r.width.toFixed(1)}×${r.height.toFixed(1)}px`);
      if (b.scrollWidth > b.clientWidth + 0.5) out.push(`${name(b)} clipped (${b.scrollWidth} in ${b.clientWidth}px)`);
      const lr = label.getBoundingClientRect();
      if (lr.left < r.left - 0.5 || lr.right > r.right + 0.5) out.push(`${name(b)}'s label runs out of its tab`);
      if (label.scrollWidth > label.clientWidth + 0.5) cuts.push(name(b));
      const dot = b.querySelector('.nrl-nav-dot')?.getBoundingClientRect();
      if (dot && (dot.left < r.left - 0.5 || dot.right > r.right + 0.5 || dot.width < 7.5)) out.push(`${name(b)}'s dot clipped`);
      const px = parseFloat(getComputedStyle(label).fontSize);
      if (px < 12) out.push(`${name(b)} ${px.toFixed(1)}px`);
    }
    if (cuts.length && !cut) out.push(`labels ellipsized: ${cuts.join(', ')}`);
    if (cuts.length && cut) notes.push(`ellipsized: ${cuts.join(', ')}`);
    // PLAY WEEK: at least 44 wide, its label whole and clear of ▾ (or STOP while a run of weeks goes).
    const advBtn = document.querySelector('.nrl-dock-advance');
    const adv = document.querySelector('.nrl-dock-advance-label');
    const ab = advBtn.getBoundingClientRect();
    if (Math.round(ab.width * 100) < 4400 || Math.round(ab.height * 100) < 4400) out.push(`PLAY WEEK is ${ab.width.toFixed(1)}×${ab.height.toFixed(1)}px`);
    if (adv.getBoundingClientRect().right > ab.right + 0.5) out.push('the PLAY WEEK label runs out of its button');
    const next = [...play.querySelectorAll(':scope > .nrl-btn')].find((b) => b !== advBtn && b.getBoundingClientRect().width > 0);
    const over = next ? adv.getBoundingClientRect().right - next.getBoundingClientRect().left : 0;
    if (over > 0.5) out.push(`the PLAY WEEK label runs ${Math.round(over)}px under ${next.textContent.trim()}`);
    // The marker: aria-current (or, for OFFICE with its sheet up, aria-expanded), the fill and the bar.
    const lit = tabs.filter((b) => b.getAttribute('aria-current') === 'page' || b.getAttribute('aria-expanded') === 'true');
    const want = tabs.find((b) => b.getAttribute('data-screen') === marked);
    let contrast = 0;
    if (lit.length !== 1 || lit[0] !== want) out.push(`marked: ${lit.map(name).join(', ') || 'nothing'} (want ${marked})`);
    else {
      const b = want, label = b.querySelector('.nrl-nav-label');
      const bar = getComputedStyle(label, '::after');
      const fill = getComputedStyle(b).backgroundColor;
      if (bar.content === 'none' || bar.height !== '3px') out.push(`${name(b)} has no 3px bar (${bar.content} ${bar.height})`);
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(fill)) out.push(`${name(b)} has no fill`);
      // The bar is in the label's bottom padding: the label's box ends inside the tab.
      if (label.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom + 0.5) out.push(`${name(b)}'s bar sits below the tab`);
      // Greyscale: the bar's luminance against the fill's.
      const lum = (c) => {
        const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const [a, z] = [lum(bar.backgroundColor), lum(fill)].sort((x, y) => y - x);
      contrast = (a + 0.05) / (z + 0.05);
      if (contrast < 3) out.push(`${name(b)}'s bar is ${contrast.toFixed(1)}:1 on its fill in greyscale (want 3)`);
    }
    const px = parseFloat(getComputedStyle(tabs[0].querySelector('.nrl-nav-label')).fontSize);
    const room = stacked ? `two rows, dock ${Math.round(dockEl.getBoundingClientRect().height)}px` : `${Math.round(pr.left - items[tabs.length - 1][1].right)}px to PLAY WEEK`;
    return { problems: out, note: [`labels ${px.toFixed(1)}px`, room, `PLAY WEEK ${Math.round(ab.width)}px`, ...(contrast ? [`bar ${contrast.toFixed(1)}:1`] : []), ...notes].join(', ') };
  }, [marked, safe, cut]);
}

/**
 * The dock at Normal, Large and Larger (#344, after #371's text size) at each of DOCK_RUNS'
 * sizes. A contract ending (Squad's dot) and the welcome news (OFFICE's count) are
 * real alerts. At each size, set from Settings as a player would: CLUB, each tab's sheet,
 * Office's sheet up and Staff & Board from its tile, each checked by dockProblems, and
 * each tab's spoken name (the accessibility tree): its name and its alert, never "current" (the
 * marked tab says that with aria-current="page").
 * Then a stress at Larger: RESUME MATCH, a decisions count and a long opponent, which must
 * cost PLAY WEEK's sub-line, not a tab. Staff & Board and Coach calls: two taps from Office.
 * A greyscale screenshot of the open tab at each size is kept as greyscale-<size>.png.
 */
async function runDockTextSize(browser) {
  let failed = 0;
  for (const { w: W, h: H, safe, settingsScroll = false, mouse = false } of DOCK_RUNS) {
    const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
    const OUT = join(OUT_ROOT, 'webkit', `dock-${tag}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const report = { size: tag, safe, steps: [], errors: [] };
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: 2,
      ...(mouse ? {} : { hasTouch: true, isMobile: true, userAgent: IPHONE_UA }),
    });
    await ctx.addInitScript(closeWeekSummary);
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
      log(`${rec.ok ? 'ok ' : 'FAIL'} dock ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
    };
    // A finger, or a mouse in the narrow desktop windows.
    const press = (sel) => (typeof sel === 'string' ? page.locator(sel).first() : sel)[mouse ? 'click' : 'tap']();
    const home = async () => {
      await page.keyboard.press('Escape');
      if (await page.locator('.nrl-nav-sheet:not([hidden])').count()) await press('.nrl-nav [data-nav-more]');
      await press(SHEET_EXIT);
      await page.waitForTimeout(200);
    };
    const tabNames = () => page.locator('.nrl-nav').ariaSnapshot();

    await step('setup', async (rec) => {
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
      await page.evaluate((s) => {
        const st = document.documentElement.style;
        for (const k of ['l', 't', 'r', 'b']) st.setProperty(`--nrl-safe-${k}`, `${s[k]}px`);
      }, safe);
      await page.fill('[data-nrl-clubname]', 'Dock FC');
      await press('[data-nrl-start]');
      await page.waitForSelector('.nrl-tutorial-skip');
      await press('.nrl-tutorial-skip');
      await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
      // A contract inside 4 weeks: Squad's dot (#369) shows on the next state change (the text size, below).
      const who = await page.evaluate(() => {
        const p = window.__nrlState().squad.find((x) => !x.junior && !x.departed);
        p.contractWeeks = 2;
        return p.name;
      });
      rec.notes.push(`${who}'s contract ends in 2 weeks`);
      return [];
    });

    for (const size of ['normal', 'large', 'larger']) {
      await step(`${size}-set`, async (rec) => {
        await home();
        await press('.nrl-nav [data-nav-more]');
        await press('.nrl-nav-sheet [data-screen="settings"]');
        await page.waitForSelector('.nrl-settings-modal');
        // Pick it the way a player would: the segment, then ✕. Normal is already picked: Large first, so the
        // state changes (that change is what shows Squad's dot).
        const seg = page.locator(`.nrl-settings-textsize [data-seg="${size}"]`);
        if ((await seg.getAttribute('aria-pressed')) === 'true') await press('.nrl-settings-textsize [data-seg="large"]');
        await press(seg);
        await page.waitForTimeout(250);
        // Coach calls (#350 X3) on screen and tappable with Settings open: two taps from Office's tab.
        // At Normal that must hold; at Large and Larger, and at 568×320 (its Settings is taller than the
        // screen), the popup may scroll to it, which is noted.
        const reach = await reachProblems(page, '.nrl-settings-modal', ['.nrl-switch[aria-label="Coach calls"]']);
        const out = size === 'normal' && !settingsScroll ? reach : [];
        rec.notes.push(reach.length ? `Coach calls: ${reach.join('; ')}` : 'Coach calls on screen, two taps from OFFICE');
        await page.screenshot({ path: join(OUT, `settings-${size}.png`) }).catch(() => {});
        await press('.nrl-settings-modal .nrl-screen-x');
        await page.waitForTimeout(250);
        const attr = await page.evaluate(() => document.documentElement.getAttribute('data-text-size'));
        if ((attr ?? 'normal') !== size) out.push(`<html data-text-size> is ${attr}`);
        if (!(await page.locator('.nrl-nav [data-screen="squad"] .nrl-nav-dot').count())) out.push("Squad's dot not showing");
        rec.notes.push(`text size ${size}`);
        return out;
      });
      for (const st of DOCK_STATES) {
        await step(`${size}-${st.name}`, async (rec) => {
          await home();
          if (st.open === 'office') await press('.nrl-nav [data-nav-more]');
          else if (st.open === 'staff') {
            // Staff & Board (#359): two taps, OFFICE then its tile.
            await press('.nrl-nav [data-nav-more]');
            await press('.nrl-nav-sheet [data-screen="staff"]');
            await page.waitForSelector('.nrl-screen-region[data-screen-key="staff"]');
          } else if (st.open) await press(`.nrl-nav > .nrl-btn[data-screen="${st.open}"]`);
          await page.waitForTimeout(300);
          const d = await dockProblems(page, st.marked, safe);
          const out = [...d.problems];
          rec.notes.push(d.note);
          // Spoken names (the accessibility tree): each tab's name, and the alerts; aria-current marks the open one.
          const tree = await tabNames();
          const label = { club: 'Club', squad: 'Squad', fixtures: 'League', build: 'Build', office: 'Office' }[st.marked];
          // The snapshot is `- button "<name>": <its text>`; only the quoted names are what a screen reader says.
          const names = [...tree.matchAll(/button "([^"]*)"/g)].map((m) => m[1]);
          const lit = page.locator('.nrl-nav > .nrl-btn[aria-current="page"]');
          if (st.open !== 'office' && !((await lit.getAttribute('aria-label')) ?? '').startsWith(label)) out.push(`the open tab reads "${await lit.getAttribute('aria-label')}", not ${label}`);
          if (names.some((x) => /current/i.test(x))) out.push(`a name says "current": ${names.join(' | ')}`);
          if (st.open === 'office' && !/"Office[^"]*" \[expanded\]/.test(tree)) out.push('OFFICE not expanded with its sheet up');
          if (!names.some((x) => /^Squad\b.*contracts? ends? within 4 weeks$/.test(x))) out.push("Squad's spoken name doesn't carry its dot");
          if (names.some((x) => /▴|[A-Z]{4}/.test(x))) out.push(`a tab reads out its caps or ▴: ${names.join(' | ')}`);
          if (st.open === 'staff' && (await page.locator('.nrl-nav-sheet [data-screen="staff"]').getAttribute('aria-current')) !== 'page') out.push("Staff & Board's tile isn't marked");
          return out;
        });
        if (st.name === 'squad') {
          await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
          await page.screenshot({ path: join(OUT, `greyscale-${size}.png`) }).catch(() => {});
          await page.evaluate(() => { document.documentElement.style.filter = ''; });
        }
      }
    }
    // The longest PLAY WEEKs there are, beside the widest tab (OFFICE ▴ with its count): a parked match
    // with decisions waiting and a long opponent, and a run of weeks with STOP. The sub-line gives way
    // first, then (RESUME MATCH at Larger, 16px short at 667) tab labels ellipsize, noted: nothing
    // overlaps or leaves the screen, every tab stays 44px, PLAY WEEK's label stays whole.
    // Drawn the way hud.ts draws them; the next state change puts the real one back.
    for (const [name, label, sub, stop] of [
      ['larger-resume', 'RESUME MATCH ▸<span class="nrl-hud-alert">3</span>', 'v Wentworthville Wanderers · away', false],
      ['larger-advancing', 'WEEK 27 OF 27…', '', true],
    ]) {
      await step(name, async (rec) => {
        await home();
        await press('.nrl-nav [data-nav-more]');
        await page.evaluate(([label, sub, stop]) => {
          document.querySelector('.nrl-dock-advance-label').innerHTML = label;
          const s = document.querySelector('.nrl-dock-advance-sub');
          s.textContent = sub;
          s.hidden = stop;
          document.querySelector('.nrl-hud-menu-toggle').hidden = stop;
          document.querySelector('.nrl-hud-stop').hidden = !stop;
        }, [label, sub, stop]);
        await page.waitForTimeout(300);
        const d = await dockProblems(page, 'office', safe, true);
        rec.notes.push(d.note);
        return d.problems;
      });
    }

    for (const e of report.errors) log(`  error: ${e}`);
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    await ctx.close();
    failed += report.steps.filter((s) => !s.ok).length + report.errors.length;
  }
  return failed;
}

/**
 * The phone play-test's guards (Wave 4 prompt 09, #399), at 667×375 (the narrowest
 * landscape phone): at Large and Larger text the ladder's places read in full, "10"
 * to "16" and not "1…" (its first column was 24px at every size, #410). Then back to
 * Normal, and two matches in one session at ×8: the half-time card comes up in both
 * (Phaser kept the first match's "card shown" for the second, so it never did, #408).
 */
async function runPlaytest(browser) {
  const [W, H] = [667, 375];
  const OUT = join(OUT_ROOT, 'webkit', `playtest-${W}x${H}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: `${W}x${H}`, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} playtest ${W}x${H} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  /** Settings' Text size, as tapped: OFFICE, the Settings tile, the size, then the popup's ✕. */
  const textSize = async (size) => {
    if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
    await openNav(page, 'settings');
    await page.locator(`.nrl-settings-seg [data-seg="${size}"]`).tap();
    await page.locator('.nrl-modal .nrl-screen-x').first().tap();
  };

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-start]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
  });
  for (const size of ['large', 'larger']) {
    await step(`ladder-${size}`, async (rec) => {
      await textSize(size);
      await openNav(page, 'fixtures');
      await page.waitForSelector('.nrl-ladder-table .nrl-ladder-pos');
      const places = await page.locator('.nrl-ladder-table .nrl-ladder-pos').evaluateAll((tds) =>
        tds.map((td) => ({ text: td.textContent, cut: td.scrollWidth > td.clientWidth + 1 })));
      rec.notes.push(`${places.length} places`);
      const cut = places.filter((p) => p.cut).map((p) => p.text);
      return [
        ...(cut.length ? [`places cut short: ${cut.join(', ')}`] : []),
        ...(places.some((p) => p.text === '10') ? [] : ['no 10th place on the ladder']),
      ];
    });
  }
  await step('text-normal', () => textSize('normal'));
  for (const m of [1, 2]) {
    await step(`half-time-match-${m}`, async (rec) => {
      if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let i = 0; i < 2; i++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        if (await ask.count()) await ask.first().tap();
      }
      await page.waitForSelector('.nrl-mo-controls', { timeout: 20000 });
      await page.locator('.nrl-mo-controls [data-speed="8"]').tap();
      // The card, or the second half under way without it. A half at ×8 is about a minute; room for a slow runner.
      const seen = await page.waitForFunction(() => {
        if (document.querySelector('.nrl-mo-plan')) return 'card';
        const pb = window.__nrlGame?.scene.getScene('Match')?.playback;
        return pb && pb.half >= 2 && pb.breakKind !== 'half-time' ? 'missed' : null;
      }, null, { timeout: 300000, polling: 50 }).then((h) => h.jsonValue());
      rec.notes.push(seen === 'card' ? 'half-time card up' : 'second half kicked off with no card');
      if (seen === 'card') await page.locator('.nrl-mo-plan .nrl-mo-plan-go').tap();
      await page.locator('.nrl-mo-skip').tap();
      await page.locator('.nrl-mo-skip').tap();
      await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 30000 });
      await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      return seen === 'card' ? [] : [`match ${m}: no half-time card`];
    });
  }

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

// ── The flow fixes, end to end (#350) ────────────────────────────────────────
// At 667×375 and at an iPhone SE's 568×320, with Settings › Text size on Larger
// (E2E_FLOW="844x390@normal …" for others), a career played the way #350 found it awkward:
//   - T1: the new club's setup with Start whole and the build label clear of it;
//   - X3: Coach calls and Rival matches in Settings, 44px rows;
//   - H1: "v Darwin · away" under PLAY WEEK and the decisions badge;
//   - the ▾ menu over an open decision card: its items take the tap, not the card;
//   - H3: To season end asks "Play n weeks?" (with a toast up), Cancel plays
//     nothing, and with a card waiting the ask says it instead; ×4 never asks;
//   - N4: ×4 runs until one stops on a new card, which opens in place; once
//     answered, Keep advancing (whole, with a toast up) carries on to the same end;
//   - F1: Staff & Board from Office, objectives beside the staff;
//   - F3: Renew leaves the rows where they were, "Renewed ✓" in place, and a
//     second tap on the same spot renews nobody else; the table fits the sheet,
//     with SELL armed ("Really sell?") too, and ◂ FINANCE stays clear of the title;
//   - T2: after a reload, New game on the slot asks "Start over? This replaces …"
//     and Cancel keeps it. The title is at Normal whatever the save says: the text
//     size is a save's setting, put on the page once a slot is picked.
const FLOW_RUNS = (process.env.E2E_FLOW ?? '667x375@larger 568x320@larger').split(/\s+/).filter(Boolean).map((s) => {
  const [size, text] = s.split('@');
  const [w, h] = size.split('x').map(Number);
  return { w, h, text: text ?? 'larger' };
});

/** Each selector's first shown element: on screen, at least 44px tall (`tall`), and what a tap at its middle hits. */
function flowReach(page, sels, tall = true) {
  return page.evaluate(([sels, tall]) => {
    const W = innerWidth, H = innerHeight, out = [];
    for (const sel of sels) {
      const e = [...document.querySelectorAll(sel)].find((x) => x.getBoundingClientRect().width > 0);
      if (!e) { out.push(`${sel} not shown`); continue; }
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) { out.push(`${sel} off screen (${Math.round(r.top)}–${Math.round(r.bottom)} of ${H})`); continue; }
      if (tall && r.height < 43.5) out.push(`${sel} ${Math.round(r.height)}px tall`);
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!hit || !e.contains(hit)) out.push(`${sel} covered (a tap hits ${hit?.className || hit?.tagName})`);
    }
    return out;
  }, [sels, tall]);
}

async function runFlow(browser, { w: W, h: H, text }) {
  const tag = `${W}x${H}-${text}`;
  const OUT = join(OUT_ROOT, 'webkit', `flow-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  // No closeWeekSummary here: the weekly card must wait behind a decision card on its own.
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
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
      stop = true; // the steps after it start from where it left off
    }
    rec.file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: join(OUT, rec.file) }).catch(() => {});
    report.steps.push(rec);
    log(`${rec.ok ? 'ok ' : 'FAIL'} flow ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const tap = (sel) => page.locator(sel).first().tap();
  /** The screen as the step checked it (the step's own shot is taken after it tidies up). */
  const shot = (name) => page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
  const week = () => page.evaluate(() => window.__nrlState().week);
  const idle = () => page.waitForFunction(() => !document.querySelector('.nrl-dock[data-advancing]'), null, { timeout: 120000 });
  const toast = (t) => page.evaluate((t) => window.__nrlNotify({ text: t, kind: 'info', ms: 60000 }), t);
  const clearToasts = async () => {
    for (let i = 0; i < 20 && (await page.locator('.nrl-toast:not(:has(.nrl-toast-btn))').count()); i++) {
      await page.locator('.nrl-toast').first().tap({ timeout: 2000 }).catch(() => {});
    }
  };
  /** Back to the bare grounds: the weekly card closed, no sheet, no dialog. */
  const club = async () => {
    for (let i = 0; i < 3; i++) {
      if (await page.locator('[data-summary-close]').count()) await tap('[data-summary-close]');
      else if (await page.locator('.nrl-dialog-region .nrl-screen-x').count()) await tap('.nrl-dialog-region .nrl-screen-x');
      else if (await page.locator('.nrl-screen-region').count()) await tap(SHEET_EXIT);
      else break;
      await page.waitForTimeout(150);
    }
  };
  const menuPick = async (label) => {
    await tap('.nrl-hud-menu-toggle');
    await page.locator('.nrl-hud-menu-item', { hasText: label }).tap();
  };
  /** Answer every card in the popup with its first choice. */
  const answerAll = async () => {
    for (let i = 0; i < 4 && (await page.locator('[data-decisions] [data-event-choice]').count()); i++) {
      await tap('[data-decisions] [data-event-choice]');
      await page.waitForTimeout(150);
    }
  };

  await step('t1-setup', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.waitForTimeout(250);
    const out = await flowReach(page, ['[data-nrl-clubname]', '[data-nrl-start]']);
    out.push(...await page.evaluate(() => {
      const b = document.querySelector('[data-nrl-build]')?.getBoundingClientRect();
      const p = document.querySelector('.nrl-title-setup')?.getBoundingClientRect();
      if (!b || !p) return ['no build label or setup panel'];
      return b.right > p.left && b.left < p.right && b.bottom > p.top && b.top < p.bottom ? ['the build label overlaps the setup panel'] : [];
    }));
    await shot('t1-at-check');
    await page.fill('[data-nrl-clubname]', 'Flow FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-tutorial-skip');
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    await club();
    return out;
  });
  await step('x3-settings', async (rec) => {
    await clearToasts();
    await openNav(page, 'settings');
    await page.waitForSelector('.nrl-settings-modal');
    if (text !== 'normal') await tap(`.nrl-settings-textsize [data-seg="${text}"]`);
    await page.waitForTimeout(250);
    rec.notes.push(`root font ${await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)}`);
    const out = [];
    for (const sel of ['.nrl-live-toggle:not(.nrl-rivals-toggle):not(.nrl-moments-toggle)', '.nrl-rivals-toggle']) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      out.push(...await flowReach(page, [sel]));
    }
    await shot('x3-at-check');
    await openNav(page, 'fixtures').catch(() => {});
    await page.waitForTimeout(250);
    if (await page.locator('.nrl-screen-region input[type="checkbox"]').count()) out.push('a checkbox is still in Fixtures');
    await club();
    return out;
  });
  await step('h1-next-match', async (rec) => {
    await clearToasts();
    const sub = (await page.locator('[data-hud="next"]').textContent()) ?? '';
    rec.notes.push(`"${sub}"`);
    const out = /^v .+ · (home|away)$/.test(sub) ? [] : [`PLAY WEEK's line reads "${sub}"`];
    out.push(...await page.evaluate(() => {
      const s = document.querySelector('[data-hud="next"]');
      return s && s.scrollWidth > s.clientWidth + 1 ? ['the next-match line is cut off'] : [];
    }));
    await page.evaluate(() => window.__nrlShowCard('fanDay'));
    await page.waitForSelector('[data-hud="decisions"]');
    const badge = await page.locator('[data-hud="decisions"]').textContent();
    if (badge !== '1') out.push(`the decisions badge reads "${badge}"`);
    out.push(...await flowReach(page, ['[data-hud="advance"]', '.nrl-hud-menu-toggle']));
    await shot('h1-at-check');
    return out;
  });
  // The ▾ over a decision card: the menu rises above the card, so a pick never lands on a choice.
  await step('menu-over-card', async () => {
    await tap('[data-decisions-chip] .nrl-decisions-review');
    await page.waitForSelector('[data-decisions] [data-event-choice]');
    await tap('.nrl-hud-menu-toggle');
    await page.waitForTimeout(200);
    const out = await flowReach(page, ['.nrl-hud-menu-item:nth-child(1)', '.nrl-hud-menu-item:nth-child(2)', '.nrl-hud-menu-item:nth-child(3)']);
    await shot('menu-at-check');
    await page.keyboard.press('Escape');
    return out;
  });
  // H3 with the card still waiting: the ask stands in for the confirm and says how long the run is.
  await step('h3-ask-says-length', async (rec) => {
    await club();
    const w0 = await week();
    await menuPick('To season end');
    await page.waitForSelector('[data-advance-ask]');
    const q = (await page.locator('[data-ask-question]').textContent().catch(() => '')) ?? '';
    rec.notes.push(`"${q}"`);
    const out = /^Play \d+ weeks\? It stops for decisions\.$/.test(q) ? [] : [`the ask says "${q}", not how long the run is`];
    out.push(...await flowReach(page, ['[data-ask-answer]', '[data-ask-proceed]']));
    await shot('h3-ask-at-check');
    await tap('.nrl-decisions-modal .nrl-screen-x');
    if ((await week()) !== w0) out.push('closing the ask played weeks');
    // Answer it, so the next pick confirms on its own.
    await tap('[data-decisions-chip] .nrl-decisions-review');
    await answerAll();
    return out;
  });
  await step('h3-confirm', async (rec) => {
    await club();
    await clearToasts();
    const w0 = await week();
    await menuPick('To season end');
    await page.waitForSelector('[data-advance-confirm]');
    await toast('Geelong Gulls sign 61-rated lock Lachie Brimson.');
    await page.waitForTimeout(400);
    const q = (await page.locator('[data-advance-confirm] h2').textContent()) ?? '';
    rec.notes.push(`"${q}"`);
    const out = /^Play \d+ weeks\? It stops for decisions\.$/.test(q) ? [] : [`the confirm reads "${q}"`];
    out.push(...await flowReach(page, ['[data-confirm-advance]', '[data-advance-confirm] .nrl-btn:not([data-confirm-advance])']));
    out.push(...await flowReach(page, ['.nrl-decisions-modal .nrl-screen-x'], false));
    await shot('h3-confirm-at-check');
    await tap('[data-advance-confirm] .nrl-btn:not([data-confirm-advance])');
    await page.waitForTimeout(400);
    if ((await week()) !== w0) out.push('Cancel played weeks');
    if (await page.locator('[data-advance-confirm]').count()) out.push('the confirm is still up after Cancel');
    await clearToasts();
    return out;
  });
  await step('f1-staff-board', async () => {
    await openNav(page, 'staff');
    await page.waitForSelector('.nrl-board');
    await page.waitForTimeout(400); // the sheet slides in
    const out = [];
    if (!(await page.locator('.nrl-board-obj, .nrl-board-empty').count())) out.push('no board objectives on Staff & Board');
    if (!(await page.locator('.nrl-staff-row').count())) out.push('no staff rows on Staff & Board');
    out.push(...await flowReach(page, ['.nrl-staff-row .nrl-btn']));
    await shot('f1-at-check');
    await club();
    return out;
  });
  // N4: ×4 (which never asks) until a run stops on a new card. A card drawn in a week that
  // also stopped for something else waits; the next run asks, and is answered from the ask.
  await step('n4-card-in-place', async (rec) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      await club();
      await clearToasts();
      const from = await week();
      if (from > 23) break;
      await menuPick('×4 weeks');
      await page.waitForTimeout(200);
      if (await page.locator('[data-advance-confirm]').count()) {
        out.push('×4 weeks asked to confirm');
        await tap('[data-confirm-advance]');
      }
      if (await page.locator('[data-advance-ask]').count()) {
        await tap('[data-ask-answer]');
        await answerAll();
        await tap('[data-keep-advancing]');
      }
      await idle();
      await page.waitForTimeout(400);
      if (!(await page.locator('[data-decisions] .nrl-event-card').count())) continue;
      if (await page.locator('[data-week-summary]').count()) out.push('the weekly summary is up with the card');
      const at = await week();
      const left = 4 - (at - from);
      rec.notes.push(`W${from} → stopped at W${at} on "${await page.locator('[data-decisions] .nrl-event-title').first().textContent()}"`);
      // The card scrolls inside its frame (#336): at 568×320 Larger a long card's choices start
      // below the fold, so scroll to the first as a player would, then it must be whole.
      await page.locator('[data-decisions] [data-event-choice]').first().scrollIntoViewIfNeeded();
      out.push(...await flowReach(page, ['[data-decisions] [data-event-choice]']));
      await shot('n4-card');
      await answerAll();
      await page.waitForSelector('[data-keep-advancing]');
      await toast('Signed Jack Taufa from the player pool, on a two-year deal');
      await page.waitForTimeout(400);
      const label = await page.locator('[data-keep-advancing]').textContent();
      await page.locator('[data-keep-advancing]').scrollIntoViewIfNeeded();
      const want = `Keep advancing (${left === 1 ? '1 week' : `${left} weeks`})`;
      if (label !== want) out.push(`Keep advancing reads "${label}", want "${want}"`);
      out.push(...await flowReach(page, ['[data-keep-advancing]']));
      await shot('n4-keep-advancing');
      const stopsBefore = await page.evaluate(() => [...document.querySelectorAll('.nrl-toast-text')].map((t) => t.textContent));
      await tap('[data-keep-advancing]');
      await page.waitForTimeout(200);
      if (await page.locator('[data-advance-confirm], [data-advance-ask]').count()) out.push('Keep advancing asked again');
      await idle();
      await page.waitForTimeout(400);
      const end = await week();
      // The run's own stop toast, not the one from the stop before it.
      const stopped = await page.evaluate((seen) => [...document.querySelectorAll('.nrl-toast-text')].map((t) => t.textContent).find((t) => t.startsWith('Stopped after') && !seen.includes(t)) ?? '', stopsBefore);
      rec.notes.push(`Keep advancing → W${end}${stopped ? ` (${stopped})` : ''}`);
      // Another stop (a card, an injury, a contract) ends it early by design; otherwise it reaches the same end.
      if (end !== from + 4 && !stopped && !(await page.locator('[data-decisions] .nrl-event-card').count())) out.push(`Keep advancing ended at W${end}, want W${from + 4}`);
      return out;
    }
    return [...out, 'no ×4 run stopped on a new card'];
  });
  await step('f3-contracts-hold', async () => {
    await club();
    await clearToasts();
    await openNav(page, 'contracts');
    await page.waitForSelector('[data-contract-renew]');
    await page.waitForTimeout(400); // the sheet slides in
    const rows = () => page.evaluate(() => [...document.querySelectorAll('.nrl-contracts-table tbody tr')].map((r) => {
      const b = r.querySelector('[data-contract-renew]')?.getBoundingClientRect();
      return { id: r.getAttribute('data-contract') ?? r.getAttribute('data-contract-gone'), top: Math.round(r.getBoundingClientRect().top), btn: b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null };
    }));
    const before = await rows();
    const first = before.find((r) => r.btn);
    if (!first) return ['no Renew on Contracts'];
    // The table fits the sheet at this text size: SELL whole, no sideways scroll (#350, #371).
    const out = await flowReach(page, [`[data-contract-renew="${first.id}"]`, '.nrl-contracts-table tbody tr:first-child .nrl-contract-actions .nrl-btn:last-child']);
    const wide = await page.evaluate(() => { const e = document.querySelector('.nrl-contracts-scroll'); return e.scrollWidth - e.clientWidth; });
    if (wide > 1) out.push(`the table is ${wide}px wider than the sheet`);
    const renewed = () => page.locator('[data-contract-renew]:disabled').count();
    await page.touchscreen.tap(first.btn.x, first.btn.y);
    await page.waitForTimeout(300);
    if ((await renewed()) !== 1) return [...out, `${await renewed()} rows read Renewed after one tap (money short?)`];
    const label = (await page.locator(`[data-contract-renew="${first.id}"]`).textContent()).trim();
    if (!/^RENEWED ✓$/i.test(label)) out.push(`the renewed row reads "${label}"`);
    const after = await rows();
    await shot('f3-at-check');
    if (after.map((r) => r.id).join() !== before.map((r) => r.id).join()) out.push('the rows changed order');
    const moved = after.findIndex((r, i) => Math.abs(r.top - before[i].top) > 1);
    if (moved >= 0) out.push(`row ${moved + 1} moved from ${before[moved].top} to ${after[moved].top}`);
    // The same spot again (a double tap): nobody else is renewed.
    await page.touchscreen.tap(first.btn.x, first.btn.y);
    await page.waitForTimeout(300);
    if ((await renewed()) !== 1) out.push('a second tap on the same spot renewed another player');
    // The header: ◂ FINANCE whole, and clear of CONTRACTS.
    out.push(...await page.evaluate(() => {
      const back = document.querySelector('.nrl-contracts .nrl-back');
      const title = document.querySelector('.nrl-contracts .nrl-screen-title');
      if (!back || !title) return ['no ◂ FINANCE or title on Contracts'];
      const out = [];
      if (back.scrollWidth > back.clientWidth + 1) out.push(`◂ FINANCE's label is ${back.scrollWidth - back.clientWidth}px wider than its button`);
      if (back.getBoundingClientRect().right > title.getBoundingClientRect().left + 1) out.push('◂ FINANCE runs into the title');
      return out;
    }));
    // SELL armed on the next row: "Really sell?" whole, and still no sideways scroll.
    const next = after.find((r) => r.btn && r.id !== first.id);
    if (next) {
      const sell = `[data-contract="${next.id}"] .nrl-contract-actions .nrl-btn:last-child`;
      await tap(sell);
      await page.waitForTimeout(200);
      if (!(await page.locator('.nrl-contract-armed').count())) out.push('SELL did not arm');
      out.push(...await flowReach(page, ['.nrl-contract-armed']));
      const armedWide = await page.evaluate(() => { const e = document.querySelector('.nrl-contracts-scroll'); return e.scrollWidth - e.clientWidth; });
      if (armedWide > 1) out.push(`with SELL armed the table is ${armedWide}px wider than the sheet`);
      await shot('f3-armed');
    }
    await club();
    return out;
  });
  await step('t2-overwrite-confirm', async (rec) => {
    await page.waitForTimeout(1500); // the autosave
    await page.reload();
    await page.waitForSelector('[data-nrl-new-1]');
    await tap('[data-nrl-new-1]');
    await tap('[data-nrl-start]');
    await page.waitForSelector('[data-nrl-confirm]');
    const ask = (await page.locator('[data-nrl-confirm]').textContent()) ?? '';
    rec.notes.push(`"${ask}"`, `root font ${await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)}`);
    const out = /^Start over\? This replaces Flow FC \(S\d+ W\d+\)\.$/.test(ask) ? [] : [`the confirm reads "${ask}"`];
    out.push(...await flowReach(page, ['[data-nrl-start-confirm]', '[data-nrl-start-cancel]']));
    await shot('t2-at-check');
    await tap('[data-nrl-start-cancel]');
    if (!(await page.locator('[data-nrl-start]').count())) out.push('Cancel did not bring Start back');
    await tap('[data-nrl-back]');
    await page.waitForSelector('[data-nrl-continue-1]');
    if (!/Flow FC/.test(await page.locator('[data-nrl-slot-label-1]').textContent())) out.push('the career is gone after Cancel');
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

/**
 * The play-test's large-text and tap-target fixes (Wave 4 prompt 12, #399), at 568×320
 * (an iPhone SE on its side), 667×375, 844×390 (an iPhone 14's insets) and 956×330, each
 * at Normal, Large and Larger text, from a new game:
 *   - #412: in the onboarding, the build's and the signing's Undo and ✕ are what a tap
 *     at their middle hits for the toast's whole time, and the bubble is off the toast;
 *   - #413: on every sheet with the shared header (Squad, Lineup, Recruit, Build,
 *     Contracts, History) the line beside the title is clear of the controls and a tap
 *     on it lands on it; the controls stay inside the header (they scroll);
 *   - #415, #420: on the player page no line is cut short, each column fits or scrolls,
 *     the outlook's curve keeps its height and can be scrolled into view, ◂ back and the
 *     deals are tappable; after a renewal the greyed Renew carries no price;
 *   - #422: every pitch and bench tile on Lineup is tapped over a 44px band (a tap 21px
 *     above, below and either side of its middle still lands on it), with no page scroll;
 *   - #418: the decisions chip's Review is tapped over the chip's 44px height, and the
 *     chip is clear of the board chip and the dock.
 * The text size goes on the root the way Settings puts it there (textSize.ts
 * applyTextSize), and in the save, before the first tap: the onboarding has no Settings.
 */
const TARGET_RUNS = [
  { w: 568, h: 320, safe: NO_INSETS }, { w: 667, h: 375, safe: NO_INSETS },
  { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 } }, { w: 956, h: 330, safe: NO_INSETS },
];
const HEADER_SCREENS = ['squad', 'lineup', 'recruit', 'build', 'contracts', 'history'];

/**
 * Problems with each `sel` as a finger finds it: on screen and out of the unsafe bands,
 * what a tap at its middle hits, and (`band`) what taps 21px above, below and to each side
 * of the middle hit too, which a 44px hit area round the middle takes. Each is scrolled
 * into view inside its own panel first. Runs in the page.
 */
function targetProblems(page, sel, safe, band = true) {
  return page.evaluate(([sel, safe, band]) => {
    const out = [];
    const els = [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
    if (!els.length) return [`${sel} not shown`];
    for (const e of els) {
      e.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = e.getBoundingClientRect();
      const name = `${sel} "${e.textContent.trim().slice(0, 16)}"`;
      if (r.left < safe.l - 1 || r.top < safe.t - 1 || r.right > innerWidth - safe.r + 1 || r.bottom > innerHeight - safe.b + 1) {
        out.push(`${name} off screen or unsafe (${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)})`);
        continue;
      }
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const pts = band ? [[0, 0], [0, -21], [0, 21], [-21, 0], [21, 0]] : [[0, 0]];
      const miss = pts.filter(([dx, dy]) => { const h = document.elementFromPoint(cx + dx, cy + dy); return !h || !e.contains(h); });
      if (miss.length) {
        out.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}: taps at ${miss.map(([dx, dy]) => `${dx},${dy} hit ${document.elementFromPoint(cx + dx, cy + dy)?.className || '?'}`).join('; ')}`);
      }
    }
    return out;
  }, [sel, safe, band]);
}

async function runLargeTextTargets(browser) {
  let failed = 0;
  for (const { w: W, h: H, safe } of TARGET_RUNS) {
    const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
    const OUT = join(OUT_ROOT, 'webkit', `targets-${tag}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const report = { size: tag, safe, steps: [], errors: [] };
    for (const size of ['normal', 'large', 'larger']) {
      // A fresh context each: a new game with its onboarding, not the last one's save.
      const ctx = await browser.newContext({
        viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
      });
      await ctx.addInitScript(closeWeekSummary);
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', (e) => report.errors.push(`pageerror (${size}): ${e.message}`));
      let n = 0;
      const step = async (name, fn) => {
        n++;
        const rec = { n, size, name, ok: true, notes: [] };
        try {
          const problems = (await fn(rec)) ?? [];
          if (problems.length) { rec.ok = false; rec.notes.push(...problems); }
        } catch (err) {
          rec.ok = false;
          rec.notes.push(`threw: ${err.message.split('\n')[0]}`);
        }
        rec.file = `${size}-${String(n).padStart(2, '0')}-${name}.png`;
        await page.screenshot({ path: join(OUT, rec.file) }).catch(() => {});
        report.steps.push(rec);
        log(`${rec.ok ? 'ok ' : 'FAIL'} targets ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
      };
      const home = async () => {
        await page.keyboard.press('Escape');
        if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
        await page.waitForTimeout(150);
      };
      /** Close every toast on show: an info toast closes on a tap, an Undo on its ✕. */
      const clearToasts = () => page.evaluate(() => {
        for (const t of document.querySelectorAll('.nrl-toast')) (t.querySelector('.nrl-toast-x') ?? t).click();
      });
      /** Undo and ✕ on the toast on show, over its 5 s: each what a tap at its middle hits, the bubble off the toast. */
      const undoClear = async (rec, what) => {
        await page.waitForSelector('.nrl-toast-action .nrl-toast-btn', { state: 'visible' });
        const shown = Date.now();
        const out = [];
        // From its first frame to most of its 5 s (timed from when it showed: the checks take time too).
        for (const at of [150, 1000, 2500, 3800]) {
          await page.waitForTimeout(Math.max(0, at - (Date.now() - shown)));
          if (!(await page.locator('.nrl-toast-action').count())) { out.push(`${what}: the Undo toast went before ${at} ms`); break; }
          out.push(...(await targetProblems(page, '.nrl-toast-action :is(.nrl-toast-btn, .nrl-toast-x)', safe, false)).map((p) => `${what} at ${at} ms: ${p}`));
          const over = await page.evaluate(() => {
            const b = document.querySelector('.nrl-tutorial-bubble:not([data-aside])')?.getBoundingClientRect();
            const t = document.querySelector('.nrl-toast-action')?.getBoundingClientRect();
            return !!b && !!t && !(b.right <= t.left || b.left >= t.right || b.bottom <= t.top || b.top >= t.bottom);
          });
          if (over) out.push(`${what} at ${at} ms: the bubble is over the toast`);
        }
        const aside = await page.locator('.nrl-tutorial-bubble[data-aside]').count();
        rec.notes.push(`${what}: Undo and ✕ clear for its time${aside ? ' (the bubble stood aside)' : ''}`);
        // Close it if it is still up (a slow runner may be past its 5 s).
        await page.evaluate(() => document.querySelector('.nrl-toast-action .nrl-toast-x')?.click());
        return out;
      };

      await step('new-game', async (rec) => {
        await page.goto(BASE);
        await page.waitForSelector('[data-nrl-start]');
        await page.evaluate((s) => {
          const st = document.documentElement.style;
          for (const k of ['l', 't', 'r', 'b']) st.setProperty(`--nrl-safe-${k}`, `${s[k]}px`);
        }, safe);
        await page.fill('[data-nrl-clubname]', 'Targets FC');
        await page.locator('[data-nrl-start]').tap();
        await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
        await page.evaluate((size) => {
          window.__nrlState().settings.textSize = size;
          const root = document.documentElement;
          if (size === 'normal') return;
          root.setAttribute('data-text-size', size);
          root.style.setProperty('--nrl-text-scale', size === 'large' ? '1.15' : '1.3');
        }, size);
        rec.notes.push(`text size ${size}`);
      });
      // #412: Build here, then the step-2 bubble comes up with the build's Undo toast.
      await step('onboarding-build-undo', async (rec) => {
        await page.waitForTimeout(700); // the tutorial's anchor poll (500 ms) settles the bubble
        await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
        await page.waitForSelector('.nrl-placebar:not([hidden])');
        await page.locator('.nrl-placebar [data-place-go]').tap(); // the ghost starts on a free spot (#395)
        return undoClear(rec, 'build');
      });
      await step('onboarding-sign-undo', async (rec) => {
        await page.waitForSelector('.nrl-tutorial-bubble[data-step="recruit"]');
        await page.waitForTimeout(700);
        await page.locator('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)').first().tap();
        await page.waitForSelector('.nrl-tutorial-bubble[data-step="advance"]');
        return undoClear(rec, 'signing');
      });
      await step('skip-tutorial', async () => {
        await page.locator('.nrl-tutorial-skip').tap();
        await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
        await page.waitForTimeout(300);
        await clearToasts();
      });
      // #413: the line beside the title is clear of the controls on every sheet with the shared header.
      for (const id of HEADER_SCREENS) {
        await step(`header-${id}`, async (rec) => {
          await home();
          await openNav(page, id);
          await page.waitForSelector(`.nrl-screen-region[data-screen-key="${id}"] .nrl-screen-head`);
          await page.waitForTimeout(250);
          const r = await page.evaluate(() => {
            const head = document.querySelector('.nrl-screen-region .nrl-screen-head');
            const sub = head.querySelector('.nrl-screen-sub');
            const tools = head.querySelector('.nrl-screen-tools');
            const hr = head.getBoundingClientRect();
            const tr = tools.getBoundingClientRect();
            const out = [];
            if (tr.right > hr.right + 1) out.push(`the controls run past the header (${Math.round(tr.right)} > ${Math.round(hr.right)})`);
            if (!sub) return { out, note: 'no line' };
            const sr = sub.getBoundingClientRect();
            for (const c of tools.children) {
              const cr = c.getBoundingClientRect();
              if (cr.width && sr.right > Math.max(cr.left, tr.left) + 1 && sr.left < cr.right) out.push(`the line (to ${Math.round(sr.right)}) runs under ${c.textContent.trim()} (from ${Math.round(Math.max(cr.left, tr.left))})`);
            }
            const hit = document.elementFromPoint(sr.left + Math.min(20, sr.width / 2), (sr.top + sr.bottom) / 2);
            if (!hit || !sub.contains(hit)) out.push(`a tap on the line hits ${hit?.className || '?'}`);
            if (sr.width < 40) out.push(`the line is ${Math.round(sr.width)}px wide`);
            return { out, note: `"${sub.textContent.trim().slice(0, 24)}…" ${Math.round(sr.width)}px, controls ${tools.scrollWidth > tools.clientWidth + 1 ? 'scroll' : 'fit'}` };
          });
          rec.notes.push(r.note);
          return r.out;
        });
      }
      // #415, #420: the player page at this size.
      await step('player-page', async (rec) => {
        await home();
        await openNav(page, 'squad');
        await page.waitForTimeout(300);
        // On his name (a trait chip in the middle of a narrow row has its own tip). A tap during a
        // re-render (a toast, the week's news) can miss the row: once more if so.
        for (let i = 0; i < 2 && !(await page.locator('[data-player-page]').count()); i++) {
          await page.locator('.nrl-grid-body > .nrl-row .nrl-row-name').first().tap();
          await page.waitForSelector('[data-player-page]', { state: 'attached', timeout: 3000 }).catch(() => {});
        }
        await page.waitForSelector('[data-player-page]', { state: 'attached' });
        await page.waitForTimeout(250);
        const out = await page.evaluate(() => {
          const out = [];
          for (const d of document.querySelectorAll('.nrl-player-why > div, .nrl-player-line, .nrl-player-trait, .nrl-player-deal, .nrl-player-outlook-text > *')) {
            if (d.scrollWidth > d.clientWidth + 1) out.push(`"${d.textContent.slice(0, 30)}" cut short (${d.scrollWidth}>${d.clientWidth})`);
          }
          for (const c of document.querySelectorAll('.nrl-player > *')) {
            const oy = getComputedStyle(c).overflowY;
            if (c.scrollHeight > c.clientHeight + 1 && oy !== 'auto' && oy !== 'scroll') out.push(`${c.className}: ${c.scrollHeight - c.clientHeight}px cut off, no scroll`);
          }
          const curve = document.querySelector('.nrl-player-curve');
          curve.scrollIntoView({ block: 'nearest' });
          const cr = curve.getBoundingClientRect();
          const col = document.querySelector('.nrl-player-about').getBoundingClientRect();
          if (cr.height < 30) out.push(`the outlook's curve is ${Math.round(cr.height)}px tall`);
          if (cr.top < col.top - 1 || cr.bottom > col.bottom + 1) out.push('the outlook cannot be scrolled into view');
          return out;
        });
        out.push(...await targetProblems(page, '[data-player-page] :is(.nrl-back, [data-player-action])', safe, false));
        // #420: renew him (to a full-length deal); the greyed Renew then carries no price.
        const renew = page.locator('[data-player-action="renew"]');
        if (await renew.isEnabled()) {
          await renew.tap();
          await page.waitForTimeout(200);
        }
        const label = (await renew.textContent()).trim();
        if (!(await renew.isDisabled())) out.push(`Renew still open after a renewal ("${label}")`);
        else if (label !== 'Renew') out.push(`the greyed Renew reads "${label}"`);
        rec.notes.push(`greyed Renew reads "${label}"`);
        await page.locator('[data-player-page] .nrl-back').tap();
        await clearToasts();
        return out;
      });
      // #422: every tile on Lineup over a 44px band, the first-visit hint up and then gone.
      await step('lineup-tiles', async (rec) => {
        await home();
        await openNav(page, 'lineup');
        await page.waitForSelector('.nrl-lineup-field .nrl-lineup-tile');
        await page.waitForTimeout(250);
        const out = (await targetProblems(page, '.nrl-lineup-tile', safe)).map((p) => `hint up: ${p}`);
        if (await page.locator('.nrl-hint-x').count()) await page.locator('.nrl-hint-x').tap();
        await page.waitForTimeout(150);
        out.push(...await targetProblems(page, '.nrl-lineup-tile', safe));
        const scroll = await page.evaluate(() => [document.scrollingElement.scrollHeight > innerHeight + 1, document.scrollingElement.scrollWidth > innerWidth + 1]);
        if (scroll[0] || scroll[1]) out.push('the page scrolls');
        rec.notes.push(`${await page.locator('.nrl-lineup-tile').count()} tiles`);
        return out;
      });
      // #418: the decisions chip on the grounds.
      await step('decisions-chip', async (rec) => {
        await home();
        if (!(await page.evaluate(() => window.__nrlShowCard?.('baliTrip')))) throw new Error('card hook failed');
        await page.waitForSelector('[data-decisions-chip]:not([hidden]) .nrl-decisions-review');
        await page.waitForTimeout(250);
        const out = await targetProblems(page, '[data-decisions-chip] .nrl-decisions-review', safe);
        out.push(...await page.evaluate(() => {
          const a = document.querySelector('[data-decisions-chip]').getBoundingClientRect();
          return ['.nrl-board-chip:not([hidden])', '.nrl-dock'].filter((s) => {
            const b = document.querySelector(s)?.getBoundingClientRect();
            return b && b.width > 0 && !(b.bottom <= a.top || b.top >= a.bottom || b.right <= a.left || b.left >= a.right);
          }).map((s) => `the chip overlaps ${s}`);
        }));
        const box = await page.locator('[data-decisions-chip] .nrl-decisions-review').boundingBox();
        rec.notes.push(`Review ${Math.round(box.width)}×${Math.round(box.height)}, tapped over the chip's 44px`);
        return out;
      });
      await ctx.close();
    }
    for (const e of report.errors) log(`  error: ${e}`);
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    failed += report.steps.filter((s) => !s.ok).length + report.errors.length;
  }
  return failed;
}

// ── The ladder's form column at every text size (#426) ──────────────────────
/**
 * Five rounds played as tapped at 844×390 (each match skipped to full time), then the
 * League at 844×390 and 956×330 at Normal, Large and Larger, set in Settings: every
 * club's form shows five pips, each inside its cell's padding, with no cell cut short
 * (at 84px the fifth pip ran 2px over and showed cut, #426), and every club name whole.
 * At 667×375 the column is hidden (760px and under), so it is not checked there.
 */
const LADDER_FORM_SIZES = [[844, 390], [956, 330]];

async function runLadderForm(browser) {
  const OUT = join(OUT_ROOT, 'webkit', 'ladder-form');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { steps: [], errors: [] };
  const [W0, H0] = LADDER_FORM_SIZES[0];
  const ctx = await browser.newContext({
    viewport: { width: W0, height: H0 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} ladder-form ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const home = async () => {
    if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
  };

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-start]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
  });
  await step('five-rounds', async (rec) => {
    // A bye or a forfeit plays no match: weeks until every club has five results (eight at most).
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => Math.min(...window.__nrlState().league.ladder.map((r) => r.played)) >= 5)) break;
      const at = await page.evaluate(() => window.__nrlState().week);
      await home();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let j = 0; j < 2; j++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        await page.waitForTimeout(300);
        if (await ask.count()) await ask.first().tap();
      }
      const what = await page.waitForFunction((a) => (document.querySelector('.nrl-mo-controls') ? 'match'
        : window.__nrlState().week !== a ? 'week' : null), at, { timeout: 20000 }).then((h) => h.jsonValue());
      if (what === 'match') {
        const go = page.locator('.nrl-mo-plan .nrl-mo-plan-go');
        if (await go.count()) await go.first().tap();
        await page.locator('.nrl-mo-controls [data-pause]').tap();
        await page.locator('.nrl-mo-sheet [data-skip]').tap();
        await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 30000 });
        await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      }
      await page.waitForFunction((a) => window.__nrlState().week !== a, at, { timeout: 60000 });
    }
    const played = await page.evaluate(() => Math.min(...window.__nrlState().league.ladder.map((r) => r.played)));
    rec.notes.push(`every club has played ${played}`);
    return played >= 5 ? [] : [`only ${played} rounds played`];
  });
  for (const [W, H] of LADDER_FORM_SIZES) {
    await page.setViewportSize({ width: W, height: H });
    for (const size of ['normal', 'large', 'larger']) {
      await step(`ladder-${W}x${H}-${size}`, async (rec) => {
        // Settings' Text size, as tapped (OFFICE, the Settings tile, the size, ✕), then League.
        await home();
        await openNav(page, 'settings');
        await page.locator(`.nrl-settings-seg [data-seg="${size}"]`).tap();
        await page.locator('.nrl-modal .nrl-screen-x').first().tap();
        await openNav(page, 'fixtures');
        await page.waitForSelector('.nrl-ladder-table td.nrl-ladder-form .nrl-form i');
        await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
          const out = [];
          const cells = [...document.querySelectorAll('.nrl-ladder-table tbody td.nrl-ladder-form')];
          for (const td of cells) {
            const club = td.closest('tr').querySelector('.nrl-ladder-name').textContent.trim();
            const pips = [...td.querySelectorAll('.nrl-form i')];
            const cr = td.getBoundingClientRect();
            const cs = getComputedStyle(td);
            const [left, right] = [cr.left + parseFloat(cs.paddingLeft), cr.right - parseFloat(cs.paddingRight)];
            const cut = pips.filter((i) => { const ir = i.getBoundingClientRect(); return ir.width < 1 || ir.left < left - 0.5 || ir.right > right + 0.5; });
            if (pips.length !== 5) out.push(`${club}: ${pips.length} pips`);
            if (cut.length) out.push(`${club}: pip ${pips.indexOf(cut[0]) + 1} cut (to ${Math.round(cut[0].getBoundingClientRect().right)}, the cell's padding at ${Math.round(right)})`);
            else if (td.scrollWidth > td.clientWidth) out.push(`${club}: the form runs ${td.scrollWidth - td.clientWidth}px past its cell`);
          }
          for (const e of document.querySelectorAll('.nrl-ladder-table tbody .nrl-ladder-club, .nrl-ladder-table tbody td.nrl-ladder-name:not(:has(button))')) {
            if (e.scrollWidth > e.clientWidth + 1) out.push(`"${e.textContent.trim()}" cut short`);
          }
          const td = cells[0];
          return { out, note: `${cells.length} rows, form cell ${td ? Math.round(td.getBoundingClientRect().width) : '?'}px` };
        });
        rec.notes.push(r.note);
        return r.out;
      });
    }
  }

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}

// Labs controls plus the tackle HUD: --controls-only runs this phase in isolation.
// E2E_CHROMIUM_PATH provides an explicit local fallback; CI always uses WebKit.
async function runLabsControls(browser) {
  const started = Date.now();
  const ctx = await browser.newContext({ viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const OUT = join(OUT_ROOT, 'webkit', 'labs-controls');
  mkdirSync(OUT, { recursive: true });
  try {
    await page.goto(`${BASE}&labs=1`);
    await page.locator('[data-nrl-start]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
    await openNav(page, 'settings');
    await page.locator('.nrl-labs-open').tap();
    await page.locator('[data-experiment="match-controls"]').check();
    await page.locator('.nrl-modal .nrl-screen-x').tap();
    if (await page.locator(SHEET_EXIT).count()) await page.locator(SHEET_EXIT).first().tap();
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
    for (let i = 0; i < 2; i++) {
      const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
      if (await ask.count()) await ask.first().tap();
    }
    await page.locator('.nrl-labs-badge').waitFor();
    await page.locator('.nrl-labs-hint').waitFor({ timeout: 25000 });
    await page.screenshot({ path: join(OUT, 'hint.png') });
    await page.locator('.nrl-labs-hint').tap();
    // A seeded first carry can end as the hint closes. Wait and send in the
    // same browser task, so this phase always swipes on his attacking set.
    await page.waitForFunction(() => {
      const match = window.__nrlGame?.scene.getScene('Match');
      const pb = match?.playback;
      if (!pb?.controlsAvailable || pb.controlAttacking !== match.live?.planSide || pb.controlPhase !== 'play') return false;
      const canvas = document.querySelector('canvas');
      const camera = match.cameras.main;
      const before = { x: camera.scrollX, y: camera.scrollY };
      for (const [type, y] of [['pointerdown', 190], ['pointermove', 160], ['pointerup', 145]]) {
        canvas.dispatchEvent(new PointerEvent(type, { clientX: 350, clientY: y, pointerId: 41, pointerType: 'mouse', bubbles: true }));
        // Feed Phaser's native mouse path too: a recognised control must not pan.
        canvas.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), {
          clientX: 350, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          view: window, bubbles: true, cancelable: true,
        }));
      }
      if (!pb.controls.at(-1)?.kind.startsWith('step-')) throw new Error('vertical swipe did not queue a step');
      if (camera.scrollX !== before.x || camera.scrollY !== before.y) throw new Error('control swipe panned the camera');
      if (!Object.keys(localStorage).filter((k) => k.startsWith('nrl-live-match-')).some((k) => JSON.parse(localStorage.getItem(k)).controls?.length)) throw new Error('attacking swipe was not recorded');
      return true;
    }, null, { timeout: 20000 });
    if (await page.locator('.nrl-mo-speed:visible').count() !== 4) throw new Error('a speed choice is hidden');
    // Reach our last tackle without assuming who receives the seeded kickoff.
    await page.waitForFunction(() => {
      const match = window.__nrlGame?.scene.getScene('Match'), pb = match?.playback;
      if (!pb?.controlsAvailable) return false;
      if (pb.controlAttacking !== match.live?.planSide || !document.querySelector('.nrl-mo-tackle-last:not([hidden])')) {
        pb.skipSet(); return false;
      }
      if (!pb.controlPicture.ball.holder) return false;
      pb.hold();
      // Freeze the fullest tray, as in the existing portrait/clearance check.
      match.refreshCallChips = () => {};
      const tile = (name, hint) => {
        const b = document.createElement('button');
        b.className = 'nrl-btn nrl-mo-tray-call';
        const title = document.createElement('b'), caption = document.createElement('span');
        title.textContent = name; caption.textContent = hint;
        b.append(title, caption); return b;
      };
      const pair = document.createElement('div'); pair.className = 'nrl-mo-tray-pair';
      pair.append(tile('Shift left', 'ball to the left'), tile('Shift right', 'ball to the right'));
      document.querySelector('.nrl-mo-tray-list').replaceChildren(tile('Hit-up', 'forwards take it in'), pair,
        tile('Offload', 'keep the ball alive'), tile('Kick early', 'kick next tackle'), tile('Fresh legs', 'fresh legs on'));
      document.querySelector('.nrl-mo-tray-foot').textContent = 'Run it, Bomb, Grubber, 40/20 from tackle 4 · Field goal when in range · Take the two, Tap and go at Coach’s Office level 2, more above';
      return true;
    }, null, { timeout: 30000 });
    for (const [width, height] of [[667, 375], [844, 390], [956, 330]]) {
      await page.setViewportSize({ width, height });
      for (const [size, scale] of [['normal', 1], ['large', 1.15], ['larger', 1.3]]) {
        await page.evaluate(([size, scale]) => {
          const root = document.documentElement;
          root.setAttribute('data-text-size', size);
          root.style.setProperty('--nrl-text-scale', String(scale));
        }, [size, scale]);
        await page.waitForTimeout(100);
        await page.locator('.nrl-mo-bar [data-coach]').tap();
        const problems = await page.evaluate(() => {
          const el = document.querySelector('.nrl-mo-tackle'), r = el.getBoundingClientRect();
          const problems = [];
          if (el.hidden || !el.textContent.includes('LAST TACKLE')) problems.push('last tackle missing');
          if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight || el.scrollWidth > el.clientWidth) problems.push('count clipped');
          const tray = document.querySelector('.nrl-mo-tray');
          if (tray.scrollHeight > tray.clientHeight + 1) problems.push('full coach tray scrolls');
          const intersects = (b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
          for (const sel of ['.nrl-mo-team', '.nrl-mo-clockbox', '.nrl-mo-bar', '.nrl-mo-tray:not([hidden])', '.nrl-mo-calls', '.nrl-mo-skip', '.nrl-labs-badge']) {
            for (const other of document.querySelectorAll(sel)) if (intersects(other.getBoundingClientRect())) problems.push(`count overlaps ${sel}`);
          }
          return problems;
        });
        if (problems.length) throw new Error(`${width}x${height} ${size}: ${problems.join(', ')}`);
        await page.screenshot({ path: join(OUT, `tackle-${width}x${height}-${size}.png`) });
        await page.locator('.nrl-mo-bar [data-coach]').tap();
      }
    }
    await page.setViewportSize({ width: 667, height: 375 });
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--nrl-text-scale', '1');
      window.__nrlGame.scene.getScene('Match').playback.release();
    });
    await page.waitForFunction(() => {
      const match = window.__nrlGame.scene.getScene('Match'), pb = match.playback;
      if (!pb.controlsAvailable || pb.controlAttacking !== match.live.planSide || pb.controlPhase !== 'play' || !pb.controlPicture.ball.holder) return false;
      if (!document.querySelector('.nrl-mo-tackle-last:not([hidden])') || pb.sim.pendingKick) return false;
      const o = match.fieldToWorld(0, 0), f = match.fieldToWorld(1, 0);
      const length = Math.hypot(f.x - o.x, f.y - o.y);
      const dx = -(f.x - o.x) / length * pb.controlDirection * 70;
      const dy = -(f.y - o.y) / length * pb.controlDirection * 70;
      const canvas = document.querySelector('canvas');
      window.__kickEventsBefore = pb.recorder.events.filter((e) => e.kind === 'kick').length;
      for (const [type, x, y] of [['pointerdown', 350, 160], ['pointermove', 350 + dx, 160 + dy], ['pointerup', 350 + dx, 160 + dy]]) {
        if (document.elementFromPoint(x, y) !== canvas) throw new Error('drag point covered');
        canvas.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 42, pointerType: 'touch', bubbles: true }));
      }
      if (pb.controls.at(-1)?.kind !== 'kick') throw new Error('quick backward drag did not queue kick');
      return true;
    }, null, { timeout: 20000 });
    await page.waitForFunction(() => {
      const pb = window.__nrlGame.scene.getScene('Match').playback;
      return pb.recorder.events.filter((e) => e.kind === 'kick').length > window.__kickEventsBefore;
    }, null, { timeout: 10000 });
    await page.screenshot({ path: join(OUT, 'controlled-kick.png') });
    await page.locator('.nrl-mo-labs-skip').tap();
    await page.screenshot({ path: join(OUT, 'skip-set.png') });
    await page.locator('.nrl-mo-pause').tap();
    await page.locator('.nrl-mo-sheet [data-settings]').tap();
    await page.locator('.nrl-labs-open').tap();
    await page.locator('.nrl-labs-off').tap();
    const off = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-labs')));
    if (off.visible || Object.values(off.on).some(Boolean)) throw new Error('Turn all off retained Labs');
    log(`ok  labs controls (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return 0;
  } catch (err) {
    log(`FAIL labs controls — ${err.message}`);
    await page.screenshot({ path: join(OUT, 'failure.png') }).catch(() => {});
    return 1;
  } finally { await ctx.close(); }
}

const SCREENS_ONLY = argv.includes('--screens-only');
const CONTROLS_ONLY = argv.includes('--controls-only');
let failed = 0;
try {
  await startServer();
  const browser = process.env.E2E_CHROMIUM_PATH
    ? await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH, args: ['--no-sandbox'] })
    : await webkit.launch(process.env.WEBKIT_PATH ? { executablePath: process.env.WEBKIT_PATH } : {});
  if (!CONTROLS_ONLY) {
    if (!SCREENS_ONLY) {
      for (const [W, H] of SIZES) failed += await runSize(browser, W, H);
      failed += await runPortrait(browser);
      failed += await runPlaytest(browser);
      failed += await runPauseSettings(browser);
    }
    for (const run of WALK_RUNS) failed += await runTutorialWalk(browser, run);
    for (const run of SCREEN_RUNS) failed += await runScreens(browser, run);
    failed += await runDockTextSize(browser);
    if (!SCREENS_ONLY) for (const run of FLOW_RUNS) failed += await runFlow(browser, run);
    failed += await runLargeTextTargets(browser);
    if (!SCREENS_ONLY) failed += await runLadderForm(browser);
    if (!SCREENS_ONLY) failed += await runPortraitMenus(browser);
  }
  if (!SCREENS_ONLY || CONTROLS_ONLY) failed += await runLabsControls(browser);
  await browser.close();
} catch (err) {
  console.error(err);
  failed++;
} finally {
  stopServer();
}
log(failed ? `\n${failed} failure(s)` : `\nall ${process.env.E2E_CHROMIUM_PATH ? 'Chromium fallback' : 'WebKit'} layout checks passed`);
process.exit(failed ? 1 : 0);
