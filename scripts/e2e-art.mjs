// E2E_URL=http://localhost:5173 CHROMIUM_PATH=/usr/bin/chromium node scripts/e2e-art.mjs
// Browser rehearsal checks; screenshots stay in the ignored e2e-output folder.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const out = process.env.E2E_OUT ?? 'e2e-output/art';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  // Catch any storage mutation from the art route, including imported modules.
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    original.call(localStorage, 'art-test-career-sentinel', '{"player":"keep-me"}');
    window.__artStorageBefore = JSON.stringify(Object.entries(localStorage).sort());
    window.__artWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const fn = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.__artWrites.push(method);
        return fn.apply(this, args);
      };
    }
  });
  await page.goto(`${process.env.E2E_URL ?? 'http://localhost:5173/'}#artlab`);
  await page.locator('#new-pitch').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('#play').textContent(), 'Play', 'reduced motion starts paused');
  const pixels = selector => page.locator(selector).evaluate(c => c.toDataURL());
  const old = await pixels('#old-pitch');
  const before = await pixels('#new-pitch');
  await page.locator('#build').selectOption('stocky');
  await page.locator('#head').selectOption('mullet');
  await page.locator('#beard').check();
  await page.locator('#tape').check();
  assert.notEqual(await pixels('#new-pitch'), before);
  assert.equal(await pixels('#old-pitch'), old, 'baseline is unaffected by preview cosmetics');
  const front = await pixels('#new-pitch');
  await page.locator('#turn').click();
  assert.notEqual(await pixels('#new-pitch'), front);
  await page.locator('#turn').click();
  for (const beat of [0, 2, 3.15, 3.35, 5.5, 5.7, 5.95, 6.25, 6.7, 7.15, 7.65, 8.3]) {
    await page.locator(`[data-time="${beat}"]`).click();
    assert.equal(Number(await page.locator('#scrub').inputValue()), beat);
    await page.screenshot({ path: `${out}/beat-${beat}.png` });
  }
  await page.locator('#pass').click();
  await page.waitForFunction(() => Number(document.querySelector('#scrub').value) > 2.1);
  await page.locator('#play').click();
  await page.locator('#new-only').click();
  assert.equal(await page.locator('.old').isVisible(), false);
  await page.locator('#compare').click();
  assert.equal(await page.locator('.old').isVisible(), true);
  await page.locator('[data-time="3.35"]').click();
  // The art lab never mounts the rotate card, so a tall window is still a layout check.
  for (const [width, height] of [[1280, 900], [844, 390], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => document.querySelector('#new-pitch').width === Math.round(document.querySelector('#new-pitch').getBoundingClientRect().width));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
    await page.screenshot({ path: `${out}/${width}x${height}.png`, fullPage: true });
    await page.locator('#recognise').click();
    assert.equal(await page.locator('.beats').isVisible(), false);
    assert.equal(await page.locator('.workbench').isVisible(), false);
    assert.equal(await page.locator('.old').isVisible(), false);
    const roster = await pixels('#new-pitch');
    await page.locator('#rearrange').click();
    assert.notEqual(await pixels('#new-pitch'), roster);
    await page.locator('#turn').click();
    await page.screenshot({ path: `${out}/nine-${width}x${height}.png`, fullPage: true });
    await page.locator('#turn').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#play').click();
    await page.waitForFunction(() => Number(document.querySelector('#scrub').value) > .1);
    await page.locator('#play').click();
    await page.locator('#passage').click();
    assert.equal(await page.locator('.workbench').isVisible(), true);
  }
  await page.locator('#reset').click();
  assert.equal(await page.locator('#head').inputValue(), 'headgear');
  await page.locator('#tackle-loop').click();
  assert.equal(await page.locator('#play').textContent(), 'Play', 'tackle replay respects reduced motion');
  assert.equal(await page.locator('.old').isVisible(), false);
  await page.locator('#scrub').fill('9.98');
  await page.locator('#play').click();
  await page.waitForFunction(() => Number(document.querySelector('#scrub').value) < 6);
  assert.ok(Number(await page.locator('#scrub').inputValue()) >= 5.35, 'replay loops at the tackle approach');
  await page.locator('#play').click();
  await page.locator('#contact-cases').click();
  assert.equal(await page.locator('#play').textContent(), 'Play', 'contact situations respect reduced motion');
  for (const situation of ['two', 'three', 'low', 'dominant', 'break', 'steal', 'wrap']) {
    await page.locator('#contact-case').selectOption(situation);
    await page.locator('#case-outcome').click();
    const original = await pixels('#new-pitch');
    await page.locator('#contact-variation').click();
    await page.locator('#case-outcome').click();
    // The approach picks the tackle picture (#674); a bust or a strip is drawn the same from any angle.
    if (situation === 'break' || situation === 'steal') assert.equal(await pixels('#new-pitch'), original, 'the outcome, not the approach, draws a bust or strip');
    else assert.notEqual(await pixels('#new-pitch'), original, 'the approach is visible');
    for (let i = 0; i < 2; i++) await page.locator('#contact-variation').click();
    await page.locator('#case-outcome').click();
    assert.equal(await pixels('#new-pitch'), original, 'replay rebuilds the same outcome');
    await page.locator('#case-finish').click();
    if (situation === 'steal') assert.match(await page.locator('#phase').textContent(), /defender ball/);
    if (situation === 'break') assert.match(await page.locator('#phase').textContent(), /runner away/);
    await page.screenshot({ path: `${out}/contact-${situation}.png`, fullPage: true });
  }
  for (const [width, height] of [[1280, 900], [844, 390], [390, 844], [360, 740]]) {
    await page.setViewportSize({ width, height });
    await page.locator('#contact-case').selectOption('three');
    await page.locator('#case-outcome').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'contact controls fit');
    await page.screenshot({ path: `${out}/contacts-${width}x${height}.png`, fullPage: true });
  }
  assert.deepEqual(await page.evaluate(() => window.__artWrites), []);
  assert.equal(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()) === window.__artStorageBefore), true);
  await Promise.all([page.waitForEvent('load'), page.locator('header a').click()]);
  assert.equal(new URL(page.url()).hash, '');
  assert.equal(await page.locator('.art-lab').count(), 0, 'return link leaves the rehearsal');
  assert.deepEqual(errors, []);
  console.log('PASS: cosmetics, baseline, directions, passage beats, tackle replay, nine-player study, 3 viewports, reduced motion, and save isolation.');
} finally {
  await browser.close();
}
