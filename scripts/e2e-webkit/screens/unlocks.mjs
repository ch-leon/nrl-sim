import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { playTrials, BASE, OUT_ROOT, openNav, SHEET_EXIT, closeWeekSummary, log, skipFromPill } from '../common.mjs';

/** Facility ladder + both veteran exits, played through round 8 on the required phones. */
export async function runUnlocks(browser) {
  const out = join(OUT_ROOT, 'webkit', 'unlocks');
  mkdirSync(out, { recursive: true });
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    const page = await context.newPage();
    const report = { width, height, problems: [], rounds: [], assertions: 0 };
    const check = (ok, what) => {
      report.assertions++;
      if (!ok) report.problems.push(what);
      log(`${ok ? 'ok ' : 'FAIL'} unlocks ${width}x${height}: ${what}`);
    };
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
      check(start && start.y + start.height <= height, 'Start is visible');
      await shot('setup');
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.waitForFunction(() => window.__nrlState);
      await page.locator('.nrl-tutorial-skip').tap();
      await playTrials(page);
      await page.locator(SHEET_EXIT).tap();
      await shot('club-home');
      const build = async (name, expected) => {
        await openNav(page, 'build');
        await page.waitForSelector('.nrl-build-list');
        check(await page.locator('[data-see-calls]').isEnabled(), `${name}: coach calls link stays enabled`);
        check(await page.locator('.nrl-build-row').count() === 12, `${name}: all 12 tiles stay listed`);
        const rows = await page.locator('.nrl-build-row').evaluateAll((ns) => ns.map((n) => ({
          name: n.querySelector('.nrl-build-title').textContent,
          locked: /Opens /.test(n.textContent),
          disabled: n.classList.contains('nrl-build-row-disabled'),
          reason: n.querySelector('.nrl-build-why')?.textContent,
        })));
        check(rows.filter((r) => r.locked).length === 12 - expected, `${name}: matches the expected open set`);
        check(rows.filter((r) => r.locked).every((r) => r.disabled && r.reason?.startsWith('Opens ')), `${name}: closed tiles are dimmed and explain when they open`);
        await shot(name);
        await page.locator('.nrl-build-list').evaluate((n) => { n.scrollTop = n.scrollHeight; });
        await shot(`${name}-bottom`);
        await page.locator(SHEET_EXIT).tap();
      };
      await build('build-start', 4);
      // Menus support portrait; the live grounds/match asks for landscape.
      for (let round = 1; round < 8; round++) {
        if (width < height) await page.setViewportSize({ width: 844, height: 390 });
        await page.locator('[data-hud="advance"]').tap();
        const ask = page.locator('[data-ask-proceed]');
        await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
        if (await ask.isVisible()) await ask.tap();
        await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
        await skipFromPill(page);
        await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 120000 });
        await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate((n) => n.click());
        // The week settles before the scene switch; nav must see the visible dock.
        await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
        await page.waitForFunction((week) => window.__nrlState().week === week, round + 1);
        if (width < height) {
          await page.setViewportSize({ width, height });
          await page.waitForSelector('[data-club-home]');
        }
        report.rounds.push(await page.evaluate(() => ({ week: window.__nrlState().week, facilities: window.__nrlState().unlocks?.facilities })));
        if (round === 1) {
          await openNav(page, 'news');
          check((await page.locator('.nrl-news').textContent()).includes('Video Room, Physio Centre'), 'unlock News line is present');
          await shot('news');
          await page.keyboard.press('Escape');
        }
        if (round === 4) await build('build-round5', 9);
      }
      await build('build-round8', 11);
      await openNav(page, 'settings');
      await page.locator('.nrl-unlocks-open').tap();
      check(await page.evaluate(() => !!window.__nrlState().unlocks), 'Settings waits for confirmation');
      await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
      check(await page.evaluate(() => !!window.__nrlState().unlocks), 'Cancel preserves the ladder');
      await page.locator('.nrl-unlocks-open').tap();
      await page.getByRole('button', { name: 'Confirm', exact: true }).tap();
      check(await page.evaluate(() => !window.__nrlState().unlocks), 'Settings confirmation opens everything');
      check(!await page.locator('.nrl-unlocks-row').isVisible(), 'Settings skip disappears after use');
      await page.keyboard.press('Escape');
      await context.close();
      const veteranContext = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const veteran = await veteranContext.newPage();
      await veteran.goto(BASE);
      await veteran.waitForSelector('[data-nrl-start]');
      await veteran.locator('[data-nrl-open-all]').check();
      await veteran.locator('[data-nrl-start]').tap();
      await veteran.locator('[data-expansion-work]').tap();
      await veteran.waitForFunction(() => window.__nrlState);
      await veteran.locator('.nrl-tutorial-skip').tap();
      check(await veteran.evaluate(() => !window.__nrlState().unlocks), 'veteran setup omits unlocks');
      await openNav(veteran, 'build');
      check(await veteran.locator('.nrl-build-row').count() === 12, 'veteran Build lists all 12 facilities');
      check(!(await veteran.locator('.nrl-build-list').textContent()).includes('Opens '), 'veteran Build has no closed facilities');
      await veteran.waitForTimeout(350);
      await veteran.screenshot({ path: join(out, `${width}x${height}-veteran.png`) });
      await veteranContext.close();
    } catch (e) {
      report.problems.push(e.stack ?? String(e));
      log(`FAIL unlocks ${width}x${height}: ${e.message}`);
      await shot('failure').catch(() => {});
    }
    finally { await context.close().catch(() => {}); }
    if (!report.assertions) { report.problems.push('No assertions ran'); log(`FAIL unlocks ${width}x${height}: no assertions ran`); }
    reports.push(report);
    log(`unlocks ${width}x${height}: ${report.problems.length ? report.problems.join('; ') : 'PASS'}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.reduce((n, r) => n + r.problems.length, 0);
}
