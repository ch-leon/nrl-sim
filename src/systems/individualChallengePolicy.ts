// Finite exact Auto coach. All inputs to this module are public at a checkpoint.

import {
  CHALLENGE_CALL_COST, CHALLENGE_OUTCOME_COUNT,
  type ChallengeActionPreview, type ChallengeActor, type ChallengeCall, type ChallengeCheckpoint,
  type ChallengeEdition, type ChallengeProgress, type ChallengeScore,
} from '../data/individualChallengeRules';
import {
  advanceChallengeProgress, challengeCalls, challengeCheckpoint, previewChallengeAction,
} from './individualChallengeEngine';

export const CHALLENGE_POLICY_VERSION = 1;
const EQUALITY_TOLERANCE = 1e-12;
const SCORES = [0, 1, 2] as const satisfies readonly ChallengeScore[];

export interface ChallengePolicyValue {
  readonly titleProbability: number;
  readonly expectedMargin: number;
}

export interface ChallengePolicyDecision extends ChallengePolicyValue {
  readonly call: ChallengeCall;
}

function isBetter(candidate: ChallengePolicyDecision, best: ChallengePolicyDecision): boolean {
  const probabilityGain = candidate.titleProbability - best.titleProbability;
  if (Math.abs(probabilityGain) > EQUALITY_TOLERANCE) return probabilityGain > 0;
  const marginGain = candidate.expectedMargin - best.expectedMargin;
  if (Math.abs(marginGain) > EQUALITY_TOLERANCE) return marginGain > 0;
  return CHALLENGE_CALL_COST[candidate.call] < CHALLENGE_CALL_COST[best.call];
}

/** Recreate when the edition, rules or frozen actor changes. Reuse within one contest. */
export function createChallengePolicy(edition: ChallengeEdition, actor: ChallengeActor) {
  const decisions = new Map<string, ChallengePolicyDecision>();
  const previews = new Map<string, ChallengeActionPreview>();

  const preview = (checkpoint: ChallengeCheckpoint, call: ChallengeCall): ChallengeActionPreview => {
    // Rival energy is fully described by its state in the fixed clash sequence.
    const key = `${checkpoint.clashIndex}/${checkpoint.playerEnergy}/${call}`;
    const cached = previews.get(key);
    if (cached) return cached;
    const action = previewChallengeAction(checkpoint, call);
    previews.set(key, action);
    return action;
  };

  const evaluate = (progress: ChallengeProgress): ChallengePolicyValue => {
    const decision = choose(progress);
    return decision ?? {
      titleProbability: Number(progress.result === 'won'),
      expectedMargin: progress.playerScore - progress.crewScore,
    };
  };

  const valueOf = (progress: ChallengeProgress, checkpoint: ChallengeCheckpoint, call: ChallengeCall): ChallengePolicyValue => {
    const action = preview(checkpoint, call);
    let titleCount = 0;
    let marginCount = 0;
    for (const score of SCORES) {
      const count = action.counts[score];
      if (!count) continue;
      const next = evaluate(advanceChallengeProgress(progress, { ...action, score }));
      titleCount += next.titleProbability * count;
      marginCount += next.expectedMargin * count;
    }
    return { titleProbability: titleCount / CHALLENGE_OUTCOME_COUNT, expectedMargin: marginCount / CHALLENGE_OUTCOME_COUNT };
  };

  const choose = (progress: ChallengeProgress): ChallengePolicyDecision | null => {
    if (progress.result !== null) return null;
    const scoreDifference = progress.playerScore - progress.crewScore;
    const key = `${progress.clashIndex}/${progress.playerEnergy}/${scoreDifference}`;
    const cached = decisions.get(key);
    if (cached) return cached;
    const checkpoint = challengeCheckpoint(edition, actor, progress);
    if (!checkpoint) return null;

    let best: ChallengePolicyDecision | null = null;
    for (const call of challengeCalls(checkpoint)) {
      const candidate = { call, ...valueOf(progress, checkpoint, call) };
      // Equal candidates keep the first call in the edition's fixed action order.
      if (!best || isBetter(candidate, best)) best = candidate;
    }

    if (best) decisions.set(key, best);
    return best;
  };

  return {
    choose, evaluate,
    evaluateAction(progress: ChallengeProgress, call: ChallengeCall): ChallengePolicyValue | null {
      const checkpoint = challengeCheckpoint(edition, actor, progress);
      return checkpoint && challengeCalls(checkpoint).includes(call) ? valueOf(progress, checkpoint, call) : null;
    },
    metrics: () => ({ valueStates: decisions.size, classifications: previews.size * CHALLENGE_OUTCOME_COUNT }),
  };
}
