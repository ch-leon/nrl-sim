import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectPack } from '../../src/content';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, loadSlot, migrateState, saveIfChanged, setActiveSlot } from '../../src/core/save';
import { getState, loadState, SAVE_VERSION, type GameState, type OfferedCard, type StaffMember } from '../../src/core/state';
import { setCareerNamespace } from '../../src/core/storage/local';
import { clearHeldWeek, clearSeasonHooks, clearTickHooks, failedIntervalProblem } from '../../src/core/time';
import { CARD_WEEK } from '../../src/data/cards';
import { PLAYS_BY_ID } from '../../src/data/plays';
import { advanceWeekAsTapped, registerAllSystems } from '../../src/qa/soak';
import { cardOfferView, cardWeekTick, passCard, playPickCard, rerollCard, takeCard } from '../../src/systems/cardWeek';
import { type StaffCardSource } from '../../src/systems/cardWeekStaff';
import { prepareLeagueCareer, startLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { previewLeagueEntry } from '../../src/systems/leagueEntry';
import { confirmLeagueEntry } from '../../src/systems/leagueEntryCommit';
import { hireAttackCoach, hireStaff } from '../../src/systems/staff';
import { stubLocalStorage } from '../commercial/memStorage';
import { stubDocument, type StubNode } from '../ui/stubDom';
import { openCardPick } from '../../src/ui/cardWeek';
import { closeModal } from '../../src/ui/dom';

function offeredByStaff(state: GameState, source?: StaffCardSource): OfferedCard[] {
  return state.cardWeek!.offers.flatMap(offer => offer.cards).filter((card) =>
    source ? card.staffSource === source : !!card.staffSource);
}
const latest = (state: GameState) => state.cardWeek!.offers.slice(-1)[0]!;
const cadence = (state: GameState, role: StaffCardSource) =>
  state.staff.find(member => member.role === role)?.cardSupplyMatches ?? 0;

function changed(result: GameState | string): GameState {
  if (typeof result === 'string') throw new Error(result);
  return result;
}

function staffState(state: GameState, staff: StaffMember[]): GameState {
  return { ...state, staff };
}

async function openNormalSlot(seed: number): Promise<GameState> {
  selectPack('au');
  const storage = stubLocalStorage();
  __setStorage(storage);
  __unlockSaves();
  setCareerNamespace(null);
  setActiveSlot(1);
  const started = await startLeagueCareer({ clubName: 'Staff QA', seed, cardWeek: true }, { slot: 1, expectedOriginal: null });
  if (!started.ok) throw new Error(started.message);
  const initial = started.state;
  const preview = previewLeagueEntry(initial, initial.competitions!.world!.profile.startingDivisionId);
  if (!preview.ok) throw new Error(preview.message);
  const confirmed = confirmLeagueEntry(preview.preview);
  if (!confirmed.ok) throw new Error(confirmed.message);
  registerAllSystems();
  return getState();
}

afterEach(() => {
  if (typeof document !== 'undefined') closeModal();
  vi.unstubAllGlobals(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear(); __setStorage(null); setCareerNamespace(null);
});

describe('staff supply in an installed Card Week League career', () => {
  it('survives a real third League kickoff, reload, two reactions to the pick and a reroll', async () => {
    const starting = await openNormalSlot(7919);
    expect(starting.cardWeek!.offers.every(o => o.kind === 'starter')).toBe(true);
    expect(hireStaff('welfare')).not.toBeNull();
    expect(hireAttackCoach('direct')).not.toBeNull();
    const activeDivision = getState().competitions!.world!.divisions.find(d => d.id ===
      getState().competitions!.leagueCareer!.accepted!.leagueId)!;
    const matches: Array<{ id: string; slot: number }> = [];
    bus.on('match:started', ({ fixture }) => {
      if (fixture.competitionId === activeDivision.instanceId) matches.push({ id: fixture.id!, slot: fixture.slot! });
    });
    for (let i = 0; i < 16 && matches.length < CARD_WEEK.STAFF_SUPPLY_MATCHES; i++) {
      advanceWeekAsTapped();
      const state = getState();
      expect(failedIntervalProblem()).toBeNull();
      if (matches.length < CARD_WEEK.STAFF_SUPPLY_MATCHES) {
        expect(cadence(state, 'welfare')).toBe(matches.length);
        expect(cadence(state, 'attackCoach')).toBe(matches.length);
        expect(offeredByStaff(state)).toEqual([]);
      }
    }
    const due = getState();
    const pick = latest(due);
    expect(new Set(matches.map(m => m.id)).size).toBe(3);
    expect(pick.week).toBe(matches.slice(-1)[0]!.slot);
    expect(pick.kind).toBe('match');
    expect(pick.cards).toHaveLength(CARD_WEEK.PICKS.match.show);
    const staffGift = offeredByStaff(due, 'attackCoach')[0]!;
    expect(staffGift.kind).toBe('setPlay');
    if (staffGift.kind !== 'setPlay') throw new Error('Expected set play');
    expect(PLAYS_BY_ID[staffGift.playId].family).toBe('direct');
    expect(due.playbook.owned).not.toContain(staffGift.playId);
    expect(offeredByStaff(due, 'welfare')).toHaveLength(1);
    expect(cadence(due, 'welfare')).toBe(0);
    expect(cadence(due, 'attackCoach')).toBe(0);
    expect(cardOfferView(due, pick.grant).keepsLeft).toBe(2);
    expect(saveIfChanged(due)).toBe(true);
    const restored = loadSlot(1);
    expect(restored).toMatchObject({ status: 'ok', repairs: [] });
    if (restored.status !== 'ok') throw new Error('Could not reload normal save');
    expect(offeredByStaff(restored.state)).toEqual(offeredByStaff(due));
    expect(cardWeekTick(restored.state)).toBe(restored.state);
    stubDocument();
    loadState(restored.state);
    openCardPick(pick.grant);
    const pickWords = (document.body as unknown as StubNode).querySelector('[data-card-pick]')!.words();
    expect(pickWords).toContain('From your Welfare Manager');
    expect(pickWords).toContain('From your Attack Coach');
    const rerolled = changed(rerollCard(restored.state, pick.grant));
    expect(offeredByStaff(rerolled)).toEqual(offeredByStaff(due));
    expect(latest(rerolled).cards).toHaveLength(5);
    expect(latest(rerolled).cards.filter(c => c.kind === 'setPlay' && c.playId === staffGift.playId)).toHaveLength(1);
    const index = latest(rerolled).cards.findIndex(c => c.cardId === staffGift.cardId);
    const held = changed(takeCard(rerolled, index, pick.grant));
    const rerolledAfterKeep = changed(rerollCard(held, pick.grant));
    expect(latest(rerolledAfterKeep).cards.some(c => c.kind === 'setPlay' && c.playId === staffGift.playId)).toBe(false);
    expect(offeredByStaff(rerolledAfterKeep, 'welfare')).toEqual(offeredByStaff(due, 'welfare'));
    const used = playPickCard(rerolled, index, undefined, pick.grant);
    if (typeof used === 'string') throw new Error(used);
    expect(used.state.playbook.owned).toContain(staffGift.playId);
    expect(cardOfferView(used.state, pick.grant).keepsLeft).toBe(1);
    expect(offeredByStaff(used.state, 'welfare')).toEqual(offeredByStaff(due, 'welfare'));
    const passed = changed(passCard(used.state, pick.grant));
    expect(passed.cardWeek!.offers.some(o => o.grant === pick.grant)).toBe(false);
  }, 30_000);

  it('starts old staff without an invented appointment clock and rejects bogus current metadata', async () => {
    const state = await prepareLeagueCareer({ clubName: 'Staff Migration', seed: 7919, cardWeek: true });
    const member: StaffMember = { role: 'welfare', hiredSeason: 1, name: 'Morgan', wage: 1_000 };
    const candidate = staffState(state, [member]);
    const old = { ...candidate, version: 42 };
    const migrated = migrateState(JSON.parse(JSON.stringify(old)));
    expect(migrated).toMatchObject({ ok: true, outcome: 'valid', state: { version: SAVE_VERSION, staff: [member] }, repairs: [] });
    expect(migrateState({ ...candidate, staff: [{ ...member, cardSupplyMatches: 4 }] }).ok).toBe(false);
    const cw = candidate.cardWeek!;
    const [starter] = cw.offers;
    const fake = { ...starter!.cards[0]!, staffSource: 'welfare' };
    const bad = { ...candidate, cardWeek: { ...cw, offers: [{ ...starter!, cards: [fake, ...starter!.cards.slice(1)] }, ...cw.offers.slice(1)] } };
    expect(migrateState(bad).ok).toBe(false);
  });

  it('applies the ordinary recovery cap to a staff face even when it is the third held same card', async () => {
    const state = await prepareLeagueCareer({ clubName: 'Staff cap', seed: 7919, cardWeek: true });
    const recovery = { cardId: 'iceBaths', kind: 'recovery' as const, staffSource: 'welfare' as const };
    const hand = [{ cardId: recovery.cardId, offered: recovery, level: 1 as const, gotSeason: 1, gotWeek: 1 }];
    const cw = state.cardWeek!;
    const waiting = { ...state, cardWeek: { ...cw, weeklyFatigue: { [state.squad[0]!.id]: 90 },
      starterLeft: 0, owed: 1, offers: [{ season: 1, week: 1, kind: 'match' as const, cards: [recovery, ...cw.offers[0]!.cards.slice(1)],
        keptCardIds: [], grant: cw.grants + 1 }], grants: cw.grants + 1, hand: [...hand, ...hand] } };
    expect(takeCard(waiting, 0, latest(waiting).grant)).toMatch(/hold 2 recovery cards/i);
    const played = playPickCard(waiting, 0, undefined, latest(waiting).grant);
    if (typeof played === 'string') throw new Error(played);
    expect(played.state.cardWeek!.hand).toEqual(waiting.cardWeek!.hand);
    expect(played.state.cardWeek!.weeklyFatigue[state.squad[0]!.id]).toBe(60);
    expect(typeof passCard(waiting, latest(waiting).grant)).not.toBe('string');
  });
});
