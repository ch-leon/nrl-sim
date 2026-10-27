// src/systems/events.ts — the random events deck (GitHub #75). Draws at most one
// card a week from data/events.ts, resolves the player's choice (or the card's
// default once ANSWER_WEEKS pass) and runs the temporary modifiers choices leave
// behind. Pure functions plus one tick hook and chooseEvent() for the UI.
//
// Randomness comes from the deck's own seeded stream (state.eventDeck.rng), so
// drawing cards never moves the main rngSeed and never reshuffles a match.
// Money moves go through earnMoney so they reach the finance ledger; everything
// else is announced in the news with the outcome line.
import { getState, setState, type ActiveModifier, type GameState, type PendingEvent, type Player, type RivalClub } from '../core/state';
import { bus } from '../core/events';
import { registerSeasonHook, registerTickHook, TICK_ORDER } from '../core/time';
import { earnMoney } from '../data/club';
import { overallRating } from '../data/player';
import { TRAITS, traitLevel, withTrait, type TraitLevel } from '../data/traits';
import {
  cardById, closedGatesFlag, EVENT_CARDS, type EventCardDef, type EventEffect, type SubjectRule,
} from '../data/events';
import { BOARD, EVENTS, ON_FIELD, SQUAD_CAP, WEEKS_PER_SEASON, WILDCARDS } from '../config';
import { marketWage, withDerivedStrength } from './rivals';
import { NEW_CONTRACT_WEEKS, signingFee } from './freeagency';
import { hasStaff, WELFARE_CARDS } from './staff';
import { isFieldable } from './lineup';
import { reviewSuspension, withSuspension } from './suspension';
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
export function fillText(
  text: string,
  ctx: { subjectName?: string | undefined; clubName: string; vars?: Record<string, string> | undefined },
): string {
  let out = text.replace(/\{player\}/g, ctx.subjectName ?? 'A player').replace(/\{club\}/g, ctx.clubName);
  for (const [k, v] of Object.entries(ctx.vars ?? {})) out = out.split(`{${k}}`).join(v);
  return out;
}

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
const dollars = (n: number): string => `${n < 0 ? '−' : '+'}$${Math.abs(n).toLocaleString('en-US')}`;

/** A risky chance after the Welfare Manager, who halves it (#324, #325). */
export function effectiveChance(p: number, risk: boolean | undefined, welfare: boolean): number {
  return risk && welfare ? p * WILDCARDS.WELFARE_CHANCE : p;
}

const formatPct = (p: number): string => {
  const n = Math.round(p * 1000) / 10;
  return Number.isInteger(n) ? `${n.toFixed(0)}%` : `${n}%`;
};

const banPhrase = (weeks: number | readonly [number, number]): string =>
  (typeof weeks === 'number' ? `a ${weeks}-week ban` : `a ${weeks[0]}-${weeks[1]} week ban`);

/** Short summary of what effects do, for choice buttons and news lines. */
export function describeEffects(effects: readonly EventEffect[], opts?: { welfare?: boolean }): string {
  const parts = effectParts(effects, opts);
  return parts.length > 0 ? parts.join(' · ') : 'no effect';
}

/** A chance as one line: "25% risk: a 2-3 week ban, −$2,500, reputation -2" (#346). */
function chanceLine(e: Extract<EventEffect, { kind: 'chance' }>, opts?: { welfare?: boolean }): string {
  const p = effectiveChance(e.p, e.risk, opts?.welfare === true);
  const hit = effectParts(e.hit, opts);
  return `${formatPct(p)} ${e.risk ? 'risk' : 'chance'}: ${hit.length > 0 ? hit.join(', ') : 'no effect'}`;
}

/**
 * A choice for its card (#346): what is certain, and each chance on a line of its
 * own, so a risk never reads like a cost that always comes. `sure` is '' when the
 * choice has only chances.
 */
export function describeChoice(effects: readonly EventEffect[], opts?: { welfare?: boolean }): { sure: string; risks: string[] } {
  const sure = effectParts(effects.filter((e) => e.kind !== 'chance'), opts);
  const risks = effects.flatMap((e) => (e.kind === 'chance' ? [chanceLine(e, opts)] : []));
  return { sure: sure.length > 0 ? sure.join(' · ') : risks.length > 0 ? '' : 'no effect', risks };
}

function effectParts(effects: readonly EventEffect[], opts?: { welfare?: boolean }): string[] {
  return effects.flatMap((e): string[] => {
    switch (e.kind) {
      case 'money': return [dollars(e.amount)];
      case 'reputation': return [`reputation ${signed(e.amount)}`];
      case 'squadMorale': return [`squad morale ${signed(e.amount)}`];
      case 'playerMorale': return [`morale ${signed(e.amount)}`];
      case 'playerWage': return [`wage ${signed(Math.round(e.pct * 100))}%`];
      case 'playerTrait': return [`${TRAITS[e.trait].name} trait`];
      case 'signSubject': return ['sign them for the fee'];
      case 'suspend': return [banPhrase(e.weeks)];
      case 'boardPatience': return [`board patience ${signed(e.amount)}`];
      case 'flag': return [];
      case 'closeGates': return ['gates closed (no ticket income)'];
      case 'chance': return [chanceLine(e, opts)];
      case 'modifier': {
        const what = describeEffects(e.effects, opts);
        if (e.trigger === 'weekly') return [`${what} a week for ${e.weeks} weeks`];
        if (e.weeks === 1) return [`${what} if you ${e.trigger === 'win' ? 'win' : 'lose'} next week`];
        return [`${what} a ${e.trigger} for ${e.weeks} weeks`];
      }
    }
  });
}

// ── Drawing ──────────────────────────────────────────────────────────────────

/** The player's fit, signed squad members (juniors are not first-graders yet). */
function fitSquad(state: GameState): Player[] {
  return state.squad.filter((p) => isFieldable(p) && !p.junior);
}

/**
 * How likely a trip or a night out is to land on this player (#325). A hothead
 * and a low-morale player weigh more. A star is not singled out, and can still
 * be the one.
 */
export function incidentWeight(p: Player): number {
  return 1 + traitLevel(p.traits, 'hothead') * 2 + (p.morale < 45 ? 2 : 0);
}

/** Who an incident can land on: fit seniors, or any senior if the whole squad is out. */
function incidentPool(state: GameState): Player[] {
  const seniors = state.squad.filter((p) => !p.junior);
  const fit = seniors.filter((p) => isFieldable(p));
  return [...(fit.length > 0 ? fit : seniors)].sort((a, b) => a.id.localeCompare(b.id));
}

function pickWeightedPlayer(players: readonly Player[], rng: Rng, weight: (p: Player) => number): Player | null {
  const total = players.reduce((t, p) => t + weight(p), 0);
  if (total <= 0 || players.length === 0) return null;
  let roll = rng.next() * total;
  for (const p of players) {
    roll -= weight(p);
    if (roll < 0) return p;
  }
  return players[players.length - 1] ?? null;
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
    case 'rivalStar': return rivalStars(state).map((r) => r.player);
  }
}

/**
 * Each rival's best fit player who would walk into the player's starting side
 * (beats its ON_FIELD-th best), and whom the club could afford and fit (#74).
 * The fee is the Recruit screen's signingFee (by rating and age, less the Scout
 * Office discount; N12), so the card is never a cheaper way to the same star:
 * four weeks' wages made an 85 about $13k.
 */
export function rivalStars(state: GameState): { club: RivalClub; player: Player; fee: number }[] {
  if (state.squad.length >= SQUAD_CAP) return [];
  const own = state.squad.map(overallRating).sort((a, b) => b - a);
  const cut = own[Math.min(ON_FIELD, own.length) - 1] ?? 0;
  const out: { club: RivalClub; player: Player; fee: number }[] = [];
  for (const club of state.league.clubs) {
    if (club.id === PLAYER_ID || !club.squad) continue;
    const best = club.squad.filter((p) => p.injuredWeeks <= 0)
      .sort((a, b) => overallRating(b) - overallRating(a) || a.id.localeCompare(b.id))[0];
    if (!best || overallRating(best) <= cut) continue;
    const fee = signingFee(state, best);
    if (fee <= state.money) out.push({ club, player: best, fee });
  }
  return out;
}

/** The player club's fixture in `round`, if any. */
function fixtureInRound(state: GameState, round: number) {
  return state.league.fixtures.find((f) => f.round === round && (f.homeId === PLAYER_ID || f.awayId === PLAYER_ID));
}

/** Is `card` allowed this week? `now` is the absolute week of the tick drawing it.
 *  Pass `{ rollover: true }` from the season hook; the weekly draw leaves it off,
 *  so a trip card is never drawn mid-season. */
export function isEligible(card: EventCardDef, state: GameState, now: number, opts?: { rollover?: boolean }): boolean {
  const deck = state.eventDeck;
  if ((card.when?.offer === 'rollover') !== (opts?.rollover === true)) return false;
  if ((deck.cooldowns[card.id] ?? 0) > now) return false;
  if (deck.pending.some((p) => p.cardId === card.id)) return false;
  const w = card.when;
  if (w?.flag && !(deck.flags ?? []).includes(w.flag)) return false;
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

/** A card's weight this week: a Welfare Manager (N14.5) halves the players' grievance cards. */
export function cardWeight(card: EventCardDef, state: Pick<GameState, 'staff'>): number {
  return WELFARE_CARDS.has(card.id) && hasStaff(state, 'welfare') ? card.weight / 2 : card.weight;
}

/** Weighted pick; null when nothing is eligible. */
function pickWeighted(cards: readonly EventCardDef[], rng: Rng, weight: (c: EventCardDef) => number): EventCardDef | null {
  const total = cards.reduce((t, c) => t + weight(c), 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const c of cards) {
    roll -= weight(c);
    if (roll < 0) return c;
  }
  return cards[cards.length - 1] ?? null;
}

/**
 * Maybe draw this week's card. Nothing is drawn while MAX_PENDING cards wait,
 * within MIN_GAP_WEEKS of the last card, or when the weekly roll misses.
 */
/** Pending cards that count towards the weekly cap. A season-end trip does not. */
function weeklyPending(pending: readonly PendingEvent[]): PendingEvent[] {
  return pending.filter((p) => cardById(p.cardId)?.when?.offer !== 'rollover');
}

export function drawEvent(state: GameState, now: number, rng: Rng): PendingEvent | null {
  const deck = state.eventDeck;
  if (weeklyPending(deck.pending).length >= EVENTS.MAX_PENDING) return null;
  if (deck.lastDrawn > 0 && now - deck.lastDrawn < EVENTS.MIN_GAP_WEEKS) return null;
  if (rng.next() >= EVENTS.WEEKLY_CHANCE) return null;
  const card = pickWeighted(EVENT_CARDS.filter((c) => isEligible(c, state, now)), rng, (c) => cardWeight(c, state));
  if (!card) return null;
  const ev: PendingEvent = {
    id: `${card.id}-s${state.season}w${state.week}`,
    cardId: card.id,
    season: state.season,
    week: state.week,
    expiresAt: now + EVENTS.ANSWER_WEEKS,
  };
  if (card.subject === 'rivalStar') {
    const pick = rng.pick(rivalStars(state));
    ev.subjectId = pick.player.id;
    ev.subjectName = pick.player.name;
    ev.rivalId = pick.club.id;
    ev.fee = pick.fee;
    ev.vars = {
      rival: pick.club.name, ovr: String(overallRating(pick.player)), position: pick.player.position,
      fee: `$${pick.fee.toLocaleString('en-US')}`,
    };
  } else if (card.subject) {
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
  /** Why the choice couldn't go ahead (replaces its outcome line), e.g. a signing that fell through. */
  failed?: string;
  /** A ban this call actually wrote, so a chance can name the weeks. */
  banned?: { name: string; weeks: number };
  /** Each chance's roll in order, true for a hit, so the outcome says only what happened (#346). */
  rolls?: boolean[];
}

interface EffectCtx {
  cardId: string;
  match?: { season: number; round: number };
  reason: string; // ledger reason for money
  subjectId?: string | undefined;
  subjectName?: string | undefined;
  rivalId?: string | undefined;
  fee?: number | undefined;
  now: number;
  clubName?: string | undefined;
  vars?: Record<string, string> | undefined;
}

const clampRep = (n: number): number => Math.max(1, Math.min(100, n));
const clampPatience = (n: number): number => Math.max(0, Math.min(BOARD.MAX_PATIENCE, n));

const textCtx = (ctx: EffectCtx, subjectName?: string): { subjectName?: string | undefined; clubName: string; vars?: Record<string, string> | undefined } => ({
  subjectName: subjectName ?? ctx.subjectName,
  clubName: ctx.clubName ?? '',
  ...(ctx.vars ? { vars: ctx.vars } : {}),
});

/**
 * Apply effects to state (pure). Effects on a subject who has left the squad do
 * nothing. A chance rolls `rng` (the deck's stream): the incident roll, then
 * the weighted player, then a ban's length, then which story line. Passing no
 * rng is only safe for effects that do not roll.
 */
export function applyEffects(state: GameState, effects: readonly EventEffect[], ctx: EffectCtx, rng: Rng = makeRng(0)): Applied {
  let s = state;
  const money: Applied['money'] = [];
  const news: Applied['news'] = [];
  let failed: string | undefined;
  let banned: Applied['banned'];
  const rolls: boolean[] = [];
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
      case 'signSubject': {
        const r = signRivalPlayer(s, ctx.rivalId, ctx.subjectId, ctx.fee ?? 0);
        if (typeof r === 'string') failed = r;
        else {
          s = r;
          if (ctx.fee) money.push({ amount: -ctx.fee, reason: ctx.reason });
        }
        break;
      }
      case 'suspend': {
        const rolled = typeof e.weeks === 'number' ? e.weeks : rng.int(e.weeks[0], e.weeks[1]);
        const granted = reviewSuspension(s, { weeks: rolled, source: e.source, cause: ctx.reason }, rng);
        const put = withSuspension(s, ctx.subjectId, granted);
        s = put.state;
        if (put.applied && put.name) banned = { name: put.name, weeks: put.standing };
        break;
      }
      case 'boardPatience': s = { ...s, boardPatience: clampPatience(s.boardPatience + e.amount) }; break;
      case 'closeGates': {
        const match = ctx.match ?? { season: s.season, round: s.week + 1 };
        const flag = closedGatesFlag(match.season, match.round);
        if (!s.eventDeck.flags.includes(flag)) s = { ...s, eventDeck: { ...s.eventDeck, flags: [...s.eventDeck.flags, flag] } };
        break;
      }
      case 'flag': {
        const flags = s.eventDeck.flags ?? [];
        if (!flags.includes(e.id)) s = { ...s, eventDeck: { ...s.eventDeck, flags: [...flags, e.id] } };
        break;
      }
      case 'chance': {
        const p = effectiveChance(e.p, e.risk, hasStaff(s, 'welfare'));
        if (rng.next() >= p) {
          rolls.push(false);
          if (e.missNews) news.push({ text: fillText(e.missNews, textCtx(ctx)), kind: 'info' });
          break;
        }
        rolls.push(true);
        let subjectId = ctx.subjectId;
        let subjectName = ctx.subjectName;
        if (e.pick === 'incident') {
          const who = pickWeightedPlayer(incidentPool(s), rng, incidentWeight);
          if (who) { subjectId = who.id; subjectName = who.name; }
        }
        const inner = applyEffects(s, e.hit, { ...ctx, subjectId, subjectName }, rng);
        s = inner.state;
        money.push(...inner.money);
        news.push(...inner.news);
        if (inner.banned) banned = inner.banned;
        const story = e.hitNews.length > 0 ? fillText(rng.pick([...e.hitNews]), textCtx(ctx, subjectName)) : '';
        // The hit's other costs, now that they have happened (the card only said they might).
        const costs = effectParts(e.hit.filter((h) => h.kind !== 'suspend'), { welfare: false });
        const also = costs.length > 0 ? ` Also: ${costs.join(', ')}.` : '';
        if (inner.banned) {
          news.push({ text: `${story}${story ? ' ' : ''}Out ${inner.banned.weeks} weeks.${also}`.trim(), kind: 'danger' });
        } else if (e.hit.some((h) => h.kind === 'suspend')) {
          news.push({ text: `${subjectName ?? 'A player'} was in the news, but the charge didn't stick.${also}`, kind: 'info' });
        } else if (story || also) {
          news.push({ text: `${story}${also}`.trim(), kind: 'info' });
        }
        break;
      }
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
  return { state: s, money, news, ...(failed ? { failed } : {}), ...(banned ? { banned } : {}), ...(rolls.length ? { rolls } : {}) };
}

/**
 * Move a rival's player into the squad on a new contract (pure). Returns the new
 * state, or why it fell through: the player has gone, the squad is full, or the
 * club can't pay the fee.
 */
export function signRivalPlayer(state: GameState, rivalId: string | undefined, playerId: string | undefined, fee: number): GameState | string {
  const club = state.league.clubs.find((c) => c.id === rivalId);
  const player = club?.squad?.find((p) => p.id === playerId);
  if (!club || !player) return 'the player is no longer available';
  if (state.squad.length >= SQUAD_CAP) return 'the squad is full';
  if (state.money < fee) return "the club couldn't afford the fee";
  const signed: Player = {
    ...player, wage: marketWage(player), contractWeeks: NEW_CONTRACT_WEEKS, morale: 70, joinedSeason: state.season,
  };
  const clubs = state.league.clubs.map((c) =>
    (c.id === club.id ? withDerivedStrength({ ...c, squad: c.squad!.filter((p) => p.id !== player.id) }) : c));
  return { ...state, squad: [...state.squad, signed], league: { ...state.league, clubs } };
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
  const rng = makeRng(without.eventDeck.rng);
  const applied = applyEffects(without, choice.effects, {
    cardId: card.id, match: { season: ev.season, round: ev.week + 1 }, reason: `event: ${card.title}`, subjectId: ev.subjectId, subjectName: ev.subjectName,
    rivalId: ev.rivalId, fee: ev.fee, now, clubName: state.clubName, vars: ev.vars,
  }, rng);
  applied.state = { ...applied.state, eventDeck: { ...applied.state.eventDeck, rng: rng.state() } };
  const ctx = { subjectName: ev.subjectName, clubName: state.clubName, vars: ev.vars };
  if (applied.failed) {
    applied.news.push({ text: `${card.title}: no deal, ${applied.failed}.`, kind: 'info' });
    return applied;
  }
  const text = fillText(choice.outcome, ctx);
  const fee = ev.fee && choice.effects.some((e) => e.kind === 'signSubject') ? ` (−$${ev.fee.toLocaleString('en-US')})` : '';
  applied.news.unshift({
    text: `${auto ? 'No answer, so: ' : ''}${text}${fee || outcomeTail(choice.effects, applied.rolls)}`,
    kind: 'info',
  });
  return applied;
}

/**
 * What a choice did, after its rolls (#346): the sure effects only. A risk that
 * did not come off says so ("No incident: squad morale +6."); one that did posts
 * its own line with its costs, so they are never listed here as if certain.
 */
export function outcomeTail(effects: readonly EventEffect[], rolls: readonly boolean[] = []): string {
  if (effects.length === 0) return '';
  const { sure } = describeChoice(effects);
  const chances = effects.some((e) => e.kind === 'chance');
  if (chances && rolls.length > 0 && rolls.every((hit) => !hit)) return ` No incident${sure ? `: ${sure}` : ''}.`;
  return sure ? ` (${sure})` : '';
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
        news.push({ text: `${m.label}: ${describeEffects(m.effects)}.`, kind: m.trigger === 'loss' ? 'info' : 'success' });
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
/** Count a ban down by one week. The medics do not hurry it (#324). */
function tickSuspensions(state: GameState): GameState {
  if (!state.squad.some((p) => (p.suspendedWeeks ?? 0) > 0)) return state;
  return {
    ...state,
    squad: state.squad.map((p) => {
      const weeks = p.suspendedWeeks ?? 0;
      return weeks > 0 ? { ...p, suspendedWeeks: weeks - 1 } : p;
    }),
  };
}

export function eventsTick(state: GameState): EventsTick {
  const now = absWeek(state.season, state.week);
  const mods = tickModifiers(tickSuspensions(state), now);
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
  setState({
    squad: a.state.squad, reputation: a.state.reputation, boardPatience: a.state.boardPatience,
    eventDeck: a.state.eventDeck, league: a.state.league,
  });
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

/**
 * Offer season-end cards (the season-end trip) once the new season's week 1 has
 * begun. An unanswered trip expires the same week, and the pre-match hook
 * takes its default before that match.
 */
export function applySeasonEvents(state: GameState): GameState {
  if (state.sacked) return state;
  const now = absWeek(state.season, state.week);
  const pending = [...state.eventDeck.pending];
  const cooldowns = { ...state.eventDeck.cooldowns };
  let added = false;
  for (const card of EVENT_CARDS) {
    const probe: GameState = { ...state, eventDeck: { ...state.eventDeck, pending, cooldowns } };
    if (!isEligible(card, probe, now, { rollover: true })) continue;
    pending.push({
      id: `${card.id}-s${state.season}w${state.week}`,
      cardId: card.id,
      season: state.season,
      week: state.week,
      expiresAt: now,
    });
    cooldowns[card.id] = now + card.cooldown;
    added = true;
  }
  if (!added) return state;
  return { ...state, eventDeck: { ...state.eventDeck, pending, cooldowns } };
}

/** Take the default on a season-end card whose answer window has closed. */
export function resolveDueRollovers(state: GameState, now: number): Applied {
  let s = state;
  const money: Applied['money'] = [];
  const news: Applied['news'] = [];
  for (const ev of [...s.eventDeck.pending]) {
    const card = cardById(ev.cardId);
    if (card?.when?.offer !== 'rollover' || ev.expiresAt > now) continue;
    const r = resolveEvent(s, ev.id, card.defaultChoice, now, true);
    if (!r) continue;
    s = r.state;
    money.push(...r.money);
    news.push(...r.news);
  }
  if (s === state) return { state, money, news };
  return { state: s, money, news };
}

/** Put one card in front of the player. The e2e hook uses it to open a choice. */
export function plantPending(cardId: string): boolean {
  const card = cardById(cardId);
  if (!card) return false;
  const s = getState();
  const now = absWeek(s.season, s.week);
  const ev: PendingEvent = {
    id: `${cardId}-show`,
    cardId,
    season: s.season,
    week: s.week,
    expiresAt: now + (card.when?.offer === 'rollover' ? 0 : EVENTS.ANSWER_WEEKS),
  };
  if (card.subject && card.subject !== 'rivalStar') {
    const who = subjectCandidates(s, card.subject)[0];
    if (who) { ev.subjectId = who.id; ev.subjectName = who.name; }
  }
  setState({
    eventDeck: { ...s.eventDeck, pending: [ev, ...s.eventDeck.pending.filter((p) => p.cardId !== cardId)] },
  });
  return true;
}

/** Install the weekly events hook, the pre-match trip default, and the season offer. */
export function registerEventsSystem(): void {
  registerTickHook('events-rollover', TICK_ORDER.match - 5, () => {
    const s = getState();
    if (s.sacked) return;
    const due = resolveDueRollovers(s, absWeek(s.season, s.week));
    if (due.state !== s) commit(due);
  });
  registerTickHook('events', EVENTS_TICK_ORDER, () => {
    const s = getState();
    if (s.sacked) return;
    commit(eventsTick(s));
  });
  registerSeasonHook('events-season', 25, () => {
    const s = getState();
    const next = applySeasonEvents(s);
    if (next === s) return;
    setState({ eventDeck: next.eventDeck });
    for (const ev of next.eventDeck.pending) {
      if (s.eventDeck.pending.some((p) => p.id === ev.id)) continue;
      const card = cardById(ev.cardId);
      if (card) bus.emit('ui:notify', { text: `Decision needed: ${card.title}. Open News to choose.`, kind: 'info' });
    }
  });
}
