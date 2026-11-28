// QA only. Reads what the pick/hand screens show and uses the same store actions.
import { getState, type GameState, type Player } from '../../core/state';
import { cardDefById, CARD_WEEK, WEEKLY_FATIGUE } from '../../data/cards';
import { TRAITS } from '../../data/traits';
import { overallRating } from '../../data/player';
import {
  cardFloor, cardHandView, cardOfferView, chooseCard, discardHeldCard, passPick, playChosenCard,
  preferredCardOffer, type CardFaceView,
} from '../../systems/cardWeek';
import { autoPickKeepingPlan, commitLineup, effectiveRating, isSelectable, placeAt, resolveLineup, LINEUP_SLOTS } from '../../systems/lineup';
import { awayPlayerIds } from '../../systems/playerAvailability';
import { leagueSeasonView } from '../../systems/leagueSeasonView';
import { weeklyFatigueOf } from '../../systems/weeklyFatigue';
import { makeRng } from '../../utils/rng';
import type { PersonaConfig } from './types';

const RECOVERY_CARDS = new Set(['fatigueWipe', 'iceBaths', 'injuryRepair']);
const injuryLine = WEEKLY_FATIGUE.INJURY_TIERS[1].above;

export function restAbove(config: PersonaConfig): number {
  if (config.events === 'random') return Infinity;
  if (config.events === 'value') return 40;
  return config.facilities.policy === 'none' ? 80 : 60;
}

export function openingLineup(state: GameState) {
  const away = awayPlayerIds(state);
  return resolveLineup(state.lineup, state.squad, away);
}

/** Dropping a tired starter must never decrease available cover. */
function rotateTiredStarters(limit: number): number {
  const s = getState();
  const away = awayPlayerIds(s);
  // Start from the same preferred side each round; a rested starter can return.
  let lineup = autoPickKeepingPlan(s.squad, s.lineup, away);
  const starters = new Set(lineup.starters);
  let rested = 0;
  lineup.starters.forEach((id, slot) => {
    if (!id || weeklyFatigueOf(s, id) <= limit) return;
    const position = LINEUP_SLOTS[slot]!;
    const cover = s.squad.filter(p => isSelectable(p, away) && !starters.has(p.id) && weeklyFatigueOf(s, p.id) <= limit)
      .sort((a, b) => effectiveRating(b, position) - effectiveRating(a, position) || a.id.localeCompare(b.id))[0];
    if (!cover) return;
    lineup = placeAt(lineup, {kind:'starter', slot}, cover.id, away);
    starters.add(cover.id);
    rested++;
  });
  return rested && commitLineup(lineup) ? rested : 0;
}

function suited(player: Player | undefined, face: CardFaceView): boolean {
  const def = cardDefById(face.cardId);
  if (!player || def?.kind !== 'trait') return false;
  const fit = TRAITS[def.trait].fit;
  return fit === null || fit.includes(player.position);
}

function value(face: CardFaceView, state: GameState): number {
  if (RECOVERY_CARDS.has(face.cardId)) {
    if (face.cardId === 'injuryRepair') {
      const weeks = Math.max(0, ...(face.targets ?? []).map(t => state.squad.find(p => p.id === t.playerId)?.injuredWeeks ?? 0));
      return weeks >= 2 ? 90 : 55;
    }
    const tired = openingLineup(state).starters.filter(p => p && weeklyFatigueOf(state, p.id) > injuryLine).length;
    return 45 + tired * 20;
  }
  if (face.kind === 'decree') {
    return ({ fortress: 90, throughTheMiddle: 80, youthFirst: 70, nextManUp: 65, width: 60, tightShip: 50 } as Record<string, number>)[face.cardId] ?? 0;
  }
  if (face.player) return 75 + (face.player.rating - cardFloor(state.squad, face.player.position)) * 4 - (face.kind === 'dilemma' ? 28 : 0);
  if (face.kind === 'cash') return state.money < 25_000 ? 125 : 65;
  if (face.kind === 'setPlay') return state.lineup.plays.length ? 55 : 75;
  if (face.kind === 'trait') return 50 + (face.targets?.some(t => suited(state.squad.find(p => p.id === t.playerId), face)) ? 15 : 0);
  return face.upgrade ? 45 : 35;
}

function targetFor(face: CardFaceView, state: GameState, useFirst: boolean): string | undefined {
  if (!face.targets?.length) return undefined;
  if (useFirst && !RECOVERY_CARDS.has(face.cardId)) return face.targets[0]?.playerId;
  const starters = new Set(openingLineup(state).starters.map(p => p?.id));
  const score = (t: typeof face.targets[number]): number => {
    const p = state.squad.find(p => p.id === t.playerId);
    if (face.cardId === 'injuryRepair') return (p?.injuredWeeks ?? 0) * 100 + (p ? overallRating(p) : 0);
    if (face.cardId === 'fatigueWipe') return Number(starters.has(t.playerId)) * 1000 + weeklyFatigueOf(state, t.playerId);
    return Number(suited(p, face)) * 100 + (p ? overallRating(p) : 0);
  };
  return [...face.targets].sort((a, b) => score(b) - score(a) || a.playerId.localeCompare(b.playerId))[0]?.playerId;
}

function recoveryUseful(face: CardFaceView, state: GameState): boolean {
  if (face.cardId === 'injuryRepair') return !!face.targets?.some(t => (state.squad.find(p => p.id === t.playerId)?.injuredWeeks ?? 0) > 0);
  const tired = openingLineup(state).starters.filter(p => p && weeklyFatigueOf(state, p.id) > injuryLine);
  return face.cardId === 'iceBaths' ? tired.length > 0 : tired.some(p => face.targets?.some(t => t.playerId === p?.id));
}

export interface CardPolicyStats {
  cardsKept: Record<string, number>;
  cardsPlayed: Record<string, number>;
  recoveriesPlayed: number;
  reachedLevelIII: number;
  levelIII: {cardId: string; week: number; regularRoundsPlayed: number}[];
  picksPassed: number;
  restedStarters: number;
  decisions: number;
  mistakes: number;
}
export function emptyCardPolicyStats(): CardPolicyStats {
  return {cardsKept:{}, cardsPlayed:{}, recoveriesPlayed:0, reachedLevelIII:0, levelIII:[], picksPassed:0, restedStarters:0, decisions:0, mistakes:0};
}

export function createCardPolicy(config: PersonaConfig, seed: number) {
  // Neither the match, game deck, nor the shared persona's decision RNG is touched.
  const rng = makeRng(seed ^ 0x857c4);
  const levelThree = new Set<string>();
  let stats = emptyCardPolicyStats();
  function slip(): boolean {
    stats.decisions++;
    if (rng.next() >= config.mistakeRate) return false;
    stats.mistakes++;
    return true;
  }
  function acted(action: () => {ok: boolean}): boolean {
    const from = getState().cardWeek!.history.length;
    if (!action().ok) return false;
    const cw = getState().cardWeek!;
    for (const entry of cw.history.slice(from)) {
      if (entry.action === 'pass') stats.picksPassed++;
      const kind = cardDefById(entry.cardId)?.kind;
      if (!kind) continue;
      const tally = entry.action === 'take' ? stats.cardsKept : entry.action === 'play' ? stats.cardsPlayed : null;
      if (tally) tally[kind] = (tally[kind] ?? 0) + 1;
      if (entry.action === 'play' && RECOVERY_CARDS.has(entry.cardId)) stats.recoveriesPlayed++;
    }
    for (const card of [...cw.hand, ...cw.active]) {
      if (card.level !== 3 || levelThree.has(card.cardId)) continue;
      levelThree.add(card.cardId);
      stats.reachedLevelIII++;
      const state = getState();
      const view = leagueSeasonView(state);
      const regularRoundsPlayed = view?.fixtures.filter(f => f.instance.id === view.instance.id && f.stageKind === 'league'
        && f.status === 'completed' && (f.fixture.homeId === state.clubId || f.fixture.awayId === state.clubId)).length ?? 0;
      stats.levelIII.push({cardId:card.cardId, week:state.week, regularRoundsPlayed});
    }
    return true;
  }
  function order<T extends CardFaceView>(cards: T[], mistake: boolean, state: GameState): T[] {
    if (mistake && config.events !== 'first') return rng.shuffle(cards);
    // Casual/newcomer take the first; their slips pick the obvious runner-up.
    if (config.events === 'first') return mistake && cards.length > 1 ? [cards[1]!, cards[0]!, ...cards.slice(2)] : cards;
    return cards.sort((a,b) => value(b, state) - value(a, state) || a.index - b.index);
  }
  function playHand(): void {
    for (let n = 0; n < CARD_WEEK.HAND_CAP; n++) {
      const s = getState();
      const ready = cardHandView(s).filter(face => !face.refusal && (!RECOVERY_CARDS.has(face.cardId) || recoveryUseful(face, s)));
      if (!ready.length) break;
      const candidates = order(ready, slip(), s);
      const success = candidates.some(face => acted(() =>
        playChosenCard('hand', face.index, targetFor(face, s, config.events === 'first'))));
      if (!success) break;
    }
  }
  function drainPicks(): void {
    const initial = getState().cardWeek?.offers.length ?? 0;
    // Bounded by the number owed × max keeps, not round numbers.
    for (let n = 0; n < initial * CARD_WEEK.PICKS.match.keep; n++) {
      const s = getState();
      const offer = preferredCardOffer(s);
      if (!offer) return;
      const faces = cardOfferView(s, offer.grant).cards;
      const ranked = order(faces.filter(face => !face.takeRefusal || !face.refusal), slip(), s);
      const urgentFatigue = (face: CardFaceView): boolean => !face.refusal
        && (face.cardId === 'fatigueWipe' || face.cardId === 'iceBaths') && recoveryUseful(face, s);
      const candidates = [...ranked.filter(urgentFatigue), ...ranked.filter(face => !urgentFatigue(face))];
      const progress = candidates.some(face => {
        const urgent = RECOVERY_CARDS.has(face.cardId) && recoveryUseful(face, s);
        const allowedPlay = !face.refusal && (!RECOVERY_CARDS.has(face.cardId) || urgent);
        const play = () => acted(() => playChosenCard('pick', face.index, targetFor(face, s, config.events === 'first'), offer.grant));
        if (urgent && allowedPlay && play()) return true;
        if (!face.takeRefusal && acted(() => chooseCard(face.index, offer.grant))) return true;
        return allowedPlay && play();
      });
      if (!progress && !acted(() => passPick(offer.grant))) throw new Error('the waiting pick could not be played or passed');
      playHand(); // Open hand slots before resolving the next keep.
    }
    if (getState().cardWeek?.offers.length) throw new Error('card policy did not resolve its bounded pick queue');
  }
  return {
    settleOffers(): void {
      if (!getState().cardWeek || getState().sacked) return;
      playHand();
      drainPicks();
      // If the hand is entirely future recovery and is capped, make space for the next offer.
      if (getState().cardWeek?.hand.length === CARD_WEEK.HAND_CAP) acted(() => discardHeldCard(CARD_WEEK.HAND_CAP - 1));
    },
    rest(): void {
      const limit = restAbove(config);
      if (!getState().cardWeek || !Number.isFinite(limit)) return;
      if (openingLineup(getState()).starters.some(p => p && weeklyFatigueOf(getState(), p.id) > limit) && !slip()) {
        stats.restedStarters += rotateTiredStarters(limit);
      }
    },
    snapshot: () => structuredClone(stats),
    newSeason: () => { stats = emptyCardPolicyStats(); },
  };
}
