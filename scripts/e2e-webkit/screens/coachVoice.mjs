// #476: the actual three taps, two weeks and every speaker channel at phone sizes.
// Included in the screens shard so screenshots are PR CI artifacts, never commits.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_ROOT, BASE, IPHONE_UA, openNav } from '../common.mjs';

export async function runCoachVoice(browser) {
  const out = join(OUT_ROOT, 'webkit', 'coach-voice');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    const tag = `${width}x${height}`;
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    const rec = { tag, problems: [], channels: [] };
    page.on('pageerror', (e) => rec.problems.push(e.message));
    let face;
    const shot = async (channel, selector) => {
      const block = page.locator(`${selector} [data-coach-line]`).first();
      await block.waitFor();
      const image = await block.locator('img').getAttribute('src');
      const name = await block.locator('.nrl-coach-name').textContent();
      if (name !== 'Mick Dorney' || !image?.startsWith('data:image/png')) rec.problems.push(`${channel}: missing identity`);
      if (face && face !== image) rec.problems.push(`${channel}: different portrait`);
      face = image;
      rec.channels.push(channel);
      // Let the sheet's entry animation finish before taking the evidence.
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `${tag}-${channel}.png`) });
    };
    const home = async () => {
      if (await page.locator('.nrl-screen-region:not([data-screen-key="club-home"])').count()) {
        await page.locator('.nrl-nav [data-nav-home]').tap();
      }
    };
    const finishMatch = async () => {
      await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
      await page.locator('.nrl-mo-controls [data-pause]').tap();
      await page.locator('.nrl-mo-sheet [data-skip]').tap();
      await page.locator('.nrl-mo-ft [data-back-to-club]').tap({ timeout: 60000 });
    };
    const summary = async (week) => {
      await home();
      // A generated event can take precedence over the summary, as before.
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(300);
        if (await page.locator('[data-week-summary]').count()) break;
        if (await page.locator('[data-event-choice]').count()) await page.locator('[data-event-choice]').first().tap();
      }
      await page.waitForSelector('[data-week-summary]');
      const fit = await page.evaluate(() => {
        const scroll = document.querySelector('.nrl-summary-modal .nrl-modal-scroll');
        return [...document.querySelectorAll('[data-summary-advance], [data-summary-close]')].map((b) => {
          const r = b.getBoundingClientRect();
          const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
          return { top: r.top, bottom: r.bottom, height: r.height, reachable: b.contains(hit), scrollTop: scroll.scrollTop };
        });
      });
      rec[`week${week}Buttons`] = fit;
      if (fit.some((b) => b.top < 0 || b.bottom > height || b.height < 43.99 || !b.reachable || b.scrollTop !== 0)) rec.problems.push(`week ${week}: summary buttons scroll or cannot be tapped`);
      await shot(`summary-${week}`, '[data-week-summary]');
      await page.locator('[data-summary-close]').tap();
    };
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-start]').tap();
      await page.waitForSelector('[data-step="build"]');
      await shot('tutorial', '.nrl-tutorial-bubble');
      // Club home works upright; placement and live matches use landscape, as today.
      if (height > width) await page.setViewportSize({ width: 844, height: 390 });
      await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
      await page.waitForSelector('[data-step="place"]');
      await page.locator('.nrl-placebar [data-place-go]').tap();
      await page.waitForSelector('[data-step="recruit"]');
      await page.locator('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)').first().tap();
      await page.waitForSelector('[data-step="advance"]');
      await page.locator('.nrl-hud-actions > [data-hud="advance"]').tap();
      await finishMatch();
      await page.waitForFunction(() => window.__nrlState().settings.tutorialDone);
      if (await page.locator('.nrl-tutorial').count()) rec.problems.push('tutorial did not finish after the three taps');
      if (height > width) await page.setViewportSize({ width, height });
      await summary(1);
      await openNav(page, 'lineup');
      await shot('hint', '.nrl-hint');
      await home();
      await openNav(page, 'news');
      await shot('news', '.nrl-news');
      const news = await page.locator('.nrl-news').textContent();
      if (!news.includes("the board's objectives") || !news.includes('That is the weekly job done')) rec.problems.push('board/tutorial coach news missing');
      await home();
      await page.evaluate(() => window.__nrlShowCard('fanDay'));
      await openNav(page, 'news');
      await page.locator('[data-decisions-open]').tap();
      await shot('event', '.nrl-event-card');
      for (let i = 0; i < 8 && await page.locator('[data-event-choice]').count(); i++) await page.locator('[data-event-choice]').first().tap();
      await home();
      if (height > width) await page.setViewportSize({ width: 844, height: 390 });
      await page.locator('.nrl-hud-actions > [data-hud="advance"]').tap();
      await finishMatch();
      if (height > width) await page.setViewportSize({ width, height });
      await summary(2);
      rec.week = await page.evaluate(() => window.__nrlState().week);
      if (rec.week !== 3) rec.problems.push(`expected two weeks played, got week ${rec.week}`);
    } catch (e) {
      rec.problems.push(e.message);
      await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
    } finally { await ctx.close(); }
    results.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} coach voice ${tag}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
