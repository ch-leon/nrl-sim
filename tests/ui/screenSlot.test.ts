import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScreenSlot, HUD_INSET_VAR, NAV_INSET_VAR, CSS, SCREEN_SWAP_ATTR, closeScreen, el, openModal, openScreen } from '../../src/ui/dom';
import { createNav } from '../../src/ui/nav';
import { stubDocument, StubNode } from './stubDom';

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

// #605: every tab and segment switch replayed the sheet's rise from nothing, so the grounds
// flashed through between two sheets. What the browser draws is measured in the running game
// (and in WebKit by scripts/e2e-webkit's sheet-swap step); these pin which sheets carry the
// mark the stylesheet reads.
describe("a sheet taking another's place has no entrance (#605)", () => {
  // The stub DOM has no timeline: this stands in for its clock, which a browser holds still
  // through a tap's handlers and moves on with the frames.
  let clock: { currentTime: number | null };
  const nextFrame = (): void => { clock.currentTime = (clock.currentTime ?? 0) + 16; };
  beforeEach(() => {
    stubDocument();
    clock = { currentTime: 1000 };
    (document as unknown as { timeline?: typeof clock }).timeline = clock;
  });
  afterEach(() => { closeScreen(); vi.unstubAllGlobals(); });

  const open = (key: string): HTMLElement => openScreen(el('div'), undefined, key);
  const swapped = (sheet: HTMLElement): boolean => sheet.hasAttribute(SCREEN_SWAP_ATTR);

  it('marks the sheet that replaces an open one, not one opened on the bare grounds', () => {
    const squad = open('squad');
    expect(swapped(squad)).toBe(false);
    nextFrame();
    const league = open('fixtures');
    expect(swapped(league)).toBe(true);
    expect(league.getAttribute('data-screen-key')).toBe('fixtures'); // the key the e2e selectors use stays
    // A framed sheet (News, the Guide, a lazy screen's "Loading…") goes through the same slot.
    nextFrame();
    expect(swapped(openModal(el('div'), { screen: true, key: 'news' }))).toBe(true);
  });

  it('does not stick: closed to the grounds, the next sheet rises again', () => {
    open('squad');
    open('lineup');
    closeScreen();
    nextFrame();
    expect(swapped(open('squad'))).toBe(false);
  });

  it('a screen that closes before it opens the next still swaps (History ◂ back), in that turn only', () => {
    open('history');
    nextFrame();
    closeScreen();
    expect(swapped(open('history'))).toBe(true);
    closeScreen();
    nextFrame(); // the grounds were seen bare
    expect(swapped(open('history'))).toBe(false);
  });

  it('with no clock to tell the turn by, only a sheet still up counts', () => {
    for (const none of [null, undefined]) {
      if (none === null) clock.currentTime = null; // a document with no timeline running
      else delete (document as unknown as { timeline?: typeof clock }).timeline;
      open('squad');
      expect(swapped(open('recruit'))).toBe(true);
      closeScreen();
      expect(swapped(open('squad'))).toBe(false);
      closeScreen();
    }
  });

  it("Office's tiles count as a sheet: a tile's sheet swaps in, a tab's on the bare grounds rises", () => {
    const nav = createNav();
    let sheet: HTMLElement | null = null;
    nav.registerScreen('squad', 'Squad', () => { sheet = open('squad'); });
    nav.registerScreen('finance', 'Finance', () => { sheet = open('finance'); }, { more: true });
    const body = document.body as unknown as StubNode;
    const tap = (sel: string): void => { nextFrame(); body.querySelector(sel)!.click(); };

    tap('[data-screen="squad"]');
    expect(swapped(sheet!)).toBe(false);
    tap('[data-nav-more]'); // Office closes Squad and shows its tiles
    tap('[data-screen="finance"]');
    expect(sheet!.getAttribute('data-screen-key')).toBe('finance');
    expect(swapped(sheet!)).toBe(true);

    // Office closed back to the grounds (its tab again), then a tab: a fresh open.
    tap('[data-nav-more]');
    tap('[data-nav-more]');
    tap('[data-screen="squad"]');
    expect(swapped(sheet!)).toBe(false);
    nav.destroy();
  });

  it('the stylesheet switches the rise off on the mark, and nowhere else on a sheet', () => {
    expect(SCREEN_SWAP_ATTR).toBe('data-swap');
    expect(CSS).toContain(`.nrl-screen-region[${SCREEN_SWAP_ATTR}] { animation: none; }`);
    const sheet = CSS.slice(CSS.indexOf('\n.nrl-screen-region {'), CSS.indexOf('}', CSS.indexOf('\n.nrl-screen-region {')));
    expect(sheet).toContain('animation: nrl-sheet-up var(--nrl-dur-sheet) var(--nrl-ease-out)');
  });
});
