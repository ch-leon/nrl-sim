// scripts/e2e-webkit/newClub.mjs — the title's new-club setup in three steps (SuperCOOKED 12–14:
// 1 Town, 2 Club, 3 Start) and each save slot's ⋯, walked the way a player does. Nothing runs on
// import, so the Chromium scripts (e2e-season, e2e-perf, e2e-analytics, e2e-live-art) share it.
// common.mjs re-exports it for the WebKit sections.

/** The step the new club's setup shows: 1 Town, 2 Club, 3 Start; 0 when no setup is up. */
export function setupStepNow(page) {
  return page.evaluate(() => Number(document.querySelector('[data-nrl-setup-step]')?.getAttribute('data-nrl-setup-step') ?? 0));
}

/**
 * Walk the new club's setup to step `n` (default 3, the step with Start) with its own Next and
 * ◂ Back; 0 backs out to the save slots. Waits for the setup first, so it can follow a goto.
 * `dom: true` clicks in the page instead of through Playwright (a title under the rotate card).
 * Next on Club holds while a name won't do, as it does for a player: that times out here.
 */
export async function setupStep(page, n = 3, { dom = false } = {}) {
  await page.waitForSelector('[data-nrl-setup-step]', { state: 'attached' });
  for (let i = 0; i < 4; i++) {
    const at = await setupStepNow(page);
    if (at === n) return;
    const sel = at < n ? '[data-nrl-next]' : '[data-nrl-back]';
    if (dom) await page.evaluate((s) => document.querySelector(s).click(), sel);
    else await page.locator(sel).click();
    await page.waitForFunction((want) => Number(document.querySelector('[data-nrl-setup-step]')?.getAttribute('data-nrl-setup-step') ?? 0) === want,
      at < n ? at + 1 : at - 1);
  }
  throw new Error(`the new club's setup did not reach step ${n}`);
}

/** Open save slot `slot`'s ⋯ on the title: its exports, New club over a season, and Delete. */
export async function slotMenu(page, slot) {
  await page.locator(`[data-nrl-slot-${slot}]`).waitFor();
  if (await page.locator(`[data-nrl-slot-${slot}]`).getAttribute('data-open') !== 'true') await page.locator(`[data-nrl-more-${slot}]`).click();
  await page.locator(`[data-nrl-slot-${slot}][data-open="true"]`).waitFor();
}
