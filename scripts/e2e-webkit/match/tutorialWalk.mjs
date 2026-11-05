import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems, openNav, NO_INSETS } from '../common.mjs';

// ── The tutorial, followed (#344, #337, #370) ────────────────────────────────
// The three guided taps done the way the bubble says, never skipped: the paddock
// placed on the grass, a player signed (then the Undo taken, which brings the run
// back to tap 2, and signed again), then Play Week into the first match, played
// to full time with no tutorial over it, and back to the club with the run over.
// Each tap opens its own screen; each control it points at must be whole, out
// from under the bubble, and take the tap. Then the first-visit hints: Lineup's
// shows once, with a 44px ✕; and a build's Undo puts the money back.

export const WALK_RUNS = [{ w: 667, h: 375, safe: NO_INSETS }, { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 } }, { w: 956, h: 330, safe: NO_INSETS }];

export async function runTutorialWalk(browser, { w: W, h: H, safe }) {
  const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
  const OUT = join(OUT_ROOT, 'webkit', `tutorial-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, safe, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
  let n = 0;
  let stop = false;
  const step = async (name, fn) => {
    if (stop) return;
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} tutorial ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
    if (!rec.ok) stop = true; // the steps after this one start from where it left off
  };
  /** The step's target (the first on show, with `text` if given): whole on screen, clear of the bubble, and the one a tap at its middle hits. Then tap it. */
  const tapTarget = async (sel, rec, text = '') => {
    await page.waitForSelector(sel, { state: 'visible' });
    await page.waitForTimeout(700); // the tutorial's anchor poll (500 ms) moves the bubble
    const problem = await page.evaluate(([sel, text]) => {
      const t = [...document.querySelectorAll(sel)].find((e) => e.getBoundingClientRect().width > 0 && e.textContent.includes(text));
      if (!t) return `no ${sel} ${text}`;
      const r = t.getBoundingClientRect();
      const b = document.querySelector('.nrl-tutorial-bubble')?.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return `${sel} off screen`;
      if (b && !(b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom)) return `the bubble covers ${sel}`;
      const c = document.querySelector('.nrl-tutorial-cutout')?.getBoundingClientRect();
      if (!c || r.left < c.left || r.right > c.right || r.top < c.top || r.bottom > c.bottom) return `the highlight is not round ${sel}`;
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return hit && t.contains(hit) ? null : `${sel}: a tap hits ${hit?.className || hit?.tagName}`;
    }, [sel, text]);
    if (problem) return [problem];
    rec.notes.push(`${text || sel} clear`);
    await page.locator(`${sel} >> visible=true`).filter({ hasText: text }).first().tap();
    return [];
  };
  const atStep = (id) => page.waitForSelector(`.nrl-tutorial-bubble[data-step="${id}"]`);

  await step('new-game', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    if (safe.l || safe.t || safe.r || safe.b) {
      await page.evaluate((s) => {
        const st = document.documentElement.style;
        st.setProperty('--nrl-safe-l', `${s.l}px`); st.setProperty('--nrl-safe-t', `${s.t}px`);
        st.setProperty('--nrl-safe-r', `${s.r}px`); st.setProperty('--nrl-safe-b', `${s.b}px`);
      }, safe);
    }
    await page.fill('[data-nrl-clubname]', 'Tutorial FC');
    await page.locator('[data-nrl-start]').tap();
    await page.locator('[data-expansion-work]').tap();
    await atStep('build');
    const count = (await page.locator('.nrl-tutorial-count').textContent())?.trim();
    return count === '1 of 3' ? [] : [`the first tap reads "${count}"`];
  });
  /** The bubble's step: it opened its own screen (#337 U3), and nothing of the tutorial dims the page (U2). */
  const onItsScreen = (key) => page.evaluate((key) => {
    const out = [];
    if (key && !document.querySelector(`[data-screen-key="${key}"]`)) out.push(`the step did not open ${key}`);
    const cut = document.querySelector('.nrl-tutorial-cutout');
    if (cut && /9999px/.test(getComputedStyle(cut).boxShadow)) out.push('the tutorial dims the page');
    return out;
  }, key);
  /** No tutorial on screen: no bubble, frame or overlay box that draws. */
  const tutorialHidden = () => page.evaluate(() => {
    const o = document.querySelector('.nrl-tutorial');
    if (!o) return true;
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    return ![...o.querySelectorAll('.nrl-tutorial-bubble, .nrl-tutorial-cutout')].some(vis);
  });
  /** The Undo toast's button, once it is on show: whole, 44px, and the one a tap at its middle hits. Then tap it. */
  const tapUndo = async () => {
    await page.waitForSelector('.nrl-toast-action .nrl-toast-btn', { state: 'visible' });
    await page.waitForTimeout(300); // past the toast's entry slide
    const problem = await page.evaluate(() => {
      const t = document.querySelector('.nrl-toast-action .nrl-toast-btn');
      const r = t.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) return `Undo is ${Math.round(r.width)}×${Math.round(r.height)}px`;
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) return 'Undo off screen';
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      return hit && t.contains(hit) ? null : `Undo: a tap hits ${hit?.className || hit?.tagName}`;
    });
    if (problem) return [problem];
    await page.locator('.nrl-toast-action .nrl-toast-btn').tap();
    return [];
  };
  const money = () => page.evaluate(() => window.__nrlState().money);

  // Build: the step opens Build itself and frames the Training Paddock row.
  await step('build-paddock', async (rec) => {
    const out = await onItsScreen('build');
    out.push(...await tapTarget('[data-screen-key="build"] [data-facility="trainingPaddock"]', rec));
    return out;
  });
  // Placement: the grass is not dimmed and the bubble leaves the placement bar clear.
  await step('place-on-grass', async (rec) => {
    await page.waitForSelector('.nrl-placebar:not([hidden])');
    await atStep('place');
    await page.waitForTimeout(700);
    const out = await onItsScreen(null);
    const text = (await page.locator('.nrl-tutorial-bubble .nrl-tutorial-text').textContent()).trim();
    if (!/green spot, then Build here/.test(text)) out.push(`placement copy reads "${text}"`);
    out.push(...await page.evaluate(() => {
      const bar = document.querySelector('.nrl-placebar').getBoundingClientRect();
      const b = document.querySelector('.nrl-tutorial-bubble').getBoundingClientRect();
      return b.right <= bar.left || b.left >= bar.right || b.bottom <= bar.top || b.top >= bar.bottom ? [] : ['the bubble covers the placement bar'];
    }));
    // Aim, then build (#395): a tap on the grass moves the ghost and spends nothing.
    const cash = await money();
    await page.touchscreen.tap(Math.round(W / 2) + 70, Math.round(H / 2) + 30);
    await page.waitForTimeout(300);
    if ((await page.evaluate(() => window.__nrlState().facilities.length)) !== 0 || (await money()) !== cash) {
      out.push('a tap on the grass built before Build here');
    }
    const go = page.locator('.nrl-placebar [data-place-go]');
    const box = await go.boundingBox();
    if (!box || box.height < 44) out.push(`Build here is ${box ? Math.round(box.height) : 0}px tall`);
    // If that tap aimed at a bad spot, Cancel and start again: the ghost starts on a free spot.
    if (await go.isDisabled()) {
      rec.notes.push(`aimed at a bad spot: ${(await go.textContent()).trim()}`);
      await page.locator('.nrl-placebar-cancel').tap();
      await openNav(page, 'build');
      await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
      await page.waitForSelector('.nrl-placebar:not([hidden])');
    }
    await go.tap();
    await atStep('recruit');
    rec.notes.push('paddock placed with Build here');
    return out;
  });
  // Recruit: opened by the step, the first free agent's row framed and clear of the bubble.
  await step('recruit-sign', async (rec) => {
    await page.waitForSelector('[data-screen-key="recruit"]');
    const out = await onItsScreen('recruit');
    out.push(...await tapTarget('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)', rec));
    if (out.length) return out;
    await atStep('advance');
    rec.notes.push('signed: on to tap 3');
    return out;
  });
  // #370: Undo the signing inside 5 s: the fee comes back and the run returns to tap 2.
  await step('undo-sign', async (rec) => {
    const squad = await page.evaluate(() => window.__nrlState().squad.length);
    const out = await tapUndo();
    if (out.length) return out;
    await atStep('recruit');
    const after = await page.evaluate(() => window.__nrlState().squad.length);
    if (after !== squad - 1) out.push(`squad ${squad} → ${after} after Undo`);
    rec.notes.push('signing undone: back to tap 2');
    out.push(...await tapTarget('[data-screen-key="recruit"] .nrl-row-action:not(:disabled)', rec));
    await atStep('advance');
    return out;
  });
  // Advance Week: framed and clear; tapping it starts the first match, and the
  // tutorial is gone before the match draws and stays gone until Back to Club (#337 U1).
  await step('advance-to-match', async (rec) => {
    const out = await tapTarget('.nrl-hud-actions > [data-hud="advance"]', rec, 'PLAY WEEK');
    if (out.length) return out;
    await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
    if (!(await tutorialHidden())) out.push('the tutorial is up as the match starts');
    return out;
  });
  await step('match-plays-clear', async (rec) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(500);
      if (!(await tutorialHidden())) { out.push(`the tutorial showed over the match after ${(i + 1) * 0.5}s`); break; }
    }
    const clock = (await page.locator('.nrl-mo-clock').textContent())?.trim();
    rec.notes.push(`clock ${clock}, no tutorial over the match`);
    return out;
  });
  await step('match-full-time', async (rec) => {
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-skip]').tap();
    await page.waitForSelector('.nrl-mo-ft [data-back-to-club]', { timeout: 60000 });
    await page.waitForTimeout(700);
    const out = (await tutorialHidden()) ? [] : ['the tutorial showed over the full-time screen'];
    rec.notes.push('match played to full time (the match\'s Skip, not the tutorial\'s)');
    return out;
  });
  // Back at the club the run is over: three taps, none skipped (#370).
  await step('back-to-club-done', async (rec) => {
    await page.locator('.nrl-mo-ft [data-back-to-club]').evaluate((b) => b.click());
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
    await page.waitForTimeout(700);
    const out = [];
    if (await page.locator('.nrl-tutorial').count()) out.push('the tutorial is still up after the first match');
    if (!(await page.evaluate(() => window.__nrlState().settings.tutorialDone))) out.push('tutorialDone not set at the end');
    rec.notes.push(`week ${await page.evaluate(() => window.__nrlState().week)}, every tap followed, none skipped`);
    return out;
  });
  // First-visit hints (#370): Lineup's line shows the first time, with a 44px ✕, and not again.
  await step('lineup-hint-once', async (rec) => {
    await openNav(page, 'lineup');
    await page.waitForSelector('[data-screen-key="lineup"] [data-hint="lineup"]');
    const out = await reachProblems(page, '[data-hint="lineup"]', ['.nrl-hint-x']);
    const x = await page.locator('.nrl-hint-x').boundingBox();
    // To the hundredth: on a sheet at a fractional y (the notch's inset) WebKit measures 44px as 43.99999.
    const px = (v) => Math.round(v * 100) / 100;
    if (!x || px(x.width) < 44 || px(x.height) < 44) out.push(`the hint's ✕ is ${x?.width}×${x?.height}px`);
    await page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-lineup-hint-first.png`) }).catch(() => {});
    await page.locator('.nrl-hint-x').tap();
    await page.locator('.nrl-nav [data-nav-home]').tap();
    await openNav(page, 'lineup');
    await page.waitForTimeout(400);
    if (await page.locator('[data-hint]').count()) out.push('the Lineup hint showed twice');
    rec.notes.push('shown once');
    return out;
  });
  // #370: a build's Undo inside 5 s takes the facility away and gives every dollar back.
  await step('undo-build', async (rec) => {
    await page.locator('.nrl-nav [data-nav-home]').tap();
    const before = await money();
    const built = await page.evaluate(() => window.__nrlState().facilities.length);
    await openNav(page, 'build');
    await page.locator('[data-screen-key="build"] [data-facility="trainingPaddock"]').tap();
    await page.waitForSelector('.nrl-placebar:not([hidden])');
    await page.locator('.nrl-placebar [data-place-go]').tap(); // the ghost starts on a free spot (#395)
    await page.waitForFunction((k) => window.__nrlState().facilities.length === k + 1, built);
    const out = await tapUndo();
    await page.waitForTimeout(300);
    const after = await money();
    if (after !== before) out.push(`money ${before} → ${after} after Undo`);
    if ((await page.evaluate(() => window.__nrlState().facilities.length)) !== built) out.push('the facility is still there');
    rec.notes.push(`built and undone, money back to $${after}`);
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
