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
    // The install hint adds --nrl-toast-lift (0 unless that toast is up, #434).
    expect(r).toContain('bottom: calc(var(--nrl-nav-h, 0px) + var(--nrl-toast-lift, 0px))');
  });
  it('caps the card to the region', () => {
    expect(rule('.nrl-dialog-region .nrl-modal')).toContain('max-height: 100%');
  });
  it("pins the player page's actions to its foot, on screen without scrolling (3f)", () => {
    // SuperCOOKED 35–37: header, tabs, the tab's page, its foot. The page scrolls on its own when its
    // words outgrow it (#415); the foot, which holds the deals on the Deal tab, never does.
    expect(rule('.nrl-player > *', PLAYER_CSS)).toContain('flex: 0 0 auto'); // the foot is never squeezed out
    const panel = rule('.nrl-player-panel', PLAYER_CSS);
    expect(panel).toContain('overflow-y: auto');
    expect(panel).toContain('min-height: 0');
    expect(panel).toContain('flex: 1 1 auto');
    expect(rule('.nrl-player-actions', PLAYER_CSS)).toContain('flex: 0 0 auto');
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
