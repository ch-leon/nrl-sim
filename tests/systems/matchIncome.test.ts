import { withoutPopulationMetadata } from '../helpers/playerCareer';
import { FinanceLedger, initFinanceLedger } from '../../src/ui/screens/finance';
import { registerFinanceSystem } from '../../src/systems/economy';
import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, getState, loadState, type Fixture, type GameState } from '../../src/core/state';
import { initLeague, applyResult } from '../../src/systems/fixtures';
import { freezeMatchIncome, reconcileMatchIncome, validMatchIncome, commitMatchState } from '../../src/systems/matchIncome';
import { freshCapAccount } from '../../src/systems/cap';
import { migrateState } from '../../src/core/save';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { createCompetitionInstance, competitionFixtureId } from '../../src/data/competition';
import { cupDefinition } from '../fixtures/competition';
import { activateStructuralCalendar, fixtureBridge, finaliseCalendarFixture } from '../../src/systems/competitionCalendar';

function career(home = true, round = 1): { s: GameState; f: Fixture } {
  createNewGame('Income', 42); initLeague(getState());
  const state = getState();
  const rival = state.league.clubs.find(c => c.id !== state.clubId)!;
  const f = { round, homeId: home ? state.clubId : rival.id, awayId: home ? rival.id : state.clubId };
  const s = { ...state, capAccount: freshCapAccount('local'), preseason: 0 as const,
    league: { ...state.league, fixtures: [f], clubs: state.league.clubs.map(c => c.id === rival.id ? { ...c, capAccount: freshCapAccount('local') } : c) } };
  return { s, f };
}
beforeEach(() => setCareerNamespace(DEV_TEST_PREFIX));
describe('receipt-backed ordinary match income', () => {
  it.each([[true, 0, 10, 12_000], [false, 0, 10, 8_800], [true, 10, 10, 12_400]] as const)('home=%s score=%i:%i credits fixed base/venue/performance', (home, homeScore, awayScore, expected) => {
    const { s, f } = career(home);
    const next = applyResult(s, f, { homeScore, awayScore });
    expect(next.money - s.money).toBe(expected);
    expect(next.capAccount).toEqual(s.capAccount);
    expect(next.matchIncome).toHaveLength(1);
    expect(next.matchIncome[0]!.receipt).toBeDefined();
    expect(validMatchIncome(next.matchIncome)).toBe(true);
  });
  it('pays a trial only a quarter base, even with facilities and a win', () => {
    const { s, f } = career(true, -1);
    s.facilities = [{ id: 's', defId: 'sponsorBoard', level: 3, x: 0, y: 0 }, { id: 'g', defId: 'grandstand', level: 3, x: 6, y: 0 }];
    expect(applyResult(s, f, { homeScore: 20, awayScore: 0 }).money - s.money).toBe(2_000);
  });
  it('freezes facilities and tier before kickoff, not at result display', () => {
    const { s, f } = career();
    const frozen = freezeMatchIncome(s, f);
    const changed = { ...frozen, capAccount: freshCapAccount('premier'), facilities: [{ id: 'g', defId: 'grandstand' as const, level: 3 as const, x: 0, y: 0 }] };
    const next = applyResult(changed, f, { homeScore: 10, awayScore: 0 });
    expect(next.money - changed.money).toBe(12_800);
  });
  it('credits both wallets exactly once across repeated result/reload/reconcile', () => {
    const { s, f } = career();
    const next = applyResult(s, f, { homeScore: 10, awayScore: 0 });
    const rival = next.league.clubs.find(c => c.id === f.awayId)!;
    expect(rival.cash! - s.league.clubs.find(c => c.id === f.awayId)!.cash!).toBe(8_000);
    const reloaded = JSON.parse(JSON.stringify(next)) as GameState;
    expect(applyResult(reloaded, f, { homeScore: 40, awayScore: 0 })).toEqual(next);
    expect(reconcileMatchIncome(reloaded)).toEqual(next);
  });
  it('reconciles a saved accepted result without replaying sporting state', () => {
    const { s, f } = career();
    const frozen = freezeMatchIncome(s, f);
    const accepted = { ...frozen, league: { ...frozen.league, fixtures: [{ ...f, result: { homeScore: 0, awayScore: 10 } }] } };
    const settled = reconcileMatchIncome(accepted);
    expect(settled.money - accepted.money).toBe(12_000);
    expect(settled.league.ladder).toEqual(accepted.league.ladder);
    expect(reconcileMatchIncome(settled)).toBe(settled);
  });
  it('does not pay a forfeit or fabricate a claim for an old completed match', () => {
    const { s, f } = career();
    const unplayed = applyResult(s, { ...f, unplayed: true }, { homeScore: 0, awayScore: 20 });
    expect(unplayed.money).toBe(s.money);
    expect(unplayed.matchIncome[0]!.receipt!.home.total).toBe(0);
    const old = { ...s, league: { ...s.league, fixtures: [{ ...f, result: { homeScore: 10, awayScore: 0 } }] } };
    expect(reconcileMatchIncome(old)).toBe(old);
  });
  it('a Local 14-match all-loss season earns 140k and no idle income', () => {
    const { s, f } = career();
    let next = { ...s, league: { ...s.league, fixtures: Array.from({ length: 14 }, (_, i) => ({ ...f, round: i + 1, homeId: i % 2 ? f.awayId : f.homeId, awayId: i % 2 ? f.homeId : f.awayId })) } };
    for (const fixture of next.league.fixtures) next = applyResult(next, fixture, fixture.homeId === s.clubId ? { homeScore: 0, awayScore: 10 } : { homeScore: 10, awayScore: 0 });
    expect(next.money - s.money).toBe(140_000);
    expect(reconcileMatchIncome(next)).toBe(next);
  });
  it('migrates v28 without retroactive receipts and rejects malformed receipt data', () => {
    const { s } = career();
    const { matchIncome: _, ...old } = withoutPopulationMetadata(s);
    const migrated = migrateState({ ...old, version: 28 });
    expect(migrated.ok).toBe(true);
    if (migrated.ok) expect(migrated.state.matchIncome).toEqual([]);
    expect(validMatchIncome([{ id: 'forged' }])).toBe(false);
  });
  it('rejects receipt aliases and unknown competition claims against a legacy result', () => {
    const { s, f } = career();
    const frozen = freezeMatchIncome(s, f);
    const forged = { ...frozen.matchIncome[0]!, fixture: { ...f, id: 'alias' } };
    forged.id = JSON.stringify(['ordinary', s.season, 'league', 'alias', f.round, f.homeId, f.awayId]);
    expect(validMatchIncome([forged], s)).toBe(false);
    const unknown = { ...forged, fixture: { ...f, id: 'alias', competitionId: 'missing', stageId: 'final', slot: 1 } };
    unknown.id = JSON.stringify(['ordinary', s.season, 'missing', 'alias', f.round, f.homeId, f.awayId]);
    expect(validMatchIncome([unknown], s)).toBe(false);
    const accepted = { ...s, matchIncome: [unknown], league: { ...s.league, fixtures: [{ ...f, result: { homeScore: 10, awayScore: 0 } }] } };
    expect(reconcileMatchIncome(accepted).money).toBe(s.money);
  });
  it('keeps a closing-season settlement and its ledger notification on the fixture date', () => {
    const { s, f } = career(true, 27);
    const paid = applyResult(s, f, { homeScore: 20, awayScore: 10 });
    loadState({ ...s, season: 2, week: 1 });
    const ledger = new FinanceLedger();
    const offLedger = initFinanceLedger(ledger); const offBooks = registerFinanceSystem();
    try {
      commitMatchState({ ...paid, season: 2, week: 1 });
      expect(getState().money - s.money).toBe(12_800);
      expect(ledger.rows()).toMatchObject([{ season: 1, week: 27, net: 12_800 }]);
      expect(getState().finance.find(book => book.season === 1)!.grant).toBe(8_000);
      commitMatchState({ ...paid, season: 2, week: 1 });
      expect(ledger.rows()[0]!.net).toBe(12_800);
    } finally { offLedger(); offBooks(); }
  });
  it('bounds receipt history while preserving prior-season review and current recovery', () => {
    const { s, f } = career();
    let next = s;
    for (let season = 1; season <= 6; season++) {
      next = { ...next, season, league: { ...next.league, fixtures: [{ ...f }] } };
      const before = next.money;
      next = applyResult(next, f, { homeScore: 20, awayScore: 10 });
      expect(next.money - before).toBe(12_800);
      expect(next.matchIncome.map(r => r.season)).toEqual(season === 1 ? [1] : [season - 1, season]);
      expect(next.finance).toHaveLength(season);
      const reloaded = JSON.parse(JSON.stringify(next)) as GameState;
      expect(validMatchIncome(reloaded.matchIncome, reloaded)).toBe(true);
      expect(reconcileMatchIncome(reloaded)).toEqual(next);
      expect(applyResult(reloaded, f, { homeScore: 20, awayScore: 10 })).toEqual(next);
    }
  });
  it('neutral cross-tier knockout uses lower tier, shared venue and saved tie winner', () => {
    const { s, f } = career();
    const def = { ...cupDefinition(), minEntrants: 2, maxEntrants: 2, slotCount: 1, stages: [{ id: 'final', name: 'Final', kind: 'knockout' as const, rounds: 1 }], rewards: [] };
    const cup = createCompetitionInstance(def, 1, 0, [f.homeId, f.awayId]);
    cup.status = 'scheduled'; cup.stageId = 'final';
    cup.fixtures = [{ id: competitionFixtureId(cup.id, 0), competitionId: cup.id, stageId: 'final', round: 1, slot: 1, homeId: f.homeId, awayId: f.awayId, neutral: true, status: 'scheduled' }];
    const active = activateStructuralCalendar({ ...s, capAccount: freshCapAccount('premier'), competitions: { schemaVersion: 1, instances: [cup] } }, [{ id: 1, kind: 'competition' }]);
    const bridge = fixtureBridge({ instance: cup, fixture: cup.fixtures[0]! });
    const next = finaliseCalendarFixture(active, bridge, { homeScore: 10, awayScore: 10 });
    const win = next.competitions!.instances[0]!.fixtures[0]!.result!.winnerId === s.clubId;
    expect(next.money - active.money).toBe(10_000 + (win ? 800 : 0));
    expect(finaliseCalendarFixture(next, bridge, { homeScore: 10, awayScore: 10 })).toBe(next);
  });
});
