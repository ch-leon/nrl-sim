// tests/match/view/zoneLayer.test.ts — the bonus zone lights up under a bonus try (#77).
import { describe, it, expect } from 'vitest';
import { ZONE_FLASH_MS, bonusTryEnd, zoneFlashAlpha } from '../../../src/match/view/zoneLayer';
import { POPUP_BIG_MS } from '../../../src/match/view/popups';
import { BANNER_MS } from '../../../src/ui/screens/matchOverlay';
import type { SimEvent, Snapshot } from '../../../src/match/core/snapshot';

const snapWith = (x: number): Snapshot => ({
  tick: 100,
  players: [
    { side: 'home', slot: 2, x, y: 34, pose: 'dive', headX: 1, speed: 0 },
    { side: 'away', slot: 2, x: 50, y: 34, pose: 'run', headX: -1, speed: 0 },
  ],
  ball: { x, y: 34, lift: 0, holder: null },
  label: '',
  events: [],
});
const tryEv = (detail?: string): SimEvent => ({ tick: 100, kind: 'try', text: '', side: 'home', slot: 2, ...(detail ? { detail } : {}) });

describe('bonusTryEnd', () => {
  it('names the end the scorer grounded it at, only for a bonus try', () => {
    expect(bonusTryEnd(tryEv('bonus'), snapWith(104))).toBe(1);
    expect(bonusTryEnd(tryEv('bonus'), snapWith(-3))).toBe(-1);
    expect(bonusTryEnd(tryEv(), snapWith(104))).toBeNull();
    expect(bonusTryEnd({ ...tryEv('bonus'), kind: 'conversion' }, snapWith(104))).toBeNull();
    expect(bonusTryEnd({ ...tryEv('bonus'), slot: 7 }, snapWith(104))).toBeNull();
  });
});

describe('zoneFlashAlpha', () => {
  it('lights the zone at once, pulses gently, fades out and is gone after it', () => {
    expect(zoneFlashAlpha(0)).toBeGreaterThan(0.4);
    expect(zoneFlashAlpha(0)).toBeLessThanOrEqual(0.55);
    expect(zoneFlashAlpha(-1)).toBe(0);
    expect(zoneFlashAlpha(ZONE_FLASH_MS)).toBe(0);
    // A pulse: dimmer a sixth of the way in than at the start and a third of the way in, but never dark.
    expect(zoneFlashAlpha(ZONE_FLASH_MS / 6)).toBeLessThan(zoneFlashAlpha(0));
    expect(zoneFlashAlpha(ZONE_FLASH_MS / 6)).toBeLessThan(zoneFlashAlpha(ZONE_FLASH_MS / 3));
    for (let t = 0; t < ZONE_FLASH_MS * 0.8; t += 50) expect(zoneFlashAlpha(t)).toBeGreaterThan(0.3);
    // Fading over the last stretch.
    expect(zoneFlashAlpha(ZONE_FLASH_MS * 0.95)).toBeLessThan(zoneFlashAlpha(ZONE_FLASH_MS * 0.8));
    for (let t = 0; t < ZONE_FLASH_MS; t += 50) expect(zoneFlashAlpha(t)).toBeGreaterThan(0);
  });

  it('outlasts the BONUS TRY! pop-up and the overlay\'s try banner over the scorer', () => {
    expect(ZONE_FLASH_MS).toBeGreaterThan(POPUP_BIG_MS);
    // Still at full glow when the banner goes.
    expect(zoneFlashAlpha(BANNER_MS.try + 100)).toBeGreaterThan(0.3);
  });
});
