import { emptyFinance, type Fixture, type GameState, type RivalClub } from '../core/state';
import {
  isOpenCupDefinitionId, validateCompetitionDefinition, type CompetitionFixture, type CompetitionInstance,
} from '../data/competition';
import {
  competitionRewardOutcomes, competitionRewardPolicies, competitionRewardPromiseId, competitionRewardReceiptId,
  competitionRewardsProblem, type CompetitionRewardReceipt, type CompetitionRewardSquad,
  type PendingCompetitionReward, type SettledCompetitionReward,
} from '../data/competitionRewards';
import { AI_OPENING_CASH } from './cap';
import { REP_BASELINE, REP_MAX, REP_MIN } from './league';

export class CompetitionRewardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompetitionRewardError';
  }
}

function hasRewardExecution(instance: CompetitionInstance): boolean {
  return instance.definition.rewards.some(policy => 'execution' in policy);
}

function validateRewardDefinition(instance: CompetitionInstance): void {
  if (!isOpenCupDefinitionId(instance.definition.id) || validateCompetitionDefinition(instance.definition)) {
    throw new CompetitionRewardError('Invalid executable Open Cup reward definition');
  }
}

function validateLedger(state: GameState): void {
  const problem = competitionRewardsProblem(state.competitionRewards, state);
  if (problem) throw new CompetitionRewardError(problem);
}

function rivalClub(state: GameState, clubId: string): RivalClub {
  const matches = state.league.clubs.filter(club => club.id === clubId);
  if (matches.length !== 1) throw new CompetitionRewardError(`Missing or ambiguous reward recipient: ${clubId}`);
  return matches[0]!;
}

function squadSnapshot(state: GameState, clubId: string): CompetitionRewardSquad {
  const rival = clubId === state.clubId ? undefined : rivalClub(state, clubId);
  const players = rival ? rival.squad ?? [] : state.squad;
  return { clubId, clubName: rival ? rival.name : state.clubName, players: players.map(({ id, name }) => ({ id, name })) };
}

function recipientReputation(state: GameState, rival: RivalClub | undefined): number {
  const value = rival ? (rival.reputation === undefined ? REP_BASELINE : rival.reputation) : state.reputation;
  if (!Number.isFinite(value) || value < REP_MIN || value > REP_MAX) {
    throw new CompetitionRewardError('Invalid competition reward recipient reputation');
  }
  return value;
}

/** Capture the promise from the exact scheduled fixture and its ordinary kickoff quote. */
export function freezeCompetitionRewards(state: GameState, bridge: Fixture): GameState {
  if (bridge.result) return state;
  const instance = state.competitions?.instances.find(item => item.id === bridge.competitionId);
  if (!instance || !hasRewardExecution(instance)) return state;
  const fixture = instance.fixtures.find(item => item.id === bridge.id);
  if (!fixture || fixture.competitionId !== instance.id || fixture.stageId !== bridge.stageId
    || fixture.slot === undefined || fixture.slot !== bridge.slot || fixture.round !== bridge.round
    || fixture.homeId !== bridge.homeId || fixture.awayId !== bridge.awayId) {
    throw new CompetitionRewardError('Invalid competition reward fixture identity');
  }
  if (fixture.status !== 'scheduled') return state;
  const id = competitionRewardPromiseId(state.season, instance.id, fixture.id);
  if (state.competitionRewards.some(record => record.id === id)) return state;
  validateRewardDefinition(instance);
  const policies = competitionRewardPolicies(instance, fixture);
  if (!policies.length) return state;

  const ordinary = state.matchIncome.find(record => record.fixture.id === fixture.id);
  if (!ordinary) throw new CompetitionRewardError('Missing ordinary match base for competition reward');
  const { matchBase } = ordinary;
  const needsReputation = policies.some(policy => policy.kind === 'reputation');
  for (const clubId of [fixture.homeId, fixture.awayId]) {
    const rival = clubId === state.clubId ? undefined : rivalClub(state, clubId);
    if (needsReputation) recipientReputation(state, rival);
  }

  const promise: PendingCompetitionReward = {
    id, version: 1, status: 'pending', season: state.season, instanceId: instance.id, fixtureId: fixture.id,
    definitionId: instance.definition.id, definitionVersion: instance.definition.version, definitionName: instance.definition.name,
    stageId: fixture.stageId, round: fixture.round, slot: fixture.slot, homeId: fixture.homeId, awayId: fixture.awayId,
    neutral: fixture.neutral, matchBase,
    policies: policies.map(policy => ({
      policy: structuredClone(policy),
      ...(policy.kind === 'cash' ? { cash: matchBase * policy.matchBaseMultiplier } : {}),
    })),
    ...(policies.some(policy => policy.kind === 'honour') ? {
      squads: { home: squadSnapshot(state, fixture.homeId), away: squadSnapshot(state, fixture.awayId) },
    } : {}),
  };
  const next = { ...state, competitionRewards: [...state.competitionRewards, promise] };
  validateLedger(next);
  return next;
}

function creditCash(balance: number, delta: number, label: string): number {
  const next = balance + delta;
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(next)) {
    throw new CompetitionRewardError(`Competition reward exceeds safe ${label}`);
  }
  return next;
}

function creditPlayerPrize(state: GameState, season: number, delta: number): GameState {
  const matching = state.finance.filter(book => book.season === season);
  if (matching.length > 1) throw new CompetitionRewardError('Ambiguous competition reward season book');
  const book = matching[0] ?? emptyFinance(season);
  const updated = { ...book, prize: creditCash(book.prize, delta, 'season prize total') };
  return {
    ...state, money: creditCash(state.money, delta, 'player cash balance'),
    finance: matching.length ? state.finance.map(item => item === book ? updated : item) : [...state.finance, updated],
  };
}

function updateRival(state: GameState, club: RivalClub, patch: Pick<RivalClub, 'cash' | 'reputation'>): GameState {
  return { ...state, league: { ...state.league, clubs: state.league.clubs.map(item => item === club ? { ...club, ...patch } : item) } };
}

function settlePromise(state: GameState, promise: PendingCompetitionReward, instance: CompetitionInstance, fixture: CompetitionFixture):
  { state: GameState; record: SettledCompetitionReward } {
  const { squads, ...evidence } = promise;
  if (fixture.status === 'cancelled') {
    return { state, record: { ...evidence, status: 'settled', resolution: { kind: 'cancelled' }, receipts: [] } };
  }
  const result = fixture.result;
  if (!result) throw new CompetitionRewardError('Missing competition reward result');
  const outcomes = competitionRewardOutcomes(instance, fixture);
  const receipts: CompetitionRewardReceipt[] = [];
  let next = state;
  for (const { policy, cash } of promise.policies) {
    const outcome = outcomes.find(item => item.kind === policy.execution.trigger);
    if (!outcome) continue;
    const { clubId } = outcome;
    const identity = {
      id: competitionRewardReceiptId(outcome.id, policy.id, policy.kind),
      outcomeId: outcome.id, policyId: policy.id, clubId,
    };
    const rival = clubId === state.clubId ? undefined : rivalClub(next, clubId);
    switch (policy.kind) {
      case 'cash': {
        const delta = cash!; // The saved quote has already been validated.
        next = rival
          ? updateRival(next, rival, { cash: creditCash(rival.cash ?? AI_OPENING_CASH, delta, 'rival cash balance') })
          : creditPlayerPrize(next, promise.season, delta);
        receipts.push({ ...identity, kind: 'cash', delta });
        break;
      }
      case 'reputation': {
        const reputationBefore = recipientReputation(next, rival);
        const reputationAfter = Math.min(REP_MAX, reputationBefore + policy.amount);
        next = rival ? updateRival(next, rival, { reputation: reputationAfter }) : { ...next, reputation: reputationAfter };
        receipts.push({
          ...identity, kind: 'reputation', advertisedDelta: policy.amount, delta: reputationAfter - reputationBefore,
          reputationBefore, reputationAfter,
        });
        break;
      }
      case 'honour': {
        const squad = clubId === promise.homeId ? squads?.home : squads?.away;
        if (!squad?.players.length) throw new CompetitionRewardError('Missing competition reward winning squad');
        receipts.push({ ...identity, kind: 'honour', title: policy.title, squad });
        break;
      }
    }
  }
  return {
    state: next,
    record: { ...evidence, status: 'settled', resolution: { kind: 'result', result: { ...result } }, receipts },
  };
}

/** Settle saved promises against the sporting state already validated by the result/save owner. */
export function reconcileCompetitionRewards(state: GameState): GameState {
  for (const instance of state.competitions?.instances ?? []) {
    if (hasRewardExecution(instance)) validateRewardDefinition(instance);
  }
  validateLedger(state);
  let next = state;
  let records: GameState['competitionRewards'] | undefined;
  for (const [index, record] of state.competitionRewards.entries()) {
    if (record.status !== 'pending') continue;
    // Ledger validation established a current canonical source for every pending promise.
    const instance = state.competitions!.instances.find(item => item.id === record.instanceId)!;
    const fixture = instance.fixtures.find(item => item.id === record.fixtureId)!;
    if (fixture.status !== 'completed' && fixture.status !== 'cancelled') continue;
    const settled = settlePromise(next, record, instance, fixture);
    next = settled.state;
    records ??= [...state.competitionRewards];
    records[index] = settled.record;
  }
  if (!records) return state;
  next = { ...next, competitionRewards: records };
  validateLedger(next);
  return next;
}

export interface CompetitionHonour {
  readonly id: string;
  readonly outcomeId: string;
  readonly instanceId: string;
  readonly fixtureId: string;
  readonly definitionId: string;
  readonly definitionName: string;
  readonly season: number;
  readonly title: string;
  readonly clubId: string;
  readonly clubName: string;
  readonly players: readonly Readonly<CompetitionRewardSquad['players'][number]>[];
}

/** Historical honours are read from receipts, including players who have since left. */
export function competitionHonours(state: GameState, clubId: string): readonly CompetitionHonour[] {
  const honours: CompetitionHonour[] = [];
  for (const record of state.competitionRewards) {
    if (record.status !== 'settled') continue;
    for (const receipt of record.receipts) {
      if (receipt.kind !== 'honour' || receipt.clubId !== clubId) continue;
      const { id, outcomeId, title, squad } = receipt;
      honours.push(Object.freeze({
        id, outcomeId, title, clubId, clubName: squad.clubName,
        definitionId: record.definitionId, definitionName: record.definitionName, instanceId: record.instanceId,
        fixtureId: record.fixtureId, season: record.season,
        players: Object.freeze(squad.players.map(player => Object.freeze({ ...player }))),
      }));
    }
  }
  return Object.freeze(honours);
}

/** Keep older settlements while their fixtures are retained and keep honours permanently. */
export function pruneCompetitionRewards(state: GameState): GameState {
  const fixtureIds = new Set(state.competitions?.instances.flatMap(instance => instance.fixtures.map(fixture => fixture.id)));
  const competitionRewards = state.competitionRewards.filter(record => {
    if (record.status === 'pending') {
      if (record.season !== state.season) throw new CompetitionRewardError('Stale pending competition reward');
      return true;
    }
    return record.season >= state.season - 1 || fixtureIds.has(record.fixtureId)
      || record.receipts.some(receipt => receipt.kind === 'honour');
  });
  return competitionRewards.length === state.competitionRewards.length ? state : { ...state, competitionRewards };
}
