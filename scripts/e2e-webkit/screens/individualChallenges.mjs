// Production contest commands, saved clash playback and the club's real weekly clock.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, openNav, skipFromPill, log } from '../common.mjs';

const SAVE = 'nrl-sim-save-slot-1';
const SIDECAR = 'nrl-live-match-1';
const DIALOG = '[data-challenge-dialog]';
const state = page => page.evaluate(() => window.__nrlState());
const record = (s, edition = 'showground') => s.competitions.individualChallenges?.find(r => r.season === s.season && r.editionId === edition);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const fixture = (pack, week) => JSON.parse(readFileSync(`tests/fixtures/saves/v34-challenges/v34-${pack}-week-${week}.json`, 'utf8'));

async function continueCareer(page, raw) {
  await page.locator('[data-nrl-continue-1]').click();
  await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
  const s = JSON.parse(raw);
  if (!s.settings.hintsSeen?.includes('expansion-intro')) await page.locator('[data-expansion-work]').click();
  if (!s.settings.tutorialDone) await page.locator('.nrl-tutorial-skip').click();
}
async function install(page, s) {
  const raw = JSON.stringify(s);
  await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, [SAVE, raw]);
  await page.goto(BASE);
  await continueCareer(page, raw);
}
async function reload(page) {
  const raw = await page.evaluate(key => localStorage.getItem(key), SAVE);
  await page.reload();
  await continueCareer(page, raw);
}
async function open(page, edition = 'showground') {
  await openNav(page, 'fixtures');
  await page.locator(`[data-challenge-open="${edition}"]`).click();
  await page.locator(DIALOG).waitFor();
}
async function leave(page) {
  await page.locator('[data-challenge-leave]').click();
  await page.locator(DIALOG).waitFor({ state: 'detached' });
}
async function confirm(page) {
  await page.locator('[data-challenge-confirm]').click();
  await page.waitForFunction(() => !document.querySelector('[data-challenge-confirm]'));
}
async function book(page, id) {
  await page.locator('[data-challenge-player]').selectOption(id);
  await page.locator('[data-challenge-review]').click();
  await confirm(page);
}
async function controls(page) {
  for (const control of await page.locator(`${DIALOG} button, ${DIALOG} select`).all()) {
    if (!await control.isVisible()) continue;
    await control.scrollIntoViewIfNeeded();
    const issue = await control.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.width < 44 || r.height < 44 ? 'target below 44px' : r.left < -1 || r.right > innerWidth + 1 ? 'horizontal overflow'
        : !hit || !el.contains(hit) ? 'obscured' : null;
    });
    assert(!issue, `${await control.textContent()}: ${issue}`);
  }
}
async function advance(page, inspectMatch) {
  const s = await state(page);
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').click();
  const next = () => page.waitForFunction(n => {
    if (document.querySelector('[data-ask-proceed]')) return 'ask';
    if (document.querySelector('.nrl-mo-controls [data-skip-pill]')) return 'match';
    return window.__nrlState().competitions.calendar.elapsedIntervals > n ? 'done' : false;
  }, s.competitions.calendar.elapsedIntervals, { timeout: 60000 }).then(h => h.jsonValue());
  let stage = await next();
  if (stage === 'ask') { await page.locator('[data-ask-proceed]').click(); stage = await next(); }
  if (stage === 'match') {
    await page.waitForFunction(k => !!localStorage.getItem(k), SIDECAR);
    if (inspectMatch) await inspectMatch();
    await skipFromPill(page);
    await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
    await page.locator('.nrl-mo-ft [data-back-to-club]').click();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
  }
  await page.waitForFunction(n => window.__nrlState().competitions.calendar.elapsedIntervals === n + 1, s.competitions.calendar.elapsedIntervals);
}
async function startDue(page) {
  const before = await state(page);
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').click();
  await page.locator('[data-challenge-start]').waitFor();
  assert((await state(page)).competitions.calendar.elapsedIntervals === before.competitions.calendar.elapsedIntervals, 'Due contest advanced the club clock');
  await page.locator('[data-challenge-start]').click();
  await page.locator('[data-challenge-call]').first().waitFor();
}
async function finish(page, checkToastReserve = false) {
  await page.locator('[data-challenge-finish]').click();
  if (checkToastReserve) {
    // Layout-only regression: the real toast system left an 86px reserve in
    // this confirmation, then removed it. Reproduce that spacing change in one
    // task, without changing any career data or contest command.
    const aim = await page.evaluate(() => {
      const body = document.querySelector('[data-challenge-dialog] .duel-body');
      const button = document.querySelector('[data-challenge-confirm]');
      body.classList.add('nrl-toast-reserve');
      body.style.setProperty('--nrl-toast-pad', '86px');
      const before = button.getBoundingClientRect();
      const x = before.x + before.width / 2, y = before.y + before.height / 2;
      body.classList.remove('nrl-toast-reserve');
      body.style.removeProperty('--nrl-toast-pad');
      const after = button.getBoundingClientRect();
      return { x, y, movement: Math.max(...['x','y','width','height'].map(k => Math.abs(before[k] - after[k]))),
        hittable: button.contains(document.elementFromPoint(x, y)) };
    });
    assert(aim.movement <= 1, `Toast reserve moved Confirm by ${aim.movement}px`);
    assert(aim.hittable, 'Original confirmation aim no longer hits Confirm');
    await page.mouse.click(aim.x, aim.y);
    await page.waitForFunction(() => !document.querySelector('[data-challenge-confirm]'));
  } else await confirm(page);
  await page.locator('[data-challenge-podium]').waitFor();
}

export async function runIndividualChallenges(browser) {
  const out = join(OUT_ROOT, 'webkit', 'individual-challenges');
  mkdirSync(out, { recursive: true });
  const reports = [];
  const journey = async (name, size, fn) => {
    const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, serviceWorkers: 'block', hasTouch: true,
      isMobile: true, userAgent: IPHONE_UA });
    const page = await context.newPage();
    await page.addInitScript(closeWeekSummary);
    const report = { name, ok: false, errors: [], evidence: 'genuine v34 career, production v35 migration and commands, actual club match simulation' };
    page.on('pageerror', e => report.errors.push(e.message));
    const shot = label => page.screenshot({ path: join(out, `${name}-${label}.png`), animations: 'disabled' });
    try {
      await fn(page, report, shot);
      assert(!report.errors.length, report.errors.join('; '));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page overflows horizontally');
      report.ok = true;
    } catch (error) { report.error = error.stack ?? String(error); await shot('failure').catch(() => {}); }
    finally { await context.close(); }
    reports.push(report);
    log(`${report.ok ? 'ok' : 'FAIL'} Individual challenge ${name}${report.error ? ': '+report.error : ''}`);
  };

  await journey('au-manual-reload-568x320', [568, 320], async (page, report, shot) => {
    const s = fixture('au', 5), after = fixture('au', 6);
    const id = after.lineup.starters.find(id => s.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks)
      && after.squad.some(p => p.id === id && !p.injuredWeeks && !p.suspendedWeeks));
    assert(id, 'No fit recorded starter');
    await install(page, s);
    await open(page);
    await page.locator('[data-challenge-player]').selectOption(id);
    await controls(page);
    await shot('entry');
    await book(page, id); await leave(page); await advance(page); await startDue(page);
    const start = await state(page);
    const calls = ['power','shoot','angle','track','controlled','wrap'];
    for (let i = 0; i < calls.length; i++) {
      await controls(page);
      await page.locator(`[data-challenge-call="${calls[i]}"]`).click();
      await page.locator('[data-challenge-watch]').click();
      await page.locator('[data-challenge-skip]').waitFor();
      const committed = record(await state(page));
      assert(committed.contest.clashes.length === i + 1, 'Clash was not durably committed before playback');
      if (i === 0) {
        await page.waitForFunction(() => window.__nrlGame.scene.getScene('IndividualChallenge').elapsed >= 2250);
        await page.locator('[data-challenge-pause]').click();
        await shot('paused-carry');
        await page.setViewportSize({ width: 320, height: 568 });
        await page.waitForSelector('html.nrl-rotate-on');
        await shot('portrait');
        await page.setViewportSize({ width: 568, height: 320 });
        await page.waitForSelector('html:not(.nrl-rotate-on)');
        const saved = JSON.stringify(committed.contest.clashes);
        await reload(page); await open(page);
        assert(JSON.stringify(record(await state(page)).contest.clashes) === saved, 'Reload changed committed clash');
      } else if (i === 2) {
        await page.locator('[data-challenge-call="track"]').waitFor({ timeout: 10000 });
        assert(record(await state(page)).contest.clashes.length === 3, 'Natural playback did not stop at the next coaching decision');
        await shot('natural-completion');
      } else {
        if (i === 1) {
          await page.waitForFunction(() => window.__nrlGame.scene.getScene('IndividualChallenge').elapsed >= 3650);
          await page.locator('[data-challenge-pause]').click(); await shot('paused-defence-outcome');
        }
        await page.locator('[data-challenge-skip]').click();
      }
      assert((await state(page)).competitions.calendar.elapsedIntervals === start.competitions.calendar.elapsedIntervals, 'Coaching ticked the club clock');
    }
    if (record(await state(page)).status === 'coaching') {
      await page.locator('[data-challenge-call="power"]').click();
      await page.locator('[data-challenge-watch]').click();
      await page.locator('[data-challenge-skip]').click();
    }
    await page.locator('[data-challenge-podium]').waitFor(); await controls(page); await shot('earned');
    const earned = record(await state(page));
    assert(!earned.award, 'Contest paid before club interval');
    await leave(page);
    await advance(page, async () => {
      const raw = JSON.parse(await page.evaluate(k => localStorage.getItem(k), SIDECAR));
      assert(!JSON.stringify(raw).includes('"id":"'+id+'"'), 'Participant appeared in club live sidecar');
    });
    const settled = record(await state(page));
    assert(settled.status === 'completed' && settled.award, 'Player did not return with award');
    const receipt = JSON.stringify(settled.award);
    await reload(page); await open(page); await shot('returned');
    assert(JSON.stringify(record(await state(page)).award) === receipt, 'Reload changed award receipt');
    report.result = { participant: id, clashes: settled.contest.clashes.length, result: settled.contest.progress.result, award: settled.award };
  });

  await journey('uk-auto-667x375', [667, 375], async (page, report, shot) => {
    const s = fixture('uk', 5), after = fixture('uk', 6);
    const id = s.squad.find(p => !p.injuredWeeks && !p.suspendedWeeks && after.squad.some(q => q.id === p.id && !q.injuredWeeks && !q.suspendedWeeks))?.id;
    assert(id, 'No fit recorded UK entrant');
    await install(page, s); await open(page); await book(page, id); await leave(page); await advance(page); await startDue(page);
    await page.locator('[data-challenge-auto]').click();
    await page.getByRole('button', { name: 'Watch auto-coached clash', exact: true }).waitFor();
    await page.locator('[data-challenge-watch]').click();
    await page.locator('[data-challenge-skip]').click();
    assert(record(await state(page)).contest.clashes.length === 1, 'Auto bypassed a checkpoint');
    await page.locator('[data-challenge-auto]').click();
    await page.locator('[data-challenge-call="shoot"]').waitFor();
    await controls(page); await shot('manual-restored');
    await finish(page); await shot('auto-finish');
    await leave(page); await advance(page);
    assert(record(await state(page)).status === 'completed', 'UK contest failed to return');
    report.award = record(await state(page)).award;
  });

  await journey('both-editions-larger-844x390', [844, 390], async (page, report, shot) => {
    const s = fixture('au', 5);
    const later = fixture('au', 6);
    const p = s.squad.filter(p => !p.injuredWeeks && !p.suspendedWeeks && later.squad.some(q => q.id === p.id && !q.injuredWeeks && !q.suspendedWeeks))
      .sort((a, b) => (b.stats.strength + b.stats.speed + b.stats.footyIQ) - (a.stats.strength + a.stats.speed + a.stats.footyIQ))[0];
    assert(p, 'No fit qualification entrant in the genuine fixture');
    await install(page, s);
    await openNav(page, 'settings');
    await page.locator('.nrl-settings-textsize [data-seg="larger"]').click();
    await page.locator('.nrl-settings-modal .nrl-screen-x').click();
    await open(page); await book(page, p.id); await controls(page); await shot('larger-booked');
    await leave(page); await advance(page); await startDue(page);
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); assert(await page.locator(DIALOG).evaluate(el => el.contains(document.activeElement)), 'Focus left contest dialog'); }
    await controls(page); await shot('larger-coaching'); await finish(page, true);
    assert(record(await state(page)).contest.progress.result === 'won', 'Qualification fixture did not win');
    await leave(page); await advance(page);
    while ((await state(page)).week < 9) await advance(page);
    await open(page, 'invitational'); await page.locator('[data-challenge-player]').waitFor();
    const now = await state(page);
    const entrant = now.squad.find(q => !q.injuredWeeks && !q.suspendedWeeks);
    await book(page, entrant.id); await shot('invitation'); await leave(page);
    while ((await state(page)).week < 14) await advance(page);
    await startDue(page); await finish(page); await leave(page); await advance(page);
    const end = await state(page);
    assert(record(end).status === 'completed' && record(end, 'invitational').status === 'completed', 'Both annual editions were not completed');
    await reload(page); await open(page, 'invitational'); await shot('invitation-return');
    report.awards = end.competitions.individualChallenges.map(r => ({edition: r.editionId, award: r.award}));
  });

  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  if (reports.some(r => !r.ok)) throw new Error('Individual challenge journeys failed; see '+join(out, 'report.json'));
}
