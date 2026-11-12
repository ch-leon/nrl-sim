// #206: on an iPhone in Safari (landscape) the tutorial bubble was blown up 2.17×
// and Skip / Next sat off the bottom, so a new game could not start. The layout
// itself is checked in WebKit by scripts/e2e-webkit.mjs (npm run e2e:webkit);
// these pin the CSS that makes it hold, since the vitest environment has no layout.
import { describe, it, expect, beforeAll } from 'vitest';
import { TUTORIAL_CSS } from '../../src/ui/tutorial';
import { CSS } from '../../src/ui/dom';
import { OVERLAY_CSS } from '../../src/ui/screens/matchOverlay';

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const i = css.indexOf(`${selector} {`);
  expect(i, `${selector} rule`).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
}

/** index.html's text. No @types/node in the tsconfig (see tests/fx/pwa.test.ts), so fs comes in untyped. */
async function indexHtml(): Promise<string> {
  const dynamicImport: (s: string) => Promise<{ readFileSync(p: string, enc: string): string }> = (s) => import(/* @vite-ignore */ s);
  return (await dynamicImport('node:fs')).readFileSync('index.html', 'utf8');
}

describe('index.html (#206)', () => {
  let html = '';
  beforeAll(async () => { html = await indexHtml(); });
  it('turns off iOS Safari text autosizing', () => {
    expect(html).toMatch(/html\s*\{[^}]*-webkit-text-size-adjust:\s*100%/);
    expect(html).toMatch(/html\s*\{[^}]*[^-]text-size-adjust:\s*100%/);
  });
  it('keeps the viewport at scale 1 across a rotation', () => {
    expect(html).toMatch(/name="viewport"[^>]*maximum-scale=1/);
  });
});

describe('tutorial bubble fits the viewport (#206)', () => {
  it('caps its height to the dynamic viewport, with a vh fallback first', () => {
    const bubble = rule(TUTORIAL_CSS, '.nrl-tutorial-bubble');
    expect(bubble).toMatch(/max-height: calc\(100vh[^;]*;\s*max-height: calc\(100dvh/);
    expect(bubble).toContain('flex-direction: column');
    expect(rule(TUTORIAL_CSS, '.nrl-tutorial-centered')).toContain('100dvh');
  });
  it('scrolls the copy and never shrinks Skip / Next', () => {
    const text = rule(TUTORIAL_CSS, '.nrl-tutorial-text');
    expect(text).toContain('overflow-y: auto');
    expect(text).toContain('min-height: 0');
    expect(rule(TUTORIAL_CSS, '.nrl-tutorial-actions')).toContain('flex: 0 0 auto');
  });
  it('the landscape-phone dock keeps a height cap too', () => {
    const block = TUTORIAL_CSS.slice(TUTORIAL_CSS.indexOf('@media (max-height: 500px)'));
    expect(block).toContain('max-height: calc(100dvh');
  });
  it('the landscape-phone dock is wide enough for every step unscrolled (#208)', () => {
    const block = TUTORIAL_CSS.slice(TUTORIAL_CSS.indexOf('@media (max-height: 500px)'));
    expect(block).toContain('max-width: min(60vw, 300px)');
  });
});

describe('Guide keeps its foot in view (#206)', () => {
  it('scrolls only the page between the tabs and the foot', () => {
    expect(rule(CSS, '.nrl-guide-body')).toContain('overflow-y: auto');
    expect(rule(CSS, '.nrl-guide-tabs, .nrl-guide-foot')).toContain('flex: 0 0 auto');
  });
  it('dialogs cap at the dynamic viewport', () => {
    expect(rule(CSS, '.nrl-modal')).toContain('max-height: 85dvh');
  });
});

// #609: the same in the match. With Safari's toolbars up, 100vh is the height without them,
// so the stats sheet ran under COACH and LOG and its last rows could not be reached.
describe('the match sheets fit the viewport (#609)', () => {
  it.each(['.nrl-mo-statsheet', '.nrl-mo-tray'])('%s caps its height to the dynamic viewport, with a vh fallback first', (sel) => {
    const sheet = rule(OVERLAY_CSS, sel);
    expect(sheet).toMatch(/max-height: calc\(100vh[^;]*;\s*max-height: calc\(100dvh/);
    expect(sheet).toContain('overflow-y: auto');
    // A drag past its end stays in the sheet.
    expect(sheet).toContain('overscroll-behavior: contain');
  });
});

// #609: iOS Safari zooms the page into a field whose text is under 16px, and stays zoomed.
// `#ui-root input { font: inherit; }` out-ranks a field's own font-size, so the floor sits beside it.
describe('fields you type in are 16px at the least (#609)', () => {
  it('sets the floor after the inherit rule, in rem so Text size still scales it', () => {
    const inherit = CSS.indexOf('#ui-root input, #ui-root select, #ui-root textarea { font: inherit; }');
    const floor = CSS.indexOf('{ font-size: max(1rem, 16px); }');
    expect(inherit).toBeGreaterThanOrEqual(0);
    expect(floor).toBeGreaterThan(inherit);
    const selector = CSS.slice(CSS.lastIndexOf('\n', floor) + 1, floor);
    for (const field of ['[type="text"]', '[type="search"]', '[type="number"]', 'input:not([type])', 'textarea', 'select']) expect(selector).toContain(field);
    // The match lab's dense panel keeps its own small fields.
    expect(selector).toContain(':not(.nrl-lab *)');
  });
});
