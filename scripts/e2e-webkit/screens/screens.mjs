import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

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
export const SCREEN_RUNS = (process.env.E2E_SCREEN_SIZES ?? '844x390@47,0,47,21 667x375 956x330').split(/\s+/).filter(Boolean).map((s) => {
  const [size, insets] = s.split('@');
  const [w, h] = size.split('x').map(Number);
  const [l, t, r, b] = (insets ?? '0,0,0,0').split(',').map(Number);
  return { w, h, safe: { l, t, r, b } };
});

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
  // The three one-button roles must show whole; the attack coach's taller row of four Hire
  // buttons (#326) comes after them and is reached by scrolling the staff list.
  { id: 'staff', box: '.nrl-screen-region', rows: '.nrl-staff-row:not([data-staff="attackCoach"])', primary: ['.nrl-staff-row .nrl-btn'] },
  { id: 'contracts', box: '.nrl-screen-region', rows: '.nrl-contracts-table tbody tr', primary: ['[data-back]'] },
  { id: 'history', box: '.nrl-screen-region', rows: '.nrl-history-body tr, .nrl-history-empty', card: '.nrl-history-body' },
  { id: 'help', box: '.nrl-screen-region .nrl-modal', rows: '.nrl-guide-body :is(p, li, h3)', prose: '.nrl-guide-body', primary: ['.nrl-guide-replay'] },
].map((s) => ({ exit: SHEET_EXIT, ...s }));

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

export async function runScreens(browser, { w: W, h: H, safe }) {
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
  // detail field reachable by scrolling its panel; difficulty and Start stay in view, clear of the notch.
  await step('title-setup', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-open-all]').check();
    await setInsets();
    await page.waitForTimeout(250);
    const problems = await controlsProblems(page, ['.nrl-title-pick', '[data-nrl-start]'], safe);
    for (const control of await page.locator('.nrl-title-details input, .nrl-title-swatch').all()) {
      await control.evaluate(e => { e.setAttribute('data-nrl-reach-probe', ''); e.scrollIntoView({ block: 'center', inline: 'nearest' }); });
      problems.push(...await controlsProblems(page, ['[data-nrl-reach-probe]'], safe));
      await control.evaluate(e => e.removeAttribute('data-nrl-reach-probe'));
    }
    await page.evaluate(() => { document.querySelector('.nrl-title-details').scrollTop = 0; });
    return problems;
  });
  await step('hub', async (rec) => {
    await page.fill('[data-nrl-clubname]', 'Landscape FC');
    await tap('[data-nrl-start]');
    await page.locator('[data-expansion-work]').tap();
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
  // #467: every new readout at both requested text sizes. Images stay in CI artifacts.
  const textSize = (size) => page.evaluate((size) => {
    if (size === 'normal') document.documentElement.removeAttribute('data-text-size');
    else document.documentElement.setAttribute('data-text-size', size);
    document.documentElement.style.setProperty('--nrl-text-scale', size === 'large' ? '1.15' : '1');
  }, size);
  const readoutProblems = () => page.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('[data-plan-done], .nrl-mo-plan-go, [data-fit] > span, [data-matchup], [data-counters], [data-usual-fit], [data-working], [data-preview-line]')) {
      const r = e.getBoundingClientRect();
      if (r.width < 1) continue;
      if (r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1) out.push(`off screen: ${e.textContent}`);
      for (let a = e.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a), ar = a.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(cs.overflowY) && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1)) out.push(`ancestor clips: ${e.textContent}`);
      }
      if (e.scrollWidth > e.clientWidth + 1) out.push(`clipped: ${e.textContent}`);
    }
    return out;
  });
  for (const size of ['normal', 'large']) {
    await textSize(size);
    await step(`fit-lineup-${size}`, async () => {
      await openNav(page, 'lineup');
      await tap('[data-plan]');
      await page.waitForSelector('.nrl-lineup-plan');
      const out = await readoutProblems();
      if (await page.locator('.nrl-lineup-plan [data-fit]').count() !== 8) out.push('missing fit buttons');
      return out;
    });
    await tap('[data-plan-done]');
    await step(`matchup-fixtures-${size}`, async () => {
      await openNav(page, 'fixtures');
      await tap('[data-next-row]');
      await page.waitForSelector('[data-next-match]');
      const text = await page.locator('[data-next-match]').innerText();
      return /Matchup/i.test(text) && /Counters/i.test(text) ? await readoutProblems() : ['missing matchup or counters'];
    });
    await step(`matchup-rival-${size}`, async () => {
      await tap('[data-next-opponent] button');
      await page.waitForSelector('[data-matchup]');
      return readoutProblems();
    });
    await closeAll();
  }
  await textSize('normal');

  // Popups: the player page, the kit designer, a rival's squad, a decision card.
  await step('popup-player', async (rec) => {
    await openNav(page, 'squad');
    await tap('.nrl-screen-region [data-player-open] .nrl-row-name');
    await page.waitForSelector('[data-player-page]');
    // No ✕ (Broadcast Quiet): ◂ SQUAD is its one way out.
    return check(rec, { box: '.nrl-player-modal', rows: '.nrl-player-stats .nrl-statrow', card: '.nrl-player-stats', exit: '.nrl-player-modal [data-back]',
      primary: ['[data-player-action="renew"]', '[data-player-action="sell"]', '[data-player-action="release"]'] }, null);
  });
  // #538: the temporary Potential line also fits phone portrait, without a redesign.
  await step('popup-player-potential-390x844', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    return page.evaluate(() => {
      const line = document.querySelector('[data-potential]');
      if (!line || !/^Potential: ★*(?:½)?$/.test(line.textContent)) return ['missing plain Potential star line'];
      line.scrollIntoView({ block: 'nearest' });
      const r = line.getBoundingClientRect();
      const col = document.querySelector('.nrl-player-about').getBoundingClientRect();
      const out = [];
      if (r.left < 0 || r.right > 390 || r.height < 10 || r.top < 0 || r.bottom > 844
        || r.top < col.top - 1 || r.bottom > col.bottom + 1 || line.scrollWidth > line.clientWidth + 1) out.push('Potential line clipped at 390x844');
      if (document.querySelector('.nrl-player-curve') || document.body.textContent.includes('Projected peak:')) out.push('old projection remains');
      return out;
    });
  });
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(250);
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
      // Reach the real break through the playback runner, keeping its event recorder connected.
      const pb = sc.playback;
      pb.hold();
      for (let i = 0; i < 24000 && pb.breakKind !== 'half-time'; i++) pb.runner.step();
      pb.release();
      if (pb.breakKind !== 'half-time') throw new Error('did not reach half-time');
      sc.planCardHalf = pb.half; // mirror refreshPlan's once-per-half latch
      sc.overlay.offerReplay(() => {});
      sc.openPlanCard('Half-time', ['Landscape FC 4 – 0 Rivals', 'Legs 80% / 78%', 'Calls paid off – / –']);
    });
    if (!(await page.locator('.nrl-mo-plan').count())) return ['no plan card (no plan side in this match)'];
    for (const size of ['normal', 'large']) {
      await textSize(size);
      const problems = await readoutProblems();
      out.push(...problems);
      if (await page.locator('.nrl-mo-plan [data-fit]').count() !== 8 || !(await page.locator('[data-working], [data-preview-line]').count())) out.push('missing half-time fit or numbers');
      await page.screenshot({ path: join(OUT, `fit-half-time-${size}.png`) });
    }
    await textSize('normal');
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
    await page.locator('[data-nrl-open-all]').check();
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
