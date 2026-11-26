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
// Cash and board patience use the existing event effects. Card payments and
// rerolls book to the Events line.
import { getState, setState, type ActiveCard, type CardHistoryEntry, type CardOffer, type CardWeekState, type StaffMember, type Fixture, type GameState, type LastMatchImpact, type OfferedCard, type Player, type Position, type RivalClub } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, TICK_ORDER, weekHeld } from '../core/time';
import { saveIfChanged } from '../core/save';
import { careerActionClock, elapsedInterval } from '../core/season';
import { CARD_PASS, CARD_WEEK, CARDS, SIGNATURE_TRAIT, cardDefById, type CardDef, type CardKind, type CardTier } from '../data/cards';
import { generatePlayerAround, overallRating, POSITIONS, shownStats } from '../data/player';
import { PLAYS_BY_ID, PLAY_IDS, isBasePlayId, type PlayId } from '../data/plays';
import { ROMAN, TRAITS, traitLevel, withTrait, type TraitLevel } from '../data/traits';
import { randomName } from '../data/names';
import { SQUAD_CAP, STAT_MAX } from '../config';
import { makeRng, type Rng } from '../utils/rng';
import { rivalStyle } from './rivalRound';
import { rivalPlayer, RIVAL_POSITION_MIN, withDerivedStrength } from './rivals';
import { stylePlays } from '../match/league/plays';
import { fmtMoney } from '../utils/money';
import { applyEffects, deckWaitsForLeagueChoice, type Applied } from './events';
import { capRoomFor, commitment, publishedCap, reconcileProtection, releaseTerms, salaryDemand, signForRestOfSeason } from './cap';
import { releasedState } from './freeagency';
import { effectiveRating, FIT, placeSigning, positionFit } from './lineup';
import { awayPlayerIds, campDisposalProblem } from './playerAssignments';
import { rosterIntervalProblem } from './playerAssignmentCommit';
import { admitGeneratedPeople, bookPlayerMovement, closeClubSpell, openClubSpell } from './playerCareer';
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

/** A recruit or hire stops being active when they leave. Cash records its last payout. */
export function activeCard(state: GameState, cardId: string): ActiveCard | undefined {
  return state.cardWeek?.active.find(card => {
    if (card.cardId !== cardId) return false;
    switch (card.kind) {
      case 'player': case 'dilemma': case 'trait': return state.squad.some(p => p.id === card.playerId);
      case 'staff': return state.staff.some(member => sameHire(card.member, member));
      case 'setPlay': return ownsPlay(state, card.playId);
      case 'cash': return true;
      default: return false;
    }
  });
}

function nextCardLevel(state: GameState, cardId: string): TraitLevel | null {
  const held = state.cardWeek?.hand.find(h => h.cardId === cardId);
  const active = activeCard(state, cardId);
  const def = cardDefById(cardId);
  const player = active?.kind === 'trait' ? state.squad.find(p => p.id === active.playerId) : undefined;
  const trait = player && def?.kind === 'trait' ? traitLevel(player.traits, def.trait) : 0;
  const level = Math.max(held?.level ?? 0, active?.level ?? 0, trait);
  return level === 3 ? null : (level + 1) as TraitLevel;
}

/** Can `def` go in a pick now, before any dice? A player card may still sit out once it is rolled (resolveCard). */
function eligibleBeforeDice(state: GameState, def: CardDef): boolean {
  if (!nextCardLevel(state, def.id)) return false;
  if (gambleRefusal(state, def)) return false;
  const held = state.cardWeek?.hand.some(h => h.cardId === def.id);
  const active = activeCard(state, def.id);
  if (held || active) {
    return active?.kind !== 'trait' || !awayPlayerIds(state).has(active.playerId);
  }
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

function existingCardFace(state: GameState, def: CardDef): OfferedCard | undefined {
  const held = state.cardWeek?.hand.find(h => h.cardId === def.id);
  if (held) return held.offered;
  const active = activeCard(state, def.id);
  switch (active?.kind) {
    case 'player': case 'dilemma': {
      const player = state.squad.find(p => p.id === active.playerId)!;
      return { cardId: def.id, kind: active.kind, player, salary: player.deal?.salary ?? salaryDemand(player) };
    }
    case 'staff': return { cardId: def.id, kind: 'staff', name: active.member.name };
    case 'setPlay': return { cardId: def.id, kind: 'setPlay', playId: active.playId };
  }
  return undefined;
}

/** Settle what a drawn card brings (pure, rolls `rng`), or null when it can't be offered after all. */
function resolveCard(state: GameState, def: CardDef, rng: Rng): OfferedCard | null {
  const existing = existingCardFace(state, def);
  if (existing) return existing;
  switch (def.kind) {
    case 'player': case 'dilemma': return resolvePlayer(state, def, rng);
    case 'staff': return { cardId: def.id, kind: 'staff', name: randomName(rng, state.pack === 'uk' ? UK_NAMES : AU_PACK.names) };
    case 'setPlay': return { cardId: def.id, kind: 'setPlay', playId: rng.pick(freePlayCandidates(state)) };
    case 'trait': case 'cash': return { cardId: def.id, kind: def.kind };
  }
}

type RecruitCard = Extract<OfferedCard, { kind: 'player' | 'dilemma' }>;

function rivalHasDepth(squad: readonly Player[]): boolean {
  return POSITIONS.every(position => squad.filter(p => p.position === position).length >= RIVAL_POSITION_MIN);
}

function stealPlayerCard(state: GameState, rival: RivalClub, player: Player): RecruitCard | null {
  if (!rival.squad || !rival.capAccount || player.emergencyDealEndSeason !== undefined
    || overallRating(player) <= cardFloor(state.squad, player.position)) return null;
  const samePosition = rival.squad.filter(p => p.position === player.position && p.id !== player.id);
  // The replacement is fit and plays the same position.
  if (samePosition.filter(p => p.injuredWeeks === 0 && !p.suspendedWeeks).length + 1 < RIVAL_POSITION_MIN) return null;
  const season = careerActionClock(state).season;
  const remaining = rival.squad.filter(p => p.id !== player.id);
  if (!capRoomFor(remaining, rival.capAccount, season, 1)) return null;
  const salary = salaryDemand(player);
  const replaces = replacementFor(state, player.position, salary);
  if (replaces === null) return null;
  const cardId = `steal-player:${player.position}:${player.id}`;
  return {
    kind: 'player', cardId, player, salary, fromClubId: rival.id,
    ...(replaces ? { replacesId: replaces.id, replacesName: replaces.name } : {}),
  };
}

function drawSteal(state: GameState, clubId: string, rng: Rng): OfferedCard | undefined {
  const club = state.league.clubs.find(c => c.id === clubId && c.id !== state.clubId);
  if (!club) return undefined;
  const squad = club.squad ?? [];
  const recruits = rivalHasDepth(squad) ? squad.flatMap(player => {
    const card = stealPlayerCard(state, club, player);
    return card && nextCardLevel(state, card.cardId) ? [card] : [];
  }) : [];
  if (recruits.length) return rng.pick(recruits);
  const plays = stylePlays(rivalStyle(club).attack).filter(playId => {
    const id = `steal-play:${playId}`;
    return nextCardLevel(state, id) && (!ownsPlay(state, playId) || activeCard(state, id));
  });
  if (!plays.length) return undefined;
  const playId = rng.pick(plays);
  return { kind: 'setPlay', cardId: `steal-play:${playId}`, playId, fromClubId: clubId };
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
export function drawOffer(
  state: GameState, kind: CardOffer['kind'] = 'match', waiting: readonly CardOffer[] = [],
  fromClubId?: string, previousSteal?: OfferedCard,
): { offer: CardOffer | null; rng: number } {
  const cw = state.cardWeek;
  if (!cw) return { offer: null, rng: 0 };
  const rng = makeRng(cw.rng);
  let left = CARDS.filter((c) => eligibleBeforeDice(state, c));
  const signature = (cards: readonly OfferedCard[]): string => cards.map(c => c.cardId).sort().join(',');
  const repeats = new Set(waiting.map(o => signature(o.cards)));
  const stolen = fromClubId ? drawSteal(state, fromClubId, rng) ?? previousSteal : undefined;
  const size = CARD_WEEK.OFFER_SIZE - Number(!!stolen);
  const signatureWithSteal = (cards: readonly OfferedCard[]) => signature(stolen ? [...cards, stolen] : cards);
  const cards: OfferedCard[] = [];
  const drawNext = (): void => {
    const def = pickWeighted(left, rng)!;
    left = left.filter((c) => c !== def);
    const card = resolveCard(state, def, rng);
    if (card) cards.push(card);
  };
  while (cards.length < size && left.length > 0) drawNext();

  let chosen = cards.slice();
  // Keep the normal weighted draw unless it repeats a waiting pick. In that
  // case consider the remaining eligible cards in weighted order as well.
  if (chosen.length > 0 && repeats.has(signatureWithSteal(chosen))) {
    while (left.length > 0) drawNext();
    const findFresh = (prefix: OfferedCard[], start: number): OfferedCard[] | undefined => {
      if (prefix.length === chosen.length) return repeats.has(signatureWithSteal(prefix)) ? undefined : prefix;
      for (let i = start; i <= cards.length - (chosen.length - prefix.length); i++) {
        const found = findFresh([...prefix, cards[i]!], i + 1);
        if (found) return found;
      }
      return undefined;
    };
    chosen = findFresh([], 0) ?? chosen;
  }
  if (stolen) chosen.push(stolen);
  return { offer: chosen.length ? {
    season: state.season, week: state.week, kind, cards: chosen, ...(fromClubId ? { fromClubId } : {}),
  } : null, rng: rng.state() };
}

/** Give old v37 queues stable IDs. Their watermark could have been set by a different offer. */
export function identifyCardOffers(cw: CardWeekState): CardWeekState {
  if (cw.offers.every(o => o.grant !== undefined)) return cw;
  return { ...cw, offers: cw.offers.map((o, i) => ({
    ...o, grant: cw.grants - cw.offers.length + i + 1,
  })) };
}

/** The newest waiting match offer, or the first starter pick if there are no match picks. */
export function preferredCardOffer(state: GameState): CardOffer | undefined {
  const cw = state.cardWeek;
  return cw && (cw.owed ? cw.offers[cw.offers.length - 1] : cw.offers[0]);
}

export function unshownCardOffer(state: GameState): CardOffer | undefined {
  const cw = state.cardWeek;
  if (!cw) return undefined;
  for (let i = cw.offers.length - 1; i >= cw.starterLeft; i--) {
    const offer = cw.offers[i]!;
    if (!offer.seen) return offer;
  }
  return cw.seenGrant === 0 ? cw.offers[0] : undefined;
}

function offerIndex(cw: CardWeekState, grant?: number): number {
  return grant === undefined ? 0 : cw.offers.findIndex(o => o.grant === grant);
}

/** Fill the opening queue. Migration can supply the already-resolved v36 pick first. */
export function fillCardOffers(state: GameState): GameState {
  const cw = state.cardWeek!;
  const offers = [...cw.offers];
  let rng = cw.rng;
  while (offers.length < cw.starterLeft + cw.owed) {
    const kind = offers.length < cw.starterLeft ? 'starter' : 'match';
    const draw = drawOffer({ ...state, cardWeek: { ...cw, rng } }, kind, offers);
    if (!draw.offer) break;
    offers.push(draw.offer);
    rng = draw.rng;
  }
  return { ...state, cardWeek: identifyCardOffers({ ...cw, offers, rng }) };
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
  const def = CARDS.find(c => c.id === cardId);
  if (!def) return 'No such card.';
  if (!eligibleBeforeDice(state, def)) return 'That card cannot be offered now.';
  const rng = makeRng(cw.rng);
  const card = resolveCard(state, def, rng);
  if (!card) return 'That card cannot be offered now.';
  const current = cw.offers[0];
  const rest = (current?.cards ?? []).filter((c) => c.cardId !== cardId);
  const offer: CardOffer = {
    ...(current ?? { season: state.season, week: state.week, kind: 'match', grant: cw.grants + 1 }),
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

/** Move the actual person, adding a fit same-position replacement at his former club. */
function moveStolenPlayer(state: GameState, card: RecruitCard): { state: GameState; player: Player } | string {
  const club = state.league.clubs.find(c => c.id === card.fromClubId);
  const player = club?.squad?.find(p => p.id === card.player.id);
  if (!player || !club?.squad || !club.capAccount) return 'That player is no longer at the beaten club.';
  if (!rivalHasDepth(club.squad)) return 'The beaten club is too short to release him.';
  const clock = careerActionClock(state);
  const depth = club.squad.filter(p => p.position === player.position && p.id !== player.id
    && p.injuredWeeks === 0 && !p.suspendedWeeks).length;
  if (depth + 1 < RIVAL_POSITION_MIN) return 'The beaten club is too short at his position.';
  const remaining = club.squad.filter(p => p.id !== player.id);
  const capAccount = reconcileProtection(remaining, club.capAccount, clock.season);
  const room = publishedCap(capAccount) - commitment(remaining, clock.season);
  if (room < 1) return 'The beaten club has no cap room for his replacement.';

  const cw = state.cardWeek!;
  const rng = makeRng(cw.rng);
  const generated = rivalPlayer(rng, club.id, player.position, Math.round(overallRating(player)));
  const admitted = admitGeneratedPeople(state, [generated], club.id, 'signing');
  if (!admitted) return 'The player register is full.';
  const replacement = signForRestOfSeason(admitted.players[0]!, clock.season, clock.week, clock.duration);
  const squad = [...remaining, { ...replacement, deal: { ...replacement.deal!, salary: Math.min(replacement.deal!.salary, room) } }];
  const updated = withDerivedStrength({ ...club, squad, capAccount });
  return { player: closeClubSpell(player, clock, 'transfer'), state: {
    ...state, playerPopulation: admitted.playerPopulation, cardWeek: { ...cw, rng: rng.state() },
    league: { ...state.league, clubs: state.league.clubs.map(c => c === club ? updated : c) },
  } };
}

function withDilemmaMargin(player: Player, levels: number): Player {
  if (!levels) return player;
  const stats = { ...player.stats };
  const ceilings = { ...player.ceilings };
  for (const stat of shownStats(player.position)) {
    stats[stat] = Math.min(STAT_MAX, stats[stat] + levels * CARD_WEEK.DILEMMA_MARGIN_STEP);
    ceilings[stat] = Math.max(ceilings[stat] ?? 0, stats[stat]);
  }
  return { ...player, stats, ceilings };
}

function withSignature(player: Player, level: TraitLevel): Player {
  return { ...player, traits: withTrait(player.traits, SIGNATURE_TRAIT[player.position], level) };
}

/** The card man joins (pure): any named replacement released first, then signed on for the rest of the season with no fee. */
function joinPlayer(state: GameState, card: RecruitCard, level: TraitLevel): { state: GameState; money: Applied['money']; joined: Player; released?: string } | string {
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
  let fresh: Player;
  if (card.fromClubId) {
    const out = moveStolenPlayer(s, card);
    if (typeof out === 'string') return out;
    if (overallRating(out.player) <= cardFloor(state.squad, out.player.position)) {
      return 'He no longer improves the squad at his position.';
    }
    s = out.state;
    fresh = out.player;
  } else {
    const admitted = admitGeneratedPeople(s, [{ ...card.player, career: emptyTally() }]);
    if (!admitted) return 'The player register is full.';
    s = { ...s, playerPopulation: admitted.playerPopulation };
    fresh = admitted.players[0]!;
  }
  // The offer's quoted salary still applies if a player develops while the pick waits.
  const improved = card.kind === 'dilemma' ? withDilemmaMargin(fresh, level - 1) : withSignature(fresh, level);
  const signed = signForRestOfSeason({ ...improved, joinedSeason: clock.season }, clock.season, clock.week, clock.duration);
  const joined = openClubSpell({ ...signed, deal: { ...signed.deal!, salary: card.salary } }, s.clubId, clock,
    card.fromClubId ? 'transfer' : 'signing', 0);
  const squad = [...s.squad, joined];
  const placed = placeSigning(s.lineup, squad, joined, awayPlayerIds(s));
  s = { ...s, squad, lineup: placed.lineup };
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

function spendPick(cw: CardWeekState, at: number, history: CardHistoryEntry[]): CardWeekState {
  const starter = cw.offers[at]!.kind === 'starter';
  return {
    ...cw, history, offers: cw.offers.filter((_, index) => index !== at),
    starterLeft: cw.starterLeft - Number(starter),
    owed: cw.owed - Number(!starter),
  };
}

function pickedCard(cw: CardWeekState, index: number, grant?: number): { at: number; card: OfferedCard } | string {
  const at = offerIndex(cw, grant);
  const offer = cw.offers[at];
  if (!offer) return grant === undefined ? 'No pick is waiting.' : 'That pick is no longer waiting.';
  const card = offer.cards[index];
  return card ? { at, card } : 'There is no card there.';
}

/** Take a pick into the hand, or apply its upgrade to a card already in play. */
function takeCardResult(state: GameState, index: number, grant?: number): CardTake | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const picked = pickedCard(cw, index, grant);
  if (typeof picked === 'string') return picked;
  const { at, card } = picked;
  const def = cardDefById(card.cardId);
  if (!def || def.kind !== card.kind) return 'That card is no longer in the deck.';
  const refusal = gambleRefusal(state, def);
  if (refusal) return refusal;
  const level = nextCardLevel(state, card.cardId);
  if (!level) return 'That card is already Level III.';
  const held = cw.hand.find(h => h.cardId === card.cardId);
  const existing = activeCard(state, card.cardId);
  const spent = spendPick(cw, at, recordCard(cw, state, card.cardId, 'take'));
  if (!held && existing && existing.kind !== 'cash') return applyCard({ ...state, cardWeek: spent }, card, level);
  if (!held && cw.hand.length >= CARD_WEEK.HAND_CAP) return 'Your hand is full. Play or discard a card first.';
  const hand = held ? cw.hand.map(h => h === held ? { ...h, level } : h)
    : [...cw.hand, { cardId: card.cardId, offered: card, level, gotSeason: state.season, gotWeek: state.week }];
  return {
    state: { ...state, cardWeek: { ...spent, hand } }, money: [],
    news: [{ kind: 'success', text: held ? `${def.title} upgraded to Level ${ROMAN[level]} in your hand.` : `${def.title} added to your hand.` }],
  };
}

export function takeCard(state: GameState, index: number, grant?: number): GameState | string {
  const result = takeCardResult(state, index, grant);
  return typeof result === 'string' ? result : result.state;
}

/** Apply a held card using today's club, salary cap and board patience. Refusals spend nothing. */
export function playCard(state: GameState, index: number, targetId?: string): CardTake | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const held = cw.hand[index];
  if (!held) return 'There is no card there.';
  const existing = activeCard(state, held.cardId);
  if (existing?.level === 3) return 'That card is already Level III.';
  const level = Math.max(held.level, (existing?.level ?? 0) + 1) as TraitLevel;
  const withoutHeld = { ...cw, hand: cw.hand.filter((_, i) => i !== index) };
  return applyCard({ ...state, cardWeek: withoutHeld }, held.offered, level, targetId);
}

function applyCard(state: GameState, card: OfferedCard, level: TraitLevel, targetId?: string): CardTake | string {
  const cw = state.cardWeek!;
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
  const previous = activeCard(state, def.id);
  let active: ActiveCard;

  switch (card.kind) {
    case 'player': case 'dilemma': {
      const upgraded = previous?.kind === 'player' || previous?.kind === 'dilemma'
        ? s.squad.find(p => p.id === previous.playerId) : undefined;
      let released: string | undefined;
      if (upgraded) {
        const player = card.kind === 'dilemma'
          ? withDilemmaMargin(upgraded, level - previous!.level) : withSignature(upgraded, level);
        s = { ...s, squad: s.squad.map(p => p === upgraded ? player : p) };
        active = { kind: card.kind, cardId: def.id, level, playerId: player.id };
      } else {
        const out = joinPlayer(s, card, level);
        if (typeof out === 'string') return out;
        s = out.state;
        joined = out.joined;
        released = out.released;
        money.push(...out.money);
        active = { kind: card.kind, cardId: def.id, level, playerId: joined.id };
      }
      const board = def.kind === 'dilemma' ? applyEffects(s, [{ kind: 'boardPatience', amount: def.patience }], ctx) : null;
      if (board) s = board.state;
      const update = joined
        ? `${joined.name} (${Math.round(overallRating(joined))}) joins, no signing fee.`
        : `${upgraded!.name} reaches Level ${ROMAN[level]}.`;
      news.push({
        text: `${def.title}: ${update}${released ? ` ${released} is released.` : ''}${board ? ' The board is less patient.' : ''}`,
        kind: 'success',
      });
      break;
    }
    case 'staff': {
      if (def.kind !== 'staff') return 'That card is no longer in the deck.';
      const base = previous?.kind === 'staff' ? previous.member : undefined;
      if (!base) {
        const out = appointFeeWaived(s, hireOf(def), card.name);
        if (typeof out === 'string') return out;
        s = out;
      }
      const member = base ?? s.staff[s.staff.length - 1]!;
      const wage = Math.round(member.wage * CARD_WEEK.STAFF_WAGE_FACTOR[level]);
      s = { ...s, staff: s.staff.map(m => sameHire(m, member) ? { ...m, wage } : m) };
      active = { kind: 'staff', cardId: def.id, level, member };
      news.push({ text: base ? `${member.name} reaches Level ${ROMAN[level]} at ${fmtMoney(wage)}/week.`
        : `${def.title}: ${member.name} joins, appointment fee waived.`, kind: 'success' });
      break;
    }
    case 'setPlay': {
      const playId = previous?.kind === 'setPlay' ? previous.playId : card.playId;
      if (!previous) {
        if (ownsPlay(s, playId)) return 'That play is already yours.';
        if (!card.fromClubId) {
          const problem = buyRefusal({ ...s, money: Number.MAX_SAFE_INTEGER }, playId);
          if (problem) return problem;
        }
        s = { ...s, playbook: { owned: [...s.playbook.owned, playId] } };
      }
      active = { kind: 'setPlay', cardId: def.id, level, playId };
      news.push({ text: previous ? `${PLAYS_BY_ID[playId].name} reaches Level ${ROMAN[level]}.`
        : `${PLAYS_BY_ID[playId].name} is in your playbook, free.`, kind: 'success' });
      break;
    }
    case 'trait': {
      if (def.kind !== 'trait') return 'That card is no longer in the deck.';
      const recipient = previous?.kind === 'trait' ? previous.playerId : targetId;
      if (!recipient) return 'Choose a player for the trait.';
      const player = s.squad.find(p => p.id === recipient);
      if (!player) return 'That player is no longer at the club.';
      const before = traitLevel(player.traits, def.trait);
      if (before === 3) return `${player.name} already has ${TRAITS[def.trait].name} III.`;
      if (awayPlayerIds(s).has(recipient)) return `${player.name} is away.`;
      const applied = previous ? level : Math.min(3, before + level) as TraitLevel;
      s = { ...s, squad: s.squad.map(p => p === player ? { ...p, traits: withTrait(p.traits, def.trait, applied) } : p) };
      traitGiven = { playerId: recipient, trait: def.trait, level: applied };
      active = { kind: 'trait', cardId: def.id, level: applied, playerId: recipient };
      news.push({ text: `${player.name} has ${TRAITS[def.trait].name} ${ROMAN[applied]}.`, kind: 'success' });
      break;
    }
    case 'cash': {
      if (def.kind !== 'cash') return 'That card is no longer in the deck.';
      const amount = def.amount * CARD_WEEK.CASH_FACTOR[level];
      const out = applyEffects(s, [{ kind: 'money', amount }], ctx);
      s = out.state;
      money.push(...out.money);
      active = { kind: 'cash', cardId: def.id, level };
      news.push({ text: `${def.title}: +${fmtMoney(amount)}.`, kind: 'success' });
      break;
    }
  }

  const next: CardWeekState = {
    ...s.cardWeek!, active: [...cw.active.filter(c => c.cardId !== def.id), active],
    history: recordCard(cw, state, def.id, 'play'),
    cardPlayers: joined ? [...cw.cardPlayers, joined.id] : cw.cardPlayers,
    cardTraits: traitGiven
      ? [...cw.cardTraits.filter((t) => t.playerId !== traitGiven.playerId || t.trait !== traitGiven.trait), traitGiven]
      : cw.cardTraits,
  };
  return { state: { ...s, cardWeek: next }, money, news, ...(joined ? { joined } : {}) };
}

/** Take and play as one operation, so a refused play leaves the pick waiting. */
export function playPickCard(state: GameState, index: number, targetId?: string, grant?: number): CardTake | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const picked = pickedCard(cw, index, grant);
  if (typeof picked === 'string') return picked;
  const { at, card } = picked;
  const level = nextCardLevel(state, card.cardId);
  if (!level) return 'That card is already Level III.';
  const held = cw.hand.find(h => h.cardId === card.cardId);
  const spent = spendPick(cw, at, recordCard(cw, state, card.cardId, 'take'));
  return applyCard({ ...state, cardWeek: { ...spent, hand: cw.hand.filter(h => h !== held) } }, held?.offered ?? card, level, targetId);
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
export function passCard(state: GameState, grant?: number): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  const at = offerIndex(cw, grant);
  if (!cw.offers[at]) return grant === undefined ? 'No pick is waiting.' : 'That pick is no longer waiting.';
  return { ...state, cardWeek: spendPick(cw, at, recordCard(cw, state, CARD_PASS, 'pass')) };
}

// ── The week ─────────────────────────────────────────────────────────────────

/** A completed League round or final for our club, excluding cup, trial and camp fixtures. */
function completedLeagueFixture(state: GameState) {
  return state.competitions?.instances.filter(i => i.season === state.season && i.definition.format.kind === 'league')
    .flatMap(i => i.fixtures).find(f => f.slot === state.week && f.status === 'completed' && f.result
      && (f.homeId === state.clubId || f.awayId === state.clubId));
}

export function playedLeagueMatch(state: GameState): boolean {
  return !!completedLeagueFixture(state);
}

/** Draw a fresh match pick on the card stream and replace the oldest match pick at the cap. */
export function cardWeekTick(state: GameState): GameState {
  const cw = state.cardWeek;
  if (!cw) return state;
  const fixture = completedLeagueFixture(state);
  if (!fixture) return state;
  const result = fixture.result!;
  // Advancing from a tied final on seeding does not turn the draw into a win.
  const won = result.winnerId === state.clubId && result.homeScore !== result.awayScore;
  const fromClubId = won ? (fixture.homeId === state.clubId ? fixture.awayId : fixture.homeId) : undefined;
  const { offer, rng } = drawOffer(state, 'match', cw.offers, fromClubId);
  if (!offer) return state;
  const full = cw.owed === CARD_WEEK.MAX_OWED;
  const waiting = full ? cw.offers.filter((_, i) => i !== cw.starterLeft) : cw.offers;
  return { ...state, cardWeek: {
    ...cw, rng, owed: full ? cw.owed : cw.owed + 1, grants: cw.grants + 1,
    offers: [...waiting, { ...offer, grant: cw.grants + 1 }],
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
  source?: string;
  level: TraitLevel;
  upgrade: boolean;
  hint: string;
  /** Why it can't be played now, or null. */
  refusal: string | null;
}

/** The effect line on the face; the specific hire, recruit or play is also named. */
function effectLine(def: CardDef, card: OfferedCard, level: TraitLevel): string {
  switch (card.kind) {
    case 'player': return `${TRAITS[SIGNATURE_TRAIT[card.player.position]].name} ${ROMAN[level]}.`;
    case 'dilemma': return level === 1 ? 'Board patience −1.' : `+${(level - 1) * CARD_WEEK.DILEMMA_MARGIN_STEP} recruit rating. Board patience −1.`;
    case 'staff': return level === 1 ? 'No hiring fee.' : `Weekly wage −${(1 - CARD_WEEK.STAFF_WAGE_FACTOR[level]) * 100}%.`;
    case 'setPlay': return level === 1 ? 'Free set play.' : 'Better execution when called.';
    case 'trait': return `+${level} trait ${level === 1 ? 'level' : 'levels'}.`;
    case 'cash': return def.kind === 'cash' ? `Bank +${fmtMoney(def.amount * CARD_WEEK.CASH_FACTOR[level])}.` : def.title;
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

function cardFaceView(state: GameState, card: OfferedCard, index: number, level: TraitLevel, upgrade: boolean): CardFaceView[] {
  const def = cardDefById(card.cardId);
  if (!def) return [];
  const current = upgrade ? existingCardFace(state, def) : undefined;
  if (current) card = { ...current, ...(card.fromClubId ? { fromClubId: card.fromClubId } : {}) };
  const view: CardFaceView = {
    index, cardId: def.id, kind: def.kind, title: def.title, tier: def.tier, level, upgrade, effect: effectLine(def, card, level),
    ...(card.fromClubId ? { source: state.league.clubs.find(c => c.id === card.fromClubId)?.name ?? card.fromClubId } : {}),
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
    const active = activeCard(state, def.id);
    if (active?.kind === 'trait') {
      view.detail = state.squad.find(p => p.id === active.playerId)?.name ?? '';
      view.effect = `Raises the trait to ${ROMAN[level]}.`;
    } else view.targets = traitTargets(state, def.trait).map(t => ({
      playerId: t.player.id, name: t.player.name,
      level: Math.min(3, traitLevel(t.player.traits, def.trait) + level) as TraitLevel,
    }));
  }
  return [view];
}

export function cardOfferView(state: GameState, grant?: number): { owed: number; starterLeft: number; cards: (CardFaceView & { takeRefusal: string | null })[] } {
  const cw = state.cardWeek;
  const offer = cw?.offers[offerIndex(cw, grant)];
  if (!cw || !offer) return { owed: 0, starterLeft: 0, cards: [] };
  const blocked = pickBlocked(state);
  const cards = offer.cards.flatMap((card, index) => cardFaceView(state, card, index, nextCardLevel(state, card.cardId) ?? 3,
    !!activeCard(state, card.cardId) || cw.hand.some(h => h.cardId === card.cardId)).map((view) => {
    const taken = blocked ?? takeCard(state, index, grant);
    const takeRefusal = typeof taken === 'string' ? taken : null;
    const probe = blocked ?? playPickCard(state, index, view.targets?.[0]?.playerId, grant);
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
  return (state.cardWeek?.hand ?? []).flatMap((held, index) => cardFaceView(state, held.offered, index, held.level, false).map((view) => ({
    ...view, level: held.level, refusal: playRefusal(view, blocked ?? playCard(state, index, view.targets?.[0]?.playerId)),
  })));
}

/** A match saves the levelled play ID alongside its other pre-kickoff selections. */
export function cardMatchPlays(state: GameState, plays: PlayId[]): PlayId[] {
  if (!state.cardWeek) return plays;
  return plays.map((playId): PlayId => {
    const active = state.cardWeek!.active.find(c => c.kind === 'setPlay' && c.playId === playId);
    if (!active || active.level === 1 || !isBasePlayId(playId)) return playId;
    return active.level === 2 ? `${playId}:II` : `${playId}:III`;
  });
}

/** Staff have no person id; match the saved hire to the member still at the club. */
function sameHire(a: StaffMember, b: StaffMember): boolean {
  return a.role === b.role && a.speciality === b.speciality && a.name === b.name && a.hiredSeason === b.hiredSeason;
}

export function activeCardStaff(state: GameState): StaffMember[] {
  return state.staff.filter((member) => state.cardWeek?.active.some((card) => card.kind === 'staff' && sameHire(card.member, member)));
}

// ── Store glue ───────────────────────────────────────────────────────────────

/** Publish the pick, squad and any payment together. */
function commit(t: CardTake): void {
  const s = t.money.reduce((state, m) => m.booked ? state
    : bookPlayerMovement(state, m.amount, 'events', careerActionClock(state)), t.state);
  setState({
    squad: s.squad, freeAgents: s.freeAgents, playerPopulation: s.playerPopulation, lineup: s.lineup,
    league: s.league, capAccount: s.capAccount, money: s.money, finance: s.finance, staff: s.staff,
    playbook: s.playbook, boardPatience: s.boardPatience, cardWeek: s.cardWeek!,
  });
  for (const m of t.money) bus.emit('money:changed', {
    delta: m.amount, reason: m.reason, balance: s.money, booked: true, stamp: careerActionClock(s),
  });
}

type CardActionResult = { ok: true; outcome: string } | { ok: false; reason: string };

export function chooseCard(index: number, grant?: number): CardActionResult {
  const s = getState();
  const out = pickBlocked(s) ?? takeCardResult(s, index, grant);
  if (typeof out === 'string') return { ok: false, reason: out };
  commit(out);
  saveIfChanged(getState());
  return { ok: true, outcome: out.news.map(n => n.text).join(' ') };
}

export function playChosenCard(source: 'pick' | 'hand', index: number, targetId?: string, grant?: number): CardActionResult {
  const s = getState();
  const out = pickBlocked(s) ?? (source === 'pick' ? playPickCard(s, index, targetId, grant) : playCard(s, index, targetId));
  if (typeof out === 'string') return { ok: false, reason: out };
  commit(out);
  saveIfChanged(getState());
  for (const n of out.news) bus.emit('ui:notify', n);
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

export function rerollCost(state: GameState): number {
  const receipt = state.cardWeek?.rerolls;
  const count = receipt?.season === state.season && receipt.week === state.week ? receipt.count : 0;
  return CARD_WEEK.REROLL_BASE + count * CARD_WEEK.REROLL_STEP;
}

export function rerollRefusal(state: GameState, offer: CardOffer | undefined): string | null {
  const blocked = pickBlocked(state);
  if (blocked) return blocked;
  if (!offer) return 'No pick is waiting.';
  if (offer.kind === 'decree') return 'Decree picks cannot be rerolled.';
  return state.money < rerollCost(state) ? 'The club cannot afford a reroll.' : null;
}

const REROLL_REASON = 'card: reroll';

export function rerollCard(state: GameState, grant?: number): GameState | string {
  const cw = state.cardWeek;
  const at = cw ? offerIndex(cw, grant) : -1;
  const offer = cw?.offers[at];
  const refusal = rerollRefusal(state, offer);
  if (refusal) return refusal;
  if (!cw || !offer) return 'No pick is waiting.';
  const cost = rerollCost(state);
  const paid = bookPlayerMovement(state, -cost, 'events', careerActionClock(state));
  const previousSteal = offer.cards.find(c => c.fromClubId);
  const draw = drawOffer(paid, offer.kind, [offer], offer.fromClubId, previousSteal);
  if (!draw.offer) return 'There are no eligible cards to draw.';
  const rerolls = { season: state.season, week: state.week, count: (cost - CARD_WEEK.REROLL_BASE) / CARD_WEEK.REROLL_STEP + 1 };
  const { cards } = draw.offer;
  return { ...paid, cardWeek: {
    ...cw, rng: draw.rng, rerolls, history: recordCard(cw, state, 'reroll', 'reroll'),
    offers: cw.offers.map((o, i) => i === at ? { ...o, cards } : o),
  } };
}

export function rerollPick(grant?: number): CardActionResult {
  const s = getState();
  const result = rerollCard(s, grant);
  if (typeof result === 'string') return { ok: false, reason: result };
  setState({ cardWeek: result.cardWeek!, money: result.money, finance: result.finance });
  saveIfChanged(getState());
  const cost = rerollCost(s);
  bus.emit('money:changed', { delta: -cost, reason: REROLL_REASON, balance: result.money, booked: true, stamp: careerActionClock(s) });
  return { ok: true, outcome: `Pick rerolled for ${fmtMoney(cost)}.` };
}

/** The player passed the pick on show. Refused only where a take would be (a held week, the league choice). */
export function passPick(grant?: number): { ok: true } | { ok: false; reason: string } {
  const s = getState();
  const blocked = pickBlocked(s);
  if (blocked) return { ok: false, reason: blocked };
  const out = passCard(s, grant);
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
