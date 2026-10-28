// tests/ui/rivalClubEditor.test.ts — the rival club editor (#398, #401 review), built in
// the stand-in DOM (tests/ui/stubDom.ts). A swatch tap draws the editor again; the name
// box must never take focus itself, or a phone's keyboard comes up over the swatches.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { RivalClub } from '../../src/core/state';
import { rivalClubEditor, type ClubDraft } from '../../src/ui/screens/rivalSquad';
import { nameField } from '../../src/ui/rename';
import { StubNode, stubDocument } from './stubDom';

let focusQueued: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubDocument();
  // nameField focuses its box in a microtask; count the times it asks.
  focusQueued = vi.fn();
  vi.stubGlobal('queueMicrotask', focusQueued);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const club: RivalClub = { id: 'rival-wolves', name: 'Woolloomooloo Wolves', colors: ['#37474f', '#b0bec5'], strength: 60 };

/** The editor as the sheet holds it: each change draws it again from the same draft. */
function openEditor(d: ClubDraft): { box: () => StubNode; draws: () => number } {
  let draws = 1;
  let box: StubNode;
  const on = {
    changed: () => { draws++; box = rivalClubEditor(club, d, on) as unknown as StubNode; },
    cancel: () => {},
    save: () => null,
  };
  box = rivalClubEditor(club, d, on) as unknown as StubNode;
  return { box: () => box, draws: () => draws };
}

describe('the rival club editor (#398)', () => {
  it('never puts the focus in the name box, opening or after a jersey or trim tap', () => {
    const d: ClubDraft = { name: club.name, colors: [club.colors[0], club.colors[1]] };
    const ed = openEditor(d);
    expect(ed.box().querySelector('[data-rival-rename]')).not.toBeNull();

    ed.box().querySelector('[data-rival-jersey="#16a0b8"]')!.click();
    expect(d.colors[0]).toBe('#16a0b8');
    const trim = ed.box().querySelectorAll('[data-rival-trim]').find((b) => b.attrs['data-rival-trim'] !== d.colors[1])!;
    trim.click();
    expect(d.colors[1]).toBe(trim.attrs['data-rival-trim']);

    expect(ed.draws()).toBe(3);
    expect(focusQueued).not.toHaveBeenCalled();
  });

  it('keeps the typed name across a swatch tap', () => {
    const d: ClubDraft = { name: club.name, colors: [club.colors[0], club.colors[1]] };
    const ed = openEditor(d);
    const box = ed.box().querySelector('[data-rival-rename]')!;
    box.value = 'Woolloomooloo Whalers';
    for (const fn of (box as unknown as { listeners: Record<string, (() => void)[]> }).listeners.input ?? []) fn();
    ed.box().querySelector('[data-rival-jersey="#16a0b8"]')!.click();
    expect(ed.box().querySelector('[data-rival-rename]')!.value).toBe('Woolloomooloo Whalers');
  });

  it('(the check sees a field that does take focus)', () => {
    nameField({ value: 'x', label: 'Name', onSave: () => null });
    expect(focusQueued).toHaveBeenCalledTimes(1);
  });
});
