import { describe, expect, it } from 'vitest';
import {
  ATTACK_CALLS, CHALLENGE_EDITIONS, DEFENCE_CALLS, type ChallengeActor, type ChallengeCall, type ChallengeClash,
} from '../../src/data/individualChallengeRules';
import {
  advanceChallengeProgress, challengeCheckpoint, challengeClashRoll, challengeEventSeed, freezeChallengeActor,
  initialChallengeProgress, previewChallengeAction, replayChallenge, resolveChallengeAction,
} from '../../src/systems/individualChallengeEngine';

const showground = CHALLENGE_EDITIONS['showground'];
const balanced: ChallengeActor = {
  id: 'p', name: 'Entrant', ratings: { strength: 45, speed: 45, stamina: 45, footyIQ: 45 }, traits: [],
};

describe('individual challenge engine', () => {
  it('freezes the actual identity, rounded and bounded ratings, and copied traits', () => {
    const player = {
      id: 'p', name: 'Entrant', stats: { strength: 42.5, speed: 102, stamina: -4, footyIQ: 44.49, kicking: 55, handling: 55 },
      traits: [{ id: 'wreckingBall', level: 2 }] as const,
    };
    const actor = freezeChallengeActor(player);
    expect(actor).toEqual({
      id: 'p', name: 'Entrant', ratings: { strength: 43, speed: 100, stamina: 1, footyIQ: 44 },
      traits: [{ id: 'wreckingBall', level: 2 }],
    });
    expect(actor.traits[0]).not.toBe(player.traits[0]);
    expect(() => freezeChallengeActor({ ...player, stats: { ...player.stats, speed: NaN } })).toThrow(/speed/i);
  });

  it('uses inclusive score boundaries with integer fatigue, matchup and jitter', () => {
    const checkpoint = challengeCheckpoint(showground, balanced, initialChallengeProgress(balanced))!;
    const power = previewChallengeAction(checkpoint, 'power');
    expect(power).toMatchObject({
      attackAbility10: 450, defenceAbility10: 478, fatiguedAttack10: 450, fatiguedDefence10: 478,
      matchup: 4, playerEnergyAfter: 55, opponentEnergyAfter: 67, counts: [8, 8, 9],
    });
    const at = (strength: number, footyIQ: number, j: number) => resolveChallengeAction({
      ...checkpoint, player: { ...balanced, ratings: { ...balanced.ratings, strength, footyIQ } },
    }, 'power', j);
    expect(at(45, 45, 3)).toMatchObject({ margin10: 78, score: 1 });
    expect(at(46, 47, 3)).toMatchObject({ margin10: 90, score: 2 });
    expect(at(43, 46, -4)).toMatchObject({ margin10: -90, score: 1 });
    expect(at(43, 45, -4)).toMatchObject({ margin10: -92, score: 0 });
    expect(resolveChallengeAction({ ...checkpoint, playerEnergy: 9 }, 'controlled', 0)).toMatchObject({
      attackAbility10: 400, fatiguedAttack10: 316, playerEnergyAfter: 2,
      reasons: expect.arrayContaining([{ kind: 'fatigue', side: 'attack', energy: 9, penalty10: 84 }]),
    });
    const tiny: ChallengeActor = { ...balanced, ratings: { strength: 1, speed: 1, stamina: 1, footyIQ: 1 } };
    expect(previewChallengeAction({ ...checkpoint, player: tiny }, 'controlled').attackAbility10).toBe(0);
  });

  it('credits only fitting traits, with all levels and a stable Power tie break', () => {
    const checkpoint = challengeCheckpoint(showground, balanced, initialChallengeProgress(balanced))!;
    for (const level of [1, 2, 3] as const) {
      const player: ChallengeActor = { ...balanced, traits: [
        { id: 'dontArgue', level }, { id: 'wreckingBall', level }, { id: 'dancingFeet', level },
        { id: 'hitman', level }, { id: 'brickWall', level },
      ] };
      const carry = { ...checkpoint, player };
      expect(resolveChallengeAction(carry, 'power', 0).attackTrait).toEqual({ id: 'wreckingBall', level, bonus: level });
      expect(resolveChallengeAction(carry, 'angle', 0).attackTrait).toEqual({ id: 'dancingFeet', level, bonus: level });
      expect(resolveChallengeAction(carry, 'controlled', 0).attackTrait).toBeNull();
      const defence = { ...carry, clashIndex: 1, role: 'defend' as const };
      expect(resolveChallengeAction(defence, 'shoot', 0).defenceTrait).toEqual({ id: 'hitman', level, bonus: level });
      expect(resolveChallengeAction(defence, 'wrap', 0).defenceTrait).toBeNull();
    }
    const player: ChallengeActor = { ...balanced, traits: [{ id: 'wreckingBall', level: 1 }, { id: 'dontArgue', level: 3 }] };
    expect(resolveChallengeAction({ ...checkpoint, player }, 'power', 0).attackTrait?.id).toBe('dontArgue');
  });

  it('keeps Wrap less volatile than Track or Shoot, with narrower Controlled carries', () => {
    const checkpoint = challengeCheckpoint(showground, balanced, initialChallengeProgress(balanced))!;
    const jitter = (defence: typeof DEFENCE_CALLS[number], call: 'power' | 'controlled'): number => {
      const against = { ...checkpoint, opponent: { ...checkpoint.opponent, defence } };
      return resolveChallengeAction(against, call, 1).margin10 - resolveChallengeAction(against, call, 0).margin10;
    };
    expect(DEFENCE_CALLS.map(defence => jitter(defence, 'power'))).toEqual([40, 32, 22]);
    expect(DEFENCE_CALLS.map(defence => jitter(defence, 'controlled'))).toEqual([30, 24, 16]);
  });

  it('matches all 25 outcomes across the six calls and refuses incompatible calls and rolls', () => {
    const progress = initialChallengeProgress(balanced);
    for (let clashIndex = 0; clashIndex < 6; clashIndex++) {
      const checkpoint = challengeCheckpoint(showground, balanced, { ...progress, clashIndex })!;
      const calls = checkpoint.role === 'carry' ? ATTACK_CALLS : DEFENCE_CALLS;
      for (const call of calls) {
        const counts = [0, 0, 0];
        for (let j = -12; j <= 12; j++) counts[resolveChallengeAction(checkpoint, call, j).score]++;
        expect(previewChallengeAction(checkpoint, call).counts).toEqual(counts);
      }
    }
    const first = challengeCheckpoint(showground, balanced, progress)!;
    expect(() => resolveChallengeAction(first, 'shoot', 0)).toThrow(/call/i);
    expect(() => resolveChallengeAction(first, 'power', 13)).toThrow(/roll/i);
    expect(() => resolveChallengeAction(first, 'power', 0.1)).toThrow(/roll/i);
  });

  it('alternates both roles through three opponents, pays all local costs, then resolves one bonus when tied', () => {
    const calls = ['power', 'shoot', 'angle', 'track', 'controlled', 'wrap'] as const;
    const expectedEnergies = [55, 41, 27, 17, 10, 3];
    const expectedRivalEnergies = [67, 49, 59, 45, 58, 40];
    let progress = initialChallengeProgress(balanced);
    const played: ChallengeClash[] = [];
    for (const [index, call] of calls.entries()) {
      const checkpoint = challengeCheckpoint(showground, balanced, progress)!;
      expect(checkpoint.role).toBe(index % 2 === 0 ? 'carry' : 'defend');
      expect(checkpoint.opponent.id).toBe(showground.opponents[Math.floor(index / 2)].id);
      const clash = resolveChallengeAction(checkpoint, call, 0);
      expect(clash.playerEnergyAfter).toBe(expectedEnergies[index]);
      expect(clash.opponentEnergyAfter).toBe(expectedRivalEnergies[index]);
      played.push(clash);
      progress = advanceChallengeProgress(progress, clash);
    }
    expect(progress.playerScore).toBe(played[0].score + played[2].score + played[4].score);
    expect(progress.crewScore).toBe(played[1].score + played[3].score + played[5].score);

    const tied = { ...progress, playerScore: 3, crewScore: 3, result: null };
    const bonus = challengeCheckpoint(showground, balanced, tied)!;
    expect(bonus).toMatchObject({ clashIndex: 6, bonus: true, role: 'carry', playerEnergy: 3, opponentEnergy: 40 });
    const high = resolveChallengeAction({ ...bonus, player: { ...balanced, ratings: { strength: 100, speed: 100, footyIQ: 100, stamina: 45 } } }, 'angle', 12);
    expect(high).toMatchObject({ score: 2, playerEnergyAfter: 0, opponentEnergyAfter: 22 });
    expect(advanceChallengeProgress(tied, high)).toEqual({ ...tied, clashIndex: 7, playerEnergy: 0, result: 'won' });
    const low = resolveChallengeAction(bonus, 'power', -12);
    expect(advanceChallengeProgress(tied, low)).toEqual({ ...tied, clashIndex: 7, playerEnergy: 0, result: 'lost' });
    expect(challengeCheckpoint(showground, balanced, advanceChallengeProgress(tied, low))).toBeNull();
  });

  it('replays only the exact indexed committed records and rejects modified or extra outcomes', () => {
    const seed = challengeEventSeed(1234, 'season-1-showground');
    expect(seed).toBe(599840186);
    expect(seed).not.toBe(challengeEventSeed(1234, 'season-2-showground'));
    expect(seed).not.toBe(challengeEventSeed(1234, 'season-1-invitational'));
    const rolls = Array.from({ length: 7 }, (_, index) => challengeClashRoll(seed, index));
    expect(rolls).toEqual([12, 2, -6, 12, 1, -5, -9]);
    expect(() => challengeClashRoll(seed, 7)).toThrow(/index/i);
    let progress = initialChallengeProgress(balanced);
    const clashes: ChallengeClash[] = [];
    while (progress.result === null) {
      const checkpoint = challengeCheckpoint(showground, balanced, progress)!;
      const j = challengeClashRoll(seed, progress.clashIndex);
      const calls: readonly ChallengeCall[] = checkpoint.role === 'carry' ? ATTACK_CALLS : DEFENCE_CALLS;
      expect(calls.map(call => resolveChallengeAction(checkpoint, call, j).j)).toEqual([j, j, j]);
      const clash = resolveChallengeAction(checkpoint, calls[0], j);
      clashes.push(clash);
      progress = advanceChallengeProgress(progress, clash);
    }
    expect(clashes.length).toBeGreaterThanOrEqual(6);
    expect(clashes.length).toBeLessThanOrEqual(7);
    expect(replayChallenge(showground, balanced, seed, JSON.parse(JSON.stringify(clashes)))).toEqual(progress);
    expect(replayChallenge(showground, balanced, seed, [{ ...clashes[0], j: 13 }])).toBeNull();
    expect(replayChallenge(showground, balanced, seed, [{ ...clashes[0], margin10: 900 }])).toBeNull();
    expect(replayChallenge(showground, balanced, seed, [{ ...clashes[0], unexpected: true }])).toBeNull();
    expect(replayChallenge(showground, balanced, seed, [{ ...clashes[0], reasons: [
      ...clashes[0].reasons.slice(0, -1), { ...clashes[0].reasons[clashes[0].reasons.length - 1], unexpected: true },
    ] }])).toBeNull();
    expect(replayChallenge(showground, balanced, seed, [...clashes, clashes[0]])).toBeNull();
  });
});
