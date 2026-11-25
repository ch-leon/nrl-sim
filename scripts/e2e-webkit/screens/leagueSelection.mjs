// #574: production new-game/reload/match proof, then the complete phone text matrix.
// All screenshots and saved evidence belong in CI artifacts, never source control.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, openNav, reachProblems, skipFromPill, log, setupStep } from '../common.mjs';

const CHOOSER = '[data-nrl-league-selection]';
const CONFIRM = '[data-nrl-league-confirm]';
const DETAIL = '[data-nrl-league-detail]';
const STATUS = '[data-nrl-league-selection-status]';
const SAVE = 'nrl-sim-save-slot-1';
const SIDECAR = 'nrl-live-match-1';
const assert = (value, message) => { if (!value) throw new Error(message); };
const state = page => page.evaluate(() => window.__nrlState());
const progress = s => s.competitions.leagueCareer;

async function resume(page) {
  await page.reload();
  await page.locator('[data-nrl-continue-1]').tap();
  await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
}
async function closeChoice(page) {
  await page.locator(`${CHOOSER} header button`).tap();
  await page.locator(CHOOSER).waitFor({ state: 'detached' });
}
async function openChoice(page) {
  await openNav(page, 'club');
  await page.locator('[data-hud="advance"]').tap();
  await page.locator(CHOOSER).waitFor();
}
async function skipIntro(page) {
  await page.locator('[data-expansion-work]').tap({ timeout: 1500 }).catch(() => {});
  await page.locator('.nrl-tutorial-skip').tap({ timeout: 1500 }).catch(() => {});
}
async function inspectChoice(page, shot) {
  const source = await state(page);
  const divisions = source.competitions.world.divisions;
  assert(await page.locator('[data-nrl-league-choice]').count() === divisions.length, 'Missing league cards');
  const locked = page.locator('[data-nrl-league-choice][data-eligibility="locked"]').first();
  if (await locked.count()) {
    await locked.tap();
    assert((await page.locator(STATUS).innerText()).includes('finals title'), 'Locked card omits exact title requirement');
    assert(await page.locator(CONFIRM).getAttribute('aria-disabled') === 'true', 'Locked league is confirmable');
    const reasonVisible = await page.locator(STATUS).evaluate(el => { const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; });
    assert(reasonVisible, 'Locked blocking explanation is outside the viewport');
    await shot('locked');
  }
  await page.locator(`[data-nrl-league-choice="${progress(source).accepted?.leagueId ?? source.competitions.world.profile.startingDivisionId}"]`).tap();
  const detail = await page.locator(DETAIL).innerText();
  assert(/cap/i.test(detail) && /Season 1|Season 2|Season 3|Season 4|Season 5/.test(detail), 'Missing dated cap obligations');
  assert(/opponents/i.test(detail) && /Nines/i.test(detail), 'Missing actual opponent/format preview');
  await page.locator(DETAIL).evaluate(el => { el.scrollTop = el.scrollHeight; });
  const problems = await reachProblems(page, CHOOSER, [CONFIRM]);
  const height = await page.locator(CONFIRM).evaluate(el => el.getBoundingClientRect().height);
  assert(height >= 44, `Confirm touch target is ${height}px`);
  assert(!problems.length, problems.join('; '));
  await page.locator(CONFIRM).focus();
  assert(await page.locator(CONFIRM).evaluate(el => document.activeElement === el), 'Confirm cannot receive keyboard focus');
  await page.keyboard.press('Tab');
  assert(await page.locator(CHOOSER).evaluate(el => el.contains(document.activeElement)), 'Keyboard focus escaped chooser');
  assert(await page.locator(CONFIRM).getAttribute('aria-disabled') === 'false', 'Eligible Local confirmation is disabled');
  assert(await page.locator(CONFIRM).isEnabled(), 'Eligible Local confirmation cannot be tapped');
  const dated = page.locator('[data-nrl-league-finance] .nrl-league-row').filter({ hasText: `Season ${source.season}` }).first();
  await dated.evaluate(row => {
    const detail = row.closest('[data-nrl-league-detail]');
    detail.scrollTop += row.getBoundingClientRect().top - detail.getBoundingClientRect().top - 35;
  });
  await page.waitForTimeout(180);
  assert(await dated.evaluate(row => {
    const r = row.getBoundingClientRect(), detail = row.closest('[data-nrl-league-detail]').getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.top >= detail.top && r.bottom <= detail.bottom && row.contains(hit) && /Season/.test(row.innerText);
  }), 'Dated signed obligation is not visibly readable after scrolling');
  await shot('obligations');
  assert(JSON.stringify(await state(page)) === JSON.stringify(source), 'Previewing cards changed the career');
}

export async function runLeagueSelection(browser) {
  const out = join(OUT_ROOT, 'webkit', 'league-selection');
  mkdirSync(out, { recursive: true });
  const towns = JSON.parse(readFileSync('src/data/towns.json', 'utf8'));
  const reports = [];
  const initialSaves = new Map();
  const record = async (tag, viewport, body) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
    const page = await context.newPage();
    const report = { tag, evidence: 'production-ui', ok: false, errors: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    await page.addInitScript(closeWeekSummary);
    const shot = async name => {
      // WebKit's overflow compositor and colour transitions need a rendered frame after a card swap.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(180);
      await page.screenshot({ path: join(out, `${tag}-${name}.png`), animations: 'disabled' });
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Horizontal page overflow');
    };
    try { await body(page, report, shot); assert(!report.errors.length, report.errors.join('; ')); report.ok = true; }
    catch (error) { report.error = error.stack ?? String(error); await shot('failure').catch(() => {}); }
    finally { await context.close(); }
    reports.push(report);
    log(`${report.ok ? 'ok ' : 'FAIL'} League career ${tag}${report.error ? `: ${report.error}` : ''}`);
  };
  for (const pack of ['au', 'uk']) {
    await record(`${pack}-fresh-reload-match`, { width: 844, height: 390 }, async (page, report, shot) => {
      await page.clock.setFixedTime(new Date(573 * 4294967296 + 7));
      await page.goto(BASE);
      await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
      const town = towns.find(t => t.country === (pack === 'uk' ? 'GB' : 'AU'));
      await page.locator('[data-nrl-town]').fill(`${town.name}, ${town.region}, ${town.country}`);
      await setupStep(page);
      await shot('new-game');
      await page.evaluate(() => {
        window.__leagueLoadingObserved = false;
        const observer = new MutationObserver(() => {
          if (document.querySelector('[data-nrl-league-loading]')) { window.__leagueLoadingObserved = true; observer.disconnect(); }
        });
        observer.observe(document, { childList: true, subtree: true });
      });
      await page.locator('[data-nrl-start]').tap();
      await page.locator(CHOOSER).waitFor({ timeout: 60000 });
      assert(await page.evaluate(() => window.__leagueLoadingObserved), 'Production League loading transition was not shown');
      const initial = await state(page);
      assert(initial.pack === pack && progress(initial).phase === 'initial-choice', 'Production setup opened the wrong region/phase');
      assert(initial.freeAgents.length === 12, 'Missing bounded opening unsigned pool');
      assert(initial.competitions.world.divisions.length === 3, 'Missing regional world');
      const initialRaw = await page.evaluate(key => localStorage.getItem(key), SAVE);
      assert(initialRaw, 'Initial choice was not saved in the normal slot');
      initialSaves.set(pack, initialRaw);
      writeFileSync(join(out, `${pack}-initial-normal-save.json`), initialRaw);
      await inspectChoice(page, shot);
      await closeChoice(page);
      assert(JSON.stringify(await state(page)) === JSON.stringify(initial), 'Closing the initial chooser advanced time');
      await openChoice(page);
      await resume(page);
      await page.locator(CHOOSER).waitFor();
      assert(JSON.stringify(await state(page)) === JSON.stringify(initial), 'Initial gate reload changed people, money or phase');
      await page.locator(CONFIRM).tap();
      await page.locator(CHOOSER).waitFor({ state: 'detached' });
      await skipIntro(page);
      const accepted = await state(page);
      assert(progress(accepted).phase === 'active' && progress(accepted).accepted.leagueId === initial.competitions.world.profile.startingDivisionId,
        'Explicit Local confirmation failed');
      await resume(page); await skipIntro(page);
      assert(JSON.stringify(progress(await state(page))) === JSON.stringify(progress(accepted)), 'Accepted entry changed on reload');
      await openNav(page, 'fixtures'); await shot('accepted-schedule'); await openNav(page, 'club');
      await page.locator('[data-hud="advance"]').tap();
      await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
      const proceed = page.locator('[data-ask-proceed]'); if (await proceed.isVisible()) await proceed.tap();
      await page.locator('.nrl-mo-controls').waitFor({ timeout: 60000 });
      await page.waitForFunction(key => !!localStorage.getItem(key), SIDECAR);
      const held = await page.evaluate(([key, save]) => ({ match: JSON.parse(localStorage.getItem(key)), save: JSON.parse(localStorage.getItem(save)) }), [SIDECAR, SAVE]);
      await shot('held-match');
      await resume(page);
      await page.locator('.nrl-mo-controls').waitFor({ timeout: 60000 });
      const reheld = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SIDECAR);
      for (const key of ['season', 'week', 'competitionId', 'fixtureId', 'homeId', 'awayId', 'seed']) assert(reheld[key] === held.match[key], `Held reload changed ${key}`);
      await skipFromPill(page);
      await page.locator('.nrl-mo-ft [data-report]').waitFor({ timeout: 120000 });
      const settled = await state(page);
      const receipt = settled.matchIncome.filter(r => r.fixture.id === held.match.fixtureId && r.fixture.competitionId === held.match.competitionId);
      assert(receipt.length === 1 && receipt[0].receipt, 'Watched skip did not settle exactly one cash receipt');
      assert(settled.competitions.calendar.elapsedIntervals === held.save.competitions.calendar.elapsedIntervals + 1, 'Watched skip advanced wrong interval');
      await page.locator('.nrl-mo-ft [data-report]').tap();
      await page.locator('.nrl-report').waitFor(); await shot('watched-report');
      await resume(page);
      const restored = await state(page);
      assert(restored.money === settled.money && JSON.stringify(restored.matchIncome) === JSON.stringify(settled.matchIncome), 'Reload paid the match twice');
      assert(restored.competitions.calendar.elapsedIntervals === settled.competitions.calendar.elapsedIntervals, 'Reload advanced the fixture again');
      report.pack = pack; report.fixtureId = held.match.fixtureId; report.money = restored.money;
      report.receipts = restored.matchIncome.length; report.elapsedIntervals = restored.competitions.calendar.elapsedIntervals;
    });
  }
  // Controlled sporting outcomes exercise deliberate annual choices through the real UI.
  // Their normal saves are generated anew; they are never counted as actual season simulation.
  const controlledOut = join(out, 'controlled-sporting-fixtures');
  try {
    await promisify(execFile)('npx', ['vite-node', 'scripts/qa-league-career.ts', '--controlled-only', '--out', controlledOut],
      { timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
    await record('au-controlled-live-final-review', { width: 844, height: 390 }, async (page, report, shot) => {
      report.evidence = 'controlled-sporting-setup-with-real-final';
      const source = JSON.parse(readFileSync(join(controlledOut, 'au-season-1-before-final.json'), 'utf8'));
      const expectedFixture = source.competitions.instances.flatMap(i => i.fixtures).find(f => f.slot === source.week
        && f.status === 'scheduled' && (f.homeId === source.clubId || f.awayId === source.clubId));
      assert(expectedFixture && progress(source).phase === 'active' && !source.history.length,
        'Automatic review setup must be an active, unclosed final interval');
      await page.addInitScript(([key, raw]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, [SAVE, JSON.stringify(source)]);
      await page.goto(BASE); await page.locator('[data-nrl-continue-1]').tap();
      await page.waitForFunction(() => !!window.__nrlState?.()?.competitions?.leagueCareer);
      await skipIntro(page);
      assert(!(await page.locator(CHOOSER).count()), 'Review setup prematurely opened an annual chooser');
      await page.locator('[data-hud="advance"]').tap();
      await page.waitForFunction(() => document.querySelector('[data-ask-proceed]') || document.querySelector('.nrl-mo-controls'));
      const proceed = page.locator('[data-ask-proceed]'); if (await proceed.isVisible()) await proceed.tap();
      await page.locator('.nrl-mo-controls').waitFor({ timeout: 60000 });
      const held = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SIDECAR);
      assert(held.fixtureId === expectedFixture.id && held.competitionId === expectedFixture.competitionId,
        'The UI played a different final fixture');
      await skipFromPill(page);
      await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
      const closed = await state(page);
      const close = progress(closed).close;
      assert(progress(closed).phase === 'next-season-choice' && closed.season === source.season
        && closed.history.length === 1 && closed.history[0].league.closeId === close.id
        && close.id === `${source.competitions.world.profile.id}:close:s${source.season}`,
        'Live final did not produce the exact once-only closed source identity');
      assert(progress(closed).accepted.receiptId === progress(source).accepted.receiptId,
        'Closing the final accepted next year without a choice');
      const receipts = closed.matchIncome.filter(r => r.fixture.id === expectedFixture.id);
      assert(receipts.length === 1 && receipts[0].receipt, 'Real final payment did not settle exactly once');
      // This is the automatic live season review. Never open History or inject its callback.
      await page.locator('.nrl-mo-ft [data-back-to-club]').tap();
      await page.locator('[data-review-choose-league]').waitFor();
      assert(!(await page.locator(CHOOSER).count()), 'A chooser bypassed the automatic review');
      await shot('automatic-review');
      await page.locator('[data-review-choose-league]').tap(); await page.locator(CHOOSER).waitFor();
      assert(progress(await state(page)).close.id === close.id, 'Review CTA opened a different source year');
      const leagueId = progress(source).accepted.leagueId;
      await page.locator(`[data-nrl-league-choice="${leagueId}"]`).tap();
      assert(await page.locator(CONFIRM).getAttribute('aria-disabled') === 'false', 'Current league is not confirmable');
      await shot('review-cta-choice');
      await page.locator(CONFIRM).tap(); await page.locator(CHOOSER).waitFor({ state: 'detached' });
      const entered = await state(page), receipt = progress(entered).accepted;
      assert(entered.season === source.season + 1 && entered.week === 1 && entered.history.length === 1
        && entered.money === closed.money && receipt.leagueId === leagueId
        && receipt.receiptId === `${source.competitions.world.profile.id}:entry:s2:${source.clubId}:${leagueId}`
        && receipt.startInterval === close.endingInterval, 'Review CTA did not accept exactly one correct annual entry');
      await resume(page); const restored = await state(page);
      assert(restored.money === entered.money && restored.history.length === 1
        && JSON.stringify(progress(restored).accepted) === JSON.stringify(receipt), 'Automatic review acceptance replayed on reload');
      await shot('review-cta-accepted');
      report.fixtureId = expectedFixture.id; report.closeId = close.id; report.entryId = receipt.receiptId;
      report.money = restored.money; report.actualFinalResult = closed.competitions.instances.flatMap(i => i.fixtures).find(f => f.id === expectedFixture.id).result;
    });
    for (const pack of ['au', 'uk']) {
      for (const [season, rank, name] of [[1, 0, 'title-stay'], [2, 1, 'title-up'], [3, 0, 'retained-cap-down'],
        [4, 1, 'losing-year-return-up'], [4, 0, 'losing-year-stay']]) {
        const small = season >= 3;
        await record(`${pack}-controlled-${name}`, { width: small ? 568 : 844, height: small ? 320 : 390 }, async (page, report, shot) => {
          report.evidence = 'controlled-sporting-results';
          const source = JSON.parse(readFileSync(join(controlledOut, `${pack}-season-${season}-closed.json`), 'utf8'));
          if (small) source.settings.textSize = 'larger';
          await page.addInitScript(([key, raw]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, [SAVE, JSON.stringify(source)]);
          await page.goto(BASE); await page.locator('[data-nrl-continue-1]').tap(); await page.locator(CHOOSER).waitFor();
          const access = JSON.stringify(progress(source).access);
          const gate = await state(page);
          assert(progress(gate).phase === 'next-season-choice' && JSON.stringify(progress(gate).access) === access,
            'Annual normal admission changed the gate or earned access');
          await closeChoice(page); await openNav(page, 'history');
          await page.locator(`[data-history-season="${season}"] .nrl-history-review`).tap();
          await page.locator('.nrl-review-body').waitFor();
          await shot('review-unlock');
          await openNav(page, 'club');
          if (season === 4) {
            await openNav(page, 'kit');
            await page.locator('[data-club-rename]').fill('Renamed League Club');
            await page.locator('[data-club-rename]').locator('..').locator('.nrl-rename-save').tap();
            assert((await state(page)).clubName === 'Renamed League Club', 'Club rename did not save');
          }
          await openChoice(page); await resume(page); await page.locator(CHOOSER).waitFor();
          const reopened = await state(page);
          assert(reopened.season === season && reopened.money === source.money && JSON.stringify(progress(reopened).access) === access,
            'Annual close/rename/reload changed cash, cursor or permanent access');
          if (season === 4) assert(reopened.clubName === 'Renamed League Club', 'Renamed club did not survive reload');
          const target = source.competitions.world.divisions.find(d => d.rank === rank);
          const card = page.locator(`[data-nrl-league-choice="${target.id}"]`);
          assert(await card.getAttribute('data-eligibility') === 'eligible', 'Earned choice became locked');
          await card.tap();
          const copy = await page.locator(DETAIL).innerText();
          if (rank > 0) assert(/Permanently unlocked/.test(copy), 'Unlocked league omits earned-title evidence');
          if (season >= 3) assert(/450,000/.test(copy), 'Downward/return preview lost retained 450,000 cap');
          await page.locator(DETAIL).evaluate(el => { el.scrollTop = el.scrollHeight; });
          assert(!(await reachProblems(page, CHOOSER, [CONFIRM])).length, 'Annual confirm is unreachable');
          assert(await page.locator(CONFIRM).evaluate(el => el.getBoundingClientRect().height) >= 44, 'Annual confirm is below 44px');
          const capRow = page.locator('[data-nrl-league-finance] .nrl-league-row').first();
          await capRow.evaluate(row => {
            const detail = row.closest('[data-nrl-league-detail]');
            detail.scrollTop += row.getBoundingClientRect().top - detail.getBoundingClientRect().top - 15;
          });
          assert(await page.locator(CONFIRM).getAttribute('aria-disabled') === 'false', 'Eligible annual choice is disabled');
          await shot('annual-preview');
          await page.locator(CONFIRM).tap(); await page.locator(CHOOSER).waitFor({ state: 'detached' });
          const entered = await state(page);
          const receipt = progress(entered).accepted;
          assert(entered.season === season + 1 && receipt.leagueId === target.id && entered.money === source.money,
            'Annual confirmation changed the wrong league, year or cash');
          assert(JSON.stringify(progress(entered).access) === access, 'Annual selection revoked permanent access');
          if (season >= 3) assert(entered.capAccount.tier === 'championship', 'Downward selection reduced retained salary cap');
          assert(receipt.quote.commitments[0].tier === entered.capAccount.tier && receipt.annualChanges.commitments[0].tier === entered.capAccount.tier,
            'Saved entry commitments disagree with retained cap');
          const acceptedMoney = entered.money;
          await resume(page);
          const reloaded = await state(page);
          assert(reloaded.money === acceptedMoney && JSON.stringify(progress(reloaded).accepted) === JSON.stringify(receipt),
            'Accepted annual entry changed on normal reload');
          await skipIntro(page);
          await openNav(page, 'fixtures'); await shot('accepted-schedule');
          if (season >= 3) { await openNav(page, 'finance'); await shot('accepted-finance'); }
          report.season = season; report.leagueId = target.id; report.cap = receipt.quote.commitments[0].cap;
          report.entryId = receipt.receiptId; report.closeId = progress(source).close.id; report.money = acceptedMoney;
        });
      }
    }
  } catch (error) {
    reports.push({ tag: 'controlled-fixture-generation', evidence: 'controlled-sporting-results', ok: false, error: String(error) });
    log(`FAIL League career controlled fixture generation: ${error}`);
  }
  for (const [width, height] of [[844, 390], [667, 375], [568, 320]]) {
    for (const size of ['normal', 'large', 'larger']) {
      await record(`${width}x${height}-${size}`, { width, height }, async (page, report, shot) => {
        const raw = initialSaves.get('au'); assert(raw, 'Fresh production initial save is unavailable');
        // This is the actual earlier UI-created save. Set text through Settings below.
        await page.addInitScript(([key, raw]) => { localStorage.setItem(key, raw); }, [SAVE, raw]);
        await page.goto(BASE); await page.locator('[data-nrl-continue-1]').tap(); await page.locator(CHOOSER).waitFor();
        await closeChoice(page);
        await openNav(page, 'settings'); await page.locator('.nrl-settings-modal').waitFor();
        await page.locator(`.nrl-settings-textsize [data-seg="${size}"]`).tap();
        await page.locator('.nrl-settings-modal .nrl-screen-x').tap();
        assert(await page.evaluate(() => document.documentElement.getAttribute('data-text-size') ?? 'normal') === size, 'Settings text size did not apply');
        await openChoice(page); await inspectChoice(page, shot);
        report.textSize = size;
      });
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(report => !report.ok).length;
}
