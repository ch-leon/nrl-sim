import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log } from '../common.mjs';

/** The plays the club takes in: wide launch rules (second-man: any but your 20, tackles 1–4), so one is on most sets. */
const PLAYS = ['second-man', 'block-play', 'cut-out-winger'];
/** Every coach call (CALLS.unlocks, all four levels): a top Coach's Office. */
const ALL_CALLS = ['hit-up', 'hold', 'fresh-legs', 'kickoff-short', 'kickoff-long', 'shift-left', 'shift-right', 'rush', 'offload', 'gang-tackle', 'kick-early', 'run-it', 'grubber', 'take-two', 'tap-go', 'bomb', 'field-goal', 'forty-twenty'];
const SHORT = { 'second-man': 'Second man', 'block-play': 'Block play', 'cut-out-winger': 'Cut-out' };

/**
 * Today's coach tray, as tags and classes (the shape a club with no playbook must
 * keep, #326 risk 4): the head (title, note), the list of call tiles, the footer.
 * Nothing else is in the tray: no Plays section, hidden or not.
 */
const TODAY_TRAY = 'div.nrl-mo-tray.nrl-mo-calls[div.nrl-mo-tray-head[span.nrl-mo-tray-title,span.nrl-mo-tray-note],div.nrl-mo-tray-list,div.nrl-mo-tray-foot]';

/**
 * Set plays on the match screen (#326, phase 3): the coach tray's Plays section at
 * 844×390, 667×375 and 568×320, a new club with and without a playbook.
 *   - No playbook: the tray is today's tray (its tag-and-class shape is TODAY_TRAY,
 *     no tile names a play, the COACH badge never counts plays) — the DOM diff.
 *   - Three plays taken in: with the ball the tray shows a Plays section under the
 *     calls, three 44px tiles on one line with an IQ caption each ("✓ IQ" or
 *     "⚠ Name 49") or the refusal; the section adds at most one line (a small label
 *     and one row of tiles) and the open tray never scrolls, on screen; the badge
 *     counts the plays ("· 1 play"). The same with every call unlocked (a top Coach's
 *     Office): the calls give way to three tiles and the tray still does not scroll.
 *   - The bottom row with the tray shut and the longest badge ("6 calls · 3 plays"):
 *     COACH, LOG and the speed pill do not overlap; on a phone 720 wide or less the
 *     badge stacks, so COACH is no wider than with today's longest badge.
 *   - Defending, the section is hidden.
 *   - A tap on a play: the tray shuts, the badge names the play, the call record has
 *     it, and once it is run (at the next play-the-ball) the tag over COACH says what
 *     came of it, on screen and clear of the commentary line.
 * At ×4 to get through the sets; a minute or two a size.
 */
export async function runMatchPlays(browser, sizes = [[844, 390], [667, 375], [568, 320]]) {
  const started = Date.now();
  const OUT = join(OUT_ROOT, 'webkit', 'match-plays');
  mkdirSync(OUT, { recursive: true });
  let failed = 0;
  for (const [w, h] of sizes) {
    for (const withPlays of [false, true]) {
      const name = `match plays ${w}x${h} ${withPlays ? 'with plays' : 'no playbook'}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
      await ctx.addInitScript(closeWeekSummary);
      const page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const tag = withPlays ? 'plays' : 'none';
      /** The tray's state now: its shape, the plays shown, the sizes. */
      const read = () => page.evaluate(() => {
        const t = document.querySelector('.nrl-mo-calls');
        const shape = (el) => {
          const me = `${el.tagName.toLowerCase()}${[...el.classList].map((c) => `.${c}`).join('')}`;
          // The list's tiles change with the play; the shape is the frame around them.
          if (el.classList.contains('nrl-mo-tray-list') || el.classList.contains('nrl-mo-tray-plays-list')) return me;
          return el.children.length ? `${me}[${[...el.children].map(shape).join(',')}]` : me;
        };
        const sec = t.querySelector('[data-tray-plays]');
        const shown = !!sec && !sec.hidden && getComputedStyle(sec).display !== 'none';
        const tiles = shown ? [...sec.querySelectorAll('[data-play]')] : [];
        const r = t.getBoundingClientRect();
        const list = t.querySelector('.nrl-mo-tray-list').getBoundingClientRect();
        const callTile = t.querySelector('.nrl-mo-tray-list .nrl-mo-tray-call');
        return {
          shape: shape(t),
          title: t.querySelector('.nrl-mo-tray-title')?.textContent ?? '',
          badge: document.querySelector('.nrl-mo-coach-badge')?.textContent ?? '',
          playNamed: !!document.querySelector('.nrl-match-overlay [data-play], .nrl-mo-tray-play'),
          section: !!sec,
          shown,
          sectionH: shown ? sec.getBoundingClientRect().height : 0,
          tileRow: callTile ? callTile.getBoundingClientRect().height : 44,
          tiles: tiles.map((b) => {
            const br = b.getBoundingClientRect();
            const at = document.elementFromPoint((br.left + br.right) / 2, (br.top + br.bottom) / 2);
            return { play: b.dataset.play, name: b.querySelector('b')?.textContent ?? '', caption: b.querySelector('span')?.textContent ?? '', h: br.height, top: Math.round(br.top), on: !b.disabled, hit: !!at && b.contains(at), clipped: b.querySelector('b').scrollWidth > b.querySelector('b').clientWidth + 1 };
          }),
          tray: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, scrolls: t.scrollHeight > t.clientHeight + 1, listBottom: list.bottom },
          vw: innerWidth, vh: innerHeight,
        };
      });
      const settle = () => page.evaluate(() => Promise.all(document.querySelector('.nrl-mo-calls').getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {}))));
      const openTray = async () => {
        if (await page.locator('.nrl-mo-calls[hidden]').count()) await page.locator('.nrl-mo-bar [data-coach]').tap();
        await page.waitForSelector('.nrl-mo-calls:not([hidden])', { timeout: 3000 });
        await settle();
      };
      const shutTray = async () => {
        if (!(await page.locator('.nrl-mo-calls[hidden]').count())) await page.locator('.nrl-mo-bar [data-coach]').tap();
      };
      /**
       * The match holds at ×1 while the tray is open (#639), whatever speed was picked, so a wait made with
       * it open covers a quarter of the match time it did at this check's ×4. The waits below are sized for ×1:
       * a change of possession, or a set reaching a tackle a play can be called on, can take over a minute.
       */
      const TRAY_OPEN_WAIT_MS = 240000;
      /** Wait for the tray's title to read `title` (his side's ball, or theirs) with it open. */
      const waitTitle = (title) => page.waitForFunction((t) => document.querySelector('.nrl-mo-tray-title')?.textContent === t, title, { timeout: TRAY_OPEN_WAIT_MS });
      const problems = [];
      try {
        await page.goto(BASE);
        await page.waitForSelector('[data-nrl-start]');
        await page.locator('[data-nrl-start]').tap();
        await page.locator('[data-expansion-work]').tap();
        const skip = page.locator('.nrl-tutorial-skip');
        if (await skip.count()) await skip.tap();
        if (withPlays) {
          // A club that has bought three plays and taken them in (phase 2's Playbook and Lineup do this by tapping; webkit playbook.mjs checks that).
          await page.evaluate((ids) => { const s = window.__nrlState(); s.playbook.owned = [...ids]; s.lineup.plays = [...ids]; }, PLAYS);
        }
        await page.locator('.nrl-dock [data-hud="advance"]').tap();
        for (let i = 0; i < 2; i++) {
          const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
          if (await ask.count()) await ask.first().tap();
        }
        await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
        await page.locator('.nrl-mo-bar [data-coach]').waitFor({ timeout: 30000 });
        await page.locator('.nrl-mo-controls [data-speed="4"]').tap();
        const atkUnlocked = await page.evaluate(() => [...window.__nrlGame.scene.getScene('Match').unlocked]);
        const sheetPlays = await page.evaluate(() => { const sc = window.__nrlGame.scene.getScene('Match'); return [...sc.playback.playsOf(sc.callSide)]; });
        if (sheetPlays.join(',') !== (withPlays ? PLAYS.join(',') : '')) problems.push(`the match's plays are [${sheetPlays.join(',')}]`);

        // With the ball.
        await openTray();
        await waitTitle('Your ball');
        if (withPlays) await page.waitForFunction(() => document.querySelectorAll('[data-tray-plays]:not([hidden]) [data-play]').length > 0, null, { timeout: 5000 });
        await settle();
        const atk = await read();
        await page.screenshot({ path: join(OUT, `attacking-${tag}-${w}x${h}.png`) });
        const t = atk.tray;
        if (t.left < -1 || t.top < -1 || t.right > atk.vw + 1 || t.bottom > atk.vh + 1) problems.push('the open tray is off screen');
        if (!withPlays) {
          // The DOM diff: a club with no playbook has today's tray, and nothing names a play.
          if (atk.shape !== TODAY_TRAY) problems.push(`the tray is not today's: ${atk.shape}`);
          if (atk.section || atk.playNamed) problems.push('a club with no playbook has a Plays section or a play tile');
          if (/play/.test(atk.badge)) problems.push(`the badge counts plays: "${atk.badge}"`);
        } else {
          // The frame is today's with the Plays section between the calls and the footer.
          const expected = TODAY_TRAY.replace('div.nrl-mo-tray-list,', 'div.nrl-mo-tray-list,div.nrl-mo-tray-plays[span.nrl-mo-tray-plays-label,div.nrl-mo-tray-plays-list],');
          if (atk.shape !== expected) problems.push(`the tray's frame is ${atk.shape}`);
          if (!atk.shown) problems.push('no Plays section with the ball');
          if (atk.tiles.length !== 3) problems.push(`${atk.tiles.length} play tiles, want 3`);
          if (atk.tiles.map((x) => x.play).join(',') !== PLAYS.join(',')) problems.push(`tiles in the order ${atk.tiles.map((x) => x.play).join(',')}`);
          for (const x of atk.tiles) {
            if (x.h < 44 - 0.5) problems.push(`${x.play} is ${x.h.toFixed(1)}px tall`);
            if (x.name !== SHORT[x.play]) problems.push(`${x.play} reads "${x.name}"`);
            if (x.clipped) problems.push(`${x.play}'s name is cut off`);
            if (!x.hit) problems.push(`${x.play} is covered`);
            if (!x.caption) problems.push(`${x.play} has no caption`);
            else if (x.on && !/^(✓ IQ|⚠ \S+ \d+)$/.test(x.caption)) problems.push(`${x.play} is on but its caption is "${x.caption}"`);
          }
          // One line: every tile on the same row, the section no taller than a label and a row of tiles.
          if (new Set(atk.tiles.map((x) => x.top)).size > 1) problems.push(`the play tiles take ${new Set(atk.tiles.map((x) => x.top)).size} lines`);
          if (atk.sectionH > atk.tileRow + 20) problems.push(`the Plays section is ${atk.sectionH.toFixed(0)}px, more than one line`);
          if (t.scrolls) problems.push('the tray scrolls with three plays');
          const on = atk.tiles.filter((x) => x.on).length;
          const wantBadge = on > 0 ? new RegExp(`${on} play${on === 1 ? '' : 's'}$`) : /./;
          if (!wantBadge.test(atk.badge) && !Object.values(SHORT).includes(atk.badge)) problems.push(`the badge reads "${atk.badge}" with ${on} play(s) on`);
        }

        if (withPlays) {
          // The same moment with every call unlocked (a top Coach's Office): the calls give way to
          // the plays (three tiles, the rest in the footer) and the tray still does not scroll.
          await page.evaluate((all) => { const sc = window.__nrlGame.scene.getScene('Match'); sc.unlocked = all; sc.trayKey = ''; sc.refreshCallChips(); }, ALL_CALLS);
          await settle();
          const full = await read();
          await page.screenshot({ path: join(OUT, `attacking-office3-${w}x${h}.png`) });
          if (full.shown && full.tray.scrolls) problems.push('with every call unlocked the tray scrolls');
          if (full.shown && new Set(full.tiles.map((x) => x.top)).size > 1) problems.push('with every call unlocked the play tiles take more than one line');
          await page.evaluate((all) => { const sc = window.__nrlGame.scene.getScene('Match'); sc.unlocked = all; sc.trayKey = ''; sc.refreshCallChips(); }, atkUnlocked);
        }

        // The bottom row with the tray shut: the badge's longer "2 calls · 1 play" still leaves COACH, LOG
        // and the speed pill side by side, none over another, COACH and LOG on screen. Forced to the longest it reads so the
        // check does not depend on the moment.
        await shutTray();
        const bar = await page.evaluate((longest) => {
          const badge = document.querySelector('.nrl-mo-coach-badge');
          const coach = () => document.querySelector('.nrl-mo-bar [data-coach]').getBoundingClientRect().width;
          // Today's longest badge (a made call's name), to measure COACH against on a narrow phone.
          badge.removeAttribute('data-parts');
          badge.textContent = 'Gang tackle';
          const todayW = coach();
          if (longest) {
            // As renderCoachBadge puts calls and plays: two parts, stacked on a narrow phone.
            const [a, b] = longest.split(' · ');
            const sp = (c, t) => { const e = document.createElement('span'); e.className = c; e.textContent = t; return e; };
            badge.replaceChildren(sp('nrl-mo-badge-calls', a), sp('nrl-mo-badge-sep', ' · '), sp('nrl-mo-badge-plays', b));
            badge.setAttribute('data-parts', '');
          }
          const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
          const parts = [['COACH', rect('.nrl-mo-bar [data-coach]')], ['LOG', rect('.nrl-mo-log-toggle')], ['speed pill', rect('.nrl-mo-controls')]];
          const out = [];
          // The speed pill runs past the edge at 568 wide just after a speed tap (it shows every speed for a
          // moment), with or without plays: only COACH and LOG, which the badge can push, must be on screen.
          for (const [n, r] of parts) if (!r) out.push(`no ${n}`); else if (n !== 'speed pill' && (r.l < -1 || r.r > innerWidth + 1 || r.b > innerHeight + 1)) out.push(`${n} off screen`);
          for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
            const [a, ra] = parts[i], [b, rb] = parts[j];
            if (ra && rb && ra.l < rb.r - 1 && rb.l < ra.r - 1 && ra.t < rb.b - 1 && rb.t < ra.b - 1) out.push(`${a} overlaps ${b}`);
          }
          if (longest && innerWidth <= 720 && coach() > todayW + 1) out.push(`COACH is ${Math.round(coach())}px wide with "${longest}", ${Math.round(todayW)}px with today's longest badge`);
          return out;
        }, withPlays ? '6 calls · 3 plays' : null);
        problems.push(...bar.map((p) => `bottom row: ${p}`));
        await page.screenshot({ path: join(OUT, `bar-${tag}-${w}x${h}.png`) });
        await openTray();

        // Defending: no plays.
        await waitTitle('Their ball');
        await settle();
        const def = await read();
        await page.screenshot({ path: join(OUT, `defending-${tag}-${w}x${h}.png`) });
        if (def.shown || def.tiles.length) problems.push('the Plays section shows while defending');
        if (!withPlays && def.shape !== TODAY_TRAY) problems.push(`defending, the tray is not today's: ${def.shape}`);
        if (def.tray.scrolls) problems.push('the tray scrolls while defending');

        if (withPlays) {
          // Call one: the first tile that can be called. Its tag comes once it has been run.
          let called = null;
          let result = '';
          for (let tries = 0; tries < 4 && !result; tries++) {
            await openTray();
            await waitTitle('Your ball');
            const play = await page.waitForFunction(() => {
              const b = document.querySelector('[data-tray-plays]:not([hidden]) [data-play]:not([disabled])');
              if (!b) return null;
              b.click();
              return b.dataset.play;
            }, null, { timeout: TRAY_OPEN_WAIT_MS }).then((hdl) => hdl.jsonValue());
            called = play;
            if (!(await page.locator('.nrl-mo-calls[hidden]').count())) problems.push('the tray stayed open after the play was called');
            const badge = await page.locator('.nrl-mo-coach-badge').textContent();
            if (badge !== SHORT[play]) problems.push(`after the call the badge reads "${badge}"`);
            const queued = await page.evaluate(() => { const sc = window.__nrlGame.scene.getScene('Match'); return sc.playback.opts.calls.filter((c) => c.call === 'set-play').map((c) => c.play); });
            if (!queued.includes(play)) problems.push(`the call record has no ${play}`);
            // Its tag, once the play has been run (or lapsed, when the set ended first: try again).
            const text = await page.waitForFunction((short) => {
              const el = document.querySelector('.nrl-mo-call-result');
              return el && el.textContent.startsWith(short) ? el.textContent : null;
            }, SHORT[play], { timeout: 60000 }).then((hdl) => hdl.jsonValue());
            // Seen: shown, on screen, and not under the commentary line or COACH, measured once its slide-up
            // (nrl-mo-up, 180ms) has settled. It has no pointer events, so measure rather than hit-test.
            const seen = await page.evaluate(async () => {
              const el = document.querySelector('.nrl-mo-call-result');
              if (!el) return 'gone before it settled';
              await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {})));
              const r = el.getBoundingClientRect();
              const clash = (sel) => {
                const o = document.querySelector(sel);
                if (!o || getComputedStyle(o).display === 'none') return false;
                const q = o.getBoundingClientRect();
                return q.height > 0 && r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom;
              };
              return getComputedStyle(el).display === 'none' || !(r.height > 0) ? 'hidden'
                : r.top < 0 || r.bottom > innerHeight ? 'off screen'
                  : clash('.nrl-mo-strip') ? 'under the commentary line' : clash('.nrl-mo-bar [data-coach]') ? 'over COACH' : 'seen';
            });
            await page.screenshot({ path: join(OUT, `result-${w}x${h}.png`) });
            if (seen !== 'seen') problems.push(`the tag "${text}" is ${seen}`);
            if (!/: not run$/.test(text)) result = text;
            else await page.waitForFunction(() => !document.querySelector('.nrl-mo-call-result'), null, { timeout: 5000 }).catch(() => {});
          }
          if (!result) problems.push(`${called} was never run in four tries`);
          else if (!new RegExp(`^${SHORT[called]}( \\+\\d+m|: (no gain|line break!|try!|try against|intercepted|broke down|ball stripped|lost the ball))$`).test(result)) problems.push(`the tag reads "${result}"`);
          else log(`    ${w}x${h}: ${called} called, tag "${result}"`);
        }
        await shutTray();
        if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`);
      } catch (err) {
        problems.push(`threw: ${err.message.split('\n')[0]}`);
        await page.screenshot({ path: join(OUT, `failure-${tag}-${w}x${h}.png`) }).catch(() => {});
      } finally { await ctx.close(); }
      log(`${problems.length ? 'FAIL' : 'ok '} ${name}${problems.length ? ` — ${problems.join('; ')}` : ''}`);
      failed += problems.length ? 1 : 0;
    }
  }
  log(`    match plays (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  return failed;
}
