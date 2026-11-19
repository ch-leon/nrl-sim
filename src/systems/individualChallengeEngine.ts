// Pure #710 clash resolution. Checkpoints and previews use only public data.
// Only the owner of a committed clash passes the indexed roll into the resolver.

import type { Player } from '../core/state';
import {
  ATTACK_CALLS, CHALLENGE_CALL_COST, CHALLENGE_JITTER10, CHALLENGE_OUTCOME_COUNT, CHALLENGE_RATINGS, CHALLENGE_ROLL_MAX,
  CHALLENGE_ROLL_MIN, CHALLENGE_SCORE_THRESHOLD10, CHALLENGE_TRAIT_BONUS, DEFENCE_CALLS, REGULAR_CHALLENGE_CLASHES,
  type ChallengeActionPreview, type ChallengeActor, type ChallengeAttackCall, type ChallengeCall,
  type ChallengeCheckpoint, type ChallengeClash, type ChallengeContact, type ChallengeDefenceCall, type ChallengeEdition,
  type ChallengeProgress, type ChallengeReason, type ChallengeScore, type ChallengeTraitCredit,
} from '../data/individualChallengeRules';
import { traitLevel } from '../data/traits';
import { makeRng } from '../utils/rng';

type ActorSource = Pick<Player, 'id' | 'name' | 'stats'> & { traits: ChallengeActor['traits'] };

export function freezeChallengeActor(player: ActorSource): ChallengeActor {
  const rating = (key: typeof CHALLENGE_RATINGS[number]): number => {
    const raw = player.stats[key];
    if (!Number.isFinite(raw)) throw new Error(`Invalid challenge rating for ${key}`);
    return Math.max(1, Math.min(100, Math.floor(raw + 0.5)));
  };
  return {
    id: player.id, name: player.name,
    ratings: { strength: rating('strength'), speed: rating('speed'), stamina: rating('stamina'), footyIQ: rating('footyIQ') },
    traits: player.traits.map(trait => ({ ...trait })),
  };
}

export function challengeEventSeed(careerSeed: number, annualEventId: string): number {
  // FNV-1a over the event-specific domain and annual id. Freeze this mapping
  // with the engine version, independently of league RNG cursors.
  const key = `individual-challenge:${annualEventId}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return (hash ^ careerSeed) >>> 0;
}

export function challengeClashRoll(eventSeed: number, clashIndex: number): number {
  if (!Number.isInteger(clashIndex) || clashIndex < 0 || clashIndex > REGULAR_CHALLENGE_CLASHES) {
    throw new Error('Invalid challenge clash index');
  }
  const rng = makeRng(eventSeed ^ Math.imul(clashIndex + 1, 2654435761));
  // next() is a 32-bit word divided by 2^32. Reject the last incomplete bin.
  const wordCount = 2 ** 32;
  const limit = wordCount - wordCount % CHALLENGE_OUTCOME_COUNT;
  let word: number;
  do {
    word = rng.next() * wordCount;
  } while (word >= limit);
  return CHALLENGE_ROLL_MIN + word % CHALLENGE_OUTCOME_COUNT;
}

export function challengeStartingEnergy(actor: ChallengeActor): number {
  return Math.min(100, 60 + Math.floor(3 * actor.ratings.stamina / 10));
}

export function challengeEffectivenessPercent(energy: number): number {
  return 70 + Math.min(30, energy);
}

export function initialChallengeProgress(player: ChallengeActor): ChallengeProgress {
  return { clashIndex: 0, playerScore: 0, crewScore: 0, playerEnergy: challengeStartingEnergy(player), result: null };
}

const energyAfterCall = (energy: number, call: ChallengeCall): number => Math.max(0, energy - CHALLENGE_CALL_COST[call]);

export function challengeCheckpoint(edition: ChallengeEdition, player: ChallengeActor, progress: ChallengeProgress): ChallengeCheckpoint | null {
  const { clashIndex, playerEnergy, playerScore, crewScore, result } = progress;
  if (result !== null || !Number.isInteger(clashIndex) || clashIndex < 0 || clashIndex > REGULAR_CHALLENGE_CLASHES) return null;
  const bonus = clashIndex === REGULAR_CHALLENGE_CLASHES;
  if (bonus && playerScore !== crewScore) return null;
  const role = clashIndex % 2 === 0 ? 'carry' : 'defend';
  const opponent = edition.opponents[bonus ? 2 : Math.floor(clashIndex / 2)];
  let opponentEnergy = challengeStartingEnergy(opponent);
  if (role === 'defend' || bonus) opponentEnergy = energyAfterCall(opponentEnergy, opponent.defence);
  if (bonus) opponentEnergy = energyAfterCall(opponentEnergy, opponent.attack);
  return { clashIndex, role, bonus, player, opponent, playerEnergy, opponentEnergy, playerScore, crewScore };
}

export function challengeCalls(checkpoint: ChallengeCheckpoint): readonly ChallengeCall[] {
  return checkpoint.role === 'carry' ? ATTACK_CALLS : DEFENCE_CALLS;
}

function isAttackCall(call: unknown): call is ChallengeAttackCall {
  return ATTACK_CALLS.some(allowed => allowed === call);
}

function isDefenceCall(call: unknown): call is ChallengeDefenceCall {
  return DEFENCE_CALLS.some(allowed => allowed === call);
}

function attackAbility(actor: ChallengeActor, call: ChallengeAttackCall): number {
  const { strength, speed, footyIQ } = actor.ratings;
  switch (call) {
    case 'power': return 8 * strength + 2 * footyIQ;
    case 'angle': return 7 * speed + 3 * footyIQ;
    case 'controlled': return Math.max(0, 6 * strength + 4 * footyIQ - 50);
  }
}

function defenceAbility(actor: ChallengeActor, call: ChallengeDefenceCall): number {
  const { strength, speed, footyIQ } = actor.ratings;
  switch (call) {
    case 'shoot': return 7 * strength + 3 * speed;
    case 'track': return 7 * speed + 3 * footyIQ;
    case 'wrap': return 6 * strength + 4 * footyIQ;
  }
}

const MATCHUP: Readonly<Record<ChallengeAttackCall, Readonly<Record<ChallengeDefenceCall, number>>>> = {
  power: { shoot: -4, track: 5, wrap: 4 },
  angle: { shoot: 6, track: -5, wrap: -2 },
  controlled: { shoot: -4, track: 1, wrap: 0 },
};

export function challengeTraitBonus(actor: ChallengeActor, call: ChallengeCall): ChallengeTraitCredit | null {
  switch (call) {
    case 'power': {
      const wreckingBall = traitLevel(actor.traits, 'wreckingBall');
      const dontArgue = traitLevel(actor.traits, 'dontArgue');
      const level = wreckingBall >= dontArgue ? wreckingBall : dontArgue;
      if (!level) return null;
      const id = wreckingBall >= dontArgue ? 'wreckingBall' : 'dontArgue';
      return { id, level, bonus: CHALLENGE_TRAIT_BONUS[level] };
    }
    case 'angle': {
      const level = traitLevel(actor.traits, 'dancingFeet');
      return level ? { id: 'dancingFeet', level, bonus: CHALLENGE_TRAIT_BONUS[level] } : null;
    }
    case 'shoot': {
      const level = traitLevel(actor.traits, 'hitman');
      return level ? { id: 'hitman', level, bonus: CHALLENGE_TRAIT_BONUS[level] } : null;
    }
    default: return null;
  }
}

function calculateContact(checkpoint: ChallengeCheckpoint, playerCall: ChallengeCall): {
  contact: ChallengeContact; baseMargin10: number; jitter: number; reasons: ChallengeReason[];
} {
  const { player, opponent, role, clashIndex, bonus, playerEnergy, opponentEnergy } = checkpoint;
  const carrying = role === 'carry';
  const attack = carrying ? playerCall : opponent.attack;
  const defence = carrying ? opponent.defence : playerCall;
  if (!isAttackCall(attack) || !isDefenceCall(defence)) throw new Error('Invalid challenge call for this role');

  const attacker = carrying ? player : opponent;
  const defender = carrying ? opponent : player;
  const attackerEnergyBefore = carrying ? playerEnergy : opponentEnergy;
  const defenderEnergyBefore = carrying ? opponentEnergy : playerEnergy;
  const attackerEnergyAfter = energyAfterCall(attackerEnergyBefore, attack);
  const defenderEnergyAfter = energyAfterCall(defenderEnergyBefore, defence);
  const playerAfterCost = carrying ? attackerEnergyAfter : defenderEnergyAfter;
  const recoversHere = clashIndex === 1 || clashIndex === 3;
  const playerEnergyAfter = recoversHere ? Math.min(challengeStartingEnergy(player), playerAfterCost + 4) : playerAfterCost;
  const attackAbility10 = attackAbility(attacker, attack);
  const defenceAbility10 = defenceAbility(defender, defence);
  const fatiguedAttack10 = Math.floor(attackAbility10 * challengeEffectivenessPercent(attackerEnergyBefore) / 100);
  const fatiguedDefence10 = Math.floor(defenceAbility10 * challengeEffectivenessPercent(defenderEnergyBefore) / 100);
  const matchup = MATCHUP[attack][defence];
  const attackTrait = challengeTraitBonus(attacker, attack);
  const defenceTrait = challengeTraitBonus(defender, defence);
  const baseMargin10 = fatiguedAttack10 - fatiguedDefence10 + 10 * (matchup + (attackTrait?.bonus ?? 0) - (defenceTrait?.bonus ?? 0));
  const jitter = attack === 'controlled' ? Math.floor(3 * CHALLENGE_JITTER10[defence] / 4) : CHALLENGE_JITTER10[defence];

  const reasons: ChallengeReason[] = [];
  if (attackAbility10 > fatiguedAttack10) {
    reasons.push({ kind: 'fatigue', side: 'attack', energy: attackerEnergyBefore, penalty10: attackAbility10 - fatiguedAttack10 });
  }
  if (defenceAbility10 > fatiguedDefence10) {
    reasons.push({ kind: 'fatigue', side: 'defence', energy: defenderEnergyBefore, penalty10: defenceAbility10 - fatiguedDefence10 });
  }
  if (matchup !== 0) reasons.push({ kind: 'matchup', modifier: matchup });
  if (attackTrait) reasons.push({ kind: 'trait', side: 'attack', trait: attackTrait });
  if (defenceTrait) reasons.push({ kind: 'trait', side: 'defence', trait: defenceTrait });

  return {
    contact: {
      clashIndex, role, bonus, playerCall, opponentCall: carrying ? defence : attack,
      attackerId: attacker.id, defenderId: defender.id, attack, defence,
      attackerEnergyBefore, attackerEnergyAfter, defenderEnergyBefore, defenderEnergyAfter,
      playerEnergyAfter, opponentEnergyAfter: carrying ? defenderEnergyAfter : attackerEnergyAfter,
      playerRecovery: playerEnergyAfter - playerAfterCost,
      attackAbility10, defenceAbility10, fatiguedAttack10, fatiguedDefence10, matchup, attackTrait, defenceTrait,
    },
    baseMargin10, jitter, reasons,
  };
}

const classify = (margin10: number): ChallengeScore => margin10 >= CHALLENGE_SCORE_THRESHOLD10 ? 2 : margin10 >= -CHALLENGE_SCORE_THRESHOLD10 ? 1 : 0;

export function previewChallengeAction(checkpoint: ChallengeCheckpoint, playerCall: ChallengeCall): ChallengeActionPreview {
  const { contact, baseMargin10, jitter, reasons } = calculateContact(checkpoint, playerCall);
  const counts: [number, number, number] = [0, 0, 0];
  for (let j = CHALLENGE_ROLL_MIN; j <= CHALLENGE_ROLL_MAX; j++) counts[classify(baseMargin10 + jitter * j)]++;
  return { ...contact, counts, reasons };
}

export function resolveChallengeAction(checkpoint: ChallengeCheckpoint, playerCall: ChallengeCall, j: number): ChallengeClash {
  if (!Number.isInteger(j) || j < CHALLENGE_ROLL_MIN || j > CHALLENGE_ROLL_MAX) throw new Error('Invalid challenge roll');
  const { contact, baseMargin10, jitter, reasons } = calculateContact(checkpoint, playerCall);
  const margin10 = baseMargin10 + jitter * j;
  const score = classify(margin10);
  reasons.push({ kind: 'outcome', score });
  return { ...contact, j, margin10, score, reasons };
}

export function advanceChallengeProgress(
  progress: ChallengeProgress, clash: Pick<ChallengeClash, 'role' | 'bonus' | 'score' | 'playerEnergyAfter'>,
): ChallengeProgress {
  const { role, bonus, score, playerEnergyAfter: playerEnergy } = clash;
  const clashIndex = progress.clashIndex + 1;
  const playerScore = progress.playerScore + (!bonus && role === 'carry' ? score : 0);
  const crewScore = progress.crewScore + (!bonus && role === 'defend' ? score : 0);
  let result: ChallengeProgress['result'] = null;
  if (bonus) result = score === 2 ? 'won' : 'lost';
  else if (clashIndex === REGULAR_CHALLENGE_CLASHES && playerScore !== crewScore) {
    result = playerScore > crewScore ? 'won' : 'lost';
  }
  return { clashIndex, playerScore, crewScore, playerEnergy, result };
}

/** Compare every serialized field, including nested reasons, without relying on object key order. */
function sameRecord(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object') return false;
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  const fields = Object.entries(expected);
  const record = actual as Record<string, unknown>;
  return Object.keys(record).length === fields.length
    && fields.every(([key, value]) => Object.prototype.hasOwnProperty.call(record, key) && sameRecord(record[key], value));
}

/** Verify the recorded prefix after save validation has checked the canonical edition and actor snapshot. */
export function replayChallenge(
  edition: ChallengeEdition, player: ChallengeActor, eventSeed: number, clashes: readonly unknown[],
): ChallengeProgress | null {
  if (!Number.isInteger(eventSeed) || eventSeed < 0 || eventSeed > 0xffffffff || clashes.length > REGULAR_CHALLENGE_CLASHES + 1) return null;
  let progress = initialChallengeProgress(player);
  for (const clash of clashes) {
    const checkpoint = challengeCheckpoint(edition, player, progress);
    if (!checkpoint || !clash || typeof clash !== 'object') return null;
    const call: unknown = (clash as Record<string, unknown>).playerCall;
    if (!isAttackCall(call) && !isDefenceCall(call)) return null;
    if (!challengeCalls(checkpoint).includes(call)) return null;
    const result = resolveChallengeAction(checkpoint, call, challengeClashRoll(eventSeed, progress.clashIndex));
    if (!sameRecord(clash, result)) return null;
    progress = advanceChallengeProgress(progress, result);
  }
  return progress;
}
