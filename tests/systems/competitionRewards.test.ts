import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { activePack, preparePack, selectPack } from '../../src/content';
import { buildNewGameState, emptyFinance, type GameState } from '../../src/core/state';
import type { CompetitionInstance, ExecutableCompetitionRewardPolicy } from '../../src/data/competition';
import { competitionRewardsProblem } from '../../src/data/competitionRewards';
import { fixtureBridge } from '../../src/systems/competitionCalendar';
import {
  CompetitionRewardError, competitionHonours, freezeCompetitionRewards, pruneCompetitionRewards, reconcileCompetitionRewards,
} from '../../src/systems/competitionRewards';
import { REP_BASELINE, REP_MAX } from '../../src/systems/league';
import { freezeMatchIncome, reconcileMatchIncome } from '../../src/systems/matchIncome';
import { advanceOpenCup, drawOpenCup, openCupResult } from '../../src/systems/openCup';
import { withRivalSquads } from '../../src/systems/rivals';
import { cupDefinition } from '../fixtures/competition';

const roundWin = { version: 1, trigger: 'round-win', recipient: 'winner', repeat: 'each-outcome', eligibility: 'played' } as const;
const titleWin = { ...roundWin, trigger: 'title', titleEligibility: 'played-final' } as const;
const policies = [
  { id: 'round-cash', kind: 'cash', stageId: 'cup', round: 1, matchBaseMultiplier: 2, basis: 'fixture-match-base', execution: roundWin },
  { id: 'round-rep', kind: 'reputation', stageId: 'cup', round: 1, amount: 4, execution: roundWin },
  { id: 'final-cash', kind: 'cash', stageId: 'cup', round: 2, matchBaseMultiplier: 2, basis: 'fixture-match-base', execution: roundWin },
  { id: 'final-rep', kind: 'reputation', stageId: 'cup', round: 2, amount: 4, execution: titleWin },
  { id: 'champion', kind: 'honour', stageId: 'cup', round: 2, title: 'Open Cup winner', squad: 'title-time-registered', execution: titleWin },
] as const satisfies readonly ExecutableCompetitionRewardPolicy[];

beforeAll(async () => { await preparePack('uk'); });
afterEach(() => selectPack('au'));

function career(pack: 'au' | 'uk' = 'au', entrants = 2, enterPlayer = true, season = 1) {
  selectPack(pack);
  const initial = buildNewGameState('Waterside', 575, pack === 'uk' ? { home: { town: 'Here', country: 'GB' } } : {});
  const clubs = withRivalSquads(activePack().clubs.slice(0, 4), 575);
  const definition = { ...cupDefinition(pack), id: `${pack}:open-cup`, name: 'Open Cup' };
  definition.rewards = structuredClone([...policies]);
  definition.stages[0]!.slotIds = [7, 19];
  const { instance, byes } = drawOpenCup({
    definition, season, seed: 30, currentSlot: 0, enterPlayer,
    clubIds: [initial.clubId, ...clubs.slice(0, enterPlayer ? entrants - 1 : entrants).map(club => club.id)],
  });
  const state: GameState = {
    ...initial, season, league: { ...initial.league, clubs }, competitions: { schemaVersion: 1, instances: [instance] },
  };
  return { state, instance, fixture: fixtureBridge({ instance, fixture: instance.fixtures[0]! }), clubs, definition, byes };
}

function withInstance(state: GameState, instance: CompetitionInstance): GameState {
  return { ...state, competitions: { schemaVersion: 1, instances: [instance] } };
}

function frozen(state: GameState, fixture = fixtureBridge({ instance: cup(state), fixture: cup(state).fixtures[0]! })): GameState {
  return freezeCompetitionRewards(freezeMatchIncome(state, fixture), fixture);
}

function cup(state: GameState): CompetitionInstance {
  return state.competitions!.instances[0]!;
}

function accept(state: GameState, winner: string, forfeit = false, index = 0): GameState {
  const instance = cup(state);
  const fixture = instance.fixtures[index]!;
  const score = winner === 'seeded' ? { homeScore: 12, awayScore: 12 }
    : winner === fixture.homeId ? { homeScore: 24, awayScore: 6 } : { homeScore: 6, awayScore: 24 };
  const result = openCupResult(instance, fixture.id, score, forfeit);
  const updated: CompetitionInstance = {
    ...instance, status: 'active', fixtures: instance.fixtures.map(f => f.id === fixture.id ? { ...f, status: 'completed', result } : f),
  };
  return withInstance(state, fixture.neutral ? advanceOpenCup(updated).instance : updated);
}

function cancel(state: GameState): GameState {
  const instance = cup(state);
  return withInstance(state, {
    ...instance, status: 'withdrawn',
    fixtures: instance.fixtures.map(f => f.status === 'scheduled' ? { ...f, status: 'cancelled' } : f),
  });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe('Open Cup reward promises', () => {
  it('freezes the ordinary match base, policies in saved order and both full final squads', () => {
    const { state, fixture, clubs } = career();
    const ordinary = freezeMatchIncome(state, fixture);
    const promised = frozen(deepFreeze(ordinary), fixture);
    expect(ordinary.competitionRewards).toEqual([]);
    expect(promised.matchIncome).toBe(ordinary.matchIncome);
    const [record] = promised.competitionRewards;
    expect(record).toMatchObject({
      version: 1, status: 'pending', fixtureId: fixture.id, matchBase: ordinary.matchIncome[0]!.matchBase,
      policies: [
        { policy: policies[2], cash: ordinary.matchIncome[0]!.matchBase * 2 },
        { policy: policies[3] },
        { policy: policies[4] },
      ],
    });
    if (record?.status !== 'pending') throw new Error('Expected a pending promise');
    const finalists = [record.squads!.home, record.squads!.away];
    expect(finalists.find(squad => squad.clubId === state.clubId)).toEqual({
      clubId: state.clubId, clubName: state.clubName, players: state.squad.map(({ id, name }) => ({ id, name })),
    });
    expect(finalists.find(squad => squad.clubId === clubs[0]!.id)).toEqual({
      clubId: clubs[0]!.id, clubName: clubs[0]!.name, players: clubs[0]!.squad!.map(({ id, name }) => ({ id, name })),
    });
    expect(record.policies[0].policy).not.toBe(cup(promised).definition.rewards[2]);
    expect(record.policies[0].policy.execution).not.toBe((cup(promised).definition.rewards[2] as ExecutableCompetitionRewardPolicy).execution);
    expect(freezeCompetitionRewards(promised, fixture)).toBe(promised);
  });

  it.each(['empty', 'legacy', 'completed'] as const)('skips %s fixtures', kind => {
    const { state, instance, fixture } = career();
    const candidate = kind === 'completed' ? accept(state, state.clubId) : withInstance(state, {
      ...instance, definition: { ...instance.definition, rewards: kind === 'legacy' ? cupDefinition().rewards : [] },
    });
    expect(freezeCompetitionRewards(candidate, fixture)).toBe(candidate);
  });

  it('rejects a mismatched bridge and missing or mismatched ordinary source', () => {
    const { state, fixture } = career();
    const ordinary = freezeMatchIncome(state, fixture);
    expect(() => freezeCompetitionRewards(ordinary, { ...fixture, slot: fixture.slot! + 1 })).toThrow(CompetitionRewardError);
    expect(() => freezeCompetitionRewards(state, fixture)).toThrow(CompetitionRewardError);
    const mismatch = { ...ordinary, matchIncome: ordinary.matchIncome.map(r => ({ ...r, neutral: false })) };
    expect(() => freezeCompetitionRewards(mismatch, fixture)).toThrow(CompetitionRewardError);
  });

  it('rejects unsafe quotes and invalid recipient reputation before kickoff', () => {
    const { state, instance, fixture } = career();
    const tooLarge = { ...instance, definition: { ...instance.definition, rewards: [
      { ...policies[2], matchBaseMultiplier: Number.MAX_SAFE_INTEGER },
    ] } };
    expect(() => frozen(withInstance(state, tooLarge), fixture)).toThrow(CompetitionRewardError);
    expect(() => frozen({ ...state, reputation: NaN }, fixture)).toThrow(CompetitionRewardError);
  });

  it('rejects malformed execution and mixed legacy/executable definitions', () => {
    const { state, instance, fixture } = career();
    const unsupported = { ...instance, definition: { ...instance.definition, rewards: [
      { ...policies[2], execution: undefined } as unknown as ExecutableCompetitionRewardPolicy,
    ] } };
    const mixed = { ...instance, definition: { ...instance.definition, rewards: [
      ...instance.definition.rewards, ...cupDefinition().rewards,
    ] } };
    expect(() => frozen(withInstance(state, unsupported), fixture)).toThrow(CompetitionRewardError);
    expect(() => reconcileCompetitionRewards(withInstance(state, unsupported))).toThrow(CompetitionRewardError);
    expect(() => frozen(withInstance(state, mixed), fixture)).toThrow(CompetitionRewardError);
    expect(() => reconcileCompetitionRewards(withInstance(state, mixed))).toThrow(CompetitionRewardError);
  });

  it('ignores changes to the original catalogue and rejects changes to the saved definition', () => {
    const { state, fixture, definition } = career();
    const promised = frozen(state, fixture);
    definition.rewards[2] = { ...policies[2], matchBaseMultiplier: 99 };
    expect(reconcileCompetitionRewards(accept(promised, state.clubId)).money - state.money).toBe(promised.matchIncome[0]!.matchBase * 2);
    const saved = cup(promised);
    const corrupted = withInstance(promised, { ...saved, definition: { ...saved.definition, rewards: definition.rewards } });
    expect(() => reconcileCompetitionRewards(accept(corrupted, state.clubId))).toThrow(CompetitionRewardError);
  });

  it('does not create promises for byes', () => {
    const { state, byes } = career('au', 3);
    const promised = frozen(state);
    const [record] = promised.competitionRewards;
    expect(byes).toHaveLength(1);
    expect(promised.competitionRewards).toHaveLength(1);
    expect([record!.homeId, record!.awayId]).not.toContain(byes[0]);
    expect(reconcileCompetitionRewards(promised)).toBe(promised);
  });
});

describe('Open Cup reward settlement', () => {
  it('credits player cash and the source season prize book once, preserving cap and player state', () => {
    const { state, clubs, fixture } = career('au', 2, true, 2);
    const accepted = deepFreeze(accept(frozen({ ...state, reputation: 99 }, fixture), state.clubId));
    const settled = reconcileCompetitionRewards(accepted);
    const cash = accepted.matchIncome[0]!.matchBase * 2;
    expect(settled.money).toBe(state.money + cash);
    expect(settled.finance).toEqual([emptyFinance(1), { ...emptyFinance(2), prize: cash }]);
    expect(settled.reputation).toBe(REP_MAX);
    expect(settled.competitionRewards[0]).toMatchObject({ status: 'settled', receipts: [
      { kind: 'cash', clubId: state.clubId, delta: cash },
      { kind: 'reputation', clubId: state.clubId, advertisedDelta: 4, delta: 1, reputationBefore: 99, reputationAfter: 100 },
      { kind: 'honour', clubId: state.clubId },
    ] });
    expect(settled.capAccount).toBe(state.capAccount);
    expect(settled.squad).toBe(state.squad);
    expect(settled.league.clubs[0]).toBe(clubs[0]);
    expect(competitionRewardsProblem(settled.competitionRewards, settled)).toBeNull();
    const reloaded = JSON.parse(JSON.stringify(settled)) as GameState;
    expect(reconcileCompetitionRewards(reloaded)).toBe(reloaded);
  });

  it('uses the UK rival wallet and initializes reputation only on an award', () => {
    const { state, clubs } = career('uk');
    const winner = clubs[0]!;
    const promised = frozen(state);
    const accepted = accept(promised, winner.id);
    const settled = reconcileCompetitionRewards(accepted);
    expect(settled.league.clubs[0]).toMatchObject({
      cash: winner.cash! + promised.matchIncome[0]!.matchBase * 2, reputation: REP_BASELINE + 4,
    });
    expect(settled.league.clubs[0]!.capAccount).toBe(winner.capAccount);
    expect(settled.league.clubs[0]!.squad).toBe(winner.squad);
    expect(settled.league.clubs[1]).toBe(clubs[1]);
    expect(settled.money).toBe(state.money);
    expect(settled.finance).toBe(state.finance);
    expect(settled.reputation).toBe(state.reputation);
    expect(reconcileCompetitionRewards(settled)).toBe(settled);
  });

  it('chains reputation receipts in saved policy order', () => {
    const { state, instance } = career();
    const saved = { ...instance, definition: { ...instance.definition, rewards: [
      ...instance.definition.rewards, { ...policies[3], id: 'second-rep' },
    ] } };
    const accepted = accept(frozen(withInstance({ ...state, reputation: 95 }, saved)), state.clubId);
    expect(reconcileCompetitionRewards(accepted).competitionRewards[0]).toMatchObject({ receipts: [
      { kind: 'cash' },
      { kind: 'reputation', delta: 4, reputationBefore: 95, reputationAfter: 99 },
      { kind: 'honour' },
      { kind: 'reputation', delta: 1, reputationBefore: 99, reputationAfter: 100 },
    ] });
  });

  it('pays the saved seeded winner of an actual tied score', () => {
    const { state, instance } = career();
    const accepted = accept(frozen(state), 'seeded');
    const settled = reconcileCompetitionRewards(accepted);
    expect(settled.competitionRewards[0]).toMatchObject({
      resolution: { kind: 'result', result: { homeScore: 12, awayScore: 12, winnerId: instance.tieOrder[0], decider: 'seeded-draw' } },
      receipts: [{ clubId: instance.tieOrder[0] }, { clubId: instance.tieOrder[0] }, { clubId: instance.tieOrder[0] }],
    });
  });

  it.each(['forfeit', 'cancelled'] as const)('settles a %s final with no award even when one roster is empty', kind => {
    const { state, clubs } = career();
    const promised = frozen({ ...state, squad: [] });
    const accepted = kind === 'forfeit' ? accept(promised, clubs[0]!.id, true) : cancel(promised);
    const settled = reconcileCompetitionRewards(accepted);
    expect(settled.competitionRewards[0]).toMatchObject({
      status: 'settled', receipts: [],
      resolution: kind === 'forfeit' ? { kind: 'result', result: { decider: 'forfeit' } } : { kind: 'cancelled' },
    });
    expect(settled.money).toBe(state.money);
    expect(settled.reputation).toBe(state.reputation);
    expect(settled.league).toBe(state.league);
    expect(reconcileCompetitionRewards(settled)).toBe(settled);
  });

  it('requires a played title winner to have saved squad evidence', () => {
    const { state } = career();
    const accepted = accept(frozen({ ...state, squad: [] }), state.clubId);
    expect(() => reconcileCompetitionRewards(accepted)).toThrow(CompetitionRewardError);
  });

  it('settles an accepted round win after the rest of the draw is cancelled', () => {
    const { state, fixture } = career('au', 4, false);
    const accepted = accept(frozen(state), fixture.homeId);
    const paidBeforeCancellation = reconcileCompetitionRewards(accepted);
    const paidAfterCancellation = reconcileCompetitionRewards(cancel(accepted));
    expect(paidAfterCancellation.competitionRewards).toEqual(paidBeforeCancellation.competitionRewards);
    expect(reconcileCompetitionRewards(cancel(paidBeforeCancellation)).competitionRewards)
      .toBe(paidBeforeCancellation.competitionRewards);
  });

  it('uses the same missing-rival-cash basis with either prize-only or both settlements', () => {
    const { state, clubs } = career();
    const winner = clubs[0]!;
    const { cash: _cash, ...withoutCash } = winner;
    const promised = frozen({ ...state, league: { ...state.league, clubs: [withoutCash, ...clubs.slice(1)] } });
    const accepted = accept(promised, winner.id);
    const prize = promised.matchIncome[0]!.matchBase * 2;
    expect(reconcileCompetitionRewards(accepted).league.clubs[0]!.cash).toBe(60_000 + prize);
    const ordinary = reconcileMatchIncome(accepted);
    expect(reconcileCompetitionRewards(ordinary).league.clubs[0]!.cash).toBe(ordinary.league.clubs[0]!.cash! + prize);
    expect(ordinary.league.clubs[0]!.cash).toBeGreaterThan(60_000);
  });

  it('rejects an absent rival at freezing and settlement', () => {
    const { state, clubs } = career();
    const accepted = accept(frozen(state), clubs[0]!.id);
    const league = { ...state.league, clubs: clubs.slice(1) };
    expect(() => frozen({ ...state, league })).toThrow(CompetitionRewardError);
    expect(() => reconcileCompetitionRewards({ ...accepted, league })).toThrow(CompetitionRewardError);
  });

  it('rejects missing promises and receipts instead of replaying a payout', () => {
    const { state } = career();
    const accepted = accept(frozen(state), state.clubId);
    expect(() => reconcileCompetitionRewards({ ...accepted, competitionRewards: [] })).toThrow(CompetitionRewardError);
    const settled = reconcileCompetitionRewards(accepted);
    const record = settled.competitionRewards[0]!;
    const missingReceipt = { ...record, receipts: [] };
    expect(() => reconcileCompetitionRewards({ ...settled, competitionRewards: [missingReceipt] })).toThrow(CompetitionRewardError);
  });

  it.each(['wallet', 'books'] as const)('rejects player %s overflow', source => {
    const { state } = career();
    const accepted = accept(frozen(state), state.clubId);
    const overflow = deepFreeze(source === 'wallet' ? { ...accepted, money: Number.MAX_SAFE_INTEGER }
      : { ...accepted, finance: [{ ...emptyFinance(1), prize: Number.MAX_SAFE_INTEGER }] });
    const before = structuredClone(overflow);
    expect(() => reconcileCompetitionRewards(overflow)).toThrow(CompetitionRewardError);
    expect(overflow).toEqual(before);
  });

  it('leaves the whole input untouched when the second pending rival award overflows', () => {
    const { state, instance } = career('au', 4, false);
    const secondFixture = instance.fixtures[1]!;
    const promised = frozen(frozen(state), fixtureBridge({ instance, fixture: secondFixture }));
    const accepted = accept(accept(promised, instance.fixtures[0]!.homeId), secondFixture.homeId, false, 1);
    const rival = secondFixture.homeId;
    const unsafe = deepFreeze({
      ...accepted, league: { ...accepted.league, clubs: accepted.league.clubs.map(c => c.id === rival ? { ...c, cash: Number.MAX_SAFE_INTEGER } : c) },
    });
    const before = structuredClone(unsafe);
    expect(() => reconcileCompetitionRewards(unsafe)).toThrow(CompetitionRewardError);
    expect(unsafe).toEqual(before);
    const paid = reconcileCompetitionRewards(accepted);
    expect(paid.competitionRewards.map(record => record.status)).toEqual(['settled', 'settled']);
    expect(paid.league.clubs.find(c => c.id === instance.fixtures[0]!.homeId)?.reputation).toBe(REP_BASELINE + 4);
  });
});

describe('Open Cup honours and retention', () => {
  it.each(['player', 'rival'] as const)('preserves %s final squad history through roster and name changes', kind => {
    const { state, clubs, fixture, instance } = career();
    const winner = kind === 'player' ? state.clubId : clubs[0]!.id;
    const clubName = kind === 'player' ? state.clubName : clubs[0]!.name;
    const roster = kind === 'player' ? state.squad : clubs[0]!.squad!;
    const accepted = accept(frozen(state), winner);
    const arrived = state.freeAgents[0]!;
    const updatedRoster = [...roster.slice(2), arrived];
    const moved = kind === 'player' ? { ...accepted, clubName: 'New Club Name', squad: updatedRoster }
      : { ...accepted, league: { ...accepted.league, clubs: [{ ...clubs[0]!, name: 'New Rival Name', squad: updatedRoster }, ...clubs.slice(1)] } };
    const settled = reconcileCompetitionRewards(moved);
    expect(settled.competitionRewards[0]).not.toHaveProperty('squads');
    const honours = competitionHonours(settled, winner);
    expect(honours).toMatchObject([{
      definitionId: instance.definition.id, definitionName: 'Open Cup', instanceId: instance.id, fixtureId: fixture.id,
      season: 1, title: 'Open Cup winner', clubId: winner, clubName, players: roster.map(({ id, name }) => ({ id, name })),
    }]);
    expect(honours[0]!.players.some(player => player.id === arrived.id)).toBe(false);
    expect(Object.isFrozen(honours)).toBe(true);
    expect(Object.isFrozen(honours[0])).toBe(true);
    expect(Object.isFrozen(honours[0]!.players)).toBe(true);
    expect(Object.isFrozen(honours[0]!.players[0])).toBe(true);
    expect(competitionHonours(settled, kind === 'player' ? clubs[0]!.id : state.clubId)).toEqual([]);
  });

  it('keeps current and previous records, older retained sources and permanent honours', () => {
    const first = career('au', 4);
    const firstMatches = first.instance.fixtures.reduce((state, fixture, index) => {
      const winner = [fixture.homeId, fixture.awayId].includes(state.clubId) ? state.clubId : fixture.homeId;
      return accept(frozen(state, fixtureBridge({ instance: first.instance, fixture })), winner, false, index);
    }, first.state);
    const advanced = withInstance(firstMatches, advanceOpenCup(cup(firstMatches)).instance);
    const finalIndex = cup(advanced).fixtures.length - 1;
    const finalFixture = fixtureBridge({ instance: cup(advanced), fixture: cup(advanced).fixtures[finalIndex]! });
    const final = reconcileCompetitionRewards(accept(frozen(advanced, finalFixture), first.state.clubId, false, finalIndex));
    const finalRecord = final.competitionRewards[finalIndex]!;
    const future = career('au', 4, false, 2);
    const prior = reconcileCompetitionRewards(accept(frozen(future.state), future.fixture.homeId));
    const current = career('au', 4, false, 3);
    const currentPending = frozen(current.state);
    const old = {
      ...currentPending, competitions: { schemaVersion: 1 as const, instances: [cup(currentPending), cup(final), cup(prior)] },
      competitionRewards: [...final.competitionRewards, ...prior.competitionRewards, ...currentPending.competitionRewards],
    };
    expect(competitionRewardsProblem(old.competitionRewards, old)).toBeNull();
    expect(pruneCompetitionRewards(old)).toBe(old);
    const sourcePruned = {
      ...old, competitions: { schemaVersion: 1 as const, instances: [cup(currentPending)] },
    };
    expect(pruneCompetitionRewards(sourcePruned).competitionRewards).toEqual([
      finalRecord, ...prior.competitionRewards, ...currentPending.competitionRewards,
    ]);
    const pruned = pruneCompetitionRewards(sourcePruned);
    expect(competitionRewardsProblem(pruned.competitionRewards, pruned)).toBeNull();
    expect(competitionHonours(pruned, first.state.clubId)).toEqual(competitionHonours(final, first.state.clubId));
  });

  it('rejects stale pending records instead of pruning them', () => {
    const state = frozen(career().state);
    const stale = { ...state, season: state.season + 1 };
    expect(() => pruneCompetitionRewards(stale)).toThrow(CompetitionRewardError);
    expect(() => reconcileCompetitionRewards(stale)).toThrow(CompetitionRewardError);
  });
});
