// src/systems/playbook.ts — the club's set plays (#326, plan §2.3, phase 2).
//
// The attack coach opens his family of plays to buy (systems/staff.ts
// ATTACK_COACHES); a play is bought once, with money, booked as
// `play: <id>` (the `facilities` line of the books, economy.classifyReason),
// and kept when the coach leaves. The coach picks up to PLAYS.takeMax of the
// plays he owns to take into a match (Lineup.plays, in order); the half calls
// them himself at the right moments (match/league/plays.ts pickAutoPlay).
// Pure rules here, plus the one write each for a purchase and a pick.
import { bus } from '../core/events';
import { getState, setState, type GameState, type Lineup } from '../core/state';
import { spendMoney } from '../data/club';
import { PLAYS_BY_ID, isPlayId, type PlayId } from '../data/plays';
import { PLAYS } from '../match/league/plays';
import { ATTACK_COACHES, attackCoach } from './staff';

/** The ledger reason a purchase is booked under (the `facilities` line). */
export function playReason(id: PlayId): string {
  return `play: ${id}`;
}

/** The plays the club has bought, known ids only, in the order bought. */
export function ownedPlays(state: Partial<Pick<GameState, 'playbook'>>): PlayId[] {
  return (state.playbook?.owned ?? []).filter(isPlayId);
}

export function ownsPlay(state: Partial<Pick<GameState, 'playbook'>>, id: PlayId): boolean {
  return ownedPlays(state).includes(id);
}

/**
 * Why the club can't buy play `id` now, or null: it's owned already, the
 * club's attack coach doesn't teach it (or there is none), or the money
 * isn't there. The words go on the Playbook's Buy button and its toast.
 */
export function buyRefusal(state: Pick<GameState, 'staff' | 'money' | 'playbook'>, id: PlayId): string | null {
  const play = PLAYS_BY_ID[id];
  if (!play) return 'No such play';
  if (ownsPlay(state, id)) return 'Already yours';
  const coach = attackCoach(state);
  if (!coach || coach.speciality !== play.family) return `Hire the ${ATTACK_COACHES[play.family].short.toLowerCase()} coach`;
  if (state.money < play.price) return 'Not enough money';
  return null;
}

/** Buy play `id` (one-off, the price off the bank). False when refused (buyRefusal says why). */
export function buyPlay(id: PlayId): boolean {
  const s = getState();
  if (buyRefusal(s, id) !== null) return false;
  const play = PLAYS_BY_ID[id];
  if (!spendMoney(play.price, playReason(id))) return false;
  const after = getState();
  setState({ playbook: { owned: [...ownedPlays(after), id] } });
  bus.emit('ui:notify', { text: `${play.name} is in your playbook.`, kind: 'success' });
  return true;
}

/**
 * The plays a lineup takes into the match as the sim will run them: known ids
 * the club owns, each once, at most PLAYS.takeMax, in the coach's order.
 * A play the catalogue has dropped, or one not bought, is left out.
 */
export function validPlays(list: readonly unknown[] | undefined, owned: readonly unknown[] | undefined): PlayId[] {
  const mine = new Set((owned ?? []).filter(isPlayId));
  const out: PlayId[] = [];
  for (const id of list ?? []) {
    if (out.length >= PLAYS.takeMax) break;
    if (isPlayId(id) && mine.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Take play `id` into the match, or leave it out if it's taken: a new play
 * goes on the end, so the order is the order tapped. Refused (the same
 * lineup back) when it isn't owned or three are taken already.
 */
export function togglePlay(lineup: Lineup, id: PlayId, owned: readonly PlayId[]): Lineup {
  const cur = validPlays(lineup.plays, owned);
  if (cur.includes(id)) return { ...lineup, plays: cur.filter((p) => p !== id) };
  if (!owned.includes(id) || cur.length >= PLAYS.takeMax) return lineup;
  return { ...lineup, plays: [...cur, id] };
}
