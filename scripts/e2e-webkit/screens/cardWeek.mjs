import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, IPHONE_UA, OUT_ROOT, confirmStartingLeague, log, openNav, setupStep } from '../common.mjs';

const PICK = '[data-card-pick]';
const CARDS = '[data-cards-screen]';

async function checkPick(page, portrait, count = 5, decree = false) {
  const cards = page.locator(`${PICK} .nrl-card-face`);
  await cards.first().waitFor();
  assert.equal(await cards.count(), count);
  const boxes = await cards.evaluateAll(nodes => nodes.map(node => {
    const { x, y, right } = node.getBoundingClientRect();
    const scroll = node.closest('.nrl-modal-scroll').getBoundingClientRect();
    return { x, y, fits: x >= scroll.left - 1 && right <= scroll.right + 1 };
  }));
  assert.ok(boxes.every(box => box.fits), JSON.stringify(boxes));
  if (portrait) {
    assert.ok(boxes.every((box, i) => box.x === boxes[0].x && (i === 0 || box.y > boxes[i - 1].y)));
  } else {
    for (const [i, box] of boxes.entries()) {
      if (i >= 3) assert.ok(box.y > boxes[i - 3].y && box.x === boxes[i - 3].x);
      else if (i > 0) assert.ok(box.y === boxes[0].y && box.x > boxes[i - 1].x);
    }
  }
  const actions = await page.locator(`${PICK} .nrl-card-face button, ${PICK} [data-card-reroll], ${PICK} [data-card-pass]`).evaluateAll(buttons =>
    buttons.map(button => [button.offsetWidth, button.offsetHeight]));
  const tier = decree ? /Rest of season/ : /Level (I|II|III)|Recovery/;
  assert.ok((await cards.locator('.nrl-card-tier').allTextContents()).every(text => tier.test(text)));
  assert.ok(actions.every(([width, height]) => width >= 44 && height >= 44), JSON.stringify(actions));
  const lastAction = cards.last().locator('button').first();
  await lastAction.scrollIntoViewIfNeeded();
  assert.ok(await lastAction.evaluate(button => {
    const box = button.getBoundingClientRect();
    const scroll = button.closest('.nrl-modal-scroll').getBoundingClientRect();
    return box.top >= scroll.top - 1 && box.bottom <= scroll.bottom + 1;
  }), 'Last card action must be reachable by scrolling');
  await page.locator(`${PICK} h2`).scrollIntoViewIfNeeded();
}

async function checkFatigueScreens(page, out) {
  const expected = await page.evaluate(() => {
    const state = window.__nrlState();
    const id = state.lineup.starters[0];
    const player = state.squad.find(p => p.id === id);
    state.cardWeek.weeklyFatigue[id] = 81;
    const byDate = state.competitions.instances.filter(i => i.definition.format.kind === 'league')
      .flatMap(i => i.fixtures).filter(f => f.status === 'scheduled' && [f.homeId, f.awayId].includes(state.clubId))
      .sort((a, b) => a.slot - b.slot);
    const afterCamp = byDate[1];
    const opponent = state.league.clubs.find(c => c.id !== state.clubId && [afterCamp.homeId, afterCamp.awayId].includes(c.id));
    return { id, name: player.name, size: state.squad.length, fixture: `Round ${afterCamp.round} v ${opponent.name}` };
  });

  await openNav(page, 'squad');
  const bar = page.locator(`[data-weekly-fatigue="${expected.id}"]`);
  assert.equal(await page.locator('[role="meter"][data-weekly-fatigue]').count(), expected.size);
  assert.equal(await bar.getAttribute('aria-label'), `${expected.name} weekly fatigue`);
  assert.equal(await bar.getAttribute('aria-valuenow'), '81');
  assert.match(await bar.getAttribute('aria-valuetext'), /high injury risk/);
  await bar.scrollIntoViewIfNeeded();
  assert.ok(await bar.evaluate(node => {
    const box = node.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.width > 10 && box.height > 0;
  }), 'The Squad fatigue bar fits within the phone viewport');
  await page.screenshot({ animations: 'disabled', path: join(out, '667x375-squad-fatigue.png') });

  await openNav(page, 'lineup');
  const starter = page.locator(`[data-player-open="${expected.id}"]`);
  await starter.scrollIntoViewIfNeeded();
  assert.match(await starter.getAttribute('aria-label'), /fatigue 81.*high injury risk.*Starts at .* energy/i);
  assert.ok(await bar.evaluate(node => {
    const box = node.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.width > 10;
  }), 'The Lineup fatigue bar fits within the phone viewport');
  await page.locator('[data-fatigue-match-preview] summary').tap();
  assert.match(await page.locator('[data-fatigue-match-preview]').textContent(), /Trial.*Fatigue .* → .*Kicks off Round 1/is);
  await page.screenshot({ animations: 'disabled', path: join(out, '667x375-lineup-fatigue.png') });

  await page.evaluate(id => { delete window.__nrlState().cardWeek.weeklyFatigue[id]; }, expected.id);
  await openNav(page, 'club');
  await page.locator('[data-open-events]').tap();
  await page.locator('[data-open-opportunity="skills-camp"]').tap();
  await page.locator('[data-camp-player]').selectOption(expected.id);
  await page.locator('[data-camp-review]').tap();
  const preview = page.locator(`[data-fatigue-event-preview="${expected.id}"]`);
  assert.equal(await preview.textContent(), `Fatigue 0 → 20 at the event. Kicks off ${expected.fixture} on 0, at 100% energy.`);
  for (const [width, height] of [[667, 375], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await preview.scrollIntoViewIfNeeded();
    assert.ok(await preview.evaluate(node => {
      const box = node.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
    }), 'The booking preview wraps within the phone viewport');
    await page.screenshot({ animations: 'disabled', path: join(out, `${width}x${height}-camp-fatigue.png`) });
  }
  await page.locator('[data-camp-dialog]').getByRole('button', { name: 'Close', exact: true }).tap();
  await page.locator('[data-camp-dialog]').waitFor({ state: 'detached' });
  await page.setViewportSize({ width: 667, height: 375 });
  log('ok weekly fatigue meters, trial and camp forecast at iPhone widths');
}

async function checkStaffSupplyPick(page, out, playerId) {
  const seeded = await page.evaluate(id => {
    const state = window.__nrlState();
    const cw = state.cardWeek;
    cw.weeklyFatigue[id] = 90;
    const playId = 'block-play';
    if (state.playbook.owned.includes(playId)) throw new Error('Staff UI fixture needs an unowned Block play');
    const cards = [
      { cardId: 'staff-play:block-play', kind: 'setPlay', playId, staffSource: 'attackCoach' },
      { cardId: 'cashInjection', kind: 'cash' },
      { cardId: 'lastLine', kind: 'trait' },
      { cardId: 'playmaker', kind: 'trait' },
      { cardId: 'iceBaths', kind: 'recovery', staffSource: 'welfare' },
    ];
    cw.owed = 1;
    cw.offers = [{
      kind: 'match', season: state.season, week: state.week, grant: ++cw.grants, keptCardIds: [], cards,
    }];
    return { grant: cw.grants, cards: cards.filter(card => card.staffSource) };
  }, playerId);
  await page.setViewportSize({ width: 667, height: 375 });
  await openNav(page, 'cards');
  await page.locator(`${CARDS} [data-cards-pick]`).tap();
  const pick = page.locator(PICK);
  assert.equal(await pick.getAttribute('data-card-grant'), String(seeded.grant));
  const keeps = pick.locator('[data-card-keeps]');
  assert.equal(await keeps.getAttribute('data-card-keeps'), '2');
  const source = pick.locator('.nrl-card-source');
  assert.deepEqual(await source.allTextContents(), ['From your Attack Coach', 'From your Welfare Manager']);
  const coach = pick.locator('.nrl-card-face').filter({ hasText: 'From your Attack Coach' });
  const welfare = pick.locator('.nrl-card-face').filter({ hasText: 'From your Welfare Manager' });
  for (const [width, height] of [[667, 375], [375, 667]]) {
    await page.setViewportSize({ width, height });
    await checkPick(page, width < height);
    for (const face of [coach, welfare]) {
      const label = face.locator('.nrl-card-source');
      await label.scrollIntoViewIfNeeded();
      assert.ok(await label.evaluate(node => {
        const { left, right } = node.getBoundingClientRect();
        return left >= 0 && right <= innerWidth && node.scrollWidth <= node.clientWidth + 1;
      }), 'Staff label fits in the visible card');
    }
    await page.screenshot({ animations: 'disabled', path: join(out, `${width}x${height}-staff-pick.png`) });
  }
  const reroll = pick.locator('[data-card-reroll]');
  await reroll.tap();
  const exposed = () => page.evaluate(() =>
    window.__nrlState().cardWeek.offers[0].cards.filter(card => card.staffSource));
  assert.deepEqual(await exposed(), seeded.cards, 'Reroll retains the exact two staff faces');
  await coach.getByRole('button', { name: 'Take Set play' }).tap();
  assert.equal(await keeps.getAttribute('data-card-keeps'), '1');
  assert.deepEqual(await source.allTextContents(), ['From your Welfare Manager']);
  assert.equal(await welfare.getByRole('button', { name: 'Take Ice baths' }).isDisabled(), true);
  await reroll.tap();
  assert.equal(await pick.locator('.nrl-card-face').count(), 4);
  assert.deepEqual(await exposed(), [seeded.cards[1]]);
  assert.equal(await page.evaluate(play => window.__nrlState().cardWeek.offers[0].cards
    .some(card => card.kind === 'setPlay' && card.playId === play), seeded.cards[0].playId), false,
  'The taught play must not reappear via the ordinary set-play face after the first keep');
  await page.setViewportSize({ width: 667, height: 375 });
  await page.reload();
  await page.locator('[data-nrl-continue-1]').tap();
  await page.waitForFunction(() => !!window.__nrlState?.()?.cardWeek);
  await openNav(page, 'cards');
  await page.locator(`${CARDS} [data-cards-pick]`).tap();
  assert.equal(await keeps.getAttribute('data-card-keeps'), '1');
  assert.deepEqual(await exposed(), [seeded.cards[1]]);
  await welfare.getByRole('button', { name: 'Play Ice baths now' }).tap();
  assert.equal(await page.evaluate(id => window.__nrlState().cardWeek.weeklyFatigue[id], playerId), 60);
  assert.equal(await page.evaluate(() => window.__nrlState().cardWeek.hand.filter(card => card.offered.kind === 'recovery').length), 2);
  assert.equal(await page.evaluate(() => window.__nrlState().cardWeek.owed), 0);
  log('ok staff labels, full recovery hand, partial keep, reroll and reload in iPhone WebKit');
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
    await checkFatigueScreens(page, out);
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

    // Give the remaining pick a duplicate and a saved steal to check both card faces.
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
    assert.equal(await page.locator(`${CARDS} .nrl-card-source`).count(), 0);
    assert.match(await page.locator(CARDS).textContent(), /Next reroll \$3,000/);
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    await checkPick(page, true, 3);
    assert.equal(await page.locator(`${PICK} .nrl-card-source`).textContent(), `From ${source}`);
    assert.match(await page.locator(`${PICK} .nrl-card-face`).first().textContent(), /Level II.*\$22,500/);
    await page.screenshot({ animations: 'disabled', path: join(out, '375x667-pick.png') });
    assert.match(await reroll.textContent(), /Reroll \(\$3,000\)/);
    await reroll.tap();
    assert.match(await reroll.textContent(), /Reroll \(\$4,500\)/);
    assert.equal(await page.locator(`${PICK} .nrl-card-source`).count(), 0);
    await page.locator('.nrl-card-modal .nrl-screen-x').tap();
    await page.locator('.nrl-cards-screen .nrl-screen-x').tap();
    await page.locator('[data-portrait-cards]').tap();
    await page.locator(CARDS).waitFor();

    // Use known faces to exercise both keeps and a reload on an iPhone-width screen.
    await page.evaluate(() => {
      const cw = window.__nrlState().cardWeek;
      cw.offers[0].cards = [
        { cardId: 'cashInjection', kind: 'cash' },
        { cardId: 'assistantCoach', kind: 'staff', name: cw.hand[1].offered.name },
        { cardId: 'playmaker', kind: 'trait' },
        { cardId: 'lastLine', kind: 'trait' },
        { cardId: 'finisher', kind: 'trait' },
      ];
    });
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    await checkPick(page, true, 5);
    await page.screenshot({ animations: 'disabled', path: join(out, '375x667-match-pick.png') });
    assert.equal(await page.locator(`${PICK} [data-card-keeps]`).getAttribute('data-card-keeps'), '2');
    await page.locator(`${PICK} [data-card-id="cashInjection"]`).tap();
    const half = await page.locator(`${PICK} [data-card-id]`).evaluateAll(nodes => nodes.map(node => node.dataset.cardId));
    assert.equal(half.length, 4);
    assert.equal(await page.locator(`${PICK} [data-card-keeps]`).getAttribute('data-card-keeps'), '1');

    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();
    await page.locator('[data-nrl-continue-1]').tap();
    await page.waitForFunction(() => !!window.__nrlState?.()?.cardWeek);
    await page.locator('[data-screen="cards"]').tap();
    await page.locator(CARDS).waitFor();
    assert.equal(await page.locator(`${CARDS} [data-hand-card]`).count(), 2);
    assert.equal(await page.locator(PICK).count(), 0);
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    assert.equal(await page.locator(`${PICK} [data-card-keeps]`).getAttribute('data-card-keeps'), '1');
    assert.deepEqual(await page.locator(`${PICK} [data-card-id]`).evaluateAll(nodes => nodes.map(node => node.dataset.cardId)), half);
    await page.locator(`${PICK} [data-card-id="assistantCoach"]`).tap();
    await page.locator(PICK).waitFor({ state: 'detached' });

    await page.evaluate(() => {
      const root = document.documentElement;
      root.setAttribute('data-text-size', 'larger');
      root.style.setProperty('--nrl-text-scale', '1.3');
      const state = window.__nrlState();
      state.cardWeek.owed = 1;
      state.cardWeek.offers = [{
        kind: 'decree', season: state.season, week: state.week, grant: ++state.cardWeek.grants, keptCardIds: [],
        cards: ['width', 'fortress', 'throughTheMiddle'].map(cardId => ({ cardId, kind: 'decree' })),
      }];
      state.cardWeek.strikes = { season: state.season, count: 1, lossRun: 0, log: [
        { week: state.week, reason: 'margin', margin: 26, absorbed: true },
      ] };
    });
    await page.locator('.nrl-cards-screen .nrl-screen-x').tap();
    await page.locator('[data-screen="cards"]').tap();
    assert.match(await page.locator(`${CARDS} [data-card-strikes]`).textContent(), /1 strike.*lost by 26.*Strike absorbed.*Board patience/);
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    const decree = page.locator(PICK);
    assert.match(await decree.locator('h2').textContent(), /Decree pick/);
    assert.equal(await decree.locator('[data-card-reroll]').count(), 0);
    await checkPick(page, false, 3, true);
    await page.screenshot({ animations: 'disabled', path: join(out, '667x375-decree.png') });
    await page.setViewportSize({ width: 375, height: 667 });
    await checkPick(page, true, 3, true);
    await page.screenshot({ animations: 'disabled', path: join(out, '375x667-decree.png') });
    await decree.getByRole('button', { name: 'Adopt Fortress' }).tap();
    await page.locator(CARDS).waitFor();
    assert.match(await page.locator(CARDS).textContent(), /Fortress · Rest of season/);
    await page.locator('.nrl-cards-screen .nrl-screen-x').tap();
    await page.setViewportSize({ width: 667, height: 375 });
    const playerId = await page.evaluate(() => {
      const state = window.__nrlState();
      const id = state.lineup.starters[0];
      const cw = state.cardWeek;
      cw.weeklyFatigue[id] = 81;
      cw.owed = 2;
      cw.offers = Array.from({ length: 2 }, () => ({
        kind: 'match', season: state.season, week: state.week, grant: ++cw.grants, keptCardIds: [],
        cards: ['iceBaths', 'fatigueWipe'].map(cardId => ({ cardId, kind: 'recovery' })),
      }));
      return id;
    });
    await openNav(page, 'cards');
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    for (const id of ['iceBaths', 'fatigueWipe']) await page.locator(`${PICK} [data-card-id="${id}"]`).tap();
    await page.locator(PICK).waitFor({ state: 'detached' });
    await page.locator(`${CARDS} [data-cards-pick]`).tap();
    const recovery = page.locator(`${PICK} .nrl-card-face`).filter({ hasText: 'Fatigue wipe' });
    assert.match(await recovery.textContent(), /You can hold 2 recovery cards\. Play one first\./);
    assert.equal(await recovery.getByRole('button', { name: 'Take Fatigue wipe' }).isDisabled(), true);
    const use = recovery.getByRole('button', { name: 'Play Fatigue wipe now' });
    assert.equal(await use.isEnabled(), true);
    await use.tap();
    const receiver = page.locator(`${PICK} [data-card-target="${playerId}"]`);
    assert.match(await receiver.textContent(), /Fatigue 81 → 0/);
    for (const [width, height] of [[667, 375], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await receiver.scrollIntoViewIfNeeded();
      const box = await receiver.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width);
      await page.screenshot({ animations: 'disabled', path: join(out, `${width}x${height}-recovery-target.png`) });
    }
    await receiver.tap();
    assert.equal(await page.evaluate(id => window.__nrlState().cardWeek.weeklyFatigue[id] ?? 0, playerId), 0);
    assert.equal(await page.evaluate(() => window.__nrlState().cardWeek.hand.filter(c => c.offered.kind === 'recovery').length), 2);
    await page.locator('.nrl-card-modal .nrl-screen-x').tap();
    await openNav(page, 'lineup');
    const freshStarter = page.locator(`[data-player-open="${playerId}"]`);
    assert.match(await freshStarter.getAttribute('aria-label'), /fatigue 0.*Starts at 100% energy/i);
    log('ok recovery hand limit, targeted play and refreshed Lineup at iPhone widths');
    await checkStaffSupplyPick(page, out, playerId);
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
