// Versioned rules for Big Mick's Break the Line (#710). An active save keeps
// its edition and rule version so new tuning can't reinterpret an old result.

import type { TraitInstance, TraitLevel } from './traits';

export const CHALLENGE_RULE_VERSION = 1;
export const REGULAR_CHALLENGE_CLASHES = 6;
export const CHALLENGE_ROLL_MIN = -12;
export const CHALLENGE_ROLL_MAX = 12;
export const CHALLENGE_SCORE_THRESHOLD10 = 90;
export const CHALLENGE_OUTCOME_COUNT = CHALLENGE_ROLL_MAX - CHALLENGE_ROLL_MIN + 1;

export const ATTACK_CALLS = ['power', 'angle', 'controlled'] as const;
export const DEFENCE_CALLS = ['shoot', 'track', 'wrap'] as const;
export type ChallengeAttackCall = typeof ATTACK_CALLS[number];
export type ChallengeDefenceCall = typeof DEFENCE_CALLS[number];
export type ChallengeCall = ChallengeAttackCall | ChallengeDefenceCall;

export const CHALLENGE_JITTER10: Readonly<Record<ChallengeDefenceCall, number>> = { shoot: 40, track: 32, wrap: 22 };
export const CHALLENGE_TRAIT_BONUS: Readonly<Record<TraitLevel, number>> = { 1: 1, 2: 2, 3: 3 };

export const CHALLENGE_CALL_COST: Readonly<Record<ChallengeCall, number>> = {
  power: 18, angle: 14, controlled: 7,
  shoot: 18, track: 14, wrap: 7,
};

export const CHALLENGE_CALL_NAMES: Readonly<Record<ChallengeCall, string>> = {
  power: 'Power through', angle: 'Change the angle', controlled: 'Controlled carry',
  shoot: 'Shoot the hit', track: 'Track the hips', wrap: 'Set and wrap',
};

export const CHALLENGE_RATINGS = ['strength', 'speed', 'stamina', 'footyIQ'] as const;
export type ChallengeRatings = Readonly<Record<typeof CHALLENGE_RATINGS[number], number>>;

export interface ChallengeActor {
  readonly id: string;
  readonly name: string;
  readonly ratings: ChallengeRatings;
  readonly traits: readonly Readonly<TraitInstance>[];
}

export interface ChallengeOpponent extends ChallengeActor {
  readonly attack: ChallengeAttackCall;
  readonly defence: ChallengeDefenceCall;
}

export type ChallengeEditionId = 'showground' | 'invitational';
export interface ChallengeEdition {
  readonly id: ChallengeEditionId;
  readonly name: string;
  readonly honour: string;
  readonly bookingStartWeek: number;
  readonly bookingEndWeek: number;
  readonly eventWeek: number;
  readonly returnWeek: number;
  readonly completionXp: number;
  readonly winnerXp: number;
  readonly winnerCash: number;
  readonly requiresFirstTitle: boolean;
  readonly opponents: readonly [ChallengeOpponent, ChallengeOpponent, ChallengeOpponent];
}

export const CHALLENGE_EDITIONS: Readonly<Record<ChallengeEditionId, ChallengeEdition>> = {
  showground: {
    id: 'showground', name: "Big Mick's Break the Line", honour: 'Break the Line Champion',
    bookingStartWeek: 1, bookingEndWeek: 5, eventWeek: 6, returnWeek: 7,
    completionXp: 60, winnerXp: 60, winnerCash: 8000, requiresFirstTitle: false,
    opponents: [
      { id: 'gaz', name: 'Gaz “The Gate”', ratings: { strength: 53, speed: 34, stamina: 48, footyIQ: 40 }, defence: 'wrap', attack: 'power', traits: [] },
      { id: 'danny', name: 'Danny “Quickstep”', ratings: { strength: 35, speed: 55, stamina: 44, footyIQ: 43 }, defence: 'track', attack: 'angle', traits: [] },
      { id: 'mick', name: 'Big Mick', ratings: { strength: 51, speed: 46, stamina: 56, footyIQ: 49 }, defence: 'shoot', attack: 'power', traits: [] },
    ],
  },
  invitational: {
    id: 'invitational', name: "Mick's Invitational", honour: "Mick's Invitational Champion",
    bookingStartWeek: 9, bookingEndWeek: 13, eventWeek: 14, returnWeek: 15,
    completionXp: 80, winnerXp: 80, winnerCash: 16000, requiresFirstTitle: true,
    opponents: [
      { id: 'gaz', name: 'Gaz “The Gate”', ratings: { strength: 67, speed: 43, stamina: 61, footyIQ: 51 }, defence: 'wrap', attack: 'power', traits: [] },
      { id: 'danny', name: 'Danny “Quickstep”', ratings: { strength: 44, speed: 69, stamina: 57, footyIQ: 55 }, defence: 'track', attack: 'angle', traits: [] },
      { id: 'mick', name: 'Big Mick', ratings: { strength: 65, speed: 58, stamina: 70, footyIQ: 63 }, defence: 'shoot', attack: 'power', traits: [{ id: 'hitman', level: 1 }] },
    ],
  },
};

export type ChallengeResult = 'won' | 'lost';
export type ChallengeRole = 'carry' | 'defend';
export type ChallengeScore = 0 | 1 | 2;

export interface ChallengeProgress {
  readonly clashIndex: number;
  readonly playerEnergy: number;
  readonly playerScore: number;
  readonly crewScore: number;
  readonly result: ChallengeResult | null;
}

export interface ChallengeCheckpoint {
  readonly clashIndex: number;
  readonly role: ChallengeRole;
  readonly bonus: boolean;
  readonly player: ChallengeActor;
  readonly opponent: ChallengeOpponent;
  readonly playerEnergy: number;
  readonly opponentEnergy: number;
  readonly playerScore: number;
  readonly crewScore: number;
}

export interface ChallengeTraitCredit extends Readonly<TraitInstance> {
  readonly bonus: number;
}

export type ChallengeReason =
  | { readonly kind: 'fatigue'; readonly side: 'attack' | 'defence'; readonly energy: number; readonly penalty10: number }
  | { readonly kind: 'matchup'; readonly modifier: number }
  | { readonly kind: 'trait'; readonly side: 'attack' | 'defence'; readonly trait: ChallengeTraitCredit }
  | { readonly kind: 'outcome'; readonly score: ChallengeScore };

export interface ChallengeContact {
  readonly clashIndex: number;
  readonly role: ChallengeRole;
  readonly bonus: boolean;
  readonly playerCall: ChallengeCall;
  readonly opponentCall: ChallengeCall;
  readonly attackerId: string;
  readonly defenderId: string;
  readonly attack: ChallengeAttackCall;
  readonly defence: ChallengeDefenceCall;
  readonly attackerEnergyBefore: number;
  readonly attackerEnergyAfter: number;
  readonly defenderEnergyBefore: number;
  readonly defenderEnergyAfter: number;
  readonly playerEnergyAfter: number;
  readonly opponentEnergyAfter: number;
  readonly playerRecovery: number;
  readonly attackAbility10: number;
  readonly defenceAbility10: number;
  readonly fatiguedAttack10: number;
  readonly fatiguedDefence10: number;
  readonly matchup: number;
  readonly attackTrait: ChallengeTraitCredit | null;
  readonly defenceTrait: ChallengeTraitCredit | null;
}

export interface ChallengeClash extends ChallengeContact {
  readonly j: number;
  readonly margin10: number;
  readonly score: ChallengeScore;
  readonly reasons: readonly ChallengeReason[];
}

export interface ChallengeActionPreview extends ChallengeContact {
  /** Equal-weight outcomes, indexed by score. Divide by CHALLENGE_OUTCOME_COUNT for probabilities. */
  readonly counts: readonly [number, number, number];
  readonly reasons: readonly ChallengeReason[];
}
