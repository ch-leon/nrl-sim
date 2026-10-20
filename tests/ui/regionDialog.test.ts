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
  it('sits between the HUD and the nav', () => {
    // Its own rule, not the padding it shares with the screen backdrop.
    const r = rule('\n.nrl-dialog-region');
    expect(r).toContain('top: var(--nrl-hud-h');
    expect(r).toContain('bottom: var(--nrl-nav-h');
  });
  it('caps the card to the region', () => {
    expect(rule('.nrl-dialog-region .nrl-modal')).toContain('max-height: calc(100% - 6px)');
  });
  it("pins the player page's actions to the foot of the card", () => {
    const r = rule('.nrl-player-actions');
    expect(r).toContain('position: sticky');
    expect(r).toMatch(/bottom: -?[\d.]+rem/);
    expect(r).toContain('background');
    expect(r).toContain('z-index');
  });
  it('a landscape phone puts Close in the action row', () => {
    const block = CSS.slice(CSS.indexOf('.nrl-modal-has-x .nrl-player-top'));
    expect(block).toMatch(/@media \(max-height: 500px\) \{\s*\.nrl-player-actions \.nrl-player-close \{ flex: 1 1 6rem; \}/);
  });
});
