import { describe, expect, it } from 'vitest';
import {
  competitionRewardPromiseId, competitionRewardReceiptId, competitionRewardsProblem,
  type CompetitionRewardRecord, type CompetitionRewardSquad, type PendingCompetitionReward, type SettledCompetitionReward,
} from '../../src/data/competitionRewards';
import { competitionFixtureId, validateCompetitions, type ExecutableCompetitionRewardPolicy } from '../../src/data/competition';
import type { Fixture, GameState } from '../../src/core/state';
import { advanceOpenCup, drawOpenCup, openCupOutcomeId, openCupResult, openCupSportingOutcomes } from '../../src/systems/openCup';
import { incomeIdentity, type MatchIncomeRecord } from '../../src/systems/matchIncome';
import { cupDefinition } from '../fixtures/competition';

const roundWin = { version: 1, trigger: 'round-win', recipient: 'winner', repeat: 'each-outcome', eligibility: 'played' } as const;
const titleWin = { ...roundWin, trigger: 'title', titleEligibility: 'played-final' } as const;
const policies: ExecutableCompetitionRewardPolicy[] = [
  { id: 'win', kind: 'cash', stageId: 'cup', round: 1, matchBaseMultiplier: 2, basis: 'fixture-match-base', execution: roundWin },
  { id: 'final-win', kind: 'cash', stageId: 'cup', round: 2, matchBaseMultiplier: 2, basis: 'fixture-match-base', execution: roundWin },
  { id: 'final-rep', kind: 'reputation', stageId: 'cup', round: 2, amount: 4, execution: titleWin },
  { id: 'champion', kind: 'honour', stageId: 'cup', round: 2, title: 'Open Cup winner', squad: 'title-time-registered', execution: titleWin },
];

function source(status: 'scheduled' | 'played' | 'tied' | 'forfeit' | 'cancelled' = 'played') {
  const definition = cupDefinition();
  definition.id = 'test:open-cup';
  definition.stages[0]!.slotIds = [7, 19];
  definition.rewards = structuredClone(policies);
  const { instance } = drawOpenCup({ definition, season: 1, seed: 30, clubIds: ['player', 'rival'], currentSlot: 0 });
  const fixture = instance.fixtures[0]!;
  const winner = status === 'tied' ? instance.tieOrder[0]! : fixture.homeId;
  const squad = (clubId: string): CompetitionRewardSquad => ({
    clubId, clubName: clubId === 'player' ? 'Old Player Club' : 'Old Rival Club',
    players: [{ id: `departed-${clubId}`, name: 'Former Player' }],
  });
  const pending: PendingCompetitionReward = {
    id: competitionRewardPromiseId(1, instance.id, fixture.id), version: 1, status: 'pending',
    season: 1, instanceId: instance.id, fixtureId: fixture.id, definitionId: definition.id,
    definitionVersion: definition.version, definitionName: definition.name, stageId: fixture.stageId,
    round: fixture.round, slot: fixture.slot!, homeId: fixture.homeId, awayId: fixture.awayId, neutral: fixture.neutral,
    matchBase: 8_000, policies: policies.slice(1).map(policy => ({ policy: structuredClone(policy), ...(policy.kind === 'cash' ? { cash: 16_000 } : {}) })),
    squads: { home: squad(fixture.homeId), away: squad(fixture.awayId) },
  };
  const bridge: Fixture = { id: fixture.id, competitionId: instance.id, stageId: fixture.stageId,
    round: fixture.round, slot: fixture.slot!, homeId: fixture.homeId, awayId: fixture.awayId };
  const ordinary: MatchIncomeRecord = {
    id: incomeIdentity({ season: 1 } as GameState, bridge), season: 1, fixture: bridge, matchBase: 8_000,
    kind: 'played', neutral: fixture.neutral, homeSponsor: 0, awaySponsor: 0, homeStand: 0,
  };
  if (status === 'cancelled') {
    instance.status = 'withdrawn';
    fixture.status = 'cancelled';
  } else if (status !== 'scheduled') {
    fixture.result = openCupResult(instance, fixture.id, { homeScore: 6, awayScore: status === 'tied' ? 6 : 0 }, status === 'forfeit');
    fixture.status = 'completed';
  }
  const accepted = fixture.result ? advanceOpenCup(instance).instance : instance;
  const { squads: _squads, ...common } = pending;
  const receipts: SettledCompetitionReward['receipts'] = [];
  if (status === 'played' || status === 'tied') {
    const [round, title] = openCupSportingOutcomes(accepted);
    const receipt = (outcomeId: string, policyId: string, kind: 'cash' | 'reputation' | 'honour') =>
      ({ id: competitionRewardReceiptId(outcomeId, policyId, kind), outcomeId, policyId, clubId: winner });
    receipts.push(
      { ...receipt(round!.id, 'final-win', 'cash'), kind: 'cash', delta: 16_000 },
      { ...receipt(title!.id, 'final-rep', 'reputation'), kind: 'reputation', advertisedDelta: 4,
        delta: 2, reputationBefore: 98, reputationAfter: 100 },
      { ...receipt(title!.id, 'champion', 'honour'), kind: 'honour', title: 'Open Cup winner', squad: squad(winner) },
    );
  }
  const settled: SettledCompetitionReward = { ...common, status: 'settled',
    resolution: fixture.result ? { kind: 'result', result: { ...fixture.result } } : { kind: 'cancelled' }, receipts };
  const context = {
    season: 1, clubId: 'player' as const, league: { clubs: [
      { id: 'player', name: 'New Player Club', strength: 60, colors: ['#fff', '#000'] as [string, string] },
      { id: 'rival', name: 'New Rival Club', strength: 60, colors: ['#fff', '#000'] as [string, string] },
    ], fixtures: [], ladder: [] }, competitions: { schemaVersion: 1 as const, instances: [accepted] }, matchIncome: [ordinary],
  };
  return { context, pending, settled, accepted };
}

describe('competition reward persistence', () => {
  it('binds receipts to the sporting outcome, policy and kind', () => {
    const { accepted, settled } = source();
    const [round, title] = openCupSportingOutcomes(accepted);
    const final = accepted.fixtures[0]!;
    expect(settled.id).toBe(JSON.stringify(['competition-reward-promise', accepted.season, accepted.id, final.id]));
    expect(settled.receipts[0]!.id).toBe(JSON.stringify(['competition-reward', round!.id, 'final-win', 'cash']));
    const changedWinner = final.result!.winnerId === final.homeId ? final.awayId : final.homeId;
    const otherOutcome = JSON.stringify([accepted.id, final.id, changedWinner, 'round-win']);
    expect(new Set([
      competitionRewardReceiptId(round!.id, 'final-win', 'cash'),
      competitionRewardReceiptId(otherOutcome, 'final-win', 'cash'),
      competitionRewardReceiptId(title!.id, 'final-win', 'cash'),
      competitionRewardReceiptId(round!.id, 'bonus', 'cash'),
      competitionRewardReceiptId(round!.id, 'final-win', 'reputation'),
    ]).size).toBe(5);
  });

  it.each(['played', 'tied', 'forfeit', 'cancelled'] as const)('reads the exact %s settlement', status => {
    const { context, settled } = source(status);
    expect(competitionRewardsProblem([settled], context)).toBeNull();
    if (status === 'forfeit' || status === 'cancelled') {
      expect(settled.receipts).toEqual([]);
      settled.receipts.push(source().settled.receipts[0]!);
      expect(competitionRewardsProblem([settled], context)).not.toBeNull();
    }
  });

  it('keeps a played round receipt valid when a later fixture is cancelled', () => {
    const { context, settled, accepted } = source();
    const clubIds = ['player', 'rival', 'other'];
    const { instance } = drawOpenCup({ definition: accepted.definition, season: 1, seed: 30, clubIds, currentSlot: 0 });
    const first = instance.fixtures[0]!;
    first.result = openCupResult(instance, first.id, { homeScore: 6, awayScore: 0 });
    first.status = 'completed';
    const active = advanceOpenCup(instance).instance;
    const [outcome] = openCupSportingOutcomes(active);
    const prior: SettledCompetitionReward = {
      ...settled, id: competitionRewardPromiseId(1, active.id, first.id), fixtureId: first.id,
      round: first.round, slot: first.slot!, homeId: first.homeId, awayId: first.awayId, neutral: false,
      policies: [{ policy: policies[0]!, cash: 16_000 }],
      resolution: { kind: 'result', result: first.result },
      receipts: [{ id: competitionRewardReceiptId(outcome!.id, 'win', 'cash'), outcomeId: outcome!.id,
        policyId: 'win', clubId: first.homeId, kind: 'cash', delta: 16_000 }],
    };
    context.competitions.instances = [active];
    context.league.clubs.push({ ...context.league.clubs[1]!, id: 'other' });
    context.matchIncome = [];
    expect(competitionRewardsProblem([prior], context)).toBeNull();

    const final = active.fixtures.find(fixture => fixture.neutral)!;
    final.status = 'cancelled';
    expect(validateCompetitions(context.competitions, { pack: 'au', season: 1, clubIds })).toBeNull();
    expect(competitionRewardsProblem([prior], context)).toBeNull();
  });

  it('validates a frozen promise before and after a result is accepted', () => {
    for (const status of ['scheduled', 'played'] as const) {
      const { context, pending } = source(status);
      const before = structuredClone({ context, pending });
      expect(competitionRewardsProblem([pending], context)).toBeNull();
      expect({ context, pending }).toEqual(before);
    }
  });

  it('requires the registered winning squad when a pending final was played', () => {
    const { context, pending, accepted } = source();
    const winner = accepted.winnerId === pending.homeId ? pending.squads!.home : pending.squads!.away;
    winner.players = [];
    expect(competitionRewardsProblem([pending], context)).not.toBeNull();

    for (const status of ['scheduled', 'forfeit', 'cancelled'] as const) {
      const ineligible = source(status);
      ineligible.pending.squads!.home.players = [];
      ineligible.pending.squads!.away.players = [];
      expect(competitionRewardsProblem([ineligible.pending], ineligible.context)).toBeNull();
    }
  });

  it('requires the same winning squad on every honour from a final', () => {
    const { context, settled, accepted } = source();
    const first = settled.receipts.find(receipt => receipt.kind === 'honour')!;
    const policy = { ...policies[3]!, id: 'champion-again' };
    accepted.definition.rewards.push(policy);
    settled.policies.push({ policy });
    const second = { ...structuredClone(first), policyId: policy.id,
      id: competitionRewardReceiptId(first.outcomeId, policy.id, 'honour') };
    settled.receipts.push(second);
    expect(competitionRewardsProblem([settled], context)).toBeNull();

    second.squad.players[0]!.name = 'Someone else';
    expect(competitionRewardsProblem([settled], context)).not.toBeNull();
  });

  it('enforces freeze order from the retained policy declaration', () => {
    const { context, pending, settled } = source();
    pending.policies = [...pending.policies].reverse();
    settled.policies = [...settled.policies].reverse();
    expect(competitionRewardsProblem([pending], context)).not.toBeNull();
    expect(competitionRewardsProblem([settled], context)).not.toBeNull();
  });

  it('validates consecutive reputation awards against the same running balance', () => {
    const { context, settled, accepted } = source();
    const first = settled.receipts.find(receipt => receipt.kind === 'reputation')!;
    const policy = { ...policies[2]!, id: 'rep-again' };
    accepted.definition.rewards.push(policy);
    settled.policies.push({ policy });
    const second = { ...first, policyId: policy.id, id: competitionRewardReceiptId(first.outcomeId, policy.id, 'reputation'),
      reputationBefore: 100, delta: 0 };
    settled.receipts.push(second);
    expect(competitionRewardsProblem([settled], context)).toBeNull();

    second.reputationBefore = 98;
    second.delta = 2;
    expect(competitionRewardsProblem([settled], context)).not.toBeNull();
  });

  it('uses the title receipt after its registered players and old source have departed', () => {
    const { context, settled } = source('tied');
    const { competitions: _pruned, ...career } = context;
    const history = { ...career, season: 4, matchIncome: [] };
    expect(competitionRewardsProblem([settled], history)).toBeNull();
    settled.receipts.pop();
    expect(competitionRewardsProblem([settled], history)).not.toBeNull();
  });

  it.each([
    ['an undrawn round', ['player', 'rival']],
    ['a bye', ['player', 'rival', 'other']],
  ] as const)('rejects historical rewards for %s in a retained bracket', (_, clubIds) => {
    const { context, settled, accepted } = source();
    const { instance, byes } = drawOpenCup({ definition: accepted.definition, season: 1, seed: 30, clubIds, currentSlot: 0 });
    const homeId = byes[0] ?? clubIds[0]!;
    const awayId = clubIds.find(club => club !== homeId)!;
    const fixtureId = [1, 2].map(ordinal => competitionFixtureId(instance.id, ordinal))
      .find(id => !instance.fixtures.some(fixture => fixture.id === id))!;
    const outcomeId = openCupOutcomeId(instance.id, fixtureId, homeId, 'round-win');
    const forged: SettledCompetitionReward = {
      ...settled, id: competitionRewardPromiseId(1, instance.id, fixtureId), fixtureId,
      round: 1, slot: 7, homeId, awayId, neutral: false, policies: [{ policy: policies[0]!, cash: 16_000 }],
      resolution: { kind: 'result', result: { homeScore: 6, awayScore: 0, winnerId: homeId, decider: 'score' } },
      receipts: [{ id: competitionRewardReceiptId(outcomeId, 'win', 'cash'), outcomeId,
        policyId: 'win', clubId: homeId, kind: 'cash', delta: 16_000 }],
    };
    context.season = 2;
    context.league.clubs.push({ ...context.league.clubs[1]!, id: 'other' });
    context.competitions.instances = [instance];
    context.matchIncome = [];
    expect(validateCompetitions(context.competitions, { pack: 'au', season: 2, clubIds })).toBeNull();
    expect(competitionRewardsProblem([forged], context)).toBe('competition reward fixture');
  });

  it.each([
    ['missing eligible receipt', (r: SettledCompetitionReward) => r.receipts.pop()],
    ['missing all eligible receipts', (r: SettledCompetitionReward) => { r.receipts.length = 0; }],
    ['duplicated receipt', (r: SettledCompetitionReward) => r.receipts.push(r.receipts[0]!)],
    ['forged promise ID', (r: SettledCompetitionReward) => { r.id = 'forged'; }],
    ['forged receipt ID', (r: SettledCompetitionReward) => { r.receipts[0]!.id = 'forged'; }],
    ['wrong winner', (r: SettledCompetitionReward) => { r.receipts[0]!.clubId = r.receipts[0]!.clubId === r.homeId ? r.awayId : r.homeId; }],
    ['wrong reputation clamp', (r: SettledCompetitionReward) => { Object.assign(r.receipts[1]!, { delta: 4, reputationAfter: 102 }); }],
    ['wrong settled result', (r: SettledCompetitionReward) => { if (r.resolution.kind === 'result') r.resolution.result.homeScore++; }],
    ['wrong final date', (r: SettledCompetitionReward) => { r.slot++; }],
    ['unrecognised record field', (r: SettledCompetitionReward) => { Object.assign(r, { unknown: 1 }); }],
    ['missing policy list', (r: SettledCompetitionReward) => { r.policies.length = 0; }],
    ['duplicate policy', (r: SettledCompetitionReward) => r.policies.push(r.policies[0]!)],
    ['lost policy and receipt', (r: SettledCompetitionReward) => { r.policies.pop(); r.receipts.pop(); }],
    ['honour without its winning players', (r: SettledCompetitionReward) => { r.receipts.find(receipt => receipt.kind === 'honour')!.squad.players = []; }],
    ['settled prize with both squad snapshots', (r: SettledCompetitionReward) => { Object.assign(r, { squads: source().pending.squads }); }],
  ] as const)('rejects %s in a settled record', (_, edit) => {
    const { context, settled } = source();
    edit(settled);
    expect(competitionRewardsProblem([settled], context)).not.toBeNull();
  });

  it('rejects duplicate aliases and a missing promise for an accepted executable fixture', () => {
    const { context, settled } = source();
    const badLedgers: CompetitionRewardRecord[][] = [[], [settled, settled], [settled, { ...settled, id: 'alias' }]];
    for (const records of badLedgers) expect(competitionRewardsProblem(records, context)).not.toBeNull();
    expect(competitionRewardsProblem([], source('scheduled').context)).toBeNull();
  });

  it('rejects inconsistent promises against the retained definition and ordinary-income base', () => {
    const { context, pending } = source();
    const wrongPolicy = structuredClone(pending);
    Object.assign(wrongPolicy.policies[0]!.policy, { matchBaseMultiplier: 3 });
    wrongPolicy.policies[0]!.cash = 24_000;
    const wrongBase = structuredClone(pending);
    wrongBase.matchBase = 12_000;
    wrongBase.policies[0]!.cash = 24_000;
    expect(competitionRewardsProblem([wrongPolicy], context)).not.toBeNull();
    expect(competitionRewardsProblem([wrongBase], context)).not.toBeNull();
    expect(competitionRewardsProblem([pending], { ...context, matchIncome: [] })).not.toBeNull();
    expect(competitionRewardsProblem([pending], { ...context, season: 3 })).not.toBeNull();
  });
});
