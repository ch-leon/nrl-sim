// #480: phone setup copy, first-career hint and untouched Normal default.
// Screenshots stay in the existing CI artifact, never in git.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_ROOT, BASE, IPHONE_UA } from '../common.mjs';

export async function runDifficulty(browser) {
  const out = join(OUT_ROOT, 'webkit', 'difficulty');
  mkdirSync(out, { recursive: true });
  const results = [];
  const blurbs = {
    normal: "The game as it's meant to be played.",
    easy: 'More money, cheaper wages, rivals a step slower.',
    hard: 'Less money, dearer wages, sharper rivals.',
  };
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    const page = await ctx.newPage();
    const record = { size: `${width}x${height}`, layouts: [], problems: [] };
    page.on('pageerror', (e) => record.problems.push(e.message));
    try {
      await page.goto(BASE);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      for (const saved of [false, true]) {
        await page.waitForSelector('[data-nrl-start]');
        await page.locator('[data-nrl-clubname]').blur();
        if (await page.locator('[data-nrl-difficulty-normal]').getAttribute('aria-pressed') !== 'true') record.problems.push('Normal is not the default');
        for (const [difficulty, text] of Object.entries(blurbs)) {
          // Normal is checked before any tap, so a suggested Easy cannot pre-select it.
          if (difficulty !== 'normal') await page.locator(`[data-nrl-difficulty-${difficulty}]`).tap();
          if (await page.locator('[data-nrl-difficulty-blurb]').textContent() !== text) record.problems.push(`wrong ${difficulty} blurb`);
          const hint = page.locator('[data-nrl-difficulty-hint]');
          if (await hint.count() !== Number(!saved)) record.problems.push(`wrong hint with saved=${saved}`);
          if (!saved && await hint.textContent() !== 'First career? Start on Easy.') record.problems.push('wrong hint text');
          const layout = await page.evaluate(() => {
            const start = document.querySelector('[data-nrl-start]');
            const b = start.getBoundingClientRect();
            const title = document.querySelector('.nrl-title');
            const panel = document.querySelector('.nrl-title-setup').getBoundingClientRect();
            const build = document.querySelector('[data-nrl-build]').getBoundingClientRect();
            const copyVisible = [...document.querySelectorAll('.nrl-title-difficulty-copy')].every((e) => {
              const r = e.getBoundingClientRect();
              return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
            });
            return {
              top: b.top, bottom: b.bottom, scroll: title.scrollTop,
              copyVisible,
              reachable: start.contains(document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2)),
              buildOverlap: build.right > panel.left && build.left < panel.right && build.bottom > panel.top && build.top < panel.bottom,
            };
          });
          record.layouts.push({ saved, difficulty, ...layout });
          if (width > height && (layout.top < 0 || layout.bottom > height || layout.scroll !== 0 || !layout.reachable)) record.problems.push(`Start requires scrolling or is covered: ${saved}/${difficulty}`);
          if (!layout.copyVisible) record.problems.push(`guidance outside viewport: ${saved}/${difficulty}`);
          if (layout.buildOverlap) record.problems.push('build label overlaps setup');
          await page.screenshot({ path: join(out, `${width}x${height}-${saved ? 'saved' : 'fresh'}-${difficulty}.png`) });
        }
        if (!saved) {
          // Reopen a fresh setup, then Start without touching any difficulty.
          await page.reload();
          await page.locator('[data-nrl-start]').tap();
          await page.locator('[data-expansion-work]').tap();
          await page.waitForSelector('.nrl-tutorial-skip');
          const difficulty = await page.evaluate(() => window.__nrlState().settings.difficulty);
          if (difficulty !== 'normal') record.problems.push(`untouched Start used ${difficulty}`);
          await page.locator('.nrl-tutorial-skip').tap();
          await page.screenshot({ path: join(out, `${width}x${height}-club-home.png`) });
          await page.reload();
          await page.locator('[data-nrl-new-2]').tap();
        }
      }
    } catch (e) {
      record.problems.push(e.message);
    } finally {
      await ctx.close();
    }
    results.push(record);
    console.log(`${record.problems.length ? 'FAIL' : 'ok'} difficulty ${record.size}: ${record.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
