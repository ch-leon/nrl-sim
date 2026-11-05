// Real new-game setup and watched/skip result, with screenshots in the CI artifact only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, openNav, closeWeekSummary, log } from '../common.mjs';

export async function runDerby(browser) {
  const out = join(OUT_ROOT, 'webkit', 'derby');
  mkdirSync(out, { recursive: true });
  const town = JSON.parse(readFileSync('src/data/towns.json', 'utf8')).find(t => t.name === 'Launceston' && t.country === 'AU');
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const tag = `${width}x${height}`;
    const report = { tag, ok: false };
    const shot = async (name) => {
      await page.waitForTimeout(350);
      await page.screenshot({ path: join(out, `${tag}-${name}.png`) });
    };
    try {
      await page.addInitScript(closeWeekSummary);
      // Setup uses Date.now() >>> 0: seed 7 has Launceston at home in round one.
      await page.clock.setFixedTime(new Date(417 * 4294967296 + 7));
      await page.goto(BASE);
      await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
      await page.locator('[data-nrl-town]').fill(`${town.name}, ${town.region}, ${town.country}`);
      await page.locator('[data-nrl-open-all]').check(); // expose Staff & Board for its screenshot
      await page.locator('[data-nrl-start]').tap();
      await page.waitForFunction(() => window.__nrlState);
      await page.locator('.nrl-tutorial-skip').tap();
      const state = await page.evaluate(() => window.__nrlState());
      if (state.home.lat !== town.lat || !state.objectives.some(o => o.rivalId === 'rival-larrikins' && o.text.endsWith(', our derby rival'))) throw new Error('Listed town did not produce its nearest derby objective');
      // Club home is intentionally portrait-only; turning sideways returns to the grounds.
      if (width >= height) await page.setViewportSize({ width: 390, height: 844 });
      await openNav(page, 'club');
      const next = page.locator('.nrl-club-home-next');
      await next.scrollIntoViewIfNeeded();
      if (!(await next.textContent()).includes('Derby')) throw new Error('Missing Derby tag');
      if (await next.evaluate(n => n.scrollWidth > n.clientWidth)) throw new Error('Derby row overflows');
      await shot('tag-portrait');
      if (width >= height) await page.setViewportSize({ width, height });
      await openNav(page, 'staff');
      const objective = page.locator('.nrl-board-obj').filter({ hasText: 'our derby rival' });
      await objective.scrollIntoViewIfNeeded();
      await shot('board');
      await openNav(page, 'news');
      const preview = page.getByText('Derby week against Launceston Larrikins.', { exact: false }).last();
      await preview.scrollIntoViewIfNeeded();
      await shot('news-before');
      if (width < height) await page.setViewportSize({ width: 844, height: 390 });
      await openNav(page, 'club');
      await page.locator('[data-hud="advance"]').tap();
      await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
      const proceed = page.locator('[data-ask-proceed]');
      if (await proceed.isVisible()) await proceed.tap();
      await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
      await page.locator('.nrl-mo-controls [data-skip-pill]').tap();
      await page.waitForSelector('[data-skip-pill][data-armed]');
      await page.locator('.nrl-mo-controls [data-skip-pill]').tap();
      await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 120000 });
      await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate(n => n.click());
      await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      await page.waitForFunction(() => window.__nrlState().week === 2);
      if (width < height) await page.setViewportSize({ width, height });
      await openNav(page, 'news');
      const result = page.getByText(/Derby (win over|loss to|draw with) Launceston Larrikins/).last();
      await result.scrollIntoViewIfNeeded();
      report.result = await result.textContent();
      await shot('news-after');
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
      report.ok = true;
    } catch (e) {
      report.error = e.stack ?? String(e);
      await shot('failure').catch(() => {});
    } finally { await context.close(); }
    reports.push(report);
    log(`${report.ok ? 'ok ' : 'FAIL'} derby ${tag}${report.error ? `: ${report.error}` : ''}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(r => !r.ok).length;
}
