import { spawn } from 'node:child_process';
import { join } from 'node:path';
export { confirmStartingLeague, setupStep, setupStepNow, slotMenu } from './newClub.mjs';

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
 * ladder shares League's sheet (3h); Recruit is Squad's segment; Contracts is
 * Finance's VIEW ▸.
 */
const NAV_VIA = {
  ladder: ['fixtures', null],
  recruit: ['squad', '.nrl-sq-tabs [data-seg="recruit"]'],
  contracts: ['finance', '[data-finance-contracts]'],
};

/**
 * SuperCOOKED 30–31: SQUAD opens whichever of its views was last used, the pitch (the
 * Lineup, keyed 'lineup') or the list (keyed 'squad'); Pitch / List in its header switch.
 */
const SQUAD_VIEW = { squad: 'list', lineup: 'pitch' };
const SQUAD_SHEET = '.nrl-screen-region:is([data-screen-key="squad"], [data-screen-key="lineup"])';

/** The Squad header's ⋯, then one of its items (the game plan, the set plays, a training focus). */
export async function squadMenu(page, item) {
  if (!(await page.locator('.nrl-squad-more-tray').count())) await page.locator('.nrl-screen-region [data-squad-more]').tap();
  await page.locator(`.nrl-squad-more-tray ${item}`).tap();
}

/**
 * Open a destination as a player would: its dock tab, OFFICE then its tile, or
 * the sheet that holds it then the control there. A tab tapped while its own
 * sheet is open closes it (the dock is a toggle), so an open sheet is left as it is.
 */
export async function openNav(page, id) {
  if (id === 'club') { await page.locator(SHEET_EXIT).tap(); return; }
  if (await page.locator(`.nrl-screen-region[data-screen-key="${id}"]`).count()) return;
  if (SQUAD_VIEW[id]) {
    if (await page.locator('.nrl-screen-region[data-screen-key="recruit"]').count()) await page.locator('.nrl-sq-tabs [data-seg="squad"]').tap();
    else if (!(await page.locator(SQUAD_SHEET).count())) await dockTab(page, 'squad');
    await page.locator(SQUAD_SHEET).waitFor();
    if (!(await page.locator(`.nrl-screen-region[data-screen-key="${id}"]`).count())) await page.locator(`[data-squad-view="${SQUAD_VIEW[id]}"]`).tap();
    await page.locator(`.nrl-screen-region[data-screen-key="${id}"]`).waitFor();
    return;
  }
  if (NAV_VIA[id]) {
    const [via, sel] = NAV_VIA[id];
    await openNav(page, via);
    if (sel) await page.locator(sel).first().tap();
    return;
  }
  if (await dockTab(page, id)) return;
  const more = page.locator('.nrl-nav [data-nav-more]');
  if (!(await more.count())) throw new Error(`no nav item for "${id}"`);
  if (!(await page.locator('.nrl-nav-sheet:not([hidden])').count())) await more.tap();
  await page.locator(`.nrl-nav-sheet [data-screen="${id}"]`).tap();
}

/** Its dock tab, if it has one showing: true when tapped. */
async function dockTab(page, id) {
  const direct = page.locator(`.nrl-nav > .nrl-btn[data-screen="${id}"]`);
  if (!(await direct.count()) || !(await direct.first().isVisible())) return false;
  // Lit for another of its sheets (Squad for Recruit): CLUB first, or the tap would close that.
  if ((await direct.first().getAttribute('aria-current')) === 'page' && (await page.locator('.nrl-screen-region').count())) {
    await page.locator(SHEET_EXIT).tap();
  }
  await direct.first().tap();
  return true;
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

/**
 * The match's one speed button (SuperCOOKED 40) to `speed`: it shows the speed playing and each tap
 * moves it on (1× → 2× → 4× → 8× → 1×), so tap until it reads the one wanted.
 */
export async function setMatchSpeed(page, speed) {
  const b = page.locator('.nrl-mo-controls .nrl-mo-speed');
  for (let i = 0; i < 4 && (await b.getAttribute('data-speed')) !== String(speed); i++) await b.tap();
  const now = await b.getAttribute('data-speed');
  if (now !== String(speed)) throw new Error(`the speed button reads ×${now}, not ×${speed}`);
}

/**
 * One PLAY WEEK. A League career may ask about closing event entries, then a decision,
 * then either a match or a rest week that simply moves on.
 * Returns 'match' or 'week'.
 */
export async function advanceOnce(page) {
  const before = await page.evaluate(() => {
    const s = window.__nrlState();
    return `${s.season}:${s.week}:${s.preseason}`;
  });
  await page.locator('.nrl-dock [data-hud="advance"]').tap();
  const outcome = () => page.waitForFunction((b) => {
    if (document.querySelector('.nrl-mo-controls')) return 'match';
    if (document.querySelector('[data-skip-events]')) return 'events';
    if (document.querySelector('[data-ask-proceed], [data-confirm-advance]')) return 'ask';
    const s = window.__nrlState();
    if (`${s.season}:${s.week}:${s.preseason}` !== b
      && document.querySelector('body:not(.nrl-match-active) [data-hud="advance"]')) return 'week';
    return null;
  }, before, { timeout: 30000 }).then((h) => h.jsonValue());
  let next = await outcome();
  for (let i = 0; i < 4 && (next === 'events' || next === 'ask'); i++) {
    const sel = next === 'events' ? '[data-skip-events]' : '[data-ask-proceed], [data-confirm-advance]';
    await page.locator(sel).first().tap();
    next = await outcome();
  }
  if (next === 'match') {
    const go = page.locator('.nrl-mo-plan .nrl-mo-plan-go');
    if (await go.count() && await go.first().isVisible()) await go.first().tap();
  }
  if (next !== 'match' && next !== 'week') throw new Error(`advance stopped at ${next}`);
  return next;
}

/**
 * Season-one unlock progress as a League career reads it (#831, #844): trials do not
 * count; `round` is the next league round (league rounds played + 1), not the
 * calendar week; home and win come from any competitive result this season.
 */
export async function leagueUnlockProgress(page) {
  return page.evaluate(() => {
    const s = window.__nrlState();
    let played = 0;
    let home = false;
    let win = false;
    for (const i of s.competitions?.instances ?? []) {
      if (i.season !== s.season || i.definition.format.kind === 'exhibition') continue;
      for (const f of i.fixtures) {
        if (f.status !== 'completed' || !f.result || (f.homeId !== s.clubId && f.awayId !== s.clubId)) continue;
        const atHome = f.homeId === s.clubId;
        if (atHome) home = true;
        if (atHome ? f.result.homeScore > f.result.awayScore : f.result.awayScore > f.result.homeScore) win = true;
        if (i.definition.format.kind === 'league' && i.definition.stages.find((st) => st.id === f.stageId)?.kind === 'league') played++;
      }
    }
    return { round: played + 1, home, win, reputation: s.reputation, week: s.week };
  });
}

/** Play one PLAY WEEK on the phone, skipping any match to full time, and wait for the week to move. */
export async function playSkippedWeek(page) {
  const before = await page.evaluate(() => { const s = window.__nrlState(); return `${s.season}:${s.week}`; });
  if (await advanceOnce(page) === 'match') {
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-skip]').tap();
    await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 60000 });
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  }
  await page.waitForFunction((b) => { const s = window.__nrlState(); return `${s.season}:${s.week}` !== b; }, before, { timeout: 60000 });
}

/** Keep advancing rest weeks until a match is on screen. */
export async function advanceToMatch(page) {
  for (let i = 0; i < 8; i++) {
    if (await advanceOnce(page) === 'match') return;
  }
  throw new Error('no match within 8 advances');
}

/** Play a real match through the phone controls, then wait for its held week. */
export async function playPhoneWeek(page, onResult = async () => {}) {
  const before = await page.evaluate(() => { const s = window.__nrlState(); return `${s.season}:${s.week}:${s.preseason}`; });
  await openNav(page, 'club');
  if (await advanceOnce(page) !== 'match') {
    await page.waitForFunction(b => { const s = window.__nrlState(); return `${s.season}:${s.week}:${s.preseason}` !== b; }, before);
    return;
  }
  await page.locator('.nrl-mo-controls [data-skip-pill]').waitFor({ timeout: 60000 });
  await skipFromPill(page);
  await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
  await onResult();
  await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate(n => n.click());
  await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  await page.waitForFunction(b => { const s = window.__nrlState(); return `${s.season}:${s.week}:${s.preseason}` !== b; }, before);
}

/**
 * Play the separate trial phase so existing probes still start at round 1.
 * A tall viewport is turned sideways first: a touch phone held upright is the
 * rotate card, and the match is played at 844×390, then the viewport is put back.
 */
export async function playTrials(page, onResult) {
  const size = page.viewportSize();
  if (size.width < size.height) await page.setViewportSize({ width: 844, height: 390 });
  while (await page.evaluate(() => [1, 2].includes(window.__nrlState().preseason))) await playPhoneWeek(page, onResult);
  if (size.width < size.height) await page.setViewportSize(size);
}
