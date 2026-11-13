import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, closeWeekSummary, openNav, log } from '../common.mjs';

/** #468: the real loss report and its plan CTA at both landscape sizes and text
 * settings. Screenshots are CI artifacts, never checked into the repository. */
export async function runCounterText(browser) {
  const out = join(OUT_ROOT, 'webkit', 'counter-text');
  mkdirSync(out, { recursive: true });
  const reports = [];
  for (const [width, height] of [[667, 375], [844, 390]]) for (const textSize of ['normal', 'large']) {
    const tag = `${width}x${height}-${textSize}`;
    const rec = { tag, problems: [] };
    log(`starting counter text ${tag}`);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2,
      hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
    await context.addInitScript(closeWeekSummary);
    await context.addInitScript(() => {
      const realNow = Date.now;
      Date.now = () => 468;
      window.__restoreNow = () => { Date.now = realNow; };
    });
    const page = await context.newPage();
    page.on('pageerror', e => rec.problems.push(e.message));
    try {
      await page.goto(BASE);
      await page.locator('[data-nrl-start]').tap();
      await page.locator('[data-expansion-work]').tap();
      await page.locator('.nrl-tutorial-skip').tap();
      await page.evaluate(size => {
        window.__restoreNow();
        const s = window.__nrlState();
        s.settings.textSize = size;
        s.settings.hints = false;
        // Seed 475 naturally loses at both 7:00 and 2:30 halves, with a real
        // Compressed counter line and Out-schemed in the final loss report.
        s.rngSeed = 475;
        s.lineup.tactics = { attack: 'grind', defence: 'slide' };
        s.lineup.rotation = 'standard';
        // Normal reads recent habits (#469): this fixture needs Compressed v Tight.
        s.recentPlans = Array.from({ length: 3 }, () => ({ attack: 'grind', defence: 'slide' }));
        s.facilities.push({ id: 'counter-training', defId: 'trainingPaddock', level: 3, x: 10, y: 10 });
        // Isolate the defender's Compressed counter: the rival's own Tight
        // offloads against Slide otherwise spend its shared commentary window
        // first, depending on the generated lineup and opening possession.
        // These four edge defenders give Slide zero fit even after training;
        // veteran training leaves their Speed below 19 and their IQ stays 1.
        const edgeIds = new Set(s.lineup.starters.slice(0, 4));
        for (const p of s.squad) {
          p.stats = { speed: 80, strength: 80, stamina: 100, handling: 80, kicking: 80, footyIQ: 80 };
          p.traits = []; p.injuredWeeks = 0; p.suspendedWeeks = 0;
          if (edgeIds.has(p.id)) {
            p.age = 34; p.stats.speed = 1; p.stats.footyIQ = 1;
          }
          // These are synthetic players: their ceilings must match the authored
          // stats, otherwise the XP tick clamps them back to creation quality.
          p.ceilings = Object.fromEntries(Object.keys(p.ceilings).map(stat => [stat, p.stats[stat]]));
        }
        // Flat stronger stats keep fits predictable; the Tight habit selects Compressed.
        for (const c of s.league.clubs) {
          c.strength = 90;
          for (const p of c.squad ?? []) {
            p.stats = { speed: 95, strength: 95, stamina: 100, handling: 95, kicking: 95, footyIQ: 95 };
            p.traits = [];
            p.ceilings = Object.fromEntries(Object.keys(p.ceilings).map(stat => [stat, p.stats[stat]]));
          }
        }
      }, textSize);
      // Applying settings through the normal screen sets the real text-size class.
      await openNav(page, 'settings');
      await page.locator(`.nrl-settings-seg [data-seg="${textSize}"]`).tap();
      await page.locator('.nrl-modal .nrl-screen-x').first().tap();
      await page.locator('.nrl-dock [data-hud="advance"]').tap();
      for (let i = 0; i < 2; i++) {
        const ask = page.locator('[data-confirm-advance], [data-ask-proceed]');
        if (await ask.count()) await ask.first().tap();
      }
      await page.waitForSelector('.nrl-mo-controls', { timeout: 30000 });
      rec.fixture = await page.evaluate(() => ({
        strength: Math.min(...window.__nrlState().squad.map(p => p.stats.strength)),
        stamina: Math.min(...window.__nrlState().squad.map(p => p.stats.stamina)),
      }));
      if (rec.fixture.strength !== 80 || rec.fixture.stamina < 99.7) {
        throw new Error(`Counter fixture stats changed before kick-off: ${JSON.stringify(rec.fixture)}`);
      }
      // Hold on a real counter line so the screenshot and geometry inspect the
      // text actually produced by the view, at the selected text size.
      await page.evaluate(() => {
        const strip = document.querySelector('.nrl-mo-strip-text');
        const observer = new MutationObserver(() => {
          if (!/^(Compressed (swallows|holds)|Tight meets)/.test(strip.textContent)) return;
          window.__counterLine = strip.textContent;
          window.__nrlGame.scene.getScene('Match').playback.hold();
          observer.disconnect();
        });
        observer.observe(strip, { childList: true, characterData: true, subtree: true });
      });
      await page.locator('.nrl-mo-controls [data-speed="8"]').tap();
      await page.waitForFunction(() => window.__counterLine, null, { timeout: 30000 });
      rec.commentary = await page.locator('.nrl-mo-strip-text').textContent();
      rec.problems.push(...await page.locator('.nrl-mo-strip').evaluate(strip => {
        const r = strip.getBoundingClientRect();
        const text = strip.querySelector('.nrl-mo-strip-text');
        const bar = document.querySelector('.nrl-mo-bar').getBoundingClientRect();
        return [
          ...(r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1 ? ['ticker outside viewport'] : []),
          ...(r.bottom > bar.top + 1 ? ['ticker overlaps controls'] : []),
          ...(text.scrollHeight > text.clientHeight + 1 ? ['ticker text clipped'] : []),
        ];
      }));
      await page.screenshot({ path: join(out, `${tag}-commentary.png`) });
      await page.evaluate(() => window.__nrlGame.scene.getScene('Match').playback.release());
      await page.locator('.nrl-mo-skip').tap();
      await page.locator('.nrl-mo-skip').tap();
      await page.waitForSelector('.nrl-mo-ft [data-report]', { timeout: 30000 });
      rec.result = await page.locator('.nrl-mo-ft').evaluate(card => ({
        kind: card.querySelector('.nrl-rp-tag')?.getAttribute('data-kind'),
        score: card.querySelector('.nrl-ft-pts')?.textContent,
      }));
      if (rec.result.kind !== 'loss') {
        throw new Error(`Counter fixture must lose to show the loss report: ${JSON.stringify(rec.result)}`);
      }
      await page.locator('.nrl-mo-ft [data-report]').tap();
      await page.locator('[data-why-lost] summary').tap();
      const row = page.locator('.nrl-report-why-row').filter({ hasText: 'Out-schemed:' });
      rec.report = await page.locator('.nrl-report').textContent();
      await row.waitFor({ timeout: 3000 });
      await row.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      rec.reason = await row.textContent();
      if (!rec.reason.includes('Compressed') || !rec.reason.includes('Tight')) rec.problems.push('wrong counter reason');
      rec.problems.push(...await row.evaluate(row => {
        const problems = [];
        const text = row.querySelector('span'), button = row.querySelector('button');
        const r = row.getBoundingClientRect(), t = text.getBoundingClientRect(), b = button.getBoundingClientRect();
        if (r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1) problems.push('reason outside viewport');
        if (t.right > b.left + 1) problems.push('text overlaps CTA');
        if (text.scrollWidth > text.clientWidth + 1 || button.scrollWidth > button.clientWidth + 1) problems.push('text clipped');
        if (b.height < 43.5) problems.push('CTA shorter than 44px');
        if (!button.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2))) problems.push('CTA covered');
        return problems;
      }));
      await page.screenshot({ path: join(out, `${tag}-report.png`) });
      await row.locator('button').tap();
      await page.waitForSelector('.nrl-lineup-row');
      if (await page.locator('.nrl-report').count()) rec.problems.push('report still open after CTA');
    } catch (e) {
      rec.problems.push(e.message);
      log(rec.report ?? 'report not reached');
      await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
    }
    reports.push(rec);
    log(`${rec.problems.length ? 'FAIL' : 'ok'} counter text ${tag}: ${rec.problems.join('; ')}`);
    await context.close();
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(reports, null, 2));
  return reports.filter(r => r.problems.length).length;
}
