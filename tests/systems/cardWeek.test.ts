import { cardSheetBonuses } from '../../src/systems/cardBonuses';
// Card week (#846): pick one card from three before round 1 and after each
// League match. Rules, state and save; the pick screen comes later.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { advanceUntil } from '../../src/core/advance';
import { runMatch } from '../../src/match/league/match';
import { LiveSim } from '../../src/match/league/live';
import * as matchEngine from '../../src/match/league/match';
import { eventOpportunities } from '../../src/systems/eventOpportunities';
import { registerEventsSystem } from '../../src/systems/events';
import { registerEconomySystem, registerFinanceSystem } from '../../src/systems/economy';
import { registerTrainingSystem } from '../../src/systems/training';
import { registerMoraleSystem } from '../../src/systems/morale';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, classicSlots, firstRunSlotSummaries, loadCareer, migrateState, saveIfChanged, setActiveSlot, slotHasLeagueData } from '../../src/core/save';
import { isClassicSave } from '../../src/core/classicSave';
import { isCardWeek, LEGACY_CARD_OFFER_SIZE } from '../../src/core/saveValidation';
import { careerActionClock } from '../../src/core/season';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX, slotKey } from '../../src/core/storageKeys';
import { createNewGame, getState, loadState, newCardWeek, SAVE_VERSION, setState, type GameState, type OfferedCard, type Player, type Position } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, withFastForward, weekHeld } from '../../src/core/time';
import { BOARD, SQUAD_CAP, STAT_MAX } from '../../src/config';
import { CARD_WEEK, CARDS, SIGNATURE_TRAIT, cardDefById, PLAYER_CARD_MARGIN } from '../../src/data/cards';
import { AROUND_SPREAD, overallRating, POSITIONS, shownStats } from '../../src/data/player';
import { effectiveRating, FIT, positionFit } from '../../src/systems/lineup';
import { playerRivalContext, rivalSheet } from '../../src/systems/rivalRound';
import { releasedState } from '../../src/systems/freeagency';
import { PLAY_IDS, PLAYS_BY_ID, playsOfFamily } from '../../src/data/plays';
import { TRAITS, traitLevel } from '../../src/data/traits';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import {
  activeCard, activeCardStaff, cardFloor, cardFloorMan, cardHandView, floorLine, expireSeasonDecree, cardOfferView, cardWeekTick, chooseCard, passCard, passPick, discardCard, playCard, playChosenCard, playPickCard, drawOffer, fillCardOffers, freePlayCandidates, lastMatchImpact, plantCard,
  playedLeagueMatch, registerCardWeekSystem, rerollCard, rerollCost, rerollPick, startCardWeek, takeCard, traitTargets, type CardFaceView, type CardTake,
} from '../../src/systems/cardWeek';
import { capRoomFor, commitment, publishedCap } from '../../src/systems/cap';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { createOpenCupOffer } from '../../src/systems/openCupEntry';
import { registerFixturesSystem } from '../../src/systems/fixtures';
import { acceptLeagueEntry, previewLeagueEntry } from '../../src/systems/leagueEntry';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { readLiveMatch } from '../../src/systems/liveMatchRecord';
import { registerPlayerMatchSystem, rivalMatchSheet } from '../../src/systems/matchday';
import { ATTACK_COACHES, STAFF, STAFF_APPOINTMENT_PRICES, STAFF_ROLES, attackCoachWage, hireStaff, newStaffMember, releaseStaff, staffWage } from '../../src/systems/staff';
import { classifyReason, weeklyWages } from '../../src/systems/economy';
import type { MatchEvent } from '../../src/sim/events';
import { entrySnapshots } from '../data/leagueCareerFixtures';

afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); clearHeldWeek(); clearTickHooks(); clearSeasonHooks(); bus.clear(); setCareerNamespace(null); __setStorage(null);
});

/** A prepared card-week League career, before round 1. */
const career = async (seed = 7, cardWeek = true): Promise<GameState> => {
  selectPack('au');
  return prepareLeagueCareer({ clubName: 'Card FC', seed, cardWeek });
};

const taken = (r: CardTake | string): CardTake => {
  if (typeof r === 'string') throw new Error(`refused: ${r}`);
  return r;
};

function changed(r: GameState | string): GameState {
  if (typeof r === 'string') throw new Error(r);
  return r;
}

const planted = (s: GameState, cardId: string): GameState => {
  const r = plantCard(s, cardId);
  if (typeof r === 'string') throw new Error(`not planted: ${r}`);
  return r;
};

/** The card on show at 0, which plantCard put there. */
const first = (s: GameState): OfferedCard => s.cardWeek!.offers[0]!.cards[0]!;

/** Mark the club's fixture in `week` completed, in the instances `pick` chooses. */
const played = (s: GameState, week: number, pick: (format: string) => boolean = () => true): GameState => ({
  ...s,
  week,
  competitions: {
    ...s.competitions!,
    instances: s.competitions!.instances.map((instance) => !pick(instance.definition.format.kind) ? instance : {
      ...instance,
      fixtures: instance.fixtures.map((f) => f.slot !== week || (f.homeId !== s.clubId && f.awayId !== s.clubId) ? f : {
        ...f, status: 'completed' as const,
        result: { homeScore: 10, awayScore: 0, winnerId: f.homeId, decider: 'score' as const },
      }),
    }),
  },
});

/** The first slot with a League fixture for the club. */
const leagueSlot = (s: GameState): number => Math.min(...s.competitions!.instances
  .filter((i) => i.definition.format.kind === 'league')
  .flatMap((i) => i.fixtures.filter((f) => f.homeId === s.clubId || f.awayId === s.clubId).map((f) => f.slot!)));

describe('a new card-week career', () => {
  it('owes three picks and shows five different known cards, the same for the same seed', async () => {
    const a = await career(7);
    const b = await career(7);
    expect(a.cardWeek).toMatchObject({ owed: 0, starterLeft: 3, grants: 3 });
    const ids = a.cardWeek!.offers[0]!.cards.map((c) => c.cardId);
    expect(ids).toHaveLength(CARD_WEEK.PICKS.starter.show);
    expect(new Set(ids).size).toBe(CARD_WEEK.PICKS.starter.show);
    expect(ids.every((id) => cardDefById(id))).toBe(true);
    expect(b.cardWeek).toEqual(a.cardWeek);
    expect(isCardWeek(a.cardWeek)).toBe(true);
  });

  it('leaves the main seed, the events deck and the rest of the career exactly as a career without it', async () => {
    const a = await career(11, true);
    const b = await career(11, false);
    expect(b.cardWeek).toBeUndefined();
    const { cardWeek: _cw, ...rest } = a;
    expect(rest).toEqual(b);
  });

  it('draws the same offer from the same stream, and only moves the card week stream', async () => {
    const s = await career(19);
    const again = { ...s, cardWeek: { ...s.cardWeek!, offers: [] } };
    const one = drawOffer(again);
    const two = drawOffer(again);
    expect(one).toEqual(two);
    expect(one.offer!.cards).toHaveLength(CARD_WEEK.PICKS.match.show);
    expect(one.rng).not.toBe(s.cardWeek!.rng);
  });

  it('avoids repeating the same five starter cards when another draw is available', async () => {
    const base = await career();
    const first = drawOffer(base, 'starter').offer!;
    const signature = (offer: { cards: OfferedCard[] }) => offer.cards.map(c => c.cardId).sort();
    expect(drawOffer(base, 'starter').offer).toEqual(first);
    const redrawn = drawOffer(base, 'starter', [first]).offer!;
    expect(redrawn.cards).toHaveLength(CARD_WEEK.PICKS.starter.show);
    expect(signature(redrawn)).not.toEqual(signature(first));
    expect(drawOffer(base, 'starter', [first]).offer).toEqual(redrawn);
  });

  it('keeps the identical offer through a save and reload', async () => {
    const s = await career(23);
    const loaded = migrateState(JSON.parse(JSON.stringify(s)));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.cardWeek).toEqual(s.cardWeek);
    expect(cardOfferView(loaded.state)).toEqual(cardOfferView(s));
  });

  it('is only a League career option: a Classic career never has one', () => {
    const s = createNewGame('Classic FC', 5, { cardWeek: true });
    expect(s.cardWeek).toBeUndefined();
  });
});

describe('five-card picks', () => {
  async function matchPick(): Promise<GameState> {
    const s = await career();
    const passStarters = s.cardWeek!.offers.reduce(state => changed(passCard(state)), s);
    return cardWeekTick(played(passStarters, leagueSlot(s), format => format === 'league'));
  }

  it('deals five different match cards and closes after a take and a play', async () => {
    const s = planted(await matchPick(), 'cashInjection');
    const [offer] = s.cardWeek!.offers;
    expect(offer!.cards).toHaveLength(5);
    expect(new Set(offer!.cards.map(card => card.cardId)).size).toBe(5);
    const half = changed(takeCard(s, 0, offer!.grant));
    expect(half.cardWeek!.offers[0]).toMatchObject({ grant: offer!.grant, cards: offer!.cards.slice(1) });
    expect(cardOfferView(half, offer!.grant)).toMatchObject({ keepsLeft: 1 });
    expect(half.cardWeek).toMatchObject({ owed: 1, grants: s.cardWeek!.grants });
    const playable = cardOfferView(half, offer!.grant).cards.find(c => !c.refusal)!;
    const done = taken(playPickCard(half, playable.index, playable.targets?.[0]?.playerId, offer!.grant)).state;
    expect(done.cardWeek).toMatchObject({ owed: 0, offers: [], grants: s.cardWeek!.grants });
    expect(done.cardWeek!.hand.map(h => h.cardId)).toEqual(['cashInjection']);
    expect(takeCard(done, 0, offer!.grant)).toBe('That pick is no longer waiting.');
  });

  it('shows five in each starter pick and uses one keep in each', async () => {
    let s = await career();
    const grants = s.cardWeek!.grants;
    while (s.cardWeek!.starterLeft) {
      const offer = s.cardWeek!.offers[0]!;
      expect(offer.cards).toHaveLength(5);
      const face = cardOfferView(s, offer.grant).cards.find(c =>
        !c.takeRefusal && !s.cardWeek!.hand.some(held => held.cardId === c.cardId))!;
      s = changed(takeCard(s, face.index, offer.grant));
      expect(takeCard(s, 0, offer.grant)).toBe('That pick is no longer waiting.');
    }
    expect(s.cardWeek).toMatchObject({ starterLeft: 0, owed: 0, grants, offers: [] });
    expect(s.cardWeek!.hand).toHaveLength(3);
  });

  it('rerolls the remaining slots after a keep without bringing back its card or its keep', async () => {
    const s = planted(await matchPick(), 'cashInjection');
    const [offer] = s.cardWeek!.offers;
    const half = changed(takeCard(s, 0, offer!.grant));
    const rerolled = changed(rerollCard(half, offer!.grant));
    expect(rerollCard(half, offer!.grant)).toEqual(rerolled);
    expect(rerolled.money).toBe(half.money - CARD_WEEK.REROLL_BASE);
    expect(rerolled.cardWeek!.hand).toEqual(half.cardWeek!.hand);
    expect(rerolled.cardWeek!.offers[0]!.cards).toHaveLength(4);
    expect(rerolled.cardWeek!.offers[0]!.cards.every(c => c.cardId !== 'cashInjection')).toBe(true);
    expect(cardOfferView(rerolled, offer!.grant)).toMatchObject({ keepsLeft: 1 });
    const passed = changed(passCard(rerolled, offer!.grant));
    expect(passed.cardWeek).toMatchObject({ owed: 0, offers: [], grants: half.cardWeek!.grants });
    expect(passed.cardWeek!.hand).toEqual(half.cardWeek!.hand);
    expect(passed.cardWeek!.history.slice(-1)[0]).toMatchObject({ action: 'pass' });
  });

  it('refuses a second take with the hand full and allows Play now', async () => {
    let s = await matchPick();
    const offer = s.cardWeek!.offers[0]!;
    const hand = CARDS.filter(c => c.kind === 'trait')
      .slice(0, CARD_WEEK.HAND_CAP - 1)
      .map(c => ({ cardId: c.id, level: 1 as const, offered: { kind: 'trait' as const, cardId: c.id }, gotSeason: s.season, gotWeek: s.week }));
    expect(hand).toHaveLength(CARD_WEEK.HAND_CAP - 1);
    s = planted({ ...s, cardWeek: { ...s.cardWeek!, hand } }, 'cashInjection');
    const half = changed(takeCard(s, 0, offer.grant));
    const face = cardOfferView(half, offer.grant).cards.find(c => !c.refusal && !c.upgrade)!;
    expect(half.cardWeek!.hand).toHaveLength(CARD_WEEK.HAND_CAP);
    expect(takeCard(half, face.index, offer.grant)).toMatch(/hand is full/);
    const done = taken(playPickCard(half, face.index, face.targets?.[0]?.playerId, offer.grant)).state;
    expect(done.cardWeek!.offers).toEqual([]);
    expect(done.cardWeek!.hand).toEqual(half.cardWeek!.hand);
  });
});

describe('each card does what its face says', () => {
  it('a player card brings a better man than the club has there, with no fee, on the cap', async () => {
    const s = await career(29);
    const clubBest = Math.max(...s.squad.map(overallRating));
    for (const def of CARDS.filter((c) => c.kind === 'player')) {
      // The position of the club's best player gets no card (the star-position rule).
      if (def.kind === 'player' && cardFloor(s.squad, def.position) >= clubBest) {
        expect(typeof plantCard(s, def.id)).toBe('string');
        continue;
      }
      const p = planted(s, def.id);
      const card = first(p);
      if (card.kind !== 'player') throw new Error('not a player card');
      const position = card.player.position;
      const best = cardFloor(s.squad, position);
      expect(position).toBe(def.kind === 'player' ? def.position : position);
      const r = taken(playPickCard(p, 0));
      const joined = r.state.squad.find((x) => x.id === r.joined!.id)!;
      expect(overallRating(joined)).toBeGreaterThan(best);
      // No signing fee: the only money is a named replacement's release payout.
      const payout = r.money.reduce((t, m) => t + m.amount, 0);
      expect(r.money.every((m) => m.reason === `release:${card.replacesId}`)).toBe(true);
      expect(r.state.money).toBe(p.money + payout);
      expect(r.state.squad).toHaveLength(p.squad.length + (card.replacesId ? 0 : 1));
      expect(joined.id).toMatch(/^career-person:/);
      expect(joined.deal!.salary).toBe(card.salary);
      expect(r.state.cardWeek!.cardPlayers).toEqual([joined.id]);
      expect(commitment(r.state.squad, careerActionClock(r.state).season)).toBeLessThanOrEqual(publishedCap(r.state.capAccount));
      expect(r.state.playerPopulation.nextPlayerOrdinal).toBeGreaterThan(p.playerPopulation.nextPlayerOrdinal);
    }
  });

  it('takes a resolved card into the hand and keeps the next offer and both career streams intact', async () => {
    const s = await career(31);
    const r = changed(takeCard(s, 0));
    const cw = r.cardWeek!;
    expect(cw.starterLeft).toBe(2);
    expect(cw.owed).toBe(0);
    expect(cw.hand).toEqual([{ cardId: first(s).cardId, offered: first(s), level: 1, gotSeason: 1, gotWeek: 1 }]);
    expect(cw.history).toEqual([{ cardId: first(s).cardId, season: 1, week: 1, action: 'take' }]);
    expect(cw.offers).toEqual(s.cardWeek!.offers.slice(1));
    expect(cw.rng).toBe(s.cardWeek!.rng);
    const { cardWeek: _before, ...original } = s;
    const { cardWeek: _after, ...unchanged } = r;
    expect(unchanged).toEqual(original);
    expect(migrateState(JSON.parse(JSON.stringify(r)))).toMatchObject({ ok: true, state: { cardWeek: cw } });
  });

  it('holds five distinct cards and refuses a sixth until there is room', async () => {
    let s = await career(31);
    for (const id of ['analyst', 'assistantCoach', 'lastLine', 'playmaker', 'finisher']) s = changed(takeCard(planted(s, id), 0));
    expect(s.cardWeek!.hand).toHaveLength(CARD_WEEK.HAND_CAP);
    const waiting = planted(s, 'cashInjection');
    expect(takeCard(waiting, 0)).toMatch(/hand is full/i);
    const immediate = taken(playPickCard(waiting, 0));
    expect(immediate.state.cardWeek!.hand).toEqual(waiting.cardWeek!.hand);
    expect(immediate.state.cardWeek!.offers).toHaveLength(0);
    expect(immediate.state.cardWeek!.history.slice(-2).map(h => h.action)).toEqual(['take', 'play']);
    expect(immediate.money).toMatchObject([{ amount: 15_000 }]);
    expect(waiting.cardWeek!.offers).toHaveLength(1);
    expect(waiting.cardWeek!.hand).toHaveLength(5);
    const discarded = changed(discardCard(waiting, 2));
    expect(discarded.cardWeek!.history.slice(-1)[0]).toMatchObject({ cardId: 'lastLine', action: 'discard' });
    expect(discarded.cardWeek!.offers).toEqual(waiting.cardWeek!.offers);
    const afterDiscard = changed(takeCard(discarded, 0));
    expect(afterDiscard.cardWeek!.hand).toHaveLength(5);
    expect(afterDiscard.cardWeek!.offers).toHaveLength(0);
  });

  it('takes a trait without choosing a player and asks for a target at play time', async () => {
    const s = await career(43);
    const r = changed(takeCard(planted(s, 'lastLine'), 0));
    expect(r.squad).toBe(s.squad);
    expect(playCard(r, 0)).toBe('Choose a player for the trait.');
    const target = traitTargets(r, 'lastLine')[0]!;
    const out = taken(playCard(r, 0, target.player.id)).state;
    expect(out.cardWeek!.hand).toEqual([]);
    expect(out.cardWeek!.history.map(h => h.action)).toEqual(['take', 'play']);
    expect(out.cardWeek!.cardTraits).toEqual([{ playerId: target.player.id, trait: 'lastLine', level: target.level }]);
  });

  it('a staff card waives the fee and only upgrades the card hire', async () => {
    const s = await career(37);
    const p = planted(s, 'analyst');
    const r = taken(playPickCard(p, 0));
    const hire = r.state.staff.find((m) => m.role === 'analyst')!;
    expect(hire.name).toBe((first(p) as { name: string }).name);
    expect(hire.wage).toBe(staffWage(s, 'analyst'));
    expect(r.state.money).toBe(p.money);
    expect(r.money).toEqual([]);
    expect(typeof plantCard(r.state, 'analyst')).toBe('object');
    const paid = { ...s, staff: [newStaffMember(s, 'analyst', 'Paid hire')] };
    expect(plantCard(paid, 'analyst')).toBe('That card cannot be offered now.');
  });

  it('a set play card adds a play the club could buy, free, and needs an attack coach to be offered', async () => {
    const s = await career(41);
    expect(freePlayCandidates(s)).toEqual([]);
    expect(plantCard(s, 'setPlay')).toBe('That card cannot be offered now.');
    const coached = { ...s, money: 0, staff: [newStaffMember(s, { attackCoach: 'direct' }, 'Coach')] };
    const p = planted(coached, 'setPlay');
    const card = first(p);
    if (card.kind !== 'setPlay') throw new Error('not a set play');
    expect(freePlayCandidates(coached)).toContain(card.playId);
    const r = taken(playPickCard(p, 0));
    expect(r.state.playbook.owned).toEqual([card.playId]);
    expect(r.state.money).toBe(0);
  });

  it('a trait upgrade stays with the man chosen at Level I and stops at III', async () => {
    const s = await career(43);
    const target = s.squad.find(p => traitLevel(p.traits, 'lastLine') === 0)!;
    let state = s;
    for (const level of [1, 2, 3]) {
      state = planted(state, 'lastLine');
      expect(cardOfferView(state).cards[0]!.level).toBe(level);
      state = taken(playPickCard(state, 0, level === 1 ? target.id : undefined)).state;
      expect(traitLevel(state.squad.find(p => p.id === target.id)!.traits, 'lastLine')).toBe(level);
    }
    expect(traitTargets(state, 'lastLine').some(t => t.player.id === target.id)).toBe(false);
    expect(plantCard(state, 'lastLine')).toBe('That card cannot be offered now.');
  });

  it('a cash card pays into the bank through the books', async () => {
    const s = await career(47);
    loadState(planted(s, 'cashInjection'));
    const before = getState().money;
    const moves: { delta: number; reason: string }[] = [];
    bus.on('money:changed', (m) => { moves.push({ delta: m.delta, reason: m.reason }); });
    expect(playChosenCard('pick', 0)).toEqual({ ok: true, outcome: 'Cash injection: +$15,000.' });
    expect(getState().money).toBe(before + 15_000);
    expect(moves).toEqual([{ delta: 15_000, reason: 'card: Cash injection' }]);
    expect(classifyReason('card: Cash injection')).toBe('events');
    expect(playChosenCard('pick', 5)).toEqual({ ok: false, reason: 'There is no card there.' });
  });

  it('the dilemma brings a stronger man and costs one point of board patience, never the last', async () => {
    const s = { ...(await career(53)), boardPatience: 3 };
    const p = planted(s, 'marqueeGamble');
    const r = taken(playPickCard(p, 0));
    expect(r.state.boardPatience).toBe(2);
    expect(r.state.squad.some((x) => x.id === r.joined!.id)).toBe(true);
    const card = first(p);
    if (card.kind !== 'dilemma') throw new Error('not the dilemma');
    expect(overallRating(r.joined!)).toBeGreaterThan(cardFloor(s.squad, card.player.position));
    const impatient = { ...p, boardPatience: 1 };
    const refusal = "The board can't take another gamble right now.";
    expect(takeCard(impatient, 0)).toBe(refusal);
    expect(playPickCard(impatient, 0)).toBe(refusal);
    expect(playCard({ ...changed(takeCard(p, 0)), boardPatience: 1 }, 0)).toBe(refusal);
    expect(impatient.cardWeek).toBe(p.cardWeek);
    expect(plantCard({ ...s, boardPatience: 1 }, 'marqueeGamble')).toBe('That card cannot be offered now.');
    expect(BOARD.MAX_PATIENCE).toBeGreaterThanOrEqual(3);
  });
});

describe('the card floor', () => {
  /** The squad's star moved to `away` position with a big rating, so only fit sets him near `position`. */
  const withStar = (s: GameState, at: Position): GameState => {
    const star = s.squad.find((p) => p.position === at)!;
    const boosted = { ...star, stats: Object.fromEntries(Object.entries(star.stats).map(([k]) => [k, 90])) as unknown as Player['stats'] };
    return { ...s, money: 10_000_000, squad: s.squad.map((p) => (p === star ? boosted : p)) };
  };

  it('reads the best natural player at the position, not a star from elsewhere at his fit', async () => {
    const s = withStar(await career(97), 'halfback');
    const naturals = s.squad.filter((p) => p.position === 'fullback');
    expect(naturals.length).toBeGreaterThan(0);
    const floor = Math.max(...naturals.map(overallRating));
    expect(cardFloor(s.squad, 'fullback')).toBe(floor);
    // The halfback star, at his 0.8 fit there, would read far higher than the club's fullbacks.
    expect(effectiveRating(s.squad.find((p) => overallRating(p) >= 89)!, 'fullback')).toBeGreaterThan(floor + 10);
    for (let seed = 0; seed < 12; seed++) {
      const p = planted({ ...s, cardWeek: { ...s.cardWeek!, rng: 500 + seed } }, 'fullbackSigning');
      const card = first(p);
      if (card.kind !== 'player') throw new Error('not a player card');
      const rating = overallRating(card.player);
      expect(rating).toBeGreaterThan(floor);
      // The margin, then each stat within ±AROUND_SPREAD of it.
      expect(rating).toBeLessThanOrEqual(floor + PLAYER_CARD_MARGIN.grey + AROUND_SPREAD);
    }
  });

  it('offers no player card at the position of the club\'s best player', async () => {
    const s = withStar(await career(97), 'halfback');
    // The star is the halfback: a gold halfback built on his rating would land in the 90s.
    expect(typeof plantCard(s, 'starHalfback')).toBe('string');
    expect(typeof plantCard(s, 'fullbackSigning')).not.toBe('string');
  });

  it('falls back to a related position, then to anyone, when nobody plays there', async () => {
    const s = await career(101);
    const noHookers = s.squad.filter((p) => p.position !== 'hooker');
    const related = noHookers.filter((p) => positionFit(p.position, 'hooker') === FIT.related);
    expect(related.length).toBeGreaterThan(0);
    expect(cardFloor(noHookers, 'hooker')).toBe(Math.max(...related.map((p) => effectiveRating(p, 'hooker'))));
    const wingers = s.squad.filter((p) => p.position === 'winger');
    expect(cardFloor(wingers, 'prop')).toBe(Math.max(...wingers.map((p) => effectiveRating(p, 'prop'))));
    expect(cardFloor([], 'prop')).toBe(0);
  });

  it('puts a gold man well above a grey one for the same club and position', async () => {
    const s = { ...(await career(103)), money: 10_000_000 };
    const floor = cardFloor(s.squad, 'halfback');
    const grey: number[] = [];
    const gold: number[] = [];
    for (let seed = 0; seed < 10; seed++) {
      const base = { ...s, cardWeek: { ...s.cardWeek!, rng: 900 + seed } };
      // A grey halfback: the prop card's rule at halfback, via the floor and the grey margin.
      const g = first(planted(base, 'starHalfback'));
      if (g.kind !== 'player') throw new Error('not a player card');
      gold.push(overallRating(g.player));
      const c = first(planted(base, 'propSigning'));
      if (c.kind !== 'player') throw new Error('not a player card');
      grey.push(overallRating(c.player) - cardFloor(s.squad, 'prop'));
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(gold) - floor).toBeGreaterThan(mean(grey) + 8);
    for (const r of gold) expect(r).toBeLessThanOrEqual(Math.min(99, floor + PLAYER_CARD_MARGIN.gold) + AROUND_SPREAD);
  });
});

describe('passing a pick', () => {
  it('spends the pick with no card, records the pass and draws the next', async () => {
    const s = await career(83);
    const r = passCard(s);
    if (typeof r === 'string') throw new Error(r);
    const cw = r.cardWeek!;
    expect(cw.starterLeft).toBe(2);
    expect(cw.owed).toBe(0);
    expect(cw.history).toEqual([{ cardId: 'pass', season: 1, week: 1, action: 'pass' }]);
    expect(cw.offers[0]!.cards).toHaveLength(CARD_WEEK.PICKS.starter.show);
    expect(r.squad).toEqual(s.squad);
    expect(r.money).toBe(s.money);
    expect(isCardWeek(cw)).toBe(true);
    const last = passCard({ ...s, cardWeek: { ...s.cardWeek!, starterLeft: 1, offers: s.cardWeek!.offers.slice(0, 1) } });
    if (typeof last === 'string') throw new Error(last);
    expect(last.cardWeek!.offers).toEqual([]);
    expect(passCard(last)).toBe('No pick is waiting.');
  });

  it('frees a pick whose three cards are all refused', async () => {
    const s = await career(89);
    // Every card on show is refused: the set play is owned, everyone already has Last Line III, and the
    // squad is full with nobody the club can afford to release for the prop.
    const prop = planted({ ...s, money: 10_000_000 }, 'propSigning').cardWeek!.offers[0]!.cards[0]!;
    const stuck: GameState = { ...s, money: -1,
      squad: s.squad.map((p) => ({ ...p, traits: [{ id: 'lastLine' as const, level: 3 as const }] })),
      cardWeek: { ...s.cardWeek!, starterLeft: 1, offers: [{ kind: 'starter', season: 1, week: 1, keptCardIds: [], cards: [
        { ...prop, replacesId: s.squad[0]!.id, replacesName: s.squad[0]!.name } as OfferedCard,
        { cardId: 'setPlay', kind: 'setPlay', playId: 'block-play' }, { cardId: 'lastLine', kind: 'trait' },
      ] }] }, playbook: { owned: ['block-play'] } };
    const view = cardOfferView(stuck);
    expect(view.cards).toHaveLength(3);
    expect(view.cards.every((c) => c.refusal !== null)).toBe(true);
    expect([0, 1, 2].every((i) => typeof playPickCard(stuck, i, 'nobody') === 'string')).toBe(true);
    loadState(stuck);
    expect(passPick()).toEqual({ ok: true });
    expect(getState().cardWeek!.owed).toBe(0);
    expect(getState().cardWeek!.offers).toEqual([]);
  });
});

describe('the squad limit and the salary cap', () => {
  /** Pad the squad to SQUAD_CAP with copies of its own men on a nominal wage, so the cap still has room. */
  const fullSquad = (s: GameState): GameState => {
    const extra: Player[] = Array.from({ length: SQUAD_CAP - s.squad.length }, (_, i) => {
      const p = s.squad[i % s.squad.length]!;
      return { ...p, id: `pad-${i}`, deal: { ...p.deal!, salary: 1 } };
    });
    return { ...s, money: 10_000_000, squad: [...s.squad, ...extra] };
  };

  it('a full squad names the man he replaces, the weakest at his position, and releases exactly him', async () => {
    const s = fullSquad(await career(59));
    const p = planted(s, 'propSigning');
    const card = first(p);
    if (card.kind !== 'player') throw new Error('not a player card');
    expect(card.replacesId).toBeDefined();
    const props = s.squad.filter((x) => x.position === 'prop').sort((a, b) => overallRating(a) - overallRating(b) || a.id.localeCompare(b.id));
    expect(card.replacesId).toBe(props[0]!.id);
    expect(cardOfferView(p).cards[0]!.player!.replacesName).toBe(props[0]!.name);
    const r = taken(playPickCard(p, 0));
    expect(r.state.squad).toHaveLength(SQUAD_CAP);
    expect(r.state.squad.some((x) => x.id === card.replacesId)).toBe(false);
    expect(r.state.freeAgents.some((x) => x.id === card.replacesId)).toBe(true);
    expect(r.state.squad.filter((x) => !s.squad.some((y) => y.id === x.id))).toHaveLength(1);
  });

  it('with no cap room the replacement frees enough of it, and the club stays under the cap', async () => {
    const base = await career(61);
    const season = careerActionClock(base).season;
    const cap = publishedCap(base.capAccount);
    // One bench man's pay fills the cap to within $1,000.
    const benchId = base.lineup.bench[0]!;
    const room = cap - commitment(base.squad, season) - 1_000;
    const s: GameState = {
      ...base, money: 10_000_000,
      squad: base.squad.map((x) => x.id === benchId ? { ...x, deal: { ...x.deal!, salary: x.deal!.salary + room } } : x),
    };
    const p = planted(s, 'hookerSigning');
    const card = first(p);
    if (card.kind !== 'player') throw new Error('not a player card');
    expect(capRoomFor(s.squad, s.capAccount, season, card.salary)).toBe(false);
    expect(card.replacesId).toBeDefined();
    const r = taken(playPickCard(p, 0));
    expect(commitment(r.state.squad, season)).toBeLessThanOrEqual(cap);
    expect(r.state.squad.some((x) => x.id === card.replacesId)).toBe(false);
  });

  it('no pick ever takes the club over the squad limit or the cap, over many picks', async () => {
    let s = fullSquad(await career(67));
    const season = careerActionClock(s).season;
    for (let i = 0; i < 30; i++) {
      if (!s.cardWeek!.offers.length) {
        const draw = drawOffer(s);
        s = { ...s, cardWeek: { ...s.cardWeek!, rng: draw.rng, owed: 1, offers: [draw.offer!] } };
      }
      const r = playPickCard(s, i % s.cardWeek!.offers[0]!.cards.length, s.squad[i % s.squad.length]!.id);
      if (typeof r === 'string') { s = changed(passCard(s)); continue; }
      s = r.state;
      expect(s.squad.length).toBeLessThanOrEqual(SQUAD_CAP);
      expect(commitment(s.squad, season)).toBeLessThanOrEqual(publishedCap(s.capAccount));
    }
  });

  it('a card that cannot be made legal is never offered', async () => {
    const base = fullSquad(await career(71));
    // Nobody can be released: the club is in debt, so no payout is affordable.
    const broke = { ...base, money: -1 };
    const draws = Array.from({ length: 25 }, (_, i) => drawOffer({ ...broke, cardWeek: { ...broke.cardWeek!, rng: 1000 + i } }).offer!);
    for (const offer of draws) {
      for (const c of offer.cards) expect(['player', 'dilemma']).not.toContain(c.kind);
      expect(offer.cards.some((c) => c.kind === 'setPlay')).toBe(false);
    }
    // Every role filled: no staff card.
    const staffed = { ...base, staff: [...STAFF_ROLES.map((r) => newStaffMember(base, r, 'X')), newStaffMember(base, { attackCoach: 'width' }, 'Y')] };
    for (let i = 0; i < 25; i++) {
      const offer = drawOffer({ ...staffed, cardWeek: { ...staffed.cardWeek!, rng: 2000 + i } }).offer!;
      expect(offer.cards.some((c) => c.kind === 'staff')).toBe(false);
      expect(new Set(offer.cards.map((c) => c.cardId)).size).toBe(offer.cards.length);
    }
  });
});

describe('picks owed', () => {
  it('adds a distinct match pick while the starter draft waits, and ignores byes, trials and cup fixtures', async () => {
    const s = await career(73);
    const slot = leagueSlot(s);
    const bye = played({
      ...s,
      competitions: { ...s.competitions!, instances: s.competitions!.instances.map(i => ({
        ...i, fixtures: i.fixtures.filter(f => f.slot !== slot || (f.homeId !== s.clubId && f.awayId !== s.clubId)),
      })) },
    }, slot);
    expect(cardWeekTick(bye)).toBe(bye);
    const trial = played(s, 1);
    expect(playedLeagueMatch(trial)).toBe(false);
    expect(cardWeekTick(trial)).toBe(trial);
    const round = played(s, slot);
    expect(playedLeagueMatch(round)).toBe(true);
    const after = cardWeekTick(round);
    expect(after.cardWeek).toMatchObject({ starterLeft: 3, owed: 1, grants: 4 });
    const offers = after.cardWeek!.offers;
    expect(offers.slice(0, 3)).toEqual(s.cardWeek!.offers);
    expect(offers[3]).toMatchObject({ kind: 'match', week: slot });
    expect(offers[3]!.cards).toHaveLength(CARD_WEEK.PICKS.match.show);
    const ids = (cards: OfferedCard[]) => cards.map(c => c.cardId).sort();
    for (const waiting of s.cardWeek!.offers) expect(ids(offers[3]!.cards)).not.toEqual(ids(waiting.cards));
    expect(cardWeekTick(round)).toEqual(after);
    expect(after.rngSeed).toBe(round.rngSeed);
    expect(after.eventDeck).toBe(round.eventDeck);
    expect(after.money).toBe(round.money);
    const cup = played({
      ...s,
      competitions: { ...s.competitions!, instances: s.competitions!.instances.map((i) => i.definition.format.kind === 'league'
        ? { ...i, definition: { ...i.definition, format: { kind: 'knockout' as const } } } : i) },
    }, slot);
    expect(cardWeekTick(cup)).toBe(cup);
    const { cardWeek: _cw, ...plain } = round;
    expect(cardWeekTick(plain as GameState)).toBe(plain);
  });
});

describe('last match impact', () => {
  it('has a line per man who played, his tries, tackles and line breaks from the match events', async () => {
    const s = await career(79);
    const [a, b, c] = s.squad as [Player, Player, Player];
    const events: MatchEvent[] = [
      { kind: 'try', teamId: 'player', player: a.name } as MatchEvent,
      { kind: 'tackle', teamId: 'player', player: a.name } as MatchEvent,
      { kind: 'big-hit', teamId: 'player', player: b.name } as MatchEvent,
      { kind: 'break', teamId: 'player', player: b.name } as MatchEvent,
      { kind: 'try', teamId: 'rival', player: c.name } as MatchEvent,
    ];
    const impact = lastMatchImpact(s.squad, events, [a.id, b.id, c.id], new Set([a.id, b.id, c.id]), { season: 1, week: 5, opponentName: 'Them' });
    expect(impact.rows).toEqual([
      { playerId: a.id, name: a.name, tries: 1, tackles: 1, lineBreaks: 0 },
      { playerId: b.id, name: b.name, tries: 0, tackles: 1, lineBreaks: 1 },
      { playerId: c.id, name: c.name, tries: 0, tackles: 0, lineBreaks: 0 },
    ]);
  });
});

describe('a League week with the card week on', () => {
  /** An accepted League career at week 1 in the store, as the matchday tests build it. */
  const activeLeague = (seed: number): void => {
    // A League interval needs a save slot to land in.
    const bytes = new Map<string, string>();
    const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
    vi.stubGlobal('localStorage', storage); __setStorage(storage); __unlockSaves(); setActiveSlot(1);
    setCareerNamespace(DEV_TEST_PREFIX);
    createNewGame('Week FC', seed);
    const state = setupStructuralDivisionCareer(AU_CAREER_PROFILE, seed);
    const competitions = state.competitions!;
    const { profile, divisions } = competitions.world!;
    const leagueId = profile.startingDivisionId;
    competitions.leagueCareer = {
      version: 1, scheduleSeed: seed, clubId: state.clubId, phase: 'active',
      initialFields: Object.fromEntries(divisions.map((d) => [d.id, [...competitions.instances.find((i) => i.id === d.instanceId)!.entrantIds]])),
      access: [{ leagueId }],
      accepted: {
        season: 1, startInterval: 0, leagueId, ...entrySnapshots(competitions, 1, leagueId),
        receiptId: leagueEntryReceiptId(profile.id, 1, state.clubId, leagueId), allocationPolicy: 'adjacent-vacancy-v1', movements: [],
      },
    };
    setState(createOpenCupOffer({ ...state, competitions }));
    expect(saveIfChanged(getState())).toBe(true);
  };

  it('adds a pick after the League match and records its lines from the match', () => {
    activeLeague(573);
    setState({ cardWeek: startCardWeek(getState(), newCardWeek(573)).cardWeek! });
    expect(saveIfChanged(getState())).toBe(true);
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    const slot = leagueSlot(getState());
    withFastForward(() => { for (let i = 0; i < 12 && getState().week < slot; i++) advanceWeek(); });
    // The trials before round 1 add no pick.
    expect(getState().cardWeek!.owed).toBe(0);
    const before = new Map(getState().squad.map((p) => [p.id, p.career!]));
    withFastForward(() => advanceWeek());
    const cw = getState().cardWeek!;
    expect(cw).toMatchObject({ starterLeft: 3, owed: 1, grants: 4 });
    expect(cw.lastMatch!.week).toBe(slot);
    expect(cw.lastMatch!.rows.length).toBeGreaterThanOrEqual(9);
    // Each line is what the match added to his career tallies (stats.ts folds the same events).
    for (const row of cw.lastMatch!.rows) {
      const now = getState().squad.find((p) => p.id === row.playerId)!.career!;
      const was = before.get(row.playerId)!;
      expect([row.tries, row.tackles, row.lineBreaks]).toEqual([now.tries - was.tries, now.tackles - was.tackles, now.lineBreaks - was.lineBreaks]);
    }
  });

  it('grants five fresh match picks via advanceWeeks while the starters wait, expiring the two oldest', () => {
    activeLeague(573);
    setState({ cardWeek: startCardWeek(getState(), newCardWeek(573)).cardWeek! });
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    const grants: number[] = [];
    const draws: number[] = [];
    const notices: string[] = [];
    bus.on('ui:notify', ({ text }) => notices.push(text));
    bus.on('week:advanced', () => {
      const cw = getState().cardWeek!;
      if (cw.grants !== grants[grants.length - 1] && cw.owed > 0) {
        grants.push(cw.grants);
        draws.push(cw.offers[cw.offers.length - 1]!.week);
      }
    });
    for (let i = 0; i < 24 && grants.length < 5; i++) advanceWeeks(1);
    const cw = getState().cardWeek!;
    expect(grants).toEqual([4, 5, 6, 7, 8]);
    expect(cw).toMatchObject({ starterLeft: 3, owed: 3 });
    expect(cw.offers.slice(3).map(o => o.week)).toEqual(draws.slice(2));
    expect(cw.history.map(h => [h.action, h.cardId, h.week])).toEqual([
      ['expire', 'expired', draws[3]], ['expire', 'expired', draws[4]],
    ]);
    expect(notices.filter(text => text === 'A card pick expired. Up to 3 can wait.')).toHaveLength(2);
  });

  it('holds the live pick until match:finished and ignores an echoed result', () => {
    activeLeague(573);
    setState({ cardWeek: startCardWeek(getState(), newCardWeek(573)).cardWeek! });
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    advanceWeeks(leagueSlot(getState()) - 1);
    let match: Parameters<typeof bus.emit<'match:finished'>>[1] | undefined;
    bus.on('match:started', ({ fixture, home, away, live }) => {
      match = { fixture, result: runMatch(home, away, { seed: live.seed, weather: live.weather, injuryRate: live.injuryRate! }) };
    });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(rerollPick()).toEqual({ ok: false, reason: 'Finish the current week first.' });
    expect(getState().cardWeek!.grants).toBe(3);
    expect(match).toBeDefined();
    bus.emit('match:finished', match!);
    expect(weekHeld()).toBe(false);
    expect(getState().cardWeek).toMatchObject({ starterLeft: 3, owed: 1, grants: 4 });
    bus.emit('match:finished', match!);
    expect(getState().cardWeek!.grants).toBe(4);
  });

  it('reloads a held Card week from its saved sheets and replays the same match', () => {
    activeLeague(573);
    const state = getState();
    setState({ cardWeek: startCardWeek(state, newCardWeek(573)).cardWeek! });
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    advanceWeeks(leagueSlot(getState()) - 1);
    const before = getState();
    setState({ cardWeek: { ...before.cardWeek!, weeklyFatigue: Object.fromEntries(before.squad.map((p, i) => [p.id, i === 0 ? 70 : 100])) } });
    expect(saveIfChanged(getState())).toBe(true);
    let started: Parameters<typeof bus.emit<'match:started'>>[1] | undefined;
    bus.on('match:started', match => { started = match; });
    advanceWeek();
    const first = started!;
    const ours = first.home.clubId === state.clubId ? first.home : first.away;
    const rivals = first.home.clubId === state.clubId ? first.away : first.home;
    expect(ours.roster?.length).toBeGreaterThan(0);
    for (const player of ours.roster ?? []) {
      expect(player.startingEnergy).toBeCloseTo(player.id === before.squad[0]!.id ? 0.8 : 0.68);
    }
    const opponent = before.league.clubs.find(club => club.id === rivals.clubId)!;
    expect(JSON.stringify(rivals)).toBe(JSON.stringify(rivalMatchSheet(opponent, playerRivalContext(before, ours.roster ?? []))));
    expect(readLiveMatch()?.sheets).toEqual({ home: first.home, away: first.away });
    const sim = new LiveSim(first.home, first.away, first.live.seed);
    const side = ours === first.home ? 'home' : 'away';
    const meanEnergy = (entries: NonNullable<typeof ours.roster>) =>
      entries.reduce((sum, p) => sum + p.startingEnergy!, 0) / entries.length;
    expect(sim.energyOf(side)).toBeCloseTo(meanEnergy(ours.roster!));
    expect(sim.benchEnergyOf(side)).toBeCloseTo(meanEnergy(ours.bench!));
    expect(sim.energyOf(side === 'home' ? 'away' : 'home')).toBe(1);
    const result = runMatch(first.home, first.away, first.live);

    clearHeldWeek();
    const loaded = loadCareer();
    if (loaded.status !== 'ok') throw new Error(JSON.stringify(loaded));
    loadState({ ...loaded.state, cardWeek: { ...loaded.state.cardWeek!, weeklyFatigue: {} } });
    started = undefined;
    advanceWeek();
    const replay = started as typeof first | undefined;
    expect(replay).toBeDefined();
    expect(replay!.home).toEqual(first.home);
    expect(replay!.away).toEqual(first.away);
    expect(runMatch(replay!.home, replay!.away, replay!.live)).toEqual(result);
    bus.emit('match:finished', { fixture: replay!.fixture, result });
    expect(weekHeld()).toBe(false);
    const fatigue = getState().cardWeek!.weeklyFatigue;
    for (const starter of ours.roster!) expect(fatigue[starter.id!]).toBe(30);
    const bench = ours.bench!;
    const used = bench.filter(p => result.benchPlayed?.includes(p.id!));
    expect(used.length).toBeGreaterThan(0);
    for (const player of bench) expect(fatigue[player.id!] ?? 0).toBe(used.includes(player) ? 15 : 0);
  });

  it.each(['nextManUp', 'width'] as const)('replays saved match sheets with %s and a levelled play', decree => {
    activeLeague(573);
    const s = getState();
    const playId = decree === 'width' ? PLAY_IDS.find(id => PLAYS_BY_ID[id].family === 'width')! : 'block-play';
    setState({
      cardWeek: { ...startCardWeek(s, newCardWeek(573)).cardWeek!,
        decree: { id: decree, season: s.season },
        active: [{ kind: 'setPlay', cardId: 'setPlay', playId, level: 3 },
          { kind: 'decree', cardId: decree, level: 1, season: s.season, week: s.week }] },
      playbook: { owned: [playId] },
      lineup: { ...s.lineup, plays: [playId] },
    });
    registerFixturesSystem(); registerPlayerMatchSystem();
    advanceWeeks(leagueSlot(getState()) - 1);
    let recorded: Parameters<typeof bus.emit<'match:started'>>[1] | undefined;
    bus.on('match:started', match => { recorded = match; });
    advanceWeek();
    expect(weekHeld()).toBe(true);
    expect(recorded).toBeDefined();
    const { fixture, home, away, live } = recorded!;
    const ours = home.clubId === s.clubId ? home : away;
    expect(ours.plays).toEqual([`${playId}:III`]);
    expect(ours.bench?.length).toBeGreaterThan(0);
    for (const entry of ours.bench!) {
      const player = getState().squad.find(p => p.id === entry.id)!;
      const stat = decree === 'width' ? 'handling' : 'strength';
      expect(entry.stats![stat]).toBe(Math.min(STAT_MAX, player.stats[stat] + 3));
    }
    const settings = { seed: live.seed, weather: live.weather, injuryRate: live.injuryRate!, calls: live.calls ?? [],
      ...(live.aiRival ? { aiRival: live.aiRival } : {}) };
    const result = runMatch(home, away, settings);
    const saved = JSON.parse(JSON.stringify({ home, away, settings }));
    expect(runMatch(saved.home, saved.away, saved.settings)).toEqual(result);
    bus.emit('match:finished', { fixture, result });
    expect(weekHeld()).toBe(false);
  });

  it('keeps granting picks in the finals and saves the queue at season end', async () => {
    activeLeague(573);
    const s = getState();
    setState({
      cardWeek: startCardWeek(s, newCardWeek(573)).cardWeek!,
      squad: s.squad.map(p => ({
        ...p, injuryRisk: 1, stats: { speed: 90, strength: 90, stamina: 90, handling: 90, kicking: 90, footyIQ: 90 },
        deal: { ...p.deal!, endSeason: 3 },
      })),
    });
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    const acknowledged = new Set<string>();
    const grantsByWeek = new Map<number, number>();
    bus.on('week:advanced', () => {
      const cw = getState().cardWeek!;
      const offer = cw.offers[cw.offers.length - 1]!;
      if (offer.kind !== 'starter') grantsByWeek.set(offer.week, cw.grants);
      for (const e of eventOpportunities(getState())) acknowledged.add(e.key);
    });
    const end = await advanceUntil({ kind: 'seasonEnd' }, undefined, acknowledged);
    expect(end.stop, end.stop.text).toMatchObject({ kind: 'target' });
    const closed = getState();
    const playedFinals = closed.competitions!.instances.flatMap(instance =>
      instance.definition.format.kind === 'league' ? instance.fixtures.filter(f => f.status === 'completed'
        && (f.homeId === closed.clubId || f.awayId === closed.clubId)
        && instance.definition.stages.some(stage => stage.id === f.stageId && stage.kind === 'knockout')) : []);
    expect(playedFinals.length).toBeGreaterThan(0);
    expect(closed.competitions!.leagueCareer!.phase).toBe('next-season-choice');
    for (const fixture of playedFinals) expect(grantsByWeek.has(fixture.slot!)).toBe(true);
    expect(closed.cardWeek!.grants).toBe(3 + grantsByWeek.size);
    expect(loadCareer().status).toBe('ok');
    const loaded = loadCareer();
    if (loaded.status === 'ok') expect(loaded.state.cardWeek).toEqual(closed.cardWeek);
    expect(closed.cardWeek!.offers.every(o => o.kind !== 'decree')).toBe(true);
    expect(closed.cardWeek!.history).toContainEqual(expect.objectContaining({ cardId: 'decree-pick', action: 'expire' }));
    const used = { ...closed, cardWeek: { ...closed.cardWeek!, strikes: {
      season: closed.season, count: 1, lossRun: 2, log: [{ week: 8, reason: 'margin' as const, margin: 24 }],
    } } };
    const leagueId = used.competitions!.leagueCareer!.accepted!.leagueId;
    const preview = previewLeagueEntry(used, leagueId);
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error(preview.message);
    const next = acceptLeagueEntry(used, { leagueId, previewKey: preview.preview.previewKey });
    expect(next).toMatchObject({ ok: true, state: { season: 2, cardWeek: {
      strikes: { season: 2, count: 0, lossRun: 0, log: [] }, decree: null,
    } } });
  }, 30000);

  it('a career without a card week plays the week exactly as it does with the hook registered', () => {
    let fingerprint = '';
    const run = (hook: boolean): string[] => {
      clearTickHooks(); clearSeasonHooks(); bus.clear();
      activeLeague(577);
      registerTrainingSystem(); registerEconomySystem(); registerFinanceSystem();
      registerFixturesSystem(); registerPlayerMatchSystem(); registerEventsSystem(); registerMoraleSystem();
      if (hook) registerCardWeekSystem();
      const weeks: string[] = [];
      const matches: string[] = [];
      const original = matchEngine.runMatch;
      const spy = vi.spyOn(matchEngine, 'runMatch').mockImplementation((home, away, options) => {
        const result = original(home, away, options);
        if (home.clubId === 'player' || away.clubId === 'player') matches.push(JSON.stringify({ home, away, options, result }));
        return result;
      });
      bus.on('week:advanced', () => weeks.push(JSON.stringify(getState())));
      try { advanceWeeks(getState().competitions!.calendar!.slots.length); }
      finally { spy.mockRestore(); }
      expect(getState().competitions!.leagueCareer!.phase).toBe('next-season-choice');
      expect(weeks).toHaveLength(getState().competitions!.calendar!.slots.length);
      expect(getState().cardWeek).toBeUndefined();
      expect(matches.length).toBeGreaterThan(0);
      if (!hook) fingerprint = createHash('sha256').update(JSON.stringify(matches)).digest('hex');
      const closed = getState();
      if (closed.sacked) return [...weeks, ...matches];
      const leagueId = closed.competitions!.leagueCareer!.accepted!.leagueId;
      const preview = previewLeagueEntry(closed, leagueId);
      if (!preview.ok) throw new Error(preview.message);
      const rolled = acceptLeagueEntry(closed, { leagueId, previewKey: preview.preview.previewKey });
      expect(rolled.ok).toBe(true);
      if (!rolled.ok) throw new Error(rolled.message);
      expect(rolled.state.cardWeek).toBeUndefined();
      return [...weeks, ...matches, JSON.stringify(rolled.state)];
    };
    expect(run(true)).toEqual(run(false));
    // Match sheets, options and results as generated on main before weekly fatigue.
    expect(fingerprint).toMatchInlineSnapshot(`"bc92f66b85783f532e15779d3678a762d416afb72e38879f4c2098ddb3114ea8"`);
  }, 60000);
});

describe('card-week save migrations', () => {
  function legacy(s: GameState, owed: number) {
    const cw = s.cardWeek!;
    const current = cw.offers[0]!;
    return {
      ...s, version: 36, cardWeek: {
        rng: cw.rng, owed, offer: { season: current.season, week: current.week, cards: current.cards.slice(0, LEGACY_CARD_OFFER_SIZE) },
        history: cw.history.filter(h => h.action !== 'play').map(({ cardId, season, week }) => ({ cardId, season, week })),
        cardPlayers: cw.cardPlayers, cardTraits: cw.cardTraits.map(({ playerId, trait }) => ({ playerId, trait })),
      },
    };
  }

  it('preserves the v36 resolved starter and fills the other owed pick with the legacy card stream', async () => {
    const s = taken(playPickCard(planted(await career(37), 'analyst'), 0)).state;
    const raw = legacy(s, 2);
    const bytes = JSON.stringify(raw);
    const result = migrateState(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(raw)).toBe(bytes);
    expect(result.state.version).toBe(SAVE_VERSION);
    const cw = result.state.cardWeek!;
    expect(cw).toMatchObject({ starterLeft: 2, owed: 0, grants: 3, hand: [] });
    expect(cw.offers[0]).toEqual({ ...raw.cardWeek.offer, kind: 'starter', grant: 2, keptCardIds: [] });
    expect(cw.offers[1]!.kind).toBe('starter');
    expect(cw.history).toEqual([{ cardId: 'analyst', week: 1, season: 1, action: 'take' }]);
    expect(activeCardStaff(s)).toEqual(s.staff);
    expect(cw.active).toEqual([]);
    expect(result.state.staff).toEqual(s.staff);
    expect(result.state.rngSeed).toBe(s.rngSeed);
    expect(result.state.eventDeck).toEqual(s.eventDeck);
    expect(migrateState(JSON.parse(bytes))).toEqual(result);
  });

  it('keeps a same-season paid replacement without attributing it to the v36 staff card', async () => {
    const s = taken(playPickCard(planted(await career(37), 'analyst'), 0)).state;
    loadState(s);
    expect(releaseStaff('analyst')).toBe(true);
    const replacement = hireStaff('analyst')!;
    expect(replacement.role).toBe('analyst');
    expect(replacement.hiredSeason).toBe(s.staff[0]!.hiredSeason);
    expect(replacement.name).not.toBe(s.staff[0]!.name);
    expect(getState().money).toBeLessThan(s.money);
    const raw = legacy(getState(), 2);
    expect(raw.cardWeek.history).toEqual([{ cardId: 'analyst', season: 1, week: 1 }]);
    const loaded = migrateState(JSON.parse(JSON.stringify(raw)));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.staff).toEqual([replacement]);
    expect(activeCardStaff(loaded.state)).toEqual([]);
    expect(loaded.state.cardWeek!.history[0]).toMatchObject({ cardId: 'analyst', action: 'take' });
  });

  it('identifies older v37 offers without treating the old watermark as proof a match offer was shown', async () => {
    const s = await career();
    const offers = s.cardWeek!.offers.map(({ grant: _grant, keptCardIds: _kept, ...offer }) => ({ ...offer, cards: offer.cards.slice(0, LEGACY_CARD_OFFER_SIZE) }));
    const match = { ...offers[0]!, kind: 'match', week: leagueSlot(s) };
    const old = { ...s, version: 37, cardWeek: { ...s.cardWeek!, offers: [...offers, match], grants: 4, seenGrant: 4, owed: 1 } };
    const loaded = migrateState(old);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.cardWeek!.offers.map(o => o.grant)).toEqual([1, 2, 3, 4]);
    expect(loaded.state.cardWeek!.offers[3]).toEqual({ ...match, grant: 4, keptCardIds: [] });
  });

  it('keeps a full v36 match queue, passed picks and already applied players and traits', async () => {
    const base = await career(37);
    const target = base.squad[0]!.id;
    const withTrait = taken(playPickCard(planted(base, 'playmaker'), 0, target)).state;
    const withPlayer = taken(playPickCard(planted(withTrait, 'propSigning'), 0)).state;
    const afterPick = changed(passCard(withPlayer));
    const s = planted(afterPick, 'cashInjection');
    const raw = legacy(s, 3);
    const result = migrateState(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cw = result.state.cardWeek!;
    expect(cw).toMatchObject({ starterLeft: 0, owed: 3, grants: 6, hand: [] });
    expect(cw.offers).toHaveLength(3);
    expect(cw.offers[0]).toEqual({ ...raw.cardWeek.offer, kind: 'match', grant: 4, keptCardIds: [] });
    expect(cw.history.map(h => h.action)).toEqual(['take', 'take', 'pass']);
    expect(cw.cardPlayers).toEqual(s.cardWeek!.cardPlayers);
    expect(cw.cardTraits).toEqual(s.cardWeek!.cardTraits);
    expect(result.state.squad).toEqual(s.squad);
  });

  it('resolves the remaining UK v36 picks identically before and after choosing the UK pack', async () => {
    await preparePack('uk');
    const s = await prepareLeagueCareer({ clubName: 'Card FC', seed: 37, home: { town: 'London', country: 'GB' }, cardWeek: true });
    expect(s.pack).toBe('uk');
    const raw = legacy(s, 3);
    try {
      selectPack('au');
      const cold = migrateState(raw);
      expect(cold.ok).toBe(true);
      selectPack('uk');
      expect(migrateState(raw)).toEqual(cold);
    } finally {
      selectPack('au');
    }
  });

  it.each([35, 36])('only updates the version for a v%i League save without card week', async version => {
    const state = await career(11, false);
    const raw = { ...state, version };
    expect(migrateState(raw)).toMatchObject({ ok: true, state });
    const result = migrateState(raw);
    if (result.ok) expect(JSON.stringify(result.state)).toBe(JSON.stringify(state));
    expect('cardWeek' in raw).toBe(false);
  });

  it('refuses a newer save and invalid v36 card data', async () => {
    const s = await career();
    expect(migrateState({ ...s, version: SAVE_VERSION + 1 })).toMatchObject({ ok: false, reason: 'future' });
    const raw = legacy(s, 3);
    expect(migrateState({ ...raw, cardWeek: { ...raw.cardWeek, owed: 99 } })).toMatchObject({ ok: false });
  });
});

describe('a card-week career after Classic was retired (#819)', () => {
  it('is a League career: never Classic, saved, continued and listed', async () => {
    const s = await career(11);
    expect(s.cardWeek).toBeDefined();
    expect(isClassicSave(s)).toBe(false);
    expect(isClassicSave(JSON.stringify(s))).toBe(false);
    const bytes = new Map<string, string>();
    const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
    vi.stubGlobal('localStorage', storage); __setStorage(storage); __unlockSaves(); setActiveSlot(1);
    loadState(s);
    expect(saveIfChanged(getState())).toBe(true);
    expect(slotHasLeagueData(1)).toBe(true);
    expect(classicSlots()).toEqual([]);
    const loaded = loadCareer(1);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.cardWeek).toEqual(s.cardWeek);
    expect(firstRunSlotSummaries().find((x) => x.slot === 1)?.status).not.toBe('empty');
  });
});

describe('Phase 2 rerolls', () => {
  it('charges $1,500, $3,000 and $4,500 for the shown grant only, then resets each week or season', async () => {
    let s = await career();
    const original = s;
    const grant = s.cardWeek!.offers[1]!.grant!;
    for (const cost of [1500, 3000, 4500]) {
      expect(rerollCost(s)).toBe(cost);
      const next = changed(rerollCard(s, grant));
      expect(rerollCard(s, grant)).toEqual(next);
      expect(next.money).toBe(s.money - cost);
      expect(next.finance[0]!.events).toBe(s.finance[0]!.events - cost);
      expect(next.cardWeek!.offers[0]).toEqual(s.cardWeek!.offers[0]);
      expect(next.cardWeek!.offers[2]).toEqual(s.cardWeek!.offers[2]);
      expect(next.cardWeek!.offers[1]).toMatchObject({ kind: 'starter', grant, season: 1, week: 1 });
      expect(next.cardWeek!.offers[1]!.cards).not.toEqual(s.cardWeek!.offers[1]!.cards);
      expect(next.cardWeek!.grants).toBe(original.cardWeek!.grants);
      expect(next.rngSeed).toBe(original.rngSeed);
      expect(next.eventDeck).toEqual(original.eventDeck);
      s = next;
    }
    expect(s.cardWeek!.history.map(h => h.action)).toEqual(['reroll', 'reroll', 'reroll']);
    expect(rerollCost({ ...s, week: s.week + 1 })).toBe(1500);
    expect(rerollCost({ ...s, season: s.season + 1 })).toBe(1500);
  });

  it('refuses a Decree or an unaffordable reroll without moving the pick or either stream', async () => {
    const s = await career();
    const cardWeek = s.cardWeek!;
    const decree = { ...s, cardWeek: { ...cardWeek, starterLeft: 0, owed: 1,
      offers: [{ ...cardWeek.offers[0]!, kind: 'decree' as const }] } };
    expect(rerollCard(decree)).toBe('Decree picks cannot be rerolled.');
    expect(rerollCard({ ...s, money: 1499 })).toBe('The club cannot afford a reroll.');
    expect(rerollCard(s, 100)).toBe('No pick is waiting.');
    expect(s.money).toBe((await career()).money);
    expect(s.cardWeek).toEqual((await career()).cardWeek);
  });

  it('saves the charged draw and restores it without a new charge or RNG roll', async () => {
    const bytes = new Map<string, string>();
    const storage = { getItem: (k: string) => bytes.get(k) ?? null, setItem: (k: string, v: string) => { bytes.set(k, v); }, removeItem: (k: string) => { bytes.delete(k); } };
    __setStorage(storage); __unlockSaves(); setActiveSlot(1);
    loadState(await career());
    registerFinanceSystem();
    const before = getState();
    const moves: string[] = [];
    bus.on('money:changed', ({ reason }) => moves.push(reason));
    expect(rerollPick()).toEqual({ ok: true, outcome: 'Pick rerolled for $1,500.' });
    const after = getState();
    const loaded = loadCareer();
    expect(loaded).toMatchObject({ status: 'ok', state: { cardWeek: after.cardWeek, money: before.money - 1500 } });
    expect(after.finance[0]!.events).toBe(before.finance[0]!.events - 1500);
    loadState(planted(getState(), 'cashInjection'));
    expect(playChosenCard('pick', 0)).toMatchObject({ ok: true, outcome: 'Cash injection: +$15,000.' });
    const paid = loadCareer();
    expect(paid).toMatchObject({ status: 'ok', state: { money: before.money + 13_500 } });
    expect(moves).toEqual(['card: reroll', 'card: Cash injection']);
  });
});

describe('League match offers', () => {
  async function afterWin(): Promise<GameState> {
    const base = { ...(await career(573)), money: 1_000_000 };
    const state = played(base, leagueSlot(base), format => format === 'league');
    const fixture = state.competitions!.instances.flatMap(instance => instance.fixtures).find(f =>
      f.slot === state.week && f.status === 'completed' && (f.homeId === state.clubId || f.awayId === state.clubId))!;
    const home = fixture.homeId === state.clubId;
    fixture.result = { homeScore: home ? 12 : 0, awayScore: home ? 0 : 12, winnerId: state.clubId, decider: 'score' };
    return state;
  }

  it('draws and rerolls only normal cards after League wins across 128 card-stream seeds', async () => {
    const state = await afterWin();
    const strongSquad = state.squad.map(p => ({
      ...p, stats: { speed: STAT_MAX, strength: STAT_MAX, stamina: STAT_MAX, handling: STAT_MAX, kicking: STAT_MAX, footyIQ: STAT_MAX },
    }));
    const normalIds = new Set(CARDS.map(card => card.id));
    // A strong squad used to trigger the fallback to a rival set play.
    for (let rng = 0; rng < 128; rng++) {
      const squad = rng % 2 === 0 ? state.squad : strongSquad;
      const before = { ...state, squad, cardWeek: { ...state.cardWeek!, rng } };
      const dealt = cardWeekTick(before);
      expect(cardWeekTick(before)).toEqual(dealt);
      const offer = dealt.cardWeek!.offers.slice(-1)[0]!;
      const rerolled = changed(rerollCard(dealt, offer.grant));
      expect(rerollCard(dealt, offer.grant)).toEqual(rerolled);
      for (const match of [offer, rerolled.cardWeek!.offers.slice(-1)[0]!]) {
        expect(match).toMatchObject({ kind: 'match', week: state.week });
        expect(match.fromClubId).toBeUndefined();
        expect(match.cards).toHaveLength(CARD_WEEK.PICKS.match.show);
        expect(match.cards.every(card => !card.fromClubId && normalIds.has(card.cardId))).toBe(true);
      }
      expect(rerolled.rngSeed).toBe(state.rngSeed);
      expect(rerolled.eventDeck).toEqual(state.eventDeck);
    }
  });

  it('keeps rival team sheets identical through a League win offer and reroll', async () => {
    const state = await afterWin();
    const dealt = cardWeekTick(state);
    const rerolled = changed(rerollCard(dealt, dealt.cardWeek!.offers.slice(-1)[0]!.grant));
    const sheets = (s: GameState) => s.league.clubs.filter(club => club.id !== s.clubId).map(club => ({
      vsPlayer: rivalMatchSheet(club, playerRivalContext(s)),
      vsRival: rivalSheet(club),
    }));
    const before = sheets(state);
    expect(before.length).toBeGreaterThan(0);
    expect(createHash('sha256').update(JSON.stringify(before)).digest('hex')).toMatchInlineSnapshot(`"630ff4ed5c2af324cc13528946230ddca8109c968db131ef5a60f5b003ae4263"`);
    expect(sheets(dealt)).toEqual(before);
    expect(sheets(rerolled)).toEqual(before);
  });
});

describe('Phase 2 card levels', () => {
  it('merges in a full hand, stops offering Level III, and pays the upgraded cash amount only when played', async () => {
    let s = await career(31);
    for (const id of ['cashInjection', 'assistantCoach', 'lastLine', 'playmaker', 'finisher']) s = changed(takeCard(planted(s, id), 0));
    for (const level of [2, 3]) {
      s = changed(takeCard(planted(s, 'cashInjection'), 0));
      expect(s.cardWeek!.hand).toHaveLength(5);
      expect(s.cardWeek!.hand[0]).toMatchObject({ cardId: 'cashInjection', level });
    }
    expect(plantCard(s, 'cashInjection')).toBe('That card cannot be offered now.');
    expect(taken(playCard(s, 0)).money).toMatchObject([{ amount: 30_000 }]);
  });

  it('cash pays $15,000, $22,500 and $30,000 with no payments past III', async () => {
    let s = await career();
    for (const [i, amount] of [15_000, 22_500, 30_000].entries()) {
      const out = taken(playPickCard(planted(s, 'cashInjection'), 0));
      expect(out.money).toMatchObject([{ amount }]);
      expect(activeCard(out.state, 'cashInjection')).toMatchObject({ level: i + 1 });
      s = out.state;
    }
    expect(plantCard(s, 'cashInjection')).toBe('That card cannot be offered now.');
  });

  it('gives seed 150’s Harley Kestwick Playmaker III at card Level II and extra rating at Level III', async () => {
    const state = await career(150);
    const base = fillCardOffers({ ...state, cardWeek: newCardWeek(150) }, LEGACY_CARD_OFFER_SIZE);
    const pick = base.cardWeek!.offers[2]!;
    const index = pick.cards.findIndex(c => c.kind === 'player' && c.player.name === 'Harley Kestwick');
    expect(index).toBeGreaterThanOrEqual(0);
    const hired = taken(playPickCard(base, index, undefined, pick.grant));
    const harley = hired.joined!;
    expect(traitLevel(harley.traits, 'playmaker')).toBe(2);
    expect(activeCard(hired.state, 'hookerSigning')).toMatchObject({ level: 1, playerId: harley.id });
    loadState(planted(hired.state, 'hookerSigning'));
    expect(cardOfferView(getState()).cards[0]).toMatchObject({ level: 2, effect: 'Playmaker III.' });
    expect(chooseCard(0)).toMatchObject({ ok: true, outcome: expect.stringContaining('Playmaker III') });
    const upgraded = getState().squad.find(p => p.id === harley.id)!;
    expect(traitLevel(upgraded.traits, 'playmaker')).toBe(3);
    expect(activeCard(getState(), 'hookerSigning')).toMatchObject({ level: 2 });

    loadState(planted(getState(), 'hookerSigning'));
    expect(cardOfferView(getState()).cards[0]).toMatchObject({ level: 3, effect: '+2 recruit rating.' });
    const capped = { ...getState(), squad: getState().squad.map(p => p.id === harley.id
      ? { ...p, stats: { ...p.stats, handling: STAT_MAX, footyIQ: STAT_MAX, stamina: STAT_MAX, strength: STAT_MAX } }
      : p) };
    expect(takeCard(capped, 0)).toMatch(/already has the maximum signature trait and rating/);
    expect(activeCard(capped, 'hookerSigning')).toMatchObject({ level: 2 });
    expect(plantCard(capped, 'hookerSigning')).toBe('That card cannot be offered now.');
    expect(chooseCard(0)).toMatchObject({ ok: true, outcome: expect.stringContaining('+2 recruit rating') });
    const maxed = getState().squad.find(p => p.id === harley.id)!;
    expect(overallRating(maxed)).toBe(overallRating(upgraded) + 2);
    expect(activeCard(getState(), 'hookerSigning')).toMatchObject({ level: 3 });
    expect(plantCard(getState(), 'hookerSigning')).toBe('That card cannot be offered now.');
  });

  it.each(CARDS.filter(card => card.kind === 'player'))('levels $id’s signature trait on the same player', async ({ id }) => {
    let s = { ...(await career(37)), money: 1_000_000 };
    const def = cardDefById(id);
    if (def?.kind !== 'player') throw new Error('Expected player definition');
    // Keep the best natural player at a different position, so the card can be drawn.
    s = { ...s, squad: s.squad.map(p => p.position !== def.position ? p : {
      ...p, stats: { speed: 35, strength: 35, stamina: 35, handling: 35, kicking: 35, footyIQ: 35 },
    }) };
    const joined = taken(playPickCard(planted(s, id), 0));
    const player = joined.joined!;
    const count = joined.state.squad.length;
    for (const level of [1, 2, 3]) {
      const result = level === 1 ? joined.state : changed(takeCard(planted(s, id), 0));
      expect(activeCard(result, id)).toMatchObject({ kind: 'player', playerId: player.id, level });
      expect(result.squad).toHaveLength(count);
      expect(traitLevel(result.squad.find(p => p.id === player.id)!.traits, SIGNATURE_TRAIT[player.position])).toBeGreaterThanOrEqual(level);
      s = result;
    }
    expect(plantCard(s, id)).toBe('That card cannot be offered now.');
  });

  it.each(['propSigning', 'marqueeGamble'])('refuses a waiting %s upgrade after its recruit leaves', async id => {
    const base = { ...await career(37), money: 1_000_000 };
    const hired = taken(playPickCard(planted(base, id), 0));
    const player = hired.joined!;
    const waiting = planted(hired.state, id);
    const stale = first(waiting);
    expect(stale).toMatchObject({ player: { id: player.id, clubHistory: player.clubHistory } });
    const departure = releasedState(waiting, player.id);
    if (!('state' in departure)) throw new Error(departure.message);
    loadState(departure.state);
    const before = getState();
    const reason = `${player.name} is no longer at the club. This upgrade can't be played.`;
    expect(cardOfferView(before).cards[0]).toMatchObject({ takeRefusal: reason, refusal: reason });
    expect(chooseCard(0)).toEqual({ ok: false, reason });
    expect(playChosenCard('pick', 0)).toEqual({ ok: false, reason });
    expect(getState()).toBe(before);

    const fresh = first(planted(before, id));
    expect(fresh).toMatchObject({ cardId: id });
    expect(fresh).not.toMatchObject({ player: { id: player.id } });
    const held = { ...before, cardWeek: { ...before.cardWeek!, hand: [
      { cardId: id, level: 2 as const, offered: stale, gotSeason: before.season, gotWeek: before.week },
    ] } };
    expect(playCard(held, 0)).toBe(reason);
    expect(plantCard(held, id)).toBe('That card cannot be offered now.');
  });

  it.each(CARDS.filter(card => card.kind === 'staff'))('takes 25% and 50% off $id’s original wage', async ({ id }) => {
    const base = await career(37);
    const hired = taken(playPickCard(planted({ ...base, reputation: 100 }, id), 0)).state;
    const member = hired.staff[0]!;
    expect(hired.money).toBe(base.money);
    let s = hired;
    for (const [level, factor] of [[2, 0.75], [3, 0.5]]) {
      s = changed(takeCard(planted(s, id), 0));
      expect(s.staff).toEqual([{ ...member, wage: Math.round(member.wage * factor!) }]);
      expect(activeCard(s, id)).toMatchObject({ level });
      expect(s.money).toBe(base.money);
    }
    expect(plantCard(s, id)).toBe('That card cannot be offered now.');
  });

  it('increases the same dilemma player’s margin by two per level and costs patience each time', async () => {
    let s = { ...(await career(37)), boardPatience: 5 };
    const id = 'marqueeGamble';
    const hired = taken(playPickCard(planted(s, id), 0));
    const player = hired.joined!;
    s = hired.state;
    for (const level of [2, 3]) {
      s = changed(takeCard(planted(s, id), 0));
      expect(s.boardPatience).toBe(5 - level);
      expect(activeCard(s, id)).toMatchObject({ playerId: player.id, level });
      const upgraded = s.squad.find(p => p.id === player.id)!;
      for (const stat of shownStats(player.position)) expect(upgraded.stats[stat]).toBe(player.stats[stat] + 2 * (level - 1));
    }
    expect(plantCard(s, id)).toBe('That card cannot be offered now.');
  });

  it('bakes the selected set play level into the next match sheet', async () => {
    const base = await career();
    const coached = { ...base, staff: [newStaffMember(base, { attackCoach: 'direct' }, 'Coach')] };
    let s = taken(playPickCard(planted(coached, 'setPlay'), 0)).state;
    const id = s.playbook.owned[0]!;
    for (const level of [1, 2, 3]) {
      if (level > 1) s = changed(takeCard(planted(s, 'setPlay'), 0));
      expect(s.playbook.owned).toEqual([id]);
      expect(activeCard(s, 'setPlay')).toMatchObject({ level });
      const fixture = { round: 1, homeId: s.clubId, awayId: 'rival' };
      const selected = { ...s, lineup: { ...s.lineup, plays: [id] } };
      const bonus = cardSheetBonuses(selected, fixture);
      expect(bonus.plays).toEqual([level === 1 ? id : `${id}:${level === 2 ? 'II' : 'III'}`]);
      expect(bonus.playRating).toBe(level - 1);
      expect(cardSheetBonuses(s, fixture).playRating).toBe(0);
    }
    expect(plantCard(s, 'setPlay')).toBe('That card cannot be offered now.');
  });
});

describe('actual v37 save bytes', () => {
  it.each(['starters', 'after-starters'])('migrates the %s save and preserves the resolved queue, hand and applied effects', name => {
    const raw = JSON.parse(gunzipSync(readFileSync(new URL(`../fixtures/saves/v37-card-week-${name}.json.gz`, import.meta.url))).toString()) as GameState;
    expect(raw.version).toBe(37);
    const migrated = migrateState(raw as unknown as Record<string, unknown>);
    expect(migrated).toMatchObject({ ok: true, state: { version: SAVE_VERSION } });
    if (!migrated.ok) throw new Error(migrated.message);
    const { version, cardWeek, staff, ...rest } = migrated.state;
    const { version: _oldVersion, cardWeek: original, staff: oldStaff, ...originalRest } = raw;
    expect(version).toBe(SAVE_VERSION);
    expect(rest).toEqual(originalRest);
    expect(staff).toEqual(name === 'after-starters'
      ? oldStaff.map(member => ({ ...member, cardHireId: 'legacy-card-hire:analyst' })) : oldStaff);
    const { active: oldActive, offers: _oldOffers, ...kept } = original!;
    expect(cardWeek).toMatchObject(kept);
    expect(cardWeek!.active).toEqual(expect.arrayContaining(oldActive.map(card => expect.objectContaining(card.kind === 'staff'
      ? { ...card, member: expect.objectContaining(card.member) } : card))));
    expect(Object.keys(cardWeek!)).toEqual(expect.arrayContaining(Object.keys(original!)));
    expect(cardWeek!.offers).toEqual(original!.offers.map(offer => ({ ...offer, keptCardIds: [] })));
    expect(cardWeek!.history).toEqual(original!.history);
    if (name === 'after-starters') {
      expect(cardWeek!.hand).toMatchObject([{ cardId: 'cashInjection', level: 1 }]);
      expect(cardWeek!.active).toMatchObject([
        { kind: 'staff', cardId: 'analyst', level: 1, member: { cardHireId: 'legacy-card-hire:analyst' } },
        { kind: 'player', cardId: 'propSigning', playerId: original!.cardPlayers[0], level: 1 },
      ]);
    }
    expect(migrateState(JSON.parse(JSON.stringify(migrated.state)))).toEqual(migrated);
  });
});

describe('League strikes and Decree picks', () => {
  function leagueMatch(state: GameState, slot: number, margin: number, format = 'league',
    outcome: 'score' | 'forfeit' | 'tiebreak-win' | 'tiebreak-loss' = 'score'): GameState {
    const instances = state.competitions!.instances;
    const instance = instances.find(i => i.definition.format.kind === format && i.fixtures.some(f => f.homeId === state.clubId || f.awayId === state.clubId))
      ?? instances.find(i => i.definition.format.kind === 'league' && i.fixtures.some(f => f.homeId === state.clubId || f.awayId === state.clubId))!;
    const fixture = instance.fixtures.find(f => f.homeId === state.clubId || f.awayId === state.clubId)!;
    const us = margin > 0 ? 0 : -margin;
    const them = margin > 0 ? margin : 0;
    const home = fixture.homeId === state.clubId;
    const score = { homeScore: home ? us : them, awayScore: home ? them : us };
    const rivalId = home ? fixture.awayId : fixture.homeId;
    const winnerId = margin > 0 || outcome === 'tiebreak-loss' ? rivalId : state.clubId;
    const knockout = instance.definition.stages.find(stage => stage.kind === 'knockout');
    const tiebreak = outcome === 'tiebreak-win' || outcome === 'tiebreak-loss';
    const settled = { ...fixture, id: `result-${slot}`, slot, status: 'completed' as const,
      ...(tiebreak && knockout ? { stageId: knockout.id } : {}),
      result: tiebreak ? { homeScore: 12, awayScore: 12, winnerId, decider: 'higher-seed' as const }
        : margin === 0 ? { ...score, decider: 'draw' as const } : { ...score, winnerId, decider: outcome } };
    const updated = format === instance.definition.format.kind
      ? instances.map(i => i === instance ? { ...i, fixtures: [...i.fixtures, settled] } : i)
      : [...instances, { ...instance, id: `other-${slot}`, definition: {
        ...instance.definition, format: { ...instance.definition.format, kind: format } as typeof instance.definition.format,
      }, fixtures: [settled] }];
    return cardWeekTick({ ...state, week: slot, competitions: { ...state.competitions!, instances: updated } });
  }

  it.each([[23, 0], [24, 1], [30, 1]])('records a %d-point loss as %d strikes', async (margin, count) => {
    const base = { ...await career(), boardPatience: 5 };
    const after = leagueMatch(base, 1, margin);
    expect(after.cardWeek!.strikes.count).toBe(count);
    expect(after.boardPatience).toBe(5 - count);
    expect(after.sacked).toBeUndefined();
    if (count) expect(after.cardWeek!.strikes.log).toEqual([{ week: 1, reason: 'margin', margin }]);
  });

  it('records every third consecutive loss and ignores other competitions', async () => {
    let state = { ...await career(), boardPatience: 5 };
    state = leagueMatch(leagueMatch(state, 1, 1), 2, 1);
    expect(state.cardWeek!.strikes).toMatchObject({ count: 0, lossRun: 2 });
    for (const [slot, format] of [[3, 'knockout'], [4, 'exhibition'], [5, 'camp']] as const) {
      state = leagueMatch(state, slot, 30, format);
      expect(state.cardWeek!.strikes).toMatchObject({ count: 0, lossRun: 2 });
      expect(state.boardPatience).toBe(5);
    }
    state = leagueMatch(state, 6, 1);
    expect(state.cardWeek!.strikes).toMatchObject({ count: 1, lossRun: 0, log: [{ week: 6, reason: 'run' }] });
    expect(state.boardPatience).toBe(4);
    for (const slot of [7, 8, 9]) state = leagueMatch(state, slot, 1);
    expect(state.cardWeek!.strikes).toMatchObject({ count: 2, lossRun: 0 });
    expect(state.boardPatience).toBe(3);
  });

  it('counts a tied semifinal lost on seeding as the third consecutive League loss', async () => {
    let s = { ...await career(44), boardPatience: 5 };
    s = leagueMatch(leagueMatch(s, 20, 1), 21, 1);
    s = leagueMatch(s, 22, 0, 'league', 'tiebreak-loss');
    expect(s.cardWeek!.strikes).toMatchObject({ count: 1, lossRun: 0, log: [{ week: 22, reason: 'run' }] });
    expect(s.boardPatience).toBe(4);
  });

  it.each([
    { label: 'a score win', margin: -1, outcome: 'score' },
    { label: 'a recorded draw', margin: 0, outcome: 'score' },
    { label: 'a tied semifinal won on seeding', margin: 0, outcome: 'tiebreak-win' },
  ] as const)('resets the loss run after $label', async ({ margin, outcome }) => {
    let s = { ...await career(44), boardPatience: 5 };
    s = leagueMatch(leagueMatch(s, 20, 1), 21, 1);
    s = leagueMatch(s, 22, margin, 'league', outcome);
    expect(s.cardWeek!.strikes).toMatchObject({ count: 0, lossRun: 0, log: [] });
    expect(s.boardPatience).toBe(5);
  });

  it('counts a third straight loss by forfeit as one margin strike', async () => {
    let s = { ...await career(44), boardPatience: 5 };
    s = leagueMatch(leagueMatch(s, 1, 1), 2, 1);
    s = leagueMatch(s, 3, 24, 'league', 'forfeit');
    expect(s.cardWeek!.strikes).toMatchObject({ count: 1, lossRun: 0, log: [{ week: 3, reason: 'margin', margin: 24 }] });
    expect(s.boardPatience).toBe(4);
  });

  it.each([[1, true], [2, false]])('counts a heavy third loss once at patience %d', async (patience, absorbed) => {
    let state = { ...await career(), boardPatience: patience };
    state = leagueMatch(leagueMatch(leagueMatch(state, 1, 1), 2, 1), 3, 26);
    expect(state.cardWeek!.strikes).toEqual({ season: 1, count: 1, lossRun: 0,
      log: [{ week: 3, reason: 'margin', margin: 26, ...(absorbed ? { absorbed: true } : {}) }] });
    expect(state.boardPatience).toBe(1);
    expect(state.sacked).toBeUndefined();
    expect(cardWeekTick(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(takeCard(planted({ ...state, boardPatience: 2 }, 'marqueeGamble'), 0)).not.toBeTypeOf('string');
    expect(takeCard({ ...planted({ ...state, boardPatience: 2 }, 'marqueeGamble'), boardPatience: 1 }, 0))
      .toBe("The board can't take another gamble right now.");
  });

  it('grants one deterministic Decree after five played League matches and protects it in the queue', async () => {
    const base = await career();
    const run = () => [1, 2, 3, 7, 8].reduce((s, slot) => leagueMatch(s, slot, 1), base);
    const four = [1, 2, 3, 7].reduce((s, slot) => leagueMatch(s, slot, 1), base);
    expect(four.cardWeek!.offers.some(o => o.kind === 'decree')).toBe(false);
    expect(expireSeasonDecree(four).cardWeek!.history.some(h => h.cardId === 'decree-pick')).toBe(false);
    const fifth = run();
    expect(run().cardWeek).toEqual(fifth.cardWeek);
    const offer = fifth.cardWeek!.offers.slice(-1)[0]!;
    expect(offer).toMatchObject({ kind: 'decree', week: 8 });
    expect(new Set(offer.cards.map(c => c.cardId)).size).toBe(3);
    expect(offer.cards.every(c => c.kind === 'decree')).toBe(true);
    expect(drawOffer(fifth, 'starter').offer?.cards.every(c => c.kind !== 'decree')).toBe(true);
    expect(drawOffer(fifth, 'match').offer?.cards.every(c => c.kind !== 'decree')).toBe(true);
    expect(rerollCard(fifth, offer.grant)).toBe('Decree picks cannot be rerolled.');
    expect(cardWeekTick(JSON.parse(JSON.stringify(fifth)))).toEqual(fifth);
    const sixth = leagueMatch(fifth, 9, 1);
    const later = [10, 11, 12].reduce((s, slot) => leagueMatch(s, slot, 1), sixth);
    expect(later.cardWeek!.offers.filter(o => o.kind === 'decree')).toEqual([offer]);
    expect(later.cardWeek!.owed).toBe(CARD_WEEK.MAX_OWED);
    const expired = expireSeasonDecree(later);
    expect(expired.cardWeek!.history.slice(-1)[0]).toMatchObject({ cardId: 'decree-pick', action: 'expire' });

    const chosen = changed(takeCard(later, 0, offer.grant));
    const id = offer.cards[0]!.cardId;
    expect(chosen.cardWeek!.decree).toEqual({ season: chosen.season, id });
    expect(activeCard(chosen, id)).toMatchObject({ kind: 'decree', level: 1 });
    expect(chosen.cardWeek!.hand).toEqual(later.cardWeek!.hand);
    expect(takeCard(JSON.parse(JSON.stringify(chosen)), 0, offer.grant)).toBe('That pick is no longer waiting.');
    expect(expireSeasonDecree(chosen).cardWeek).toMatchObject({ decree: null });
    expect(activeCard(expireSeasonDecree(chosen), id)).toBeUndefined();

    const passed = changed(passCard(fifth, offer.grant));
    const next = leagueMatch(passed, 9, 1);
    expect(next.cardWeek!.decree).toBeNull();
    expect(next.cardWeek!.offers.some(o => o.kind === 'decree')).toBe(false);
  });

  it.each([4, 5])('counts a forfeit in League match %d toward the fifth-match Decree', async forfeitAt => {
    let s = { ...await career(), boardPatience: 5 };
    for (const slot of [1, 2, 3, 4, 5]) {
      const forfeit = slot === forfeitAt;
      s = leagueMatch(s, slot, forfeit ? 24 : 0, 'league', forfeit ? 'forfeit' : 'score');
      expect(s.cardWeek!.offers.filter(o => o.kind === 'decree').map(o => o.week)).toEqual(slot < 5 ? [] : [5]);
    }
    expect(s.cardWeek!.strikes.log).toEqual([{ week: forfeitAt, reason: 'margin', margin: 24 }]);
    expect(s.boardPatience).toBe(4);
  });

  it('clears one-week buffs at the next League result', async () => {
    const s = await career();
    const buff = { kind: 'buff' as const, cardId: 'future-buff', level: 2 as const, season: 1, week: 1 };
    const base = { ...s, cardWeek: { ...s.cardWeek!, active: [buff] } };
    const cup = leagueMatch(base, 1, 5, 'knockout');
    expect(cup.cardWeek!.active).toEqual([buff]);
    expect(leagueMatch(cup, 2, 1).cardWeek!.active).toEqual([]);
  });

  it('books Tight ship as a single wage saving in club cash and the season books', async () => {
    const base = await career();
    const wage = Math.round(weeklyWages(base) * 0.05);
    const state: GameState = { ...base, cardWeek: { ...base.cardWeek!, decree: { season: base.season, id: 'tightShip' } } };
    const next = cardWeekTick(state);
    expect(next.money - base.money).toBe(wage);
    expect(next.finance[0]!.wages - base.finance[0]!.wages).toBe(wage);
    expect(cardWeekTick(JSON.parse(JSON.stringify(next)))).toEqual(next);
    expect(cardWeekTick(expireSeasonDecree({ ...next, week: next.week + 1 })).money).toBe(next.money);
  });
});

describe('weekly fatigue saves', () => {
  it('loads the v41 fatigue fixture and rejects missing, out-of-range and malformed fatigue', () => {
    const bytes = gunzipSync(readFileSync(new URL('../fixtures/saves/v41-card-week-fatigue.json.gz', import.meta.url))).toString();
    const raw = JSON.parse(bytes) as GameState;
    const storage = new Map([[slotKey(1), bytes]]);
    __setStorage({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); } });
    __unlockSaves(); setActiveSlot(1);
    const loaded = loadCareer();
    if (loaded.status !== 'ok') throw new Error(JSON.stringify(loaded));
    expect(loaded.state).toEqual(raw);
    expect(loaded.state.cardWeek!.weeklyFatigue).toEqual({ [raw.squad[0]!.id]: 50, [raw.squad[1]!.id]: 100 });
    for (const weeklyFatigue of [undefined, null, [], { bad: -1 }, { bad: 101 }, { bad: 50.5 }, { bad: '50' }, { '': 20 }]) {
      expect(migrateState({ ...raw, cardWeek: { ...raw.cardWeek, weeklyFatigue } }).ok).toBe(false);
    }
  });
});

describe('five-card pick saves', () => {
  it('migrates the v40 half-used match pick with zero fatigue and honours its last keep once', () => {
    const bytes = gunzipSync(readFileSync(new URL('../fixtures/saves/v40-card-week-half-pick.json.gz', import.meta.url))).toString();
    const storage = new Map([[slotKey(1), bytes]]);
    __setStorage({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); } });
    __unlockSaves(); setActiveSlot(1);
    const raw = JSON.parse(bytes) as GameState;
    const loaded = loadCareer();
    if (loaded.status !== 'ok') throw new Error(JSON.stringify(loaded));
    expect(loaded.state).toEqual({ ...raw, version: SAVE_VERSION, cardWeek: { ...raw.cardWeek, weeklyFatigue: {} } });
    const offer = raw.cardWeek!.offers.slice(-1)[0]!;
    expect(offer).toMatchObject({ kind: 'match', keptCardIds: ['assistantCoach'] });
    expect(offer.cards).toHaveLength(4);
    const [first] = offer.cards;
    expect(cardOfferView(loaded.state, offer.grant)).toMatchObject({ keepsLeft: 1 });

    loadState(loaded.state);
    expect(chooseCard(0, offer.grant)).toMatchObject({ ok: true });
    expect(chooseCard(0, offer.grant)).toEqual({ ok: false, reason: 'That pick is no longer waiting.' });
    const saved = loadCareer();
    if (saved.status !== 'ok') throw new Error(JSON.stringify(saved));
    expect(saved.state.cardWeek).toMatchObject({ grants: raw.cardWeek!.grants, starterLeft: 3, owed: 0 });
    expect(saved.state.cardWeek!.offers).toEqual(raw.cardWeek!.offers.slice(0, -1));
    expect(saved.state.cardWeek!.hand.map(h => h.cardId)).toEqual(['assistantCoach', first!.cardId]);
  });

  it('migrates v39 waiting picks, hand, levels, Decree and strikes without redrawing', () => {
    const raw = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/saves/v39-card-week-legacy-steals.json.gz', import.meta.url))).toString()) as GameState;
    expect(raw.version).toBe(39);
    const cw = raw.cardWeek!;
    const migrate = (cardWeek: NonNullable<GameState['cardWeek']>) => {
      const result = migrateState({ ...raw, cardWeek });
      if (!result.ok) throw new Error(result.message);
      expect(result.state.cardWeek).toEqual({ ...cardWeek, weeklyFatigue: {}, offers: cardWeek.offers.map(o => ({ ...o, keptCardIds: [] })) });
    };
    migrate(cw);
    const decree = cw.offers.find(o => o.kind === 'decree')!.cards[0]!.cardId;
    const { season } = raw;
    migrate({ ...cw, owed: cw.owed - 1, offers: cw.offers.filter(o => o.kind !== 'decree'),
      active: [...cw.active, { kind: 'decree', cardId: decree, season, week: raw.week, level: 1 }],
      decree: { id: decree, season }, strikes: { season, count: 1, lossRun: 0, log: [{ week: raw.week - 1, reason: 'run' }] },
    });
  });
});

describe('v38 save exports', () => {
  it.each(['card-week-waiting', 'card-week-empty', 'no-card-week'])('migrates %s mid-season', name => {
    const raw = JSON.parse(gunzipSync(readFileSync(new URL(`../fixtures/saves/v38-${name}.json.gz`, import.meta.url))).toString()) as GameState;
    expect(raw).toMatchObject({ version: 38, week: 8 });
    const loaded = migrateState(raw);
    expect(loaded).toMatchObject({ ok: true, state: { version: SAVE_VERSION } });
    if (!loaded.ok) return;
    if (!raw.cardWeek) {
      expect(loaded.state).toEqual({ ...raw, version: SAVE_VERSION });
      return;
    }
    expect(loaded.state.cardWeek?.offers).toEqual(raw.cardWeek.offers.map(offer => ({ ...offer, keptCardIds: [] })));
    expect(loaded.state.cardWeek?.history).toEqual(raw.cardWeek.history);
    const [hire] = loaded.state.staff;
    expect(hire).toMatchObject({ cardHireId: 'legacy-card-hire:assistantCoach', wage: raw.staff[0]!.wage });
    expect(activeCardStaff(loaded.state)).toEqual([hire]);
    expect(activeCard(loaded.state, 'assistantCoach')).toMatchObject({ level: 2, member: { cardHireId: hire!.cardHireId } });

    const paid = { ...raw, staff: [{ ...raw.staff[0]!, wage: staffWage(raw, 'assistantCoach') }] };
    const replacement = migrateState(paid);
    expect(replacement.ok && replacement.state.staff).toEqual(paid.staff);
    expect(replacement.ok && activeCardStaff(replacement.state)).toEqual([]);
  });

  it('links and upgrades a Level I staff card from an original v38 save', () => {
    const raw = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/saves/v38-card-week-level-one-hire.json.gz', import.meta.url))).toString()) as GameState;
    expect(raw.version).toBe(38);
    expect(raw.cardWeek!.active).toMatchObject([{ cardId: 'assistantCoach', level: 1 }]);
    const loaded = migrateState(raw);
    if (!loaded.ok) throw new Error(loaded.message);
    const s = loaded.state;
    const [hire] = s.staff;
    expect(s.version).toBe(SAVE_VERSION);
    expect(hire).toMatchObject({ cardHireId: 'legacy-card-hire:assistantCoach', wage: raw.staff[0]!.wage });
    expect(activeCardStaff(s)).toEqual([hire]);
    expect(activeCard(s, 'assistantCoach')).toMatchObject({ level: 1 });
    const upgraded = changed(takeCard(planted(s, 'assistantCoach'), 0));
    expect(activeCard(upgraded, 'assistantCoach')).toMatchObject({ level: 2 });
    expect(upgraded.staff).toEqual([{ ...hire, wage: Math.round(hire!.wage * 0.75) }]);

    const differentHire = { ...raw, staff: [{ ...raw.staff[0]!, name: 'Another Coach' }] };
    const replaced = migrateState(differentHire);
    if (!replaced.ok) throw new Error(replaced.message);
    expect(activeCardStaff(replaced.state)).toEqual([]);
  });

  it('reloads a Decree offer and its active effect without granting or adopting twice', () => {
    const raw = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/saves/v38-card-week-empty.json.gz', import.meta.url))).toString());
    const migrated = migrateState(raw);
    if (!migrated.ok) throw new Error(migrated.message);
    const s = migrated.state;
    const cw = s.cardWeek!;
    const draw = drawOffer(s, 'decree');
    const grant = cw.grants + 1;
    const withPick = { ...s, cardWeek: { ...cw, owed: 1, rng: draw.rng, grants: grant,
      offers: [{ ...draw.offer!, grant }] } };
    const waiting = migrateState(JSON.parse(JSON.stringify(withPick)));
    if (!waiting.ok) throw new Error(waiting.message);
    expect(waiting.state.cardWeek).toEqual(withPick.cardWeek);
    const adopted = changed(takeCard(waiting.state, 0, grant));
    const loaded = migrateState(JSON.parse(JSON.stringify(adopted)));
    if (!loaded.ok) throw new Error(loaded.message);
    expect(loaded.state.cardWeek).toEqual(adopted.cardWeek);
    expect(takeCard(loaded.state, 0, grant)).toBe('That pick is no longer waiting.');
  });

  it('keeps a same-name paid hire at full wage when a stale staff card is taken', async () => {
    const card = 'analyst';
    let s = taken(playPickCard(planted(await career(), card), 0)).state;
    s = changed(takeCard(planted(s, card), 0));
    const offered = planted(s, card);
    loadState(offered);
    expect(releaseStaff('analyst')).toBe(true);
    const paid = hireStaff('analyst')!;
    const member = { ...paid, name: s.staff[0]!.name };
    setState({ staff: [member] });
    expect(activeCardStaff(getState())).toEqual([]);
    expect(activeCard(getState(), card)).toBeUndefined();
    const attempted = playPickCard(getState(), 0);
    expect(attempted).toContain('already');
    expect(getState().staff).toEqual([member]);
    expect(member.wage).toBe(staffWage(s, 'analyst'));
  });

  it('announces a levelled signing and advances the recruit tutorial event only on joining', async () => {
    let state = planted(await career(37), 'propSigning');
    state = changed(takeCard(state, 0));
    state = changed(takeCard(planted(state, 'propSigning'), 0));
    loadState(state);
    const signed = vi.fn();
    bus.on('player:signed', signed);
    const result = playChosenCard('hand', 0);
    expect(result).toMatchObject({ ok: true, outcome: expect.stringContaining('joins at Level II, no signing fee') });
    expect(signed).toHaveBeenCalledOnce();
    expect(signed).toHaveBeenCalledWith(getState().squad.slice(-1)[0]);
    loadState(await career(37, false));
    expect(playChosenCard('hand', 0)).toMatchObject({ ok: false });
    expect(signed).toHaveBeenCalledOnce();
  });
});

describe('what a card face shows (#846 play-test)', () => {
  const face = (s: GameState, cardId: string) => {
    const p = planted({ ...s, money: 10_000_000 }, cardId);
    return { state: p, view: cardOfferView(p).cards[0]! };
  };
  const SIGNINGS = { propSigning: 'prop', hookerSigning: 'hooker', centreSigning: 'centre', fullbackSigning: 'fullback' } as const;
  /** The first player card that can be offered to this club (none is offered at its best man's position). */
  const signing = (s: GameState): keyof typeof SIGNINGS =>
    (Object.keys(SIGNINGS) as (keyof typeof SIGNINGS)[]).find((id) => typeof plantCard({ ...s, money: 10_000_000 }, id) !== 'string')!;

  it('keeps the card floor as it was: the best natural player, else a related position, else anyone', async () => {
    const old = (squad: readonly Player[], position: Position): number => {
      const best = (players: readonly Player[], rate: (p: Player) => number): number | null =>
        players.length ? Math.max(...players.map(rate)) : null;
      return best(squad.filter((p) => p.position === position), overallRating)
        ?? best(squad.filter((p) => positionFit(p.position, position) === FIT.related), (p) => effectiveRating(p, position))
        ?? best(squad, (p) => effectiveRating(p, position)) ?? 0;
    };
    for (const seed of [107, 109, 113]) {
      const s = await career(seed);
      for (const position of POSITIONS) {
        const without = s.squad.filter((p) => p.position !== position);
        for (const squad of [s.squad, without, []]) {
          expect(cardFloor(squad, position)).toBe(old(squad, position));
          expect(cardFloorMan(squad, position).natural).toBe(squad.some((p) => p.position === position));
        }
      }
    }
  });

  it('a player card names the club\'s best man there and his gap over him', async () => {
    const s = await career(107);
    const id = signing(s);
    const { view } = face(s, id);
    const best = s.squad.filter((p) => p.position === SIGNINGS[id])
      .sort((a, b) => overallRating(b) - overallRating(a) || a.id.localeCompare(b.id))[0]!;
    expect(view.floor).toEqual({
      line: `Your best ${SIGNINGS[id]} now: ${best.name} ${Math.round(overallRating(best))}`,
      gap: view.player!.rating - Math.round(overallRating(best)),
    });
    expect(view.floor!.gap).toBeGreaterThan(0);
  });

  it('says nobody plays there when the floor came from a fallback, and claims no gap over an unnamed man', async () => {
    const s = await career(107);
    const noProps = s.squad.filter((p) => p.position !== 'prop');
    expect(floorLine(noProps, 'prop', 60)).toEqual({ line: 'Nobody plays there now', gap: null });
    const props = new Set(s.squad.filter((p) => p.position === 'prop').map((p) => p.id));
    const bare = { ...s, squad: noProps, lineup: { ...s.lineup, starters: s.lineup.starters.map((id) => (id && props.has(id) ? null : id)) } };
    expect(face(bare, 'propSigning').view.floor).toEqual({ line: 'Nobody plays there now', gap: null });
  });

  /** Take `id` into the hand `times` times (Level `times` in the hand). */
  const heldAt = (s: GameState, id: string, times: number): GameState => {
    let state = s;
    for (let i = 0; i < times; i++) state = changed(takeCard(face(state, id).state, 0));
    return state;
  };
  /** The face's rating and gap must be the man as he actually joins, against the floor before he does. */
  const expectJoinedGap = (before: GameState, view: CardFaceView, out: CardTake) => {
    const joined = Math.round(overallRating(out.joined!));
    const floor = Math.round(cardFloor(before.squad, out.joined!.position));
    expect(view.player!.rating).toBe(joined);
    expect(view.floor!.gap).toBe(joined - floor);
  };

  for (const kind of ['dilemma', 'player'] as const) {
    it(`a ${kind} card at Level II and III rates its man as he joins, held in the hand and on a pick`, async () => {
      const s = { ...(await career(37)), boardPatience: 5, money: 10_000_000 };
      const id = kind === 'dilemma' ? 'marqueeGamble' : signing(s);
      for (const level of [2, 3] as const) {
        // On a pick while the card is held at the level below.
        const below = heldAt(s, id, level - 1);
        const onPick = face(below, id);
        expect(onPick.view.level).toBe(level);
        expectJoinedGap(onPick.state, onPick.view, taken(playPickCard(onPick.state, 0)));
        // Held in the hand at this level.
        const held = heldAt(s, id, level);
        const at = held.cardWeek!.hand.findIndex((h) => h.cardId === id);
        const inHand = cardHandView(held).find((v) => v.cardId === id)!;
        expect(inHand.level).toBe(level);
        expectJoinedGap(held, inHand, taken(playCard(held, at)));
      }
      if (kind === 'dilemma') {
        // The dilemma's margin step shows: Level III is two steps above Level I.
        const one = face(s, id).view;
        const three = cardHandView(heldAt(s, id, 3)).find((v) => v.cardId === id)!;
        expect(three.floor!.gap! - one.floor!.gap!).toBeGreaterThanOrEqual(2 * CARD_WEEK.DILEMMA_MARGIN_STEP - 1);
      }
    });
  }

  it('an upgrade of a man already here shows no floor: it would set him against himself', async () => {
    const s = await career(107);
    const id = signing(s);
    const joined = taken(playPickCard(face(s, id).state, 0));
    const { view } = face(joined.state, id);
    expect(view).toMatchObject({ upgrade: true, level: 2 });
    expect(view.player!.name).toBe(joined.joined!.name);
    expect(view.floor).toBeUndefined();
  });

  it('the dilemma shows board patience before and after, on every level, since each play costs it', async () => {
    const s = { ...(await career(37)), boardPatience: 5 };
    const first = face(s, 'marqueeGamble');
    expect(first.view.board).toEqual({ from: 5, to: 4, max: BOARD.MAX_PATIENCE, line: `Board patience 5 → 4 of ${BOARD.MAX_PATIENCE}` });
    expect(first.view.floor).toBeDefined();
    const hired = taken(playPickCard(first.state, 0)).state;
    expect(hired.boardPatience).toBe(4);
    const upgrade = face(hired, 'marqueeGamble').view;
    expect(upgrade).toMatchObject({ upgrade: true, level: 2, board: { from: 4, to: 3, line: `Board patience 4 → 3 of ${BOARD.MAX_PATIENCE}` } });
    expect(upgrade.floor).toBeUndefined();
  });

  it('a trait card says what it does and whom it suits; each target has his real step, a Level II card too', async () => {
    const s = await career(113);
    const holder = s.squad[0]!;
    const withOne = { ...s, squad: s.squad.map((p) => (p === holder ? { ...p, traits: [{ id: 'lastLine' as const, level: 1 as const }] } : p)) };
    const one = face(withOne, 'lastLine');
    expect(one.view.trait).toEqual({ blurb: TRAITS.lastLine.blurb, suits: ['fullback', 'winger'] });
    expect(one.view.targets!.find((t) => t.playerId === holder.id)).toMatchObject({ current: 1, level: 2 });
    for (const t of one.view.targets!) {
      expect(t.suited).toBe(['fullback', 'winger'].includes(withOne.squad.find((x) => x.id === t.playerId)!.position));
    }
    // Taken into the hand, the next copy is Level II: two levels at once, capped at III.
    const two = face(changed(takeCard(one.state, 0)), 'lastLine').view;
    expect(two.level).toBe(2);
    expect(two.targets!.find((t) => t.playerId === holder.id)).toMatchObject({ current: 1, level: 3 });
    expect(two.targets!.find((t) => t.playerId !== holder.id)).toMatchObject({ current: 0, level: 2 });
    expect(face(s, 'wreckingBall').view.trait!.suits).toEqual([...TRAITS.wreckingBall.fit!]);
  });

  it('a trait already bound to his man still says what the trait does', async () => {
    const s = await career(43);
    const target = s.squad.find((p) => traitLevel(p.traits, 'lastLine') === 0)!;
    const bound = taken(playPickCard(face(s, 'lastLine').state, 0, target.id)).state;
    const view = face(bound, 'lastLine').view;
    expect(view.targets).toBeUndefined();
    expect(view.detail).toBe(target.name);
    expect(view.trait!.blurb).toBe(TRAITS.lastLine.blurb);
  });

  it('a staff card says what the job does, the wage as paid and the fee saved; an attack coach lists his plays', async () => {
    const s = await career(127);
    expect(face(s, 'analyst').view.staff).toEqual({ blurb: STAFF.analyst.blurb, wage: staffWage(s, 'analyst'), feeSaved: STAFF_APPOINTMENT_PRICES.analyst });
    const coach = face(s, 'directAttackCoach').view.staff!;
    expect(coach).toEqual({
      blurb: ATTACK_COACHES.direct.blurb, wage: attackCoachWage(s, 'direct'), feeSaved: STAFF_APPOINTMENT_PRICES.direct,
      plays: playsOfFamily('direct').map((p) => p.name),
    });
    expect(coach.plays!.length).toBeGreaterThan(0);
  });

  it('a staff upgrade shows the cut wage he will be paid and no fee', async () => {
    const s = await career(37);
    const hired = taken(playPickCard(face(s, 'analyst').state, 0)).state;
    const { state, view } = face(hired, 'analyst');
    expect(view).toMatchObject({ upgrade: true, level: 2 });
    expect(view.staff).toEqual({ blurb: STAFF.analyst.blurb, wage: Math.round(staffWage(s, 'analyst') * CARD_WEEK.STAFF_WAGE_FACTOR[2]), feeSaved: 0 });
    const upgraded = changed(takeCard(state, 0));
    expect(upgraded.staff.find((m) => m.role === 'analyst')!.wage).toBe(view.staff!.wage);
  });

  it('a first hire held at Level II still saves the fee, at the cut wage', async () => {
    const s = await career(37);
    const held = changed(takeCard(face(changed(takeCard(face(s, 'analyst').state, 0)), 'analyst').state, 0));
    const view = cardHandView(held)[0]!;
    expect(view.level).toBe(2);
    expect(view.staff).toMatchObject({ wage: Math.round(staffWage(s, 'analyst') * 0.75), feeSaved: STAFF_APPOINTMENT_PRICES.analyst });
    expect(taken(playCard(held, 0)).state.staff.find((m) => m.role === 'analyst')!.wage).toBe(view.staff!.wage);
  });

  it('a set play card says what the play is and the price saved, and nothing saved on an upgrade', async () => {
    const s = await career(131);
    const coached = { ...s, staff: [newStaffMember(s, { attackCoach: 'direct' }, 'Coach')] };
    const { state, view } = face(coached, 'setPlay');
    const card = first(state);
    if (card.kind !== 'setPlay') throw new Error('not a set play');
    const play = PLAYS_BY_ID[card.playId];
    expect(view.play).toEqual({ name: play.name, blurb: play.blurb, priceSaved: play.price });
    expect(view.detail).toBe(play.name);
    const owned = taken(playPickCard(state, 0)).state;
    expect(face(owned, 'setPlay').view.play).toEqual({ name: play.name, blurb: play.blurb, priceSaved: 0 });
  });

  it('a cash card adds nothing', async () => {
    const view = face(await career(137), 'cashInjection').view;
    expect([view.floor, view.board, view.trait, view.staff, view.play]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});
