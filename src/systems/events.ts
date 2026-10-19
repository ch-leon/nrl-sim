// src/systems/events.ts — the random events deck (GitHub #75). Draws at most one
// card a week from data/events.ts, resolves the player's choice (or the card's
// default once ANSWER_WEEKS pass) and runs the temporary modifiers choices leave
// behind. Pure functions plus one tick hook and chooseEvent() for the UI.
//
// Randomness comes from the deck's own seeded stream (state.eventDeck.rng), so
// drawing cards never moves the main rngSeed and never reshuffles a match.
// Money moves go through earnMoney so they reach the finance ledger; everything
// else is announced in the news with the outcome line.
import { getState, setState, type ActiveModifier, type GameState, type PendingEvent, type Player } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook } from '../core/time';
import { earnMoney } from '../data/club';
import { overallRating } from '../data/player';
import { TRAITS, traitLevel, withTrait, type TraitLevel } from '../data/traits';
import {
  cardById, EVENT_CARDS, type EventCardDef, type EventEffect, type SubjectRule,
} from '../data/events';
import { EVENTS, WEEKS_PER_SEASON } from '../config';
import { makeRng, type Rng } from '../utils/rng';
import { clampMorale } from './morale';
import { getCurrentFixture, PLAYER_ID } from './fixtures';

/** Tick order: after morale (55) so a card's morale change isn't drifted the same week, before free agency (60). */
export const EVENTS_TICK_ORDER = 58;

/** Weeks since the start of season 1 (season 1 week 1 = 1). Cooldowns and expiry use it. */
export function absWeek(season: number, week: number): number {
  return (season - 1) * WEEKS_PER_SEASON + week;
}

// ── Text ─────────────────────────────────────────────────────────────────────

/** Fill {player} and {club} in a card's text. */
export function fillText(text: string, ctx: { subjectName?: string | undefined; clubName: string }): string {
  return text.replace(/\{player\}/g, ctx.subjectName ?? 'A player').replace(/\{club\}/g, ctx.clubName);
}

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const dollars = (n: number): string => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US')}`;

/** Short summary of what effects do, for choice buttons and news lines. */
export function describeEffects(effects: readonly EventEffect[]): string {
  const parts = effects.map((e): string => {
    switch (e.kind) {
      case 'money': return dollars(e.amount);
      case 'reputation': return `reputation ${signed(e.amount)}`;
      case 'squadMorale': return `squad morale ${signed(e.amount)}`;
      case 'playerMorale': return `morale ${signed(e.amount)}`;
      case 'playerWage': return `wage ${signed(Math.round(e.pct * 100))}%`;
      case 'playerTrait': return `${TRAITS[e.trait].name} trait`;
      case 'modifier': {
        const what = describeEffects(e.effects);
        if (e.trigger === 'weekly') return `${what} a week for ${e.weeks} weeks`;
        if (e.weeks === 1) return `${what} if you ${e.trigger === 'win' ? 'win' : 'lose'} next week`;
        return `${what} a ${e.trigger} for ${e.weeks} weeks`;
      }
    }
  });
  return parts.length > 0 ? parts.join(' · ') : 'no effect';
}

// ── Drawing ──────────────────────────────────────────────────────────────────

/** The player's fit, signed squad members (juniors are not first-graders yet). */
function fitSquad(state: GameState): Player[] {
  return state.squad.filter((p) => p.injuredWeeks <= 0 && !p.junior);
}

/** Candidate players for a subject rule, best candidate first. Empty = card can't be drawn. */
export function subjectCandidates(state: GameState, rule: SubjectRule): Player[] {
  const fit = fitSquad(state);
  const byId = (a: Player, b: Player): number => a.id.localeCompare(b.id);
  switch (rule) {
    case 'star': return [...fit].sort((a, b) => overallRating(b) - overallRating(a) || byId(a, b)).slice(0, 1);
    case 'youngster': return fit.filter((p) => p.age <= 21).sort((a, b) => a.age - b.age || byId(a, b)).slice(0, 1);
    case 'veteran': return fit.filter((p) => p.age >= 30).sort((a, b) => b.age - a.age || byId(a, b)).slice(0, 1);
    case 'unhappy': return fit.filter((p) => p.morale < 45).sort((a, b) => a.morale - b.morale || byId(a, b)).slice(0, 1);
    case 'any': return fit;
  }
}

/** The player club's fixture in `round`, if any. */
function fixtureInRound(state: GameState, round: number) {
  return state.league.fixtures.find((f) => f.round === round && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID));
}

/** Is `card` allowed this week? `now` is the absolute week of the tick drawing it. */
export function isEligible(card: EventCardDef, state: GameState, now: number): boolean {
  const deck = state.eventDeck;
  if ((deck.cooldowns[card.id] ?? 0) > now) return false;
  if (deck.pending.some((p) => p.cardId === card.id)) return false;
  const w = card.when;
  if (w?.weeks && (state.week < w.weeks[0] || state.week > w.weeks[1])) return false;
  if (w?.reputation && (state.reputation < w.reputation[0] || state.reputation > w.reputation[1])) return false;
  if (w?.minMoney !== undefined && state.money < w.minMoney) return false;
  if (w?.minFacilities !== undefined && state.facilities.length < w.minFacilities) return false;
  if (w?.nextMatch) {
    const next = fixtureInRound(state, state.week + 1);
    if (!next) return false;
    if (w.nextMatch === 'home' && next.homeId !== PLAYER_ID) return false;
    if (w.nextMatch === 'away' && next.awayId !== PLAYER_ID) return false;
  }
  if (card.subject && subjectCandidates(state, card.subject).length === 0) return false;
  return true;
}

/** Weighted pick; null when nothing is eligible. */
function pickWeighted(cards: readonly EventCardDef[], rng: Rng): EventCardDef | null {
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
 * Maybe draw this week's card. Nothing is drawn while MAX_PENDING cards wait,
 * within MIN_GAP_WEEKS of the last card, or when the weekly roll misses.
 */
export function drawEvent(state: GameState, now: number, rng: Rng): PendingEvent | null {
  const deck = state.eventDeck;
  if (deck.pending.length >= EVENTS.MAX_PENDING) return null;
  if (deck.lastDrawn > 0 && now - deck.lastDrawn < EVENTS.MIN_GAP_WEEKS) return null;
  if (rng.next() >= EVENTS.WEEKLY_CHANCE) return null;
  const card = pickWeighted(EVENT_CARDS.filter((c) => isEligible(c, state, now)), rng);
  if (!card) return null;
  const ev: PendingEvent = {
    id: `${card.id}-s${state.season}w${state.week}`,
    cardId: card.id,
    season: state.season,
    week: state.week,
    expiresAt: now + EVENTS.ANSWER_WEEKS,
  };
  if (card.subject) {
    const who = rng.pick(subjectCandidates(state, card.subject));
    ev.subjectId = who.id;
    ev.subjectName = who.name;
  }
  return ev;
}

// ── Effects ──────────────────────────────────────────────────────────────────

/** A state change plus the money it moves and the news it makes. Money is kept
 *  out of `state` so the caller can route it through earnMoney (the ledger). */
export interface Applied {
  state: GameState;
  money: { amount: number; reason: string }[];
  news: { text: string; kind: 'info' | 'success' | 'danger' }[];
}

interface EffectCtx {
  cardId: string;
  reason: string; // ledger reason for money
  subjectId?: string | undefined;
  subjectName?: string | undefined;
  now: number;
}

const clampRep = (n: number): number => Math.max(1, Math.min(100, n));

/** Apply effects to state (pure). Effects on a subject who has left the squad do nothing. */
export function applyEffects(state: GameState, effects: readonly EventEffect[], ctx: EffectCtx): Applied {
  let s = state;
  const money: Applied['money'] = [];
  const updateSubject = (fn: (p: Player) => Player): void => {
    if (!ctx.subjectId) return;
    s = { ...s, squad: s.squad.map((p) => (p.id === ctx.subjectId ? fn(p) : p)) };
  };
  effects.forEach((e, i) => {
    switch (e.kind) {
      case 'money': money.push({ amount: e.amount, reason: ctx.reason }); break;
      case 'reputation': s = { ...s, reputation: clampRep(s.reputation + e.amount) }; break;
      case 'squadMorale':
        s = { ...s, squad: s.squad.map((p) => ({ ...p, morale: clampMorale(p.morale + e.amount) })) };
        break;
      case 'playerMorale': updateSubject((p) => ({ ...p, morale: clampMorale(p.morale + e.amount) })); break;
      case 'playerWage': updateSubject((p) => ({ ...p, wage: Math.round(p.wage * (1 + e.pct)) })); break;
      case 'playerTrait':
        updateSubject((p) => ({
          ...p, traits: withTrait(p.traits, e.trait, Math.min(3, traitLevel(p.traits, e.trait) + 1) as TraitLevel),
        }));
        break;
      case 'modifier': {
        const mod: ActiveModifier = {
          id: `${ctx.cardId}-${ctx.now}-${i}`, cardId: ctx.cardId, label: e.label,
          trigger: e.trigger, weeksLeft: e.weeks, effects: e.effects,
          ...(ctx.subjectId ? { subjectId: ctx.subjectId } : {}),
          ...(ctx.subjectName ? { subjectName: ctx.subjectName } : {}),
        };
        s = { ...s, eventDeck: { ...s.eventDeck, modifiers: [...s.eventDeck.modifiers, mod] } };
        break;
      }
    }
  });
  return { state: s, money, news: [] };
}

/**
 * Resolve a pending card with choice `index` (pure). The card leaves `pending`
 * before its effects apply, so a card can never pay out twice. `auto` marks the
 * default taken for an unanswered card. Returns null for an unknown id/choice.
 */
export function resolveEvent(state: GameState, eventId: string, index: number, now: number, auto = false): Applied | null {
  const ev = state.eventDeck.pending.find((p) => p.id === eventId);
  if (!ev) return null;
  const card = cardById(ev.cardId);
  const without: GameState = {
    ...state, eventDeck: { ...state.eventDeck, pending: state.eventDeck.pending.filter((p) => p.id !== eventId) },
  };
  // A card dropped from the deck since the save was made just disappears.
  if (!card) return { state: without, money: [], news: [] };
  const choice = card.choices[index];
  if (!choice) return null;
  const applied = applyEffects(without, choice.effects, {
    cardId: card.id, reason: `event: ${card.title}`, subjectId: ev.subjectId, subjectName: ev.subjectName, now,
  });
  const text = fillText(choice.outcome, { subjectName: ev.subjectName, clubName: state.clubName });
  const summary = describeEffects(choice.effects);
  applied.news.push({
    text: `${auto ? 'No answer, so: ' : ''}${text}${choice.effects.length > 0 ? ` (${summary})` : ''}`,
    kind: 'info',
  });
  return applied;
}

/** "win" / "loss" / "draw" for the player's fixture this week, or null (bye / unplayed). */
export function weekResult(state: GameState): 'win' | 'loss' | 'draw' | null {
  const fx = getCurrentFixture(state, PLAYER_ID);
  if (!fx?.result) return null;
  const us = fx.homeId === PLAYER_ID ? fx.result.homeScore : fx.result.awayScore;
  const them = fx.homeId === PLAYER_ID ? fx.result.awayScore : fx.result.homeScore;
  return us > them ? 'win' : us < them ? 'loss' : 'draw';
}

/** Fire this week's modifiers and count them down (pure). */
export function tickModifiers(state: GameState, now: number): Applied {
  const result = weekResult(state);
  let s: GameState = state;
  const money: Applied['money'] = [];
  const news: Applied['news'] = [];
  const kept: ActiveModifier[] = [];
  for (const m of state.eventDeck.modifiers) {
    if (m.trigger === 'weekly' || m.trigger === result) {
      const a = applyEffects(s, m.effects, {
        cardId: m.cardId, reason: m.label, subjectId: m.subjectId, subjectName: m.subjectName, now,
      });
      s = a.state;
      money.push(...a.money);
      // Steady weekly money shows in the ledger; only news-worthy firings are announced.
      if (m.trigger !== 'weekly' || m.effects.some((e) => e.kind !== 'money')) {
        news.push({ text: `${m.label}: ${describeEffects(m.effects)}.`, kind: m.trigger === 'loss' ? 'danger' : 'success' });
      }
    }
    if (m.weeksLeft > 1) kept.push({ ...m, weeksLeft: m.weeksLeft - 1 });
  }
  s = { ...s, eventDeck: { ...s.eventDeck, modifiers: kept } };
  return { state: s, money, news };
}

/** Everything the weekly tick did, for the hook to commit. */
export interface EventsTick extends Applied {
  drawn: PendingEvent | null;
}

/**
 * The weekly events tick (pure): fire modifiers, take the default on cards whose
 * time ran out, then maybe draw a new card.
 */
export function eventsTick(state: GameState): EventsTick {
  const now = absWeek(state.season, state.week);
  const mods = tickModifiers(state, now);
  let s = mods.state;
  const money = [...mods.money];
  const news = [...mods.news];

  for (const ev of [...s.eventDeck.pending]) {
    if (ev.expiresAt > now) continue;
    const card = cardById(ev.cardId);
    const r = resolveEvent(s, ev.id, card?.defaultChoice ?? 0, now, true);
    if (!r) continue;
    s = r.state;
    money.push(...r.money);
    news.push(...r.news);
  }

  const rng = makeRng(s.eventDeck.rng);
  const drawn = drawEvent(s, now, rng);
  let deck = { ...s.eventDeck, rng: rng.state() };
  if (drawn) {
    const card = cardById(drawn.cardId)!;
    deck = {
      ...deck,
      pending: [...deck.pending, drawn],
      lastDrawn: now,
      cooldowns: { ...deck.cooldowns, [card.id]: now + card.cooldown },
    };
    news.push({ text: `Decision needed: ${card.title}. Open News to choose.`, kind: 'info' });
  }
  return { state: { ...s, eventDeck: deck }, money, news, drawn };
}

// ── Store glue ───────────────────────────────────────────────────────────────

/** Write an Applied result to the store: state first, then money (ledger) and news. */
function commit(a: Applied): void {
  setState({ squad: a.state.squad, reputation: a.state.reputation, eventDeck: a.state.eventDeck });
  for (const m of a.money) earnMoney(m.amount, m.reason);
  for (const n of a.news) bus.emit('ui:notify', n);
}

/** The player picked choice `index` on a pending card. Returns false if it no longer exists. */
export function chooseEvent(eventId: string, index: number): boolean {
  const s = getState();
  const r = resolveEvent(s, eventId, index, absWeek(s.season, s.week));
  if (!r) return false;
  commit(r);
  return true;
}

/** Install the weekly events hook. */
export function registerEventsSystem(): void {
  registerTickHook('events', EVENTS_TICK_ORDER, () => {
    const s = getState();
    if (s.sacked) return;
    commit(eventsTick(s));
  });
}
