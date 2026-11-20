// #751: genuine saved careers, production entry commands and the actual weekly clock.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, openNav, skipFromPill, log } from '../common.mjs';

const SAVE = 'nrl-sim-save-slot-1';
const state = page => page.evaluate(() => window.__nrlState());
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const elapsed = s => s.competitions.calendar.elapsedIntervals;
const record = s => s.competitions.individualChallenges?.find(r => r.season === s.season && r.editionId === 'showground');

async function install(page, larger) {
  const raw = readFileSync('tests/fixtures/saves/v34-challenges/v34-au-week-5.json', 'utf8');
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, [SAVE, raw]);
  await page.goto(BASE);
  await page.locator('[data-nrl-continue-1]').click();
  await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
  const s = JSON.parse(raw);
  if (!s.settings.hintsSeen?.includes('expansion-intro')) await page.locator('[data-expansion-work]').click();
  if (!s.settings.tutorialDone) await page.locator('.nrl-tutorial-skip').click();
  if (larger) {
    await openNav(page, 'settings');
    await page.locator('.nrl-settings-textsize [data-seg="larger"]').click();
    await page.locator('.nrl-settings-modal .nrl-screen-x').click();
  }
  await openNav(page, 'club');
  await page.locator('[data-home-events]').waitFor();
}

async function controls(page, selector) {
  for (const control of await page.locator(selector).all()) {
    if (!await control.isVisible() || await control.isDisabled()) continue;
    await control.scrollIntoViewIfNeeded();
    await control.evaluate(el => Promise.all((el.closest('[role="dialog"]') ?? el).getAnimations({ subtree: true })
      .filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))));
    const issue = await control.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.width < 44 || r.height < 44 ? `target below 44px (${r.width}x${r.height})`
        : r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 ? 'outside viewport'
        : !hit || !el.contains(hit) ? `obscured by ${hit?.className ?? hit?.tagName}` : null;
    });
    assert(!issue, `${await control.textContent()}: ${issue}`);
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal page overflow');
}

async function placementHidesEvents(page, shot) {
  const before = await state(page);
  await openNav(page, 'build');
  await page.locator('.nrl-build-row:not(.nrl-build-row-disabled)').filter({ hasText: 'Training Paddock' }).click();
  await page.locator('.nrl-placebar:not([hidden])').waitFor();
  assert(!await page.locator('[data-home-events]').isVisible(), 'Events blocks the grounds during building placement');
  await shot('placing');
  await page.locator('.nrl-placebar-cancel').click();
  await page.locator('[data-home-events]').waitFor({ state: 'visible' });
  const after = await state(page);
  assert(before.money === after.money && before.facilities.length === after.facilities.length, 'Cancelled placement spent or built');
}

async function crowdedHome(page, shot) {
  // Dismiss the transient install hint before changing presentation-only nodes;
  // its collision position was calculated against the original single chip.
  for (const toast of await page.locator('.nrl-toast:not(:has(.nrl-toast-btn))').all()) {
    await toast.click();
    await toast.waitFor({ state: 'detached' });
  }
  // Layout-only stress case: these migration fixtures have no pending decisions
  // or board objective. Populate the existing HUD nodes, without changing any
  // career, event, qualification, result or honour, then restore the exact DOM.
  await page.evaluate(() => {
    const chip = document.querySelector('[data-decisions-chip]');
    const board = document.querySelector('[data-hud="board"]');
    const texts = [
      [chip.querySelector('.nrl-decisions-chip-n'), '2'],
      [chip.querySelector('.nrl-decisions-chip-count'), '2 decisions'],
      [chip.querySelector('.nrl-decisions-chip-top'), 'Billboard offer'],
      [board.querySelector('.nrl-decisions-chip-count'), 'Board: top 8'],
      [board.querySelector('.nrl-decisions-chip-top'), "You're 11th"],
    ];
    const original = texts.map(([el]) => el.textContent);
    const hidden = [chip.hidden, board.hidden];
    texts.forEach(([el, text]) => { el.textContent = text; });
    chip.hidden = false; board.hidden = false;
    window.restoreEventChipLayout = () => {
      texts.forEach(([el], i) => { el.textContent = original[i]; });
      [chip.hidden, board.hidden] = hidden;
      delete window.restoreEventChipLayout;
    };
  });
  try {
    await shot('all-home-chips-layout-only');
    await controls(page, '[data-home-events], [data-hud="advance"], [data-hud="board"]');
    // The existing compact Review button's ::after extends its hit area beyond
    // the 36px visual box; verify the actual 44px target rather than its paint.
    await page.locator('[data-decisions-chip]').scrollIntoViewIfNeeded();
    const reviewHit = await page.locator('.nrl-decisions-review').evaluate(el => {
      const r = el.getBoundingClientRect();
      return [-21, 0, 21].every(dy => el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2 + dy)));
    });
    assert(reviewHit, 'Decision Review has no reachable 44px touch target');
    const issue = await page.evaluate(() => {
      const boxes = ['[data-decisions-chip]', '[data-home-events]', '[data-hud="board"]']
        .map(sel => document.querySelector(sel).getBoundingClientRect());
      const dock = document.querySelector('.nrl-dock').getBoundingClientRect();
      const region = document.querySelector('.nrl-hub-chips');
      const bounds = region.getBoundingClientRect();
      return bounds.bottom > dock.top || bounds.top < 0 ? 'Home chips region overlaps the dock or viewport'
        : region.scrollWidth > region.clientWidth + 1 ? 'Home chips overflow horizontally'
        : boxes.some((r, i) => i > 0 && r.top < boxes[i - 1].bottom) ? 'Home chips overlap one another' : null;
    });
    assert(!issue, issue);
    await shot('all-home-chips-layout-only-top');
    await page.locator('[data-hud="board"]').scrollIntoViewIfNeeded();
    await shot('all-home-chips-layout-only-bottom');
    await page.evaluate(() => window.__nrlNotify({ text: 'Tap Share → Add to Home Screen to install', kind: 'info', ms: 60000 }));
    await page.locator('.nrl-toast-long').waitFor();
    await controls(page, '[data-home-events], [data-hud="board"], [data-hud="advance"]');
    await shot('all-home-chips-with-install-hint');
    await page.locator('.nrl-toast-long').click();
    await page.locator('.nrl-toast-long').waitFor({ state: 'detached' });
  } finally { await page.evaluate(() => window.restoreEventChipLayout()); }
}

async function openEvents(page) {
  await page.locator('[data-open-events]').click();
  await page.locator('[data-events-list]').waitFor();
}
async function openShowground(page) {
  await page.locator('[data-open-opportunity="showground"]').click();
  await page.locator('[data-challenge-dialog]').waitFor();
}
async function book(page, id) {
  await page.locator('[data-challenge-player]').selectOption(id);
  await page.locator('[data-challenge-review]').click();
  await page.locator('[data-challenge-confirm]').click();
  await page.locator('[data-challenge-cancel]').waitFor();
}
async function leave(page) {
  await page.locator('[data-challenge-leave]').click();
  await page.locator('[data-challenge-dialog]').waitFor({ state: 'detached' });
  assert(await page.locator('[data-open-events]').evaluate(el => document.activeElement === el), 'Back to club did not restore focus to Events');
}

async function finishAdvance(page, before) {
  // No event consent is supplied here: a booked entry must not cause another reminder.
  const next = () => page.waitForFunction(n => {
    if (document.querySelector('[data-event-reminder]')) return 'unexpected-reminder';
    if (document.querySelector('[data-ask-proceed]')) return 'ask';
    if (document.querySelector('.nrl-mo-controls [data-skip-pill]')) return 'match';
    return window.__nrlState().competitions.calendar.elapsedIntervals > n ? 'done' : false;
  }, elapsed(before), { timeout: 60000 }).then(h => h.jsonValue());
  let stage = await next();
  if (stage === 'ask') { await page.locator('[data-ask-proceed]').click(); stage = await next(); }
  assert(stage !== 'unexpected-reminder', 'An entry already booked or deliberately skipped asked again');
  if (stage === 'match') {
    await skipFromPill(page);
    await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
    await page.locator('.nrl-mo-ft [data-back-to-club]').click();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  }
  await page.waitForFunction(n => window.__nrlState().competitions.calendar.elapsedIntervals === n + 1, elapsed(before));
  assert(elapsed(await state(page)) === elapsed(before) + 1, 'Continue did not advance exactly one interval');
}

export async function runEventOpportunities(browser) {
  const out = join(OUT_ROOT, 'webkit', 'event-opportunities');
  mkdirSync(out, { recursive: true });
  const reports = [];
  for (const [width, height, larger] of [[568, 320, false], [568, 320, true], [844, 390, true]]) {
    for (const path of ['review-and-skip', 'book-cancel-rebook']) {
      const name = `${path}-${width}x${height}${larger ? '-larger' : ''}`;
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
      const page = await context.newPage();
      await page.addInitScript(closeWeekSummary);
      const report = { name, ok: false, errors: [], evidence: 'immutable v34 fixture, production migration and UI commands, real match results' };
      page.on('pageerror', error => report.errors.push(error.message));
      const shot = label => page.screenshot({ path: join(out, `${name}-${label}.png`), animations: 'disabled' });
      try {
        await install(page, larger);
        const before = await state(page);
        const originalHome = await page.locator('[data-home-events]').innerText();
        assert(/Mick|Showground/i.test(originalHome), 'Closing Big Mick opportunity is missing on the main screen');
        await controls(page, '[data-home-events], [data-hud="advance"], [data-hud="board"], .nrl-decisions-review');
        await shot('home');
        if (larger) await crowdedHome(page, shot);
        if (path === 'review-and-skip') {
          await page.locator('[data-hud="advance"]').click();
          await page.locator('[data-event-reminder]').waitFor();
          assert(elapsed(await state(page)) === elapsed(before), 'Reminder appeared after advancing');
          assert(/Mick|Showground/i.test(await page.locator('[data-event-reminder]').innerText()), 'Reminder omitted Big Mick');
          await controls(page, '[data-event-reminder] button');
          await shot('reminder');
          await page.locator('[data-review-events]').click();
          await page.locator('[data-events-list]').waitFor();
          assert(elapsed(await state(page)) === elapsed(before), 'Review advanced the clock');
          await controls(page, '[data-events-list] button');
          await shot('review');
          await page.keyboard.press('Escape');
          await page.locator('[data-events-list]').waitFor({ state: 'detached' });
          await page.locator('[data-hud="advance"]').click();
          await page.locator('[data-skip-events]').click();
          await finishAdvance(page, before);
          await openEvents(page);
          const missed = await page.locator('[data-opportunity="showground"]').innerText();
          assert(/next season/i.test(missed), `Missed deadline has no next-season guidance: ${missed}`);
          await shot('missed');
          report.missed = missed;
        } else {
          await placementHidesEvents(page, shot);
          const after = JSON.parse(readFileSync('tests/fixtures/saves/v34-challenges/v34-au-week-6.json', 'utf8'));
          const id = before.lineup.starters.find(id => before.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks)
            && after.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks));
          assert(id, 'No fit recorded starter');
          await openEvents(page); await openShowground(page); await book(page, id); await leave(page);
          assert(record(await state(page))?.status === 'booked', 'Home entry did not book');
          const bookedHome = await page.locator('[data-home-events]').innerText();
          assert(bookedHome !== originalHome, 'Home did not refresh after booking');
          await shot('booked-home');
          await openEvents(page);
          assert(/registered|booked/i.test(await page.locator('[data-opportunity="showground"]').innerText()), 'Events list did not refresh booked status');
          await openShowground(page);
          await page.locator('[data-challenge-cancel]').click();
          await page.locator('[data-challenge-confirm]').click();
          await page.locator('[data-challenge-player]').waitFor();
          await leave(page);
          assert(record(await state(page))?.status === 'cancelled', 'Cancellation failed');
          assert(await page.locator('[data-home-events]').innerText() === originalHome, 'Home did not restore the closing opportunity after cancellation');
          await openEvents(page); await openShowground(page); await book(page, id); await leave(page);
          await page.locator('[data-hud="advance"]').click();
          await finishAdvance(page, before);
          report.bookedParticipant = id;
          await shot('booked-next-week');
          await openEvents(page); await openShowground(page);
          await page.locator('[data-challenge-withdraw]').click();
          await page.locator('[data-challenge-confirm]').click();
          await page.waitForFunction(() => window.__nrlState().competitions.individualChallenges.some(r =>
            r.season === window.__nrlState().season && r.editionId === 'showground' && r.status === 'cancelled'));
          await leave(page); await openEvents(page);
          const cancelled = await page.locator('[data-opportunity="showground"]').innerText();
          assert(/cancelled/i.test(cancelled) && /next season/i.test(cancelled), 'Withdrawn entry was presented as a missed registration');
          await shot('withdrawn-next-season');
        }
        assert(!report.errors.length, report.errors.join('; '));
        report.ok = true;
      } catch (error) { report.error = error.stack ?? String(error); await shot('failure').catch(() => {}); }
      finally { await context.close(); }
      reports.push(report);
      log(`${report.ok ? 'ok' : 'FAIL'} Event opportunities ${name}${report.error ? ': ' + report.error : ''}`);
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  if (reports.some(r => !r.ok)) throw new Error('Event opportunities failed; see ' + join(out, 'report.json'));
  return 0;
}
