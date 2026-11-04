import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

/**
 * The phone play-test's guards (Wave 4 prompt 09, #399), at 667×375 (the narrowest
 * landscape phone): at Large and Larger text the ladder's places read in full, "10"
 * to "16" and not "1…" (its first column was 24px at every size, #410). Then back to
 * Normal, and two matches in one session at ×8: the half-time card comes up in both
 * (Phaser kept the first match's "card shown" for the second, so it never did, #408).
 */
export async function runPlaytest(browser, W = 667, H = 375) {
  const OUT = join(OUT_ROOT, 'webkit', `playtest-${W}x${H}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: `${W}x${H}`, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  let n = 0;
  const step = async (name, fn) => {
    n++;
    const rec = { n, name, ok: true, notes: [] };
    try {
      const problems = (await fn(rec)) ?? [];
      if (problems.length) { rec.ok = false; rec.notes.push(...problems); }
    } catch (err) {
      rec.ok = false;
      rec.notes.push(`threw: ${err.message.split('\n')[0]}`);
    }
    rec.file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: join(OUT, rec.file) }).catch(() => {});
    report.steps.push(rec);
    log(`${rec.ok ? 'ok ' : 'FAIL'} playtest ${W}x${H} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  /** Settings' Text size, as tapped: OFFICE, the Settings tile, the size, then the popup's ✕. */
  const textSize = async (size) => {
    if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
    await openNav(page, 'settings');
    await page.locator(`.nrl-settings-seg [data-seg="${size}"]`).tap();
    await page.locator('.nrl-modal .nrl-screen-x').first().tap();
  };

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-start]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
  });
  await step('lineup', async () => {
    await openNav(page, 'lineup');
    await page.waitForSelector('.nrl-lineup-row');
  });
  await step('plan-sheet', async () => {
    await page.locator('.nrl-screen-tools [data-plan]').tap();
    await page.waitForSelector('.nrl-lineup-plan');
    if (await page.locator('.nrl-lineup-tac [data-tactic="grind"]').textContent() !== 'Tight') return ['Tight label missing'];
  });
  await page.locator('.nrl-lineup-plan [data-plan-done]').tap();
  for (const size of ['large', 'larger']) {
    await step(`ladder-${size}`, async (rec) => {
      await textSize(size);
      await openNav(page, 'fixtures');
      await page.waitForSelector('.nrl-ladder-table .nrl-ladder-pos');
      const places = await page.locator('.nrl-ladder-table .nrl-ladder-pos').evaluateAll((tds) =>
        tds.map((td) => ({ text: td.textContent, cut: td.scrollWidth > td.clientWidth + 1 })));
      rec.notes.push(`${places.length} places`);
      const cut = places.filter((p) => p.cut).map((p) => p.text);
      return [
        ...(cut.length ? [`places cut short: ${cut.join(', ')}`] : []),
        ...(places.some((p) => p.text === '10') ? [] : ['no 10th place on the ladder']),
      ];
    });
  }
  await step('text-normal', () => textSize('normal'));
  for (const m of [1, 2]) {
    await step(`half-time-match-${m}`, async (rec) => {
      if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let i = 0; i < 2; i++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        if (await ask.count()) await ask.first().tap();
      }
      await page.waitForSelector('.nrl-mo-controls', { timeout: 20000 });
      await page.locator('.nrl-mo-controls [data-speed="8"]').tap();
      // The card, or the second half under way without it. A half at ×8 is about a minute; room for a slow runner.
      const seen = await page.waitForFunction(() => {
        if (document.querySelector('.nrl-mo-plan')) return 'card';
        const pb = window.__nrlGame?.scene.getScene('Match')?.playback;
        return pb && pb.half >= 2 && pb.breakKind !== 'half-time' ? 'missed' : null;
      }, null, { timeout: 300000, polling: 50 }).then((h) => h.jsonValue());
      rec.notes.push(seen === 'card' ? 'half-time card up' : 'second half kicked off with no card');
      if (seen === 'card') await page.locator('.nrl-mo-plan .nrl-mo-plan-go').tap();
      await page.locator('.nrl-mo-skip').tap();
      await page.locator('.nrl-mo-skip').tap();
      await page.waitForSelector('[data-back-to-club]:visible', { timeout: 30000 });
      await page.screenshot({ path: join(OUT, `full-time-match-${m}.png`) });
      await page.locator('[data-back-to-club]:visible').first().tap();
      await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      return seen === 'card' ? [] : [`match ${m}: no half-time card`];
    });
  }

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
