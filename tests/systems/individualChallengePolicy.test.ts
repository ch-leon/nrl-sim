import { describe, expect, it } from 'vitest';
import { ATTACK_CALLS, CHALLENGE_EDITIONS, DEFENCE_CALLS, type ChallengeActor, type ChallengeCall, type ChallengeEdition, type ChallengeOpponent, type ChallengeProgress, type ChallengeScore } from '../../src/data/individualChallengeRules';
import { advanceChallengeProgress, challengeCheckpoint, initialChallengeProgress, resolveChallengeAction } from '../../src/systems/individualChallengeEngine';
import { createChallengePolicy } from '../../src/systems/individualChallengePolicy';

const edition = CHALLENGE_EDITIONS.showground;
const actor: ChallengeActor = {
  id: 'fixture', name: 'Fixture', ratings: { strength: 50, speed: 52, footyIQ: 54, stamina: 50 }, traits: [],
};
const cost: Readonly<Record<ChallengeCall, number>> = { power: 18, angle: 14, controlled: 7, shoot: 18, track: 14, wrap: 7 };

/** Unmemoized tree. Fold equivalent rolls from actual clash records at each branch. */
function brute(
  progress: ChallengeProgress, edition: ChallengeEdition = CHALLENGE_EDITIONS.showground, entrant: ChallengeActor = actor,
): { titleProbability: number; expectedMargin: number; call: ChallengeCall | null } {
  const checkpoint = challengeCheckpoint(edition, entrant, progress);
  const margin = progress.playerScore - progress.crewScore;
  if (!checkpoint) return { titleProbability: Number(progress.result === 'won'), expectedMargin: margin, call: null };

  const calls = checkpoint.role === 'carry' ? ATTACK_CALLS : DEFENCE_CALLS;
  const choices = calls.map(call => {
    const groups = new Map<ChallengeScore, { next: ChallengeProgress; count: number }>();
    for (let j = -12; j <= 12; j++) {
      const clash = resolveChallengeAction(checkpoint, call, j);
      const group = groups.get(clash.score);
      if (group) group.count++;
      else groups.set(clash.score, { next: advanceChallengeProgress(progress, clash), count: 1 });
    }
    let titleProbability = 0;
    let expectedMargin = 0;
    for (const group of groups.values()) {
      const next = brute(group.next, edition, entrant);
      titleProbability += next.titleProbability * group.count / 25;
      expectedMargin += next.expectedMargin * group.count / 25;
    }
    return { titleProbability, expectedMargin, call };
  });
  return choices.sort((a, b) => {
    if (Math.abs(a.titleProbability - b.titleProbability) > 1e-12) return b.titleProbability - a.titleProbability;
    if (Math.abs(a.expectedMargin - b.expectedMargin) > 1e-12) return b.expectedMargin - a.expectedMargin;
    return cost[a.call] - cost[b.call];
  })[0];
}

describe('individual challenge Auto policy', () => {
  it('agrees with a brute force tree for a finish, a possible bonus, and an already decided title', () => {
    const policy = createChallengePolicy(edition, actor);
    for (const progress of [
      { clashIndex: 5, playerEnergy: 30, playerScore: 3, crewScore: 2, result: null },
      { clashIndex: 6, playerEnergy: 5, playerScore: 3, crewScore: 3, result: null },
      { clashIndex: 5, playerEnergy: 15, playerScore: 4, crewScore: 1, result: null },
    ] satisfies ChallengeProgress[]) {
      const expected = brute(progress);
      const decision = policy.choose(progress)!;
      expect(decision.call).toBe(expected.call);
      expect(decision.titleProbability).toBeCloseTo(expected.titleProbability, 12);
      expect(decision.expectedMargin).toBeCloseTo(expected.expectedMargin, 12);
    }
  });

  it.each([
    { editionId: 'showground', archetype: 'balanced', ratings: { strength: 45, speed: 45, stamina: 45, footyIQ: 45 }, prefix: ['power'] },
    { editionId: 'showground', archetype: 'speed', ratings: { strength: 40, speed: 60, stamina: 40, footyIQ: 40 }, prefix: ['angle', 'track'] },
    { editionId: 'invitational', archetype: 'balanced', ratings: { strength: 60, speed: 60, stamina: 60, footyIQ: 60 }, prefix: ['power'] },
    { editionId: 'invitational', archetype: 'power', ratings: { strength: 65, speed: 48, stamina: 58, footyIQ: 54 }, prefix: ['power', 'wrap'] },
  ] as const)('agrees with the full remaining tree for $editionId and the $archetype entrant', ({ editionId, ratings, prefix }) => {
    const rules = CHALLENGE_EDITIONS[editionId];
    const entrant = { ...actor, ratings };
    let progress = initialChallengeProgress(entrant);
    for (const call of prefix) {
      const checkpoint = challengeCheckpoint(rules, entrant, progress)!;
      progress = advanceChallengeProgress(progress, resolveChallengeAction(checkpoint, call, 0));
    }
    const expected = brute(progress, rules, entrant);
    const policy = createChallengePolicy(rules, entrant);
    expect(policy.choose(progress)?.call).toBe(expected.call);
    const actual = policy.evaluate(progress);
    expect(actual.titleProbability).toBeCloseTo(expected.titleProbability, 12);
    expect(actual.expectedMargin).toBeCloseTo(expected.expectedMargin, 12);
  });

  it('takes only public state and memoizes the bounded initial solve', () => {
    const initial = initialChallengeProgress(actor);
    const policy = createChallengePolicy(edition, actor);
    const first = policy.choose(initial);
    const metrics = policy.metrics();
    expect(first).toEqual(createChallengePolicy(edition, actor).choose({ ...initial }));
    expect(policy.choose({ ...initial })).toEqual(first);
    expect(policy.metrics()).toEqual(metrics);
    expect(metrics.valueStates).toBeGreaterThan(0);
    expect(metrics.valueStates).toBeLessThan(10504);
    expect(metrics.classifications).toBeGreaterThan(0);
    expect(metrics.classifications).toBeLessThan(787800);
  });

  it('evaluates a selected call with exact optimal continuation and no outcome roll', () => {
    const progress: ChallengeProgress = { clashIndex: 5, playerEnergy: 17, playerScore: 3, crewScore: 2, result: null };
    const checkpoint = challengeCheckpoint(edition, actor, progress)!;
    const policy = createChallengePolicy(edition, actor);
    for (const call of DEFENCE_CALLS) {
      let titleProbability = 0;
      let expectedMargin = 0;
      for (let j = -12; j <= 12; j++) {
        const next = brute(advanceChallengeProgress(progress, resolveChallengeAction(checkpoint, call, j)));
        titleProbability += next.titleProbability / 25;
        expectedMargin += next.expectedMargin / 25;
      }
      const value = policy.evaluateAction(progress, call)!;
      expect(value.titleProbability).toBeCloseTo(titleProbability, 12);
      expect(value.expectedMargin).toBeCloseTo(expectedMargin, 12);
    }
    expect(policy.evaluateAction(progress, 'power')).toBeNull();
  });

  it('prefers lower energy cost after equal title and personal-best values', () => {
    const dominant = { ...actor, ratings: { strength: 100, speed: 100, footyIQ: 100, stamina: 100 } };
    const novice = (opponent: ChallengeOpponent): ChallengeOpponent => ({
      ...opponent, ratings: { strength: 1, speed: 1, footyIQ: 1, stamina: 1 },
    });
    const [gaz, danny, mick] = edition.opponents;
    const easyEdition = { ...edition, opponents: [novice(gaz), novice(danny), novice(mick)] as const };
    const result = createChallengePolicy(easyEdition, dominant).choose(initialChallengeProgress(dominant));
    expect(result).toMatchObject({ call: 'controlled' });
    expect(result?.titleProbability).toBeCloseTo(1, 12);
    expect(result?.expectedMargin).toBeCloseTo(6, 12);
  });
});
