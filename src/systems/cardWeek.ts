import { awaitingCampReplay } from './parkedLeagueFixture';
// src/systems/cardWeek.ts — the card week (#846, Labs): a League career that
// chose it gets a pick of one card from three before round 1 and after each
// League match it plays (up to CARD_WEEK.MAX_OWED waiting). The cards are in
// data/cards.ts. Pure functions plus one tick hook and chooseCard() for the UI.
//
// A career is a card-week career only when state.cardWeek exists; every path
// here is guarded on it, so any other career plays exactly as before. The
// three cards on show are resolved when they are drawn (the player a card
// brings, who he would replace, the play, the hire's name) and saved, so a
// reload shows the same offer. Randomness comes from the card week's own
// stream (state.cardWeek.rng): drawing never moves rngSeed or the events deck.
// Money, board patience and traits go through the events deck's applyEffects,
// so they read and book the way an event card's do.
import { getState, setState, type CardOffer, type CardWeekState, type Fixture, type GameState, type LastMatchImpact, type OfferedCard, type Player, type Position } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, TICK_ORDER, weekHeld } from '../core/time';
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
import { appointFeeWaived, ATTACK_COACHES, hireRefusal, STAFF, type StaffHire } from './staff';
import { emptyTally, foldEvents } from './stats';
import { PLAYER_ID } from './fixtures';
import type { MatchEvent } from '../sim/events';

/** Tick order: after the week's results, ladder and morale, before the unlocks (autosave − 1) and the autosave. */
export const CARD_WEEK_TICK_ORDER = TICK_ORDER.autosave - 2;

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
    case 'dilemma': return state.boardPatience + def.patience >= 1;
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
  const target = Math.min(99, floor + def.margin);
  for (let i = 0; i < CARD_WEEK.PLAYER_TRIES; i++) {
    const player = generatePlayerAround(rng, target, { position });
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
    case 'staff': return { cardId: def.id, kind: 'staff', name: randomName(rng) };
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
export function drawOffer(state: GameState): { offer: CardOffer | null; rng: number } {
  const cw = state.cardWeek;
  if (!cw) return { offer: null, rng: 0 };
  const rng = makeRng(cw.rng);
  let left = CARDS.filter((c) => eligibleBeforeDice(state, c));
  const cards: OfferedCard[] = [];
  while (cards.length < CARD_WEEK.OFFER_SIZE && left.length > 0) {
    const def = pickWeighted(left, rng);
    if (!def) break;
    left = left.filter((c) => c !== def);
    const card = resolveCard(state, def, rng);
    if (card) cards.push(card);
  }
  return { offer: cards.length > 0 ? { season: state.season, week: state.week, cards } : null, rng: rng.state() };
}

/** Put a pick on show when one is owed and none is (pure). Any other state comes back as it was. */
export function withOffer(state: GameState): GameState {
  const cw = state.cardWeek;
  if (!cw || cw.owed <= 0 || cw.offer) return state;
  const { offer, rng } = drawOffer(state);
  return { ...state, cardWeek: { ...cw, rng, offer } };
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
  const rest = (cw.offer?.cards ?? []).filter((c) => c.cardId !== cardId);
  const offer: CardOffer = { season: state.season, week: state.week, cards: [card, ...rest].slice(0, CARD_WEEK.OFFER_SIZE) };
  return { ...state, cardWeek: { ...cw, rng: rng.state(), owed: Math.max(1, cw.owed), offer } };
}

/** A new card-week career's opening state: three picks owed and the first on show. */
export function startCardWeek(state: GameState, cardWeek: CardWeekState): GameState {
  return withOffer({ ...state, cardWeek });
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

/**
 * Take card `index` of the pick on show (pure). A trait card needs `targetId`,
 * the squad member who gets it. Returns what happened, or why not in plain
 * words (nothing changes then). The pick is spent, and the next one drawn if
 * another is owed.
 */
export function takeCard(state: GameState, index: number, targetId?: string): CardTake | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  if (cw.owed <= 0 || !cw.offer) return 'No pick is waiting.';
  const card = cw.offer.cards[index];
  if (!card) return 'There is no card there.';
  const def = cardDefById(card.cardId);
  if (!def || def.kind !== card.kind) return 'That card is no longer in the deck.';
  const ctx = { cardId: def.id, reason: `card: ${def.title}`, now: elapsedInterval(state), clubName: state.clubName };
  let s = state;
  const money: Applied['money'] = [];
  const news: Applied['news'] = [];
  let joined: Player | undefined;
  let traitGiven: { playerId: string; trait: Extract<CardDef, { kind: 'trait' }>['trait'] } | undefined;

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
      news.push({ text: `${def.title}: ${card.name} joins, appointment fee waived.`, kind: 'success' });
      break;
    }
    case 'setPlay': {
      if (ownsPlay(s, card.playId)) return 'That play is already yours.';
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
      traitGiven = { playerId: target.player.id, trait: def.trait };
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

  const after = s.cardWeek!;
  const next: CardWeekState = {
    ...after,
    owed: after.owed - 1,
    offer: null,
    history: [...after.history, { cardId: def.id, season: state.season, week: state.week }],
    cardPlayers: joined ? [...after.cardPlayers, joined.id] : after.cardPlayers,
    cardTraits: traitGiven && !after.cardTraits.some((t) => t.playerId === traitGiven!.playerId && t.trait === traitGiven!.trait)
      ? [...after.cardTraits, traitGiven] : after.cardTraits,
  };
  return { state: withOffer({ ...s, cardWeek: next }), money, news, ...(joined ? { joined } : {}) };
}

/**
 * Pass the pick on show (pure): it is spent with no card taken, recorded in the
 * history as a pass, and the next pick is drawn if another is owed. Always
 * allowed while a pick is showing, so a pick whose cards are all refused never
 * holds the career up.
 */
export function passCard(state: GameState): GameState | string {
  const cw = state.cardWeek;
  if (!cw) return 'This career has no card week.';
  if (cw.owed <= 0 || !cw.offer) return 'No pick is waiting.';
  return withOffer({ ...state, cardWeek: {
    ...cw, owed: cw.owed - 1, offer: null,
    history: [...cw.history, { cardId: CARD_PASS, season: state.season, week: state.week }],
  } });
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

/** The weekly card-week tick (pure): a League match adds a pick (to MAX_OWED), and a pick owed is put on show. */
export function cardWeekTick(state: GameState): GameState {
  const cw = state.cardWeek;
  if (!cw) return state;
  const owed = playedLeagueMatch(state) ? Math.min(CARD_WEEK.MAX_OWED, cw.owed + 1) : cw.owed;
  const next = owed === cw.owed ? state : { ...state, cardWeek: { ...cw, owed } };
  return withOffer(next);
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
  /** Why it can't be taken now, or null. */
  refusal: string | null;
}

/** The effect line on a card's face: plain words, about a dozen at most. */
function effectLine(def: CardDef, card: OfferedCard): string {
  switch (card.kind) {
    case 'player': return 'Joins now with no signing fee. His salary counts on the cap.';
    case 'dilemma': return 'A better man joins free where you are weakest. Board patience −1.';
    case 'staff': {
      const title = def.kind === 'staff' ? (typeof def.role === 'string' ? STAFF[def.role].title : ATTACK_COACHES[def.role.attackCoach].title) : def.title;
      return `${card.name} joins as ${title}. Fee waived; wages still run.`;
    }
    case 'setPlay': return `${PLAYS_BY_ID[card.playId].name} goes in your playbook, free.`;
    case 'trait': return def.kind === 'trait' ? `${TRAITS[def.trait].name} for a player you choose. III is the limit.` : def.title;
    case 'cash': return def.kind === 'cash' ? `${fmtMoney(def.amount)} into the bank now.` : def.title;
  }
}

/** The pick on show, for the pick screen: picks owed and each card's face. Empty when nothing is on show. */
export function cardOfferView(state: GameState): { owed: number; cards: CardFaceView[] } {
  const cw = state.cardWeek;
  if (!cw?.offer) return { owed: cw?.owed ?? 0, cards: [] };
  const cards = cw.offer.cards.flatMap((card, index): CardFaceView[] => {
    const def = cardDefById(card.cardId);
    if (!def) return [];
    const view: CardFaceView = { index, cardId: def.id, kind: def.kind, title: def.title, tier: def.tier, effect: effectLine(def, card), refusal: null };
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
    const probe = takeCard(state, index, view.targets?.[0]?.playerId);
    view.refusal = typeof probe === 'string' ? probe : null;
    return [view];
  });
  return { owed: cw.owed, cards };
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

/**
 * The player took card `index` (a trait card with `targetId`, the man who gets
 * it); `outcome` says what happened in a line. Refused, with the reason, during a match or a held week, while a closed
 * League season waits for next season's league, or when the card can't be
 * taken; nothing changes then.
 */
export function chooseCard(index: number, targetId?: string): { ok: true; outcome: string } | { ok: false; reason: string } {
  const s = getState();
  const blocked = pickBlocked(s);
  if (blocked) return { ok: false, reason: blocked };
  const out = takeCard(s, index, targetId);
  if (typeof out === 'string') return { ok: false, reason: out };
  commit(out);
  return { ok: true, outcome: out.news.map((n) => n.text).join(' ') };
}

/** The player passed the pick on show. Refused only where a take would be (a held week, the league choice). */
export function passPick(): { ok: true } | { ok: false; reason: string } {
  const s = getState();
  const blocked = pickBlocked(s);
  if (blocked) return { ok: false, reason: blocked };
  const out = passCard(s);
  if (typeof out === 'string') return { ok: false, reason: out };
  setState({ cardWeek: out.cardWeek! });
  return { ok: true };
}

/** Why no pick can be made in the store's state now, or null. */
function pickBlocked(s: GameState): string | null {
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
  registerTickHook('card-week', CARD_WEEK_TICK_ORDER, () => {
    const s = getState();
    if (!s.cardWeek || s.sacked || deckWaitsForLeagueChoice(s)) return;
    const next = cardWeekTick(s);
    if (next !== s) setState({ cardWeek: next.cardWeek! });
  });
}
