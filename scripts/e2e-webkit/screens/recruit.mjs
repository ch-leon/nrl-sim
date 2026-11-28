// #478: fresh Easy/Hard games, shortlist/full/sign/undo on landscape phones.
// Screenshots stay in CI's e2e-webkit-screens artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { confirmStartingLeague, BASE, OUT_ROOT, IPHONE_UA, openNav, reachProblems, SHEET_EXIT, setupStep } from '../common.mjs';

export async function runRecruitTutorial(browser) {
  let failures = 0;
  for (const [width, height] of [[844, 390], [667, 375], [390, 844]]) {
    for (const cardWeek of [false, true]) {
      const tag = `${width}x${height}, card week ${cardWeek ? 'on' : 'off'}`;
      // The game shows a rotate card on coarse-pointer portrait devices. Check the playable portrait layout.
      const phone = width > height;
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: phone, isMobile: phone, deviceScaleFactor: 2, userAgent: IPHONE_UA });
      await ctx.addInitScript((enabled) => {
        localStorage.setItem('nrlsim.iosInstallHintShown', '1');
        if (enabled) localStorage.setItem('nrl-sim-labs', JSON.stringify({ visible: true, on: { 'card-week': true }, hintsSeen: [] }));
      }, cardWeek);
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      const press = (selector) => page.locator(selector).click();
      try {
        await page.goto(BASE);
        await setupStep(page);
        if (cardWeek) await page.locator('[data-nrl-card-week]').check();
        await press('[data-nrl-start]');
        await confirmStartingLeague(page, press);
        await press('[data-expansion-work]');
        await press('[data-screen-key="build"] [data-facility="trainingPaddock"]');
        await press('.nrl-placebar [data-place-go]');

        const bubble = '.nrl-tutorial-bubble[data-step="recruit"]';
        const list = '[data-screen-key="recruit"] .nrl-screen-body';
        const toast = page.locator('.nrl-toast-action');
        await toast.waitFor({ state: 'visible' });
        await page.locator(bubble).waitFor({ state: 'attached' });
        await page.locator(list).waitFor();
        if (cardWeek) await page.locator('[data-card-chip] .nrl-card-chip-pick').waitFor();
        await toast.waitFor({ state: 'detached' }); // Let the build Undo expire naturally.

        const problems = await reachProblems(page, bubble, [
          '[data-screen-key="recruit"] [data-seg="squad"]',
          `${bubble} .nrl-tutorial-skip`,
        ]);
        if (await page.locator(`${bubble}:is(.nrl-tutorial-top, .nrl-tutorial-right, [data-aside])`).count()) {
          problems.push('Recruit bubble did not return to its bottom dock after Undo expired');
        }
        if (problems.length) throw new Error(problems.join('; '));

        const freeAgentPage = '.nrl-player-modal.nrl-player-free';
        const player = page.locator(freeAgentPage);
        const recruit = page.locator(`${list} [data-row-player]`).filter({ has: page.locator('.nrl-row-action:enabled') }).first();
        await recruit.locator('.nrl-row-name').click();
        await player.waitFor();
        const deal = player.locator('[data-player-tab="deal"]');
        const sign = '[data-player-action="sign"]';
        const pressDeal = async (part) => {
          const { x, y, blockedBy } = await deal.evaluate((el, part) => {
            const r = el.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + (part === 'upper part' ? 4 : r.height / 2);
            const hit = document.elementFromPoint(x, y);
            return { x, y, blockedBy: el.contains(hit) ? null : hit?.className || hit?.tagName || 'outside the viewport' };
          }, part);
          if (blockedBy) throw new Error(`Deal ${part} press hits ${blockedBy}`);
          if (phone) await page.touchscreen.tap(x, y);
          else await page.mouse.click(x, y);
          await player.locator('[data-player-panel="deal"]').waitFor();
          await player.locator(`${sign}:enabled`).waitFor();
          const signProblems = await reachProblems(page, freeAgentPage, [`${freeAgentPage} ${sign}`]);
          if (signProblems.length) throw new Error(signProblems.join('; '));
          if (await page.evaluate(() => window.__nrlState().settings.tutorialDone)) {
            throw new Error(`Deal ${part} press skipped the tutorial`);
          }
        };
        await pressDeal('centre');
        // Check the upper tap after the ring has moved from the list to the player page.
        await page.waitForFunction((selector) => {
          const modal = document.querySelector(selector)?.getBoundingClientRect();
          const ring = document.querySelector('.nrl-tutorial-cutout')?.getBoundingClientRect();
          return modal && ring && ring.top <= modal.top && modal.top - ring.top <= 6;
        }, freeAgentPage);
        await player.locator('[data-player-tab="stats"]').click();
        await pressDeal('upper part');
        await player.locator('.nrl-back').click();
        await player.waitFor({ state: 'detached' });
        await page.locator(`${bubble} .nrl-tutorial-skip`).waitFor();
        console.log(`ok recruit tutorial ${tag}`);
      } catch (err) {
        failures++;
        console.log(`FAIL recruit tutorial ${tag} — ${err.message}`);
      } finally {
        await ctx.close();
      }
    }
  }
  return failures;
}

export async function runRecruit(browser) {
  let failures = 0;
  for (const [width, height] of [[667, 375], [844, 390]]) {
    for (const difficulty of ['easy', 'hard']) {
      const tag = `${width}x${height}-${difficulty}`;
      const out = join(OUT_ROOT, 'webkit', `recruit-${tag}`);
      mkdirSync(out, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: IPHONE_UA });
      // This journey needs an affordable recommended player to open, sign and undo.
      // Some generated pools legitimately have only a reach pick. Pin the seed,
      // not the pool or pricing, until the title has created this career.
      await ctx.addInitScript(() => {
        const now = Date.now;
        Date.now = () => 552321272;
        window.__restoreRecruitClock = () => { Date.now = now; };
      });
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
        await setupStep(page, 2);
        await page.locator('[data-nrl-clubname]').fill('Shortlist FC');
        await setupStep(page, 3);
        await page.locator(`[data-nrl-difficulty-${difficulty}]`).tap();
        await page.locator('[data-nrl-start]').tap();
        await page.evaluate(() => window.__restoreRecruitClock());
        await confirmStartingLeague(page);
        await page.locator('[data-expansion-work]').tap();
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
        await rows.first().waitFor();
        const shown = await rows.count();
        check(shown >= 1 && shown <= 4, `new game showed ${shown} rows`);
        const shortlist = await rows.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-row-player')));
        check(await page.locator('[data-coach-pick]').count() === 1, 'exactly one pick');
        check(!await page.locator('[data-sort-menu]').isVisible(), 'sort hidden on shortlist');
        const picked = await page.locator('[data-coach-pick]').evaluate((e) => e.closest('[data-row-player]').getAttribute('data-row-player'));
        await shot('shortlist');
        // Visible chip text must fit its cell at phone landscape.
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
        // #537 puts stars beside a rounded label. Sort by the exact average of
        // the four shown stats, independently of that presentation text.
        check(await rows.evaluateAll((rs) => {
          const overall = (p) => {
            const keys = p.position === 'hooker' ? ['handling', 'footyIQ', 'stamina', 'strength']
              : ['five-eighth', 'halfback'].includes(p.position) ? ['handling', 'kicking', 'footyIQ', 'speed']
              : ['fullback', 'winger', 'centre'].includes(p.position) ? ['speed', 'handling', 'strength', 'footyIQ']
              : ['strength', 'stamina', 'speed', 'footyIQ'];
            return keys.reduce((sum, key) => sum + p.stats[key], 0) / 4;
          };
          const expected = [...window.__nrlState().freeAgents]
            .sort((a, b) => overall(b) - overall(a)).map((p) => p.id);
          return JSON.stringify(rs.map((r) => r.getAttribute('data-row-player'))) === JSON.stringify(expected);
        }), 'overall order');
        await shot('show-all');
        for (const sort of ['fee', 'age', 'rating']) {
          await page.locator('[data-sort-menu]').tap();
          await page.locator(`[data-sort="${sort}"]`).tap();
          if (sort === 'rating') check(JSON.stringify(await rows.evaluateAll((rs) => rs.map((r) => r.getAttribute('data-row-player')))) === JSON.stringify(original), 'rating order restored');
        }
        await page.locator(SHEET_EXIT).tap();
        await openNav(page, 'recruit');
        // A reach player, or a thin affordable pool, makes the shortlist shorter than four. Reopening returns to that same list.
        await rows.first().waitFor();
        const reopened = await rows.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-row-player')));
        check(reopened.join(',') === shortlist.join(','), `reopening resets shortlist to the same players (${reopened.length} of ${shown})`);
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
