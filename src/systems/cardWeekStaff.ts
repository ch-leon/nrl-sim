// Staff-supplied Card week cards (#862). The settled League interval clocks
// appointments; the card stream supplies and places a card without widening a pick.
import type { GameState, OfferedCard, StaffCardSource, StaffMember } from '../core/state';
import { CARD_WEEK, coachedPlayCardId } from '../data/cards';
import { PLAYS_BY_ID, PLAY_IDS } from '../data/plays';
import { makeRng } from '../utils/rng';
import { ownsPlay } from './playbook';

export type { StaffCardSource } from '../core/state';

export const STAFF_CARD_SOURCE_LABEL: Record<StaffCardSource, string> = {
  welfare: 'your Welfare Manager',
  attackCoach: 'your Attack Coach',
};

/** Missing is an appointment that has not yet watched a League match under this rule. */
export function advanceStaffCardCadence(staff: StaffMember[]): StaffMember[] {
  let changed = false;
  const next = staff.map(member => {
    if ((member.role !== 'welfare' && member.role !== 'attackCoach')
      || (member.cardSupplyMatches ?? 0) >= CARD_WEEK.STAFF_SUPPLY_MATCHES) return member;
    changed = true;
    return { ...member, cardSupplyMatches: (member.cardSupplyMatches ?? 0) + 1 };
  });
  return changed ? next : staff;
}

export function coachedPlayCandidates(state: GameState, coach: StaffMember): OfferedCard[] {
  const cw = state.cardWeek;
  if (!cw || coach.role !== 'attackCoach' || !coach.speciality) return [];
  const waiting = new Set([...cw.hand.map(h => h.cardId), ...cw.offers.flatMap(o => o.cards.map(c => c.cardId))]);
  return PLAY_IDS.filter(id => PLAYS_BY_ID[id].family === coach.speciality && !ownsPlay(state, id)
    && !waiting.has(coachedPlayCardId(id)))
    .map(playId => ({ cardId: coachedPlayCardId(playId), kind: 'setPlay', playId }));
}

function isSameChoice(a: OfferedCard, b: OfferedCard): boolean {
  return a.cardId === b.cardId || (a.kind === 'setPlay' && b.kind === 'setPlay' && a.playId === b.playId);
}

export function supplyStaffPick(
  staff: StaffMember[], cards: OfferedCard[], seed: number,
  candidates: (source: StaffCardSource, member: StaffMember) => OfferedCard[],
): { staff: StaffMember[]; cards: OfferedCard[]; rng: number } {
  let nextCards = cards;
  const rng = makeRng(seed);
  const nextStaff = staff.map(member => {
    const source = member.role;
    if ((source !== 'welfare' && source !== 'attackCoach')
      || (member.cardSupplyMatches ?? 0) < CARD_WEEK.STAFF_SUPPLY_MATCHES) return member;
    const slots = nextCards.flatMap((card, index) => card.staffSource ? [] : [index]);
    if (!slots.length) return member;
    const eligible = candidates(source, member).filter(card =>
      !nextCards.some(queued => queued.staffSource && isSameChoice(queued, card)));
    if (!eligible.length) return member;
    const gift = rng.pick(eligible);
    const slot = rng.pick(slots);
    if (nextCards === cards) nextCards = [...cards];
    const duplicate = slots.find(index => isSameChoice(nextCards[index]!, gift));
    // If the ordinary draw included the same card, move the displaced face
    // there instead of leaving a duplicate or changing the number of choices.
    if (duplicate !== undefined && duplicate !== slot) nextCards[duplicate] = nextCards[slot]!;
    nextCards[slot] = { ...gift, staffSource: source };
    return { ...member, cardSupplyMatches: 0 };
  });
  return { staff: nextCards === cards ? staff : nextStaff, cards: nextCards, rng: rng.state() };
}

/** Retain the exact supplied faces on reroll, not the current staff or eligibility. */
export function retainStaffCards(previous: readonly OfferedCard[], fresh: readonly OfferedCard[]): OfferedCard[] {
  let at = 0;
  return previous.flatMap(card => card.staffSource ? [card] : at < fresh.length ? [fresh[at++]!] : []);
}
