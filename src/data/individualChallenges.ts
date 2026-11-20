// One annual edition has one durable record. Rebooking replaces a pre-departure cancellation.
import type { ChallengeActor, ChallengeClash, ChallengeEdition, ChallengeEditionId, ChallengeProgress } from './individualChallengeRules';
import { CHALLENGE_EDITIONS, CHALLENGE_RULE_VERSION } from './individualChallengeRules';
import type { CompetitionCareerState } from './competition';
import type { CampAwardBasis } from './playerAssignments';
import type { CampAwardReceipt } from '../systems/assignmentTraining';
import { replayChallenge } from '../systems/individualChallengeEngine';

export type ChallengeCommandStamp = { kind: 'set-auto'; at: number; enabled: boolean }
  | { kind: 'call' | 'auto-clash' | 'finish'; at: number };
export interface ChallengeContest {
  actor: ChallengeActor;
  edition: ChallengeEdition;
  engineVersion: number;
  policyVersion: number;
  eventSeed: number;
  titleProbability: number;
  autoCoach: boolean;
  clashes: ChallengeClash[];
  commands: ChallengeCommandStamp[];
  progress: ChallengeProgress;
}
export interface IndividualChallengeRecord {
  id: string;
  editionId: ChallengeEditionId;
  season: number;
  clubId: string;
  pack: string;
  instanceId: string;
  fixtureId: string;
  opponentId: string;
  revision: number;
  bookingRevision: number;
  status: 'booked' | 'coaching' | 'ready-for-interval' | 'completed' | 'cancelled' | 'interrupted';
  participantId: string;
  participantName: string;
  bookedWeek: number;
  reason: string | null;
  contest: ChallengeContest | null;
  awardBasis: CampAwardBasis | null;
  award: { xp: CampAwardReceipt; cash: number; honour: string | null } | null;
}

export const challengeId = (season: number, clubId: string, edition: ChallengeEditionId) => `break-the-line:${edition}:s${season}:${clubId}`;
export const challengeRound = (edition: ChallengeEditionId) => edition === 'showground' ? 2 : 7;

/** Keep a version's replay proof even when later builds retire its coaching commands. */
export interface ChallengeEngineVersion {
  readonly status: 'active' | 'retired';
  readonly editions: typeof CHALLENGE_EDITIONS;
  readonly replay: typeof replayChallenge;
}
export const challengeEngines: Readonly<Record<number, ChallengeEngineVersion>> = {
  [CHALLENGE_RULE_VERSION]: {status:'active', editions:CHALLENGE_EDITIONS, replay:replayChallenge},
};

export function challengeFixture(c: CompetitionCareerState, season: number, clubId: string, edition: ChallengeEditionId) {
  const league = c.instances.find(i => i.season === season && i.definition.format.kind === 'league' && i.entrantIds.includes(clubId));
  const fixture = league?.fixtures.find(f => f.stageId === league.definition.stages[0]?.id && f.round === challengeRound(edition)
    && f.slot === CHALLENGE_EDITIONS[edition].eventWeek && (f.homeId === clubId || f.awayId === clubId));
  return league && fixture ? {league,fixture} : null;
}
