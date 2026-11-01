import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems } from '../common.mjs';

/**
 * #421 and #414 at 667×375 and 844×390: in a match, ❚❚ → Settings (text size Large)
 * → ✕ comes back to the pause sheet with the clock where it stopped, the sheet laid
 * out afresh and its buttons tappable; only Resume plays on. Then the full log's
 * Your calls and Scoring filters say so when they have nothing to list.
 */
export async function runPauseSettings(browser) {
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
