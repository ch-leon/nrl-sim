import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { closeWeekSummary, OUT_ROOT, BASE, IPHONE_UA, log, SHEET_EXIT, openNav } from '../common.mjs';

// Labs controls plus the tackle HUD: --controls-only runs this phase in isolation.
// E2E_CHROMIUM_PATH provides an explicit local fallback; CI always uses WebKit.
export async function runLabsControls(browser) {
  const started = Date.now();
  const ctx = await browser.newContext({ viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
  await ctx.addInitScript(closeWeekSummary);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const OUT = join(OUT_ROOT, 'webkit', 'labs-controls');
  mkdirSync(OUT, { recursive: true });
  try {
    // Setup captures the career seed for town preselection. Pin before it opens
    // so setup and createNewGame both use seed 1. Timers/animation keep running,
    // and wall time resumes before playing; other phases keep their own clocks.
    await page.clock.setFixedTime(1);
    await page.goto(`${BASE}&labs=1`);
    await page.locator('[data-nrl-start]').tap();
    await page.locator('[data-expansion-work]').tap();
    await page.locator('.nrl-tutorial-skip').tap();
    await page.clock.setSystemTime(Date.now());
    await openNav(page, 'settings');
    await page.locator('.nrl-labs-open').tap();
    await page.locator('[data-experiment="match-controls"]').check();
    await page.locator('.nrl-modal .nrl-screen-x').tap();
    if (await page.locator(SHEET_EXIT).count()) await page.locator(SHEET_EXIT).first().tap();
    await page.locator('.nrl-dock [data-hud="advance"]').tap();
    for (let i = 0; i < 2; i++) {
      const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
      if (await ask.count()) await ask.first().tap();
    }
    await page.locator('.nrl-labs-badge').waitFor();
    await page.locator('.nrl-labs-hint').waitFor({ timeout: 25000 });
    await page.screenshot({ path: join(OUT, 'hint.png') });
    await page.locator('.nrl-labs-hint').tap();
    // A seeded first carry can end as the hint closes. Wait and send in the
    // same browser task, so this phase always swipes on his attacking set.
    await page.waitForFunction(() => {
      const match = window.__nrlGame?.scene.getScene('Match');
      const pb = match?.playback;
      if (!pb?.controlsAvailable || pb.controlAttacking !== match.live?.planSide || pb.controlPhase !== 'play') return false;
      const canvas = document.querySelector('canvas');
      const camera = match.cameras.main;
      const before = { x: camera.scrollX, y: camera.scrollY };
      for (const [type, y] of [['pointerdown', 190], ['pointermove', 160], ['pointerup', 145]]) {
        canvas.dispatchEvent(new PointerEvent(type, { clientX: 350, clientY: y, pointerId: 41, pointerType: 'mouse', bubbles: true }));
        // Feed Phaser's native mouse path too: a recognised control must not pan.
        canvas.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), {
          clientX: 350, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          view: window, bubbles: true, cancelable: true,
        }));
      }
      if (!pb.controls.at(-1)?.kind.startsWith('step-')) throw new Error('vertical swipe did not queue a step');
      if (camera.scrollX !== before.x || camera.scrollY !== before.y) throw new Error('control swipe panned the camera');
      if (!Object.keys(localStorage).filter((k) => k.startsWith('nrl-live-match-')).some((k) => JSON.parse(localStorage.getItem(k)).controls?.length)) throw new Error('attacking swipe was not recorded');
      return true;
    }, null, { timeout: 20000 });
    if (await page.locator('.nrl-mo-speed:visible').count() !== 4) throw new Error('a speed choice is hidden');
    // The tackle count stays up through passes, kicks and dead time (Leon on iPhone: it
    // flashed). 15 s of live play at 844×390, read every 100 ms.
    await page.setViewportSize({ width: 844, height: 390 });
    const steady = await page.evaluate(() => new Promise((done) => {
      const pb = window.__nrlGame.scene.getScene('Match').playback;
      const problems = [], labels = new Set(), widths = new Set();
      let samples = 0, inFlight = 0;
      const id = setInterval(() => {
        samples++;
        const el = document.querySelector('.nrl-mo-tackle');
        if (!pb.controlPicture.ball.holder) inFlight++;
        if (!el) problems.push(`${samples}: missing`);
        else {
          const r = el.getBoundingClientRect();
          if (el.hidden) problems.push(`${samples}: hidden`);
          if (getComputedStyle(el).display === 'none') problems.push(`${samples}: display none`);
          if (!r.width || !r.height) problems.push(`${samples}: no size`);
          if (!el.textContent.trim()) problems.push(`${samples}: empty`);
          labels.add(el.textContent);
          widths.add(Math.round(r.width));
        }
        if (samples >= 150) {
          clearInterval(id);
          // Its width is reserved for the longest label: a new count never shifts the score row.
          if (widths.size > 1) problems.push(`width moved: ${[...widths].join(', ')}px`);
          done({ samples, inFlight, labels: [...labels], problems });
        }
      }, 100);
    }));
    if (steady.problems.length) throw new Error(`tackle count not steady: ${steady.problems.slice(0, 5).join(', ')} (${steady.problems.length} of ${steady.samples})`);
    log(`  tackle count up on ${steady.samples}/${steady.samples} samples, ${steady.inFlight} with the ball in the air (${steady.labels.join(' | ')})`);
    await page.setViewportSize({ width: 667, height: 375 });
    // Reach our last tackle without assuming who receives the seeded kickoff.
    await page.waitForFunction(() => {
      const match = window.__nrlGame?.scene.getScene('Match'), pb = match?.playback;
      if (!pb?.controlsAvailable) return false;
      if (pb.controlAttacking !== match.live?.planSide || !document.querySelector('.nrl-mo-tackle-last:not([hidden])')) {
        pb.skipSet(); return false;
      }
      if (!pb.controlPicture.ball.holder) return false;
      pb.hold();
      // Freeze the fullest tray, as in the existing portrait/clearance check.
      match.refreshCallChips = () => {};
      const tile = (name, hint) => {
        const b = document.createElement('button');
        b.className = 'nrl-btn nrl-mo-tray-call';
        const title = document.createElement('b'), caption = document.createElement('span');
        title.textContent = name; caption.textContent = hint;
        b.append(title, caption); return b;
      };
      const pair = document.createElement('div'); pair.className = 'nrl-mo-tray-pair';
      pair.append(tile('Shift left', 'ball to the left'), tile('Shift right', 'ball to the right'));
      document.querySelector('.nrl-mo-tray-list').replaceChildren(tile('Hit-up', 'forwards take it in'), pair,
        tile('Offload', 'keep the ball alive'), tile('Kick early', 'kick next tackle'), tile('Fresh legs', 'fresh legs on'));
      document.querySelector('.nrl-mo-tray-foot').textContent = 'Run it, Bomb, Grubber, 40/20 from tackle 4 · Field goal when in range · Take the two, Tap and go at Coach’s Office level 2, more above';
      return true;
    }, null, { timeout: 30000 });
    for (const [width, height] of [[667, 375], [844, 390], [956, 330]]) {
      await page.setViewportSize({ width, height });
      for (const [size, scale] of [['normal', 1], ['large', 1.15], ['larger', 1.3]]) {
        await page.evaluate(([size, scale]) => {
          const root = document.documentElement;
          root.setAttribute('data-text-size', size);
          root.style.setProperty('--nrl-text-scale', String(scale));
        }, [size, scale]);
        await page.waitForTimeout(100);
        await page.locator('.nrl-mo-bar [data-coach]').tap();
        await page.waitForTimeout(200); // Let the tray's entrance animation finish for the capture.
        const problems = await page.evaluate(() => {
          const el = document.querySelector('.nrl-mo-tackle'), r = el.getBoundingClientRect();
          const problems = [];
          if (el.hidden || !el.textContent.includes('LAST TACKLE')) problems.push('last tackle missing');
          if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight || el.scrollWidth > el.clientWidth) problems.push('count clipped');
          const tray = document.querySelector('.nrl-mo-tray');
          if (tray.scrollHeight > tray.clientHeight + 1) problems.push('full coach tray scrolls');
          const intersects = (b) => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
          for (const sel of ['.nrl-mo-team', '.nrl-mo-clockbox', '.nrl-mo-bar', '.nrl-mo-tray:not([hidden])', '.nrl-mo-calls', '.nrl-mo-skip', '.nrl-labs-badge']) {
            for (const other of document.querySelectorAll(sel)) if (intersects(other.getBoundingClientRect())) problems.push(`count overlaps ${sel}`);
          }
          return problems;
        });
        if (problems.length) throw new Error(`${width}x${height} ${size}: ${problems.join(', ')}`);
        await page.screenshot({ path: join(OUT, `tackle-${width}x${height}-${size}.png`) });
        await page.locator('.nrl-mo-bar [data-coach]').tap();
      }
    }
    await page.setViewportSize({ width: 667, height: 375 });
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--nrl-text-scale', '1');
      window.__nrlGame.scene.getScene('Match').playback.release();
    });
    await page.waitForFunction(() => {
      const match = window.__nrlGame.scene.getScene('Match'), pb = match.playback;
      if (!pb.controlsAvailable || pb.controlAttacking !== match.live.planSide || pb.controlPhase !== 'play' || !pb.controlPicture.ball.holder) return false;
      if (!document.querySelector('.nrl-mo-tackle-last:not([hidden])') || pb.sim.pendingKick) return false;
      const o = match.fieldToWorld(0, 0), f = match.fieldToWorld(1, 0);
      const length = Math.hypot(f.x - o.x, f.y - o.y);
      const dx = -(f.x - o.x) / length * pb.controlDirection * 70;
      const dy = -(f.y - o.y) / length * pb.controlDirection * 70;
      const canvas = document.querySelector('canvas');
      window.__kickEventsBefore = pb.recorder.events.filter((e) => e.kind === 'kick').length;
      for (const [type, x, y] of [['pointerdown', 350, 160], ['pointermove', 350 + dx, 160 + dy], ['pointerup', 350 + dx, 160 + dy]]) {
        if (document.elementFromPoint(x, y) !== canvas) throw new Error('drag point covered');
        canvas.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 42, pointerType: 'touch', bubbles: true }));
      }
      if (pb.controls.at(-1)?.kind !== 'kick') throw new Error('quick backward drag did not queue kick');
      return true;
    }, null, { timeout: 20000 });
    await page.waitForFunction(() => {
      const pb = window.__nrlGame.scene.getScene('Match').playback;
      return pb.recorder.events.filter((e) => e.kind === 'kick').length > window.__kickEventsBefore;
    }, null, { timeout: 10000 });
    await page.screenshot({ path: join(OUT, 'controlled-kick.png') });
    await page.locator('.nrl-mo-labs-skip').tap();
    await page.screenshot({ path: join(OUT, 'skip-set.png') });
    await page.locator('.nrl-mo-pause').tap();
    await page.locator('.nrl-mo-sheet [data-settings]').tap();
    await page.locator('.nrl-labs-open').tap();
    await page.locator('.nrl-labs-off').tap();
    const off = await page.evaluate(() => JSON.parse(localStorage.getItem('nrl-sim-labs')));
    if (off.visible || Object.values(off.on).some(Boolean)) throw new Error('Turn all off retained Labs');
    log(`ok  labs controls (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    return 0;
  } catch (err) {
    log(`FAIL labs controls — ${err.message}`);
    await page.screenshot({ path: join(OUT, 'failure.png') }).catch(() => {});
    return 1;
  } finally { await ctx.close(); }
}
