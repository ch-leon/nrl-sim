import { describe, expect, it } from 'vitest';
import { createNewGame, newCardWeek, type GameState } from '../../src/core/state';
import { withWeeklyFatigue } from '../../src/match/league/sheets';
import { injuryChance } from '../../src/match/league/weather';
import {
  addBonusEventFatigue, applyMatchWeeklyFatigue, recoverWeeklyFatigue, weeklyFatigueOf,
} from '../../src/systems/weeklyFatigue';

type Appearance = 'starter' | 'bench' | 'cup' | 'trial' | 'camp' | 'challenge' | 'rest';

function career() {
  const state = createNewGame('Fatigue FC', 854);
  return { ...state, cardWeek: newCardWeek(854), facilities: [] } satisfies GameState;
}

function weeks(sequence: readonly Appearance[], prior = 0) {
  const initial = career();
  const id = initial.squad[0]!.id;
  let state: GameState = { ...initial, cardWeek: { ...initial.cardWeek, weeklyFatigue: { [id]: prior } } };
  return sequence.flatMap(appearance => {
    state = recoverWeeklyFatigue(state);
    const fatigue = weeklyFatigueOf(state, id);
    switch (appearance) {
      case 'starter': state = applyMatchWeeklyFatigue(state, true, [id], []); break;
      case 'bench': state = applyMatchWeeklyFatigue(state, true, [], [id, id]); break;
      case 'cup': case 'trial': state = applyMatchWeeklyFatigue(state, false, [id], []); break;
      case 'camp': case 'challenge': state = addBonusEventFatigue(state, [id]); break;
    }
    return appearance === 'starter' ? [fatigue] : [];
  });
}

describe('weekly fatigue', () => {
  it('starts at 0, 10, 0 and 10 with a rest between pairs of League matches', () => {
    expect(weeks(['starter', 'starter', 'rest', 'starter', 'starter'])).toEqual([0, 10, 0, 10]);
  });

  it('starts at 20 and 30 after an Open Cup tie, then at 20 after a rest', () => {
    expect(weeks(['starter', 'starter', 'cup', 'starter', 'starter', 'rest', 'starter'])).toEqual([0, 10, 20, 30, 20]);
  });

  it.each(['camp', 'challenge'] as const)('a fresh %s absentee starts his next League match at 0', event => {
    expect(weeks([event, 'starter'])).toEqual([0]);
  });

  it('leaving a player on 20 out of a League match clears his fatigue and saves 30', () => {
    const rested = weeks(['rest', 'starter'], 40);
    const picked = weeks(['starter', 'starter'], 40);
    expect(picked[0]).toBe(20);
    expect(rested).toEqual([0]);
    expect(picked[1]! - rested[0]!).toBe(30);
  });

  it('starts four successive League matches at 0, 10, 20 and 30', () => {
    expect(weeks(['starter', 'starter', 'starter', 'starter'])).toEqual([0, 10, 20, 30]);
  });

  it('uses 24 recovery with both facilities built, regardless of their levels', () => {
    const state = career();
    const [a, b] = state.squad;
    const next = recoverWeeklyFatigue({
      ...state, cardWeek: { ...state.cardWeek, weeklyFatigue: { [a!.id]: 60, [b!.id]: 25 } },
      facilities: [
        { id: 'physio', defId: 'physioCentre', level: 3, x: 0, y: 0 },
        { id: 'medical', defId: 'medicalBay', level: 2, x: 4, y: 4 },
      ],
    });
    expect(weeklyFatigueOf(next, a!.id)).toBe(36);
    expect(weeklyFatigueOf(next, b!.id)).toBe(1);
  });

  it('charges a used League interchange 15 once and an actual trial appearance 20', () => {
    expect(weeks(['bench', 'starter'], 40)).toEqual([15]);
    expect(weeks(['trial', 'starter'], 40)).toEqual([20]);
    const state = career();
    const id = state.squad[0]!.id;
    const tired = applyMatchWeeklyFatigue({
      ...state, cardWeek: { ...state.cardWeek, weeklyFatigue: { [id]: 90 } },
    }, true, [id], [id]);
    expect(weeklyFatigueOf(tired, id)).toBe(100);
  });

  it('puts 80% and 100% starting energy on the sheet and scales the existing risk at strict thresholds', () => {
    const prop = { id: 'prop', name: 'Prop', position: 'prop' as const, injuryRisk: 35 };
    expect(withWeeklyFatigue(prop, 50).startingEnergy).toBe(0.8);
    expect(withWeeklyFatigue(prop, 0).startingEnergy).toBe(1);
    for (const [fatigue, multiplier] of [[60, 1], [61, 1.5], [80, 1.5], [81, 2]] as const) {
      expect(injuryChance(withWeeklyFatigue(prop, fatigue))).toBeCloseTo(injuryChance(prop) * multiplier);
    }
  });
});
