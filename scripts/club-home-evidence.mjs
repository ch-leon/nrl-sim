// Screenshot evidence for PR #490; this branch does not change feature source.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.EVIDENCE_URL ?? 'http://127.0.0.1:4198/';
const out = 'e2e-output/club-home-evidence';
mkdirSync(out, { recursive: true });
let ready = false;
for (let i = 0; i < 60; i++) {
  try { ready = (await fetch(base)).ok; } catch { /* preview is starting */ }
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert(ready, 'Preview server did not start');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const report = { sourceCommit: '0b79c0ddaa6934cc16e8ce68e67692669376af47', viewport: '390x844', cases: [] };
try {
  for (const [difficulty, bank] of [['easy', 300_000], ['hard', 150_000]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}?e2e`);
    await page.locator('[data-nrl-clubname]').fill('Runway Club');
    const pick = page.locator(`[data-nrl-difficulty-${difficulty}]`);
    await pick.click();
    assert.equal(await pick.getAttribute('aria-pressed'), 'true');
    await page.locator('[data-nrl-start]').click();
    await page.locator('.nrl-tutorial-skip').click();
    await page.locator('.nrl-tutorial').waitFor({ state: 'detached' });
    await page.locator('.nrl-nav [data-nav-home]').click();
    await page.locator('[data-club-home]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const view = await page.evaluate(() => {
      const money = document.querySelector('.nrl-club-home-money');
      const row = document.querySelector('.nrl-club-home-cash');
      const r = row.getBoundingClientRect();
      const s = window.__nrlState();
      return { money: s.money, week: s.week, text: money.textContent, label: row.getAttribute('aria-label'), level: money.dataset.level,
        fits: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && money.scrollWidth <= money.clientWidth };
    });
    assert.equal(view.money, bank);
    assert.equal(view.week, 1);
    assert.match(view.text, /about \d+ weeks of runway/);
    assert(view.fits, 'Money row must fit inside the viewport');
    assert.deepEqual(errors, []);
    const file = `${difficulty}-390x844.png`;
    await page.screenshot({ path: `${out}/${file}` });
    report.cases.push({ difficulty, file, ...view });
    console.log(difficulty, view);
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
