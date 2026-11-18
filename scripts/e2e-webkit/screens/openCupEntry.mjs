// Public career UI, durable settlement, and presentation at phone and desktop sizes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, fitsOrScrolls, openNav, reachProblems, skipFromPill, log } from '../common.mjs';

const SAVE = 'nrl-sim-save-slot-1';
const SIDECAR = 'nrl-live-match-1';
const CHOOSER = '[data-nrl-league-selection]';
const CONFIRM = '[data-nrl-league-confirm]';
const CARD = '[data-open-cup-card]';
const DETAILS = '[data-open-cup-details]';
const DIALOG = '.nrl-cup-dialog';
const BRACKET = '[data-open-cup-bracket]';
const STATUS = '[data-open-cup-status]';
const action = id => `[data-open-cup-action="${id}"]`;
const state = page => page.evaluate(() => window.__nrlState());
const saved = page => page.evaluate(key => localStorage.getItem(key), SAVE);
const offer = s => s.competitions.openCupEntry.current;
const cup = s => s.competitions.instances.find(i => i.id === offer(s).instanceId);
const assert = (value, message) => { if (!value) throw new Error(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function finishGuidance(page, source, press = 'tap') {
  // Use the pre-install settings. The expansion intro marks itself as seen as it opens.
  if (source.season === 1 && !source.settings.hintsSeen?.includes('expansion-intro')) {
    const intro = page.locator('[data-expansion-intro]');
    await intro.locator('[data-expansion-work]')[press]();
    await intro.waitFor({ state: 'detached' });
  }
  if (!source.settings.tutorialDone) {
    const tutorial = page.locator('.nrl-tutorial');
    await tutorial.locator('.nrl-tutorial-skip')[press]();
    await tutorial.waitFor({ state: 'detached' });
  }
}

async function continueCareer(page, raw, press = 'tap') {
  await page.locator('[data-nrl-continue-1]')[press]();
  await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
  await finishGuidance(page, JSON.parse(raw), press);
}

async function resume(page) {
  const raw = await saved(page);
  assert(raw, 'The career was not saved before reload');
  await page.reload();
  await continueCareer(page, raw);
}

async function startCareer(page, town, pack) {
  await page.clock.setFixedTime(new Date(573 * 4294967296 + 7));
  await page.goto(BASE);
  await page.locator('[data-nrl-town]').fill(`${town.name}, ${town.region}, ${town.country}`);
  await page.locator('[data-nrl-career-mode-league]').tap();
  await page.locator('[data-nrl-start]').tap();
  await page.locator(CHOOSER).waitFor({ timeout: 60000 });
  const initial = await state(page);
  assert(initial.pack === pack && initial.competitions.leagueCareer.phase === 'initial-choice', 'Wrong regional league choice');
  assert(!initial.competitions.openCupEntry && !await page.locator(CARD).count(), 'An offer appeared before league confirmation');
  await page.locator(CONFIRM).tap();
  await page.locator(CHOOSER).waitFor({ state: 'detached' });
  await finishGuidance(page, initial);
  assert(!await page.locator(DIALOG).count(), 'League acceptance forced a cup popup');
  const active = await state(page);
  assert(offer(active).choice === 'unanswered' && !cup(active), 'League acceptance did not open a fresh unanswered offer');
}

async function openCup(page) {
  await openNav(page, 'fixtures');
  await page.locator(DETAILS).tap();
  await page.locator(DIALOG).waitFor();
}

async function closeCup(page) {
  await page.locator(`${DIALOG} button`).filter({ hasText: 'Close' }).tap();
  await page.locator(DIALOG).waitFor({ state: 'detached' });
}

async function inspectOffer(page) {
  const dialog = page.locator(DIALOG);
  assert(!await page.locator(BRACKET).count(), 'Open offer revealed an opponent or bye');
  const text = await dialog.innerText();
  assert(/Free entry through Week 6/.test(text) && /Week 7.*Week 10.*Week 13.*Week 16.*Week 19/.test(text), 'Missing fee, deadline or cup dates');
  assert(/1 × M[\s\S]+1 × M[\s\S]+2 × M[\s\S]+3 × M[\s\S]+5 × M/.test(text), 'Cash prize formula incomplete');
  assert(/\+1 reputation/.test(text) && /\+2 more/.test(text) && /including reserves/.test(text) && /Byes and forfeits earn no prize/.test(text), 'Prize or squad terms incomplete');
  const buttons = [`${DIALOG} .nrl-cup-head button`, action('enter'), action('decline')];
  await page.waitForTimeout(200);
  const problems = await reachProblems(page, '.nrl-cup-modal', buttons);
  assert(!problems.length, problems.join('; '));
  for (const sel of buttons) {
    assert(await page.locator(sel).evaluate(el => {
      const r = el.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44;
    }), `${sel} has a touch target below 44px`);
  }
  assert(await fitsOrScrolls(page, '.nrl-cup-detail'), 'Cup terms cannot be reached by scrolling');
}

async function inspectKeyboard(page) {
  const button = page.locator(DETAILS);
  await openNav(page, 'fixtures');
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator(DIALOG);
  const close = dialog.getByRole('button', { name: 'Close' });
  assert(await close.evaluate(el => document.activeElement === el), 'Open Cup did not move focus into the dialog');
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator(action('enter')).evaluate(el => document.activeElement === el), 'Reverse focus escaped the dialog');
  await page.keyboard.press('Tab');
  assert(await close.evaluate(el => document.activeElement === el), 'Forward focus escaped the dialog');
  await page.keyboard.press('Escape');
  assert(!await dialog.count() && await button.evaluate(el => document.activeElement === el), 'Escape failed to return focus to Cup details');
}

async function exerciseFailedSaves(page) {
  // Change one benign setting after preview, using the existing e2e state hook.
  // The unit test separately covers a byte-identical career installed in another slot.
  await page.evaluate(() => {
    const settings = window.__nrlState().settings;
    settings.muted = !settings.muted;
  });
  const before = await saved(page);
  await page.locator(action('enter')).tap();
  assert(/career changed.*choose again/i.test(await page.locator(STATUS).innerText()), 'Stale preview did not visibly refresh');
  assert(await saved(page) === before && offer(await state(page)).choice === 'unanswered', 'Stale click changed registration');
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key) throw new DOMException('Test quota refusal', 'QuotaExceededError');
      return original.call(this, name, value);
    };
    window.restoreCupTestStorage = () => { Storage.prototype.setItem = original; };
  }, SAVE);
  try {
    await page.locator(action('enter')).tap();
    assert(/could not be saved.*try again/i.test(await page.locator(STATUS).innerText()), 'Storage failure did not offer a retry');
    assert(await saved(page) === before && offer(await state(page)).choice === 'unanswered', 'Failed write changed registration');
  } finally {
    await page.evaluate(() => window.restoreCupTestStorage());
  }
  await page.locator(action('enter')).tap();
  assert(offer(await state(page)).choice === 'enter', 'Fresh click did not save after the storage recovered');
}

async function advanceOne(page, { controlled = true, onResult } = {}) {
  const before = await state(page);
  const elapsed = before.competitions.calendar.elapsedIntervals;
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').tap();
  const outcome = () => page.waitForFunction(n => {
    if (document.querySelector('[data-ask-proceed]')) return 'ask';
    if (document.querySelector('.nrl-mo-controls [data-skip-pill]')) return 'match';
    if (window.__nrlState().competitions.calendar.elapsedIntervals > n) return 'done';
    return false;
  }, elapsed, { timeout: 60000 }).then(handle => handle.jsonValue());
  let next = await outcome();
  if (next === 'ask') {
    await page.locator('[data-ask-proceed]').tap();
    next = await outcome();
  }
  if (next === 'match') {
    await page.waitForFunction(key => !!localStorage.getItem(key), SIDECAR);
    const live = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SIDECAR);
    if (controlled) {
      // Replace only the playback Skip result, as qa-league-career does for its
      // controlled fixture scores. The real kickoff, commit, calendar and receipt
      // owners run unchanged. These scores are presentation coverage only.
      await page.evaluate(() => {
        const scene = window.__nrlGame.scene.getScene('Match');
        if (!scene.playback?.opts) throw new Error('Match playback is missing');
        scene.playback.opts.skipElsewhere = async ({ home, opts }) => {
          const homeWins = home.clubId === window.__nrlState().clubId;
          return {
            homeScore: homeWins ? 24 : 0, awayScore: homeWins ? 0 : 24,
            events: [], injuries: [], stats: { possession: [50, 50], tackles: [0, 0], errors: [0, 0], tries: [0, 0] },
            weather: opts.weather ?? 'clear', momentumTimeline: [],
          };
        };
      });
    }
    await skipFromPill(page);
    await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
    if (onResult) await onResult(live);
    await page.locator('.nrl-mo-ft [data-back-to-club]').tap();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  }
  await page.waitForFunction(n => window.__nrlState().competitions.calendar.elapsedIntervals === n + 1, elapsed);
}

async function advanceTo(page, week) {
  while ((await state(page)).week < week) await advanceOne(page);
}

async function readAtScrollPosition(locator, scrollClass) {
  const observation = await locator.evaluate(async (el, parent) => {
    const container = el.closest(parent);
    const overflow = container && getComputedStyle(container).overflowY;
    if (!container || !['auto', 'scroll'].includes(overflow)) return { ok: false, overflow };

    await document.fonts.ready;
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const bounds = () => {
      const row = el.getBoundingClientRect();
      const panel = container.getBoundingClientRect();
      const inside = row.top >= panel.top - 1 && row.bottom <= panel.bottom + 1
        && row.left >= panel.left - 1 && row.right <= panel.right + 1;
      return { row, panel, inside };
    };
    const read = () => {
      const { row, panel, inside } = bounds();
      const hit = document.elementFromPoint((row.left + row.right) / 2, (row.top + row.bottom) / 2);
      return {
        ok: inside && el.contains(hit),
        row: row.toJSON(), panel: panel.toJSON(), hit: hit?.tagName,
        scrollTop: container.scrollTop, clientHeight: container.clientHeight, scrollHeight: container.scrollHeight,
      };
    };
    // A returning club toast can lift History after WebKit calculates visibility.
    // Scroll only the content panel and check the painted target across frames.
    let observed;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { row, panel, inside } = bounds();
      if (!inside) container.scrollTop += (row.top + row.bottom - panel.top - panel.bottom) / 2;
      await frame();
      await frame();
      observed = read();
      if (observed.ok) {
        await frame();
        observed = read();
        if (observed.ok) return observed;
      }
    }
    return observed;
  }, scrollClass);
  assert(observation.ok, `Content is clipped after scrolling ${scrollClass}: ${JSON.stringify(observation)}`);
}

async function setTextSize(page, size) {
  await openNav(page, 'settings');
  await page.locator(`.nrl-settings-textsize [data-seg="${size}"]`).tap();
  await page.locator('.nrl-settings-modal .nrl-screen-x').tap();
  assert(await page.evaluate(() => document.documentElement.getAttribute('data-text-size') ?? 'normal') === size, 'Text size did not apply');
}

async function openReportTwice(page, live, shot) {
  const s = await state(page);
  const settled = s.competitionRewards.find(r => r.fixtureId === live.fixtureId && r.status === 'settled');
  const ordinary = s.matchIncome.find(r => r.fixture.id === live.fixtureId)?.receipt;
  assert(ordinary && settled, 'Played Cup tie did not settle both receipt classes');
  const receipt = settled.receipts.find(r => r.clubId === s.clubId && r.kind === 'cash');
  assert(receipt && receipt.delta === settled.policies.find(p => p.policy.kind === 'cash').cash, 'Cash receipt differs from frozen win prize');
  const bytes = await saved(page);
  for (let i = 0; i < 2; i++) {
    await page.locator('.nrl-mo-ft [data-report]').tap();
    const normalIncome = page.locator('[data-match-payment="ordinary"]');
    const extra = page.locator('[data-match-payment="cup"]');
    assert(/Ordinary match income/i.test(await normalIncome.innerText()), 'Report omitted the ordinary income');
    const dollars = amount => `$${amount.toLocaleString('en-US')}`;
    const side = live.homeId === s.clubId ? 'home' : 'away';
    assert((await normalIncome.innerText()).includes(dollars(ordinary[side].total)), 'Report ordinary income differs from its receipt');
    assert((await extra.innerText()).includes(dollars(receipt.delta)), 'Report omitted the paid Cup cash');
    assert((await extra.innerText()).includes(dollars(settled.matchBase)), 'Report omitted the frozen base');
    if (i === 0) {
      for (const rows of [normalIncome.locator('li'), extra.locator('li')]) {
        await readAtScrollPosition(rows.first(), '.nrl-rp-scroll');
        await readAtScrollPosition(rows.last(), '.nrl-rp-scroll');
      }
      const problems = await reachProblems(page, '.nrl-report-modal', ['.nrl-rp-back']);
      assert(!problems.length, problems.join('; '));
      await shot('controlled-report');
    }
    await page.locator('.nrl-report-backdrop').evaluate(el => el.click());
    await page.locator('.nrl-mo-ft [data-report]').waitFor();
  }
  assert(same(await state(page), s) && await saved(page) === bytes, 'Reopening the report changed the save, wallet or ledger');
  return receipt.delta;
}

async function holdInstallNotice(page) {
  // Raise the production install notice after History opens, at the point it
  // collided with the first read on CI. Its actual lane layout lifts the sheet.
  const text = 'Tap Share → Add to Home Screen to install';
  await page.evaluate(message => window.__nrlNotify({ text: message, kind: 'info', ms: 8000 }), text);
  await page.waitForFunction(message => {
    const shown = document.querySelector('.nrl-toast-lane:not([hidden]) .nrl-toast:first-child .nrl-toast-text');
    const lift = parseFloat(document.documentElement.style.getPropertyValue('--nrl-toast-lift'));
    return shown?.textContent === message && lift > 0;
  }, text);
}

async function inspectTrophy(page, shot, { installNotice = false } = {}) {
  const won = await state(page);
  const final = won.competitionRewards.find(r => r.status === 'settled' && r.receipts.some(r => r.clubId === won.clubId && r.kind === 'honour'));
  const honour = final?.receipts.find(r => r.clubId === won.clubId && r.kind === 'honour');
  assert(honour && honour.squad.players.length === won.squad.length, 'Played final omitted a registered player or reserve');
  const bytes = await saved(page);
  for (let i = 0; i < 2; i++) {
    await openNav(page, 'history');
    const tab = page.locator('.nrl-history [data-seg="trophies"]');
    await tab.tap();
    const trophy = page.locator('[data-competition-honour]');
    assert((await trophy.innerText()).includes(honour.squad.clubName) && (await trophy.innerText()).includes('Season 1'), 'Trophy omits the saved club or season');
    const names = await trophy.locator('[data-trophy-player-id]').allTextContents();
    assert(same(names, honour.squad.players.map(p => p.name)), 'History changed a name or omitted a reserve');
    if (i === 0) {
      if (installNotice) await holdInstallNotice(page);
      const problems = await reachProblems(page, '.nrl-history', ['.nrl-history [data-seg="trophies"]']);
      assert(!problems.length, problems.join('; '));
      await readAtScrollPosition(trophy.locator('[data-trophy-player-id]').last(), '.nrl-history-body');
      await shot('controlled-trophy');
    }
    await openNav(page, 'club');
  }
  assert(same(await state(page), won) && await saved(page) === bytes, 'Reopening History changed the wallet or ledger');
}

async function installSave(page, raw, press = 'tap') {
  await page.addInitScript(([key, value]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, value);
  }, [SAVE, raw]);
  await page.goto(BASE);
  await continueCareer(page, raw, press);
}

export async function runOpenCupEntry(browser) {
  const out = join(OUT_ROOT, 'webkit', 'open-cup');
  mkdirSync(out, { recursive: true });
  const towns = JSON.parse(readFileSync('src/data/towns.json', 'utf8'));
  const landscape = { width: 844, height: 390 };
  const reports = [];
  let openAu, firstTieAu, firstWinAu, beforeFinalAu, openUk;
  const record = async (name, body, { viewport = landscape, desktop = false } = {}) => {
    const context = await browser.newContext({
      viewport, serviceWorkers: 'block',
      ...(desktop ? {} : { hasTouch: true, isMobile: true, userAgent: IPHONE_UA }),
    });
    const page = await context.newPage();
    const report = { name, ok: false, pageErrors: [] };
    page.on('pageerror', e => report.pageErrors.push(e.message));
    await page.addInitScript(closeWeekSummary);
    const shot = async label => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: join(out, `${name}-${label}.png`), animations: 'disabled' });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal page overflow');
    };
    try {
      await body(page, report, shot);
      assert(!report.pageErrors.length, report.pageErrors.join('; '));
      report.ok = true;
    } catch (e) {
      report.error = e.stack ?? String(e);
      await shot('failure').catch(() => {});
    } finally {
      await context.close();
    }
    reports.push(report);
    log(`${report.ok ? 'ok ' : 'FAIL'} Open Cup ${name}${report.error ? `: ${report.error}` : ''}`);
  };

  await Promise.all([
    record('au-entry-and-title', async (page, report, shot) => {
      report.evidence = 'public New Game, registration and rollover; controlled player match scores';
      await startCareer(page, towns.find(t => t.country === 'AU'), 'au');
      openAu = await saved(page);
      const startingAccess = (await state(page)).competitions.leagueCareer.access;
      await inspectKeyboard(page);
      await openCup(page);
      await inspectOffer(page);
      await shot('offer');
      await exerciseFailedSaves(page);
      await page.locator(action('decline')).tap();
      await closeCup(page);
      await resume(page);
      await openCup(page);
      assert(offer(await state(page)).choice === 'decline', 'Changed choice was lost on reload');
      await page.locator(action('enter')).tap();
      await closeCup(page);
      await advanceTo(page, 6);
      await openCup(page);
      assert(!await page.locator(BRACKET).count(), 'The draw appeared inside Week 6');
      await closeCup(page);
      await advanceOne(page);
      await openCup(page);
      const opened = await state(page);
      assert(opened.week === 7 && offer(opened).resolution === 'entered' && cup(opened).entrantIds.length === 24, 'Week 7 did not draw a 24-club cup');
      assert((await page.locator(BRACKET).innerText()).includes('Opening byes:'), 'Draw omitted real opening byes');
      assert(!await page.locator(action('enter')).count(), 'Entry remained open after the draw');
      await shot('draw');
      await closeCup(page);
      const first = cup(opened).fixtures.find(f => f.homeId === opened.clubId || f.awayId === opened.clubId)?.slot ?? 10;
      await advanceTo(page, first);
      firstTieAu = await saved(page);
      await advanceOne(page, { onResult: async live => {
        assert(live.competitionId === cup(await state(page)).id, 'First controlled result was not an Open Cup tie');
        report.firstPrize = await openReportTwice(page, live, shot);
      } });
      firstWinAu = await saved(page);
      await advanceTo(page, 19);
      beforeFinalAu = await saved(page);
      await advanceOne(page, { onResult: async live => {
        assert(live.competitionId === cup(await state(page)).id, 'Final report used a different fixture');
        await openReportTwice(page, live, async label => shot(`final-${label}`));
      } });
      const won = await state(page);
      assert(cup(won).winnerId === won.clubId && same(won.competitions.leagueCareer.access, startingAccess), 'Cup title failed or unlocked a league');
      await inspectTrophy(page, shot);
      while ((await state(page)).competitions.leagueCareer.phase === 'active') await advanceOne(page);
      await page.locator('[data-review-choose-league]').tap();
      await page.locator(CHOOSER).waitFor();
      const league = (await state(page)).competitions.leagueCareer.accepted.leagueId;
      await page.locator(`[data-nrl-league-choice="${league}"]`).tap();
      await page.locator(CONFIRM).tap();
      await page.locator(CHOOSER).waitFor({ state: 'detached' });
      assert(!await page.locator(DIALOG).count(), 'Annual choice forced a cup popup');
      await openCup(page);
      const annual = await state(page);
      assert(annual.season === 2 && offer(annual).choice === 'unanswered' && offer(annual).offerId !== offer(won).offerId, 'New season carried over last year’s entry');
      await shot('annual-offer');
      report.newOffer = offer(annual).offerId;
    }),
    record('uk-decline', async (page, report, shot) => {
      report.evidence = 'public New Game and decline; controlled player league scores, AI cup simulated';
      await startCareer(page, towns.find(t => t.country === 'GB'), 'uk');
      openUk = await saved(page);
      await openCup(page);
      await page.locator(action('decline')).tap();
      await closeCup(page);
      await resume(page);
      assert(offer(await state(page)).choice === 'decline', 'Decline did not persist');
      await advanceTo(page, 7);
      await openCup(page);
      const start = await state(page);
      assert(offer(start).resolution === 'declined' && cup(start).entrantIds.length === 23 && !cup(start).entrantIds.includes(start.clubId), 'Decline did not leave an AI-only field');
      assert((await page.locator(BRACKET).innerText()).includes('Opening byes:'), 'AI-only cup bracket did not display');
      assert(!await page.locator(`[data-fixture-id^="${cup(start).id}"]`).count(), 'AI-only fixtures leaked into the League calendar');
      await shot('ai-draw');
      await closeCup(page);
      await advanceTo(page, 20);
      await openCup(page);
      const finish = await state(page);
      assert(cup(finish).winnerId && (await page.locator(BRACKET).innerText()).includes('Champion:'), 'AI-only cup champion did not appear');
      await shot('ai-champion');
      report.aiChampion = cup(finish).winnerId;
    }),
  ]);

  await Promise.all([
    record('au-withdrawal', async (page, report, shot) => {
      report.evidence = 'production continuation of the public AU save after a controlled played win';
      assert(firstWinAu, 'AU played Cup win save is unavailable');
      await installSave(page, firstWinAu);
      const before = await state(page);
      const prior = before.finance.find(book => book.season === before.season).prize;
      await openCup(page);
      await page.locator(action('withdraw')).tap();
      assert(offer(await state(page)).withdrawal === null, 'Opening withdrawal confirmation changed the cup');
      await page.locator(action('confirm-withdrawal')).tap();
      assert(offer(await state(page)).withdrawal?.fulfilled === null, 'Withdrawal did not queue');
      await shot('queued');
      await closeCup(page);
      const queued = await state(page);
      const next = cup(queued).fixtures.find(f => f.status === 'scheduled' && [f.homeId, f.awayId].includes(queued.clubId));
      assert(next, 'No next actual Cup tie after a played win');
      await advanceTo(page, next.slot);
      await advanceOne(page);
      await openCup(page);
      const after = await state(page);
      assert(offer(after).withdrawal.fulfilled.fixtureId === next.id && offer(after).withdrawal.fulfilled.slot === next.slot, 'Withdrawal did not apply to the next actual tie on its date');
      assert(after.finance.find(book => book.season === before.season).prize === prior, 'Withdrawal changed earlier prizes or paid a forfeit prize');
      assert((await page.locator(DIALOG).innerText()).includes(`Week ${next.slot} tie was forfeited`), 'Fulfilled withdrawal is missing its date');
      await shot('fulfilled');
    }),
    record('uk-expiry', async (page, report, shot) => {
      report.evidence = 'production continuation of the unanswered public UK save; controlled player league scores';
      assert(openUk, 'UK public save is unavailable');
      await installSave(page, openUk);
      await advanceTo(page, 7);
      await openCup(page);
      const after = await state(page);
      assert(offer(after).resolution === 'expired' && cup(after).entrantIds.length === 23, 'Unanswered offer did not expire into an AI-only draw');
      assert(/No decision/i.test(await page.locator(DIALOG).innerText()), 'Expiry reason is missing');
      await shot('expired');
    }),
    record('migrated-late-save', async (page, report, shot) => {
      report.evidence = 'separate migrated Week 7 fixture';
      await installSave(page, readFileSync('tests/fixtures/saves/league-career/v32-au-week-7.json', 'utf8'));
      await openCup(page);
      assert(offer(await state(page)).resolution === 'legacy-window-missed' && !await page.locator(action('enter')).count(), 'Late migration reopened registration');
      assert((await page.locator(DIALOG).innerText()).includes('window had already closed'), 'Migration did not explain why entry is unavailable');
      assert(!await page.locator('[data-open-cup-terms]').count(), 'Late migration advertised a cup that was never drawn');
      await shot('late');
    }),
    record('phone-text-and-portrait', async (page, report, shot) => {
      report.evidence = 'normal, large and larger text via Settings; existing portrait rotate cover';
      assert(openAu, 'AU public save is unavailable');
      await installSave(page, openAu);
      for (const size of ['normal', 'large', 'larger']) {
        await setTextSize(page, size);
        await openCup(page);
        await inspectOffer(page);
        await shot(size);
        const prizeRows = page.locator('.nrl-cup-prize-table li');
        await readAtScrollPosition(prizeRows.first(), '.nrl-cup-detail');
        await readAtScrollPosition(prizeRows.last(), '.nrl-cup-detail');
        await shot(`${size}-formula`);
        if (size !== 'larger') await closeCup(page);
      }
      const before = await state(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.nrl-rotate').waitFor();
      assert(await page.evaluate(() => {
        const n = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return !!n?.closest('.nrl-rotate');
      }), 'Portrait rotate cover is not blocking gameplay');
      await shot('portrait-cover');
      await page.setViewportSize(landscape);
      await page.locator('.nrl-rotate').waitFor({ state: 'hidden' });
      await inspectOffer(page);
      assert(same(await state(page), before), 'Rotating changed the career');
    }),
    record('desktop', async (page, report, shot) => {
      report.evidence = 'public AU save, 1280×800 desktop pointer';
      assert(openAu, 'AU public save is unavailable');
      await installSave(page, openAu, 'click');
      await page.locator('.nrl-nav [data-screen="fixtures"]').click();
      await page.locator(DETAILS).click();
      await inspectOffer(page);
      await shot('offer');
    }, { viewport: { width: 1280, height: 800 }, desktop: true }),
  ]);


  await record('au-played-tie', async (page, report, shot) => {
    report.evidence = 'actual production playback simulation from the public entered career';
    assert(firstTieAu, 'AU first Cup tie save is unavailable');
    await installSave(page, firstTieAu);
    await advanceOne(page, { controlled: false, onResult: async live => {
      const played = await state(page);
      assert(live.competitionId === cup(played).id, 'Live playback used a different fixture');
      const result = cup(played).fixtures.find(f => f.id === live.fixtureId)?.result;
      assert(result, 'Live playback did not commit a sporting result');
      const reward = played.competitionRewards.find(r => r.fixtureId === live.fixtureId && r.status === 'settled');
      const prize = reward?.receipts.find(r => r.clubId === played.clubId && r.kind === 'cash');
      assert(reward && !!prize === (result.winnerId === played.clubId), 'Live result disagrees with its stored cash prize');
      assert(played.matchIncome.some(r => r.fixture.id === live.fixtureId && r.receipt), 'Live tie omitted its ordinary income');
      await page.locator('.nrl-mo-ft [data-report]').tap();
      const ordinary = page.locator('[data-match-payment="ordinary"]');
      await ordinary.waitFor();
      await readAtScrollPosition(ordinary.locator('li').first(), '.nrl-rp-scroll');
      await shot('actual-report');
      await page.locator('.nrl-report-backdrop').evaluate(el => el.click());
      report.result = result;
      report.paidCupPrize = prize?.delta ?? 0;
    } });
    assert(report.result, 'The actual Cup playback case did not play a match');
  });

  for (const size of ['large', 'larger']) {
    await record(`phone-prizes-${size}`, async (page, report, shot) => {
      report.evidence = `controlled final through production playback and ${size} text report; trophy scroll with a controlled production install notice`;
      assert(beforeFinalAu, 'AU final-ready save is unavailable');
      await installSave(page, beforeFinalAu);
      await setTextSize(page, size);
      await advanceOne(page, { onResult: live => openReportTwice(page, live, shot) });
      await inspectTrophy(page, shot, { installNotice: true });
    });
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(report => !report.ok).length;
}
