import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/events';
import { getState, setState } from '../../src/core/state';
import { careerFixture } from '../helpers/playerCareer';
import { applyPlayerSale, confirmPlayerSale, quotePlayerSale, transferBetweenClubs } from '../../src/systems/playerTransfers';
import { ownerOf, validatePlayerPopulation } from '../../src/systems/playerCareer';
import { saleOfferQuote } from '../../src/data/financeRules';
import { salaryDemand } from '../../src/systems/cap';
import { registerFinanceSystem } from '../../src/systems/economy';
import { migrateState } from '../../src/core/save';
import { advanceWeek, clearHeldWeek, clearTickHooks, registerTickHook, weekHeld } from '../../src/core/time';

function fixture() {
  const s = structuredClone(careerFixture());
  const p = s.squad[0]!;
  p.stats = { speed: 85, strength: 85, stamina: 85, handling: 85, kicking: 85, footyIQ: 85 };
  p.deal = { salary: 1000, startSeason: 1, endSeason: 2, renewal: { salary: 2000, startSeason: 3, endSeason: 3 } };
  p.contractWeeks = 40;
  s.league.clubs.forEach(c => { if (c.squad) c.cash = 0; });
  const buyer = s.league.clubs.find(c => c.squad)!;
  buyer.cash = 1_000_000;
  buyer.squad = buyer.squad!.map(x => ({ ...x, deal: { salary: 1000, startSeason: 1, endSeason: 3 } }));
  return { s, p, buyer };
}
beforeEach(() => { bus.clear(); clearTickHooks(); clearHeldWeek(); });

describe('funded player transfers', () => {
  it('quotes without mutation and moves the same person, deal and cash to a real buyer', () => {
    const { s, p, buyer } = fixture(); const before = structuredClone(s);
    const preview = quotePlayerSale(s, p.id);
    expect(s).toEqual(before); expect(preview.ok).toBe(true); if (!preview.ok) return;
    expect(preview.offer.buyerId).toBe(buyer.id);
    expect(preview.offer.fee).toBe(saleOfferQuote(salaryDemand(p)));
    const result = applyPlayerSale(s, preview.offer);
    expect(result.ok).toBe(true); if (!result.ok) return;
    expect(s).toEqual(before);
    expect(ownerOf(result.state, p.id)).toBe(buyer.id);
    const moved = result.state.league.clubs.find(c => c.id === buyer.id)!.squad!.find(x => x.id === p.id)!;
    expect(moved.deal).toEqual(p.deal); expect(moved.stats).toEqual(p.stats);
    expect(moved.clubHistory!.spells.slice(-2).map(x => [x.clubId, x.departure])).toEqual([[s.clubId, 'transfer'], [buyer.id, undefined]]);
    expect(result.state.money - s.money).toBe(preview.offer.fee);
    expect(buyer.cash! - result.state.league.clubs.find(c => c.id === buyer.id)!.cash!).toBe(preview.offer.fee);
    expect(validatePlayerPopulation(result.state)).toBeNull();
    expect(applyPlayerSale(result.state, preview.offer).ok).toBe(false);
  });
  it('refuses stale, forged, unfunded and future-cap offers without changing state', () => {
    const { s, p, buyer } = fixture(); const q = quotePlayerSale(s, p.id); if (!q.ok) throw Error(q.message);
    for (const change of [
      () => ({ ...q.offer, fee: q.offer.fee + 1 }),
      () => ({ ...q.offer, week: q.offer.week + 1 }),
      () => { buyer.cash = 0; return q.offer; },
      () => { buyer.cash = 1_000_000; p.deal!.renewal!.salary = 9_000_000; return q.offer; },
    ]) { const offer = change(); const before = structuredClone(s); expect(applyPlayerSale(s, offer).ok).toBe(false); expect(s).toEqual(before); }
  });
  it('refuses minimum squads and restricted emergency grants', () => {
    const { s, p } = fixture(); s.squad = s.squad.slice(0, 13);
    expect(quotePlayerSale(s, p.id)).toMatchObject({ ok: false, reason: 'squad-min' });
    const f = fixture(); f.p.emergencyDealEndSeason = f.s.season;
    expect(quotePlayerSale(f.s, f.p.id)).toMatchObject({ ok: false, reason: 'scholarship' });
  });
  it('books and notifies once after the entire ownership change', () => {
    const { s, p, buyer } = fixture(); setState(s); registerFinanceSystem();
    const q = quotePlayerSale(s, p.id); if (!q.ok) throw Error(q.message);
    const notices: string[] = []; bus.on('ui:notify', ({ text }) => notices.push(text));
    const snapshots: boolean[] = []; bus.on('state:changed', () => snapshots.push(migrateState(JSON.parse(JSON.stringify(getState()))).ok));
    const seen: string[] = []; bus.on('money:changed', () => seen.push(ownerOf(getState(), p.id)!));
    const oldBook = s.finance.find(f => f.season === s.season)?.transfers ?? 0;
    expect(confirmPlayerSale(q.offer).ok).toBe(true);
    expect(confirmPlayerSale(q.offer).ok).toBe(false);
    expect(seen).toEqual([buyer.id]);
    expect(snapshots).toEqual([true]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain(buyer.name);
    expect(notices[0]).toContain(p.name);
    expect(getState().finance.find(f => f.season === s.season)!.transfers).toBe(oldBook + q.offer.fee);
  });
  it('rejects future cap excess, insufficient funds and overflowing wallets at quote time', () => {
    const { s, p, buyer } = fixture();
    p.deal!.renewal!.salary = 9_000_000;
    expect(quotePlayerSale(s, p.id).ok).toBe(false);
    p.deal!.renewal!.salary = 2000; buyer.cash = 0;
    expect(quotePlayerSale(s, p.id).ok).toBe(false);
    buyer.cash = 1_000_000; s.money = Number.MAX_SAFE_INTEGER;
    expect(quotePlayerSale(s, p.id).ok).toBe(false);
  });
  it('leaves all state and listeners untouched when a held match blocks confirmation', () => {
    const { s, p } = fixture(); setState(s);
    registerTickHook('hold-transfer', 40, ctx => ctx.hold?.(), { trials: true }); advanceWeek();
    expect(weekHeld()).toBe(true);
    const q = quotePlayerSale(getState(), p.id); if (!q.ok) throw Error(q.message);
    const before = structuredClone(getState()); let events = 0;
    bus.on('state:changed', () => events++); bus.on('money:changed', () => events++);
    expect(confirmPlayerSale(q.offer)).toMatchObject({ ok: false, reason: 'match-active' });
    expect(getState()).toEqual(before); expect(events).toBe(0); clearHeldWeek();
  });
  it('removes seller protection and lineup references without granting buyer protection', () => {
    const { s, p, buyer } = fixture(); s.capAccount.protectedIds = [p.id];
    s.lineup.captain = p.id; s.lineup.kicker = p.id; s.lineup.starters[0] = p.id;
    const q = quotePlayerSale(s, p.id); if (!q.ok) throw Error(q.message);
    const r = applyPlayerSale(s, q.offer); if (!r.ok) throw Error(r.message);
    expect(r.state.capAccount.protectedIds).not.toContain(p.id);
    expect(r.state.league.clubs.find(c => c.id === buyer.id)!.capAccount!.protectedIds).not.toContain(p.id);
    expect(r.state.lineup.captain).toBeNull(); expect(r.state.lineup.kicker).toBeNull();
    expect(r.state.lineup.starters).not.toContain(p.id);
  });
  it('preserves a rival contract and credits the actual seller for an authored event fee', () => {
    const { s, buyer: seller } = fixture(); const p = seller.squad![0]!; s.money = 1_000_000;
    s.squad = s.squad.map(x => ({ ...x, deal: { salary: 1000, startSeason: 1, endSeason: 3 } }));
    const r = transferBetweenClubs(s, seller.id, s.clubId, p.id, 1234);
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.squad.find(x => x.id === p.id)!.deal).toEqual(p.deal);
    expect(r.state.money).toBe(s.money - 1234);
    expect(r.state.league.clubs.find(c => c.id === seller.id)!.cash).toBe(seller.cash! + 1234);
    expect(validatePlayerPopulation(r.state)).toBeNull();
  });
});
