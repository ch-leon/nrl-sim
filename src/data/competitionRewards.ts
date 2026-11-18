import type { GameState } from '../core/state';
import { REP_MAX, REP_MIN } from '../systems/league';
import { openCupFixtureOutcome, openCupOutcomeId, type OpenCupOutcome } from '../systems/openCup';
import type { MatchIncomeRecord } from '../systems/matchIncome';
import {
  isExecutableCompetitionRewardPolicy, isOpenCupDefinitionId,
  type CompetitionFixture, type CompetitionInstance, type CompetitionResult, type ExecutableCompetitionRewardPolicy,
} from './competition';

export interface CompetitionRewardSquad {
  clubId: string;
  clubName: string;
  players: Array<{ id: string; name: string }>;
}

interface CompetitionRewardPromise {
  id: string;
  version: 1;
  season: number;
  instanceId: string;
  fixtureId: string;
  definitionId: string;
  definitionVersion: number;
  definitionName: string;
  stageId: string;
  round: number;
  slot: number;
  homeId: string;
  awayId: string;
  neutral: boolean;
  matchBase: number;
  policies: Array<{ policy: ExecutableCompetitionRewardPolicy; cash?: number }>;
}

export interface PendingCompetitionReward extends CompetitionRewardPromise {
  status: 'pending';
  squads?: { home: CompetitionRewardSquad; away: CompetitionRewardSquad };
}

interface CompetitionRewardReceiptIdentity {
  id: string;
  outcomeId: string;
  policyId: string;
  clubId: string;
}

export type CompetitionRewardReceipt = CompetitionRewardReceiptIdentity & (
  | { kind: 'cash'; delta: number }
  | { kind: 'reputation'; advertisedDelta: number; delta: number; reputationBefore: number; reputationAfter: number }
  | { kind: 'honour'; title: string; squad: CompetitionRewardSquad }
);

export interface SettledCompetitionReward extends CompetitionRewardPromise {
  status: 'settled';
  resolution: { kind: 'result'; result: CompetitionResult } | { kind: 'cancelled' };
  receipts: CompetitionRewardReceipt[];
}

export type CompetitionRewardRecord = PendingCompetitionReward | SettledCompetitionReward;

export function competitionRewardPromiseId(season: number, instanceId: string, fixtureId: string): string {
  return JSON.stringify(['competition-reward-promise', season, instanceId, fixtureId]);
}

export function competitionRewardReceiptId(outcomeId: string, policyId: string, kind: CompetitionRewardReceipt['kind']): string {
  return JSON.stringify(['competition-reward', outcomeId, policyId, kind]);
}

export function competitionRewardPolicies(instance: CompetitionInstance, fixture: Pick<CompetitionFixture, 'stageId' | 'round'>): ExecutableCompetitionRewardPolicy[] {
  return instance.definition.rewards.filter(isExecutableCompetitionRewardPolicy)
    .filter(policy => policy.stageId === fixture.stageId && policy.round === fixture.round);
}

/** Read an accepted fixture independently of the later state of the bracket. */
export function competitionRewardOutcomes(instance: CompetitionInstance, fixture: CompetitionFixture): OpenCupOutcome[] {
  const result = fixture.result;
  if (fixture.competitionId !== instance.id || fixture.status !== 'completed' || !result?.winnerId
    || (result.decider !== 'score' && result.decider !== instance.definition.drawnKnockout)) return [];
  const outcomes = [openCupFixtureOutcome(instance, fixture, 'round-win')];
  const stage = instance.definition.stages[0];
  if (fixture.stageId === stage?.id && fixture.round === stage.rounds && fixture.neutral
    && instance.status === 'completed' && instance.winnerId === result.winnerId) {
    outcomes.push(openCupFixtureOutcome(instance, fixture, 'title'));
  }
  return outcomes;
}

const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(k => allowed.includes(k));

function ordinal(id: string, prefix: string): number | undefined {
  if (!id.startsWith(prefix)) return undefined;
  const suffix = id.slice(prefix.length);
  const n = Number(suffix);
  return integer(n) && String(n) === suffix ? n : undefined;
}

function validSquad(v: unknown, clubId: string): v is CompetitionRewardSquad {
  if (!object(v) || !keys(v, ['clubId', 'clubName', 'players']) || v.clubId !== clubId || !text(v.clubName)
    || !Array.isArray(v.players)) return false;
  const ids = new Set<string>();
  for (const player of v.players) {
    if (!object(player) || !keys(player, ['id', 'name']) || !text(player.id) || !text(player.name) || ids.has(player.id)) return false;
    ids.add(player.id);
  }
  return true;
}

function sameSquad(a: CompetitionRewardSquad, b: CompetitionRewardSquad): boolean {
  return a.clubId === b.clubId && a.clubName === b.clubName && a.players.length === b.players.length
    && a.players.every((player, index) => player.id === b.players[index]!.id && player.name === b.players[index]!.name);
}

function validPolicies(v: unknown, matchBase: number, stageId: string, round: number, final: boolean): boolean {
  if (!Array.isArray(v) || !v.length) return false;
  const ids = new Set<string>();
  for (const item of v) {
    if (!object(item) || !isExecutableCompetitionRewardPolicy(item.policy)) return false;
    const policy = item.policy;
    if (policy.stageId !== stageId || policy.round !== round || ids.has(policy.id)
      || (policy.execution.trigger === 'title' && !final)) return false;
    ids.add(policy.id);
    if (policy.kind === 'cash') {
      if (!keys(item, ['policy', 'cash']) || !integer(item.cash) || item.cash !== matchBase * policy.matchBaseMultiplier) return false;
    } else if (!keys(item, ['policy'])) return false;
  }
  return true;
}

function storedPromise(v: unknown, season: number): v is CompetitionRewardRecord {
  if (!object(v) || v.version !== 1 || !integer(v.season, 1, season) || !text(v.instanceId)
    || !text(v.fixtureId) || !text(v.definitionId) || !isOpenCupDefinitionId(v.definitionId)
    || !integer(v.definitionVersion, 1) || !text(v.definitionName) || !text(v.stageId)
    || !integer(v.round, 1, 53) || !integer(v.slot, v.round) || !text(v.homeId) || !text(v.awayId) || v.homeId === v.awayId
    || typeof v.neutral !== 'boolean' || !integer(v.matchBase)
    || v.id !== competitionRewardPromiseId(v.season, v.instanceId, v.fixtureId)
    || ordinal(v.instanceId, `${v.definitionId}:s${v.season}:i`) === undefined) return false;
  const fixtureOrdinal = ordinal(v.fixtureId, `${v.instanceId}:f`);
  // Round number plus the bracket level cannot exceed the rounds for a safe-integer field size.
  if (fixtureOrdinal === undefined || v.round + Math.floor(Math.log2(fixtureOrdinal + 1)) > 53
    || v.neutral !== (fixtureOrdinal === 0)
    || !validPolicies(v.policies, v.matchBase, v.stageId, v.round, v.neutral)) return false;
  const common = ['id', 'version', 'status', 'season', 'instanceId', 'fixtureId', 'definitionId', 'definitionVersion',
    'definitionName', 'stageId', 'round', 'slot', 'homeId', 'awayId', 'neutral', 'matchBase', 'policies'];
  if (v.status === 'settled') return keys(v, [...common, 'resolution', 'receipts']) && Array.isArray(v.receipts) && object(v.resolution);
  if (v.status !== 'pending' || !keys(v, [...common, 'squads'])) return false;
  const needsSquads = (v.policies as CompetitionRewardRecord['policies']).some(({ policy }) => policy.kind === 'honour');
  if (!needsSquads) return !('squads' in v);
  const squads = v.squads;
  if (!object(squads) || !keys(squads, ['home', 'away']) || !validSquad(squads.home, v.homeId) || !validSquad(squads.away, v.awayId)) return false;
  const homePlayers = new Set(squads.home.players.map(player => player.id));
  return squads.away.players.every(player => !homePlayers.has(player.id));
}

function samePolicy(saved: ExecutableCompetitionRewardPolicy, expected: ExecutableCompetitionRewardPolicy): boolean {
  if (saved.id !== expected.id || saved.stageId !== expected.stageId || saved.round !== expected.round
    || saved.execution.trigger !== expected.execution.trigger) return false;
  switch (saved.kind) {
    case 'cash': return expected.kind === saved.kind && expected.matchBaseMultiplier === saved.matchBaseMultiplier;
    case 'reputation': return expected.kind === saved.kind && expected.amount === saved.amount;
    case 'honour': return expected.kind === saved.kind && expected.title === saved.title;
  }
}

function matchesDefinition(promise: CompetitionRewardRecord, instance: CompetitionInstance): boolean {
  const definition = instance.definition;
  const stage = definition.stages.find(s => s.id === promise.stageId);
  if (instance.season !== promise.season || definition.id !== promise.definitionId || definition.version !== promise.definitionVersion
    || definition.name !== promise.definitionName || !stage?.slotIds || stage.slotIds[promise.round - 1] !== promise.slot
    || !instance.entrantIds.includes(promise.homeId) || !instance.entrantIds.includes(promise.awayId)
    || promise.neutral !== (promise.round === stage.rounds)) return false;
  const expected = competitionRewardPolicies(instance, promise);
  return expected.length === promise.policies.length
    && expected.every((policy, index) => samePolicy(promise.policies[index]!.policy, policy));
}

function matchesFixture(promise: CompetitionRewardRecord, fixture: CompetitionFixture): boolean {
  return fixture.competitionId === promise.instanceId && fixture.stageId === promise.stageId && fixture.round === promise.round
    && fixture.slot === promise.slot && fixture.homeId === promise.homeId && fixture.awayId === promise.awayId
    && fixture.neutral === promise.neutral && fixture.status !== 'pending';
}

function matchesOrdinary(promise: CompetitionRewardRecord, ordinary: MatchIncomeRecord): boolean {
  const f = ordinary.fixture;
  return ordinary.id === JSON.stringify(['ordinary', promise.season, promise.instanceId, promise.fixtureId,
    promise.round, promise.homeId, promise.awayId]) && ordinary.season === promise.season
    && f.competitionId === promise.instanceId && f.stageId === promise.stageId && f.round === promise.round && f.slot === promise.slot
    && f.homeId === promise.homeId && f.awayId === promise.awayId
    && ordinary.neutral === promise.neutral && ordinary.kind === 'played' && ordinary.matchBase === promise.matchBase;
}

function validResult(v: unknown, promise: CompetitionRewardRecord, instance?: CompetitionInstance): v is CompetitionResult {
  if (!object(v) || !keys(v, ['homeScore', 'awayScore', 'winnerId', 'decider'])
    || !integer(v.homeScore) || !integer(v.awayScore) || (v.winnerId !== promise.homeId && v.winnerId !== promise.awayId)) return false;
  if (v.homeScore !== v.awayScore) return (v.decider === 'score' || v.decider === 'forfeit')
    && v.winnerId === (v.homeScore > v.awayScore ? promise.homeId : promise.awayId);
  if (v.decider !== 'seeded-draw') return false;
  return !instance || v.winnerId === (instance.tieOrder.indexOf(promise.homeId) < instance.tieOrder.indexOf(promise.awayId) ? promise.homeId : promise.awayId);
}

function sameResult(a: CompetitionResult, b: CompetitionResult | undefined): boolean {
  return !!b && a.homeScore === b.homeScore && a.awayScore === b.awayScore && a.winnerId === b.winnerId && a.decider === b.decider;
}

function validReceipt(v: unknown, policy: SettledCompetitionReward['policies'][number], outcomeId: string, clubId: string): boolean {
  const { policy: p, cash } = policy;
  if (!object(v) || v.outcomeId !== outcomeId || v.policyId !== p.id || v.clubId !== clubId || v.kind !== p.kind
    || v.id !== competitionRewardReceiptId(outcomeId, p.id, p.kind)) return false;
  const common = ['id', 'outcomeId', 'policyId', 'clubId', 'kind'];
  if (p.kind === 'cash') return keys(v, [...common, 'delta']) && v.delta === cash;
  if (p.kind === 'honour') return keys(v, [...common, 'title', 'squad']) && v.title === p.title
    && validSquad(v.squad, clubId) && v.squad.players.length > 0;
  if (!keys(v, [...common, 'advertisedDelta', 'delta', 'reputationBefore', 'reputationAfter'])
    || v.advertisedDelta !== p.amount || typeof v.reputationBefore !== 'number'
    || !Number.isFinite(v.reputationBefore) || v.reputationBefore < REP_MIN || v.reputationBefore > REP_MAX) return false;
  const after = Math.min(REP_MAX, v.reputationBefore + p.amount);
  return v.reputationAfter === after && v.delta === after - v.reputationBefore;
}

function validSettlement(promise: SettledCompetitionReward, instance: CompetitionInstance | undefined, fixture: CompetitionFixture | undefined): boolean {
  const resolution: unknown = promise.resolution;
  if (!object(resolution)) return false;
  if (resolution.kind === 'cancelled') return keys(resolution, ['kind']) && (!fixture || fixture.status === 'cancelled')
    && promise.receipts.length === 0;
  if (resolution.kind !== 'result' || !keys(resolution, ['kind', 'result'])
    || !validResult(resolution.result, promise, instance)
    || (fixture && (fixture.status !== 'completed' || !sameResult(resolution.result, fixture.result)))) return false;
  if (resolution.result.decider === 'forfeit') return promise.receipts.length === 0;
  const winner = resolution.result.winnerId!;
  let outcomes: Map<OpenCupOutcome['kind'], string>;
  if (instance && fixture) {
    outcomes = new Map(competitionRewardOutcomes(instance, fixture).map(outcome => [outcome.kind, outcome.id]));
  } else {
    // The canonical Open Cup final is fixture ordinal zero at a neutral venue.
    // Older records can retain the outcome after the draw itself is pruned.
    outcomes = new Map([['round-win', openCupOutcomeId(promise.instanceId, promise.fixtureId, winner, 'round-win')]]);
    if (promise.neutral) {
      outcomes.set('title', openCupOutcomeId(promise.instanceId, promise.fixtureId, winner, 'title'));
    }
  }
  if (!outcomes.has('round-win') || promise.neutral !== outcomes.has('title')) return false;
  const eligible = promise.policies.filter(({ policy }) => outcomes.has(policy.execution.trigger));
  if (promise.receipts.length !== eligible.length) return false;
  let winningSquad: CompetitionRewardSquad | undefined;
  let reputation: number | undefined;
  for (const policy of eligible) {
    const receipt = promise.receipts.find(candidate => object(candidate) && candidate.policyId === policy.policy.id);
    if (!receipt || !validReceipt(receipt, policy, outcomes.get(policy.policy.execution.trigger)!, winner)) return false;
    if (receipt.kind === 'honour') {
      if (winningSquad && !sameSquad(winningSquad, receipt.squad)) return false;
      winningSquad = receipt.squad;
    } else if (receipt.kind === 'reputation') {
      if (reputation !== undefined && receipt.reputationBefore !== reputation) return false;
      reputation = receipt.reputationAfter;
    }
  }
  return true;
}

/** Validate saved evidence without filling in missing promises or applying any awards.
 * The caller supplies the already-validated sporting and ordinary-income state. */
export function competitionRewardsProblem(value: unknown, state: Pick<GameState, 'season' | 'competitions' | 'matchIncome' | 'league' | 'clubId'>): string | null {
  if (!Array.isArray(value)) return 'competition rewards';
  const instances = state.competitions?.instances ?? [];
  const clubIds = new Set([state.clubId, ...state.league.clubs.map(club => club.id)]);
  const fixtureIds = new Set<string>();
  for (const promise of value) {
    if (!storedPromise(promise, state.season) || fixtureIds.has(promise.fixtureId)
      || !clubIds.has(promise.homeId) || !clubIds.has(promise.awayId)) return 'competition reward promise';
    fixtureIds.add(promise.fixtureId);
    const instance = instances.find(item => item.id === promise.instanceId);
    const fixture = instance?.fixtures.find(item => item.id === promise.fixtureId);
    if (instance && !matchesDefinition(promise, instance)) return 'competition reward definition';
    if (fixture ? !matchesFixture(promise, fixture) : instance !== undefined || promise.season === state.season) return 'competition reward fixture';
    const ordinary = state.matchIncome.filter(item => item.fixture.id === promise.fixtureId);
    if (ordinary.length > 1 || (ordinary[0] && !matchesOrdinary(promise, ordinary[0]))) return 'competition reward match base';
    if (promise.status === 'pending') {
      if (!instance || !fixture || promise.season !== state.season || !ordinary.length) return 'competition reward pending source';
      if (fixture.status === 'completed' && fixture.result?.decider !== 'forfeit') {
        const outcomes = competitionRewardOutcomes(instance, fixture);
        const title = outcomes.find(outcome => outcome.kind === 'title');
        if (!outcomes.length || promise.neutral !== !!title) return 'competition reward pending result';
        if (title && promise.squads) {
          const winner = title.clubId === promise.homeId ? promise.squads.home : promise.squads.away;
          if (!winner.players.length) return 'competition reward winning squad';
        }
      }
    } else if (!validSettlement(promise, instance, fixture)) return 'competition reward settlement';
  }
  for (const instance of instances) for (const fixture of instance.fixtures) {
    if (fixtureIds.has(fixture.id) || !competitionRewardPolicies(instance, fixture).length) continue;
    const cancelledPromise = fixture.status === 'cancelled' && state.matchIncome.some(item => item.fixture.id === fixture.id);
    if (fixture.status === 'completed' || cancelledPromise) return 'competition reward missing promise';
  }
  return null;
}
