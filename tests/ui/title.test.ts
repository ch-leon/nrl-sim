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

import { groundForTown } from '../../src/data/townSetup';

const fixture = vi.hoisted(() => [
  { id: '1', name: 'Exampleton', region: '01', country: 'AU', lat: -30, lon: 150, population: 6000, nickname: 'Wombats' },
  { id: '2', name: 'Sample Bay', region: '02', country: 'NZ', lat: -40, lon: 175, population: 7000, nickname: 'Otters' },
]);
vi.mock('../../src/data/towns.json', () => ({ default: fixture }));

class InputNode extends StubNode {
  events: Record<string, (() => void)[]> = {};
  override addEventListener(event: string, fn: () => void): void {
    super.addEventListener(event, fn);
    (this.events[event] ??= []).push(fn);
  }
  enter(value: string): void {
    this.value = value;
    for (const fn of this.events.input ?? []) fn();
  }
}
const settleTowns = async (): Promise<void> => { await vi.dynamicImportSettled(); };
beforeEach(() => {
  stubLocalStorage();
  stubDocument();
  // Native input events, on top of the same tiny DOM the other title tests use.
  document.createElement = ((tag: string) => new InputNode(tag)) as typeof document.createElement;
});
afterEach(() => vi.unstubAllGlobals());

describe('offline town setup (#485)', () => {
  it('preselects a listed town and starts with one tap and both names', async () => {
    const root = new StubNode('div');
    const choice = showTitleFlow(root as unknown as HTMLElement);
    await settleTowns();
    const town = root.querySelector('[data-nrl-town]')!;
    expect(town.value).toMatch(/Exampleton|Sample Bay/);
    const club = root.querySelector('[data-nrl-clubname]')!.value;
    const ground = root.querySelector('[data-nrl-groundname]')!.value;
    root.querySelector('[data-nrl-start]')!.click();
    const result = await choice;
    expect(result).toMatchObject({ mode: 'new', clubName: club, groundName: ground });
    expect(result.home?.lat).toBeDefined();
    expect(result.home?.lon).toBeDefined();
  });
  it('picking a town fills both names; edits survive Start', async () => {
    const root = new StubNode('div');
    const choice = showTitleFlow(root as unknown as HTMLElement);
    await settleTowns();
    (root.querySelector('[data-nrl-town]')! as InputNode).enter('Sample Bay, 02, NZ');
    expect(root.querySelector('[data-nrl-clubname]')!.value).toBe('Sample Bay Otters');
    expect(root.querySelector('[data-nrl-groundname]')!.value).toBe(groundForTown('Sample Bay', '2'));
    root.querySelector('[data-nrl-clubname]')!.value = 'My Club';
    root.querySelector('[data-nrl-groundname]')!.value = 'My Ground';
    root.querySelector('[data-nrl-start]')!.click();
    expect(await choice).toMatchObject({ clubName: 'My Club', groundName: 'My Ground', home: { town: 'Sample Bay', country: 'NZ', lat: -40, lon: 175 } });
  });
  it('typing an unlisted town starts without stale coordinates, region or country', async () => {
    const root = new StubNode('div');
    const choice = showTitleFlow(root as unknown as HTMLElement);
    await settleTowns();
    (root.querySelector('[data-nrl-town]')! as InputNode).enter('A New Place');
    expect(root.querySelector('[data-nrl-clubname]')!.value).toContain('A New Place');
    root.querySelector('[data-nrl-start]')!.click();
    expect((await choice).home).toEqual({ town: 'A New Place' });
  });
});
