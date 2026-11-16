// #487: actual new-game trials and round 1; screenshots live only in CI artifacts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, closeWeekSummary, openNav, playPhoneWeek, playTrials, reachProblems } from '../common.mjs';

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
      await page.locator('[data-nrl-clubname]').fill('Trial Club');
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      const week = await page.locator('.nrl-dock-week').innerText();
      if (!/TRIAL\s*1/.test(week) || !week.includes('/2')) throw new Error(`the dock did not label trial 1 (${week})`);
      await shot('grounds');
      await openNav(page, 'fixtures');
      await page.locator('[data-next-row][data-round="-1"]').waitFor();
      await page.locator('[data-next-row]').scrollIntoViewIfNeeded();
      await shot('fixtures-before');
      rec.problems.push(...await reachProblems(page, '.nrl-screen-region', ['[data-next-row]']));
      const contracts = await page.evaluate(() => window.__nrlState().squad.map(p => p.contractWeeks));
      let trial = 0;
      await playTrials(page, async () => {
        trial++;
        if (trial === 1) {
          await page.getByText('Full time · Pre-season trial 1', { exact: true }).waitFor();
          await shot('first-trial-result');
        }
      });
      let state = await page.evaluate(() => window.__nrlState());
      if (state.preseason !== 0 || state.week !== 1 || state.league.ladder.some(r => r.played || r.points)) throw new Error('Trials changed the ladder or skipped round 1');
      if (JSON.stringify(contracts) !== JSON.stringify(state.squad.map(p => p.contractWeeks))) throw new Error('Trials consumed contracts');
      await openNav(page, 'fixtures');
      await page.locator('[data-next-row][data-round="1"]').waitFor();
      await page.locator('[data-next-row]').scrollIntoViewIfNeeded();
      await shot('fixtures-round1');
      await playPhoneWeek(page);
      state = await page.evaluate(() => window.__nrlState());
      if (state.week !== 2 || state.league.ladder.some(r => r.played !== 1)) throw new Error('Round 1 did not count exactly once');
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
