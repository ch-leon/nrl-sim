// #487: actual new-game trials and round 1; screenshots live only in CI artifacts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { advanceOnce, confirmStartingLeague, BASE, OUT_ROOT, closeWeekSummary, openNav, reachProblems, setupStep } from '../common.mjs';

export async function runTrials(browser) {
  const out = join(OUT_ROOT, 'webkit', 'trials');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height] of [[667, 375], [844, 390]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, serviceWorkers: 'block' });
    await ctx.addInitScript(closeWeekSummary);
    const page = await ctx.newPage();
    const tag = `${width}x${height}`;
    const rec = { tag, problems: [] };
    page.on('pageerror', e => rec.problems.push(e.message));
    const shot = name => page.screenshot({ path: join(out, `${tag}-${name}.png`) });
    try {
      await page.goto(BASE);
      await setupStep(page, 2);
      await page.locator('[data-nrl-clubname]').fill('Trial Club');
      await setupStep(page, 3);
      await page.locator('[data-nrl-start]').tap();
      await confirmStartingLeague(page);
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      const week = await page.locator('.nrl-dock-week').innerText();
      if (!/WK\s*1/.test(week) || !week.includes('/25')) throw new Error(`the dock did not label week 1 of the league (${week})`);
      await shot('grounds');
      await openNav(page, 'fixtures');
      await page.locator('[data-next-row]').waitFor();
      await page.locator('[data-next-row]').scrollIntoViewIfNeeded();
      await shot('fixtures-before');
      rec.problems.push(...await reachProblems(page, '.nrl-screen-region', ['[data-next-row]']));
      // Weeks 1 and 4 are the trials, 2 and 3 are rests. None of them score the ladder.
      let sawTrial = false;
      for (let i = 0; i < 4; i++) {
        await openNav(page, 'club');
        const what = await advanceOnce(page);
        if (what === 'match') {
          sawTrial = true;
          await page.locator('.nrl-mo-controls [data-pause]').tap();
          await page.locator('.nrl-mo-sheet [data-skip]').tap();
          if (i === 0) await shot('first-trial-result');
          await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 60000 });
          await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
        }
      }
      let state = await page.evaluate(() => window.__nrlState());
      if (!sawTrial || state.week !== 5 || state.league.ladder.some(r => r.played || r.points)) throw new Error('Trials changed the ladder or did not reach the first round');
      await openNav(page, 'fixtures');
      await page.locator('[data-next-row]').waitFor();
      await page.locator('[data-next-row]').scrollIntoViewIfNeeded();
      await shot('fixtures-round1');
      await openNav(page, 'club');
      if (await advanceOnce(page) !== 'match') throw new Error('The first regular week was not a match');
      await page.locator('.nrl-mo-controls [data-pause]').tap();
      await page.locator('.nrl-mo-sheet [data-skip]').tap();
      await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 60000 });
      await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      state = await page.evaluate(() => window.__nrlState());
      if (state.week !== 6 || state.league.ladder.some(r => r.played !== 1)) throw new Error('Round 1 did not count exactly once');
      await openNav(page, 'club');
      await shot('club-after-round1');
      rec.played = state.league.fixtures.filter(f => f.result && (f.homeId === 'player' || f.awayId === 'player')).map(f => f.round);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal page overflow');
    } catch (e) {
      rec.problems.push(e.stack ?? String(e));
      await shot('failure').catch(() => {});
    } finally { await ctx.close(); }
    results.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} trials ${tag}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((n, r) => n + r.problems.length, 0);
}
