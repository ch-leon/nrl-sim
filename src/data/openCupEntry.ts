// Seasonal registration evidence. Sporting results stay in the competition instance.
import {
  competitionInstanceId,
  isOpenCupDefinitionId,
  type CompetitionCareerState,
  type CompetitionDefinition,
  type CompetitionRewardPolicy,
  type CompetitionInstance,
  type CompetitionResult
} from './competition';
import { canonicalLeagueJson } from './leagueCareer';
import { openCupProblem } from '../systems/openCup';
import { openCupField } from './openCupField';

export type CupChoice = 'unanswered' | 'enter' | 'decline';
export interface CupChoiceReceipt {
  offerId: string;
  season: number;
  choice: Exclude<CupChoice, 'unanswered'>;
  slot: number;
}
export interface CupWithdrawal {
  requestSlot: number;
  fulfilled: { fixtureId: string; slot: number; result: CompetitionResult } | null;
}
export interface OpenCupOffer {
  offerId: string;
  season: number;
  profileId: string;
  profileVersion: number;
  definition: CompetitionDefinition;
  dates: number[];
  deadline: number;
  eligibleClubIds: string[];
  draw: { scheduleSeed: number; ordinal: 0 };
  lifecycle: 'open' | 'drawn' | 'unavailable';
  choice: CupChoice;
  lastChoice: CupChoiceReceipt | null;
  resolution: 'entered' | 'declined' | 'expired' | 'legacy-window-missed' | 'legacy-cup' | null;
  instanceId: string | null;
  withdrawal: CupWithdrawal | null;
}
export interface OpenCupEntryState {
  version: 1;
  current: OpenCupOffer;
  retained: OpenCupOffer[];
}
export const offerIdentity = (id: string, season: number): string => competitionInstanceId(id, season, 0) + ':offer';
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const fields = (v: unknown, keys: string[]): boolean => record(v) && Object.keys(v).length === keys.length && keys.every(k => k in v);
const same = (a: unknown, b: unknown): boolean => canonicalLeagueJson(a) === canonicalLeagueJson(b);
const slot = (v: number, low: number, high: number): boolean => Number.isSafeInteger(v) && v >= low && v <= high;

function rewards(): CompetitionRewardPolicy[] {
  const winner = { version: 1, recipient: 'winner', repeat: 'each-outcome', eligibility: 'played' } as const;
  const execution = { ...winner, trigger: 'round-win' } as const;
  const title = { ...winner, trigger: 'title', titleEligibility: 'played-final' } as const;
  const policies: CompetitionRewardPolicy[] = [];
  for (const [index, multiplier] of [1, 1, 2, 3, 5].entries()) {
    const round = index + 1;
    policies.push(
      {
        id: 'round-' + round + '-cash',
        stageId: 'cup',
        round,
        kind: 'cash',
        matchBaseMultiplier: multiplier,
        basis: 'fixture-match-base',
        execution
      },
      { id: 'round-' + round + '-rep', stageId: 'cup', round, kind: 'reputation', amount: 1, execution }
    );
  }
  policies.push(
    { id: 'title-rep', stageId: 'cup', round: 5, kind: 'reputation', amount: 2, execution: title },
    { id: 'title-honour', stageId: 'cup', round: 5, kind: 'honour', title: 'Open Cup', squad: 'title-time-registered', execution: title }
  );
  return policies;
}

/** Only the saved division rules and league/trial calendar supply the terms. */
export function cupDefinition(c: CompetitionCareerState): CompetitionDefinition {
  const world = c.world!;
  const leagues = world.divisions.map(d => c.instances.find(i => i.id === d.instanceId)!);
  const booked = new Set(leagues.flatMap(i => i.definition.stages.flatMap(s => s.slotIds ?? [])));
  const dates = c.calendar!.slots.filter(s => s.kind === 'competition' && !booked.has(s.id)).map(s => s.id);
  if (!same(dates, [7, 10, 13, 16, 19])) throw Error('Unsupported Open Cup dates.');
  const league = leagues[0]!.definition;
  return {
    id: world.profile.id + ':open-cup',
    version: world.profile.version,
    pack: world.profile.pack,
    name: 'Open Cup',
    format: { kind: 'knockout' },
    minEntrants: 2,
    maxEntrants: 32,
    slotCount: league.slotCount,
    stages: [{ id: 'cup', name: 'Open Cup', kind: 'knockout', rounds: 5, slotIds: dates }],
    matchRules: { ...league.matchRules },
    lineup: { ...league.lineup },
    eligibility: { kind: 'open' },
    venues: { rounds: 'drawn-home', final: 'neutral' },
    drawnKnockout: 'seeded-draw',
    rewards: rewards()
  };
}

function withdrawalValid(o: OpenCupOffer, i: CompetitionInstance, player: string, week: number): boolean {
  const w = o.withdrawal;
  if (w === null) return true;
  if (!fields(w, ['requestSlot', 'fulfilled']) || !slot(w.requestSlot, o.deadline, week) || o.resolution !== 'entered') return false;
  const ties = i.fixtures.filter(f => f.homeId === player || f.awayId === player).sort((a, b) => a.round - b.round);
  if (ties.some(f => f.slot! < w.requestSlot && f.result && f.result.winnerId !== player)) return false;
  const next = ties.find(f => f.slot! >= w.requestSlot);
  if (w.fulfilled === null)
    return ['active', 'scheduled'].includes(i.status) && (!next || (next.status === 'scheduled' && next.slot! >= week));
  const f = w.fulfilled;
  return (
    fields(f, ['fixtureId', 'slot', 'result']) &&
    !!next &&
    next.id === f.fixtureId &&
    f.slot === next.slot &&
    f.slot <= week &&
    next.status === 'completed' &&
    next.result?.decider === 'forfeit' &&
    next.result.winnerId !== player &&
    same(f.result, next.result) &&
    Math.min(next.result.homeScore, next.result.awayScore) === 0 &&
    Math.max(next.result.homeScore, next.result.awayScore) === 24
  );
}

type Context = { pack: string; season: number; week?: number; clubIds: readonly string[]; clubId?: string };
export function validateOpenCupEntry(value: unknown, c: CompetitionCareerState, context: Context): string | null {
  const progress = c.leagueCareer;
  const executable = c.instances.filter(i => i.definition.rewards.some(p => 'execution' in p));
  if (!progress) return value === undefined ? null : 'unexpected Open Cup entry';
  if (value === undefined) return progress.phase === 'active' || executable.length ? 'missing Open Cup entry' : null;
  if (!fields(value, ['version', 'current', 'retained']) || progress.phase === 'initial-choice') return 'Open Cup entry';
  const e = value as OpenCupEntryState;
  if (e.version !== 1 || !Array.isArray(e.retained) || e.retained.length > 1) return 'Open Cup entry version or retention';
  const proven = new Set<string>();
  const canonical = [...context.clubIds].sort();
  const definition = cupDefinition(c);
  for (const [index, o] of [e.current, ...e.retained].entries()) {
    if (
      !fields(o, [
        'offerId',
        'season',
        'profileId',
        'profileVersion',
        'definition',
        'dates',
        'deadline',
        'eligibleClubIds',
        'draw',
        'lifecycle',
        'choice',
        'lastChoice',
        'resolution',
        'instanceId',
        'withdrawal'
      ]) ||
      o.season !== context.season - index ||
      o.offerId !== offerIdentity(definition.id, o.season) ||
      o.profileId !== c.world!.profile.id ||
      o.profileVersion !== c.world!.profile.version ||
      !same(o.definition, definition) ||
      !same(o.dates, definition.stages[0]!.slotIds) ||
      o.deadline !== o.dates[0] ||
      !same(o.eligibleClubIds, canonical) ||
      !same(o.draw, { scheduleSeed: progress.scheduleSeed, ordinal: 0 })
    )
      return 'Open Cup offer terms';
    const week = index || context.week === undefined ? definition.slotCount : context.week;
    if (
      o.choice === 'unanswered'
        ? o.lastChoice !== null
        : !['enter', 'decline'].includes(o.choice) ||
          !fields(o.lastChoice, ['offerId', 'season', 'choice', 'slot']) ||
          o.lastChoice!.offerId !== o.offerId ||
          o.lastChoice!.season !== o.season ||
          o.lastChoice!.choice !== o.choice ||
          !slot(o.lastChoice!.slot, 1, Math.min(o.deadline - 1, week))
    )
      return 'Open Cup choice receipt';
    const cups = c.instances.filter(i => i.season === o.season && isOpenCupDefinitionId(i.definition.id));
    if (o.lifecycle === 'open') {
      if (
        index ||
        (context.week !== undefined && week >= o.deadline) ||
        progress.phase !== 'active' ||
        cups.length ||
        o.resolution !== null ||
        o.instanceId !== null ||
        o.withdrawal !== null
      )
        return 'Open Cup registration window';
    } else if (o.lifecycle === 'unavailable') {
      if (index || o.choice !== 'unanswered' || o.withdrawal !== null || o.instanceId !== null) return 'Open Cup unavailable';
      if (
        o.resolution === 'legacy-cup'
          ? cups.length !== 1 || executable.includes(cups[0]!)
          : o.resolution !== 'legacy-window-missed' || week < o.deadline || cups.length
      )
        return 'Open Cup legacy reason';
    } else if (o.lifecycle === 'drawn') {
      const instance = cups[0];
      const expectedId = competitionInstanceId(definition.id, o.season, 0);
      if (
        week < o.deadline - 1 ||
        cups.length !== 1 ||
        !instance ||
        instance.id !== expectedId ||
        o.instanceId !== expectedId ||
        !same(instance.definition, o.definition) ||
        !['scheduled', 'active', 'completed'].includes(instance.status) ||
        o.resolution !== ({ enter: 'entered', decline: 'declined', unanswered: 'expired' } as const)[o.choice]
      )
        return 'Open Cup activation';
      const ids = canonical.filter(id => o.choice === 'enter' || id !== progress.clubId);
      const field = openCupField(definition, o.season, 0, o.draw.scheduleSeed, ids);
      if (
        openCupProblem(instance) ||
        !same(instance.entrantIds, field.entrants) ||
        !same(instance.tieOrder, field.tieOrder) ||
        !withdrawalValid(o, instance, progress.clubId, week)
      )
        return 'Open Cup draw or withdrawal evidence';
      proven.add(expectedId);
    } else return 'Open Cup lifecycle';
  }
  return executable.some(i => !proven.has(i.id)) ? 'unactivated executable competition' : null;
}
