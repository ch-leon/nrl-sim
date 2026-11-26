// Card week (#846): pick one card from three before round 1 and after each
// League match. Rules, state and save; the pick screen comes later.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { preparePack, selectPack } from '../../src/content';
import { advanceUntil } from '../../src/core/advance';
import { runMatch } from '../../src/match/league/match';
import { eventOpportunities } from '../../src/systems/eventOpportunities';
import { registerEventsSystem } from '../../src/systems/events';
import { registerEconomySystem, registerFinanceSystem } from '../../src/systems/economy';
import { registerTrainingSystem } from '../../src/systems/training';
import { registerMoraleSystem } from '../../src/systems/morale';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, classicSlots, firstRunSlotSummaries, loadCareer, migrateState, saveIfChanged, setActiveSlot, slotHasLeagueData } from '../../src/core/save';
import { isClassicSave } from '../../src/core/classicSave';
import { isCardWeek } from '../../src/core/saveValidation';
import { careerActionClock } from '../../src/core/season';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { createNewGame, getState, loadState, newCardWeek, setState, type GameState, type OfferedCard, type Player, type Position } from '../../src/core/state';
import { advanceWeek, advanceWeeks, clearHeldWeek, clearSeasonHooks, clearTickHooks, withFastForward, weekHeld } from '../../src/core/time';
import { BOARD, SQUAD_CAP } from '../../src/config';
import { CARD_WEEK, CARDS, cardDefById, PLAYER_CARD_MARGIN } from '../../src/data/cards';
import { AROUND_SPREAD, overallRating } from '../../src/data/player';
import { effectiveRating, FIT, positionFit } from '../../src/systems/lineup';
import { traitLevel } from '../../src/data/traits';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import {
  cardFloor, cardOfferView, cardWeekTick, passCard, passPick, discardCard, playCard, playChosenCard, playPickCard, drawOffer, freePlayCandidates, lastMatchImpact, plantCard,
  playedLeagueMatch, registerCardWeekSystem, startCardWeek, takeCard, traitTargets, type CardTake,
} from '../../src/systems/cardWeek';
import { capRoomFor, commitment, publishedCap } from '../../src/systems/cap';
import { setupStructuralDivisionCareer } from '../../src/systems/divisionCareer';
import { createOpenCupOffer } from '../../src/systems/openCupEntry';
import { registerFixturesSystem } from '../../src/systems/fixtures';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import { registerPlayerMatchSystem } from '../../src/systems/matchday';
import { STAFF_ROLES, newStaffMember, staffWage } from '../../src/systems/staff';
import { classifyReason } from '../../src/systems/economy';
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
  it('owes three picks and shows three different known cards, the same for the same seed', async () => {
    const a = await career(7);
    const b = await career(7);
    expect(a.cardWeek).toMatchObject({ owed: 0, starterLeft: 3, grants: 3 });
    const ids = a.cardWeek!.offers[0]!.cards.map((c) => c.cardId);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
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
    expect(one.offer!.cards.length).toBe(3);
    expect(one.rng).not.toBe(s.cardWeek!.rng);
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

  it('holds five cards, refuses a sixth atomically, then allows explicit discard and take', async () => {
    let s = await career(31);
    for (let i = 0; i < CARD_WEEK.HAND_CAP; i++) s = changed(takeCard(planted(s, 'cashInjection'), 0));
    const waiting = planted(s, 'cashInjection');
    expect(takeCard(waiting, 0)).toMatch(/hand is full/i);
    expect(playPickCard(waiting, 0)).toMatch(/hand is full/i);
    expect(waiting.cardWeek!.offers).toHaveLength(1);
    expect(waiting.cardWeek!.hand).toHaveLength(5);
    const discarded = changed(discardCard(waiting, 2));
    expect(discarded.cardWeek!.history.slice(-1)[0]).toMatchObject({ cardId: 'cashInjection', action: 'discard' });
    expect(discarded.cardWeek!.offers).toEqual(waiting.cardWeek!.offers);
    const taken = changed(takeCard(discarded, 0));
    expect(taken.cardWeek!.hand).toHaveLength(5);
    expect(taken.cardWeek!.offers).toHaveLength(0);
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

  it('a staff card hires the role with the fee waived, and is not offered once the role is filled', async () => {
    const s = await career(37);
    const p = planted(s, 'analyst');
    const r = taken(playPickCard(p, 0));
    const hire = r.state.staff.find((m) => m.role === 'analyst')!;
    expect(hire.name).toBe((first(p) as { name: string }).name);
    expect(hire.wage).toBe(staffWage(s, 'analyst'));
    expect(r.state.money).toBe(p.money);
    expect(r.money).toEqual([]);
    expect(plantCard(r.state, 'analyst')).toBe('That card cannot be offered now.');
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

  it('a trait card goes to the man chosen: I, then II, then III, and then he is not a target', async () => {
    const s = await career(43);
    const target = s.squad.find((p) => traitLevel(p.traits, 'lastLine') === 0)!;
    let state = s;
    for (const level of [1, 2, 3]) {
      state = planted(state, 'lastLine');
      expect(cardOfferView(state).cards[0]!.targets!.find((t) => t.playerId === target.id)!.level).toBe(level);
      state = taken(playPickCard(state, 0, target.id)).state;
      expect(traitLevel(state.squad.find((p) => p.id === target.id)!.traits, 'lastLine')).toBe(level);
    }
    expect(traitTargets(state, 'lastLine').some((t) => t.player.id === target.id)).toBe(false);
    const again = planted(state, 'lastLine');
    expect(playPickCard(again, 0, target.id)).toMatch(/already has Last Line III/);
    expect(playPickCard(again, 0)).toBe('Choose a player for the trait.');
    // Nobody left to take it: the card is not offered.
    const maxed = { ...again, squad: again.squad.map((p) => ({ ...p, traits: [{ id: 'lastLine' as const, level: 3 as const }] })) };
    expect(plantCard(maxed, 'lastLine')).toBe('That card cannot be offered now.');
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
    expect(cw.offers[0]!.cards).toHaveLength(3);
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
      cardWeek: { ...s.cardWeek!, starterLeft: 1, offers: [{ kind: 'starter', season: 1, week: 1, cards: [
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
    expect(offers[3]!.cards).toHaveLength(3);
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
    expect(getState().cardWeek!.grants).toBe(3);
    expect(match).toBeDefined();
    bus.emit('match:finished', match!);
    expect(weekHeld()).toBe(false);
    expect(getState().cardWeek).toMatchObject({ starterLeft: 3, owed: 1, grants: 4 });
    bus.emit('match:finished', match!);
    expect(getState().cardWeek!.grants).toBe(4);
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
      if (offer.kind === 'match') grantsByWeek.set(offer.week, cw.grants);
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
  }, 30000);

  it('a career without a card week plays the week exactly as it does with the hook registered', () => {
    const run = (hook: boolean): string[] => {
      clearTickHooks(); clearSeasonHooks(); bus.clear();
      activeLeague(577);
      registerTrainingSystem(); registerEconomySystem(); registerFinanceSystem();
      registerFixturesSystem(); registerPlayerMatchSystem(); registerEventsSystem(); registerMoraleSystem();
      if (hook) registerCardWeekSystem();
      const weeks: string[] = [];
      bus.on('week:advanced', () => weeks.push(JSON.stringify(getState())));
      advanceWeeks(getState().competitions!.calendar!.slots.length);
      expect(getState().competitions!.leagueCareer!.phase).toBe('next-season-choice');
      expect(weeks).toHaveLength(getState().competitions!.calendar!.slots.length);
      expect(getState().cardWeek).toBeUndefined();
      return weeks;
    };
    expect(run(true)).toEqual(run(false));
  }, 60000);
});

describe('save v37 migration', () => {
  function legacy(s: GameState, owed: number) {
    const cw = s.cardWeek!;
    const current = cw.offers[0]!;
    return {
      ...s, version: 36, cardWeek: {
        rng: cw.rng, owed, offer: { season: current.season, week: current.week, cards: current.cards },
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
    expect(result.state.version).toBe(37);
    const cw = result.state.cardWeek!;
    expect(cw).toMatchObject({ starterLeft: 2, owed: 0, grants: 3, hand: [] });
    expect(cw.offers[0]).toEqual({ ...raw.cardWeek.offer, kind: 'starter' });
    expect(cw.offers[1]!.kind).toBe('starter');
    expect(cw.history).toEqual([{ cardId: 'analyst', week: 1, season: 1, action: 'take' }]);
    expect(cw.active).toEqual([{ cardId: 'analyst', kind: 'staff', level: 1, member: s.staff[0] }]);
    expect(result.state.staff).toEqual(s.staff);
    expect(result.state.rngSeed).toBe(s.rngSeed);
    expect(result.state.eventDeck).toEqual(s.eventDeck);
    expect(migrateState(JSON.parse(bytes))).toEqual(result);
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
    expect(cw.offers[0]).toEqual({ ...raw.cardWeek.offer, kind: 'match' });
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
    expect(migrateState({ ...s, version: 38 })).toMatchObject({ ok: false, reason: 'future' });
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
