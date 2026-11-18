import { isolateMiniatureLeagueProgression } from '../../helpers/miniatureLeague';
import { entrySnapshots } from '../../data/leagueCareerFixtures';
import { closeLeagueSeason } from '../../../src/systems/leagueCareer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubDocument, type StubNode } from '../stubDom';
import { careerFixture } from '../../helpers/playerCareer';
import { competitions, progress, clubIds } from '../../data/leagueCareerFixtures';
import { leagueEntryReceiptId } from '../../../src/data/leagueCareer';
import { getState, setState, type GameState } from '../../../src/core/state';
import { validateInput } from '../../../src/core/saveValidation';
import { bus } from '../../../src/core/events';
import { contractsEndingSoon } from '../../../src/systems/contracts';
import { openSquadScreen } from '../../../src/ui/screens/squad';
import { openPlayerPage } from '../../../src/ui/screens/player';
import { closeModal } from '../../../src/ui/dom';
// The Squad views draw portraits (SuperCOOKED 30–31); the stand-in DOM has no canvas.
vi.mock('../../../src/art/portrait', async original => ({ ...await original<typeof import('../../../src/art/portrait')>(), portraitDataUrl: () => '' }));
import { openContractsScreen } from '../../../src/ui/screens/contracts';
import { saleConfirmation } from '../../../src/ui/saleConfirmation';
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
  c.calendar!.elapsedIntervals = 24;
  c.calendar!.status = 'active';
  c.instances.forEach(instance => { instance.definition.slotCount = 25; });
  c.leagueCareer = { ...progress(), phase: 'active',
    accepted: { season: 1, startInterval: 0, leagueId: c.world!.profile.startingDivisionId,
      ...entrySnapshots(c, 1, c.world!.profile.startingDivisionId), receiptId: leagueEntryReceiptId(c.world!.profile.id, 1, s.clubId, c.world!.profile.startingDivisionId),
      allocationPolicy: 'adjacent-vacancy-v1', movements: [] } };
  s.squad.forEach(p => { p.deal = { salary: 1000, startSeason: 1, endSeason: 2 }; p.contractWeeks = 27; });
  return planning ? closeLeagueSeason(s) : s;
}
function install(s: GameState): void {
  expect(validateInput(s as unknown as Record<string, unknown>, s.version)).toBeNull();
  setState(s);
}
const body = (): StubNode => document.body as unknown as StubNode;
const row = (id: string): StubNode => body().querySelector(`[data-row-player="${id}"]`)!;
/** SuperCOOKED Phase 1: the Squad list has no To column (Leon, 18 Nov); his contract is on the player page's Deal tab. */
const dealLine = (id: string): StubNode => {
  closeModal();
  openPlayerPage(getState().squad.find((p) => p.id === id)!, { kind: 'squad' });
  body().querySelector('[data-player-tab="deal"]')!.click();
  return body().querySelector('.nrl-player-deal')!;
};
/** The list's red contract-ending dot on his name (#369). */
const alertDot = (id: string): StubNode | null => row(id).querySelector('[data-row-alert]');

beforeEach(() => { isolateMiniatureLeagueProgression(); bus.clear(); stubDocument(); });
afterEach(() => { closeScreen(); bus.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('League Squad contracts and dock alert', () => {
  it('shows the last authored active interval and alerts despite a stale stored countdown', () => {
    const s = fixture(false); const p = s.squad[0]!; p.deal!.endSeason = 1;
    install(s); openSquadScreen('list');
    expect(alertDot(p.id)).not.toBeNull();
    expect(dealLine(p.id).textContent).toMatch(/^Contract: 1 week left · /);
    expect(dealLine(p.id).classList.contains('nrl-player-expiring')).toBe(true); // running down
    expect(contractsEndingSoon(getState()).map(p => [p.id, p.contractWeeks])).toEqual([[p.id, 1]]);
    expect(getState().squad[0]!.contractWeeks).toBe(27);
  });
  it('shows a queued target-year agreement as current and keeps the dock alert clear', () => {
    const s = fixture(true); const p = s.squad[0]!;
    p.deal = { salary: 1000, startSeason: 1, endSeason: 1, renewal: { salary: 2000, startSeason: 2, endSeason: 2 } };
    install(s); openSquadScreen('list');
    expect(alertDot(p.id)).toBeNull();
    expect(dealLine(p.id).textContent).toMatch(/^Contract: 25 weeks left · /);
    expect(dealLine(p.id).classList.contains('nrl-player-expiring')).toBe(false);
    expect(contractsEndingSoon(getState())).toEqual([]);
    expect(getState().squad[0]!.deal!.renewal!.salary).toBe(2000);
  });
  it('retains the legacy and unmarked DEV countdown and queued-renewal labels', () => {
    const s = fixture(false); const p = s.squad[0]!;
    p.deal!.renewal = { salary: 2000, startSeason: 3, endSeason: 3 };
    delete s.competitions!.leagueCareer;
    setState(s); openSquadScreen('list');
    expect(alertDot(p.id)).toBeNull();
    expect(dealLine(p.id).textContent).toMatch(/^Contract: 27 weeks left on this deal · renewed from season 3 /);
    expect(contractsEndingSoon(getState())).toEqual([]);
    closeModal(); closeScreen(); delete s.competitions; setState(s); openSquadScreen('list');
    expect(dealLine(p.id).textContent).toMatch(/^Contract: 27 weeks left on this deal · /);
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

describe('League sale review terms', () => {
  it('reviews the effective target-year agreement and explicit cap years before committing the same sale', () => {
    const s=fixture(true);const p=s.squad[0]!;
    p.stats={speed:85,strength:85,stamina:85,handling:85,kicking:85,footyIQ:85};
    p.deal={salary:1000,startSeason:1,endSeason:1,renewal:{salary:2000,startSeason:2,endSeason:2}};
    s.league.clubs.forEach(c=>{if(c.squad)c.cash=1_000_000;});
    install(s);const sold=vi.fn();
    const review=saleConfirmation(p.id,{onCancel:vi.fn(),onSold:sold}) as unknown as StubNode;
    expect(review.querySelector('[data-sale-contract]')!.textContent).toBe('Deal unchanged: $2,000/season to S2.');
    expect(review.words()).toContain('Your cap freed: $2,000 S2; $0 S3.');
    expect(review.words()).not.toContain('renewal $2,000');
    review.querySelector('[data-sale-confirm]')!.click();
    expect(sold).toHaveBeenCalledOnce();
    const moved=getState().league.clubs.flatMap(c=>c.squad??[]).find(x=>x.id===p.id)!;
    expect(moved.deal).toEqual({salary:2000,startSeason:2,endSeason:2});
    expect(moved.clubHistory!.spells.slice(-1)[0]!.start).toEqual({season:2,week:1});
    expect(getState()).toMatchObject({season:1,week:25});
  });
});
