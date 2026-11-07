// #484: real fresh-game and reload paths, with screenshots kept in CI artifacts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, IPHONE_UA, OUT_ROOT, reachProblems } from '../common.mjs';

export async function runExpansionIntro(browser) {
  const out = join(OUT_ROOT, 'webkit', 'expansion-intro');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const tag = `${width}x${height}`;
    const rec = { tag, problems: [] };
    page.on('pageerror', (e) => rec.problems.push(e.message));
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-clubname]').fill('Test Club');
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-intro]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      rec.problems.push(...await reachProblems(page, '.nrl-expansion-card', ['[data-expansion-work]', '[data-expansion-skip]']));
      const lines = await page.locator('[data-expansion-intro] .nrl-coach-text').allTextContents();
      rec.lines = lines;
      if (lines.length !== 3 || !lines[0].includes('Test Club') || !lines[2].includes('our first season in the league')) rec.problems.push('intro copy missing');
      if (await page.locator('canvas').count()) rec.problems.push('grounds started before intro finished');
      await page.screenshot({ path: join(out, `${tag}-intro.png`) });
      await page.locator(width === 844 ? '[data-expansion-skip]' : '[data-expansion-work]').tap();
      await page.locator('[data-step="build"]').waitFor();
      const state = await page.evaluate(() => window.__nrlState());
      if (!lines[1].includes(`$${state.money.toLocaleString()}`) || state.objectives.some((o) => !lines[2].includes(o.text))) rec.problems.push('bank/objectives differ from live state');
      // Reload saves via the existing pagehide autosave. Continue never shows the intro.
      await page.reload();
      await page.locator('[data-nrl-continue-1]').tap();
      await page.waitForFunction(() => !!window.__nrlGame);
      if (await page.locator('[data-expansion-intro]').count()) rec.problems.push('Continue repeated intro');
      // Exercise old-save fallback too: the new-game path, not a flag alone, gates it.
      await ctx.addInitScript(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data?.settings?.hintsSeen) {
              data.settings.hintsSeen = data.settings.hintsSeen.filter((s) => s !== 'expansion-intro');
              localStorage.setItem(key, JSON.stringify(data));
            }
          } catch { /* non-save key */ }
        }
      });
      await page.reload();
      await page.locator('[data-nrl-continue-1]').tap();
      await page.waitForFunction(() => !!window.__nrlGame);
      if (await page.locator('[data-expansion-intro]').count()) rec.problems.push('old save showed intro');
      rec.week = state.week;
    } catch (e) {
      rec.problems.push(e.message);
      await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
    } finally { await ctx.close(); }
    results.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} expansion intro ${tag}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
