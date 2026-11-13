import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav, skipFromPill } from '../common.mjs';

/**
 * Developer settings (#519), the real route on an iPhone, upright first:
 *   - a player's Settings has no Developer settings; `?labs=1` (the old Labs URL) shows it,
 *     the page has its Screens, Playtest career, Experiments (Match controls, off) and
 *     Reset parts, 44px targets, and fits upright (390×844) and sideways (667×375, 568×320);
 *   - the screen override opens Staff & Board on the dock's Office with a DEV tag and
 *     writes no career key; off locks it again;
 *   - Set up playtest career, with a change not saved yet, saves it with its meta into the backup
 *     and reloads into a TEST CAREER with Block play bought and picked, every normal key equal
 *     to its backup;
 *   - the first match, watched at ×1, calls Block play from the coach tray; ×2 works; the
 *     record is under the playtest prefix; mid-match, Return is refused with the reason;
 *   - after the match, Return reloads to the title with the normal keys byte for byte and
 *     no playtest key left; Continue is the normal club;
 *   - Reset all turns the override off and hides the page, keeping the hints seen and the career.
 */
export async function runDevSettings(browser) {
  const started = Date.now();
  const OUT = join(OUT_ROOT, 'webkit', 'dev-settings');
  mkdirSync(OUT, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const step = (s) => log(`  dev settings: ${s}`);
  /** Every key a career keeps, normal ones only, with their bytes. */
  const careerKeys = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage)
    .filter((k) => /^(nrl-sim-save-|nrl-live-match-|nrl-sim-device-id)/.test(k)).sort().map((k) => [k, localStorage.getItem(k)])));
  const devKeys = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nrl-sim-devtest')).sort());
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const openPanel = async () => {
    if (await page.locator('.nrl-labs-panel').count()) return;
    await openNav(page, 'settings');
    await page.locator('.nrl-labs-open').tap();
    await page.locator('.nrl-labs-panel').waitFor();
  };
  const closePanel = async () => {
    while (await page.locator('.nrl-modal .nrl-screen-x').count()) await page.locator('.nrl-modal .nrl-screen-x').last().tap();
  };
  /** The page's targets and fit: every control 44px, nothing wider than the screen, Reset reachable. */
  const panelProblems = async (tag) => {
    const out = await page.evaluate(() => {
      const panel = document.querySelector('.nrl-labs-panel');
      const problems = [];
      const heads = [...panel.querySelectorAll('h2, h3')].map((h) => h.textContent);
      if (heads.join('|') !== 'Developer settings|Screens|Playtest career|Experiments|Reset') problems.push(`headings ${heads.join('|')}`);
      for (const t of panel.querySelectorAll('button, label, select')) {
        const r = t.getBoundingClientRect();
        if (r.height < 44 - 0.5) problems.push(`"${t.textContent.slice(0, 24)}" is ${r.height.toFixed(1)}px tall`);
        if (r.right > innerWidth + 1 || r.left < -1) problems.push(`"${t.textContent.slice(0, 24)}" is off the side`);
      }
      for (const s of panel.querySelectorAll('section')) if (!s.getAttribute('aria-labelledby') || !document.getElementById(s.getAttribute('aria-labelledby'))) problems.push('a section has no label');
      for (const box of panel.querySelectorAll('input[type=checkbox]')) if (!box.closest('label')?.textContent.trim()) problems.push('a switch has no label');
      if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('the page scrolls sideways');
      return problems;
    });
    await page.locator('.nrl-labs-off').scrollIntoViewIfNeeded();
    const reset = await page.locator('.nrl-labs-off').boundingBox();
    const size = page.viewportSize();
    if (!reset || reset.y < 0 || reset.y + reset.height > size.height + 1) out.push('Reset all cannot be scrolled to');
    await page.screenshot({ path: join(OUT, `panel-${tag}.png`) });
    return out.map((p) => `${tag}: ${p}`);
  };
  try {
    // 1. A player's Settings: no Developer settings.
    await page.goto(BASE);
    await page.locator('[data-nrl-start]').tap();
    await page.locator('[data-expansion-work]').tap();
    if (await page.locator('.nrl-tutorial-skip').count()) await page.locator('.nrl-tutorial-skip').tap();
    await openNav(page, 'settings');
    if (await page.locator('.nrl-labs-open').count()) throw new Error('Developer settings shows without ?labs=1');
    if (await page.locator('.nrl-dev-marker').count()) throw new Error('a developer tag shows on a player’s game');
    await closePanel();
    step('hidden by default');

    // 2. The old Labs URL shows it; the career continues from the title.
    await page.goto(`${BASE}&labs=1`);
    await page.locator('[data-nrl-continue-1]').tap();
    if (await page.locator('.nrl-tutorial-skip').count()) await page.locator('.nrl-tutorial-skip').tap();
    const clubName = await page.evaluate(() => window.__nrlState().clubName);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); // whatever is unsaved lands now, as a backgrounded tab would
    let normal = await careerKeys();
    if (!normal['nrl-sim-save-slot-1']) throw new Error('no normal save in slot 1');
    await openPanel();
    if (await page.locator('[data-experiment="match-controls"]').isChecked()) throw new Error('Match controls is on by default');
    const problems = await panelProblems('390x844');
    await closePanel();
    for (const [w, h] of [[667, 375], [568, 320]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      await openPanel();
      problems.push(...await panelProblems(`${w}x${h}`));
      await closePanel();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    if (problems.length) throw new Error(problems.join('; '));
    step('?labs=1 shows it; fits 390x844, 667x375, 568x320 with 44px targets');

    // 3. The screen override: Staff & Board opens on screen only.
    const staffLocked = () => page.evaluate(() => document.querySelector('.nrl-nav-sheet [data-screen="staff"]')?.classList.contains('nrl-office-locked'));
    const showOffice = async () => {
      if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
      if (!(await page.locator('.nrl-nav-sheet:not([hidden])').count())) await page.locator('.nrl-nav [data-nav-more]').tap();
      await page.locator('.nrl-nav-sheet [data-screen="staff"]').waitFor();
    };
    const hideOffice = async () => { if (await page.locator('.nrl-nav-sheet:not([hidden])').count()) await page.locator('.nrl-nav [data-nav-more]').tap(); };
    await showOffice();
    if (!(await staffLocked())) throw new Error('Staff & Board is open at round 1 with the override off');
    await hideOffice();
    await openPanel();
    await page.locator('[data-override="open-screens"]').check();
    await closePanel();
    await showOffice();
    if (await staffLocked()) throw new Error('the override did not open Staff & Board');
    if ((await page.locator('.nrl-dev-marker').textContent()) !== 'DEV') throw new Error('no DEV tag with the override on');
    await page.screenshot({ path: join(OUT, 'override-office.png') });
    await hideOffice();
    if (!same(await careerKeys(), normal)) throw new Error('the override wrote a career key');
    await openPanel();
    await page.locator('[data-override="open-screens"]').uncheck();
    await closePanel();
    await showOffice();
    if (!(await staffLocked())) throw new Error('Staff & Board stayed open with the override off');
    await hideOffice();
    if (await page.locator('.nrl-dev-marker').count()) throw new Error('the DEV tag stayed with everything off');
    step('screen override opens Staff & Board on screen only');

    // 4. Set up the playtest career, with a change not saved yet: the setup saves it (as Save &
    // quit would) and its meta, written after the current task, must be in the backup too.
    const before = await page.evaluate(() => {
      const s = window.__nrlState();
      s.money += 1; // in memory only, as a between-weeks change sits until the next save
      return { money: s.money, meta: JSON.parse(localStorage.getItem('nrl-sim-save-meta-1')) };
    });
    await openPanel();
    await page.locator('[data-dev-action="enter"]').tap();
    await Promise.all([page.waitForEvent('load', { timeout: 30000 }), page.locator('[data-dev-confirm]').tap()]);
    await page.waitForFunction(() => document.querySelector('.nrl-dev-marker')?.textContent === 'TEST CAREER', null, { timeout: 30000 });
    await page.waitForFunction(() => typeof window.__nrlState === 'function');
    const test = await page.evaluate(() => {
      const s = window.__nrlState();
      return { club: s.clubName, owned: s.playbook.owned, plays: s.lineup.plays, coach: s.staff.find((m) => m.role === 'attackCoach')?.speciality, speed: s.settings.playbackSpeed, dev: document.documentElement.dataset.nrlDev };
    });
    if (test.club !== 'Playtest XIII' || test.owned.join() !== 'block-play' || test.plays.join() !== 'block-play' || test.coach !== 'direct' || test.speed !== 1 || test.dev !== 'test-career') throw new Error(`playtest career is ${JSON.stringify(test)}`);
    const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-devtest-backup')));
    const backedUp = Object.fromEntries(Object.entries(backup).filter(([, v]) => v !== null).sort(([a], [b]) => a.localeCompare(b)));
    if (!same(await careerKeys(), backedUp)) throw new Error('the normal career keys differ from their backup (a write landed after it)');
    if (JSON.parse(backedUp['nrl-sim-save-slot-1']).money !== before.money) throw new Error('the unsaved change was not saved before the backup');
    const meta = JSON.parse(backedUp['nrl-sim-save-meta-1'] ?? 'null');
    if (!meta || !(meta.updatedAt > 0) || meta.revision !== (before.meta?.revision ?? 0) + 1 || meta.deviceId !== backedUp['nrl-sim-device-id']) {
      throw new Error(`the backed-up meta is not the setup save's: ${JSON.stringify(meta)}`);
    }
    for (const [k, v] of Object.entries(normal)) if (!/^nrl-sim-save-(slot|meta)-1$/.test(k) && backedUp[k] !== v) throw new Error(`setup changed ${k}`);
    normal = backedUp; // the career as set up: from here every normal key must stay exactly this
    if (await page.locator('[data-nrl-title]').count()) throw new Error('the playtest career stopped on the title');
    await page.screenshot({ path: join(OUT, 'playtest-club-390x844.png') });
    step('playtest career set up from an unsaved change; the save and its meta in the backup, normal keys byte for byte');

    // 5. The real route: the first match at ×1, Block play called from the tray, ×2.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
    for (let i = 0; i < 2; i++) {
      const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
      if (await ask.count()) await ask.first().tap();
    }
    await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
    await page.locator('.nrl-mo-bar [data-coach]').waitFor({ timeout: 30000 });
    if ((await page.locator('.nrl-mo-speed[data-speed="1"]').getAttribute('aria-pressed')) !== 'true') throw new Error('the match did not open at ×1');
    let called = false;
    for (let tries = 0; tries < 6 && !called; tries++) {
      if (await page.locator('.nrl-mo-calls[hidden]').count()) await page.locator('.nrl-mo-bar [data-coach]').tap();
      await page.waitForFunction(() => document.querySelector('.nrl-mo-tray-title')?.textContent === 'Your ball', null, { timeout: 120000 });
      called = await page.waitForFunction(() => {
        const b = document.querySelector('[data-tray-plays]:not([hidden]) [data-play="block-play"]');
        if (!b) return document.querySelector('.nrl-mo-tray-title')?.textContent !== 'Your ball' ? 'lost' : null;
        if (b.disabled) return document.querySelector('.nrl-mo-tray-title')?.textContent !== 'Your ball' ? 'lost' : null;
        // A tap inside 300ms of the tiles changing makes no call (#608): tap until the tile lights.
        b.click();
        return b.hasAttribute('data-called') ? 'called' : null;
      }, null, { timeout: 120000 }).then((hdl) => hdl.jsonValue()) === 'called';
    }
    if (!called) throw new Error('Block play never came on to call');
    const record = await page.evaluate(() => {
      const sc = window.__nrlGame.scene.getScene('Match');
      return {
        queued: sc.playback.opts.calls.filter((c) => c.call === 'set-play').map((c) => c.play),
        badge: document.querySelector('.nrl-mo-coach-badge')?.textContent,
        stored: localStorage.getItem('nrl-sim-devtest:nrl-live-match-1'),
        normal: Object.keys(localStorage).filter((k) => k.startsWith('nrl-live-match-')),
      };
    });
    if (!record.queued.includes('block-play')) throw new Error(`call record ${JSON.stringify(record.queued)}`);
    if (record.badge !== 'Block play') throw new Error(`badge reads "${record.badge}"`);
    if (!record.stored?.includes('block-play')) throw new Error('the match record is not under the playtest prefix');
    if (record.normal.length) throw new Error(`a normal match record was written: ${record.normal}`);
    await page.screenshot({ path: join(OUT, 'block-play-called-844x390.png') });
    await page.locator('.nrl-mo-controls [data-speed="2"]').tap();
    if ((await page.locator('.nrl-mo-speed[data-speed="2"]').getAttribute('aria-pressed')) !== 'true') throw new Error('×2 did not take');
    step('first match at ×1: Block play called from the tray; ×2 on');

    // Mid-match: Return waits, with its reason.
    await page.locator('.nrl-mo-pause').tap();
    await page.locator('.nrl-mo-sheet [data-settings]').tap();
    await page.locator('.nrl-labs-open').tap();
    await page.locator('.nrl-labs-panel').waitFor();
    if (!(await page.locator('[data-dev-action="return"]').isDisabled())) throw new Error('Return is offered mid-match');
    const why = await page.locator('#nrl-dev-why').textContent();
    if (!/Finish the match/.test(why)) throw new Error(`mid-match reason "${why}"`);
    await page.locator('.nrl-labs-off').tap();
    if (!/Finish the match/.test(await page.locator('section[aria-labelledby="nrl-dev-reset"] .nrl-dev-wait').textContent())) throw new Error('Reset all ran mid-match in the playtest career');
    await page.screenshot({ path: join(OUT, 'return-refused-mid-match.png') });
    await closePanel();
    if (await page.locator('.nrl-mo-sheet [data-resume]').count()) await page.locator('.nrl-mo-sheet [data-resume]').tap();
    else if (await page.locator('.nrl-mo-sheet .nrl-btn').count()) await page.locator('.nrl-mo-sheet .nrl-btn').first().tap();
    step('Return and Reset all refused mid-match');

    // Finish the match.
    await skipFromPill(page);
    await page.locator('.nrl-mo-ft [data-back-to-club]').waitFor({ timeout: 120000 });
    await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate((n) => n.click());
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
    if (!same(await careerKeys(), normal)) throw new Error('playing the playtest match changed a normal career key');

    // 6. Return to my career.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await openPanel();
    await page.locator('[data-dev-action="return"]').tap();
    await Promise.all([page.waitForEvent('load', { timeout: 30000 }), page.locator('[data-dev-confirm]').tap()]);
    await page.locator('[data-nrl-title]').waitFor({ timeout: 30000 });
    if (!same(await careerKeys(), normal)) throw new Error('the normal career keys are not byte for byte after Return');
    const slotMeta = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-save-meta-1')));
    if (slotMeta.updatedAt !== meta.updatedAt || slotMeta.checksum !== meta.checksum) throw new Error('slot 1 meta changed by the round trip');
    const left = await devKeys();
    if (left.length) throw new Error(`playtest keys left after Return: ${left}`);
    if (await page.locator('.nrl-dev-marker').count()) throw new Error('the TEST CAREER tag stayed after Return');
    await page.locator('[data-nrl-continue-1]').tap();
    if (await page.locator('.nrl-tutorial-skip').count()) await page.locator('.nrl-tutorial-skip').tap();
    const back = await page.evaluate(() => window.__nrlState().clubName);
    if (back !== clubName) throw new Error(`continued into ${back}, want ${clubName}`);
    step('Return: title, normal keys byte for byte, no playtest key left');

    // 7. Reset all.
    const hints = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-labs')).hintsSeen);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const beforeReset = await careerKeys();
    await openPanel();
    await page.locator('[data-override="open-screens"]').check();
    await page.locator('.nrl-labs-off').tap();
    const labs = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-labs')));
    if (labs.visible || labs.overrides || labs.testCareer || Object.values(labs.on).some(Boolean)) throw new Error(`Reset all left ${JSON.stringify(labs)}`);
    if (JSON.stringify(labs.hintsSeen) !== JSON.stringify(hints)) throw new Error('Reset all lost the hints seen');
    if (!same(await careerKeys(), beforeReset)) throw new Error('Reset all changed a career key');
    await openNav(page, 'settings');
    if (await page.locator('.nrl-labs-open').count()) throw new Error('Developer settings still shows after Reset all');
    await closePanel();
    if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
    step('Reset all: off and hidden, hints and career kept');
    log(`ok  dev settings (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return 0;
  } catch (err) {
    log(`FAIL dev settings — ${err.message}`);
    await page.screenshot({ path: join(OUT, 'failure.png') }).catch(() => {});
    return 1;
  } finally { await ctx.close(); }
}
