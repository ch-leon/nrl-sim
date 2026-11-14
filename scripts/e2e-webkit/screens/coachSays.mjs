// #477: planted test states and the weekly summary card, at phone landscape.
// Evidence goes to the existing screens CI artifact, never into git.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_ROOT, BASE, IPHONE_UA, reachProblems, skipFromPill } from '../common.mjs';

export async function runCoachSays(browser) {
  const out = join(OUT_ROOT, 'webkit', 'coach-says');
  mkdirSync(out, { recursive: true });
  const records = [];
  for (const [width, height] of [[667, 375], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const rec = { size: `${width}x${height}`, problems: [], lines: [] };
    page.on('pageerror', (e) => rec.problems.push(e.message));
    const shot = async (name) => {
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `${rec.size}-${name}.png`) });
    };
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      // Set up complete, fit starters and enough natural cover. All changes are
      // to this test game's in-memory state, exposed by the existing ?e2e hook.
      await page.evaluate(() => {
        const s = window.__nrlState();
        const positions = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'];
        s.squad.forEach((p, i) => { p.position = positions[i % 9]; p.injuredWeeks = 0; p.suspendedWeeks = 0; });
        s.lineup.starters = s.squad.slice(0, 9).map((p) => p.id);
        s.objectives = [];
        s.eventDeck.pending = [];
        s.settings.weekSummary = true;
        s.money = 200000;
        // These planted scenarios exercise rules 3/4 after their destinations open.
        s.unlocks.screens = ['finance', 'staff'];
      });
      {
        await page.evaluate(() => {
          const s = window.__nrlState();
          s.money = 1000;
          s.eventDeck.pending = [];
        });
        await page.locator('.nrl-nav [data-nav-home]').tap();
        if (await page.locator('.nrl-club-home-coach').count()) throw new Error('Coach row leaked into landscape HUD');
        await page.locator('.nrl-hud-actions > [data-hud="advance"]').tap();
        await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
        await skipFromPill(page);
        await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 120000 });
        // Clear generated cards and keep one known suggestion for the actual
        // once-a-week summary, which waits until Back to Club.
        await page.evaluate(() => {
          const s = window.__nrlState();
          s.eventDeck.pending = [];
          s.squad.forEach((p) => { p.injuredWeeks = 0; p.suspendedWeeks = 0; });
          s.money = 1000;
          s.objectives = [];
        });
        await page.locator('.nrl-mo-ft [data-back-to-club]').tap();
        await page.waitForSelector('[data-week-summary]');
        const line = await page.locator('[data-week-summary] .nrl-coach-text').textContent();
        rec.lines.push(line);
        if (!line.includes("weeks of cash left. No building till that's sorted.")) throw new Error(`wrong weekly suggestion: ${line}`);
        rec.problems.push(...await reachProblems(page, '[data-week-summary]', ['[data-summary-advance]', '[data-summary-close]']));
        await shot('weekly-summary');
      }
    } catch (e) {
      rec.problems.push(e.message);
      await shot('failure').catch(() => {});
    } finally { await context.close(); }
    records.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} Coach says ${rec.size}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(records, null, 2));
  return records.reduce((n, r) => n + r.problems.length, 0);
}
