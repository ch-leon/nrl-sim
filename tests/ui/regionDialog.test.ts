// #203: on a landscape phone the player page was a viewport dialog centred over
// the nav, with Renew / Sell / Close below the screen. It is now a region dialog
// (between HUD and nav) with a ✕ and its actions pinned. Layout is checked in
// WebKit by scripts/e2e-webkit.mjs; these pin the CSS, since vitest has no layout.
import { describe, it, expect } from 'vitest';
import { CSS } from '../../src/ui/dom';

/** The declarations of the first rule whose selector (or selector list) ends with `selector`. */
function rule(selector: string): string {
  const i = CSS.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return CSS.slice(i, CSS.indexOf('}', i));
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
  it("pins the player page's actions to the foot of the card", () => {
    const r = rule('.nrl-player-actions');
    expect(r).toContain('position: sticky');
    expect(r).toMatch(/bottom: (0;|-?[\d.]+rem)/);
    expect(r).toContain('background');
    expect(r).toContain('z-index');
  });
  it('has one close, the ✕ in the corner, and no Close in the action row (#349 A5)', () => {
    expect(CSS).not.toContain('.nrl-player-close');
  });
});
