// tests/ui/squadPlace.test.ts — the squad screens keep their place (#614): Lineup's
// list goes back to its top when another spot is picked, AUTO PICK says what it did,
// the player page's columns keep their scroll through a redraw, and a row's trait
// chips fold into "+n" rather than squeeze the name. The stand-in DOM has no layout:
// what a row's cell has room for (fitChips) is measured in the browser, not here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from './stubDom';
import { bus } from '../../src/core/events';
import { createNewGame, getState, type Player, type TraitInstance } from '../../src/core/state';
import * as saves from '../../src/core/save';
import * as portraits from '../../src/art/portrait';
import { closeModal, closeScreen } from '../../src/ui/dom';
import { initLeague } from '../../src/systems/fixtures';
import { autoPickKeepingPlan, commitLineup, swapSpots } from '../../src/systems/lineup';
import { autoPickNote, openLineupScreen } from '../../src/ui/screens/lineup';
import { openPlayerPage } from '../../src/ui/screens/player';
import { CHIPS_SHOWN, foldTraits, moreTraits, traitChips } from '../../src/ui/screens/recruit';
import { openSquadScreen } from '../../src/ui/screens/squad';

type Scroller = StubNode & { scrollTop?: number };
const body = (): StubNode => document.body as unknown as StubNode;
const q = (sel: string): Scroller => {
  const node = body().querySelector(sel);
  expect(node, sel).not.toBeNull();
  return node!;
};

beforeEach(() => {
  bus.clear(); stubDocument();
  createNewGame('Place FC', 614); initLeague(getState());
  vi.spyOn(saves, 'save').mockImplementation(() => {});
  vi.spyOn(portraits, 'portraitDataUrl').mockReturnValue('');
  // The rename field focuses its box in a microtask; the stand-in box has nothing to select.
  vi.stubGlobal('queueMicrotask', () => {});
});
afterEach(() => { closeModal(); closeScreen(); bus.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Lineup’s list (#614)', () => {
  it('goes back to its top when another spot is picked, and stays put while the same one is', () => {
    openLineupScreen();
    const list = q('.nrl-lineup-list');
    list.scrollTop = 400;
    q('[data-spot="s7"]').click(); // the prop: the list is sorted for him now
    expect(list.scrollTop).toBe(0);
    list.scrollTop = 200;
    q('[data-make-captain]').click(); // the same slot, drawn again
    expect(getState().lineup.captain).toBe(getState().lineup.starters[7]);
    expect(list.scrollTop).toBe(200);
    q('[data-spot="b0"]').click(); // swapped with a bench seat: nothing picked now, the list in overall order
    expect(list.scrollTop).toBe(0);
    list.scrollTop = 120;
    bus.emit('state:changed', getState()); // an injury, a signing: nothing picked before or after
    expect(list.scrollTop).toBe(120);
  });
});

describe('AUTO PICK’s toast (#614)', () => {
  it('words nothing changed, one change and several', () => {
    expect(autoPickNote(0)).toBe('Already your best side.');
    expect(autoPickNote(1)).toBe('Auto pick: 1 change.');
    expect(autoPickNote(3)).toBe('Auto pick: 3 changes.');
  });
  it('says so on a side already the best, and counts the spots it changed on one that is not', () => {
    const texts: string[] = [];
    bus.on('ui:notify', (n) => texts.push(n.text));
    commitLineup(autoPickKeepingPlan(getState().squad, getState().lineup));
    const best = getState().lineup;
    openLineupScreen();
    q('[data-auto-pick]').click();
    expect(texts).toEqual(['Already your best side.']);
    expect(getState().lineup).toEqual(best);
    // The fullback and the prop swapped, and a starter sent to the bench: four spots are not the best any more.
    commitLineup(swapSpots(swapSpots(best, { kind: 'starter', slot: 0 }, { kind: 'starter', slot: 7 }), { kind: 'starter', slot: 1 }, { kind: 'bench', index: 0 }));
    q('[data-auto-pick]').click();
    expect(texts).toEqual(['Already your best side.', 'Auto pick: 4 changes.']);
    expect(getState().lineup).toEqual(best);
  });
});

describe('the player page’s columns (#614)', () => {
  it('keep their scroll through CAPTAIN, an armed Sell and Rename', () => {
    const id = getState().lineup.starters[3]!;
    openPlayerPage(getState().squad.find((p) => p.id === id)!, { kind: 'squad' });
    const page = q('[data-player-page]');
    const cols = (): Scroller[] => page.children;
    const scrolled = [27, 150, 20]; // the card, the stats and traits, the jobs and deals
    const scroll = (): void => cols().forEach((c, i) => { c.scrollTop = scrolled[i]!; });
    expect(cols().map((c) => c.className.split(' ').pop())).toEqual(['nrl-player-card', 'nrl-player-about', 'nrl-player-side']);
    for (const redraw of ['[data-player-role="captain"]', '[data-player-action="sell"]', '[data-rename-open]']) {
      const before = cols();
      scroll();
      q(redraw).click();
      expect(cols()[0], redraw).not.toBe(before[0]); // drawn again
      expect(cols().map((c) => c.scrollTop), redraw).toEqual(scrolled);
    }
    expect(getState().lineup.captain).toBe(id);
    expect(q('[data-player-action="sell"]').textContent).toBe('Really sell?');
    expect(page.querySelector('[data-player-rename]')).not.toBeNull();
  });
});

describe('a row’s trait chips (#614)', () => {
  const TRAITS4: TraitInstance[] = [{ id: 'dancingFeet', level: 1 }, { id: 'jets', level: 2 }, { id: 'finisher', level: 1 }, { id: 'workhorse', level: 3 }];
  const man = (traits: TraitInstance[]): Player => ({ ...getState().squad[0]!, traits });
  const more = (chips: StubNode[]): StubNode => chips.find((c) => c.hasAttribute('data-trait-more'))!;

  it('foldTraits shows the first two and folds the rest; fewer where there is less room', () => {
    expect(CHIPS_SHOWN).toBe(2);
    expect(foldTraits(['a', 'b', 'c', 'd'])).toEqual({ shown: ['a', 'b'], folded: ['c', 'd'] });
    expect(foldTraits(['a', 'b'])).toEqual({ shown: ['a', 'b'], folded: [] });
    expect(foldTraits(['a'])).toEqual({ shown: ['a'], folded: [] });
    expect(foldTraits([])).toEqual({ shown: [], folded: [] });
    expect(foldTraits(['a', 'b', 'c'], 1)).toEqual({ shown: ['a'], folded: ['b', 'c'] });
    expect(foldTraits(['a', 'b', 'c'], 0)).toEqual({ shown: [], folded: ['a', 'b', 'c'] });
    expect(foldTraits(['a'], -1)).toEqual({ shown: [], folded: ['a'] });
  });
  it('moreTraits counts the folded ones and names them', () => {
    expect(moreTraits(['Finisher I', 'Workhorse III'], 2)).toEqual({ label: '+2', tip: '2 more traits: Finisher I, Workhorse III' });
    expect(moreTraits(['Workhorse III'], 1)).toEqual({ label: '+1', tip: '1 more trait: Workhorse III' });
    // No chip left showing beside it (a long name, a larger text size): they are not "more" than any.
    expect(moreTraits(['Jets II', 'Finisher I'], 0)).toEqual({ label: '+2', tip: '2 traits: Jets II, Finisher I' });
    expect(moreTraits(['Jets II'], 0)).toEqual({ label: '+1', tip: '1 trait: Jets II' });
  });
  it('four traits: two chips and a "+2" that names the other two for a tip and a screen reader', () => {
    const chips = traitChips(man(TRAITS4)) as unknown as StubNode[];
    const traits = chips.filter((c) => c.hasAttribute('data-trait'));
    expect(traits.map((c) => c.textContent)).toEqual(['Dancing Feet I', 'Jets II', 'Finisher I', 'Workhorse III']);
    expect(traits.map((c) => c.hidden)).toEqual([false, false, true, true]);
    expect(more(chips).hidden).toBe(false);
    expect(more(chips).textContent).toBe('+2');
    expect(more(chips).attrs.title).toBe('2 more traits: Finisher I, Workhorse III');
    expect(more(chips).attrs['aria-label']).toBe(more(chips).attrs.title);
    expect(more(chips).className).toBe('nrl-chip');
  });
  it('a folded trait with a downside tints the "+n" as its own chip would be', () => {
    const chips = traitChips(man([...TRAITS4.slice(0, 2), { id: 'hothead', level: 1 }])) as unknown as StubNode[];
    expect(more(chips).textContent).toBe('+1');
    expect(more(chips).className.split(' ')).toContain('nrl-chip-bad');
  });
  it('one or two traits show whole with no "+n"; no traits, no chips', () => {
    const two = traitChips(man(TRAITS4.slice(0, 2))) as unknown as StubNode[];
    expect(two.filter((c) => !c.hidden).map((c) => c.textContent)).toEqual(['Dancing Feet I', 'Jets II']);
    expect(more(two).hidden).toBe(true);
    expect(traitChips(man([]))).toEqual([]);
  });
  it('the Squad list builds every row with its name first and its chips after', () => {
    getState().squad[0]!.traits = TRAITS4;
    openSquadScreen();
    const who = q(`[data-row-player="${getState().squad[0]!.id}"]`).querySelector('.nrl-row-who')!;
    expect(who.children[0]!.className).toBe('nrl-row-name');
    expect(who.children[0]!.textContent).toBe(getState().squad[0]!.name);
    expect(who.querySelectorAll('[data-trait]').filter((c) => !c.hidden)).toHaveLength(CHIPS_SHOWN);
    expect(who.querySelector('[data-trait-more]')!.textContent).toBe('+2');
  });
});
