import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav, NO_INSETS } from '../common.mjs';

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

export async function runLargeTextTargets(browser) {
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
    await page.locator('[data-nrl-open-all]').check();
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
