// #475: both identities at the required phone sizes. Images go to the existing
// WebKit CI artifact, never to git.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_ROOT, BASE, IPHONE_UA, openNav } from '../common.mjs';

export async function runCoachName(browser) {
  const out = join(OUT_ROOT, 'webkit', 'coach-name');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    for (const name of ['Sam Hale', '']) {
      const tag = `${width}x${height}-${name ? 'named' : 'unnamed'}`;
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
      const page = await ctx.newPage();
      const record = { tag, problems: [] };
      page.on('pageerror', (e) => record.problems.push(e.message));
      try {
        await page.goto(BASE);
        await page.waitForSelector('[data-nrl-coachname]');
        await page.fill('[data-nrl-coachname]', name);
        // Blur the field before measuring; Playwright's tap may otherwise scroll it into view.
        await page.locator('[data-nrl-coachname]').blur();
        record.layout = await page.evaluate(() => {
          const b = document.querySelector('[data-nrl-start]').getBoundingClientRect();
          const label = document.querySelector('[data-nrl-build]').getBoundingClientRect();
          const panel = document.querySelector('.nrl-title-setup').getBoundingClientRect();
          const buildOverlap = label.right > panel.left && label.left < panel.right && label.bottom > panel.top && label.top < panel.bottom;
          return { top: b.top, bottom: b.bottom, viewport: innerHeight, scroll: document.querySelector('.nrl-title').scrollTop, buildOverlap };
        });
        if (width > height && (record.layout.top < 0 || record.layout.bottom > height || record.layout.scroll !== 0)) record.problems.push('Start requires scrolling');
        if (record.layout.buildOverlap) record.problems.push('build label overlaps setup');
        await page.screenshot({ path: join(out, `${tag}-setup.png`) });
        await page.locator('[data-nrl-start]').tap();
        await page.waitForSelector('.nrl-tutorial-text');
        const address = name || 'Coach';
        record.bubble = await page.locator('.nrl-tutorial-text .nrl-coach-text').textContent();
        if (!record.bubble.startsWith(`${address}, tap `)) record.problems.push(`wrong bubble: ${record.bubble}`);
        await page.screenshot({ path: join(out, `${tag}-tutorial.png`) });
        const state = await page.evaluate(() => window.__nrlState());
        if (name ? state.coachName !== name : Object.hasOwn(state, 'coachName')) record.problems.push('wrong coachName in state');
        await page.locator('.nrl-tutorial-skip').tap();
        await openNav(page, 'news');
        await page.waitForSelector('.nrl-news');
        const news = await page.locator('.nrl-news').textContent();
        record.board = `${address}, the board's objectives for season 1:`;
        if (!news.includes(record.board)) record.problems.push('season-1 board objectives missing from News');
        await page.screenshot({ path: join(out, `${tag}-news.png`) });
        // Reload through the real save path and confirm identity survives (or stays absent).
        await page.waitForTimeout(1500);
        await page.reload();
        await page.locator('[data-nrl-continue-1]').tap();
        await page.waitForFunction(() => !!window.__nrlState);
        const saved = await page.evaluate(() => window.__nrlState());
        if (name ? saved.coachName !== name : Object.hasOwn(saved, 'coachName')) record.problems.push('wrong coachName after save/load');
      } catch (e) {
        record.problems.push(e.message);
      } finally {
        await ctx.close();
      }
      results.push(record);
      console.log(`${record.problems.length ? 'FAIL' : 'ok'} coach name ${tag}: ${record.problems.join('; ')}`);
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
