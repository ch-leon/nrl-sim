import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

// ── The flow fixes, end to end (#350) ────────────────────────────────────────
// At 667×375 and at an iPhone SE's 568×320, with Settings › Text size on Larger
// (E2E_FLOW="844x390@normal …" for others), a career played the way #350 found it awkward:
//   - T1: the new club's setup with Start whole and the build label clear of it;
//   - X3: Coach calls and Rival matches in Settings, 44px rows;
//   - H1: "v Darwin · away" under PLAY WEEK and the decisions badge;
//   - the ▾ menu over an open decision card: its items take the tap, not the card;
//   - H3: To season end asks "Play n weeks?" (with a toast up), Cancel plays
//     nothing, and with a card waiting the ask says it instead; ×4 never asks;
//   - N4: ×4 runs until one stops on a new card, which opens in place; once
//     answered, Keep advancing (whole, with a toast up) carries on to the same end;
//   - F1: Staff & Board from Office, objectives beside the staff;
//   - F3: Renew leaves the rows where they were, "Renewed ✓" in place, and a
//     second tap on the same spot renews nobody else; the table fits the sheet,
//     with SELL armed ("Really sell?") too, and ◂ FINANCE stays clear of the title;
//   - T2: after a reload, New game on the slot asks "Start over? This replaces …"
//     and Cancel keeps it. The title is at Normal whatever the save says: the text
//     size is a save's setting, put on the page once a slot is picked.
export const FLOW_RUNS = (process.env.E2E_FLOW ?? '667x375@larger 568x320@larger').split(/\s+/).filter(Boolean).map((s) => {
  const [size, text] = s.split('@');
  const [w, h] = size.split('x').map(Number);
  return { w, h, text: text ?? 'larger' };
});

/** Each selector's first shown element: on screen, at least 44px tall (`tall`), and what a tap at its middle hits. */
function flowReach(page, sels, tall = true) {
  return page.evaluate(([sels, tall]) => {
    const W = innerWidth, H = innerHeight, out = [];
    for (const sel of sels) {
      const e = [...document.querySelectorAll(sel)].find((x) => x.getBoundingClientRect().width > 0);
      if (!e) { out.push(`${sel} not shown`); continue; }
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) { out.push(`${sel} off screen (${Math.round(r.top)}–${Math.round(r.bottom)} of ${H})`); continue; }
      if (tall && r.height < 43.5) out.push(`${sel} ${Math.round(r.height)}px tall`);
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!hit || !e.contains(hit)) out.push(`${sel} covered (a tap hits ${hit?.className || hit?.tagName})`);
    }
    return out;
  }, [sels, tall]);
}

export async function runFlow(browser, { w: W, h: H, text }) {
  const tag = `${W}x${H}-${text}`;
  const OUT = join(OUT_ROOT, 'webkit', `flow-${tag}`);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: tag, steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  // No closeWeekSummary here: the weekly card must wait behind a decision card on its own.
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
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
      stop = true; // the steps after it start from where it left off
    }
    rec.file = `${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: join(OUT, rec.file) }).catch(() => {});
    report.steps.push(rec);
    log(`${rec.ok ? 'ok ' : 'FAIL'} flow ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const tap = (sel) => page.locator(sel).first().tap();
  /** The screen as the step checked it (the step's own shot is taken after it tidies up). */
  const shot = (name) => page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
  const week = () => page.evaluate(() => window.__nrlState().week);
  const idle = () => page.waitForFunction(() => !document.querySelector('.nrl-dock[data-advancing]'), null, { timeout: 120000 });
  const toast = (t) => page.evaluate((t) => window.__nrlNotify({ text: t, kind: 'info', ms: 60000 }), t);
  const clearToasts = async () => {
    for (let i = 0; i < 20 && (await page.locator('.nrl-toast:not(:has(.nrl-toast-btn))').count()); i++) {
      await page.locator('.nrl-toast').first().tap({ timeout: 2000 }).catch(() => {});
    }
  };
  /** Back to the bare grounds: the weekly card closed, no sheet, no dialog. */
  const club = async () => {
    for (let i = 0; i < 3; i++) {
      if (await page.locator('[data-summary-close]').count()) await tap('[data-summary-close]');
      else if (await page.locator('.nrl-dialog-region .nrl-screen-x').count()) await tap('.nrl-dialog-region .nrl-screen-x');
      else if (await page.locator('.nrl-screen-region').count()) await tap(SHEET_EXIT);
      else break;
      await page.waitForTimeout(150);
    }
  };
  const menuPick = async (label) => {
    await tap('.nrl-hud-menu-toggle');
    await page.locator('.nrl-hud-menu-item', { hasText: label }).tap();
  };
  /** Answer every card in the popup with its first choice. */
  const answerAll = async () => {
    for (let i = 0; i < 4 && (await page.locator('[data-decisions] [data-event-choice]').count()); i++) {
      await tap('[data-decisions] [data-event-choice]');
      await page.waitForTimeout(150);
    }
  };

  await step('t1-setup', async () => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-open-all]').check();
    await page.waitForTimeout(250);
    const out = await flowReach(page, ['[data-nrl-clubname]', '[data-nrl-start]']);
    out.push(...await page.evaluate(() => {
      const b = document.querySelector('[data-nrl-build]')?.getBoundingClientRect();
      const p = document.querySelector('.nrl-title-setup')?.getBoundingClientRect();
      if (!b || !p) return ['no build label or setup panel'];
      return b.right > p.left && b.left < p.right && b.bottom > p.top && b.top < p.bottom ? ['the build label overlaps the setup panel'] : [];
    }));
    await shot('t1-at-check');
    await page.fill('[data-nrl-clubname]', 'Flow FC');
    await tap('[data-nrl-start]');
    await page.locator('[data-expansion-work]').tap();
    await page.waitForSelector('.nrl-tutorial-skip');
    await tap('.nrl-tutorial-skip');
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    await club();
    return out;
  });
  await step('x3-settings', async (rec) => {
    await clearToasts();
    await openNav(page, 'settings');
    await page.waitForSelector('.nrl-settings-modal');
    if (text !== 'normal') await tap(`.nrl-settings-textsize [data-seg="${text}"]`);
    await page.waitForTimeout(250);
    rec.notes.push(`root font ${await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)}`);
    const out = [];
    for (const sel of ['.nrl-live-toggle:not(.nrl-rivals-toggle):not(.nrl-moments-toggle)', '.nrl-rivals-toggle']) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      out.push(...await flowReach(page, [sel]));
    }
    await shot('x3-at-check');
    await openNav(page, 'fixtures').catch(() => {});
    await page.waitForTimeout(250);
    if (await page.locator('.nrl-screen-region input[type="checkbox"]').count()) out.push('a checkbox is still in Fixtures');
    await club();
    return out;
  });
  await step('h1-next-match', async (rec) => {
    await clearToasts();
    const sub = (await page.locator('[data-hud="next"]').textContent()) ?? '';
    rec.notes.push(`"${sub}"`);
    const out = /^v .+ · (home|away)$/.test(sub) ? [] : [`PLAY WEEK's line reads "${sub}"`];
    out.push(...await page.evaluate(() => {
      const s = document.querySelector('[data-hud="next"]');
      return s && s.scrollWidth > s.clientWidth + 1 ? ['the next-match line is cut off'] : [];
    }));
    await page.evaluate(() => window.__nrlShowCard('fanDay'));
    await page.waitForSelector('[data-hud="decisions"]');
    const badge = await page.locator('[data-hud="decisions"]').textContent();
    if (badge !== '1') out.push(`the decisions badge reads "${badge}"`);
    out.push(...await flowReach(page, ['[data-hud="advance"]', '.nrl-hud-menu-toggle']));
    await shot('h1-at-check');
    return out;
  });
  // The ▾ over a decision card: the menu rises above the card, so a pick never lands on a choice.
  await step('menu-over-card', async () => {
    await tap('[data-decisions-chip] .nrl-decisions-review');
    await page.waitForSelector('[data-decisions] [data-event-choice]');
    await tap('.nrl-hud-menu-toggle');
    await page.waitForTimeout(200);
    const out = await flowReach(page, ['.nrl-hud-menu-item:nth-child(1)', '.nrl-hud-menu-item:nth-child(2)', '.nrl-hud-menu-item:nth-child(3)']);
    await shot('menu-at-check');
    await page.keyboard.press('Escape');
    return out;
  });
  // H3 with the card still waiting: the ask stands in for the confirm and says how long the run is.
  await step('h3-ask-says-length', async (rec) => {
    await club();
    const w0 = await week();
    await menuPick('To season end');
    await page.waitForSelector('[data-advance-ask]');
    const q = (await page.locator('[data-ask-question]').textContent().catch(() => '')) ?? '';
    rec.notes.push(`"${q}"`);
    const out = /^Play \d+ weeks\? It stops for decisions\.$/.test(q) ? [] : [`the ask says "${q}", not how long the run is`];
    out.push(...await flowReach(page, ['[data-ask-answer]', '[data-ask-proceed]']));
    await shot('h3-ask-at-check');
    await tap('.nrl-decisions-modal .nrl-screen-x');
    if ((await week()) !== w0) out.push('closing the ask played weeks');
    // Answer it, so the next pick confirms on its own.
    await tap('[data-decisions-chip] .nrl-decisions-review');
    await answerAll();
    return out;
  });
  await step('h3-confirm', async (rec) => {
    await club();
    await clearToasts();
    const w0 = await week();
    await menuPick('To season end');
    await page.waitForSelector('[data-advance-confirm]');
    await toast('Geelong Gulls sign 61-rated lock Lachie Brimson.');
    await page.waitForTimeout(400);
    const q = (await page.locator('[data-advance-confirm] h2').textContent()) ?? '';
    rec.notes.push(`"${q}"`);
    const out = /^Play \d+ weeks\? It stops for decisions\.$/.test(q) ? [] : [`the confirm reads "${q}"`];
    out.push(...await flowReach(page, ['[data-confirm-advance]', '[data-advance-confirm] .nrl-btn:not([data-confirm-advance])']));
    out.push(...await flowReach(page, ['.nrl-decisions-modal .nrl-screen-x'], false));
    await shot('h3-confirm-at-check');
    await tap('[data-advance-confirm] .nrl-btn:not([data-confirm-advance])');
    await page.waitForTimeout(400);
    if ((await week()) !== w0) out.push('Cancel played weeks');
    if (await page.locator('[data-advance-confirm]').count()) out.push('the confirm is still up after Cancel');
    await clearToasts();
    return out;
  });
  await step('f1-staff-board', async () => {
    await openNav(page, 'staff');
    await page.waitForSelector('.nrl-board');
    await page.waitForTimeout(400); // the sheet slides in
    const out = [];
    if (!(await page.locator('.nrl-board-obj, .nrl-board-empty').count())) out.push('no board objectives on Staff & Board');
    if (!(await page.locator('.nrl-staff-row').count())) out.push('no staff rows on Staff & Board');
    out.push(...await flowReach(page, ['.nrl-staff-row .nrl-btn']));
    await shot('f1-at-check');
    await club();
    return out;
  });
  // N4: ×4 (which never asks) until a run stops on a new card. A card drawn in a week that
  // also stopped for something else waits; the next run asks, and is answered from the ask.
  await step('n4-card-in-place', async (rec) => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      await club();
      await clearToasts();
      const from = await week();
      if (from > 23) break;
      await menuPick('×4 weeks');
      await page.waitForTimeout(200);
      if (await page.locator('[data-advance-confirm]').count()) {
        out.push('×4 weeks asked to confirm');
        await tap('[data-confirm-advance]');
      }
      if (await page.locator('[data-advance-ask]').count()) {
        await tap('[data-ask-answer]');
        await answerAll();
        await tap('[data-keep-advancing]');
      }
      await idle();
      await page.waitForTimeout(400);
      if (!(await page.locator('[data-decisions] .nrl-event-card').count())) continue;
      if (await page.locator('[data-week-summary]').count()) out.push('the weekly summary is up with the card');
      const at = await week();
      const left = 4 - (at - from);
      rec.notes.push(`W${from} → stopped at W${at} on "${await page.locator('[data-decisions] .nrl-event-title').first().textContent()}"`);
      // The card scrolls inside its frame (#336): at 568×320 Larger a long card's choices start
      // below the fold, so scroll to the first as a player would, then it must be whole.
      await page.locator('[data-decisions] [data-event-choice]').first().scrollIntoViewIfNeeded();
      out.push(...await flowReach(page, ['[data-decisions] [data-event-choice]']));
      await shot('n4-card');
      await answerAll();
      await page.waitForSelector('[data-keep-advancing]');
      await toast('Signed Jack Taufa from the player pool, on a two-year deal');
      await page.waitForTimeout(400);
      const label = await page.locator('[data-keep-advancing]').textContent();
      await page.locator('[data-keep-advancing]').scrollIntoViewIfNeeded();
      const want = `Keep advancing (${left === 1 ? '1 week' : `${left} weeks`})`;
      if (label !== want) out.push(`Keep advancing reads "${label}", want "${want}"`);
      out.push(...await flowReach(page, ['[data-keep-advancing]']));
      await shot('n4-keep-advancing');
      const stopsBefore = await page.evaluate(() => [...document.querySelectorAll('.nrl-toast-text')].map((t) => t.textContent));
      await tap('[data-keep-advancing]');
      await page.waitForTimeout(200);
      if (await page.locator('[data-advance-confirm], [data-advance-ask]').count()) out.push('Keep advancing asked again');
      await idle();
      await page.waitForTimeout(400);
      const end = await week();
      // The run's own stop toast, not the one from the stop before it.
      const stopped = await page.evaluate((seen) => [...document.querySelectorAll('.nrl-toast-text')].map((t) => t.textContent).find((t) => t.startsWith('Stopped after') && !seen.includes(t)) ?? '', stopsBefore);
      rec.notes.push(`Keep advancing → W${end}${stopped ? ` (${stopped})` : ''}`);
      // Another stop (a card, an injury, a contract) ends it early by design; otherwise it reaches the same end.
      if (end !== from + 4 && !stopped && !(await page.locator('[data-decisions] .nrl-event-card').count())) out.push(`Keep advancing ended at W${end}, want W${from + 4}`);
      return out;
    }
    return [...out, 'no ×4 run stopped on a new card'];
  });
  await step('f3-contracts-hold', async () => {
    await club();
    await clearToasts();
    await openNav(page, 'contracts');
    await page.waitForSelector('[data-contract-renew]');
    await page.waitForTimeout(400); // the sheet slides in
    const rows = () => page.evaluate(() => [...document.querySelectorAll('.nrl-contracts-table tbody tr')].map((r) => {
      const b = r.querySelector('[data-contract-renew]')?.getBoundingClientRect();
      return { id: r.getAttribute('data-contract') ?? r.getAttribute('data-contract-gone'), top: Math.round(r.getBoundingClientRect().top), btn: b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null };
    }));
    const before = await rows();
    const first = before.find((r) => r.btn);
    if (!first) return ['no Renew on Contracts'];
    // The table fits the sheet at this text size: SELL whole, no sideways scroll (#350, #371).
    const out = await flowReach(page, [`[data-contract-renew="${first.id}"]`, '.nrl-contracts-table tbody tr:first-child .nrl-contract-actions .nrl-btn:last-child']);
    const wide = await page.evaluate(() => { const e = document.querySelector('.nrl-contracts-scroll'); return e.scrollWidth - e.clientWidth; });
    if (wide > 1) out.push(`the table is ${wide}px wider than the sheet`);
    const renewed = () => page.locator('[data-contract-renew]:disabled').count();
    await page.touchscreen.tap(first.btn.x, first.btn.y);
    await page.waitForTimeout(300);
    if ((await renewed()) !== 1) return [...out, `${await renewed()} rows read Renewed after one tap (money short?)`];
    const label = (await page.locator(`[data-contract-renew="${first.id}"]`).textContent()).trim();
    if (!/^RENEWED ✓$/i.test(label)) out.push(`the renewed row reads "${label}"`);
    const after = await rows();
    await shot('f3-at-check');
    if (after.map((r) => r.id).join() !== before.map((r) => r.id).join()) out.push('the rows changed order');
    const moved = after.findIndex((r, i) => Math.abs(r.top - before[i].top) > 1);
    if (moved >= 0) out.push(`row ${moved + 1} moved from ${before[moved].top} to ${after[moved].top}`);
    // The same spot again (a double tap): nobody else is renewed.
    await page.touchscreen.tap(first.btn.x, first.btn.y);
    await page.waitForTimeout(300);
    if ((await renewed()) !== 1) out.push('a second tap on the same spot renewed another player');
    // The header: ◂ FINANCE whole, and clear of CONTRACTS.
    out.push(...await page.evaluate(() => {
      const back = document.querySelector('.nrl-contracts .nrl-back');
      const title = document.querySelector('.nrl-contracts .nrl-screen-title');
      if (!back || !title) return ['no ◂ FINANCE or title on Contracts'];
      const out = [];
      if (back.scrollWidth > back.clientWidth + 1) out.push(`◂ FINANCE's label is ${back.scrollWidth - back.clientWidth}px wider than its button`);
      if (back.getBoundingClientRect().right > title.getBoundingClientRect().left + 1) out.push('◂ FINANCE runs into the title');
      return out;
    }));
    // SELL armed on the next row: "Really sell?" whole, and still no sideways scroll.
    const next = after.find((r) => r.btn && r.id !== first.id);
    if (next) {
      const sell = `[data-contract="${next.id}"] .nrl-contract-actions .nrl-btn:last-child`;
      await tap(sell);
      await page.waitForTimeout(200);
      if (!(await page.locator('.nrl-contract-armed').count())) out.push('SELL did not arm');
      out.push(...await flowReach(page, ['.nrl-contract-armed']));
      const armedWide = await page.evaluate(() => { const e = document.querySelector('.nrl-contracts-scroll'); return e.scrollWidth - e.clientWidth; });
      if (armedWide > 1) out.push(`with SELL armed the table is ${armedWide}px wider than the sheet`);
      await shot('f3-armed');
    }
    await club();
    return out;
  });
  await step('t2-overwrite-confirm', async (rec) => {
    await page.waitForTimeout(1500); // the autosave
    await page.reload();
    await page.waitForSelector('[data-nrl-new-1]');
    await tap('[data-nrl-new-1]');
    await tap('[data-nrl-start]');
    await page.waitForSelector('[data-nrl-confirm]');
    const ask = (await page.locator('[data-nrl-confirm]').textContent()) ?? '';
    rec.notes.push(`"${ask}"`, `root font ${await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)}`);
    const out = /^Start over\? This replaces Flow FC \(S\d+ W\d+\)\.$/.test(ask) ? [] : [`the confirm reads "${ask}"`];
    out.push(...await flowReach(page, ['[data-nrl-start-confirm]', '[data-nrl-start-cancel]']));
    await shot('t2-at-check');
    await tap('[data-nrl-start-cancel]');
    if (!(await page.locator('[data-nrl-start]').count())) out.push('Cancel did not bring Start back');
    await tap('[data-nrl-back]');
    await page.waitForSelector('[data-nrl-continue-1]');
    if (!/Flow FC/.test(await page.locator('[data-nrl-slot-label-1]').textContent())) out.push('the career is gone after Cancel');
    return out;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
