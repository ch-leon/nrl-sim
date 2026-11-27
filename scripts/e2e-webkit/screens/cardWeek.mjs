import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, IPHONE_UA, OUT_ROOT, confirmStartingLeague, log, setupStep } from '../common.mjs';

const PICK = '[data-card-pick]';
const CARDS = '[data-cards-screen]';

async function checkPick(page, portrait) {
  const cards = page.locator(`${PICK} .nrl-card-face`);
  await cards.first().waitFor();
  assert.equal(await cards.count(), 3);
  const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
    const { x, y, bottom, right } = node.getBoundingClientRect();
    const scroll = node.closest('.nrl-modal-scroll').getBoundingClientRect();
    return { x, y, visible: bottom <= scroll.bottom + 1 && right <= scroll.right + 1 };
  }));
  if (portrait) {
    assert.ok(boxes.every(box => box.x === boxes[0].x));
    assert.ok(boxes[2].y > boxes[1].y && boxes[1].y > boxes[0].y);
  } else {
    assert.ok(boxes.every(box => box.y === boxes[0].y && box.visible), JSON.stringify(boxes));
    assert.ok(boxes[2].x > boxes[1].x && boxes[1].x > boxes[0].x);
  }
  const actions = await page.locator(`${PICK} .nrl-card-face button, ${PICK} [data-card-reroll]`).evaluateAll(buttons =>
    buttons.map(button => [button.offsetWidth, button.offsetHeight]));
  assert.ok((await cards.locator('.nrl-card-tier').allTextContents()).every(text => /Level I/.test(text)));
  assert.ok(actions.every(([width, height]) => width >= 44 && height >= 44), JSON.stringify(actions));
}

export async function runCardWeek(browser) {
  const out = join(OUT_ROOT, 'webkit', 'card-week');
  mkdirSync(out, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, reducedMotion: 'reduce', hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('nrl-sim-labs', JSON.stringify({ visible: true, on: { 'card-week': true }, hintsSeen: [] }));
    localStorage.setItem('nrlsim.iosInstallHintShown', '1');
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto(BASE);
    await setupStep(page);
    const option = page.locator('[data-nrl-card-week]');
    assert.equal(await option.isChecked(), false);
    await option.check();
    await page.locator('[data-nrl-start]').tap();
    await confirmStartingLeague(page);
    await page.locator('[data-expansion-work]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
    await page.locator('[data-screen="club"]').tap();
    await page.locator(PICK).waitFor();
    const larger = await page.evaluate(() => {
      const root = document.documentElement;
      const normal = parseFloat(getComputedStyle(root).fontSize);
      root.setAttribute('data-text-size', 'larger');
      root.style.setProperty('--nrl-text-scale', '1.3');
      return parseFloat(getComputedStyle(root).fontSize) / normal;
    });
    assert.ok(Math.abs(larger - 1.3) < 0.01, 'The Larger text setting must scale rem units');
    await page.locator('.nrl-card-modal .nrl-screen-x').waitFor();
    await checkPick(page, false);
    const reroll = page.locator(`${PICK} [data-card-reroll]`);
    assert.match(await reroll.textContent(), /Reroll \(\$1,500\)/);
    const money = await page.evaluate(() => window.__nrlState().money);
    await reroll.tap();
    assert.match(await reroll.textContent(), /Reroll \(\$3,000\)/);
    assert.equal(await page.evaluate(() => window.__nrlState().money), money - 1500);
    await page.screenshot({ animations: 'disabled', path: join(out, '667x375-pick.png') });

    await page.locator('.nrl-card-modal .nrl-screen-x').tap();
    await page.locator('[data-screen="cards"]').tap();
    const offers = page.locator(`${CARDS} [data-cards-offer]`);
    await offers.last().waitFor();
    assert.equal(await offers.count(), 3);
    const grant = await offers.nth(1).getAttribute('data-cards-offer');
    await offers.nth(1).tap();
    assert.equal(await page.locator(PICK).getAttribute('data-card-grant'), grant);

    for (const id of ['cashInjection', 'assistantCoach']) {
      assert.equal(await page.evaluate(id => window.__nrlShowCardWeek(id), id), null);
      await page.locator(`${PICK} [data-card-id="${id}"]`).tap();
    }
    await page.locator('.nrl-card-modal .nrl-screen-x').tap();
    await page.locator('[data-screen="club"]').tap();
    const tab = page.locator('[data-screen="cards"]');
    assert.ok(await tab.locator('.nrl-nav-label').evaluate(el => el.scrollWidth <= el.clientWidth));
    assert.equal(await tab.locator('[data-nav-badge]').getAttribute('data-count'), '1');
    await tab.tap();
    const hand = page.locator(`${CARDS} [data-hand-card]`);
    await hand.first().waitFor();
    assert.equal(await hand.count(), 2);
    assert.ok(await page.locator(`${CARDS} [data-cards-pick]`).evaluate(button => {
      const bounds = button.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.right - 4, bounds.top + 4);
      return bounds.height >= 44 && button.contains(hit);
    }), 'Pick must have room beside Close');
    await page.screenshot({ animations: 'disabled', path: join(out, '667x375-cards.png') });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.locator(`${CARDS} [data-cards-pick]`).waitFor();
    assert.ok(await hand.evaluateAll(nodes => {
      const a = nodes[0].getBoundingClientRect(), b = nodes[1].getBoundingClientRect();
      return a.top === b.top && b.left > a.left && a.left >= 0 && b.right <= innerWidth;
    }));
    assert.ok(await page.locator('.nrl-rotate').isHidden());
    await page.screenshot({ animations: 'disabled', path: join(out, '375x667-cards.png') });

    // Give the remaining pick a repeat and an identified win reward so both
    // presentation paths are exercised on every run, regardless of the seed.
    const source = await page.evaluate(() => {
      const state = window.__nrlState();
      const club = state.league.clubs.find(c => c.id !== state.clubId);
      const offer = state.cardWeek.offers[0];
      offer.kind = 'match';
      offer.fromClubId = club.id;
      offer.cards = [
        { cardId: 'cashInjection', kind: 'cash' },
        { cardId: 'assistantCoach', kind: 'staff', name: state.cardWeek.hand[1].offered.name },
        { cardId: 'steal-play:block-play', kind: 'setPlay', playId: 'block-play', fromClubId: club.id },
      ];
      state.cardWeek.starterLeft = 0;
      state.cardWeek.owed = 1;
      return club.name;
    });
    // Reopen so the Cards screen reads the latest queued pick.
    await page.locator('.nrl-cards-screen .nrl-screen-x').tap();
    await page.locator('[data-portrait-cards]').tap();
    assert.equal(await page.locator(`${CARDS} .nrl-card-source`).textContent(), `From ${source}`);
    assert.match(await page.locator(CARDS).textContent(), /Next reroll \$3,000/);
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    await checkPick(page, true);
    assert.equal(await page.locator(`${PICK} .nrl-card-source`).textContent(), `From ${source}`);
    assert.match(await page.locator(`${PICK} .nrl-card-face`).first().textContent(), /Level II.*\$22,500/);
    await page.screenshot({ animations: 'disabled', path: join(out, '375x667-pick.png') });
    assert.match(await reroll.textContent(), /Reroll \(\$3,000\)/);
    await reroll.tap();
    assert.match(await reroll.textContent(), /Reroll \(\$4,500\)/);
    assert.equal(await page.locator(`${PICK} .nrl-card-source`).textContent(), `From ${source}`);
    await page.locator('.nrl-card-modal .nrl-screen-x').tap();
    await page.locator('.nrl-cards-screen .nrl-screen-x').tap();
    await page.locator('[data-portrait-cards]').tap();
    await page.locator(CARDS).waitFor();

    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();
    await page.locator('[data-nrl-continue-1]').tap();
    await page.waitForFunction(() => !!window.__nrlState?.()?.cardWeek);
    await page.locator('[data-screen="cards"]').tap();
    await page.locator(CARDS).waitFor();
    assert.equal(await page.locator(`${CARDS} [data-hand-card]`).count(), 2);
    assert.equal(await page.locator(PICK).count(), 0);
    assert.deepEqual(errors, []);
    log('ok card week 667×375 and 375×667 at Larger text');
    return 0;
  } catch (err) {
    await page.screenshot({ animations: 'disabled', path: join(out, 'failure.png') }).catch(() => {});
    log(`FAIL card week — ${err.message}`);
    return 1;
  } finally {
    await ctx.close();
  }
}
