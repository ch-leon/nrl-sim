import { spawn } from 'node:child_process';
import { join } from 'node:path';

/**
 * The weekly summary card (#368) opens after each advance once the club is back.
 * This probe measures other screens, so every page closes the card as it opens.
 */
export function closeWeekSummary() {
  new MutationObserver(() => {
    document.querySelector('[data-week-summary] [data-summary-close]')?.click();
  }).observe(document, { childList: true, subtree: true });
}

export const argv = process.argv.slice(2);
const sizeArg = argv.includes('--size') ? argv[argv.indexOf('--size') + 1] : process.env.E2E_SIZES;
export const SIZES = (sizeArg ?? '956x330 844x390').split(/\s+/).filter(Boolean).map((s) => s.split('x').map(Number));
if (SIZES.some(([w, h]) => !(w > 0 && h > 0))) {
  console.error(`bad --size "${sizeArg}": want WxH, e.g. 956x330`);
  process.exit(2);
}
/** Safari's landscape boost on a 16 Pro Max: 956 / 440, its landscape over portrait width. */
export const BOOST = 2.17;
export const OUT_ROOT = process.env.E2E_OUT ?? 'e2e-output';
const PORT = Number(process.env.E2E_PORT ?? 4198);
const EXTERNAL = process.env.E2E_URL;
export const BASE = `${EXTERNAL ?? `http://localhost:${PORT}/`}?e2e`;
export const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const log = (...a) => console.log(...a);

// ── Server: a production build served by `vite preview` ──────────────────────
let server = null;
export async function startServer() {
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
export function stopServer() {
  if (server) try { process.kill(-server.pid); } catch { /* gone */ }
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopServer(); process.exit(130); });

// ── In-page probes ───────────────────────────────────────────────────────────
/**
 * Problems with `box` and `buttons` (selectors): the box must lie inside the
 * viewport, each button too, and the button must be what a tap at its centre hits.
 */
export function reachProblems(page, box, buttons) {
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
export function boostFonts(page, root, k) {
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
export function scrolls(page, sel) {
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
export function fitsOrScrolls(page, sel) {
  return page.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return false;
    const oy = getComputedStyle(e).overflowY;
    return e.scrollHeight <= e.clientHeight + 1 || oy === 'auto' || oy === 'scroll';
  }, sel);
}

/** A sheet's way out (Broadcast Quiet): sheets have no ✕; CLUB in the dock closes them. */
export const SHEET_EXIT = '.nrl-nav [data-nav-home]';

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
export async function openNav(page, id) {
  if (id === 'club') { await page.locator(SHEET_EXIT).tap(); return; }
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

export const NO_INSETS = { l: 0, t: 0, r: 0, b: 0 };

/**
 * SKIP in the speed pill, to full time. The first tap arms it; a second inside 300ms of
 * that is ignored (SKIP_REPEAT_MS, #601), so the second waits that out. On a slow runner
 * it can land after the arm has run out (SKIP_ARM_MS) and only arm it again: still armed
 * after the tap means it has not gone, so tap once more.
 */
export async function skipFromPill(page) {
  const skip = page.locator('.nrl-mo-controls [data-skip-pill]');
  const armed = page.locator('[data-skip-pill][data-armed]');
  await skip.tap();
  await armed.waitFor();
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    await skip.tap();
    if (!(await armed.count())) return;
  }
}

/** Play a real match through the phone controls, then wait for its held week. */
export async function playPhoneWeek(page, onResult = async () => {}) {
  const before = await page.evaluate(() => { const s = window.__nrlState(); return `${s.season}:${s.week}:${s.preseason}`; });
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').tap();
  await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
  if (await page.locator('[data-ask-proceed]').isVisible()) await page.locator('[data-ask-proceed]').tap();
  await page.locator('.nrl-mo-controls [data-skip-pill]').waitFor({ timeout: 60000 });
  await skipFromPill(page);
  await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
  await onResult();
  await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate(n => n.click());
  await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  await page.waitForFunction(b => { const s = window.__nrlState(); return `${s.season}:${s.week}:${s.preseason}` !== b; }, before);
}

/** Play the separate trial phase so existing probes still start at round 1. */
export async function playTrials(page, onResult) {
  const size = page.viewportSize();
  if (size.width < size.height) await page.setViewportSize({ width: 844, height: 390 });
  while (await page.evaluate(() => [1, 2].includes(window.__nrlState().preseason))) await playPhoneWeek(page, onResult);
  if (size.width < size.height) await page.setViewportSize(size);
}
