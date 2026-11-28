import { describe, expect, it } from 'vitest';
import { createNewGame, newCardWeek, type OfferedCard, type StaffMember } from '../../src/core/state';
import { CARD_WEEK } from '../../src/data/cards';
import { PLAYS_BY_ID, PLAY_IDS } from '../../src/data/plays';
import { advanceStaffCardCadence, coachedPlayCandidates, retainStaffCards, supplyStaffPick } from '../../src/systems/cardWeekStaff';

const hire = (role: StaffMember['role'], cardSupplyMatches?: number): StaffMember =>
  ({ role, name: role, wage: 100, hiredSeason: 1, ...(cardSupplyMatches === undefined ? {} : { cardSupplyMatches }) });

const ordinary: OfferedCard[] = [
  { cardId: 'cashInjection', kind: 'cash' },
  { cardId: 'lastLine', kind: 'trait' },
  { cardId: 'playmaker', kind: 'trait' },
  { cardId: 'wreckingBall', kind: 'trait' },
  { cardId: 'finisher', kind: 'trait' },
];

describe('League staff card cadence and seeded substitution', () => {
  it('counts three matches, waits without a candidate, then resets just the supplying hire', () => {
    const interval = CARD_WEEK.STAFF_SUPPLY_MATCHES;
    const disabled = hire('analyst');
    const staff = [hire('welfare'), disabled];
    const one = advanceStaffCardCadence(staff);
    const two = advanceStaffCardCadence(one);
    expect(two[0]?.cardSupplyMatches).toBe(interval - 1);
    expect(two[1]).toBe(disabled);
    expect(supplyStaffPick(two, ordinary, 14, () => [ordinary[0]!])).toEqual({ staff: two, cards: ordinary, rng: 14 });
    const due = advanceStaffCardCadence(two);
    const noGift = supplyStaffPick(due, ordinary, 14, () => []);
    expect(noGift).toEqual({ staff: due, cards: ordinary, rng: 14 });
    expect(advanceStaffCardCadence(due)).toBe(due);
    const given = supplyStaffPick(due, ordinary, 14, () => [ordinary[0]!]);
    expect(given.staff[0]?.cardSupplyMatches).toBe(0);
    expect(given.cards).toHaveLength(ordinary.length);
    expect(given.cards.find(card => card.staffSource === 'welfare')?.cardId).toBe(ordinary[0]!.cardId);
    expect(given.staff[1]).toBe(disabled);
    expect(given.rng).not.toBe(14);
    expect(supplyStaffPick([hire('welfare')], ordinary, given.rng, () => [ordinary[0]!]).cards).toBe(ordinary);
  });

  it('places two due gifts without widening the pick, duplicating a card or moving any other stream', () => {
    const staff = (['welfare', 'attackCoach'] as const).map(role => hire(role, CARD_WEEK.STAFF_SUPPLY_MATCHES));
    const given = (seed: number) => supplyStaffPick(staff, ordinary, seed, source =>
      [source === 'welfare' ? ordinary[1]! : { cardId: 'setPlay', kind: 'setPlay', playId: PLAY_IDS[0]! }]);
    const positions = new Set<number>();
    for (let seed = 0; seed < 32; seed++) {
      const result = given(seed);
      expect(result).toEqual(given(seed));
      expect(result.cards).toHaveLength(5);
      expect(new Set(result.cards.map(card => card.cardId)).size).toBe(5);
      expect(new Set(result.cards.flatMap(card => card.staffSource ?? [])).size).toBe(2);
      expect(result.staff.every(member => member.cardSupplyMatches === 0)).toBe(true);
      positions.add(result.cards.findIndex(card => card.staffSource === 'welfare'));
    }
    expect(positions.size).toBe(5);
    expect(ordinary.every(card => !('staffSource' in card))).toBe(true);
  });

  it('does not show the same set play twice when the normal draw and staff choose it', () => {
    const playId = PLAY_IDS[0]!;
    const normal = [{ cardId: 'setPlay', kind: 'setPlay' as const, playId }, ...ordinary.slice(1)];
    const gift = { cardId: `staff-play:${playId}`, kind: 'setPlay' as const, playId };
    const staff = [hire('attackCoach', CARD_WEEK.STAFF_SUPPLY_MATCHES)];
    for (let seed = 0; seed < 20; seed++) {
      const given = supplyStaffPick(staff, normal, seed, () => [gift]);
      expect(given.cards).toHaveLength(5);
      expect(given.cards.filter(c => c.kind === 'setPlay')).toEqual([{ ...gift, staffSource: 'attackCoach' }]);
      expect(given.cards.filter(c => c.kind !== 'setPlay').map(c => c.cardId).sort()).toEqual(normal.slice(1).map(c => c.cardId).sort());
    }
  });

  it('preserves each exact gifted face when ordinary slots are rerolled, even if the pool shrank', () => {
    const given = supplyStaffPick([hire('welfare', CARD_WEEK.STAFF_SUPPLY_MATCHES)], ordinary, 29, () => [ordinary[1]!]);
    const fresh = ordinary.filter(c => c.cardId !== ordinary[1]!.cardId).slice(0, 2);
    const rerolled = retainStaffCards(given.cards, fresh);
    const gift = given.cards.find(card => card.staffSource)!;
    expect(rerolled).toHaveLength(3);
    expect(rerolled.find(card => card.staffSource)).toBe(gift);
    expect(rerolled.filter(card => !card.staffSource)).toEqual(fresh);
  });

  it('teaches only unowned, not already waiting plays in the current coach’s speciality', () => {
    const direct = PLAY_IDS.filter(id => PLAYS_BY_ID[id].family === 'direct');
    expect(direct.length).toBeGreaterThan(1);
    const coach: StaffMember = { ...hire('attackCoach'), speciality: 'direct' };
    const starter = { ...createNewGame('Staff QA', 31), staff: [coach], cardWeek: newCardWeek(31) };
    const initial = coachedPlayCandidates(starter, coach);
    expect(initial).toEqual(direct.map(playId => ({ cardId: `staff-play:${playId}`, kind: 'setPlay', playId })));
    const later = { ...starter, playbook: { owned: [direct[0]!] }, cardWeek: { ...starter.cardWeek,
      offers: [{ kind: 'match' as const, season: 1, week: 3, cards: [initial[1]!], keptCardIds: [] }] } };
    expect(coachedPlayCandidates(later, coach).map(c => c.cardId)).toEqual(initial.slice(2).map(c => c.cardId));
    expect(coachedPlayCandidates(later, hire('welfare'))).toEqual([]);
  });
});
