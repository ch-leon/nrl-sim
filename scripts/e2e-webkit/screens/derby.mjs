// Real new-game setup and watched/skip result, with screenshots in the CI artifact only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { advanceOnce, confirmStartingLeague, playTrials, BASE, OUT_ROOT, openNav, closeWeekSummary, log, setupStep } from '../common.mjs';

export async function runDerby(browser) {
  const out = join(OUT_ROOT, 'webkit', 'derby');
  mkdirSync(out, { recursive: true });
  const town = JSON.parse(readFileSync('src/data/towns.json', 'utf8')).find(t => t.name === 'Launceston' && t.country === 'AU');
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390]]) {
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
      await setupStep(page);
      await page.locator('[data-nrl-open-all]').check(); // expose Staff & Board for its screenshot
      await page.locator('[data-nrl-start]').tap();
      await confirmStartingLeague(page);
      await page.locator('[data-expansion-work]').tap();
      await page.waitForFunction(() => window.__nrlState);
      await page.locator('.nrl-tutorial-skip').tap();
      await playTrials(page);
      const state = await page.evaluate(() => window.__nrlState());
      if (state.home.lat !== town.lat || !state.objectives.some(o => o.rivalId === 'rival-larrikins' && o.text.endsWith(', our derby rival'))) throw new Error('Listed town did not produce its nearest derby objective');
      await openNav(page, 'staff');
      const objective = page.locator('.nrl-board-obj').filter({ hasText: 'our derby rival' });
      await objective.scrollIntoViewIfNeeded();
      await shot('board');
      // The neighbour is not always week 1. Walk the calendar until that week, then play it.
      let found = false;
      for (let i = 0; i < 20 && !found; i++) {
        const next = await page.locator('[data-hud="next"]').innerText();
        if (/Launceston/i.test(next)) {
          await openNav(page, 'news');
          const preview = page.getByText('Derby week against Launceston Larrikins.', { exact: false }).last();
          await preview.scrollIntoViewIfNeeded();
          await shot('news-before');
          await openNav(page, 'club');
          if (await advanceOnce(page) !== 'match') throw new Error('Derby week did not start a match');
          found = true;
          break;
        }
        await openNav(page, 'club');
        if (await advanceOnce(page) === 'match') {
          await page.locator('.nrl-mo-controls [data-pause]').tap();
          await page.locator('.nrl-mo-sheet [data-skip]').tap();
          await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 60000 });
          await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
        }
      }
      if (!found) throw new Error('No week against Launceston Larrikins');
      const occasion = page.locator('[data-occasion="derby"]');
      await occasion.waitFor();
      if ((await occasion.textContent()) !== 'DERBY') throw new Error('Missing Derby tag on the score bug');
      await shot('derby-tag');
      await page.locator('.nrl-mo-controls [data-pause]').tap();
      await page.locator('.nrl-mo-sheet [data-skip]').tap();
      await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate(n => n.click());
      await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
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
