// Card week (#846): pick one card from three before round 1 and after each
// League match. Rules, state and save; the pick screen comes later.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectPack } from '../../src/content';
import { bus } from '../../src/core/events';
import { __setStorage, __unlockSaves, classicSlots, firstRunSlotSummaries, loadCareer, migrateState, saveIfChanged, setActiveSlot, slotHasLeagueData } from '../../src/core/save';
import { isClassicSave } from '../../src/core/classicSave';
import { isCardWeek } from '../../src/core/saveValidation';
import { careerActionClock } from '../../src/core/season';
import { setCareerNamespace } from '../../src/core/storage/local';
import { DEV_TEST_PREFIX } from '../../src/core/storageKeys';
import { createNewGame, getState, loadState, newCardWeek, setState, type GameState, type OfferedCard, type Player, type Position } from '../../src/core/state';
import { advanceWeek, clearHeldWeek, clearSeasonHooks, clearTickHooks, withFastForward } from '../../src/core/time';
import { BOARD, SQUAD_CAP } from '../../src/config';
import { CARD_WEEK, CARDS, cardDefById, PLAYER_CARD_MARGIN } from '../../src/data/cards';
import { AROUND_SPREAD, overallRating } from '../../src/data/player';
import { effectiveRating, FIT, positionFit } from '../../src/systems/lineup';
import { traitLevel } from '../../src/data/traits';
import { leagueEntryReceiptId } from '../../src/data/leagueCareer';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import {
  cardFloor, cardOfferView, cardWeekTick, passCard, passPick, chooseCard, drawOffer, freePlayCandidates, lastMatchImpact, plantCard,
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

const planted = (s: GameState, cardId: string): GameState => {
  const r = plantCard(s, cardId);
  if (typeof r === 'string') throw new Error(`not planted: ${r}`);
  return r;
};

/** The card on show at 0, which plantCard put there. */
const first = (s: GameState): OfferedCard => s.cardWeek!.offer!.cards[0]!;

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
    expect(a.cardWeek!.owed).toBe(3);
    const ids = a.cardWeek!.offer!.cards.map((c) => c.cardId);
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
    const again = { ...s, cardWeek: { ...s.cardWeek!, offer: null } };
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
      const r = taken(takeCard(p, 0));
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

  it('a pick is spent: owed drops, the card goes in the history and the next pick is drawn', async () => {
    const s = await career(31);
    const r = taken(takeCard(s, 0, s.squad[0]!.id));
    const cw = r.state.cardWeek!;
    expect(cw.owed).toBe(2);
    expect(cw.history).toEqual([{ cardId: s.cardWeek!.offer!.cards[0]!.cardId, season: 1, week: 1 }]);
    expect(cw.offer!.cards.length).toBeGreaterThan(0);
    expect(cw.offer).not.toEqual(s.cardWeek!.offer);
    expect(r.state.rngSeed).toBe(s.rngSeed);
    expect(r.state.eventDeck).toEqual(s.eventDeck);
    // The last pick owed leaves nothing on show.
    const last = { ...r.state, cardWeek: { ...cw, owed: 1 } };
    const done = taken(takeCard(last, 0, last.squad[0]!.id));
    expect(done.state.cardWeek!.owed).toBe(0);
    expect(done.state.cardWeek!.offer).toBeNull();
    expect(takeCard(done.state, 0)).toBe('No pick is waiting.');
  });

  it('a staff card hires the role with the fee waived, and is not offered once the role is filled', async () => {
    const s = await career(37);
    const p = planted(s, 'analyst');
    const r = taken(takeCard(p, 0));
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
    const r = taken(takeCard(p, 0));
    expect(r.state.playbook.owned).toEqual([card.playId]);
    expect(r.state.money).toBe(0);
  });

  it('a trait card goes to the man chosen: I, then II, then III, and then he is not a target', async () => {
    const s = await career(43);
    const target = s.squad.find((p) => traitLevel(p.traits, 'lastLine') === 0)!;
    let state = s;
    for (const level of [1, 2, 3]) {
      state = planted({ ...state, cardWeek: { ...state.cardWeek!, owed: 3 } }, 'lastLine');
      expect(cardOfferView(state).cards[0]!.targets!.find((t) => t.playerId === target.id)!.level).toBe(level);
      state = taken(takeCard(state, 0, target.id)).state;
      expect(traitLevel(state.squad.find((p) => p.id === target.id)!.traits, 'lastLine')).toBe(level);
    }
    expect(traitTargets(state, 'lastLine').some((t) => t.player.id === target.id)).toBe(false);
    const again = planted({ ...state, cardWeek: { ...state.cardWeek!, owed: 3 } }, 'lastLine');
    expect(takeCard(again, 0, target.id)).toMatch(/already has Last Line III/);
    expect(takeCard(again, 0)).toBe('Choose a player for the trait.');
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
    expect(chooseCard(0)).toEqual({ ok: true, outcome: 'Cash injection: +$15,000.' });
    expect(getState().money).toBe(before + 15_000);
    expect(moves).toEqual([{ delta: 15_000, reason: 'card: Cash injection' }]);
    expect(classifyReason('card: Cash injection')).toBe('events');
    expect(chooseCard(5)).toEqual({ ok: false, reason: 'There is no card there.' });
  });

  it('the dilemma brings a stronger man and costs one point of board patience, never the last', async () => {
    const s = { ...(await career(53)), boardPatience: 3 };
    const p = planted(s, 'marqueeGamble');
    const r = taken(takeCard(p, 0));
    expect(r.state.boardPatience).toBe(2);
    expect(r.state.squad.some((x) => x.id === r.joined!.id)).toBe(true);
    const card = first(p);
    if (card.kind !== 'dilemma') throw new Error('not the dilemma');
    expect(overallRating(r.joined!)).toBeGreaterThan(cardFloor(s.squad, card.player.position));
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
    expect(cw.owed).toBe(2);
    expect(cw.history).toEqual([{ cardId: 'pass', season: 1, week: 1 }]);
    expect(cw.offer!.cards).toHaveLength(3);
    expect(r.squad).toEqual(s.squad);
    expect(r.money).toBe(s.money);
    expect(isCardWeek(cw)).toBe(true);
    const last = passCard({ ...s, cardWeek: { ...s.cardWeek!, owed: 1 } });
    if (typeof last === 'string') throw new Error(last);
    expect(last.cardWeek!.offer).toBeNull();
    expect(passCard(last)).toBe('No pick is waiting.');
  });

  it('frees a pick whose three cards are all refused', async () => {
    const s = await career(89);
    // Every card on show is refused: the set play is owned, everyone already has Last Line III, and the
    // squad is full with nobody the club can afford to release for the prop.
    const prop = planted({ ...s, money: 10_000_000 }, 'propSigning').cardWeek!.offer!.cards[0]!;
    const stuck: GameState = { ...s, money: -1,
      squad: s.squad.map((p) => ({ ...p, traits: [{ id: 'lastLine' as const, level: 3 as const }] })),
      cardWeek: { ...s.cardWeek!, owed: 1, offer: { season: 1, week: 1, cards: [
        { ...prop, replacesId: s.squad[0]!.id, replacesName: s.squad[0]!.name } as OfferedCard,
        { cardId: 'setPlay', kind: 'setPlay', playId: 'block-play' }, { cardId: 'lastLine', kind: 'trait' },
      ] } }, playbook: { owned: ['block-play'] } };
    const view = cardOfferView(stuck);
    expect(view.cards).toHaveLength(3);
    expect(view.cards.every((c) => c.refusal !== null)).toBe(true);
    expect([0, 1, 2].every((i) => typeof takeCard(stuck, i, 'nobody') === 'string')).toBe(true);
    loadState(stuck);
    expect(passPick()).toEqual({ ok: true });
    expect(getState().cardWeek!.owed).toBe(0);
    expect(getState().cardWeek!.offer).toBeNull();
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
    const r = taken(takeCard(p, 0));
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
    const r = taken(takeCard(p, 0));
    expect(commitment(r.state.squad, season)).toBeLessThanOrEqual(cap);
    expect(r.state.squad.some((x) => x.id === card.replacesId)).toBe(false);
  });

  it('no pick ever takes the club over the squad limit or the cap, over many picks', async () => {
    let s = fullSquad(await career(67));
    const season = careerActionClock(s).season;
    for (let i = 0; i < 30; i++) {
      s = { ...s, cardWeek: { ...s.cardWeek!, owed: 3 } };
      if (!s.cardWeek!.offer) s = { ...s, cardWeek: { ...s.cardWeek!, offer: drawOffer(s).offer } };
      const r = takeCard(s, i % s.cardWeek!.offer!.cards.length, s.squad[i % s.squad.length]!.id);
      if (typeof r === 'string') { s = { ...s, cardWeek: { ...s.cardWeek!, offer: null } }; continue; }
      s = r.state;
      expect(s.squad.length).toBeLessThanOrEqual(SQUAD_CAP);
      expect(commitment(s.squad, season)).toBeLessThanOrEqual(publishedCap(s.capAccount));
    }
  });

  it('a card that cannot be made legal is never offered', async () => {
    const base = fullSquad(await career(71));
    // Nobody can be released: the club is in debt, so no payout is affordable.
    const broke = { ...base, money: -1 };
    const draws = Array.from({ length: 25 }, (_, i) => drawOffer({ ...broke, cardWeek: { ...broke.cardWeek!, rng: 1000 + i, offer: null } }).offer!);
    for (const offer of draws) {
      for (const c of offer.cards) expect(['player', 'dilemma']).not.toContain(c.kind);
      expect(offer.cards.some((c) => c.kind === 'setPlay')).toBe(false);
    }
    // Every role filled: no staff card.
    const staffed = { ...base, staff: [...STAFF_ROLES.map((r) => newStaffMember(base, r, 'X')), newStaffMember(base, { attackCoach: 'width' }, 'Y')] };
    for (let i = 0; i < 25; i++) {
      const offer = drawOffer({ ...staffed, cardWeek: { ...staffed.cardWeek!, rng: 2000 + i, offer: null } }).offer!;
      expect(offer.cards.some((c) => c.kind === 'staff')).toBe(false);
      expect(new Set(offer.cards.map((c) => c.cardId)).size).toBe(offer.cards.length);
    }
  });
});

describe('picks owed', () => {
  it('starts at three, adds one a League match up to three, and ignores trials and cup fixtures', async () => {
    const s = await career(73);
    const slot = leagueSlot(s);
    const none = { ...s, cardWeek: { ...s.cardWeek!, owed: 0, offer: null } };
    // A trial (exhibition) week counts for nothing.
    const trial = played(none, 1);
    expect(playedLeagueMatch(trial)).toBe(false);
    expect(cardWeekTick(trial).cardWeek!.owed).toBe(0);
    // A League round adds one and draws a pick.
    const round = played(none, slot);
    expect(playedLeagueMatch(round)).toBe(true);
    const after = cardWeekTick(round).cardWeek!;
    expect(after.owed).toBe(1);
    expect(after.offer!.cards.length).toBe(3);
    // Capped at three.
    const full = played(s, slot);
    expect(cardWeekTick(full).cardWeek!.owed).toBe(CARD_WEEK.MAX_OWED);
    // The same fixture in a cup (knockout) instance adds nothing.
    const cup = played({
      ...none,
      competitions: { ...none.competitions!, instances: none.competitions!.instances.map((i) => i.definition.format.kind === 'league'
        ? { ...i, definition: { ...i.definition, format: { kind: 'knockout' as const } } } : i) },
    }, slot);
    expect(cardWeekTick(cup).cardWeek!.owed).toBe(0);
    // A career without a card week is returned as it was.
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

  /** Play weeks headless until the club's first League match is in. */
  const toFirstLeagueMatch = (): void => {
    const slot = leagueSlot(getState());
    withFastForward(() => { for (let i = 0; i < 12 && getState().week <= slot; i++) advanceWeek(); });
  };

  it('adds a pick after the League match and records its lines from the match', () => {
    activeLeague(573);
    setState({ cardWeek: { ...startCardWeek(getState(), newCardWeek(573)).cardWeek!, owed: 1 } });
    expect(saveIfChanged(getState())).toBe(true);
    registerFixturesSystem(); registerPlayerMatchSystem(); registerCardWeekSystem();
    const slot = leagueSlot(getState());
    withFastForward(() => { for (let i = 0; i < 12 && getState().week < slot; i++) advanceWeek(); });
    // The trials before round 1 add no pick.
    expect(getState().cardWeek!.owed).toBe(1);
    const before = new Map(getState().squad.map((p) => [p.id, p.career!]));
    withFastForward(() => advanceWeek());
    const cw = getState().cardWeek!;
    expect(cw.owed).toBe(2);
    expect(cw.lastMatch!.week).toBe(slot);
    expect(cw.lastMatch!.rows.length).toBeGreaterThanOrEqual(9);
    // Each line is what the match added to his career tallies (stats.ts folds the same events).
    for (const row of cw.lastMatch!.rows) {
      const now = getState().squad.find((p) => p.id === row.playerId)!.career!;
      const was = before.get(row.playerId)!;
      expect([row.tries, row.tackles, row.lineBreaks]).toEqual([now.tries - was.tries, now.tackles - was.tackles, now.lineBreaks - was.lineBreaks]);
    }
  });

  it('a career without a card week plays the week exactly as it does with the hook registered', () => {
    const run = (hook: boolean): GameState => {
      clearTickHooks(); clearSeasonHooks(); bus.clear();
      activeLeague(577);
      registerFixturesSystem(); registerPlayerMatchSystem();
      if (hook) registerCardWeekSystem();
      toFirstLeagueMatch();
      return structuredClone(getState());
    };
    const without = run(false);
    const withHook = run(true);
    expect(without.week).toBeGreaterThan(leagueSlot(without) - 1);
    expect(without.competitions!.calendar!.elapsedIntervals).toBeGreaterThan(0);
    expect(withHook.cardWeek).toBeUndefined();
    expect(JSON.stringify(withHook)).toBe(JSON.stringify(without));
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
