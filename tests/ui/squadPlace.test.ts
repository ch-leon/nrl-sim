// tests/ui/squadPlace.test.ts — the squad screens keep their place (#614): Lineup's
// list goes back to its top when another spot is picked, AUTO PICK says what it did,
// the player page's columns keep their scroll through a redraw, and a row's trait
// chips fold into "+n" rather than squeeze the name. The stand-in DOM has no layout:
// what a row's cell has room for (fitChips) is measured in the browser, not here.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// The Squad views draw portraits (SuperCOOKED 30–31); the stand-in DOM has no canvas.
vi.mock('../../src/art/portrait', async original => ({ ...await original<typeof import('../../src/art/portrait')>(), portraitDataUrl: () => '' }));
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

describe('the swap list (#614)', () => {
  it('starts at its top for another spot, and stays put while the same one is drawn again', () => {
    openLineupScreen();
    // SuperCOOKED 32: Swap, then the card; the side panel lists who can go there.
    q('[data-swap-start]').click();
    q('[data-spot="s7"]').click(); // the prop: the list is sorted for him now
    expect(q('.nrl-swap-list').scrollTop ?? 0).toBe(0);
    q('.nrl-swap-list').scrollTop = 200;
    bus.emit('state:changed', getState()); // an injury, a signing: the same spot, drawn again
    expect(q('.nrl-swap-list').scrollTop).toBe(200);
    q('[data-swap-cancel]').click();
    q('[data-swap-start]').click();
    q('[data-spot="s5"]').click(); // another spot: back to the top, where the best man for it is
    expect(q('.nrl-swap-list').scrollTop ?? 0).toBe(0);
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

describe('the player page’s tab (#614)', () => {
  it('keeps its scroll through CAPTAIN and Rename; a sale preview cancels without changing the player', () => {
    const id = getState().lineup.starters[3]!;
    openPlayerPage(getState().squad.find((p) => p.id === id)!, { kind: 'squad' });
    const page = q('[data-player-page]');
    // SuperCOOKED 35–37: the header, the tabs, then the tab's page, which scrolls on its own.
    const panel = (): Scroller => page.querySelector('.nrl-player-panel') as Scroller;
    q('[data-player-tab="deal"]').click();
    expect(panel().getAttribute('data-player-panel')).toBe('deal');
    for (const redraw of ['[data-player-role="captain"]', '[data-rename-open]']) {
      const before = panel();
      before.scrollTop = 150;
      q(redraw).click();
      expect(panel(), redraw).not.toBe(before); // drawn again
      expect(panel().scrollTop, redraw).toBe(150);
    }
    expect(getState().lineup.captain).toBe(id);
    expect(q('[data-player-action="sell"]').textContent).toMatch(/^Sell \+/);
    const beforeSale = structuredClone(getState());
    q('[data-player-action="sell"]').click();
    expect(page.words()).toContain('Deal unchanged');
    expect(page.classList.contains('nrl-player-sale')).toBe(true);
    expect(page.querySelector('.nrl-player-panel')).toBeNull();
    q('[data-sale-cancel]').click();
    expect(getState()).toEqual(beforeSale);
    expect(page.querySelector('[data-player-rename]')).not.toBeNull();
  });
});

describe('player sale and history routes', () => {
  it('explicitly confirms an offer and returns once to the opening screen', () => {
    const id = getState().lineup.starters[3]!; const back = vi.fn();
    openPlayerPage(getState().squad.find(p => p.id === id)!, { kind: 'squad' }, { onClose: back });
    q('[data-player-tab="record"]').click(); // club history is on the Record tab (SuperCOOKED Phase 1)
    expect(q('[data-club-history]').words()).toContain(getState().clubName);
    q('[data-player-tab="deal"]').click(); // the deals are on the Deal tab
    q('[data-player-action="sell"]').click();
    const confirm = q('[data-sale-confirm]'); confirm.click(); confirm.click();
    expect(getState().squad.some(p => p.id === id)).toBe(false);
    expect(back).toHaveBeenCalledOnce();
    expect(body().querySelector('[data-player-page]')).toBeNull();
  });
  it('shows club history in rival and unsigned player pages', () => {
    const rival = getState().league.clubs.find(c => c.squad)!;
    openPlayerPage(rival.squad![0]!, { kind: 'rival', club: rival });
    q('[data-player-tab="record"]').click();
    expect(q('[data-club-history]').words()).toContain(rival.name);
    closeModal();
    openPlayerPage(getState().freeAgents[0]!, { kind: 'freeAgent' });
    q('[data-player-tab="record"]').click();
    expect(q('[data-club-history]').words()).toContain('No recorded club spells.');
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
    openSquadScreen('list'); // SuperCOOKED 31: the list view (the pitch is the default)
    const who = q(`[data-row-player="${getState().squad[0]!.id}"]`).querySelector('.nrl-row-who')!;
    expect(who.children[0]!.className).toBe('nrl-row-name');
    expect(who.children[0]!.textContent).toBe(getState().squad[0]!.name);
    expect(who.querySelectorAll('[data-trait]').filter((c) => !c.hidden)).toHaveLength(CHIPS_SHOWN);
    expect(who.querySelector('[data-trait-more]')!.textContent).toBe('+2');
  });
});
