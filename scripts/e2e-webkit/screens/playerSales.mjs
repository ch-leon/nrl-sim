// #572: real saved careers, native keyboard actions and sale terms visible at phone sizes.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { confirmStartingLeague, BASE, IPHONE_UA, OUT_ROOT, openNav, setupStep } from '../common.mjs';

async function reviewGeometry(page) {
  return page.evaluate(() => {
    const problems = [];
    const terms = {};
    const selectors = ['[data-sale-person]', '[data-sale-buyer]', '[data-sale-fee]', '[data-sale-contract]', '.nrl-sale-actions .nrl-back', '[data-sale-confirm]', '[data-sale-cancel]'];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) { problems.push(`${selector} missing`); continue; }
      const rect = element.getBoundingClientRect();
      terms[selector] = { text: element.textContent, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      const clip = { left: 0, right: innerWidth, top: 0, bottom: innerHeight };
      for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (!/auto|scroll|hidden|clip/.test(`${style.overflowX} ${style.overflowY}`)) continue;
        const box = ancestor.getBoundingClientRect();
        clip.left = Math.max(clip.left, box.left); clip.right = Math.min(clip.right, box.right);
        clip.top = Math.max(clip.top, box.top); clip.bottom = Math.min(clip.bottom, box.bottom);
      }
      const range = document.createRange(); range.selectNodeContents(element);
      const rects = element.tagName === 'BUTTON' ? [rect] : [...range.getClientRects()];
      for (const box of rects) {
        if (box.left < clip.left - 1 || box.right > clip.right + 1 || box.top < clip.top - 1 || box.bottom > clip.bottom + 1) problems.push(`${selector} clipped`);
        if (!element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))) problems.push(`${selector} covered`);
      }
      if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1) problems.push(`${selector} internally clipped`);
      if (element.tagName === 'BUTTON' && rect.height < 43.5) problems.push(`${selector} below 44px`);
      if (element.closest('.nrl-sale-details')) problems.push(`${selector} in scrolling details`);
    }
    const summary = document.querySelector('[data-sale-summary]').getBoundingClientRect();
    const actions = document.querySelector('.nrl-sale-actions').getBoundingClientRect();
    if (summary.bottom > actions.top + 1) problems.push('summary overlaps actions');
    const details = document.querySelector('.nrl-sale-details');
    if (details.clientHeight < 24 || !/auto|scroll/.test(getComputedStyle(details).overflowY)) problems.push('cap details cannot be read by scrolling');
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('page overflows horizontally');
    return { problems, terms, details: { height: details.clientHeight, scrollHeight: details.scrollHeight } };
  });
}

async function continueCareer(page) {
  await page.reload();
  await page.locator('[data-nrl-continue-1]').tap();
  await page.waitForFunction(() => !!window.__nrlGame);
  await page.evaluate(() => document.fonts.ready);
}

async function focusConfirmByKeyboard(page) {
  await page.locator('[data-sale-cancel]').focus();
  await page.keyboard.press('Shift+Tab');
  // macOS Safari's default tab preference skips buttons; Option-Tab includes them.
  if (!await page.evaluate(() => document.activeElement?.hasAttribute('data-sale-confirm'))) {
    await page.locator('[data-sale-cancel]').focus();
    await page.keyboard.press('Alt+Shift+Tab');
  }
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-sale-confirm')), true, 'native keyboard reaches Confirm');
}

function verifyTransfer(before, after, playerId, buyerName, fee) {
  const buyerBefore = before.league.clubs.find(c => c.name === buyerName);
  assert.ok(buyerBefore, 'displayed buyer exists');
  const buyerAfter = after.league.clubs.find(c => c.id === buyerBefore.id);
  assert.equal(after.money, before.money + fee, 'seller receives exactly the displayed fee');
  assert.equal(buyerAfter.cash, buyerBefore.cash - fee, 'displayed buyer pays exactly once');
  assert.equal(after.squad.some(p => p.id === playerId), false, 'seller no longer owns player');
  assert.equal(buyerAfter.squad.filter(p => p.id === playerId).length, 1, 'buyer owns the same player once');
  assert.equal(after.league.clubs.flatMap(c => c.squad ?? []).filter(p => p.id === playerId).length, 1, 'one world owner');
  assert.deepEqual(buyerAfter.squad.find(p => p.id === playerId).deal, before.squad.find(p => p.id === playerId).deal, 'current and renewal contracts transfer unchanged');
}

export async function runPlayerSales(browser) {
  const out = join(OUT_ROOT, 'webkit', 'player-sales');
  mkdirSync(out, { recursive: true });
  const results = [];
  for (const [width, height, textSize] of [[667, 375, 'normal'], [667, 375, 'larger'], [844, 390, 'normal'], [844, 390, 'larger'], [568, 320, 'larger']]) {
    const tag = `${width}x${height}-${textSize}`;
    const rec = { tag, problems: [], screens: [] };
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    page.on('pageerror', error => rec.problems.push(error.message));
    try {
      await page.goto(BASE);
      await setupStep(page, 2);
      await page.locator('[data-nrl-clubname]').fill('Continuity FC');
      await setupStep(page, 3);
      await page.locator('[data-nrl-open-all]').check();
      await page.locator('[data-nrl-start]').tap();
      await confirmStartingLeague(page);
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await page.locator('.nrl-tutorial').waitFor({ state: 'detached' });
      const fixture = await page.evaluate(() => window.__nrlState());
      const player = fixture.squad[0];
      player.name = 'Alexander Longsurname';
      for (const stat of Object.keys(player.stats)) { player.stats[stat] = 85; player.ceilings[stat] = 95; }
      player.deal = { salary: 1000, startSeason: fixture.season, endSeason: fixture.season + 1, renewal: { salary: 2000, startSeason: fixture.season + 2, endSeason: fixture.season + 2 } };
      player.contractWeeks = 54;
      const renewalPlayer = fixture.squad[1];
      renewalPlayer.name = 'Cruz Mauafetu';
      renewalPlayer.age = 31;
      renewalPlayer.deal = { salary: 1000, startSeason: fixture.season, endSeason: fixture.season };
      renewalPlayer.contractWeeks = 27;
      fixture.league.clubs.forEach((club, index) => {
        if (!club.squad) return;
        club.name = `Western District Wombats ${index + 1}`;
        club.cash = 1000000;
        for (const rival of club.squad) rival.deal = { salary: 1000, startSeason: fixture.season, endSeason: fixture.season + 2 };
      });
      fixture.settings.textSize = textSize;
      // Seed through the same stored payload + Continue route as expansionIntro.mjs.
      // The flag is test-owned storage, consumed once; successful-sale reloads use actual saves.
      await ctx.addInitScript(({ fixture }) => {
        if (sessionStorage.getItem('player-sales-reset') !== 'yes') return;
        localStorage.setItem('nrl-sim-save-slot-1', JSON.stringify(fixture));
        sessionStorage.removeItem('player-sales-reset');
      }, { fixture });
      for (const screen of ['contracts', 'player']) {
        await page.evaluate(() => sessionStorage.setItem('player-sales-reset', 'yes'));
        await continueCareer(page);
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-text-size')), textSize === 'normal' ? null : textSize);
        const openReview = async () => {
          if (screen === 'contracts') await page.locator(`[data-contract-sell="${player.id}"]`).tap();
          else {
            await page.locator('[data-player-tab="deal"]').tap(); // the deals are on the Deal tab (SuperCOOKED 37)
            await page.locator('[data-player-action="sell"]').tap();
          }
          await page.locator('[data-sale-confirm]').waitFor();
        };
        await openNav(page, screen === 'contracts' ? 'contracts' : 'squad');
        if (screen === 'player') await page.locator(`[data-player-open="${player.id}"] .nrl-row-name`).tap();
        let renewalNotice;
        if (screen === 'contracts') {
          await page.locator(`[data-contract-renew="${renewalPlayer.id}"]`).tap();
          renewalNotice = page.locator('.nrl-toast-text').filter({ hasText: `Renewal queued for ${renewalPlayer.name}` });
          await renewalNotice.waitFor({ state: 'visible' });
        }
        const before = await page.evaluate(() => window.__nrlState());
        await openReview();
        const geometry = await reviewGeometry(page);
        rec.screens.push({ screen, ...geometry });
        await page.screenshot({ path: join(out, `${tag}-${screen}.png`) });
        assert.deepEqual(geometry.problems, [], `${screen} key terms and actions immediately visible`);
        assert.equal(await page.locator('[data-sale-person]').innerText(), player.name);
        assert.match(await page.locator('[data-sale-contract]').innerText(), /\$1,000\/season.*renewal \$2,000\/season/);
        const buyerName = await page.locator('[data-sale-buyer]').innerText();
        const fee = Number((await page.locator('[data-sale-fee]').innerText()).replace(/[^0-9]/g, ''));
        assert.ok(fee > 0);
        await page.locator('.nrl-sale-details').evaluate(element => { element.scrollTop = element.scrollHeight; });
        assert.deepEqual((await reviewGeometry(page)).problems, [], 'scrolling cap details preserves visible summary and buttons');
        if (renewalNotice) assert.equal(await renewalNotice.count(), 1, 'notification is retained during review');
        await page.locator('[data-sale-cancel]').focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await page.evaluate(() => window.__nrlState()), before, 'Cancel makes no state change');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-contract-sell') ?? document.activeElement?.getAttribute('data-player-action')), screen === 'contracts' ? player.id : 'sell', 'Cancel restores current sale control');
        if (renewalNotice) {
          assert.equal(await renewalNotice.count(), 1, 'Cancel preserves the queued notification');
          assert.equal(await renewalNotice.evaluate(element => {
            const rect = element.getBoundingClientRect();
            return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
          }), true, 'notification is readable again after Cancel');
        }
        await openReview();
        assert.deepEqual((await reviewGeometry(page)).problems, [], 'reopened review stays clear of notification');
        await focusConfirmByKeyboard(page);
        await page.keyboard.press('Space');
        await page.locator('[data-sale-review]').waitFor({ state: 'detached' });
        await page.keyboard.press('Space');
        verifyTransfer(before, await page.evaluate(() => window.__nrlState()), player.id, buyerName, fee);
        await continueCareer(page);
        verifyTransfer(before, await page.evaluate(() => window.__nrlState()), player.id, buyerName, fee);
        rec.screens.at(-1).cancelNoOp = true;
        rec.screens.at(-1).keyboardConfirmedOnceAndPersisted = true;
      }
    } catch (error) {
      rec.problems.push(error.message);
      await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
    } finally { await ctx.close(); }
    results.push(rec);
    console.log(`${rec.problems.length ? 'FAIL' : 'ok'} player sales ${tag}: ${rec.problems.join('; ')}`);
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
  return results.reduce((count, rec) => count + rec.problems.length, 0);
}
