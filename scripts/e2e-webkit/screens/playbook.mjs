import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

/**
 * Set plays on the club side (#326, phase 2), at phone landscape (667×375 and
 * 844×390), as a veteran's new club (everything open, so Staff & Board is there):
 *   - Office ▸ Playbook with no attack coach: the hire card, its Staff & Board link;
 *   - Staff & Board: the attack coach's row with four Hire buttons, Razzle locked
 *     at a new club's reputation; Hire Direct;
 *   - the Playbook again: the direct coach's three to buy; Buy the block play, Take it;
 *   - the Lineup's PLAYS button and its own sheet, the block play ticked;
 *   - Release the coach: the bought play stays on the Playbook.
 * At every step nothing is wider than the screen, the body scrolls (or fits), and
 * every button the step uses is a 44px tap. A few seconds a size.
 */
export async function runPlaybook(browser, sizes = [[667, 375], [844, 390]]) {
  const started = Date.now();
  const OUT = join(OUT_ROOT, 'webkit', 'playbook');
  mkdirSync(OUT, { recursive: true });
  let failed = 0;
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    await ctx.addInitScript(closeWeekSummary);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    /** Nothing wider than the screen; `scroll` scrolls when it overflows; every `taps` 44px tall and on screen once scrolled to. */
    const check = async (step, sheet, scroll, taps) => {
      const p = await page.evaluate(([sheet, scroll]) => {
        const s = document.querySelector(sheet);
        if (!s) return { missing: sheet };
        const r = s.getBoundingClientRect();
        const wideKids = [...s.querySelectorAll('*')].filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1);
        }).map((el) => el.className || el.tagName).slice(0, 3);
        const sc = scroll ? document.querySelector(scroll) : null;
        return {
          wide: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1 || r.right > innerWidth + 1 || r.left < -1,
          wideKids,
          scrolls: !sc ? 'fits' : sc.scrollHeight > sc.clientHeight + 1 ? getComputedStyle(sc).overflowY : 'fits',
        };
      }, [sheet, scroll]);
      if (p.missing) throw new Error(`${step}: ${p.missing} not shown`);
      if (p.wide || p.wideKids.length) throw new Error(`${step}: wider than the screen (${p.wideKids.join(', ')})`);
      if (p.scrolls !== 'fits' && p.scrolls !== 'auto' && p.scrolls !== 'scroll') throw new Error(`${step}: the body overflows without scrolling (${p.scrolls})`);
      for (const sel of taps) {
        const loc = page.locator(sel).first();
        await loc.scrollIntoViewIfNeeded();
        const box = await loc.boundingBox();
        if (!box) throw new Error(`${step}: ${sel} not on screen`);
        if (box.height < 44 - 0.5) throw new Error(`${step}: ${sel} is ${box.height.toFixed(1)}px tall`);
        if (box.left < -1 || box.right > w + 1 || box.top < -1 || box.bottom > h + 1) throw new Error(`${step}: ${sel} off screen`);
      }
      await page.screenshot({ path: join(OUT, `${step}-${w}x${h}.png`) });
    };
    try {
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
      await page.locator('[data-nrl-open-all]').check();
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      const skip = page.locator('.nrl-tutorial-skip');
      if (await skip.count()) await skip.tap();

      // No attack coach yet: the Playbook says how to get one.
      await openNav(page, 'playbook');
      await page.locator('[data-playbook] [data-playbook-coach]').waitFor();
      if (!/No attack coach/.test(await page.locator('[data-playbook-coach]').textContent())) throw new Error('no "No attack coach" card');
      if (await page.locator('[data-playbook-staff]').isDisabled()) throw new Error('the Staff & Board link is locked for a veteran club');
      await check('playbook-empty', '[data-playbook]', '.nrl-pb-scroll', ['[data-playbook-staff]', '[data-playbook-others] summary']);

      // Staff & Board: four Hire buttons, Razzle locked at reputation 30.
      await page.locator('[data-playbook-staff]').tap();
      await page.locator('[data-hire-attack="direct"]').waitFor();
      const hires = await page.locator('[data-hire-attack]').evaluateAll((bs) => bs.map((b) => `${b.getAttribute('data-hire-attack')}:${b.disabled ? 'locked' : 'open'}`).join(','));
      if (hires !== 'direct:open,width:open,kicking:open,razzle:locked') throw new Error(`hire buttons ${hires}`);
      await check('staff-hire', '.nrl-staff', '.nrl-staff-list', ['[data-hire-attack="direct"]', '[data-hire-attack="razzle"]']);
      await page.locator('[data-hire-attack="direct"]').tap();
      await page.locator('[data-staff="attackCoach"][data-speciality="direct"]').waitFor();
      await check('staff-held', '.nrl-staff', '.nrl-staff-list', ['[data-staff="attackCoach"] .nrl-btn']);

      // The Playbook: buy the block play and take it in.
      await page.locator(SHEET_EXIT).tap();
      await openNav(page, 'playbook');
      await page.locator('[data-playbook-coach="direct"]').waitFor();
      const toBuy = await page.locator('[data-playbook-buy] [data-to-buy]').evaluateAll((rs) => rs.map((r) => r.getAttribute('data-play')).join(','));
      if (toBuy !== 'block-play,inside-ball,short-side-raid') throw new Error(`to buy: ${toBuy}`);
      await check('playbook-buy', '[data-playbook]', '.nrl-pb-scroll', ['[data-play-buy="block-play"]']);
      const before = await page.evaluate(() => window.__nrlState().money);
      await page.locator('[data-play-buy="block-play"]').tap();
      await page.locator('[data-playbook-owned] [data-play="block-play"]').waitFor();
      const after = await page.evaluate(() => window.__nrlState().money);
      if (before - after !== 8000) throw new Error(`the block play cost ${before - after}`);
      await page.locator('[data-play-take="block-play"]').tap();
      await page.locator('[data-play-take="block-play"][aria-pressed="true"]').waitFor();
      await check('playbook-owned', '[data-playbook]', '.nrl-pb-scroll', ['[data-play-take="block-play"]', '[data-play-buy="inside-ball"]']);

      // The Lineup's Plays button opens its own sheet with the block play ticked.
      await page.locator(SHEET_EXIT).tap();
      await openNav(page, 'lineup');
      const playsBtn = page.locator('[data-plays]');
      await playsBtn.waitFor();
      if (!/Block play/.test(await playsBtn.textContent())) throw new Error(`the Plays button reads "${await playsBtn.textContent()}"`);
      await check('lineup', '.nrl-lineup', null, ['[data-plays]', '[data-plan]', '[data-auto-pick]']);
      await playsBtn.tap();
      await page.locator('[data-plays-sheet] [data-play="block-play"][aria-pressed="true"]').waitFor();
      if (await page.locator('[data-plays-sheet] [data-tactic]').count()) throw new Error('the Plays sheet holds the plan’s presets');
      await check('lineup-plays', '[data-plays-sheet]', '[data-plays-list]', ['[data-plays-sheet] [data-play="block-play"]', '[data-plays-done]', '[data-plays-playbook]']);
      await page.locator('[data-plays-done]').tap();

      // Release the coach: the play stays bought (and taken).
      await openNav(page, 'staff');
      await page.locator('[data-staff="attackCoach"] .nrl-btn').tap();
      await page.locator('[data-hire-attack="direct"]').waitFor();
      await page.locator(SHEET_EXIT).tap();
      await openNav(page, 'playbook');
      await page.locator('[data-playbook-owned] [data-play="block-play"]').waitFor();
      const kept = await page.evaluate(() => window.__nrlState().playbook.owned.join(','));
      if (kept !== 'block-play') throw new Error(`owned after release: ${kept}`);
      await check('playbook-released', '[data-playbook]', '.nrl-pb-scroll', ['[data-play-take="block-play"]']);
      if (errors.length) throw new Error(`page errors: ${errors.join(' | ')}`);
      log(`ok  playbook ${w}x${h}`);
    } catch (err) {
      log(`FAIL playbook ${w}x${h} — ${err.message}`);
      await page.screenshot({ path: join(OUT, `failure-${w}x${h}.png`) }).catch(() => {});
      failed++;
    } finally { await ctx.close(); }
  }
  log(`    playbook (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return failed;
}
