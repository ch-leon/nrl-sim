import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, reachProblems } from '../common.mjs';

// #315: the page opened upright, not turned upright after boot. 390×844 is the
// portrait pair of the 844×390 phone. Clicks go through element.click(): the
// rotate card covers the title and the HUD, so a Playwright tap never lands.
export async function runPortrait(browser) {
  const OUT = join(OUT_ROOT, 'webkit', '390x844-boot');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const report = { size: '390x844-boot', steps: [], errors: [] };
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: IPHONE_UA,
  });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
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
    log(`${rec.ok ? 'ok ' : 'FAIL'} 390x844 ${rec.file}${rec.notes.length ? ` — ${rec.notes.join('; ')}` : ''}`);
  };
  const press = (sel) => page.locator(sel).first().evaluate((el) => el.click());
  const state = () => page.evaluate(() => {
    const g = window.__nrlGame;
    const card = document.querySelector('.nrl-rotate');
    const canvas = document.querySelector('#game-root canvas');
    const box = canvas?.getBoundingClientRect();
    return {
      coarse: matchMedia('(pointer: coarse)').matches,
      portrait: matchMedia('(orientation: portrait)').matches,
      card: !!card && getComputedStyle(card).display !== 'none',
      started: !!g?.loop.started,
      running: g ? g.loop.running : null,
      // In CSS px: the canvas renders at the screen's density, scale.zoom is 1 / it (#627).
      game: g ? `${Math.round(g.scale.gameSize.width * g.scale.zoom)}x${Math.round(g.scale.gameSize.height * g.scale.zoom)}` : '',
      canvas: box ? `${Math.round(box.width)}x${Math.round(box.height)}` : '',
      viewport: `${innerWidth}x${innerHeight}`,
      clock: document.querySelector('.nrl-mo-clock')?.textContent?.trim() ?? '',
      // PLAY WEEK's words, less the decisions count beside them.
      advance: (() => {
        const l = document.querySelector('.nrl-dock-advance-label')?.cloneNode(true);
        l?.querySelector('.nrl-hud-alert')?.remove();
        return l?.textContent?.trim() ?? '';
      })(),
      controls: document.querySelectorAll('.nrl-mo-controls').length,
    };
  });
  // `started` stays true once the loop has been started; `running` drops when it sleeps.
  // Waiting only on `running === false` would pass in the gap before Phaser starts it.
  const asleep = (label) => page.waitForFunction(() => {
    const loop = window.__nrlGame?.loop;
    const card = document.querySelector('.nrl-rotate');
    return !!loop?.started && loop.running === false && !!card && getComputedStyle(card).display !== 'none';
  }, null, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: loop not asleep under the rotate card (${JSON.stringify(await state())})`);
  });
  // #350: upright on a menu the loop sleeps with no rotate card: Club home, or a new game's tour,
  // which opens on Build (#370).
  const asleepOnMenu = (label, menu = '[data-club-home]') => page.waitForFunction((menu) => {
    const loop = window.__nrlGame?.loop;
    const card = document.querySelector('.nrl-rotate');
    return !!loop?.started && loop.running === false && !!document.querySelector(menu)
      && !!card && getComputedStyle(card).display === 'none';
  }, menu, { timeout: 15000 }).catch(async () => {
    throw new Error(`${label}: not on ${menu} with the loop asleep and no rotate card (${JSON.stringify(await state())})`);
  });
  const awake = (label) => page.waitForFunction(() => {
    const g = window.__nrlGame;
    if (!g?.loop.running) return false;
    const card = document.querySelector('.nrl-rotate');
    if (card && getComputedStyle(card).display !== 'none') return false;
    const canvas = document.querySelector('#game-root canvas')?.getBoundingClientRect();
    if (!canvas) return false;
    const size = `${Math.round(g.scale.gameSize.width * g.scale.zoom)}x${Math.round(g.scale.gameSize.height * g.scale.zoom)}`;
    const fills = size === `${innerWidth}x${innerHeight}`
      && Math.abs(canvas.width - innerWidth) <= 1
      && Math.abs(canvas.height - innerHeight) <= 1;
    return fills;
  }, null, { timeout: 8000 }).catch(async () => {
    throw new Error(`${label}: loop did not resume with the canvas filling the screen (${JSON.stringify(await state())})`);
  });
  const turn = (width, height) => page.setViewportSize({ width, height });
  /** PLAY WEEK's label (uppercase in the DOM) while a match is parked. */
  const RESUME = 'RESUME MATCH ▸';

  await step('portrait-boot', async (rec) => {
    await page.goto(BASE);
    await page.waitForSelector('[data-nrl-start]');
    await press('[data-nrl-start]');
    await page.locator('[data-expansion-work]').tap();
    await page.waitForSelector('.nrl-dock');
    await asleepOnMenu('opened upright', '[data-club-home], [data-screen-key="build"]');
    const o = await state();
    if (!o.coarse) throw new Error('WebKit did not report a coarse pointer, so this is not a phone');
    rec.notes.push(`a menu (the tour's Build), no card, loop asleep, canvas ${o.canvas} in ${o.viewport}`);
  });
  await step('landscape-boot', async (rec) => {
    await turn(844, 390);
    await awake('turned sideways from boot');
    const o = await state();
    rec.notes.push(`loop awake, canvas ${o.canvas}`);
  });
  await step('tutorial-skipped', async () => {
    const skip = page.locator('.nrl-tutorial-skip');
    if (!(await skip.count())) return [];
    await skip.tap();
    await page.waitForSelector('.nrl-tutorial', { state: 'detached' });
    // The tour's first step opened Build (#370); back to the grounds, where the decisions chip shows.
    await page.keyboard.press('Escape');
    await page.waitForSelector('.nrl-screen-region', { state: 'detached', timeout: 5000 }).catch(() => {});
    if (await page.locator('.nrl-screen-region').count()) throw new Error('Build stayed open after the tour was skipped');
  });
  // Inspect the event UI in both orientations. Hide only the rotate prompt:
  // portrait gameplay is still paused, but DOM choices must fit and accept taps.
  await step('bali-choices-fit', async (rec) => {
    await page.addStyleTag({ content: '.nrl-rotate { display: none !important; }' });
    const problems = [];
    for (const [w, h] of [[360, 640], [390, 844], [667, 375], [844, 390]]) {
      for (const choice of [0, 1]) {
        await turn(w, h);
        if (!(await page.evaluate(() => window.__nrlShowCard?.('baliTrip')))) throw new Error('Bali hook failed');
        // 3a: the decisions chip on the grounds; its REVIEW opens the card in its own popup. Upright
        // (#350) home is Club home, whose decisions row opens it. (The card's News row is checked
        // sideways in runScreens' news-decision-banner.)
        const review = w < h ? '.nrl-club-home-alert' : '[data-decisions-chip]:not([hidden]) .nrl-decisions-review';
        await page.waitForSelector(review);
        await page.locator(review).tap();
        await page.waitForSelector('.nrl-decisions-modal .nrl-event-card');
        await page.waitForTimeout(100);
        const found = await reachProblems(page, '.nrl-decisions-modal', ['[data-event-choice="0"]', '[data-event-choice="1"]', '.nrl-decisions-modal .nrl-screen-x']);
        found.push(...await page.evaluate(() => {
          const box = document.querySelector('.nrl-decisions-modal').getBoundingClientRect();
          const out = [...document.querySelectorAll('.nrl-event-choice')].flatMap((b) => {
            const r = b.getBoundingClientRect();
            const out = [];
            if (r.height < 44 || r.width < 44) out.push(`choice ${b.dataset.eventChoice} is ${r.width}×${r.height}`);
            if (r.top < box.top - 1 || r.bottom > box.bottom + 1) out.push(`choice ${b.dataset.eventChoice} clipped by the popup (${r.top.toFixed(1)}–${r.bottom.toFixed(1)} vs ${box.top.toFixed(1)}–${box.bottom.toFixed(1)})`);
            if (b.scrollHeight > b.clientHeight + 1) out.push(`choice ${b.dataset.eventChoice} clips its text`);
            return out;
          });
          // #346: "Let them go" says what is sure and, on its own line, what is risked.
          const go = document.querySelector('[data-event-choice="0"]');
          if (!/^Sure: squad morale \+6/.test(go?.querySelector('.nrl-event-choice-hint')?.textContent ?? '')) out.push('Let them go has no "Sure:" line');
          if (!/% risk: a 2-3 week ban/.test(go?.querySelector('.nrl-event-choice-risk')?.textContent ?? '')) out.push('Let them go has no risk line');
          return out;
        }));
        problems.push(...found.map((p) => `${w}×${h}: ${p}`));
        await page.screenshot({ path: join(OUT, `bali-${w}x${h}-choice${choice}.png`) });
        await page.locator(`[data-event-choice="${choice}"]`).tap();
        await page.waitForTimeout(150);
        if (await page.locator('.nrl-event-card').count()) problems.push(`${w}×${h}: choice ${choice} did not resolve`);
        if (await page.evaluate(() => window.__nrlState().eventDeck.pending.length)) problems.push(`${w}×${h}: choice ${choice} left the card pending`);
        // The decisions dialog's ✕ if it is still up.
        if (await page.locator('.nrl-decisions-modal .nrl-screen-x').count()) await page.locator('.nrl-decisions-modal .nrl-screen-x').tap();
      }
      rec.notes.push(`${w}×${h}: both choices tapped`);
    }
    // Restore the real portrait prompt for the remaining orientation checks.
    await page.evaluate(() => {
      for (const style of document.querySelectorAll('style')) {
        if (style.textContent === '.nrl-rotate { display: none !important; }') style.remove();
      }
    });
    await turn(844, 390);
    return problems;
  });
  await step('match-running', async (rec) => {
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
    await page.waitForSelector('.nrl-mo-controls');
    await page.waitForFunction(() => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== '00:00';
    });
    rec.notes.push(`clock ${(await state()).clock}`);
  });
  await step('mid-match-portrait', async (rec) => {
    const before = (await state()).clock;
    await turn(390, 844);
    await asleep('mid-match');
    await page.waitForTimeout(1200);
    const o = await state();
    if (o.running !== false) throw new Error('loop woke itself while the phone was still upright');
    if (o.clock !== before) throw new Error(`clock moved under the card (${before} → ${o.clock})`);
    rec.notes.push(`clock held at ${o.clock}`);
  });
  await step('mid-match-landscape', async (rec) => {
    const before = (await state()).clock;
    await turn(844, 390);
    await awake('mid-match');
    await page.waitForFunction((from) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== from;
    }, before);
    const o = await state();
    rec.notes.push(`clock ${before} → ${o.clock}, canvas ${o.canvas}`);
  });
  await step('parked', async (rec) => {
    // Save & exit is in the pause sheet (#348 M3).
    await page.locator('.nrl-mo-controls [data-pause]').tap();
    await page.locator('.nrl-mo-sheet [data-save-exit]').tap();
    await page.waitForSelector('body:not(.nrl-match-active) .nrl-dock');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`PLAY WEEK reads "${o.advance}", not ${RESUME}`);
    rec.notes.push(`PLAY WEEK reads ${RESUME}`);
  });
  await step('parked-portrait', async (rec) => {
    await turn(390, 844);
    await asleepOnMenu('parked at the club');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push(`Club home, still ${RESUME}, loop asleep`);
  });
  await step('parked-landscape', async (rec) => {
    await turn(844, 390);
    await awake('parked at the club');
    const o = await state();
    if (o.advance !== RESUME) throw new Error(`the parked match was dropped (${o.advance})`);
    rec.notes.push(`still ${RESUME}, canvas ${o.canvas}`);
  });
  // Continue with a live-match record auto-starts the match. Opened upright, the
  // loop is already asleep, so the match may draw under the card (the same as a
  // phone turned upright mid-match) but its clock must not move until landscape.
  await step('reopen-portrait', async (rec) => {
    await turn(390, 844);
    await page.reload();
    await page.waitForSelector('[data-nrl-continue-1]');
    await press('[data-nrl-continue-1]');
    await asleep('reopened upright');
    await page.waitForSelector('.nrl-mo-controls').catch(() => {});
    const held = await state();
    await page.waitForTimeout(1200);
    const o = await state();
    if (o.running !== false || !o.started) throw new Error(`loop did not stay asleep (${JSON.stringify(o)})`);
    if (o.clock !== held.clock) throw new Error(`clock moved under the card (${held.clock} → ${o.clock})`);
    rec.notes.push(`loop asleep, clock held at ${o.clock || 'not shown'}`);
  });
  await step('reopen-landscape', async (rec) => {
    await turn(844, 390);
    await awake('reopened match');
    await page.waitForSelector('.nrl-mo-controls');
    const before = (await state()).clock;
    await page.waitForFunction((from) => {
      const t = document.querySelector('.nrl-mo-clock')?.textContent?.trim();
      return !!t && t !== from;
    }, before);
    const o = await state();
    rec.notes.push(`clock ${before} → ${o.clock}, canvas ${o.canvas}`);
  });
  // The coach calls were a row of chips that wrapped past a fixed offset; since Broadcast
  // Quiet they are a tray over the COACH button (3o) listing the calls legal now. The
  // tray is filled with the most it shows (#396: six, Shift as a pair) and must not
  // scroll, the log given 80 lines, and at each size: the
  // commentary line (log = line, tray shut) clear of the bottom row and the score bug;
  // then the full log (log = full, tray open) clear of the score bug, the bottom row and
  // the tray, scrolling, at least four lines tall (sideways only). The LOG switch keeps its fill under hover.
  await step('chip-clearance', async (rec) => {
    await page.evaluate(() => {
      const sc = window.__nrlGame.scene.getScene('Match');
      // Hold the tray's rows still: the scene rebuilds them with the play a few times a second.
      sc.refreshCallChips = () => {};
      sc.toggleTray(true);
      const list = document.querySelector('.nrl-mo-tray-list');
      const tile = ([id, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nrl-btn nrl-mo-tray-call';
        b.setAttribute('data-call', id);
        const name = document.createElement('b');
        name.textContent = label;
        const what = document.createElement('span');
        what.textContent = 'What the call does, in plain words';
        b.append(name, what);
        return b;
      };
      const pair = document.createElement('div');
      pair.className = 'nrl-mo-tray-pair';
      pair.append(tile(['shiftLeft', 'Shift left']), tile(['shiftRight', 'Shift right']));
      list.replaceChildren(tile(['hitUp', 'Hit-up']), pair, tile(['offload', 'Offload']), tile(['kickEarly', 'Kick early']), tile(['freshLegs', 'Fresh legs']));
      document.querySelector('.nrl-mo-tray-foot').textContent = 'Run it, Bomb, Grubber, 40/20 from tackle 4 · Field goal when in range · Take the two, Tap and go at Coach’s Office level 2, more above';
      sc.toggleTray(false);
      const feed = document.querySelector('.nrl-mo-feed');
      for (let i = 0; i < 80; i++) {
        const line = document.createElement('div');
        line.className = 'nrl-mo-line';
        line.textContent = `Layout regression commentary line ${i}`;
        feed.append(line);
      }
    });
    /** Problems with the commentary in `mode` ('line' or 'full'), measured in the page. */
    const measure = (mode) => page.evaluate((mode) => {
      const overlay = document.querySelector('.nrl-match-overlay');
      const box = (sel) => { const e = document.querySelector(sel); const r = e?.getBoundingClientRect(); return r && r.width > 0 && r.height > 0 ? r : null; };
      const meets = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const hits = [];
      if (overlay?.dataset.log !== mode) return { pending: true, problems: [`log is ${overlay?.dataset.log}, want ${mode}`] };
      const what = box(mode === 'full' ? '.nrl-mo-full' : '.nrl-mo-strip');
      if (!what) return { pending: true, problems: [`the ${mode === 'full' ? 'full log' : 'commentary line'} is not laid out`] };
      if (what.left < 0 || what.top < 0 || what.right > innerWidth || what.bottom > innerHeight) hits.push(`${mode === 'full' ? 'full log' : 'line'} off screen`);
      for (const el of document.querySelectorAll('.nrl-mo-bar .nrl-btn, .nrl-mo-bar [data-coach], .nrl-mo-log-toggle')) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (meets(what, r)) hits.push(el.getAttribute('aria-label') || el.textContent.trim() || 'button');
      }
      const score = box('.nrl-mo-scoreboard');
      if (score && meets(what, score)) hits.push('score bug');
      const log = box('.nrl-mo-log-toggle');
      if (!log || log.width < 44 || log.height < 44) hits.push(`LOG switch ${Math.round(log?.width ?? 0)}×${Math.round(log?.height ?? 0)}`);
      if (mode === 'full') {
        const tray = box('.nrl-mo-calls');
        if (!tray) hits.push('the coach tray is not open');
        else if (meets(what, tray)) hits.push(`the coach tray (${Math.round(tray.right)} > ${Math.round(what.left)})`);
        const feed = document.querySelector('.nrl-mo-feed');
        if (!feed || feed.clientHeight < 12 || feed.scrollHeight <= feed.clientHeight) hits.push(`full log not scrollable (${feed?.clientHeight}px, panel ${what.height.toFixed(1)}px)`);
        else if (feed.clientHeight < 60) hits.push(`full log only ${feed.clientHeight}px tall`);
        const rows = document.querySelectorAll('.nrl-mo-calls [data-call]').length;
        if (rows < 6) hits.push(`only ${rows} calls in the tray`);
        const t = document.querySelector('.nrl-mo-calls');
        if (t.scrollHeight > t.clientHeight + 1) hits.push(`the coach tray scrolls (${t.scrollHeight} > ${t.clientHeight}px)`);
      }
      return { pending: hits.length > 0, problems: hits };
    }, mode);
    const setMode = async (mode) => {
      const sc = () => page.evaluate((open) => window.__nrlGame.scene.getScene('Match').toggleTray(open), mode === 'full');
      if (mode === 'full') {
        if (await page.locator('.nrl-match-overlay[data-log="hidden"]').count()) await page.locator('.nrl-mo-log-toggle').evaluate((el) => el.click());
        if (await page.locator('.nrl-match-overlay[data-log="line"]').count()) await page.locator('.nrl-mo-strip').evaluate((el) => el.click());
      } else if (await page.locator('.nrl-match-overlay[data-log="full"]').count()) await page.locator('.nrl-mo-full-x').evaluate((el) => el.click());
      else if (await page.locator('.nrl-match-overlay[data-log="hidden"]').count()) await page.locator('.nrl-mo-log-toggle').evaluate((el) => el.click());
      await sc();
    };
    const problems = [];
    // The full log is a fixed 330px right panel (3m), drawn for a phone held sideways; upright the
    // rotate card covers the match, so it is checked at the landscape sizes only. Beside the score
    // bug where there is room (956×330), under it where there is not (667×375, 844×390).
    const sizes = { line: [[360, 640], [390, 844], [667, 375], [844, 390]], full: [[667, 375], [844, 390], [956, 330]] };
    for (const mode of ['line', 'full']) {
      await setMode(mode);
      for (const [w, h] of sizes[mode]) {
        await turn(w, h);
        let found = null;
        for (let i = 0; i < 12; i++) {
          await page.waitForTimeout(50);
          found = await measure(mode);
          if (!found.pending) break;
        }
        await page.screenshot({ path: join(OUT, `log-${mode}-${w}x${h}.png`) });
        if (found?.problems?.length) problems.push(`${mode} ${w}×${h}: ${found.problems.join(', ')}`);
        else rec.notes.push(`${mode} ${w}×${h} clear`);
      }
    }
    // The tray at its fullest on the shortest phone (#396): 956×330 lays it three a line and
    // it must not scroll either (the full log is not checked here: its four lines are for 375+).
    for (const [w, h] of [[956, 330]]) {
      await turn(w, h);
      await page.waitForTimeout(300);
      const tray = await page.evaluate(() => {
        const t = document.querySelector('.nrl-mo-calls');
        const r = t?.getBoundingClientRect();
        if (!t || !r || r.height < 1) return ['the coach tray is not open'];
        const out = [];
        if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) out.push('the coach tray is off screen');
        if (t.scrollHeight > t.clientHeight + 1) out.push(`the coach tray scrolls (${t.scrollHeight} > ${t.clientHeight}px)`);
        const rows = [...t.querySelectorAll('[data-call]')];
        if (rows.length < 6) out.push(`only ${rows.length} calls in the tray`);
        for (const b of rows) {
          const q = b.getBoundingClientRect();
          if (q.height < 44) out.push(`call ${b.dataset.call} is ${Math.round(q.height)}px tall`);
          const at = document.elementFromPoint((q.left + q.right) / 2, (q.top + q.bottom) / 2);
          if (!(at && b.contains(at))) out.push(`call ${b.dataset.call} covered by ${at?.className || at?.tagName}`);
        }
        return out;
      });
      await page.screenshot({ path: join(OUT, `tray-full-${w}x${h}.png`) });
      if (tray.length) problems.push(`tray ${w}×${h}: ${tray.join(', ')}`);
      else rec.notes.push(`tray ${w}×${h} clear`);
    }
    await turn(844, 390);
    await setMode('line');
    await page.locator('.nrl-mo-log-toggle').hover();
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.nrl-mo-log-toggle .nrl-mo-switch')).backgroundColor);
    if (bg !== 'rgb(244, 208, 63)') problems.push(`the LOG switch's on fill is ${bg} under hover, want rgb(244, 208, 63)`);
    else rec.notes.push('LOG switch keeps its fill under hover');
    return problems;
  });

  for (const e of report.errors) log(`  error: ${e}`);
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await ctx.close();
  return report.steps.filter((s) => !s.ok).length + report.errors.length;
}
