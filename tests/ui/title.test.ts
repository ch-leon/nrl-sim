// The title's layout is checked in WebKit by scripts/e2e-webkit.mjs (runFlow's T1 at 568×320);
// this pins the CSS, since vitest has no layout.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stubLocalStorage } from '../commercial/memStorage';
import { StubNode, stubDocument } from './stubDom';
import { DIFFICULTY_BLURB, TITLE_CSS, showTitleFlow } from '../../src/ui/title';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY } from '../../src/config';
import { deleteSlot, writeSlot } from '../../src/core/save';
import { createNewGame } from '../../src/core/state';

describe('the build label (#350 T1)', () => {
  it('sits in the corner, and after the setup on an iPhone SE on its side, never over the panel', () => {
    expect(TITLE_CSS).toMatch(/\.nrl-title-build \{ position: fixed;/);
    const i = TITLE_CSS.indexOf('@media (max-width: 600px) and (orientation: landscape)');
    expect(i).toBeGreaterThan(0);
    expect(TITLE_CSS.slice(i, TITLE_CSS.indexOf('\n}', i))).toContain('.nrl-title-build { position: static;');
  });
});

describe('difficulty guidance at setup (#480)', () => {
  beforeEach(() => { stubLocalStorage(); stubDocument(); });
  afterEach(() => vi.unstubAllGlobals());

  it('the blurb follows the selection and Start uses the selected difficulty', async () => {
    const root = new StubNode('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    for (const d of ['hard', 'easy', 'normal', 'hard'] as const) {
      root.querySelector(`[data-nrl-difficulty-${d}]`)!.click();
      expect(root.querySelector('[data-nrl-difficulty-blurb]')!.textContent).toBe(DIFFICULTY_BLURB[d]);
      for (const other of DIFFICULTIES) {
        expect(root.querySelector(`[data-nrl-difficulty-${other}]`)!.getAttribute('aria-pressed')).toBe(String(other === d));
      }
    }
    root.querySelector('[data-nrl-start]')!.click();
    expect((await result).difficulty).toBe('hard');
  });

  it('shows the first-career hint with no saves, while an untouched Start is still Normal', async () => {
    const root = new StubNode('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    expect(root.querySelector('[data-nrl-difficulty-hint]')!.textContent).toBe('First career? Start on Easy.');
    expect(DEFAULT_DIFFICULTY).toBe('normal');
    expect(root.querySelector('[data-nrl-difficulty-normal]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-nrl-difficulty-blurb]')!.textContent).toBe(DIFFICULTY_BLURB.normal);
    root.querySelector('[data-nrl-start]')!.click();
    expect((await result).difficulty).toBe('normal');
  });

  it.each([1, 2, 3])('hides the hint when slot %s has a career, then shows it after deletion', (slot) => {
    writeSlot(slot, createNewGame('Test club', 1));
    const root = new StubNode('div');
    void showTitleFlow(root as unknown as HTMLElement);
    const empty = slot === 1 ? 2 : 1;
    root.querySelector(`[data-nrl-new-${empty}]`)!.click();
    expect(root.querySelector('[data-nrl-difficulty-hint]')).toBeNull();
    root.querySelector('[data-nrl-back]')!.click();
    root.querySelector(`[data-nrl-new-${slot}]`)!.click();
    expect(root.querySelector('[data-nrl-difficulty-hint]')).toBeNull();
    deleteSlot(slot);
    root.querySelector('[data-nrl-back]')!.click();
    root.querySelector(`[data-nrl-new-${empty}]`)!.click();
    expect(root.querySelector('[data-nrl-difficulty-hint]')!.textContent).toBe('First career? Start on Easy.');
  });

  it('pins the blurb wording to the direction of the difficulty numbers', () => {
    expect(DIFFICULTY_BLURB).toEqual({
      easy: 'More money, cheaper wages, rivals a step slower.',
      normal: "The game as it's meant to be played.",
      hard: 'Less money, dearer wages, sharper rivals.',
    });
    expect(DIFFICULTY.easy.startingMoney).toBeGreaterThan(1);
    expect(DIFFICULTY.easy.wages).toBeLessThan(1);
    expect(DIFFICULTY.easy.rivalEdge).toBeLessThan(0);
    expect(DIFFICULTY.normal.startingMoney).toBe(1);
    expect(DIFFICULTY.normal.wages).toBe(1);
    expect(DIFFICULTY.normal.rivalEdge).toBe(0);
    expect(DIFFICULTY.hard.startingMoney).toBeLessThan(1);
    expect(DIFFICULTY.hard.wages).toBeGreaterThan(1);
    expect(DIFFICULTY.hard.rivalEdge).toBeGreaterThan(0);
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

describe('veteran skip (#481)', () => {
  beforeEach(() => { stubLocalStorage(); stubDocument(); });
  afterEach(() => vi.unstubAllGlobals());
  it.each([false, true])('passes openAll only when the toggle is checked (%s)', async (checked) => {
    const root = new StubNode('div');
    const result = showTitleFlow(root as unknown as HTMLElement);
    const toggle = root.querySelector('[data-nrl-open-all]')! as unknown as HTMLInputElement;
    expect(toggle.type).toBe('checkbox');
    toggle.checked = checked;
    root.querySelector('[data-nrl-start]')!.click();
    const choice = await result;
    expect(choice.openAll).toBe(checked ? true : undefined);
  });
});
