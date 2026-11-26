// #482: real season-one Office play-through; screenshots live in the CI artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { confirmStartingLeague, leagueUnlockProgress, playSkippedWeek, playTrials, BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, SHEET_EXIT, setupStep } from '../common.mjs';

export async function runOfficeUnlocks(browser) {
  const out = join(OUT_ROOT, 'webkit', 'office-unlocks');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const record = { size: `${width}x${height}`, problems: [], rounds: [] };
    page.on('pageerror', (e) => record.problems.push(e.message));
    await page.addInitScript(closeWeekSummary);
    const shot = async (tag) => {
      await page.setViewportSize({ width, height });
      await page.locator('[data-nav-more]').tap();
      const tiles = await page.locator('.nrl-nav-sheet [data-screen]').evaluateAll((nodes) => nodes.map((b) => ({ id: b.dataset.screen, locked: b.getAttribute('aria-disabled') === 'true', text: b.textContent, opacity: getComputedStyle(b).opacity })));
      record.rounds.push({ tag, tiles });
      await page.screenshot({ path: join(out, `${width}x${height}-${tag}.png`) });
      await page.locator('[data-nav-more]').tap();
      return tiles;
    };
    try {
      await page.goto(BASE);
      await setupStep(page);
      await page.locator('[data-nrl-difficulty-easy]').tap();
      await page.locator('[data-nrl-start]').tap();
      await confirmStartingLeague(page);
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await playTrials(page);
      await page.waitForFunction(() => !!window.__nrlState);
      const start = await shot('start');
      for (const id of ['finance', 'staff', 'contracts']) if (!start.find((t) => t.id === id)?.locked) record.problems.push(`${id} not locked at start`);
      // A real tap, before playing a home game, must still show Finance.
      await page.locator('.nrl-dock-statusbox').tap();
      await page.waitForSelector('[data-screen-key="finance"]');
      await page.screenshot({ path: join(out, `${width}x${height}-locked-money-tap.png`) });
      await page.locator(SHEET_EXIT).tap();
      // Staff and Contracts open on league rounds played (#844), not calendar weeks.
      let homeSeen = false;
      for (let i = 0; i < 30 && (await leagueUnlockProgress(page)).round < 12; i++) {
        const before = await leagueUnlockProgress(page);
        console.log(`Office ${width}x${height} playing week ${before.week} (league round ${before.round})`);
        await playSkippedWeek(page);
        const progress = await leagueUnlockProgress(page);
        const state = await page.evaluate(() => window.__nrlState());
        if (!homeSeen && progress.home) {
          const tiles = await shot('first-home');
          if (tiles.find((t) => t.id === 'finance')?.locked) record.problems.push('Finance still locked after first home game');
          homeSeen = true;
        }
        if (progress.round >= 4 && !state.unlocks?.screens?.includes('staff')) record.problems.push(`Staff not open at league round ${progress.round}`);
      }
      if ((await leagueUnlockProgress(page)).round < 12) record.problems.push('never reached league round 12');
      const end = await shot('round-12');
      for (const id of ['staff', 'contracts']) if (end.find((t) => t.id === id)?.locked) record.problems.push(`${id} locked at round 12`);
      const finance = end.find((t) => t.id === 'finance');
      if (homeSeen && finance?.locked) record.problems.push('Finance still locked after a home game');
      if (!homeSeen && finance && !finance.locked) record.problems.push('Finance opened with no home game');
      // The guide lines remain readable in News after a run.
      await page.locator('[data-nav-more]').tap();
      await page.locator('.nrl-nav-sheet [data-screen="news"]').tap();
      await page.screenshot({ path: join(out, `${width}x${height}-news.png`) });
    } catch (e) {
      record.problems.push(e.message);
      await page.screenshot({ path: join(out, `${width}x${height}-failure.png`) }).catch(() => {});
    } finally { await context.close(); }
    results.push(record);
    console.log(`${record.problems.length ? 'FAIL' : 'ok'} Office unlocks ${record.size}: ${record.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((sum, r) => sum + r.problems.length, 0);
}
