// #485: phone setup and actual persistence, saved by CI's existing screens artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, OUT_ROOT, IPHONE_UA, log } from '../common.mjs';

export async function runTownSetup(browser) {
  const out = join(OUT_ROOT, 'webkit', 'town-setup');
  mkdirSync(out, { recursive: true });
  const report = [];
  for (const [width, height] of [[667, 375], [844, 390], [390, 844]]) {
    for (const custom of [false, true]) {
      const tag = `${width}x${height}-${custom ? 'custom' : 'listed'}`;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, userAgent: IPHONE_UA });
      const page = await context.newPage();
      try {
        await page.goto(BASE);
        const start = page.locator('[data-nrl-start]');
        await start.waitFor();
        await page.waitForFunction(() => !document.querySelector('[data-nrl-start]')?.disabled);
        if (custom) await page.locator('[data-nrl-town]').fill('Unlisted Valley');
        await page.screenshot({ path: join(out, `${tag}-setup.png`) });
        const club = await page.locator('[data-nrl-clubname]').inputValue();
        const ground = await page.locator('[data-nrl-groundname]').inputValue();
        const town = await page.locator('[data-nrl-town]').inputValue();
        if (!town || !club || !ground) throw new Error('Town, club and ground must be filled before Start');
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
        await start.tap();
        await page.waitForFunction(() => window.__nrlState?.()?.home);
        const state = await page.evaluate(() => window.__nrlState());
        if (state.clubName !== club || state.groundName !== ground) throw new Error('Names not passed to game');
        if (custom) {
          if (JSON.stringify(state.home) !== JSON.stringify({ town: 'Unlisted Valley' })) throw new Error('Custom town has stale metadata');
        } else if (typeof state.home.lat !== 'number' || typeof state.home.lon !== 'number') throw new Error('Listed town has no coordinates');
        await page.locator('[data-tutorial-skip]').click({ timeout: 1500 }).catch(() => {});
        await page.screenshot({ path: join(out, `${tag}-started.png`) });
        report.push({ tag, ok: true, home: state.home, club, ground });
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
