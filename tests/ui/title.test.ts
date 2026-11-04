// The title's layout is checked in WebKit by scripts/e2e-webkit.mjs (runFlow's T1 at 568×320);
// this pins the CSS, since vitest has no layout.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stubLocalStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from './stubDom';
import { TITLE_CSS, showTitleFlow } from '../../src/ui/title';

describe('the build label (#350 T1)', () => {
  it('sits in the corner, and after the setup on an iPhone SE on its side, never over the panel', () => {
    expect(TITLE_CSS).toMatch(/\.nrl-title-build \{ position: fixed;/);
    const i = TITLE_CSS.indexOf('@media (max-width: 600px) and (orientation: landscape)');
    expect(i).toBeGreaterThan(0);
    expect(TITLE_CSS.slice(i, TITLE_CSS.indexOf('\n}', i))).toContain('.nrl-title-build { position: static;');
  });
});


describe('optional coach name at setup (#475)', () => {
  beforeEach(() => { stubLocalStorage(); stubDocument(); });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['', undefined],
    ['   ', undefined],
    ['  Sam   Hale  ', 'Sam Hale'],
    ['Sam\u0000Hale', undefined],
    ['Sam\u0085Hale', undefined],
    ['S', undefined],
    ['S'.repeat(25), undefined],
  ])('starts with %j cleaned to %j without blocking Start', async (raw, expected) => {
    const root = new StubNode('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    const name = root.querySelector('[data-nrl-coachname]')!;
    expect(name).not.toBeNull();
    expect(name.getAttribute('placeholder')).toBe('Coach');
    expect(name.getAttribute('aria-label')).toBe('Your name');
    expect(name.className).toBe(root.querySelector('[data-nrl-clubname]')!.className);
    name.value = raw;
    root.querySelector('[data-nrl-start]')!.click();
    const choice = await result;
    expect(choice.mode).toBe('new');
    expect(choice.coachName).toBe(expected);
    if (expected === undefined) expect(choice).not.toHaveProperty('coachName');
  });
});
