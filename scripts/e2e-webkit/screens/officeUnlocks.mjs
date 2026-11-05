// #482: real season-one Office play-through; screenshots live in the CI artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, SHEET_EXIT } from '../common.mjs';

export async function runOfficeUnlocks(browser) {
  const out = join(OUT_ROOT, 'webkit', 'office-unlocks');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const record = { size: `${width}x${height}`, problems: [], rounds: [] };
    page.on('pageerror', (e) => record.problems.push(e.message));
    await page.addInitScript(closeWeekSummary);
    const shot = async (tag) => {
      await page.setViewportSize({ width, height });
      await page.locator('[data-nav-more]').tap();
      const tiles = await page.locator('.nrl-nav-sheet [data-screen]').evaluateAll((nodes) => nodes.map((b) => ({ id: b.dataset.screen, locked: b.getAttribute('aria-disabled') === 'true', text: b.textContent, opacity: getComputedStyle(b).opacity })));
      record.rounds.push({ tag, tiles });
      await page.screenshot({ path: join(out, `${width}x${height}-${tag}.png`) });
      await page.locator('[data-nav-more]').tap();
      if (width < height) {
        await page.locator(SHEET_EXIT).tap();
        await page.screenshot({ path: join(out, `${width}x${height}-${tag}-club.png`) });
        await page.setViewportSize({ width: 844, height: 390 });
      }
      return tiles;
    };
    try {
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
      await page.locator('[data-nrl-difficulty-easy]').tap();
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await page.waitForFunction(() => !!window.__nrlState);
      const start = await shot('start');
      for (const id of ['finance', 'staff', 'contracts']) if (!start.find((t) => t.id === id)?.locked) record.problems.push(`${id} not locked at start`);
      // A real tap, before playing a home game, must still show Finance.
      await page.locator('.nrl-dock-statusbox').tap();
      await page.waitForSelector('[data-screen-key="finance"]');
      await page.screenshot({ path: join(out, `${width}x${height}-locked-money-tap.png`) });
      await page.locator(SHEET_EXIT).tap();
      let homeSeen = false;
      while (await page.evaluate(() => window.__nrlState().week < 12)) {
        const week = await page.evaluate(() => window.__nrlState().week);
        await page.locator('[data-hud="advance"]').tap();
        await page.waitForFunction(() => document.querySelector('.nrl-mo-controls') || document.querySelector('[data-ask-proceed]'), null, { timeout: 60000 });
        if (await page.locator('[data-ask-proceed]').count()) await page.locator('[data-ask-proceed]').tap();
        console.log(`Office ${width}x${height} playing round ${week}`);
        await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
        const plan = page.locator('.nrl-mo-plan .nrl-mo-plan-go');
        if (await plan.isVisible()) await plan.tap();
        await page.locator('.nrl-mo-controls [data-pause]').tap();
        console.log(`Office ${width}x${height} round ${week} paused`);
        await page.locator('.nrl-mo-sheet [data-skip]').tap();
        console.log(`Office ${width}x${height} round ${week} skipping`);
        await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 60000 });
        await page.waitForFunction((w) => window.__nrlState().week > w, week, { timeout: 60000 });
        const state = await page.evaluate(() => window.__nrlState());
        if (!homeSeen && state.league.fixtures.some((f) => f.homeId === state.clubId && f.result)) {
          const tiles = await shot('first-home');
          if (tiles.find((t) => t.id === 'finance')?.locked) record.problems.push('Finance still locked after first home game');
          homeSeen = true;
        }
        if (state.week === 4 && !state.unlocks?.screens?.includes('staff')) record.problems.push('Staff not open at round 4');
      }
      const end = await shot('round-12');
      for (const id of ['finance', 'staff', 'contracts']) if (end.find((t) => t.id === id)?.locked) record.problems.push(`${id} locked at round 12`);
      // The guide lines remain readable in News after a run.
      await page.locator('[data-nav-more]').tap();
      await page.locator('.nrl-nav-sheet [data-screen="news"]').tap();
      await page.screenshot({ path: join(out, `${width}x${height}-news.png`) });
    } catch (e) {
      record.problems.push(e.message);
      await page.screenshot({ path: join(out, `${width}x${height}-failure.png`) }).catch(() => {});
    } finally { await context.close(); }
    results.push(record);
    console.log(`${record.problems.length ? 'FAIL' : 'ok'} Office unlocks ${record.size}: ${record.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((sum, r) => sum + r.problems.length, 0);
}
