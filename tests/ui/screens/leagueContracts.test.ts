import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { careerFixture } from '../../helpers/playerCareer';
import { competitions, progress, clubIds } from '../../data/leagueCareerFixtures';
import { leagueCloseFacts, leagueEntryReceiptId } from '../../../src/data/leagueCareer';
import { getState, setState, type GameState } from '../../../src/core/state';
import { validateInput } from '../../../src/core/saveValidation';
import { bus } from '../../../src/core/events';
import { contractsEndingSoon } from '../../../src/systems/contracts';
import { openSquadScreen } from '../../../src/ui/screens/squad';
import { openContractsScreen } from '../../../src/ui/screens/contracts';
import { closeScreen } from '../../../src/ui/dom';

function fixture(planning: boolean): GameState {
  const s = structuredClone(careerFixture());
  s.week = 25; s.preseason = 0; s.league.fixtures = [];
  s.league.clubs = s.league.clubs.filter(c => clubIds.includes(c.id));
  s.league.ladder = s.league.ladder.filter(c => clubIds.includes(c.clubId));
  s.competitions = competitions();
  // A valid small field with a 25-slot published year: sporting play has
  // finished, while the remaining authored quiet intervals still count.
  const c = s.competitions;
  c.calendar!.slots = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, kind: i < 2 ? 'preseason' : 'competition' }));
  c.calendar!.elapsedIntervals = planning ? 25 : 24;
  c.calendar!.status = planning ? 'awaiting-next-season' : 'active';
  c.instances.forEach(instance => { instance.definition.slotCount = 25; });
  c.leagueCareer = { ...progress(), phase: planning ? 'next-season-choice' : 'active',
    ...(planning ? { close: leagueCloseFacts(c.world!, c.instances, 1) } : {}),
    accepted: { season: 1, leagueId: c.world!.profile.startingDivisionId,
      receiptId: leagueEntryReceiptId(c.world!.profile.id, 1, s.clubId, c.world!.profile.startingDivisionId),
      allocationPolicy: 'adjacent-vacancy-v1', movements: [] } };
  s.squad.forEach(p => { p.deal = { salary: 1000, startSeason: 1, endSeason: 2 }; p.contractWeeks = 27; });
  return s;
}
function install(s: GameState): void {
  expect(validateInput(s as unknown as Record<string, unknown>, s.version)).toBeNull();
  setState(s);
}
const body = (): StubNode => document.body as unknown as StubNode;
const row = (id: string): StubNode => body().querySelector(`[data-row-player="${id}"]`)!;

beforeEach(() => { bus.clear(); stubDocument(); });
afterEach(() => { closeScreen(); bus.clear(); vi.unstubAllGlobals(); });

describe('League Squad contracts and dock alert', () => {
  it('shows the last authored active interval and alerts despite a stale stored countdown', () => {
    const s = fixture(false); const p = s.squad[0]!; p.deal!.endSeason = 1;
    install(s); openSquadScreen();
    expect(row(p.id).children[5]!.textContent).toBe('1 wk');
    expect(row(p.id).children[5]!.getAttribute('title')).toBe('Contract running down');
    expect(contractsEndingSoon(getState()).map(p => [p.id, p.contractWeeks])).toEqual([[p.id, 1]]);
    expect(getState().squad[0]!.contractWeeks).toBe(27);
  });
  it('shows a queued target-year agreement as current and keeps the dock alert clear', () => {
    const s = fixture(true); const p = s.squad[0]!;
    p.deal = { salary: 1000, startSeason: 1, endSeason: 1, renewal: { salary: 2000, startSeason: 2, endSeason: 2 } };
    install(s); openSquadScreen();
    expect(row(p.id).children[5]!.textContent).toBe('25 wk');
    expect(row(p.id).children[5]!.getAttribute('title')).toBe('Weeks left on his contract');
    expect(contractsEndingSoon(getState())).toEqual([]);
    expect(getState().squad[0]!.deal!.renewal!.salary).toBe(2000);
  });
  it('retains the legacy and unmarked DEV countdown and queued-renewal labels', () => {
    const s = fixture(false); const p = s.squad[0]!;
    p.deal!.renewal = { salary: 2000, startSeason: 3, endSeason: 3 };
    delete s.competitions!.leagueCareer;
    setState(s); openSquadScreen();
    expect(row(p.id).children[5]!.textContent).toBe('27 wk');
    expect(row(p.id).children[5]!.getAttribute('title')).toBe('Renewal queued from season 3');
    expect(contractsEndingSoon(getState())).toEqual([]);
    closeScreen(); delete s.competitions; setState(s); openSquadScreen();
    expect(row(p.id).children[5]!.textContent).toBe('27 wk');
  });
});

describe('League Contracts annual cap cells', () => {
  it('shows zero for expired source salary and the signed target salary for a consumed renewal', () => {
    const s = fixture(true); const expired = s.squad[0]!; const queued = s.squad[1]!;
    expired.deal!.endSeason = 1;
    queued.deal = { salary: 1000, startSeason: 1, endSeason: 1, renewal: { salary: 2000, startSeason: 2, endSeason: 2 } };
    install(s); openContractsScreen();
    const expiredRow = body().querySelector(`[data-contract="${expired.id}"]`)!;
    const queuedRow = body().querySelector(`[data-contract="${queued.id}"]`)!;
    expect(expiredRow.children[3]!.textContent).toBe('0 wks');
    expect(expiredRow.children[4]!.textContent).toBe('$0');
    expect(queuedRow.children[3]!.textContent).toBe('25 wks');
    expect(queuedRow.children[4]!.textContent).toBe('$2,000');
  });
});
