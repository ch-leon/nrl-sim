// tests/ui/dialogEnter.test.ts — a dialog's entrance (#606): the dim fades, the card grows
// from --nrl-pop, and a dialog that takes another's place is marked data-swap and cuts in.
// What a browser does with the rules is measured in the running game; vitest has no layout,
// so these pin the flag openModal sets and the CSS that reads it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CSS, closeModal, dialogOpen, openModal } from '../../src/ui/dom';
import { BUILD_CSS } from '../../src/ui/screens/build';
import { stubDocument } from './stubDom';

/** The frame callbacks waiting to run; `frame()` draws the next frame. */
let frames: (() => void)[] = [];
const frame = (): void => { for (const fn of frames.splice(0)) fn(); };
const dialog = (opts: Parameters<typeof openModal>[1] = {}): HTMLElement => openModal(document.createElement('div'), opts);
const swapped = (node: HTMLElement): boolean => node.hasAttribute('data-swap');

describe('openModal marks a dialog that takes another\'s place (#606)', () => {
  beforeEach(() => {
    stubDocument();
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { frames.push(fn); return frames.length; });
  });
  afterEach(() => {
    closeModal();
    frame();
    vi.unstubAllGlobals();
  });

  it('a dialog opened over nothing comes in', () => {
    expect(swapped(dialog())).toBe(false);
    closeModal();
    frame();
    expect(swapped(dialog({ region: true, closeButton: true }))).toBe(false);
  });

  it('a dialog opened over an open dialog is a swap ("Answer now" to the decision card)', () => {
    const ask = dialog({ region: true });
    const card = dialog({ region: true });
    expect(swapped(ask)).toBe(false);
    expect(swapped(card)).toBe(true);
    expect(ask.isConnected).toBe(false);
    expect(dialogOpen()).toBe(true);
  });

  it('a dialog opened in the frame another closed in is a swap too (back from a rival\'s player to his squad)', () => {
    dialog();
    closeModal();
    expect(swapped(dialog())).toBe(true);
  });

  it('once a frame has been drawn with no dialog up, the next one comes in', () => {
    dialog();
    closeModal();
    frame();
    expect(swapped(dialog())).toBe(false);
    // And one that was swapped in does not leave the flag behind it.
    const second = dialog();
    expect(swapped(second)).toBe(true);
    closeModal();
    frame();
    expect(swapped(dialog())).toBe(false);
  });

  it('closing with nothing open marks nothing', () => {
    closeModal();
    expect(frames).toHaveLength(0);
    expect(swapped(dialog())).toBe(false);
  });

  it('a dialog taken off the page by something else is not one to swap with', () => {
    dialog().remove();
    expect(dialogOpen()).toBe(false);
    expect(swapped(dialog())).toBe(false);
  });

  it('cut: true marks a dialog that takes no entrance (the player page, the facility popup)', () => {
    expect(dialog().hasAttribute('data-cut')).toBe(false);
    closeModal();
    frame();
    const page = dialog({ region: true, cut: true });
    expect(page.hasAttribute('data-cut')).toBe(true);
    expect(swapped(page)).toBe(false);
  });
});

describe('the entrance rules (#606)', () => {
  const ENTERS = '.nrl-modal-backdrop:not(.nrl-screen-backdrop):not([data-swap]):not([data-cut])';

  it('the dim fades and the card grows from --nrl-pop, in the fast time', () => {
    expect(CSS).toContain(`${ENTERS} { animation: nrl-fade-in var(--nrl-dur-fast) var(--nrl-ease-out); }`);
    expect(CSS).toContain(`${ENTERS} > .nrl-modal { animation: nrl-pop-in var(--nrl-dur-fast) var(--nrl-ease-out); }`);
    expect(CSS).toContain('@keyframes nrl-fade-in { from { opacity: 0; } }');
    // No opacity of its own (it fades with the dim it sits in) and no scale but the token's,
    // so the one reduced-motion rule leaves a fade.
    expect(CSS).toContain('@keyframes nrl-pop-in { from { transform: scale(var(--nrl-pop)); } }');
  });

  it('the facility popup, opened with cut, keeps the one rise it had', () => {
    const card = BUILD_CSS.slice(BUILD_CSS.indexOf('.nrl-facility-backdrop .nrl-modal.nrl-facility-modal {'));
    expect(card.slice(0, card.indexOf('}'))).toContain('animation: nrl-sheet-up var(--nrl-dur-sheet) var(--nrl-ease-out);');
  });

  it('the ▾ menu comes out of its button: bottom right, the same fade and scale', () => {
    const menu = CSS.slice(CSS.indexOf('\n.nrl-hud-menu {'), CSS.indexOf('.nrl-hud-menu[hidden]'));
    expect(menu).toContain('transform-origin: bottom right;');
    expect(menu).toContain('animation: nrl-fade-in var(--nrl-dur-fast) var(--nrl-ease-out), nrl-pop-in var(--nrl-dur-fast) var(--nrl-ease-out);');
    // Shown and hidden by display, which starts the entrance again and makes closing a cut.
    expect(CSS).toContain('.nrl-hud-menu[hidden] { display: none; }');
  });

  it("Office's dim fades in with its sheet", () => {
    const dim = CSS.slice(CSS.indexOf('\n.nrl-office-dim {'), CSS.indexOf('.nrl-office-dim[hidden]'));
    expect(dim).toContain('animation: nrl-fade-in var(--nrl-dur-sheet) var(--nrl-ease-out);');
    expect(CSS).toContain('.nrl-office-dim[hidden], .nrl-nav-sheet[hidden] { display: none; }');
  });
});

// #617: a page that holds something open (the player page's armed Sell) is told when any route closes it.
describe('openModal onRemove (#617)', () => {
  beforeEach(() => { stubDocument(); vi.stubGlobal('requestAnimationFrame', () => 0); });
  afterEach(() => { closeModal(); vi.unstubAllGlobals(); });

  it('runs once when closeModal takes the dialog down, and when another dialog opens over it', () => {
    const gone = vi.fn();
    dialog({ region: true, onRemove: gone });
    expect(gone).not.toHaveBeenCalled();
    closeModal();
    closeModal();
    expect(gone).toHaveBeenCalledTimes(1);
    const swapped = vi.fn();
    dialog({ onRemove: swapped });
    dialog();
    expect(swapped).toHaveBeenCalledTimes(1);
  });

  it('is not carried to the next dialog', () => {
    const gone = vi.fn();
    dialog({ onRemove: gone });
    dialog();
    closeModal();
    expect(gone).toHaveBeenCalledTimes(1);
  });
});
