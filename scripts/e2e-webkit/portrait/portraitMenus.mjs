import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems, openNav, skipFromPill } from '../common.mjs';

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
export async function runPortraitMenus(browser) {
  let failed = 0;
  const started = Date.now();
  for (const run of PORTRAIT_RUNS) {
    const { w: W, h: H, safe } = run;
    const tag = `${W}x${H}`;
    const OUT = join(OUT_ROOT, 'webkit', `portrait-menus-${tag}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const report = { size: tag, safe, steps: [], errors: [] };
    // Reduced motion: the sheets come up without their rise (they only fade, #597), so each of
    // the ~200 opens is measured at once (the CI job's 20 minutes are close to full).
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
      await page.waitForTimeout(50); // a frame for the sheet's layout (no rise, only the fade: reduced motion)
    };

    await step('title', async (rec) => {
      await page.goto(BASE);
      await page.evaluate((s) => {
        for (const k of ['t', 'b']) document.documentElement.style.setProperty(`--nrl-safe-${k}`, `${s[k]}px`);
      }, safe);
      await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-open-all]').check();
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
      await page.locator('[data-expansion-work]').tap();
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
          if (m.id === 'player') {
            const xp = page.locator('[data-xp]');
            const text = await xp.textContent();
            if (!/^Level \d+ · XP \d+\/100$/.test(text ?? '')) out.push(`player: missing plain XP progress (${text})`);
            await xp.scrollIntoViewIfNeeded();
            const bounds = await xp.boundingBox();
            if (!bounds || bounds.x < 0 || bounds.x + bounds.width > W || bounds.y < 0 || bounds.y + bounds.height > H) out.push('player: XP line is clipped');
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
        await skipFromPill(page);
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
