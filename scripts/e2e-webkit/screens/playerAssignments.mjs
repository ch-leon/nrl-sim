// Real trial and league simulation, production camp commands and durable reports.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, openNav, skipFromPill, log } from '../common.mjs';

const SAVE = 'nrl-sim-save-slot-1';
const SIDECAR = 'nrl-live-match-1';
const DIALOG = '[data-camp-dialog]';
const state = page => page.evaluate(() => window.__nrlState());
const saved = page => page.evaluate(key => localStorage.getItem(key), SAVE);
const camp = s => s.competitions.assignments?.find(r => r.season === s.season);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const source = (pack, week) => readFileSync(`tests/fixtures/saves/v33-assignments/v33-${pack}-week-${week}.json`, 'utf8');

async function continueCareer(page, raw) {
  await page.locator('[data-nrl-continue-1]').click();
  await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
  const before = JSON.parse(raw);
  if (!before.settings.hintsSeen?.includes('expansion-intro')) {
    await page.locator('[data-expansion-intro] [data-expansion-work]').click();
  }
  if (!before.settings.tutorialDone) await page.locator('.nrl-tutorial-skip').click();
}

async function install(page, raw) {
  await page.addInitScript(([key, value]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, [SAVE, raw]);
  await page.goto(BASE);
  await continueCareer(page, raw);
}

async function reload(page) {
  const raw = await saved(page);
  await page.reload();
  await continueCareer(page, raw);
}

async function openCamp(page) {
  await openNav(page, 'fixtures');
  await page.locator('[data-camp-details]').click();
  await page.locator(DIALOG).waitFor();
}

async function closeCamp(page) {
  await page.locator(DIALOG).getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator(DIALOG).waitFor({ state: 'detached' });
}

async function confirm(page) {
  await page.locator('[data-camp-confirm]').click();
  await page.waitForFunction(() => !document.querySelector('[data-camp-confirm]'));
}

async function inspectControls(page) {
  for (const control of await page.locator(`${DIALOG} button, ${DIALOG} select`).all()) {
    if (!await control.isVisible()) continue;
    await control.scrollIntoViewIfNeeded();
    const problem = await control.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.width < 44 || r.height < 44 ? 'touch target below 44px'
        : r.left < -1 || r.right > innerWidth + 1 ? 'horizontal overflow'
        : !hit || !el.contains(hit) ? 'control obscured' : null;
    });
    assert(!problem, `${await control.getAttribute('data-camp-action') ?? await control.textContent()}: ${problem}`);
  }
}

async function advanceOne(page, inspectMatch) {
  const before = await state(page);
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').click();
  const next = async () => page.waitForFunction(n => {
    if (document.querySelector('[data-skip-events]')) return 'event';
    if (document.querySelector('[data-ask-proceed]')) return 'ask';
    if (document.querySelector('.nrl-mo-controls [data-skip-pill]')) return 'match';
    return window.__nrlState().competitions.calendar.elapsedIntervals > n ? 'done' : false;
  }, before.competitions.calendar.elapsedIntervals, { timeout: 60000 }).then(h => h.jsonValue());
  let stage = await next();
  while (stage === 'ask' || stage === 'event') {
    // This journey deliberately advances past unrelated optional entries.
    await page.locator(stage === 'event' ? '[data-skip-events]' : '[data-ask-proceed]').click();
    stage = await next();
  }
  if (stage === 'match') {
    await page.waitForFunction(key => !!localStorage.getItem(key), SIDECAR);
    if (inspectMatch) await inspectMatch();
    await skipFromPill(page);
    await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
    await page.locator('.nrl-mo-ft [data-back-to-club]').click();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  }
  await page.waitForFunction(n => window.__nrlState().competitions.calendar.elapsedIntervals === n + 1,
    before.competitions.calendar.elapsedIntervals);
}

export async function runPlayerAssignments(browser) {
  const out = join(OUT_ROOT, 'webkit', 'player-assignments');
  mkdirSync(out, { recursive: true });
  const reports = [];
  const record = async (name, size, body) => {
    const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, serviceWorkers: 'block', hasTouch: true,
      ...(size[0] < 1000 ? { isMobile: true, userAgent: IPHONE_UA } : {}) });
    const page = await context.newPage();
    const report = { name, ok: false, pageErrors: [], evidence: 'genuine v33 source, production migration and commands, actual simulated match results' };
    page.on('pageerror', e => report.pageErrors.push(e.message));
    await page.addInitScript(closeWeekSummary);
    const shot = label => page.screenshot({ path: join(out, `${name}-${label}.png`), animations: 'disabled' });
    try {
      await body(page, report, shot);
      assert(!report.pageErrors.length, report.pageErrors.join('; '));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal page overflow');
      report.ok = true;
    } catch (error) {
      report.error = error.stack ?? String(error);
      await shot('failure').catch(() => {});
    } finally { await context.close(); }
    reports.push(report);
    log(`${report.ok ? 'ok ' : 'FAIL'} Skills Camp ${name}${report.error ? `: ${report.error}` : ''}`);
  };

  await record('new-league-week-1', [844, 390], async (page, report, shot) => {
    const towns = JSON.parse(readFileSync('src/data/towns.json', 'utf8'));
    const town = towns.find(t => t.country === 'AU');
    await page.clock.setFixedTime(new Date(573 * 4294967296 + 7));
    await page.goto(BASE);
    await page.locator('[data-nrl-town]').fill(`${town.name}, ${town.region}, ${town.country}`);
    await page.locator('[data-nrl-career-mode-league]').click();
    await page.locator('[data-nrl-start]').click();
    await page.locator('[data-nrl-league-selection]').waitFor({ timeout: 60000 });
    assert(!await page.locator('[data-camp-card]').count(), 'Camp appeared before the league was chosen');
    await page.locator('[data-nrl-league-confirm]').click();
    await page.locator('[data-nrl-league-selection]').waitFor({ state: 'detached' });
    await page.locator('[data-expansion-intro] [data-expansion-work]').click();
    await page.locator('.nrl-tutorial-skip').click();
    assert((await state(page)).week === 1 && !await page.locator(DIALOG).count(), 'Early opportunity advanced time or forced a popup');
    await openCamp(page);
    assert(await page.locator('[data-camp-player]').count(), 'Camp cannot be booked from the first week');
    assert(/Week 4/i.test(await page.locator(DIALOG).innerText()), 'Fresh offer omitted its deadline');
    await shot('early-offer');
    report.evidence = 'public New Game and confirmed starting league, no controlled state';
  });

  for (const test of [
    { pack: 'au', size: [667, 375], manual: false, large: false, recover: true },
    { pack: 'uk', size: [844, 390], manual: false, large: true, recover: false },
    { pack: 'au', size: [1280, 800], manual: true, large: false, recover: false },
  ]) {
    await record(`${test.pack}-${test.size.join('x')}-${test.manual ? 'manual' : 'auto'}`, test.size, async (page, report, shot) => {
      const original = JSON.parse(source(test.pack, 4));
      const afterTrial = JSON.parse(source(test.pack, 5));
      // Pick a real starter who remains fit through this immutable source's actual trial.
      const id = afterTrial.lineup.starters.find(id => original.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks)
        && afterTrial.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks));
      assert(id, 'No stable fit starter in the recorded trial');
      if (test.manual) {
        original.settings.spendPointsMyself = true;
        report.evidence += '; controlled saved manual-spending preference';
      }
      await install(page, JSON.stringify(original));
      if (test.large) {
        await openNav(page, 'settings');
        await page.locator('.nrl-settings-textsize [data-seg="large"]').click();
        await page.locator('.nrl-settings-modal .nrl-screen-x').click();
      }
      await openCamp(page);
      if (test.size[0] >= 1000) {
        for (let i = 0; i < 8; i++) {
          await page.keyboard.press('Tab');
          assert(await page.locator(DIALOG).evaluate(el => el.contains(document.activeElement)), 'Keyboard focus escaped camp details');
        }
        await page.keyboard.press('Escape');
        assert(!await page.locator(DIALOG).count(), 'Escape did not close camp details');
        assert(await page.locator('[data-camp-details]').evaluate(el => el === document.activeElement), 'Closing camp details lost the opener focus');
        await page.keyboard.press('Enter');
        await page.locator(DIALOG).waitFor();
      }
      assert(/Week 5/.test(await page.locator(DIALOG).innerText()) && /Week 6/.test(await page.locator(DIALOG).innerText()), 'Missing early departure/return dates');
      await page.locator('[data-camp-player]').selectOption(id);
      if (test.manual) assert(!await page.locator('[data-camp-focus]').count(), 'Manual camp offers an ineffective focus');
      else await page.locator('[data-camp-focus]').selectOption('balanced');
      await page.locator('[data-camp-review]').click();
      await inspectControls(page);
      await shot('confirmation');
      await confirm(page);
      assert(camp(await state(page))?.status === 'booked', 'Booking was not installed');
      const firstRevision = camp(await state(page)).revision;
      await page.locator('[data-camp-cancel]').click();
      await confirm(page);
      assert(camp(await state(page)).status === 'available', 'Open-window cancellation did not free the place');
      await page.locator('[data-camp-player]').selectOption(id);
      if (!test.manual) await page.locator('[data-camp-focus]').selectOption('balanced');
      await page.locator('[data-camp-review]').click();
      await confirm(page);
      assert(camp(await state(page)).revision > firstRevision, 'Rebooking reused an old action revision');
      await closeCamp(page);
      await reload(page);
      assert(camp(await state(page)).booking.participantId === id, 'Reload lost the booked player');
      await advanceOne(page); // actual Week 4 trial, the player is still at the club
      const before = await state(page);
      assert(before.week === 5 && camp(before).status === 'booked', 'Camp departed before its committed interval');
      await advanceOne(page, async () => {
        const check = async () => {
          const result = await page.evaluate(playerId => {
            const s = window.__nrlState();
            const scene = window.__nrlGame.scene.getScene('Match');
            const own = scene.home.clubId === s.clubId ? scene.home : scene.away;
            const ids = [...own.roster, ...own.bench].map(p => p.id);
            return { ids, away: s.competitions.assignments.find(r => r.season === s.season).status,
              stillOwned: s.squad.some(p => p.id === playerId), live: JSON.parse(localStorage.getItem('nrl-live-match-1')) };
          }, id);
          assert(result.away === 'away' && result.stillOwned && !result.ids.includes(id) && new Set(result.ids).size === 13, 'Held match did not use legal temporary cover');
          return result.live;
        };
        if (test.recover) await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.tick > 0,
          SIDECAR, { timeout: 30000 });
        const live = await check();
        await shot('club-plays-with-cover');
        if (test.recover) {
          // Keep the genuine checkpoint contents but require a verified rewrite:
          // an already byte-identical save correctly needs no storage write.
          await page.evaluate(key => localStorage.setItem(key,
            JSON.stringify(JSON.parse(localStorage.getItem(key)), null, 2)), SAVE);
          await page.addInitScript(([saveKey, liveKey]) => {
            const checkpoint = JSON.parse(localStorage.getItem(saveKey) ?? 'null');
            if (!localStorage.getItem(liveKey) || !checkpoint?.competitions?.assignments?.some(r => r.status === 'booked')) return;
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
              if (this === localStorage && key === saveKey) throw new DOMException('Recovery test quota refusal', 'QuotaExceededError');
              return original.call(this, key, value);
            };
            window.restoreCampRecoveryStorage = () => { Storage.prototype.setItem = original; };
          }, [SAVE, SIDECAR]);
          const checkpoint = await saved(page);
          await reload(page);
          await page.locator('[data-camp-recovery]').waitFor();
          await page.waitForFunction(() => /save|confirmed|storage|retry/i.test(document.querySelector('[data-camp-recovery-status]')?.textContent ?? ''));
          assert(await saved(page) === checkpoint && camp(await state(page)).status === 'booked', 'Failed recovery changed the parked checkpoint');
          assert(await page.locator('#ui-root').evaluate(el => el.inert), 'Recovery left gameplay controls interactive');
          await shot('protected-recovery');
          await page.evaluate(() => window.restoreCampRecoveryStorage());
          await page.locator('[data-camp-recovery-retry]').click();
          await page.locator('.nrl-mo-controls [data-skip-pill]').waitFor({ timeout: 60000 });
          await page.locator('[data-camp-recovery]').waitFor({ state: 'detached' });
          const resumed = await check();
          assert(resumed.fixtureId === live.fixtureId && resumed.seed === live.seed, 'Recovery changed the committed match');
        }
      });
      const returned = await state(page);
      const receipt = camp(returned);
      assert(returned.week === 6 && receipt.status === 'completed' && receipt.booking.participantId === id, 'Camper did not return before Week 6');
      assert(same(returned.lineup, before.lineup), 'Automatic cover changed the saved team');
      assert(receipt.award.effectiveXp > 0 && receipt.award.mode === (test.manual ? 'manual' : 'auto'), 'Wrong camp award or spending mode');
      assert(returned.squad.filter(p => p.id === id).length === 1, 'Return duplicated or lost the player');
      await openCamp(page);
      await page.locator('[data-camp-report]').waitFor();
      await inspectControls(page);
      await shot('return-report');
      await closeCamp(page);
      const bytes = await saved(page);
      await openCamp(page);
      await closeCamp(page);
      assert(await saved(page) === bytes, 'Reopening the report changed the saved reward');
      await reload(page);
      assert(same(camp(await state(page)), receipt), 'Reload changed the completion receipt');
      report.participantId = id;
      report.award = receipt.award;
      report.elapsedIntervals = returned.competitions.calendar.elapsedIntervals;
    });
  }

  await record('legacy-week-5-missed-window', [844, 390], async (page, report, shot) => {
    await install(page, source('uk', 5));
    await openCamp(page);
    assert(!await page.locator('[data-camp-review]').count(), 'An older Week 5 save can register after the deadline');
    assert(/closed|missed|next season/i.test(await page.locator(DIALOG).innerText()), 'Missed-window explanation missing');
    assert(!camp(await state(page)), 'Migration invented a camp booking');
    await shot('missed-window');
    report.elapsedIntervals = (await state(page)).competitions.calendar.elapsedIntervals;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.nrl-rotate').waitFor();
    assert(await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.nrl-rotate')),
      'Portrait rotation cover did not protect the landscape camp interface');
    await shot('portrait-cover');
  });
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(r => !r.ok).length;
}
