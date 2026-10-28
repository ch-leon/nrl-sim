// #203: on a landscape phone the player page was a viewport dialog centred over
// the nav, with Renew / Sell / Close below the screen. It is now a region dialog
// (between HUD and nav) and, since Broadcast Quiet (3f), a full sheet with ◂ back
// and its actions pinned at the foot of its right column. Layout is checked in
// WebKit by scripts/e2e-webkit.mjs; these pin the CSS, since vitest has no layout.
import { describe, it, expect } from 'vitest';
import { CSS } from '../../src/ui/dom';
import { PLAYER_CSS } from '../../src/ui/screens/player';

/** The declarations of the first rule whose selector (or selector list) ends with `selector`. */
function rule(selector: string, css = CSS): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

describe('Player of the Match card (#203)', () => {
  it('lets taps beside the card through to Back to Club', () => {
    expect(rule('.nrl-potm-backdrop')).toContain('pointer-events: none');
    expect(rule('.nrl-potm-backdrop .nrl-modal')).toContain('pointer-events: auto');
  });
});

describe('region dialog (#203)', () => {
  it('sits above the dock, the dock whole below it', () => {
    // Its own rule, not the padding it shares with the screen backdrop.
    const r = rule('\n.nrl-dialog-region');
    expect(r).toContain('top: var(--nrl-hud-h');
    expect(r).toContain('bottom: var(--nrl-nav-h');
  });
  it('caps the card to the region', () => {
    expect(rule('.nrl-dialog-region .nrl-modal')).toContain('max-height: 100%');
  });
  it("pins the player page's actions to the foot of its column, on screen without scrolling (3f)", () => {
    const r = rule('.nrl-player-actions', PLAYER_CSS);
    expect(r).toContain('position: sticky');
    expect(r).toMatch(/bottom: (0;|-?[\d.]+rem)/);
    expect(r).toContain('background');
    expect(r).toContain('z-index');
    expect(r).toContain('margin-top: auto'); // pushed to the column's foot
    expect(r).toContain('flex: 0 0 auto'); // never squeezed out
    // The column holding them does not scroll (only the middle one does), so they are always in view.
    const side = rule('.nrl-player-card, .nrl-player-side', PLAYER_CSS);
    expect(side).toContain('overflow: hidden');
    expect(side).toContain('min-height: 0');
    expect(rule('.nrl-player-about', PLAYER_CSS)).toContain('overflow-y: auto');
  });
  it('has one close, ◂ back, and no Close in the action row (#349 A5)', () => {
    expect(CSS + PLAYER_CSS).not.toContain('.nrl-player-close');
  });
});

describe('the ▾ menu over a region dialog (#350)', () => {
  const z = (r: string): number => Number(/z-index: (\d+)/.exec(r)?.[1]);
  it('lifts the dock above the dialog while the menu is open, and only then', () => {
    // The dock's wrap is a stacking context below dialogs: the menu's own z-index cannot climb out of it.
    expect(z(rule('\n.nrl-dock-wrap'))).toBeLessThan(z(rule('\n.nrl-modal-backdrop')));
    expect(z(rule('.nrl-dock-wrap:has(.nrl-hud-menu:not([hidden]))'))).toBeGreaterThan(z(rule('\n.nrl-modal-backdrop')));
  });
});
