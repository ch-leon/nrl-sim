// #488: actual country setup, lazy loading, ladder, Club home and watched report.
// Screenshots are kept by the existing CI artifact, never committed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, openNav, closeWeekSummary, playTrials, log, skipFromPill } from '../common.mjs';

export async function runContentPacks(browser) {
  const out = join(OUT_ROOT, 'webkit', 'content-packs');
  mkdirSync(out, { recursive: true });
  const towns = JSON.parse(readFileSync('src/data/towns.json', 'utf8'));
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    for (const country of ['GB', 'AU']) {
      const town = towns.find(t => t.country === country);
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, serviceWorkers: 'block' });
      const page = await context.newPage();
      const tag = `${country}-${width}x${height}`;
      const report = { tag, ok: false, ukRequests: 0, errors: [] };
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('request', req => { if (/\/uk-[^/]+\.js(?:\?|$)/.test(req.url())) report.ukRequests++; });
      const shot = async name => {
        await page.waitForTimeout(350);
        await page.screenshot({ path: join(out, `${tag}-${name}.png`) });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
      };
      try {
        await page.addInitScript(closeWeekSummary);
        await page.clock.setFixedTime(new Date(417 * 4294967296 + 7));
        await page.goto(BASE);
        await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
        if (report.ukRequests) throw new Error('UK fetched before choosing a UK career');
        await page.locator('[data-nrl-town]').fill(`${town.name}, ${town.region}, ${town.country}`);
        await page.locator('[data-nrl-start]').tap();
        await page.locator('[data-expansion-work]').tap();
        await page.waitForFunction(() => window.__nrlState);
        await page.locator('.nrl-tutorial-skip').tap();
        const state = await page.evaluate(() => window.__nrlState());
        const expected = country === 'GB' ? 'uk' : 'au';
        if (state.pack !== expected || state.league.clubs.length !== (expected === 'uk' ? 12 : 16)) throw new Error('Wrong pack or club count');
        if (report.ukRequests !== (expected === 'uk' ? 1 : 0)) throw new Error(`Unexpected UK requests: ${report.ukRequests}`);
        report.pack = state.pack;
        report.clubs = state.league.clubs.length;
        if (width < height) {
          await openNav(page, 'club');
          await page.locator('[data-club-home]').waitFor();
          await shot('club-home');
        }
        await playTrials(page);
        await openNav(page, 'ladder');
        await page.locator('.nrl-ladder-table').waitFor();
        await shot('ladder');
        // Matches play in landscape. Capture the report again upright afterwards.
        if (width < height) await page.setViewportSize({ width: 844, height: 390 });
        await openNav(page, 'club');
        await page.locator('[data-hud="advance"]').tap();
        await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
        const proceed = page.locator('[data-ask-proceed]');
        if (await proceed.isVisible()) await proceed.tap();
        await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
        await skipFromPill(page);
        await page.waitForSelector('.nrl-mo-ft [data-report]', { timeout: 120000 });
        await page.locator('.nrl-mo-ft [data-report]').tap();
        await page.locator('.nrl-report').waitFor();
        if (width < height) await page.setViewportSize({ width, height });
        await shot('match-report');
        if (report.errors.length) throw new Error(report.errors.join('; '));
        report.ok = true;
      } catch (error) {
        report.error = error.stack ?? String(error);
        await shot('failure').catch(() => {});
      } finally { await context.close(); }
      reports.push(report);
      log(`${report.ok ? 'ok ' : 'FAIL'} content packs ${tag}${report.error ? `: ${report.error}` : ''}`);
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(r => !r.ok).length;
}
