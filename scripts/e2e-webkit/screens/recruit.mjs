// #478: fresh Easy/Hard games, shortlist/full/sign/undo on landscape phones
// and Club home upright. Screenshots stay in CI's e2e-webkit-screens artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, openNav, SHEET_EXIT } from '../common.mjs';

export async function runRecruit(browser) {
  let failures = 0;
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    for (const difficulty of ['easy', 'hard']) {
      const tag = `${width}x${height}-${difficulty}`;
      const out = join(OUT_ROOT, 'webkit', `recruit-${tag}`);
      mkdirSync(out, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: IPHONE_UA });
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      const report = { tag, errors: [], screenshots: [] };
      page.on('pageerror', (err) => report.errors.push(err.message));
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const shot = async (name) => {
        // Dismiss plain hints so four rows are visible on the short phones.
        // Keep the signing's action toast in the signed screenshot.
        for (const toast of await page.locator('.nrl-toast:not(:has(.nrl-toast-btn))').all()) await toast.tap();
        await page.screenshot({ path: join(out, `${name}.png`), animations: 'disabled' });
        report.screenshots.push(`${name}.png`);
      };
      try {
        await page.goto(BASE);
        await page.locator(`[data-nrl-difficulty-${difficulty}]`).tap();
        await page.locator('[data-nrl-clubname]').fill('Shortlist FC');
        await page.locator('[data-nrl-start]').tap();
        await page.locator('.nrl-tutorial-skip').tap();
        await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
        await page.waitForSelector('.nrl-nav');
        await page.waitForTimeout(300);
        if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
        // Let the install hint expire before capturing the recruit sheet.
        await page.waitForTimeout(5500);
        await shot('club-home');
        await openNav(page, 'recruit');
        const rows = page.locator('.nrl-recruit [data-row-player]');
        check(await rows.count() === 4, 'new game must show four rows');
        check(await page.locator('[data-coach-pick]').count() === 1, 'exactly one pick');
        check(!await page.locator('[data-sort-menu]').isVisible(), 'sort hidden on shortlist');
        const picked = await page.locator('[data-coach-pick]').evaluate((e) => e.closest('[data-row-player]').getAttribute('data-row-player'));
        await shot('shortlist');
        // Visible chip text must fit its cell, including at upright phone width.
        check(await page.locator('[data-coach-pick]').evaluate((e) => {
          const r = e.getBoundingClientRect(), parent = e.parentElement.getBoundingClientRect();
          return r.left >= parent.left && r.right <= parent.right + 1 && r.bottom <= parent.bottom + 1;
        }), 'pick badge clipped');
        const pool = await page.evaluate(() => window.__nrlState().freeAgents.length);
        check(await page.locator('[data-show-all]').textContent() === `Show all ${pool}`, 'pool count');
        await page.locator('[data-show-all]').tap();
        check(await rows.count() === pool, 'full pool shown');
        check(await page.locator('[data-sort-menu]').isVisible(), 'sort shown in full view');
        const original = await rows.evaluateAll((rs) => rs.map((r) => r.getAttribute('data-row-player')));
        // Overall rounds the mean; read the actual displayed ratings for its stable ordering.
        check(await rows.evaluateAll((rs) => rs.every((r, i) => i === 0 ||
          Number(rs[i - 1].querySelector('.nrl-row-ovr').textContent) >= Number(r.querySelector('.nrl-row-ovr').textContent))), 'overall order');
        await shot('show-all');
        for (const sort of ['fee', 'age', 'rating']) {
          await page.locator('[data-sort-menu]').tap();
          await page.locator(`[data-sort="${sort}"]`).tap();
          if (sort === 'rating') check(JSON.stringify(await rows.evaluateAll((rs) => rs.map((r) => r.getAttribute('data-row-player')))) === JSON.stringify(original), 'rating order restored');
        }
        await page.locator(SHEET_EXIT).tap();
        await openNav(page, 'recruit');
        check(await rows.count() === 4, 'reopening resets shortlist');
        const before = await page.evaluate(() => ({ bank: window.__nrlState().money, squad: window.__nrlState().squad.length }));
        await page.locator(`[data-row-player="${picked}"] .nrl-row-action`).tap();
        check(await page.evaluate((id) => window.__nrlState().squad.some((p) => p.id === id), picked), 'pick signed');
        check(await page.locator('.nrl-toast-btn').textContent() === 'Undo', 'undo toast');
        await shot('signed');
        await page.locator('.nrl-toast-btn').tap();
        check(await page.evaluate((b) => window.__nrlState().money === b.bank && window.__nrlState().squad.length === b.squad, before), 'undo restores bank and squad');
        await shot('undone');
      } catch (err) { report.errors.push(err.message); await shot('failure').catch(() => {}); }
      failures += report.errors.length;
      writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
      console.log(`${report.errors.length ? 'FAIL' : 'ok'} recruit ${tag}`, report.errors.join('; '));
      await ctx.close();
    }
  }
  return failures;
}
