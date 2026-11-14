import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

/**
 * The Coach calls page (Office ▸ Coach calls): a new club opens it from the
 * Office sheet and sees the four groups, at least one locked; then the Coach's
 * Office tile in Build opens it too (See coach calls). At phone landscape
 * (667×375 and 844×390): nothing wider than
 * the screen, the body scrolls, and See coach calls is a 44px tap. Any seed: a new
 * club never has a Coach's Office. A few seconds.
 */
export async function runCoachCalls(browser, sizes) {
  const started = Date.now();
  const OUT = join(OUT_ROOT, 'webkit', 'coach-calls');
  mkdirSync(OUT, { recursive: true });
  let failed = 0;
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    await ctx.addInitScript(closeWeekSummary);
    const page = await ctx.newPage();
    page.setDefaultTimeout(10000);
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await openNav(page, 'calls');
      await page.locator('[data-coach-calls] [data-calls-group]').first().waitFor();
      const p = await page.evaluate(() => {
        const sheet = document.querySelector('[data-coach-calls]');
        const groups = [...sheet.querySelectorAll('[data-calls-group]')];
        const scroll = sheet.querySelector('.nrl-calls-scroll');
        const r = sheet.getBoundingClientRect();
        return {
          groups: groups.map((g) => g.getAttribute('data-calls-group')).join(','),
          locked: groups.filter((g) => g.hasAttribute('data-locked') && g.querySelector('.nrl-calls-state')?.textContent === 'Locked').length,
          marked: document.querySelector('.nrl-nav-sheet [data-screen="calls"]')?.getAttribute('aria-current') ?? document.querySelector('.nrl-nav [data-nav-more]')?.getAttribute('aria-current'),
          wide: Math.max(document.documentElement.scrollWidth, sheet.scrollWidth) > innerWidth + 1 || r.right > innerWidth + 1 || r.left < -1,
          scrolls: scroll.scrollHeight > scroll.clientHeight ? getComputedStyle(scroll).overflowY : 'fits',
        };
      });
      if (p.groups !== '0,1,2,3') throw new Error(`groups ${p.groups}`);
      // Set plays are called from the tray but not unlocked here (#326): the page's footnote says where they come from.
      if (!/^Set plays come from the Playbook/.test(await page.locator('[data-coach-calls] [data-calls-plays]').textContent())) throw new Error('no "Set plays come from the Playbook" footnote');
      if (p.locked < 3) throw new Error(`${p.locked} locked groups shown, want 3 for a new club`);
      if (p.wide) throw new Error('the page is wider than the screen');
      if (p.scrolls !== 'fits' && p.scrolls !== 'auto') throw new Error(`the body overflows without scrolling (${p.scrolls})`);
      await page.screenshot({ path: join(OUT, `page-${w}x${h}.png`) });
      await page.locator(SHEET_EXIT).tap();
      await openNav(page, 'build');
      const see = page.locator('.nrl-build-row [data-see-calls]');
      await see.scrollIntoViewIfNeeded();
      const box = await see.boundingBox();
      if (!box || box.height < 44 - 0.5) throw new Error(`See coach calls is ${box?.height}px tall`);
      await see.tap();
      await page.locator('[data-coach-calls] [data-calls-group]').first().waitFor();
      if (await page.locator('.nrl-placebar-cancel:visible').count()) throw new Error('See coach calls started placing a Coach’s Office');
      log(`ok  coach calls ${w}x${h}`);
    } catch (err) {
      log(`FAIL coach calls ${w}x${h} — ${err.message}`);
      await page.screenshot({ path: join(OUT, `failure-${w}x${h}.png`) }).catch(() => {});
      failed++;
    } finally { await ctx.close(); }
  }
  log(`    coach calls (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return failed;
}
