import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, BOOST, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems, boostFonts, scrolls, fitsOrScrolls, openNav } from '../common.mjs';

// ── One size ─────────────────────────────────────────────────────────────────
export async function runSize(browser, W, H) {
  const OUT = join(OUT_ROOT, 'webkit', `${W}x${H}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: `${W}x${H}`, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} ${W}x${H} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const tap = (sel) => page.locator(sel).first().tap();
  // #370: a new game's first tap is anchored and offers Skip; a replay also offers Next.
  const TUT = ['.nrl-tutorial-bubble', ['.nrl-tutorial-skip']];
  const REPLAY = ['.nrl-tutorial-bubble', ['.nrl-tutorial-skip', '.nrl-tutorial-next']];

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.fill('[data-nrl-clubname]', 'Safari FC');
    await tap('[data-nrl-start]');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
    await page.waitForTimeout(700);
    // WebKit on Linux has no text autosizer and drops the property from computed
    // style, so read what the page's own <style> asks for.
    const adjust = await page.evaluate(() =>
      [...document.querySelectorAll('style')].some((st) => /html\s*\{[^}]*-webkit-text-size-adjust:\s*100%/.test(st.textContent ?? '')));
    return adjust ? [] : ['the page does not set html { -webkit-text-size-adjust: 100% }'];
  });
  await step('tutorial-first-tap', () => reachProblems(page, ...TUT));
  // #208: at the authored text size every step's copy fits without scrolling. Each
  // step's text is put in the first tap's bubble in turn (one rule sizes them all here).
  await step('tutorial-every-step-fits', () => page.evaluate(() => {
    const text = document.querySelector('.nrl-tutorial-text');
    const steps = window.__nrlTutorialText ?? [];
    if (!text || !steps.length) return ['no tutorial copy to check (?e2e hook missing)'];
    const original = text.textContent;
    const out = [];
    steps.forEach((copy, i) => {
      text.textContent = copy;
      if (text.scrollHeight > text.clientHeight + 1) out.push(`step ${i + 1} copy overflows (${text.scrollHeight} > ${text.clientHeight}px): "${copy.slice(0, 30)}…"`);
    });
    text.textContent = original;
    return out;
  }));
  await step('tutorial-boosted', async (rec) => {
    const px = await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    rec.notes.push(`copy at ${Math.round(px)}px`);
    const out = await reachProblems(page, ...TUT);
    if (!(await fitsOrScrolls(page, '.nrl-tutorial-text'))) out.push('the copy is cut off and does not scroll inside the bubble');
    return out;
  });
  await step('tutorial-skipped', async () => {
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
  });
  // A sheet has no ✕ (Broadcast Quiet): its way out is the dock's CLUB.
  const GUIDE = ['.nrl-guide-modal', ['.nrl-guide-replay', '.nrl-nav [data-nav-home]', '.nrl-guide-tab']];
  await step('guide', async () => {
    await openNav(page, 'help');
    await page.waitForSelector('[data-guide]');
    return reachProblems(page, ...GUIDE);
  });
  await step('guide-boosted', async () => {
    await boostFonts(page, '.nrl-guide-modal', BOOST);
    const out = await reachProblems(page, ...GUIDE);
    if (!(await scrolls(page, '.nrl-guide-body'))) out.push('the Guide page does not scroll between its tabs and foot');
    return out;
  });
  await step('replay-boosted', async () => {
    await tap('.nrl-guide-replay');
    await page.waitForSelector('.nrl-tutorial-bubble[data-step="build"]');
    await boostFonts(page, '.nrl-tutorial-bubble', BOOST);
    const out = await reachProblems(page, ...REPLAY);
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    return out;
  });
  // #203: the player page (Squad → a player) sits above the dock (there is no top bar
  // any more), with ◂ SQUAD (it has no ✕) and Renew / Sell / Release on screen; the
  // dock's tabs stay whole and tappable.
  const PLAYER = ['.nrl-player-modal', ['.nrl-player-modal [data-back]', '[data-player-action="renew"]',
    '[data-player-action="sell"]', '[data-player-action="release"]']];
  await step('player-page', async () => {
    await tap('.nrl-nav .nrl-btn[data-screen="squad"]');
    await tap('.nrl-card-open .nrl-row-name');
    await page.waitForSelector('[data-player-page]');
    await page.waitForTimeout(300);
    const out = await reachProblems(page, ...PLAYER);
    out.push(...await page.evaluate(() => {
      const box = document.querySelector('.nrl-player-modal').getBoundingClientRect();
      const dock = document.querySelector('.nrl-dock').getBoundingClientRect();
      const problems = box.bottom > dock.top + 1 ? [`the player page runs into the dock (${Math.round(box.bottom)} > ${Math.round(dock.top)})`] : [];
      if (box.top < -1) problems.push(`the player page runs off the top (${Math.round(box.top)})`);
      for (const b of document.querySelectorAll('.nrl-nav .nrl-btn')) {
        const r = b.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue; // a More-sheet row while the sheet is shut
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        if (!hit || !b.contains(hit)) problems.push(`nav "${b.textContent.trim()}" covered`);
      }
      return problems;
    }));
    return out;
  });
  // A renewal re-renders the page from state: the ✕ and the actions must survive it.
  await step('player-page-renewed', async (rec) => {
    const renew = page.locator('[data-player-action="renew"]');
    if (await renew.isDisabled()) { rec.notes.push('renew not offered for this player'); return []; }
    await renew.tap();
    await page.waitForTimeout(300);
    return reachProblems(page, '.nrl-player-modal', ['.nrl-player-modal [data-back]', '[data-player-action="sell"]']);
  });
  await step('player-page-closed', async () => {
    await tap('.nrl-player-modal [data-back]');
    await page.waitForSelector('[data-player-page]', { state: 'detached' });
    return (await page.locator('.nrl-card-open').count()) ? [] : ['the Squad screen did not stay open under the player page'];
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
