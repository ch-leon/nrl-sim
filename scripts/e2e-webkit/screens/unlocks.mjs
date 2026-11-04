import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, openNav, SHEET_EXIT, closeWeekSummary, log } from '../common.mjs';

/** Facility ladder + both veteran exits, played through round 8 on the required phones. */
export async function runUnlocks(browser) {
  const out = join(OUT_ROOT, 'webkit', 'unlocks');
  mkdirSync(out, { recursive: true });
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const report = { width, height, problems: [], rounds: [] };
    const check = (ok, why) => { if (!ok) report.problems.push(why); };
    page.on('pageerror', (e) => report.problems.push(e.message));
    const shot = async (name) => {
      await page.waitForTimeout(350); // capture after the sheet's entry animation
      return page.screenshot({ path: join(out, `${width}x${height}-${name}.png`) });
    };
    try {
      await page.addInitScript(closeWeekSummary);
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
      const start = await page.locator('[data-nrl-start]').boundingBox();
      check(start && start.y + start.height <= height, 'Start is off screen');
      await shot('setup');
      await page.locator('[data-nrl-start]').tap();
      await page.waitForFunction(() => window.__nrlState);
      await page.locator('.nrl-tutorial-skip').tap();
      await page.locator(SHEET_EXIT).tap();
      await shot('club-home');
      const build = async (name, expected) => {
        await openNav(page, 'build');
        await page.waitForSelector('.nrl-build-list');
        check(await page.locator('.nrl-build-row').count() === 12, `${name}: not all 12 tiles visible in the list`);
        const rows = await page.locator('.nrl-build-row').evaluateAll((ns) => ns.map((n) => ({
          name: n.querySelector('.nrl-build-title').textContent,
          locked: /Opens /.test(n.textContent),
          disabled: n.classList.contains('nrl-build-row-disabled'),
          reason: n.querySelector('.nrl-build-why')?.textContent,
        })));
        check(rows.filter((r) => r.locked).length === 12 - expected, `${name}: wrong open set`);
        check(rows.filter((r) => r.locked).every((r) => r.disabled && r.reason?.startsWith('Opens ')), `${name}: missing dimming/reason`);
        await shot(name);
        await page.locator('.nrl-build-list').evaluate((n) => { n.scrollTop = n.scrollHeight; });
        await shot(`${name}-bottom`);
        await page.locator(SHEET_EXIT).tap();
      };
      await build('build-start', 4);
      // Menus support portrait; the live grounds/match asks for landscape.
      if (width < height) await page.setViewportSize({ width: 844, height: 390 });
      for (let round = 1; round < 8; round++) {
        await page.locator('[data-hud="advance"]').tap();
        const ask = page.locator('[data-ask-proceed]');
        await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
        if (await ask.isVisible()) await ask.tap();
        await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
        await page.locator('.nrl-mo-controls [data-pause]').tap();
        await page.locator('.nrl-mo-sheet [data-skip]').tap();
        await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 120000 });
        await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate((n) => n.click());
        await page.waitForFunction((week) => window.__nrlState().week === week, round + 1);
        report.rounds.push(await page.evaluate(() => ({ week: window.__nrlState().week, facilities: window.__nrlState().unlocks?.facilities })));
        if (round === 1) {
          await openNav(page, 'news');
          check((await page.locator('.nrl-news').textContent()).includes('Video Room, Physio Centre'), 'unlock News line missing');
          await shot('news');
          await page.keyboard.press('Escape');
        }
        if (round === 4) await build('build-round5', 9);
      }
      await build('build-round8', 11);
      await openNav(page, 'settings');
      await page.locator('.nrl-unlocks-open').tap();
      check(await page.evaluate(() => !!window.__nrlState().unlocks), 'Settings opened everything without confirmation');
      await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
      check(await page.evaluate(() => !!window.__nrlState().unlocks), 'Cancel changed unlocks');
      await page.locator('.nrl-unlocks-open').tap();
      await page.getByRole('button', { name: 'Confirm', exact: true }).tap();
      check(await page.evaluate(() => !window.__nrlState().unlocks), 'Settings confirmation did not open everything');
      check(!await page.locator('.nrl-unlocks-row').isVisible(), 'Settings skip still visible');
      await page.keyboard.press('Escape');
      await context.close();
      const veteranContext = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const veteran = await veteranContext.newPage();
      await veteran.goto(BASE);
      await veteran.waitForSelector('[data-nrl-start]');
      await veteran.locator('[data-nrl-open-all]').check();
      await veteran.locator('[data-nrl-start]').tap();
      await veteran.waitForFunction(() => window.__nrlState);
      await veteran.locator('.nrl-tutorial-skip').tap();
      check(await veteran.evaluate(() => !window.__nrlState().unlocks), 'veteran setup retained unlocks');
      await openNav(veteran, 'build');
      check(await veteran.locator('.nrl-build-row').count() === 12, 'veteran missing tiles');
      check(!(await veteran.locator('.nrl-build-list').textContent()).includes('Opens '), 'veteran has closed tiles');
      await veteran.waitForTimeout(350);
      await veteran.screenshot({ path: join(out, `${width}x${height}-veteran.png`) });
      await veteranContext.close();
    } catch (e) { report.problems.push(e.stack ?? String(e)); await shot('failure').catch(() => {}); }
    finally { await context.close().catch(() => {}); }
    reports.push(report);
    log(`unlocks ${width}x${height}: ${report.problems.length ? report.problems.join('; ') : 'PASS'}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.reduce((n, r) => n + r.problems.length, 0);
}
