// The title's layout is checked in WebKit by scripts/e2e-webkit.mjs (runFlow's T1 at 568×320);
// this pins the CSS, since vitest has no layout.
import { describe, it, expect } from 'vitest';
import { TITLE_CSS } from '../../src/ui/title';

describe('the build label (#350 T1)', () => {
  it('sits in the corner, and after the setup on an iPhone SE on its side, never over the panel', () => {
    expect(TITLE_CSS).toMatch(/\.nrl-title-build \{ position: fixed;/);
    const i = TITLE_CSS.indexOf('@media (max-width: 600px) and (orientation: landscape)');
    expect(i).toBeGreaterThan(0);
    expect(TITLE_CSS.slice(i, TITLE_CSS.indexOf('\n}', i))).toContain('.nrl-title-build { position: static;');
  });
});
