import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import { createNewGame, getState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { overallRating } from '../../src/data/player';
import { signingFee } from '../../src/systems/freeagency';
import { commitUndo, currentOffer, undoNow } from '../../src/systems/undo';
import { recruitShortlist } from '../../src/ui/recruitShortlist';
import { openRecruitScreen } from '../../src/ui/screens/recruit';

const slot = vi.hoisted(() => ({ screen: null as unknown, close: null as (() => void) | null }));
vi.mock('../../src/ui/dom', async (original) => ({
  ...await original<typeof import('../../src/ui/dom')>(),
  ensureStyles: () => {},
  openScreen: (screen: unknown, close: () => void) => { slot.close?.(); slot.screen = screen; slot.close = close; },
}));
const screen = () => slot.screen as StubNode;
const rows = () => screen().querySelectorAll('[data-row-player]');
const action = (row: StubNode) => row.all().find((n) => n.className.includes('nrl-row-action'))!;

beforeEach(() => {
  bus.clear(); commitUndo(); stubDocument(); createNewGame('Test Club', 1);
  // The real DOM supplies an event to both the action and stop-propagation listeners.
  const add = StubNode.prototype.addEventListener;
  vi.spyOn(StubNode.prototype, 'addEventListener').mockImplementation(function (this: StubNode, event, fn) {
    add.call(this, event, () => (fn as (e: unknown) => void)({ target: this, stopPropagation() {} }));
  });
});
afterEach(() => { slot.close?.(); slot.close = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Recruit screen', () => {
  it('opens on four rows with one badge, then Show all restores main order and sort menu; reopening resets', () => {
    openRecruitScreen();
    expect(rows()).toHaveLength(4);
    expect(screen().querySelectorAll('[data-coach-pick]')).toHaveLength(1);
    expect(screen().querySelector('[data-sort-menu]')!.style.display).toBe('none');
    const more = screen().querySelector('[data-show-all]')!;
    expect(more.textContent).toBe(`Show all ${getState().freeAgents.length}`);
    more.click();
    expect(rows().map((r) => r.attrs['data-row-player'])).toEqual([...getState().freeAgents]
      .sort((a, b) => overallRating(b) - overallRating(a)).map((p) => p.id));
    expect(screen().querySelector('[data-sort-menu]')!.style.display).toBe('');
    expect(screen().querySelector('[data-show-all]')).toBeNull();
    openRecruitScreen();
    expect(rows()).toHaveLength(4);
    expect(screen().querySelector('[data-show-all]')).not.toBeNull();
  });
  it.each([false, true])('signs and undoes through the same live path (full view: %s)', (full) => {
    openRecruitScreen();
    if (full) screen().querySelector('[data-show-all]')!.click();
    const s = getState();
    const id = recruitShortlist(s).pickId!;
    const p = s.freeAgents.find((p) => p.id === id)!;
    const notify = vi.fn(); const off = bus.on('ui:notify', notify);
    action(rows().find((r) => r.attrs['data-row-player'] === id)!).click();
    expect(getState().money).toBe(s.money - signingFee(s, p));
    expect(getState().squad.some((p) => p.id === id)).toBe(true);
    expect(rows().some((r) => r.attrs['data-row-player'] === id)).toBe(false);
    expect(currentOffer()?.kind).toBe('sign');
    expect(notify.mock.calls.some(([e]) => e.action?.label === 'Undo')).toBe(true);
    expect(undoNow()).toBe(true);
    expect(getState().money).toBe(s.money);
    expect(getState().freeAgents).toEqual(s.freeAgents);
    expect(rows().some((r) => r.attrs['data-row-player'] === id)).toBe(true);
    off();
  });
  it('marks only the one reach fee in warning colour and explains the saving estimate', () => {
    const pool = getState().freeAgents.slice(0, 5).map((p, i) => ({ ...p, junior: true, wage: i === 0 ? 300 : 20,
      stats: { speed: i === 0 ? 90 : 40, strength: 40, stamina: 40, skill: 40, footyIQ: 40 } }));
    setState({ money: 1000, freeAgents: pool }); openRecruitScreen();
    const reach = rows().find((r) => r.attrs['data-row-player'] === pool[0]!.id)!;
    expect(reach.children[4]!.style.color).toBe('var(--nrl-alert)');
    expect(reach.textContent).toMatch(/Fee \$1,200: about \d+ weeks away/);
    expect(screen().querySelectorAll('[data-coach-pick]')).toHaveLength(1);
    expect(rows().filter((r) => r.children[4]!.style.color === 'var(--nrl-alert)')).toHaveLength(1);
  });
  it('skips shortlisting below five and keeps the full view after a signing', () => {
    setState({ freeAgents: getState().freeAgents.slice(0, 4) }); openRecruitScreen();
    expect(rows()).toHaveLength(4);
    expect(screen().querySelector('[data-show-all]')).toBeNull();
    expect(screen().querySelector('[data-sort-menu]')!.style.display).toBe('');
    createNewGame('Test Club', 1); openRecruitScreen();
    screen().querySelector('[data-show-all]')!.click();
    action(rows().find((r) => !action(r).disabled)!).click();
    expect(rows()).toHaveLength(getState().freeAgents.length);
  });
});
