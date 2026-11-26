import { AU_PACK } from '../content';
import { UK_NAMES } from '../content/ukNames';
import { awaitingCampReplay } from './parkedLeagueFixture';
// src/systems/cardWeek.ts — the card week (#846, Labs): a League career that
// chose it gets a pick of one card from three before round 1 and after each
// League match it plays (up to CARD_WEEK.MAX_OWED waiting). The cards are in
// data/cards.ts. Pure functions plus one tick hook and store actions for the UI.
//
// A career is a card-week career only when state.cardWeek exists; every path
// here is guarded on it, so any other career plays exactly as before. The
// three cards on show are resolved when they are drawn (the player a card
// brings, who he would replace, the play, the hire's name) and saved, so a
// reload shows the same offer. Randomness comes from the card week's own
// stream (state.cardWeek.rng): drawing never moves rngSeed or the events deck.
// Money, board patience and traits go through the events deck's applyEffects,
// so they read and book the way an event card's do.
import { getState, setState, type CardHistoryEntry, type CardOffer, type CardWeekState, type StaffMember, type Fixture, type GameState, type HandCard, type LastMatchImpact, type OfferedCard, type Player, type Position } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, TICK_ORDER, weekHeld } from '../core/time';
import { saveIfChanged } from '../core/save';
import { careerActionClock, elapsedInterval } from '../core/season';
import { earnMoney } from '../data/club';
import { CARD_PASS, CARD_WEEK, CARDS, cardDefById, type CardDef, type CardKind, type CardTier } from '../data/cards';
import { generatePlayerAround, overallRating } from '../data/player';
import { PLAYS_BY_ID, PLAY_IDS, type PlayId } from '../data/plays';
import { ROMAN, TRAITS, traitLevel, type TraitLevel } from '../data/traits';
import { randomName } from '../data/names';
import { SQUAD_CAP } from '../config';
import { makeRng, type Rng } from '../utils/rng';
import { fmtMoney } from '../utils/money';
import { applyEffects, deckWaitsForLeagueChoice, type Applied } from './events';
import { capRoomFor, releaseTerms, salaryDemand, signForRestOfSeason } from './cap';
import { releasedState } from './freeagency';
import { effectiveRating, FIT, placeSigning, positionFit } from './lineup';
import { awayPlayerIds, campDisposalProblem } from './playerAssignments';
import { rosterIntervalProblem } from './playerAssignmentCommit';
import { admitGeneratedPeople, openClubSpell } from './playerCareer';
import { buyRefusal, ownsPlay } from './playbook';
import { appointFeeWaived, hireRefusal, type StaffHire } from './staff';
import { emptyTally, foldEvents } from './stats';
import { PLAYER_ID } from './fixtures';
import type { MatchEvent } from '../sim/events';

/** Is this a card-week career? */
export function isCardWeekCareer(state: Pick<GameState, 'cardWeek'>): boolean {
  return state.cardWeek !== undefined;
}

// ── Eligibility ──────────────────────────────────────────────────────────────

/**
 * A player card's floor at `position` (the card's man must beat it): the club's
 * best natural player there, by overall. With none, the best man from a related
 * position by his rating there (×0.92), and with none of those either, the best
 * man anywhere by his rating there. A star from another position does not set
 * it: at 0.8 fit he would push a card's man far above the club's real level.
 */
export function cardFloor(squad: readonly Player[], position: Position): number {
  const best = (players: readonly Player[], rate: (p: Player) => number): number | null =>
    players.length ? Math.max(...players.map(rate)) : null;
  return best(squad.filter((p) => p.position === position), overallRating)
    ?? best(squad.filter((p) => positionFit(p.position, position) === FIT.related), (p) => effectiveRating(p, position))
    ?? best(squad, (p) => effectiveRating(p, position))
    ?? 0;
}

/** The position with the lowest card floor (the dilemma card's man plays there); ties go to the formation order. */
function weakestPosition(squad: readonly Player[]): Position {
  const order: Position[] = ['fullback', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row', 'lock'];
  return order.reduce((weak, pos) => (cardFloor(squad, pos) < cardFloor(squad, weak) ? pos : weak), order[0]!);
}

/** A staff card's hire. */
function hireOf(def: Extract<CardDef, { kind: 'staff' }>): StaffHire {
  return typeof def.role === 'string' ? def.role : { attackCoach: def.role.attackCoach };
}

/** The plays the club could buy today with money no object, and doesn't own. */
export function freePlayCandidates(state: GameState): PlayId[] {
  const rich = { ...state, money: Number.MAX_SAFE_INTEGER };
  return PLAY_IDS.filter((id) => buyRefusal(rich, id) === null);
}

/** Squad members a trait card could go to now, with the level each would reach: not away, and not already at III. */
export function traitTargets(state: GameState, trait: Extract<CardDef, { kind: 'trait' }>['trait']): { player: Player; level: TraitLevel }[] {
  const away = awayPlayerIds(state);
  return state.squad
    .filter((p) => !away.has(p.id) && traitLevel(p.traits, trait) < 3)
    .map((p) => ({ player: p, level: (traitLevel(p.traits, trait) + 1) as TraitLevel }));
}

/** Can `def` go in a pick now, before any dice? A player card may still sit out once it is rolled (resolveCard). */
function eligibleBeforeDice(state: GameState, def: CardDef): boolean {
  switch (def.kind) {
    case 'player': return true;
    // The dilemma never takes the board's last point of patience: at zero the board sacks the coach.
    case 'dilemma': return gambleRefusal(state, def) === null;
    case 'staff': return hireRefusal(state, hireOf(def)) === null;
    case 'setPlay': return freePlayCandidates(state).length > 0;
    case 'trait': return traitTargets(state, def.trait).length > 0;
    case 'cash': return true;
  }
}

// ── Room for a card player ───────────────────────────────────────────────────

/** Would a man on `salary` fit the squad limit and this season's cap, with `without` gone? */
function fits(state: GameState, salary: number, without?: string): boolean {
  const squad = without ? state.squad.filter((p) => p.id !== without) : state.squad;
  return squad.length < SQUAD_CAP && capRoomFor(squad, state.capAccount, careerActionClock(state).season, salary);
}

/** Could he be released now to make room: in the squad, not away or booked, no running scholarship, and the payout affordable? */
function releasable(state: GameState, p: Player): boolean {
  const clock = careerActionClock(state);
  if (awayPlayerIds(state).has(p.id) || campDisposalProblem(state, p.id) !== null) return false;
  if (p.emergencyDealEndSeason !== undefined && p.emergencyDealEndSeason >= clock.season) return false;
  return state.money >= releaseTerms(p, clock.season, clock.week, clock.duration).payout;
}

/**
 * Who a card player on `salary` replaces when the squad or the cap has no room:
 * the weakest man at his position, else the weakest man outside the nine, whose
 * release makes the signing legal. Undefined when he fits as things are; null
 * when no release would make room (the card is not offered).
 */
export function replacementFor(state: GameState, position: Position, salary: number): Player | null | undefined {
  if (fits(state, salary)) return undefined;
  const starters = new Set(state.lineup.starters.filter((id): id is string => id !== null));
  const weakest = (a: Player, b: Player): number => overallRating(a) - overallRating(b) || a.id.localeCompare(b.id);
  const candidates = [
    ...state.squad.filter((p) => p.position === position).sort(weakest),
    ...state.squad.filter((p) => p.position !== position && !starters.has(p.id)).sort(weakest),
  ];
  return candidates.find((p) => releasable(state, p) && fits(state, salary, p.id)) ?? null;
}

// ── Drawing ──────────────────────────────────────────────────────────────────

/** A player card's man: generated around the card floor at his position plus the card's margin, and better than the floor. */
function resolvePlayer(state: GameState, def: Extract<CardDef, { kind: 'player' | 'dilemma' }>, rng: Rng): OfferedCard | null {
  const position = def.kind === 'player' ? def.position : weakestPosition(state.squad);
  const floor = cardFloor(state.squad, position);
  // No card at the position of the club's best player: built on his rating, a gold man there came out in the 90s.
  if (floor >= Math.max(0, ...state.squad.map(overallRating))) return null;
  const target = Math.min(99, floor + def.margin);
  for (let i = 0; i < CARD_WEEK.PLAYER_TRIES; i++) {
    const player = generatePlayerAround(rng, target, {
      position, names: state.pack === 'uk' ? UK_NAMES : AU_PACK.names, seasonWeeks: careerActionClock(state).duration,
    });
    if (overallRating(player) <= floor) continue;
    const salary = salaryDemand(player);
    const replaces = replacementFor(state, position, salary);
    if (replaces === null) return null;
    return {
      cardId: def.id, kind: def.kind, player, salary,
      ...(replaces ? { replacesId: replaces.id, replacesName: replaces.name } : {}),
    };
  }
  return null;
}

/** Settle what a drawn card brings (pure, rolls `rng`), or null when it can't be offered after all. */
function resolveCard(state: GameState, def: CardDef, rng: Rng): OfferedCard | null {
  switch (def.kind) {
    case 'player': case 'dilemma': return resolvePlayer(state, def, rng);
    case 'staff': return { cardId: def.id, kind: 'staff', name: randomName(rng, state.pack === 'uk' ? UK_NAMES : AU_PACK.names) };
    case 'setPlay': return { cardId: def.id, kind: 'setPlay', playId: rng.pick(freePlayCandidates(state)) };
    case 'trait': case 'cash': return { cardId: def.id, kind: def.kind };
  }
}

/** Weighted pick; null when nothing is left. */
function pickWeighted(cards: readonly CardDef[], rng: Rng): CardDef | null {
  const total = cards.reduce((t, c) => t + c.weight, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const c of cards) {
    roll -= c.weight;
    if (roll < 0) return c;
  }
  return cards[cards.length - 1] ?? null;
}

/**
 * Draw a pick (pure): up to CARD_WEEK.OFFER_SIZE different eligible cards,
 * weighted, each resolved. Fewer only when fewer can be offered. Rolls the card
 * week's own stream and returns its new state with the offer.
 */
export function drawOffer(state: GameState, kind: CardOffer['kind'] = 'match', skipId?: string): { offer: CardOffer | null; rng: number } {
  const cw = state.cardWeek;
  if (!cw) return { offer: null, rng: 0 };
  const rng = makeRng(cw.rng);
  let left = CARDS.filter((c) => c.id !== skipId && eligibleBeforeDice(state, c));
  const cards: OfferedCard[] = [];
  while (cards.length < CARD_WEEK.OFFER_SIZE && left.length > 0) {
    const def = pickWeighted(left, rng);
    if (!def) break;
    left = left.filter((c) => c !== def);
    const card = resolveCard(state, def, rng);
    if (card) cards.push(card);
  }
  return { offer: cards.length > 0 ? { season: state.season, week: state.week, kind, cards } : null, rng: rng.state() };
}

/** Fill the opening queue. Migration can supply the already-resolved v36 pick first. */
export function fillCardOffers(state: GameState): GameState {
  const cw = state.cardWeek!;
  const offers = [...cw.offers];
  let rng = cw.rng;
  while (offers.length < cw.starterLeft + cw.owed) {
    const kind = offers.length < cw.starterLeft ? 'starter' : 'match';
    const draw = drawOffer({ ...state, cardWeek: { ...cw, rng } }, kind);
    if (!draw.offer) break;
    offers.push(draw.offer);
    rng = draw.rng;
  }
  return { ...state, cardWeek: { ...cw, offers, rng } };
}

/**
 * Put card `cardId` first in the pick on show (pure), resolved the way a draw
 * resolves it, with a pick owed. The tests and the e2e hook use it to show a
 * chosen card; the other cards on show stay. Why not, when the card can't be
 * offered now.
 */
export function plantCard(state: GameState, cardId: string): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const def = cardDefById(cardId);
  if (!def) return 'No such card.';
  if (!eligibleBeforeDice(state, def)) return 'That card cannot be offered now.';
  const rng = makeRng(cw.rng);
  const card = resolveCard(state, def, rng);
  if (!card) return 'That card cannot be offered now.';
  const current = cw.offers[0];
  const rest = (current?.cards ?? []).filter((c) => c.cardId !== cardId);
  const offer: CardOffer = {
    ...(current ?? { season: state.season, week: state.week, kind: 'match' }),
    cards: [card, ...rest].slice(0, CARD_WEEK.OFFER_SIZE),
  };
  return { ...state, cardWeek: {
    ...cw, rng: rng.state(), owed: current ? cw.owed : 1,
    grants: cw.grants + (current ? 0 : 1), offers: [offer, ...cw.offers.slice(1)],
  } };
}

/** A new card-week career's three opening picks, drawn on its own stream. */
export function startCardWeek(state: GameState, cardWeek: CardWeekState): GameState {
  return fillCardOffers({ ...state, cardWeek });
}

// ── Taking a card ────────────────────────────────────────────────────────────

/** What taking a card did, for the store wrapper to commit. Money not yet booked goes through earnMoney. */
export type CardTake = Applied & { joined?: Player };

/** The card man joins (pure): any named replacement released first, then signed on for the rest of the season with no fee. */
function joinPlayer(state: GameState, card: Extract<OfferedCard, { kind: 'player' | 'dilemma' }>): { state: GameState; money: Applied['money']; joined: Player; released?: string } | string {
  let s = state;
  const money: Applied['money'] = [];
  let released: string | undefined;
  if (card.replacesId) {
    const problem = campDisposalProblem(s, card.replacesId);
    if (problem) return problem;
    if (!s.squad.some((p) => p.id === card.replacesId)) return `${card.replacesName ?? 'The man he replaces'} has already left the club.`;
    const out = releasedState(s, card.replacesId);
    if (!('state' in out)) return out.message ?? 'He could not be released.';
    s = out.state;
    released = out.released.name;
    if (out.terms.payout) money.push({ amount: -out.terms.payout, reason: `release:${card.replacesId}`, booked: true });
  }
  const clock = careerActionClock(s);
  if (s.squad.length >= SQUAD_CAP) return 'The squad is full. A player has to go first.';
  if (!capRoomFor(s.squad, s.capAccount, clock.season, card.salary)) return `Not enough salary-cap room for his ${fmtMoney(card.salary)}.`;
  const admitted = admitGeneratedPeople(s, [{ ...card.player, career: emptyTally(), joinedSeason: clock.season }]);
  if (!admitted) return 'The player register is full.';
  const fresh = admitted.players[0]!;
  const joined = openClubSpell(signForRestOfSeason(fresh, clock.season, clock.week, clock.duration), s.clubId, clock, 'signing', 0);
  const squad = [...s.squad, joined];
  const placed = placeSigning(s.lineup, squad, joined, awayPlayerIds(s));
  s = { ...s, squad, playerPopulation: admitted.playerPopulation, lineup: placed.lineup };
  return { state: s, money, joined, ...(released ? { released } : {}) };
}

function gambleRefusal(state: GameState, def: CardDef): string | null {
  return def.kind === 'dilemma' && state.boardPatience + def.patience < 1
    ? "The board can't take another gamble right now."
    : null;
}

function recordCard(cw: CardWeekState, when: Pick<GameState, 'season' | 'week'>, cardId: string, action: NonNullable<CardHistoryEntry['action']>): CardHistoryEntry[] {
  return [...cw.history, { cardId, season: when.season, week: when.week, action }];
}

function spendPick(cw: CardWeekState, history: CardHistoryEntry[]): CardWeekState {
  return {
    ...cw, history, offers: cw.offers.slice(1),
    starterLeft: Math.max(0, cw.starterLeft - 1),
    owed: cw.owed - (cw.starterLeft === 0 ? 1 : 0),
  };
}

/** Keep a resolved card for later. Only the pick and hand change. */
export function takeCard(state: GameState, index: number): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  if (!cw.offers[0]) return 'No pick is waiting.';
  const card = cw.offers[0].cards[index];
  if (!card) return 'There is no card there.';
  const def = cardDefById(card.cardId);
  if (!def || def.kind !== card.kind) return 'That card is no longer in the deck.';
  const refusal = gambleRefusal(state, def);
  if (refusal) return refusal;
  if (cw.hand.length >= CARD_WEEK.HAND_CAP) return 'Your hand is full. Play or discard a card first.';
  const held: HandCard = { cardId: card.cardId, offered: card, level: 1, gotSeason: state.season, gotWeek: state.week };
  return { ...state, cardWeek: {
    ...spendPick(cw, recordCard(cw, state, card.cardId, 'take')), hand: [...cw.hand, held],
  } };
}

/** Apply a held card using today's club, salary cap and board patience. Refusals spend nothing. */
export function playCard(state: GameState, index: number, targetId?: string): CardTake | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const held = cw.hand[index];
  if (!held) return 'There is no card there.';
  const card = held.offered;
  const def = cardDefById(card.cardId);
  if (!def || def.kind !== card.kind) return 'That card is no longer in the deck.';
  const refusal = gambleRefusal(state, def);
  if (refusal) return refusal;
  const ctx = { cardId: def.id, reason: `card: ${def.title}`, now: elapsedInterval(state), clubName: state.clubName };
  let s = state;
  const money: Applied['money'] = [];
  const news: Applied['news'] = [];
  let joined: Player | undefined;
  let traitGiven: CardWeekState['cardTraits'][number] | undefined;
  let active = cw.active;

  switch (card.kind) {
    case 'player': case 'dilemma': {
      const out = joinPlayer(s, card);
      if (typeof out === 'string') return out;
      s = out.state;
      joined = out.joined;
      money.push(...out.money);
      // The dilemma's price: board patience, the way an event card's boardPatience effect takes it.
      const board = card.kind === 'dilemma' && def.kind === 'dilemma' ? applyEffects(s, [{ kind: 'boardPatience', amount: def.patience }], ctx) : null;
      if (board) s = board.state;
      news.push({
        text: `${def.title}: ${joined.name} (${Math.round(overallRating(joined))}) joins, no signing fee.${out.released ? ` ${out.released} is released.` : ''}${board ? ' The board is less patient.' : ''}`,
        kind: 'success',
      });
      break;
    }
    case 'staff': {
      if (def.kind !== 'staff') return 'That card is no longer in the deck.';
      const out = appointFeeWaived(s, hireOf(def), card.name);
      if (typeof out === 'string') return out;
      s = out;
      active = [...active, { kind: 'staff', cardId: def.id, level: held.level, member: s.staff[s.staff.length - 1]! }];
      news.push({ text: `${def.title}: ${card.name} joins, appointment fee waived.`, kind: 'success' });
      break;
    }
    case 'setPlay': {
      if (ownsPlay(s, card.playId)) return 'That play is already yours.';
      const refusal = buyRefusal({ ...s, money: Number.MAX_SAFE_INTEGER }, card.playId);
      if (refusal) return refusal;
      s = { ...s, playbook: { owned: [...s.playbook.owned, card.playId] } };
      news.push({ text: `${PLAYS_BY_ID[card.playId].name} is in your playbook, free.`, kind: 'success' });
      break;
    }
    case 'trait': {
      if (def.kind !== 'trait') return 'That card is no longer in the deck.';
      if (!targetId) return 'Choose a player for the trait.';
      const target = traitTargets(s, def.trait).find((t) => t.player.id === targetId);
      if (!target) {
        const p = s.squad.find((x) => x.id === targetId);
        return !p ? 'That player is no longer at the club.'
          : traitLevel(p.traits, def.trait) >= 3 ? `${p.name} already has ${TRAITS[def.trait].name} III.` : `${p.name} is away.`;
      }
      const out = applyEffects(s, [{ kind: 'playerTrait', trait: def.trait }], { ...ctx, subjectId: target.player.id, subjectName: target.player.name });
      s = out.state;
      traitGiven = { playerId: target.player.id, trait: def.trait, level: target.level };
      news.push({ text: `${target.player.name} has ${TRAITS[def.trait].name} ${ROMAN[target.level]}.`, kind: 'success' });
      break;
    }
    case 'cash': {
      if (def.kind !== 'cash') return 'That card is no longer in the deck.';
      const out = applyEffects(s, [{ kind: 'money', amount: def.amount }], ctx);
      s = out.state;
      money.push(...out.money);
      news.push({ text: `${def.title}: +${fmtMoney(def.amount)}.`, kind: 'success' });
      break;
    }
  }

  const next: CardWeekState = {
    ...cw, active, hand: cw.hand.filter((_, i) => i !== index),
    history: recordCard(cw, state, def.id, 'play'),
    cardPlayers: joined ? [...cw.cardPlayers, joined.id] : cw.cardPlayers,
    cardTraits: traitGiven
      ? [...cw.cardTraits.filter((t) => t.playerId !== traitGiven.playerId || t.trait !== traitGiven.trait), traitGiven]
      : cw.cardTraits,
  };
  return { state: { ...s, cardWeek: next }, money, news, ...(joined ? { joined } : {}) };
}

/** Take and play as one operation, so a refused play leaves the pick waiting. */
export function playPickCard(state: GameState, index: number, targetId?: string): CardTake | string {
  const taken = takeCard(state, index);
  return typeof taken === 'string' ? taken : playCard(taken, taken.cardWeek!.hand.length - 1, targetId);
}

export function discardCard(state: GameState, index: number): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const held = cw.hand[index];
  if (!held) return 'There is no card there.';
  return { ...state, cardWeek: {
    ...cw, hand: cw.hand.filter((_, i) => i !== index), history: recordCard(cw, state, held.cardId, 'discard'),
  } };
}

/** Pass even if none of the three cards can currently be played. */
export function passCard(state: GameState): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  if (!cw.offers[0]) return 'No pick is waiting.';
  return { ...state, cardWeek: spendPick(cw, recordCard(cw, state, CARD_PASS, 'pass')) };
}

// ── The week ─────────────────────────────────────────────────────────────────

/** Did the club play a League match (a regular round or a final) this week? Cup, trial and camp fixtures don't count. */
export function playedLeagueMatch(state: GameState): boolean {
  const club = state.clubId;
  return (state.competitions?.instances ?? []).some((instance) => instance.season === state.season
    && instance.definition.format.kind === 'league'
    && instance.fixtures.some((f) => f.slot === state.week && f.status === 'completed' && !!f.result
      && (f.homeId === club || f.awayId === club)));
}

/** Draw a fresh match pick on the card stream and replace the oldest match pick at the cap. */
export function cardWeekTick(state: GameState): GameState {
  const cw = state.cardWeek;
  if (!cw || !playedLeagueMatch(state)) return state;
  let { offer, rng } = drawOffer(state);
  if (!offer) return state;
  // If the same three card ids came up, try a different mix. Keep the full draw
  // when fewer cards are eligible and excluding one would shrink the pick.
  const sameCards = (a: CardOffer, b: CardOffer): boolean => a.cards.length === b.cards.length
    && a.cards.every((card) => b.cards.some((other) => other.cardId === card.cardId));
  const repeated = cw.offers.find((waiting) => sameCards(waiting, offer!));
  if (repeated) {
    for (const card of repeated.cards) {
      const fresh = drawOffer({ ...state, cardWeek: { ...cw, rng } }, 'match', card.cardId);
      rng = fresh.rng;
      if (fresh.offer && fresh.offer.cards.length === offer.cards.length
        && !cw.offers.some((waiting) => sameCards(waiting, fresh.offer!))) {
        offer = fresh.offer;
        break;
      }
    }
  }
  const full = cw.owed === CARD_WEEK.MAX_OWED;
  const waiting = full ? cw.offers.filter((_, i) => i !== cw.starterLeft) : cw.offers;
  return { ...state, cardWeek: {
    ...cw, rng, owed: full ? cw.owed : cw.owed + 1, grants: cw.grants + 1,
    offers: [...waiting, offer],
    history: full ? recordCard(cw, state, 'expired', 'expire') : cw.history,
  } };
}

/**
 * The last match's impact (#846): a line per player who played (and any bench
 * man who got on the sheet), with his tries, tackles and line breaks. The
 * events name players, so names are matched to ids through the squad.
 */
export function lastMatchImpact(
  squad: readonly Player[], events: readonly MatchEvent[], playedIds: readonly string[], participantIds: ReadonlySet<string>,
  when: { season: number; week: number; opponentName: string },
): LastMatchImpact {
  const byName = foldEvents(events, PLAYER_ID);
  const played = new Set(playedIds);
  const rows = squad.flatMap((p) => {
    if (!participantIds.has(p.id) && !played.has(p.id)) return [];
    const t = byName.get(p.name) ?? emptyTally();
    if (!played.has(p.id) && t.tries + t.tackles + t.lineBreaks === 0) return [];
    return [{ playerId: p.id, name: p.name, tries: t.tries, tackles: t.tackles, lineBreaks: t.lineBreaks }];
  });
  return { ...when, rows };
}

/** Record the player's match on a card-week career (pure); any other career comes back as it was. */
export function withLastMatch(
  state: GameState, fixture: Pick<Fixture, 'homeId' | 'awayId'>, events: readonly MatchEvent[],
  playedIds: readonly string[], participantIds: ReadonlySet<string>, when: { season: number; week: number },
): GameState {
  if (!state.cardWeek) return state;
  const rivalId = fixture.homeId === PLAYER_ID ? fixture.awayId : fixture.homeId;
  const opponentName = state.league.clubs.find((c) => c.id === rivalId)?.name ?? '';
  const lastMatch = lastMatchImpact(state.squad, events, playedIds, participantIds, { ...when, opponentName });
  return { ...state, cardWeek: { ...state.cardWeek, lastMatch } };
}

// ── The pick, for the UI ─────────────────────────────────────────────────────

/** One card on show, as the pick screen draws it. */
export interface CardFaceView {
  index: number;
  cardId: string;
  kind: CardKind;
  title: string;
  tier: CardTier;
  /** What it does, in a line. */
  effect: string;
  /** A player card's man (and the dilemma's). */
  player?: { name: string; position: Position; rating: number; salary: number; replacesName?: string; releaseCost?: number };
  /** A trait card's squad members who could take it, with the level each would reach. */
  targets?: { playerId: string; name: string; level: TraitLevel }[];
  detail?: string;
  hint: string;
  /** Why it can't be played now, or null. */
  refusal: string | null;
}

/** The effect line on the face; the specific hire, recruit or play is also named. */
function effectLine(def: CardDef, card: OfferedCard): string {
  switch (card.kind) {
    case 'player': return 'No signing fee.';
    case 'dilemma': return 'Board patience −1.';
    case 'staff': return 'No hiring fee.';
    case 'setPlay': return 'Free set play.';
    case 'trait': return '+1 trait level.';
    case 'cash': return def.kind === 'cash' ? `Bank +${fmtMoney(def.amount)}.` : def.title;
  }
}

const GOOD_IF: Record<CardKind, string> = {
  player: 'you need a better starter.',
  dilemma: 'you can spare board patience.',
  staff: 'you have a vacant role.',
  setPlay: 'your playbook needs options.',
  trait: 'a player needs a boost.',
  cash: 'you need money now.',
};

function cardFaceView(state: GameState, card: OfferedCard, index: number): CardFaceView[] {
  const def = cardDefById(card.cardId);
  if (!def) return [];
  const view: CardFaceView = {
    index, cardId: def.id, kind: def.kind, title: def.title, tier: def.tier, effect: effectLine(def, card),
    hint: `Good if ${GOOD_IF[def.kind]}`, refusal: null,
  };
  if (card.kind === 'staff') view.detail = card.name;
  if (card.kind === 'setPlay') view.detail = PLAYS_BY_ID[card.playId].name;
  if (card.kind === 'player' || card.kind === 'dilemma') {
    const clock = careerActionClock(state);
    const out = card.replacesId ? state.squad.find((p) => p.id === card.replacesId) : undefined;
    view.player = {
      name: card.player.name, position: card.player.position, rating: Math.round(overallRating(card.player)), salary: card.salary,
      ...(card.replacesName ? { replacesName: card.replacesName } : {}),
      ...(out ? { releaseCost: releaseTerms(out, clock.season, clock.week, clock.duration).payout } : {}),
    };
  }
  if (def.kind === 'trait') {
    view.targets = traitTargets(state, def.trait).map((t) => ({ playerId: t.player.id, name: t.player.name, level: t.level }));
  }
  return [view];
}

export function cardOfferView(state: GameState): { owed: number; starterLeft: number; cards: (CardFaceView & { takeRefusal: string | null })[] } {
  const cw = state.cardWeek;
  if (!cw?.offers[0]) return { owed: 0, starterLeft: 0, cards: [] };
  const blocked = pickBlocked(state);
  const cards = cw.offers[0].cards.flatMap((card, index) => cardFaceView(state, card, index).map((view) => {
    const taken = blocked ?? takeCard(state, index);
    const takeRefusal = typeof taken === 'string' ? taken : null;
    const probe = typeof taken === 'string' ? taken : playCard(taken, cw.hand.length, view.targets?.[0]?.playerId);
    return { ...view, takeRefusal, refusal: playRefusal(view, probe) };
  }));
  return { owed: cw.offers.length, starterLeft: cw.starterLeft, cards };
}

function playRefusal(view: CardFaceView, probe: CardTake | string): string | null {
  if (typeof probe !== 'string') return null;
  return view.targets?.length === 0 && probe === 'Choose a player for the trait.'
    ? 'No eligible players are available.'
    : probe;
}

export function cardHandView(state: GameState): (CardFaceView & { level: TraitLevel })[] {
  const blocked = pickBlocked(state);
  return (state.cardWeek?.hand ?? []).flatMap((held, index) => cardFaceView(state, held.offered, index).map((view) => ({
    ...view, level: held.level, refusal: playRefusal(view, blocked ?? playCard(state, index, view.targets?.[0]?.playerId)),
  })));
}

/** Staff have no person id; match the saved hire to the member still at the club. */
function sameHire(a: StaffMember, b: StaffMember): boolean {
  return a.role === b.role && a.speciality === b.speciality && a.name === b.name && a.hiredSeason === b.hiredSeason;
}

export function activeCardStaff(state: GameState): StaffMember[] {
  return state.staff.filter((member) => state.cardWeek?.active.some((card) => card.kind === 'staff' && sameHire(card.member, member)));
}

// ── Store glue ───────────────────────────────────────────────────────────────

/** Write a take to the store: state first, then money (ledger) and news, the way the events deck commits. */
function commit(t: CardTake): void {
  const s = t.state;
  setState({
    squad: s.squad, freeAgents: s.freeAgents, playerPopulation: s.playerPopulation, lineup: s.lineup, capAccount: s.capAccount,
    money: s.money, finance: s.finance, staff: s.staff, playbook: s.playbook, boardPatience: s.boardPatience, cardWeek: s.cardWeek!,
  });
  for (const m of t.money) {
    if (m.booked) bus.emit('money:changed', { delta: m.amount, reason: m.reason, balance: getState().money, booked: true, stamp: { season: s.season, week: s.week } });
    else earnMoney(m.amount, m.reason);
  }
  for (const n of t.news) bus.emit('ui:notify', n);
}

type CardActionResult = { ok: true; outcome: string } | { ok: false; reason: string };

export function chooseCard(index: number): CardActionResult {
  const s = getState();
  const out = pickBlocked(s) ?? takeCard(s, index);
  if (typeof out === 'string') return { ok: false, reason: out };
  setState({ cardWeek: out.cardWeek! });
  saveIfChanged(getState());
  return { ok: true, outcome: `${cardDefById(out.cardWeek!.hand[out.cardWeek!.hand.length - 1]!.cardId)!.title} added to your hand.` };
}

export function playChosenCard(source: 'pick' | 'hand', index: number, targetId?: string): CardActionResult {
  const s = getState();
  const out = pickBlocked(s) ?? (source === 'pick' ? playPickCard(s, index, targetId) : playCard(s, index, targetId));
  if (typeof out === 'string') return { ok: false, reason: out };
  commit(out);
  saveIfChanged(getState());
  return { ok: true, outcome: out.news.map((n) => n.text).join(' ') };
}

export function discardHeldCard(index: number): CardActionResult {
  const s = getState();
  const out = pickBlocked(s) ?? discardCard(s, index);
  if (typeof out === 'string') return { ok: false, reason: out };
  setState({ cardWeek: out.cardWeek! });
  saveIfChanged(getState());
  return { ok: true, outcome: 'Card discarded.' };
}

/** The player passed the pick on show. Refused only where a take would be (a held week, the league choice). */
export function passPick(): { ok: true } | { ok: false; reason: string } {
  const s = getState();
  const blocked = pickBlocked(s);
  if (blocked) return { ok: false, reason: blocked };
  const out = passCard(s);
  if (typeof out === 'string') return { ok: false, reason: out };
  setState({ cardWeek: out.cardWeek! });
  saveIfChanged(getState());
  return { ok: true };
}

/** Why no pick can be made in the store's state now, or null. */
export function pickBlocked(s: GameState): string | null {
  if (!s.cardWeek) return 'This career has no card week.';
  if (s.sacked) return 'The board has sacked the coach.';
  if (awaitingCampReplay(s) || weekHeld()) return 'Finish the current week first.';
  const held = rosterIntervalProblem(s);
  if (held) return held;
  if (deckWaitsForLeagueChoice(s)) return "Picks wait until next season's league is confirmed.";
  return null;
}

/** Install the card-week tick: after the week's results, before the autosave. Careers without a card week are untouched. */
export function registerCardWeekSystem(): void {
  // After results, ladder and morale, before the unlocks and autosave.
  registerTickHook('card-week', TICK_ORDER.autosave - 2, () => {
    const s = getState();
    if (!s.cardWeek || s.sacked || deckWaitsForLeagueChoice(s)) return;
    const next = cardWeekTick(s);
    if (next === s) return;
    setState({ cardWeek: next.cardWeek! });
    if (s.cardWeek.owed === CARD_WEEK.MAX_OWED) {
      bus.emit('ui:notify', { text: `A card pick expired. Up to ${CARD_WEEK.MAX_OWED} can wait.`, kind: 'info' });
    }
  });
}
