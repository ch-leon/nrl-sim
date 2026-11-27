// #482, #831: real season-one League Office play-through; screenshots live in the CI artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { confirmStartingLeague, leagueUnlockProgress, playSkippedWeek, BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, SHEET_EXIT, setupStep, openNav } from '../common.mjs';

const HOME_LOCK = 'Opens after your first home game once the trials are done';

async function completedHomeTrial(page) {
  return page.evaluate(() => {
    const s = window.__nrlState();
    return (s.competitions?.instances ?? []).some(i => i.season === s.season
      && i.definition.id.endsWith(':trials')
      && i.fixtures.some(f => f.homeId === s.clubId && f.status === 'completed' && f.result));
  });
}

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
    const checkHomeUnlocks = async (tag, tiles, open) => {
      const finance = tiles.find(t => t.id === 'finance');
      if (!finance || finance.locked !== !open || (!open && !finance.text.includes(HOME_LOCK))) {
        record.problems.push(`Finance did not show the expected ${open ? 'open' : 'home-match lock'} state at ${tag}`);
      }
      if (open && finance && !finance.locked) {
        await openNav(page, 'finance');
        await page.locator('.nrl-screen-region[data-screen-key="finance"]').waitFor();
        await page.locator(SHEET_EXIT).tap();
      }

      // Coach's Office is a facility under Build. Its separate See calls button
      // is always usable, so check the purchase row and its lock reason instead.
      await openNav(page, 'build');
      const office = page.locator('.nrl-build-row').filter({ has: page.getByText("Coach's Office", { exact: true }) });
      await office.waitFor();
      await office.scrollIntoViewIfNeeded();
      const details = await office.evaluate(row => ({
        buildable: row.getAttribute('data-facility') === 'coachsOffice',
        reason: row.querySelector('.nrl-build-why')?.textContent ?? '',
      }));
      record.rounds.at(-1).coachsOffice = details;
      if (!open && (details.buildable || details.reason !== HOME_LOCK)) {
        record.problems.push(`Coach's Office lacks the home-match lock at ${tag}: "${details.reason}"`);
      }
      // The unlock alone does not guarantee cash to buy it. A funds-only warning
      // is also valid once the home-match lock has gone.
      if (open && !details.buildable && !details.reason.startsWith('Need $')) {
        record.problems.push(`Coach's Office did not unlock at ${tag}: "${details.reason}"`);
      }
      await page.screenshot({ path: join(out, `${width}x${height}-coach-office-${tag}.png`) });
      await page.locator(SHEET_EXIT).tap();
    };
    try {
      await page.goto(BASE);
      await setupStep(page);
      await page.locator('[data-nrl-difficulty-easy]').tap();
      await page.locator('[data-nrl-start]').tap();
      await confirmStartingLeague(page);
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await page.waitForFunction(() => !!window.__nrlState);
      const start = await shot('start');
      for (const id of ['finance', 'staff', 'contracts']) if (!start.find((t) => t.id === id)?.locked) record.problems.push(`${id} not locked at start`);
      await checkHomeUnlocks('start', start, false);
      // A real tap, before playing a home game, must still show Finance.
      await page.locator('.nrl-dock-statusbox').tap();
      await page.waitForSelector('[data-screen-key="finance"]');
      await page.screenshot({ path: join(out, `${width}x${height}-locked-money-tap.png`) });
      await page.locator(SHEET_EXIT).tap();
      // Staff and Contracts open on league rounds played (#844), not calendar weeks.
      let homeSeen = false;
      let homeTrialSeen = false;
      for (let i = 0; i < 30 && (await leagueUnlockProgress(page)).round < 12; i++) {
        const before = await leagueUnlockProgress(page);
        console.log(`Office ${width}x${height} playing week ${before.week} (league round ${before.round})`);
        await playSkippedWeek(page);
        const progress = await leagueUnlockProgress(page);
        const state = await page.evaluate(() => window.__nrlState());
        if (!homeTrialSeen && await completedHomeTrial(page)) {
          if (progress.home) record.problems.push('competitive home game preceded the home trial check');
          await checkHomeUnlocks('home-trial', await shot('home-trial'), false);
          homeTrialSeen = true;
        }
        if (!homeSeen && progress.home) {
          await checkHomeUnlocks('first-home', await shot('first-home'), true);
          homeSeen = true;
        }
        // No screens list (or no unlocks record) means every screen is open.
        const staffOpen = state.unlocks?.screens === undefined || state.unlocks.screens.includes('staff');
        if (progress.round >= 4 && !staffOpen) record.problems.push(`Staff not open at league round ${progress.round}`);
      }
      if ((await leagueUnlockProgress(page)).round < 12) record.problems.push('never reached league round 12');
      const end = await shot('round-12');
      for (const id of ['staff', 'contracts']) if (end.find((t) => t.id === id)?.locked) record.problems.push(`${id} locked at round 12`);
      if (!homeTrialSeen) record.problems.push('never completed a home trial');
      if (!homeSeen) record.problems.push('never completed a competitive home game');
      if (homeSeen && end.find((t) => t.id === 'finance')?.locked !== false) {
        record.problems.push('Finance not available at round 12 after the first home game');
      }
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
