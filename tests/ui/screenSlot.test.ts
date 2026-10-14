import { describe, it, expect, vi } from 'vitest';
import { ScreenSlot, HUD_INSET_VAR, NAV_INSET_VAR } from '../../src/ui/dom';

// GitHub #14: every nav screen goes through one shared slot (openScreen in
// ui/dom.ts) so only one screen is ever open and each screen's teardown runs
// however it is closed. DOM rendering is not tested (vitest env is 'node').
describe('ScreenSlot (single open screen)', () => {
  it('starts empty and close() is a no-op', () => {
    const slot = new ScreenSlot<string>();
    expect(slot.active).toBeNull();
    expect(slot.close()).toBe(false);
  });

  it('opening a second screen closes the first exactly once', () => {
    const slot = new ScreenSlot<string>();
    const closeSquad = vi.fn();
    const closeRecruit = vi.fn();
    slot.open('squad', closeSquad);
    expect(slot.active).toBe('squad');
    slot.open('recruit', closeRecruit);
    expect(closeSquad).toHaveBeenCalledTimes(1);
    expect(closeRecruit).not.toHaveBeenCalled();
    expect(slot.active).toBe('recruit');
  });

  it('close() runs the closer once and empties the slot (idempotent)', () => {
    const slot = new ScreenSlot<string>();
    const closer = vi.fn();
    slot.open('build', closer);
    expect(slot.close()).toBe(true);
    expect(slot.close()).toBe(false);
    expect(closer).toHaveBeenCalledTimes(1);
    expect(slot.active).toBeNull();
  });

  it('is re-entrancy safe when a closer calls close() itself', () => {
    const slot = new ScreenSlot<string>();
    const closer = vi.fn(() => slot.close());
    slot.open('history', closer);
    slot.close();
    expect(closer).toHaveBeenCalledTimes(1);
    expect(slot.active).toBeNull();
  });

  it('publishes distinct CSS custom properties for HUD and nav insets', () => {
    expect(HUD_INSET_VAR).toMatch(/^--/);
    expect(NAV_INSET_VAR).toMatch(/^--/);
    expect(HUD_INSET_VAR).not.toBe(NAV_INSET_VAR);
  });
});
