import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StubNode, stubDocument } from './stubDom';
import { careerFixture } from '../helpers/playerCareer';
import { getState, setState } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { saleConfirmation } from '../../src/ui/saleConfirmation';
import { playerHistoryLines, retiredPlayerRecords } from '../../src/ui/playerHistory';
import { openHistoryScreen } from '../../src/ui/screens/history';
import { closeScreen } from '../../src/ui/dom';
import { playerActions } from '../../src/ui/screens/player';
import { archiveRetirees } from '../../src/systems/playerCareer';

function fixture() {
  const s = structuredClone(careerFixture()); const p = s.squad[0]!;
  p.stats = { speed: 85, strength: 85, stamina: 85, handling: 85, kicking: 85, footyIQ: 85 };
  p.deal = { salary: 1000, startSeason: 1, endSeason: 2, renewal: { salary: 2000, startSeason: 3, endSeason: 3 } };
  s.league.clubs.forEach(c => { if (c.squad) c.cash = 0; });
  const buyer = s.league.clubs.find(c => c.squad)!; buyer.cash = 1_000_000;
  buyer.squad = buyer.squad!.map(x => ({ ...x, deal: { salary: 1000, startSeason: 1, endSeason: 3 } }));
  setState(s); return { s, p, buyer };
}
beforeEach(() => { bus.clear(); stubDocument(); });
afterEach(() => { closeScreen(); vi.unstubAllGlobals(); });
const node = (el: HTMLElement) => el as unknown as StubNode;

describe('reviewed sale confirmation', () => {
  it('the owned player page exposes a real offer before confirmation', () => {
    const { s, p, buyer } = fixture();
    const action = playerActions(p, { kind: 'squad' }, s).find(a => a.id === 'sell')!;
    expect(action.enabled).toBe(true); expect(action.detail).toContain(buyer.name);
  });
  it('shows buyer, fee, unchanged deal, queued renewal and cap checks; cancel changes nothing', () => {
    const { p, buyer } = fixture(); const before = structuredClone(getState()); const cancel = vi.fn();
    const view = node(saleConfirmation(p.id, { onCancel: cancel, onSold: vi.fn() }));
    expect(view.words()).toContain(buyer.name);
    expect(view.words()).toContain('$1,000'); expect(view.words()).toContain('$2,000');
    expect(view.words()).toContain('Contract stays unchanged');
    expect(view.words()).toContain('cap freed'); expect(view.words()).toContain('Buyer cap');
    view.querySelector('[data-sale-cancel]')!.click();
    expect(cancel).toHaveBeenCalledOnce(); expect(getState()).toEqual(before);
  });
  it('a native confirmation button submits once, including repeat activation', () => {
    const { p, buyer } = fixture(); const done = vi.fn();
    const view = node(saleConfirmation(p.id, { onCancel: vi.fn(), onSold: done }));
    const confirm = view.querySelector('[data-sale-confirm]')!;
    expect(confirm.tagName).toBe('BUTTON'); expect(confirm.getAttribute('type')).toBe('button');
    confirm.click(); const cash = getState().money; confirm.click();
    expect(done).toHaveBeenCalledOnce(); expect(getState().money).toBe(cash);
    expect(getState().league.clubs.find(c => c.id === buyer.id)!.squad!.some(x => x.id === p.id)).toBe(true);
  });
  it('a stale quote refuses and shows revised terms for another explicit confirmation', () => {
    const { p } = fixture(); const done = vi.fn();
    const view = node(saleConfirmation(p.id, { onCancel: vi.fn(), onSold: done }));
    const oldConfirm = view.querySelector('[data-sale-confirm]')!;
    setState({ squad: getState().squad.map(x => x.id === p.id ? { ...x, deal: { ...x.deal!, salary: 1500 } } : x) });
    const before = structuredClone(getState()); oldConfirm.click();
    expect(getState()).toEqual(before); expect(done).not.toHaveBeenCalled();
    expect(view.words()).toContain('changed'); expect(view.words()).toContain('$1,500');
    oldConfirm.click(); expect(getState()).toEqual(before);
    view.querySelector('[data-sale-confirm]')!.click(); expect(done).toHaveBeenCalledOnce();
  });
  it('no buyer gives a real refusal and no confirmation action', () => {
    const { p } = fixture(); setState({ league: { ...getState().league, clubs: getState().league.clubs.map(c => ({ ...c, cash: 0 })) } });
    const view = node(saleConfirmation(p.id, { onCancel: vi.fn(), onSold: vi.fn() }));
    expect(view.words()).toContain('No club'); expect(view.querySelector('[data-sale-confirm]')).toBeNull();
  });
});

describe('truthful personal history', () => {
  it('resolves current club names and distinguishes observed history from known signing', () => {
    const { s, p, buyer } = fixture();
    p.clubHistory = { academyDiscountUsed: true, spells: [{ clubId: buyer.id, start: { season: 1, week: 1 }, arrival: 'observed', end: { season: 1, week: 1 }, departure: 'transfer' }, { clubId: s.clubId, start: { season: 1, week: 1 }, arrival: 'transfer' }] };
    buyer.name = 'Renamed rivals'; s.clubName = 'Renamed home';
    const lines = playerHistoryLines(p, s).join(' ');
    expect(lines).toContain('Renamed rivals'); expect(lines).toContain('Renamed home');
    expect(lines).toContain('At this club when records began');
  });
  it('opens retired people through the existing History navigation', () => {
    const { s, p } = fixture();
    setState(archiveRetirees({ ...s, squad: s.squad.filter(x => x.id !== p.id) }, [p], s));
    const screen = node(openHistoryScreen());
    screen.querySelector('[data-seg="players"]')!.click();
    expect(screen.querySelector(`[data-retired-player="${p.id}"]`)!.words()).toContain(p.name);
    expect(screen.querySelector('[data-player-action]')).toBeNull();
  });
  it('retired records remain readable without roster action buttons', () => {
    const { s, p } = fixture();
    const retired = archiveRetirees({ ...s, squad: s.squad.filter(x => x.id !== p.id) }, [p], s);
    const view = node(retiredPlayerRecords(retired));
    expect(view.words()).toContain(p.name); expect(view.words()).toContain('Retired');
    expect(view.querySelector('[data-player-action]')).toBeNull();
    expect(view.querySelector('[data-retired-player]')).not.toBeNull();
  });
});
