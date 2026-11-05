import { playTrials } from '../common.mjs';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

// ── The ladder's form column at every text size (#426) ──────────────────────
/**
 * Five rounds played as tapped at 844×390 (each match skipped to full time), then the
 * League at 844×390 and 956×330 at Normal, Large and Larger, set in Settings: every
 * club's form shows five pips, each inside its cell's padding, with no cell cut short
 * (at 84px the fifth pip ran 2px over and showed cut, #426), and every club name whole.
 * At 667×375 the column is hidden (760px and under), so it is not checked there.
 */
const LADDER_FORM_SIZES = [[844, 390], [956, 330]];

export async function runLadderForm(browser) {
  const OUT = join(OUT_ROOT, 'webkit', 'ladder-form');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { steps: [], errors: [] };
  const [W0, H0] = LADDER_FORM_SIZES[0];
  const ctx = await browser.newContext({
    viewport: { width: W0, height: H0 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} ladder-form ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const home = async () => {
    if (await page.locator('.nrl-screen-region').count()) await page.locator(SHEET_EXIT).tap();
  };

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-start]').tap();
    await page.locator('[data-expansion-work]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
      await playTrials(page);
  });
  await step('five-rounds', async (rec) => {
    // A bye or a forfeit plays no match: weeks until every club has five results (eight at most).
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => Math.min(...window.__nrlState().league.ladder.map((r) => r.played)) >= 5)) break;
      const at = await page.evaluate(() => window.__nrlState().week);
      await home();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let j = 0; j < 2; j++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        await page.waitForTimeout(300);
        if (await ask.count()) await ask.first().tap();
      }
      const what = await page.waitForFunction((a) => (document.querySelector('.nrl-mo-controls') ? 'match'
        : window.__nrlState().week !== a ? 'week' : null), at, { timeout: 20000 }).then((h) => h.jsonValue());
      if (what === 'match') {
        const go = page.locator('.nrl-mo-plan .nrl-mo-plan-go');
        if (await go.count()) await go.first().tap();
        await page.locator('.nrl-mo-controls [data-pause]').tap();
        await page.locator('.nrl-mo-sheet [data-skip]').tap();
        await page.locator('[data-back-to-club]:visible').first().tap({ timeout: 30000 });
        await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
      }
      await page.waitForFunction((a) => window.__nrlState().week !== a, at, { timeout: 60000 });
    }
    const played = await page.evaluate(() => Math.min(...window.__nrlState().league.ladder.map((r) => r.played)));
    rec.notes.push(`every club has played ${played}`);
    return played >= 5 ? [] : [`only ${played} rounds played`];
  });
  for (const [W, H] of LADDER_FORM_SIZES) {
    await page.setViewportSize({ width: W, height: H });
    for (const size of ['normal', 'large', 'larger']) {
      await step(`ladder-${W}x${H}-${size}`, async (rec) => {
        // Settings' Text size, as tapped (OFFICE, the Settings tile, the size, ✕), then League.
        await home();
        await openNav(page, 'settings');
        await page.locator(`.nrl-settings-seg [data-seg="${size}"]`).tap();
        await page.locator('.nrl-modal .nrl-screen-x').first().tap();
        await openNav(page, 'fixtures');
        await page.waitForSelector('.nrl-ladder-table td.nrl-ladder-form .nrl-form i');
        await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
          const out = [];
          const cells = [...document.querySelectorAll('.nrl-ladder-table tbody td.nrl-ladder-form')];
          for (const td of cells) {
            const club = td.closest('tr').querySelector('.nrl-ladder-name').textContent.trim();
            const pips = [...td.querySelectorAll('.nrl-form i')];
            const cr = td.getBoundingClientRect();
            const cs = getComputedStyle(td);
            const [left, right] = [cr.left + parseFloat(cs.paddingLeft), cr.right - parseFloat(cs.paddingRight)];
            const cut = pips.filter((i) => { const ir = i.getBoundingClientRect(); return ir.width < 1 || ir.left < left - 0.5 || ir.right > right + 0.5; });
            if (pips.length !== 5) out.push(`${club}: ${pips.length} pips`);
            if (cut.length) out.push(`${club}: pip ${pips.indexOf(cut[0]) + 1} cut (to ${Math.round(cut[0].getBoundingClientRect().right)}, the cell's padding at ${Math.round(right)})`);
            else if (td.scrollWidth > td.clientWidth) out.push(`${club}: the form runs ${td.scrollWidth - td.clientWidth}px past its cell`);
          }
          for (const e of document.querySelectorAll('.nrl-ladder-table tbody .nrl-ladder-club, .nrl-ladder-table tbody td.nrl-ladder-name:not(:has(button))')) {
            if (e.scrollWidth > e.clientWidth + 1) out.push(`"${e.textContent.trim()}" cut short`);
          }
          const td = cells[0];
          return { out, note: `${cells.length} rows, form cell ${td ? Math.round(td.getBoundingClientRect().width) : '?'}px` };
        });
        rec.notes.push(r.note);
        return r.out;
      });
    }
  }

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
