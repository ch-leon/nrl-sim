// tests/ui/screens/leagueLive.test.ts — the League sheet while the week moves on
// under it (#603), on the stand-in DOM with a real league played through the real
// hooks (frames are run by hand): the ladder heading, the played counts and NEXT follow the week; the sheet
// is drawn at most once a frame; a column scrolled by hand stays put and one left
// alone follows its row; the fixtures toggle and an open next-match preview carry
// through; closing the sheet takes its listener and its waiting frame with it.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from '../stubDom';
import { createNewGame, getState, setState, type GameState } from '../../../src/core/state';
import { bus } from '../../../src/core/events';
import { advanceWeeks, clearSeasonHooks, clearTickHooks } from '../../../src/core/time';
import { registerAllSystems } from '../../../src/qa/soak';
import { initLeague } from '../../../src/systems/fixtures';
import { activeScreen, closeModal, closeScreen, dialogOpen } from '../../../src/ui/dom';
import { openFixturesScreen } from '../../../src/ui/screens/fixtures';

// The stand-in DOM has no layout. Enough of one for the sheet's scrolling: every
// row is 40 high, the fixtures list shows five of its rows, the ladder fits whole.
const ROW = 40;
const tops = new WeakMap<object, number>();
const isList = (n: StubNode): boolean => n.classList.contains('nrl-fixtures-list');
const indexIn = (n: StubNode): number => (n.parentNode ? n.parentNode.children.indexOf(n) : 0);
Object.defineProperties(StubNode.prototype, {
  scrollTop: { get(this: StubNode) { return tops.get(this) ?? 0; }, set(this: StubNode, v: number) { tops.set(this, v); } },
  scrollLeft: { value: 0, writable: true },
  scrollHeight: { get(this: StubNode) { return isList(this) ? this.children.length * ROW : 0; } },
  clientHeight: { get(this: StubNode) { return isList(this) ? 5 * ROW : 0; } },
  offsetHeight: { value: ROW },
  offsetTop: { get(this: StubNode) { return indexIn(this) * ROW; } },
  getBoundingClientRect: { value(this: StubNode) { return { top: indexIn(this) * ROW - (this.parentNode ? tops.get(this.parentNode) ?? 0 : 0) }; } },
});

/** A scroll box of the stand-in DOM, as the sheet sees it. */
type Box = StubNode & { scrollTop: number };

const body = (): StubNode => document.body as unknown as StubNode;
const q = (sel: string): StubNode => {
  const n = body().querySelector(sel);
  expect(n, sel).not.toBeNull();
  return n!;
};
const box = (sel: string): Box => q(sel) as Box;
const stateListeners = (): number =>
  (bus as unknown as { listeners: Map<string, Set<unknown>> }).listeners.get('state:changed')?.size ?? 0;

/** What the sheet says about the week: its heading, the club's games played, the round NEXT is. */
const reads = (): { heading: string; played: string; next: string | null } => ({
  heading: q('.nrl-ladder-heading').textContent,
  played: body().all().find((n) => n.tagName === 'TR' && n.attrs['data-player'] === 'true')!.children[2]!.textContent,
  next: body().querySelector('[data-next-row]')?.attrs['data-round'] ?? null,
});

// Frames by hand: nothing is drawn until runFrame().
let frames: Map<number, () => void>;
let frameId: number;
const runFrame = (): void => {
  const due = [...frames.values()];
  frames.clear();
  for (const fn of due) fn();
};

/** The League sheet, open and settled. */
function openLeague(): StubNode {
  const sheet = openFixturesScreen() as unknown as StubNode;
  runFrame();
  return sheet;
}

// A league three rounds in (the two trials, then rounds 1 to 3), played once through the real hooks.
let roundFour: GameState;
beforeAll(() => {
  bus.clear();
  setState(createNewGame('Live FC', 603));
  initLeague(getState());
  registerAllSystems();
  advanceWeeks(5);
  roundFour = structuredClone(getState());
  expect([roundFour.preseason, roundFour.week]).toEqual([0, 4]);
});

beforeEach(() => {
  bus.clear();
  stubDocument();
  frames = new Map();
  frameId = 0;
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => { frames.set(++frameId, fn); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  setState(structuredClone(roundFour));
  registerAllSystems();
});
afterEach(() => {
  closeModal();
  closeScreen();
  bus.clear();
  clearTickHooks();
  clearSeasonHooks();
  vi.unstubAllGlobals();
});

describe('the League sheet with the week moving on under it (#603)', () => {
  it('follows the week: the ladder heading, the played counts and NEXT, in the same open sheet', () => {
    const sheet = openLeague();
    const week = getState().week;
    expect(reads()).toEqual({ heading: `Ladder · after R${week - 1}`, played: String(week - 1), next: String(week) });

    advanceWeeks(4);
    runFrame();
    expect(getState().week).toBe(week + 4);
    expect(reads()).toEqual({ heading: `Ladder · after R${week + 3}`, played: String(week + 3), next: String(week + 4) });
    expect(activeScreen()).toBe(sheet);
    expect(sheet.isConnected).toBe(true);
  });

  it('draws once a frame, however many changes the weeks emit', () => {
    openLeague();
    const before = reads();
    const ladder = q('.nrl-ladder-scroll');
    let changes = 0;
    bus.on('state:changed', () => { changes++; });

    advanceWeeks(2);
    expect(changes).toBeGreaterThan(2);
    // Nothing drawn yet, and one frame asked for.
    expect(q('.nrl-ladder-scroll')).toBe(ladder);
    expect(reads()).toEqual(before);
    expect(frames.size).toBe(1);

    runFrame();
    expect(q('.nrl-ladder-scroll')).not.toBe(ladder);
    expect(reads()).not.toEqual(before);
    expect(frames.size).toBe(0);
  });

  it('keeps a column where the player scrolled it, and lets one he left alone follow NEXT', () => {
    openLeague();
    // Left alone: NEXT sits in the middle of the list's five rows.
    const settled = box('.nrl-fixtures-list').scrollTop;
    expect(settled).toBeGreaterThan(0);
    box('.nrl-ladder-scroll').scrollTop = 120;

    advanceWeeks(1);
    runFrame();
    expect(box('.nrl-ladder-scroll').scrollTop).toBe(120);
    expect(box('.nrl-fixtures-list').scrollTop).toBe(settled + ROW);

    // Scrolled by hand, the list stays too, even back at the very top, draw after draw.
    box('.nrl-fixtures-list').scrollTop = 0;
    for (let i = 0; i < 3; i++) {
      const list = q('.nrl-fixtures-list');
      setState({});
      runFrame();
      expect(q('.nrl-fixtures-list')).not.toBe(list);
      expect(box('.nrl-fixtures-list').scrollTop).toBe(0);
      expect(box('.nrl-ladder-scroll').scrollTop).toBe(120);
    }
  });

  it('keeps the fixtures toggle on All games, and its list where it was scrolled to', () => {
    openLeague();
    q('.nrl-fixtures-toggle').click();
    expect(q('.nrl-fixtures-head').textContent).toBe('All games◂ Yours');
    try {
      box('.nrl-fixtures-list').scrollTop = 333;
      advanceWeeks(1);
      runFrame();
      expect(q('.nrl-fixtures-head').textContent).toBe('All games◂ Yours');
      expect(box('.nrl-fixtures-list').scrollTop).toBe(333);
      // The round now coming is the one marked.
      const current = body().all().filter((n) => n.attrs['data-current'] === 'true');
      expect(current.map((n) => n.textContent)).toEqual([`Round ${getState().week}`]);
    } finally {
      q('.nrl-fixtures-toggle').click(); // the choice holds while the game is open: put it back
    }
    expect(q('.nrl-fixtures-head').textContent).toBe('Your fixturesAll games ▸');
  });

  it('fills the open next-match preview again with the match now coming', () => {
    openLeague();
    const week = getState().week;
    q('[data-next-row]').click();
    const card = q('[data-next-match]');
    expect(card.textContent).toContain(`Round ${week}`);

    advanceWeeks(1);
    runFrame();
    expect(dialogOpen()).toBe(true);
    expect(q('[data-next-match]')).toBe(card);
    expect(card.textContent).toContain(`Round ${week + 1}`);
    expect(card.textContent).not.toContain(`Round ${week} `);
    expect(body().querySelectorAll('[data-next-match]')).toHaveLength(1);
  });

  it('shows a rival renamed in the squad sheet over it: one draw, the same sheet, the squad sheet still up', () => {
    const sheet = openLeague();
    box('.nrl-ladder-scroll').scrollTop = 80;
    const row = body().all().find((n) => n.tagName === 'TR' && n.classList.contains('nrl-ladder-rival'))!;
    row.click();
    const id = q('[data-rival-squad]').attrs['data-rival-squad']!;
    q('[data-rival-edit]').click();
    q('[data-rival-rename]').value = 'Zetland Zebras';
    q('.nrl-rename-save').click();

    expect(getState().league.clubs.find((c) => c.id === id)!.name).toBe('Zetland Zebras');
    expect(frames.size).toBe(1);
    runFrame();
    expect(frames.size).toBe(0);
    expect(activeScreen()).toBe(sheet);
    expect(q('.nrl-ladder-table').words()).toContain('Zetland Zebras');
    expect(box('.nrl-ladder-scroll').scrollTop).toBe(80);
    // The squad sheet is still over it, back on the squad under the new name.
    expect(dialogOpen()).toBe(true);
    expect(q('[data-rival-squad]').textContent).toContain('Zetland Zebras');
    expect(body().querySelector('[data-rival-rename]')).toBeNull();
  });

  it('takes its listener with it when it closes, and the frame it was waiting on', () => {
    const closed = stateListeners();
    for (let i = 0; i < 3; i++) {
      openFixturesScreen();
      runFrame();
      expect(stateListeners()).toBe(closed + 1);
      setState({});
      expect(frames.size).toBe(1);
      closeScreen();
      expect(stateListeners()).toBe(closed);
      expect(frames.size).toBe(0);
    }
    // Opening it over itself (the dock, the Guide's link) leaves one listener, not two.
    openFixturesScreen();
    openFixturesScreen();
    expect(stateListeners()).toBe(closed + 1);
    closeScreen();
    expect(stateListeners()).toBe(closed);
    // Nothing is drawn, or asked for, after that.
    runFrame();
    setState({});
    expect(frames.size).toBe(0);
    expect(body().querySelector('.nrl-league')).toBeNull();
  });

  it('lets go of each old ladder as it draws a new one, and of the last as it closes', () => {
    // hintScroll's size observer is one for every list and made on first use: this stand-in is it for the rest of the file.
    const watched = new Set<StubNode>();
    vi.stubGlobal('ResizeObserver', class {
      observe(n: StubNode): void { watched.add(n); }
      unobserve(n: StubNode): void { watched.delete(n); }
      disconnect(): void {}
    });
    const ladders = (): StubNode[] => [...watched].filter((n) => n.classList.contains('nrl-ladder-scroll'));
    openLeague();
    expect(ladders()).toEqual([q('.nrl-ladder-scroll')]);
    for (let i = 0; i < 4; i++) {
      advanceWeeks(1);
      runFrame();
    }
    expect(ladders()).toEqual([q('.nrl-ladder-scroll')]);
    closeScreen();
    expect(ladders()).toEqual([]);
  });

  it('draws nothing when a match starting closes it and the week’s change comes after', () => {
    // As main.ts has it: the match takes the view in the same breath as the change that starts it.
    bus.on('state:changed', () => { closeScreen(); });
    openFixturesScreen();
    runFrame();
    expect(() => setState({})).not.toThrow();
    expect(activeScreen()).toBeNull();
    expect(frames.size).toBe(0);
    expect(body().querySelector('.nrl-league')).toBeNull();
  });
});
