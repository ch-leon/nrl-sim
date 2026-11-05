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
    let phase = 'setup';
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
      // Club home's screen key is 'club'; it is already home, so leave it alone.
      if (await page.locator('.nrl-screen-region:not([data-screen-key="club"])').count()) {
        await page.locator('.nrl-nav [data-nav-home]').tap();
        await page.waitForFunction(() => {
          const screen = document.querySelector('.nrl-screen-region');
          return !screen || screen.getAttribute('data-screen-key') === 'club';
        });
      }
    };
    const viewport = async (w, h) => {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForFunction(([w, h]) => innerWidth === w && innerHeight === h &&
        matchMedia('(orientation: portrait)').matches === (h > w), [w, h]);
      // Let the orientation handlers and the dock's resize observer finish before tapping.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const finishMatch = async () => {
      await page.waitForSelector('.nrl-mo-controls', { timeout: 60000 });
      await page.locator('.nrl-mo-controls [data-pause]').tap();
      await page.locator('.nrl-mo-sheet [data-skip]').tap();
      await page.locator('.nrl-mo-ft [data-back-to-club]').tap({ timeout: 60000 });
      await page.waitForFunction(() => !document.body.classList.contains('nrl-match-active'));
      await page.locator('.nrl-hud-actions > [data-hud="advance"]').waitFor({ state: 'visible' });
    };
    const summary = async (week) => {
      phase = `week-${week}-summary`;
      // Back to Club and the advance finish in landscape. Observe an already open
      // card before navigating: opening a screen would dismiss that dialog.
      if (!await page.locator('[data-week-summary]').count()) await home();
      // A generated decision may arrive after the advance finishes. Wait for
      // either card throughout the existing timeout, rather than answering only
      // during an initial 2.4-second polling window and then waiting on a blocker.
      const deadline = Date.now() + 15000;
      for (;;) {
        const ready = await page.waitForFunction(() => {
          if (document.querySelector('[data-week-summary]')) return 'summary';
          if (document.querySelector('[data-event-choice]')) return 'decision';
          return null;
        }, null, { timeout: Math.max(1, deadline - Date.now()) });
        const kind = await ready.jsonValue();
        await ready.dispose();
        if (kind === 'summary') break;
        await page.locator('[data-event-choice]').first().tap({ timeout: Math.max(1, deadline - Date.now()) });
      }
      // Rotate only once the card exists. WebKit can deliver orientation changes
      // after setViewportSize returns; rotating during the summary's opening races
      // the Club home transition. This also checks the mounted card survives rotation.
      if (height > width) await viewport(width, height);
      await page.locator('[data-week-summary]').waitFor({ state: 'visible' });
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
      await page.locator('[data-week-summary]').waitFor({ state: 'detached' });
      if (height > width) await page.locator('[data-club-home]').waitFor({ state: 'visible' });
    };
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.waitForSelector('[data-step="build"]');
      await shot('tutorial', '.nrl-tutorial-bubble');
      // Club home works upright; placement and live matches use landscape, as today.
      if (height > width) await viewport(844, 390);
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
      if (height > width) await viewport(844, 390);
      await page.locator('.nrl-hud-actions > [data-hud="advance"]').tap();
      await finishMatch();
      await summary(2);
      rec.week = await page.evaluate(() => window.__nrlState().week);
      if (rec.week !== 3) rec.problems.push(`expected two weeks played, got week ${rec.week}`);
    } catch (e) {
      rec.problems.push(`${phase}: ${e.message}`);
      rec.failure = await page.evaluate(() => ({
        viewport: [innerWidth, innerHeight],
        screen: document.querySelector('.nrl-screen-region')?.getAttribute('data-screen-key'),
        dialog: document.querySelector('.nrl-dialog-region')?.textContent,
        body: document.body.className,
        week: window.__nrlState?.().week,
      })).catch(() => null);
      await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
    } finally { await ctx.close(); }
    results.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} coach voice ${tag}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
