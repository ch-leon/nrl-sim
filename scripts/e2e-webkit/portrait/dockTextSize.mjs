import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems, SHEET_EXIT, NO_INSETS } from '../common.mjs';

// ── The dock at every text size (#344) ──────────────────────────────────────
/**
 * The sizes the dock phase runs at: #344's three (844×390 with an iPhone 14's insets, 667×375,
 * 956×330); an iPhone SE on its side (568×320, where Settings scrolls to Coach calls); and two
 * narrow upright windows with a mouse (375×667, 320×568: a desktop window, which keeps the
 * stacked two-row dock; a phone held upright gets the portrait bar, runPortraitMenus), where the
 * dock stacks into two rows.
 */
const DOCK_RUNS = [
  { w: 844, h: 390, safe: { l: 47, t: 0, r: 47, b: 21 } },
  { w: 667, h: 375, safe: NO_INSETS },
  { w: 956, h: 330, safe: NO_INSETS },
  { w: 568, h: 320, safe: NO_INSETS, settingsScroll: true },
  { w: 375, h: 667, safe: NO_INSETS, mouse: true },
  { w: 320, h: 568, safe: NO_INSETS, mouse: true },
];
/** What the phase opens at each text size: home, each tab's sheet, Office's sheet up, a screen from a tile. */
const DOCK_STATES = [
  { name: 'home', open: null, marked: 'club' },
  { name: 'squad', open: 'squad', marked: 'squad' },
  { name: 'league', open: 'fixtures', marked: 'fixtures' },
  { name: 'build', open: 'build', marked: 'build' },
  { name: 'office-up', open: 'office', marked: 'office' },
  { name: 'staff-tile', open: 'staff', marked: 'office' },
];

/**
 * What the dock gets wrong (#344): the five tabs and PLAY WEEK not on one row (or, stacked in a
 * narrow window, the tabs not on one row under PLAY WEEK), anything overlapping, off screen or
 * in the unsafe bands, a label clipped or under 12px (`cut`: ellipsized allowed, and noted), a
 * tab under 44×44, PLAY WEEK under 44px or its label not whole, the open tab (`marked`) without
 * its fill and its 3px bar, or a bar that doesn't read in greyscale (3:1 against the fill,
 * WCAG 1.4.11). Runs in the page.
 */
function dockProblems(page, marked, safe, cut = false) {
  return page.evaluate(([marked, safe, cut]) => {
    const W = innerWidth, H = innerHeight;
    const out = [];
    const notes = [];
    const tabs = [...document.querySelectorAll('.nrl-nav > .nrl-btn')];
    const play = document.querySelector('.nrl-dock-play-group');
    if (tabs.length !== 5) out.push(`${tabs.length} tabs (want 5)`);
    if (!play) return { problems: [...out, 'no PLAY WEEK'], note: '' };
    const name = (b) => b.getAttribute('data-label') ?? b.textContent.trim();
    const dockEl = document.querySelector('.nrl-dock');
    const stacked = getComputedStyle(dockEl).flexWrap === 'wrap';
    const items = [...tabs.map((b) => [name(b), b]), ['PLAY WEEK', play]].map(([n, e]) => [n, e.getBoundingClientRect()]);
    const mid = (r) => (r.top + r.bottom) / 2;
    const tabMids = items.slice(0, -1).map(([, r]) => mid(r));
    const pr = items[items.length - 1][1];
    if (Math.max(...tabMids) - Math.min(...tabMids) > 4) out.push('the tabs are not on one row');
    if (!stacked && Math.abs(mid(pr) - tabMids[0]) > 4) out.push('the tabs and PLAY WEEK are not on one row');
    if (stacked && Math.abs(mid(pr) - tabMids[0]) < 4 && pr.left < items[tabs.length - 1][1].right) out.push('PLAY WEEK and the tabs share a row in the wrong order');
    // Nothing overlaps, nothing leaves the screen or the safe area, and the dock doesn't spill.
    for (let i = 0; i < items.length; i++) {
      const [n, r] = items[i];
      if (r.left < safe.l - 0.5 || r.right > W - safe.r + 0.5 || r.bottom > H - safe.b + 0.5) out.push(`${n} is off screen or in the unsafe band (${Math.round(r.left)}–${Math.round(r.right)} of ${W})`);
      for (let j = i + 1; j < items.length; j++) {
        const [m, q] = items[j];
        if (r.left < q.right - 0.5 && q.left < r.right - 0.5 && r.top < q.bottom - 0.5 && q.top < r.bottom - 0.5) out.push(`${n} overlaps ${m}`);
      }
    }
    if (dockEl.scrollWidth > dockEl.clientWidth + 0.5) out.push(`the dock spills (${dockEl.scrollWidth} in ${dockEl.clientWidth}px)`);
    const cuts = [];
    for (const b of tabs) {
      const r = b.getBoundingClientRect();
      const label = b.querySelector('.nrl-nav-label');
      // To the hundredth: WebKit measures 44px as 43.99999 at a fractional x.
      if (Math.round(r.width * 100) < 4400 || Math.round(r.height * 100) < 4400) out.push(`${name(b)} is ${r.width.toFixed(1)}×${r.height.toFixed(1)}px`);
      if (b.scrollWidth > b.clientWidth + 0.5) out.push(`${name(b)} clipped (${b.scrollWidth} in ${b.clientWidth}px)`);
      const lr = label.getBoundingClientRect();
      if (lr.left < r.left - 0.5 || lr.right > r.right + 0.5) out.push(`${name(b)}'s label runs out of its tab`);
      if (label.scrollWidth > label.clientWidth + 0.5) cuts.push(name(b));
      const dot = b.querySelector('.nrl-nav-dot')?.getBoundingClientRect();
      if (dot && (dot.left < r.left - 0.5 || dot.right > r.right + 0.5 || dot.width < 7.5)) out.push(`${name(b)}'s dot clipped`);
      const px = parseFloat(getComputedStyle(label).fontSize);
      if (px < 12) out.push(`${name(b)} ${px.toFixed(1)}px`);
    }
    if (cuts.length && !cut) out.push(`labels ellipsized: ${cuts.join(', ')}`);
    if (cuts.length && cut) notes.push(`ellipsized: ${cuts.join(', ')}`);
    // PLAY WEEK: at least 44 wide, its label whole and clear of ▾ (or STOP while a run of weeks goes).
    const advBtn = document.querySelector('.nrl-dock-advance');
    const adv = document.querySelector('.nrl-dock-advance-label');
    const ab = advBtn.getBoundingClientRect();
    if (Math.round(ab.width * 100) < 4400 || Math.round(ab.height * 100) < 4400) out.push(`PLAY WEEK is ${ab.width.toFixed(1)}×${ab.height.toFixed(1)}px`);
    if (adv.getBoundingClientRect().right > ab.right + 0.5) out.push('the PLAY WEEK label runs out of its button');
    const next = [...play.querySelectorAll(':scope > .nrl-btn')].find((b) => b !== advBtn && b.getBoundingClientRect().width > 0);
    const over = next ? adv.getBoundingClientRect().right - next.getBoundingClientRect().left : 0;
    if (over > 0.5) out.push(`the PLAY WEEK label runs ${Math.round(over)}px under ${next.textContent.trim()}`);
    // The marker: aria-current (or, for OFFICE with its sheet up, aria-expanded), the fill and the bar.
    const lit = tabs.filter((b) => b.getAttribute('aria-current') === 'page' || b.getAttribute('aria-expanded') === 'true');
    const want = tabs.find((b) => b.getAttribute('data-screen') === marked);
    let contrast = 0;
    if (lit.length !== 1 || lit[0] !== want) out.push(`marked: ${lit.map(name).join(', ') || 'nothing'} (want ${marked})`);
    else {
      const b = want, label = b.querySelector('.nrl-nav-label');
      const bar = getComputedStyle(label, '::after');
      const fill = getComputedStyle(b).backgroundColor;
      if (bar.content === 'none' || bar.height !== '3px') out.push(`${name(b)} has no 3px bar (${bar.content} ${bar.height})`);
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(fill)) out.push(`${name(b)} has no fill`);
      // The bar is in the label's bottom padding: the label's box ends inside the tab.
      if (label.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom + 0.5) out.push(`${name(b)}'s bar sits below the tab`);
      // Greyscale: the bar's luminance against the fill's.
      const lum = (c) => {
        const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      };
      const [a, z] = [lum(bar.backgroundColor), lum(fill)].sort((x, y) => y - x);
      contrast = (a + 0.05) / (z + 0.05);
      if (contrast < 3) out.push(`${name(b)}'s bar is ${contrast.toFixed(1)}:1 on its fill in greyscale (want 3)`);
    }
    const px = parseFloat(getComputedStyle(tabs[0].querySelector('.nrl-nav-label')).fontSize);
    const room = stacked ? `two rows, dock ${Math.round(dockEl.getBoundingClientRect().height)}px` : `${Math.round(pr.left - items[tabs.length - 1][1].right)}px to PLAY WEEK`;
    return { problems: out, note: [`labels ${px.toFixed(1)}px`, room, `PLAY WEEK ${Math.round(ab.width)}px`, ...(contrast ? [`bar ${contrast.toFixed(1)}:1`] : []), ...notes].join(', ') };
  }, [marked, safe, cut]);
}

/**
 * The dock at Normal, Large and Larger (#344, after #371's text size) at each of DOCK_RUNS'
 * sizes. A contract ending (Squad's dot) and the welcome news (OFFICE's count) are
 * real alerts. At each size, set from Settings as a player would: CLUB, each tab's sheet,
 * Office's sheet up and Staff & Board from its tile, each checked by dockProblems, and
 * each tab's spoken name (the accessibility tree): its name and its alert, never "current" (the
 * marked tab says that with aria-current="page").
 * Then a stress at Larger: RESUME MATCH, a decisions count and a long opponent, which must
 * cost PLAY WEEK's sub-line, not a tab. Staff & Board and Coach calls: two taps from Office.
 * A greyscale screenshot of the open tab at each size is kept as greyscale-<size>.png.
 */
export async function runDockTextSize(browser) {
  let failed = 0;
  for (const { w: W, h: H, safe, settingsScroll = false, mouse = false } of DOCK_RUNS) {
    const tag = `${W}x${H}${safe.l || safe.r || safe.b || safe.t ? '-safe' : ''}`;
    const OUT = join(OUT_ROOT, 'webkit', `dock-${tag}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const report = { size: tag, safe, steps: [], errors: [] };
    const ctx = await browser.newContext({
      viewport: { width: W, height: H }, deviceScaleFactor: 2,
      ...(mouse ? {} : { hasTouch: true, isMobile: true, userAgent: IPHONE_UA }),
    });
    await ctx.addInitScript(closeWeekSummary);
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
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
      log(`${rec.ok ? 'ok ' : 'FAIL'} dock ${tag} ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
    };
    // A finger, or a mouse in the narrow desktop windows.
    const press = (sel) => (typeof sel === 'string' ? page.locator(sel).first() : sel)[mouse ? 'click' : 'tap']();
    const home = async () => {
      await page.keyboard.press('Escape');
      if (await page.locator('.nrl-nav-sheet:not([hidden])').count()) await press('.nrl-nav [data-nav-more]');
      await press(SHEET_EXIT);
      await page.waitForTimeout(200);
    };
    const tabNames = () => page.locator('.nrl-nav').ariaSnapshot();

    await step('setup', async (rec) => {
      await page.goto(BASE);
      await page.waitForSelector('[data-nrl-start]');
    await page.locator('[data-nrl-open-all]').check();
      await page.evaluate((s) => {
        const st = document.documentElement.style;
        for (const k of ['l', 't', 'r', 'b']) st.setProperty(`--nrl-safe-${k}`, `${s[k]}px`);
      }, safe);
      await page.fill('[data-nrl-clubname]', 'Dock FC');
      await press('[data-nrl-start]');
      await page.locator('[data-expansion-work]').tap();
      await page.waitForSelector('.nrl-tutorial-skip');
      await press('.nrl-tutorial-skip');
      await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
      // A contract inside 4 weeks: Squad's dot (#369) shows on the next state change (the text size, below).
      const who = await page.evaluate(() => {
        const p = window.__nrlState().squad.find((x) => !x.junior && !x.departed);
        p.contractWeeks = 2;
        return p.name;
      });
      rec.notes.push(`${who}'s contract ends in 2 weeks`);
      return [];
    });

    for (const size of ['normal', 'large', 'larger']) {
      await step(`${size}-set`, async (rec) => {
        await home();
        await press('.nrl-nav [data-nav-more]');
        await press('.nrl-nav-sheet [data-screen="settings"]');
        await page.waitForSelector('.nrl-settings-modal');
        // Pick it the way a player would: the segment, then ✕. Normal is already picked: Large first, so the
        // state changes (that change is what shows Squad's dot).
        const seg = page.locator(`.nrl-settings-textsize [data-seg="${size}"]`);
        if ((await seg.getAttribute('aria-pressed')) === 'true') await press('.nrl-settings-textsize [data-seg="large"]');
        await press(seg);
        await page.waitForTimeout(250);
        // Coach calls (#350 X3) on screen and tappable with Settings open: two taps from Office's tab.
        // At Normal that must hold; at Large and Larger, and at 568×320 (its Settings is taller than the
        // screen), the popup may scroll to it, which is noted.
        const reach = await reachProblems(page, '.nrl-settings-modal', ['.nrl-switch[aria-label="Coach calls"]']);
        const out = size === 'normal' && !settingsScroll ? reach : [];
        rec.notes.push(reach.length ? `Coach calls: ${reach.join('; ')}` : 'Coach calls on screen, two taps from OFFICE');
        await page.screenshot({ path: join(OUT, `settings-${size}.png`) }).catch(() => {});
        await press('.nrl-settings-modal .nrl-screen-x');
        await page.waitForTimeout(250);
        const attr = await page.evaluate(() => document.documentElement.getAttribute('data-text-size'));
        if ((attr ?? 'normal') !== size) out.push(`<html data-text-size> is ${attr}`);
        if (!(await page.locator('.nrl-nav [data-screen="squad"] .nrl-nav-dot').count())) out.push("Squad's dot not showing");
        rec.notes.push(`text size ${size}`);
        return out;
      });
      for (const st of DOCK_STATES) {
        await step(`${size}-${st.name}`, async (rec) => {
          await home();
          if (st.open === 'office') await press('.nrl-nav [data-nav-more]');
          else if (st.open === 'staff') {
            // Staff & Board (#359): two taps, OFFICE then its tile.
            await press('.nrl-nav [data-nav-more]');
            await press('.nrl-nav-sheet [data-screen="staff"]');
            await page.waitForSelector('.nrl-screen-region[data-screen-key="staff"]');
          } else if (st.open) await press(`.nrl-nav > .nrl-btn[data-screen="${st.open}"]`);
          await page.waitForTimeout(300);
          const d = await dockProblems(page, st.marked, safe);
          const out = [...d.problems];
          rec.notes.push(d.note);
          // Spoken names (the accessibility tree): each tab's name, and the alerts; aria-current marks the open one.
          const tree = await tabNames();
          const label = { club: 'Club', squad: 'Squad', fixtures: 'League', build: 'Build', office: 'Office' }[st.marked];
          // The snapshot is `- button "<name>": <its text>`; only the quoted names are what a screen reader says.
          const names = [...tree.matchAll(/button "([^"]*)"/g)].map((m) => m[1]);
          const lit = page.locator('.nrl-nav > .nrl-btn[aria-current="page"]');
          if (st.open !== 'office' && !((await lit.getAttribute('aria-label')) ?? '').startsWith(label)) out.push(`the open tab reads "${await lit.getAttribute('aria-label')}", not ${label}`);
          if (names.some((x) => /current/i.test(x))) out.push(`a name says "current": ${names.join(' | ')}`);
          if (st.open === 'office' && !/"Office[^"]*" \[expanded\]/.test(tree)) out.push('OFFICE not expanded with its sheet up');
          if (!names.some((x) => /^Squad\b.*contracts? ends? within 4 weeks$/.test(x))) out.push("Squad's spoken name doesn't carry its dot");
          if (names.some((x) => /▴|[A-Z]{4}/.test(x))) out.push(`a tab reads out its caps or ▴: ${names.join(' | ')}`);
          if (st.open === 'staff' && (await page.locator('.nrl-nav-sheet [data-screen="staff"]').getAttribute('aria-current')) !== 'page') out.push("Staff & Board's tile isn't marked");
          return out;
        });
        if (st.name === 'squad') {
          await page.evaluate(() => { document.documentElement.style.filter = 'grayscale(1)'; });
          await page.screenshot({ path: join(OUT, `greyscale-${size}.png`) }).catch(() => {});
          await page.evaluate(() => { document.documentElement.style.filter = ''; });
        }
      }
    }
    // The longest PLAY WEEKs there are, beside the widest tab (OFFICE ▴ with its count): a parked match
    // with decisions waiting and a long opponent, and a run of weeks with STOP. The sub-line gives way
    // first, then (RESUME MATCH at Larger, 16px short at 667) tab labels ellipsize, noted: nothing
    // overlaps or leaves the screen, every tab stays 44px, PLAY WEEK's label stays whole.
    // Drawn the way hud.ts draws them; the next state change puts the real one back.
    for (const [name, label, sub, stop] of [
      ['larger-resume', 'RESUME MATCH ▸<span class="nrl-hud-alert">3</span>', 'v Wentworthville Wanderers · away', false],
      ['larger-advancing', 'WEEK 27 OF 27…', '', true],
    ]) {
      await step(name, async (rec) => {
        await home();
        await press('.nrl-nav [data-nav-more]');
        await page.evaluate(([label, sub, stop]) => {
          document.querySelector('.nrl-dock-advance-label').innerHTML = label;
          const s = document.querySelector('.nrl-dock-advance-sub');
          s.textContent = sub;
          s.hidden = stop;
          document.querySelector('.nrl-hud-menu-toggle').hidden = stop;
          document.querySelector('.nrl-hud-stop').hidden = !stop;
        }, [label, sub, stop]);
        await page.waitForTimeout(300);
        const d = await dockProblems(page, 'office', safe, true);
        rec.notes.push(d.note);
        return d.problems;
      });
    }

    for (const e of report.errors) log(`  error: ${e}`);
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    await ctx.close();
    failed += report.steps.filter((s) => !s.ok).length + report.errors.length;
  }
  return failed;
}
