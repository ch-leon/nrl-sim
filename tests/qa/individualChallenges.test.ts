import { describe, expect, it } from 'vitest';
import { CHALLENGE_EDITIONS } from '../../src/data/individualChallengeRules';
import { challengeClashRoll } from '../../src/systems/individualChallengeEngine';
import { auditChallengeRolls, challengeBalanceActors, compareChallengePolicies, poolTitleSamples, runIndividualChallengeQA } from '../../src/qa/individualChallenges';

describe('individual challenge balance QA', () => {
  it('reports real generated position ratings without filling hidden stats', () => {
    const generated = challengeBalanceActors(932, 1).filter(entry => entry.position);
    expect(new Set(generated.map(entry => entry.positionGroup))).toEqual(new Set(['outside-backs', 'halves', 'hooker', 'forwards']));
    expect(generated).toHaveLength(9);
    for (const entry of generated) {
      for (const hidden of entry.hidden ?? []) {
        expect(entry.actor.ratings[hidden]).toBeGreaterThanOrEqual(10);
        expect(entry.actor.ratings[hidden]).toBeLessThanOrEqual(25);
      }
    }
  });

  it('measures every policy on the same seeded sample and reports exact values separately', () => {
    const balanced = challengeBalanceActors(932, 0)[0];
    const first = compareChallengePolicies(CHALLENGE_EDITIONS.showground, balanced, 128, 817);
    const second = compareChallengePolicies(CHALLENGE_EDITIONS.showground, balanced, 128, 817);
    expect(first.policies).toEqual(second.policies);
    expect(first.policies).toHaveLength(5);
    const auto = first.policies.find(policy => policy.policy === 'auto')!;
    expect(auto.seeded.samples).toBe(128);
    expect(auto.seeded.wins / auto.seeded.samples).toBe(auto.seeded.titleRate);
    expect(auto.seeded.confidence95[0]).toBeLessThanOrEqual(auto.seeded.titleRate);
    expect(auto.seeded.confidence95[1]).toBeGreaterThanOrEqual(auto.seeded.titleRate);
    expect(auto.seeded.callsByClash.slice(0, 6).every(row => Object.values(row).reduce((sum, count) => sum + count, 0) === 128)).toBe(true);
    for (const policy of first.policies) {
      expect(auto.exact.titleProbability + 1e-12).toBeGreaterThanOrEqual(policy.exact.titleProbability);
    }
    expect(first.autoMetrics.classifications).toBeGreaterThan(0);
  });

  it('checks every roll distribution and detects dependence even with uniform marginals', () => {
    const original = auditChallengeRolls(203910);
    expect(original.uniformity).toHaveLength(7);
    expect(original.independence).toHaveLength(21);
    expect(original.problems).toEqual([]);

    const withoutTopBin = auditChallengeRolls(203910, (seed, index) => {
      const roll = challengeClashRoll(seed, index);
      return roll === 12 ? -12 : roll;
    });
    expect(withoutTopBin.uniformity.every(check => check.chiSquare > check.limit)).toBe(true);

    const repeated = auditChallengeRolls(203910, seed => challengeClashRoll(seed, 0));
    expect(repeated.uniformity.every(check => check.chiSquare <= check.limit)).toBe(true);
    expect(repeated.independence.every(check => check.chiSquare > check.limit)).toBe(true);
  });

  it('gates pooled exact and observed wins within a policy', () => {
    const groups = [
      { samples: 4096, wins: 1020, titleProbability: 0.25 },
      { samples: 4096, wins: 2900, titleProbability: 0.70 },
    ];
    const close = poolTitleSamples(groups);
    expect(close.passed).toBe(true);
    expect(close.observedWins).toBe(3920);
    expect(close.expectedWins).toBeCloseTo(3891.2);
    expect(poolTitleSamples(groups.map(group => ({ ...group, wins: group.wins + 300 }))).passed).toBe(false);
    expect(poolTitleSamples([...groups, { samples: 4096, wins: 1, titleProbability: 0 }]).passed).toBe(false);
  });

  it('reports measured gates, all six call witnesses, and both editions', () => {
    const report = runIndividualChallengeQA({ samples: 128, firstSeed: 811, generatedPerPosition: 1 });
    expect(report.cases.filter(entry => entry.actor.position)).toHaveLength(18);
    expect(new Set(report.cases.map(entry => entry.edition))).toEqual(new Set(['showground', 'invitational']));
    expect(report.witnesses.map(witness => witness.call).sort()).toEqual(['angle', 'controlled', 'power', 'shoot', 'track', 'wrap']);
    for (const witness of report.witnesses) {
      expect(witness.alternatives.every(other => witness.titleProbability > other.titleProbability + 1e-12)).toBe(true);
    }
    expect(report.marginWitnesses.length).toBeGreaterThan(0);
    expect(report.pooledTitleSamples).toHaveLength(5);
    expect(report.pooledTitleSamples.every(pool => pool.passed)).toBe(true);
    for (const [i, row] of report.cases.entries()) {
      expect(row.firstSeed).toBe(811 + i * 128);
    }
    expect(report.rollAudit.firstSeed).toBe(811 + report.cases.length * 128);
    expect(report.nearPeerApproach.some(row => row.gainOverMyopic < 0.05 && row.largestBaselineGain >= 0.05)).toBe(true);
    expect(report.generatedGroups).toHaveLength(8);
    expect(report.traits.length).toBeGreaterThan(0);
    expect(report.monotonicStats.every(check => check.gain >= -1e-12)).toBe(true);
    expect(report.correctness.problems).toEqual([]);
    expect(report.gates.filter(gate => !gate.passed)).toEqual([]);
  });
});
