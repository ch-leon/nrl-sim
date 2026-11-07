// #485: phone setup and actual persistence, saved by CI's existing screens artifact.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BASE, OUT_ROOT, IPHONE_UA, log, openNav } from '../common.mjs';

export async function runTownSetup(browser) {
  const out = join(OUT_ROOT, 'webkit', 'town-setup');
  mkdirSync(out, { recursive: true });
  const report = [];
  const pick = JSON.parse(readFileSync(new URL('../../../src/data/towns.json', import.meta.url), 'utf8')).find(t => t.name === 'Brisbane' && t.country === 'AU');
  if (!pick) throw new Error('The offline catalogue must include Brisbane for the selection check');
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    for (const mode of ['listed', 'picked', 'custom']) {
      const custom = mode === 'custom';
      const tag = `${width}x${height}-${mode}`;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA, serviceWorkers: 'block' });
      const page = await context.newPage();
      const isTownChunk = url => /\/towns-[^/]+\.js(?:\?|$)/.test(url);
      let townRequests = 0;
      page.on('request', request => { if (isTownChunk(request.url())) townRequests++; });
      const chunk = page.waitForResponse(response => isTownChunk(response.url()));
      try {
        await page.goto(BASE);
        const start = page.locator('[data-nrl-start]');
        await start.waitFor();
        await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
        const chunkBytes = gzipSync(await (await chunk).body()).length;
        if (chunkBytes >= 100_000) throw new Error(`Town chunk exceeds budget: ${chunkBytes} gzip bytes`);
        if (mode === 'picked') await page.locator('[data-nrl-town]').fill(`${pick.name}, ${pick.region}, ${pick.country}`);
        if (custom) await page.locator('[data-nrl-town]').fill('Unlisted Valley');
        await page.screenshot({ path: join(out, `${tag}-setup.png`) });
        const club = await page.locator('[data-nrl-clubname]').inputValue();
        const ground = await page.locator('[data-nrl-groundname]').inputValue();
        const town = await page.locator('[data-nrl-town]').inputValue();
        if (mode === 'picked' && club !== `${pick.name} ${pick.nickname}`) throw new Error('Picking a town did not fill the club name');
        if (mode === 'picked' && !ground.startsWith(`${pick.name} `)) throw new Error('Picking a town did not fill the ground name');
        if (!town || !club || !ground) throw new Error('Town, club and ground must be filled before Start');
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
        await start.tap();
        await page.locator('[data-expansion-work]').tap();
        await page.waitForFunction(() => window.__nrlState?.()?.home);
        const state = await page.evaluate(() => window.__nrlState());
        if (state.clubName !== club || state.groundName !== ground) throw new Error('Names not passed to game');
        if (custom) {
          if (JSON.stringify(state.home) !== JSON.stringify({ town: 'Unlisted Valley' })) throw new Error('Custom town has stale metadata');
        } else if (typeof state.home.lat !== 'number' || typeof state.home.lon !== 'number') throw new Error('Listed town has no coordinates');
        if (mode === 'picked' && (state.home.town !== pick.name || state.home.lat !== pick.lat || state.home.lon !== pick.lon)) throw new Error('Picked town metadata was not stored');
        await page.locator('.nrl-tutorial-skip').click({ timeout: 1500 }).catch(() => {});
        if (width < height) {
          await openNav(page, 'club');
          await page.locator('[data-club-home]').waitFor();
          const next = state.league.fixtures.filter(f => (f.round >= state.week || state.week === 1 && f.round <= 0) && !f.result && (f.homeId === 'player' || f.awayId === 'player')).sort((a, b) => a.round - b.round)[0];
          if (next?.homeId === 'player' && !(await page.locator('.nrl-club-home-next').textContent()).includes(ground)) throw new Error('Home fixture is missing the saved ground name');
        }
        await page.screenshot({ path: join(out, `${tag}-started.png`) });
        if (mode === 'listed') {
          townRequests = 0;
          await page.reload();
          await page.locator('[data-nrl-new-2]').waitFor();
          if (townRequests !== 0) throw new Error('Town data loaded on save slots before setup opened');
          await page.locator('[data-nrl-new-2]').tap();
          await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
          if (townRequests !== 1) throw new Error('Opening setup did not dynamically load the town chunk');
        }
        report.push({ tag, ok: true, home: state.home, club, ground, chunkBytes });
      } catch (error) {
        await page.screenshot({ path: join(out, `${tag}-failure.png`) }).catch(() => {});
        report.push({ tag, ok: false, error: error.message });
      } finally { await context.close(); }
    }
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
  for (const result of report) log(`${result.ok ? 'ok' : 'FAIL'} town setup ${result.tag}${result.error ? `: ${result.error}` : ''}`);
  return report.filter(r => !r.ok).length;
}
