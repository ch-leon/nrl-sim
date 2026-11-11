// Competition metadata only (#570). The existing match/time systems remain
// authoritative until the calendar and result-lifecycle work wires this in.
import type { MatchRules } from '../content/pack';
import { validateCompetitionCalendar, type CompetitionCalendar } from './competitionCalendar';
import { validateCompetitionWorld, type CompetitionWorldMetadata } from './competitionDivisions';

export type CompetitionFormat =
  | { kind: 'league'; finalsSize: number }
  | { kind: 'knockout' }
  | { kind: 'group'; groupSize: number; qualifiersPerGroup: number }
  | { kind: 'series'; winsRequired: number }
  | { kind: 'exhibition' };
export type CompetitionStageKind = CompetitionFormat['kind'];
export interface CompetitionStageDefinition {
  id: string;
  name: string;
  kind: CompetitionStageKind;
  rounds: number;
  /** Optional snapshotted dates: one ascending calendar slot per stage round. */
  slotIds?: number[];
}
export type CompetitionRewardPolicy = { id: string; stageId: string; round: number } & (
  | { kind: 'cash'; matchBaseMultiplier: number }
  | { kind: 'reputation'; amount: number }
  | { kind: 'honour'; title: string }
  | { kind: 'capAllowance'; basisPoints: number; uniqueKey: string; effective: 'next-season' }
);
export interface CompetitionLineupPolicy { onField: number; benchSize: number; minSquad: number; maxSquad: number }
export type CompetitionEligibility = { kind: 'open' } | {
  kind: 'youth'; maxAge: number; minRegistered: number; minStarters: number; minBench: number; minOnField: number;
};
export interface CompetitionStandingsPolicy {
  win: number;
  draw: number;
  loss: number;
  tieBreakers: Array<'points-difference' | 'points-for' | 'head-to-head-points' | 'frozen-order'>;
}
/** A saved instance owns a deep snapshot, never a live reference to the pack. */
export interface CompetitionDefinition {
  id: string;
  version: number;
  pack: string;
  name: string;
  format: CompetitionFormat;
  minEntrants: number;
  maxEntrants: number;
  slotCount: number;
  stages: CompetitionStageDefinition[];
  matchRules: MatchRules;
  lineup: CompetitionLineupPolicy;
  eligibility: CompetitionEligibility;
  venues: { rounds: 'home-away' | 'drawn-home' | 'higher-seed' | 'neutral' | 'alternating'; final: 'neutral' | 'same-as-rounds' };
  standings?: CompetitionStandingsPolicy;
  drawnKnockout: 'higher-seed' | 'seeded-draw';
  rewards: CompetitionRewardPolicy[];
}
export type CompetitionStatus = 'offered' | 'qualified' | 'entered' | 'declined' | 'scheduled' | 'active' | 'completed' | 'withdrawn';
export interface CompetitionResult {
  homeScore: number;
  awayScore: number;
  /** A tied score can have a sporting winner without inventing a scored goal. */
  winnerId?: string;
  decider: 'score' | 'draw' | 'higher-seed' | 'seeded-draw' | 'forfeit';
}
export interface CompetitionFixture {
  id: string;
  competitionId: string;
  stageId: string;
  round: number;
  slot?: number;
  homeId: string;
  awayId: string;
  neutral: boolean;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  result?: CompetitionResult;
}
export interface CompetitionInstance {
  id: string;
  season: number;
  definition: CompetitionDefinition;
  entrantIds: string[];
  /** Frozen seeded/qualification order; a result cannot choose a new tie winner. */
  tieOrder: string[];
  status: CompetitionStatus;
  stageId: string | null;
  fixtures: CompetitionFixture[];
  winnerId?: string;
}
export interface CompetitionCareerState {
  schemaVersion: 1;
  instances: CompetitionInstance[];
  calendar?: CompetitionCalendar;
  world?: CompetitionWorldMetadata;
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const number = (v: unknown, min = 0): v is number => finite(v) && v >= min;
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => number(v, min) && Number.isSafeInteger(v) && v <= max;
const unique = (xs: readonly unknown[]): boolean => new Set(xs).size === xs.length;
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(k => allowed.includes(k));
const powerOfTwo = (n: number): boolean => n >= 2 && Number.isInteger(Math.log2(n));
const STAGE_KINDS: readonly CompetitionStageKind[] = ['league', 'knockout', 'group', 'series', 'exhibition'];
const STATUSES: readonly CompetitionStatus[] = ['offered', 'qualified', 'entered', 'declined', 'scheduled', 'active', 'completed', 'withdrawn'];

function format(v: unknown): v is CompetitionFormat {
  if (!record(v)) return false;
  switch (v.kind) {
    case 'league': return keys(v, ['kind', 'finalsSize']) && integer(v.finalsSize) && (v.finalsSize === 0 || powerOfTwo(v.finalsSize));
    case 'knockout':
    case 'exhibition': return keys(v, ['kind']);
    case 'group': return keys(v, ['kind', 'groupSize', 'qualifiersPerGroup']) && integer(v.groupSize, 2) && integer(v.qualifiersPerGroup, 1, v.groupSize - 1);
    case 'series': return keys(v, ['kind', 'winsRequired']) && integer(v.winsRequired, 1);
    default: return false;
  }
}
function matchRules(v: unknown): v is MatchRules {
  if (!record(v) || !keys(v, ['halfMinutes', 'tryPoints', 'bonusTryPoints', 'conversionPoints', 'fieldGoalPoints', 'halfTimeTicks', 'halfTimeLegsBack', 'playOnMaxS', 'goldenPointMinutes', 'goldenPointBreakTicks'])) return false;
  return number(v.halfMinutes, Number.MIN_VALUE) && integer(v.tryPoints, 1) && integer(v.bonusTryPoints, 1)
    && integer(v.conversionPoints, 1) && integer(v.fieldGoalPoints, 1) && integer(v.halfTimeTicks)
    && number(v.halfTimeLegsBack) && v.halfTimeLegsBack <= 1 && number(v.playOnMaxS, Number.MIN_VALUE)
    && number(v.goldenPointMinutes, Number.MIN_VALUE) && integer(v.goldenPointBreakTicks);
}
function reward(v: unknown, stages: readonly CompetitionStageDefinition[]): boolean {
  if (!record(v) || !text(v.id) || !text(v.stageId) || !integer(v.round, 1)) return false;
  const stage = stages.find(s => s.id === v.stageId);
  if (!stage || v.round > stage.rounds) return false;
  const common = ['id', 'stageId', 'round', 'kind'];
  switch (v.kind) {
    case 'cash': return keys(v, [...common, 'matchBaseMultiplier']) && number(v.matchBaseMultiplier);
    case 'reputation': return keys(v, [...common, 'amount']) && number(v.amount);
    case 'honour': return keys(v, [...common, 'title']) && text(v.title);
    case 'capAllowance': return keys(v, [...common, 'basisPoints', 'uniqueKey', 'effective']) && integer(v.basisPoints, 0, 10_000) && text(v.uniqueKey) && v.effective === 'next-season';
    default: return false;
  }
}

function lineupAndEligibility(lineup: unknown, eligibility: unknown): boolean {
  if (!record(lineup) || !keys(lineup, ['onField', 'benchSize', 'minSquad', 'maxSquad'])
    || !integer(lineup.onField, 1) || !integer(lineup.benchSize) || !integer(lineup.minSquad, lineup.onField + lineup.benchSize)
    || !integer(lineup.maxSquad, lineup.minSquad) || !record(eligibility)) return false;
  if (eligibility.kind === 'open') return keys(eligibility, ['kind']);
  return eligibility.kind === 'youth' && keys(eligibility, ['kind', 'maxAge', 'minRegistered', 'minStarters', 'minBench', 'minOnField'])
    && integer(eligibility.maxAge, 1) && integer(eligibility.minStarters, 1, lineup.onField)
    && integer(eligibility.minBench, 0, lineup.benchSize) && integer(eligibility.minOnField, 1, eligibility.minStarters)
    && integer(eligibility.minRegistered, eligibility.minStarters + eligibility.minBench, lineup.minSquad);
}
function standings(v: unknown): v is CompetitionStandingsPolicy {
  return record(v) && keys(v, ['win', 'draw', 'loss', 'tieBreakers']) && integer(v.win) && integer(v.draw) && integer(v.loss)
    && Array.isArray(v.tieBreakers) && v.tieBreakers.length > 0 && unique(v.tieBreakers)
    && v.tieBreakers.every(t => typeof t === 'string' && ['points-difference', 'points-for', 'head-to-head-points', 'frozen-order'].includes(t))
    && v.tieBreakers[v.tieBreakers.length - 1] === 'frozen-order';
}

/** Validates only declared metadata, without selecting a pack or running RNG. */
export function validateCompetitionDefinition(v: unknown): string | null {
  if (!record(v) || !keys(v, ['id', 'version', 'pack', 'name', 'format', 'minEntrants', 'maxEntrants', 'slotCount', 'stages', 'matchRules', 'lineup', 'eligibility', 'venues', 'standings', 'drawnKnockout', 'rewards'])
    || !text(v.id) || !integer(v.version, 1) || !text(v.pack) || !text(v.name) || !format(v.format)
    || !integer(v.minEntrants, 2) || !integer(v.maxEntrants, v.minEntrants) || !integer(v.slotCount, 1)) return 'definition fields';
  if (!Array.isArray(v.stages) || v.stages.length === 0 || !v.stages.every(s => record(s)
    && keys(s, ['id', 'name', 'kind', 'rounds', 'slotIds']) && text(s.id) && text(s.name)
    && STAGE_KINDS.includes(s.kind as CompetitionStageKind) && integer(s.rounds, 1, v.slotCount as number)
    && (s.slotIds === undefined || (Array.isArray(s.slotIds) && s.slotIds.length === s.rounds
      && s.slotIds.every((slot, index) => integer(slot, 1, v.slotCount as number) && (index === 0 || slot > (s.slotIds as number[])[index - 1]!)))))
    || !unique(v.stages.map(s => (s as CompetitionStageDefinition).id))) return 'definition stages';
  const stages = v.stages as CompetitionStageDefinition[];
  let previousSlot = 0;
  for (const stage of stages) if (stage.slotIds) {
    if (stage.slotIds[0]! <= previousSlot) return 'definition stage dates';
    previousSlot = stage.slotIds[stage.slotIds.length - 1]!;
  }
  if (stages.reduce((n, s) => n + s.rounds, 0) > v.slotCount) return 'definition calendar capacity';
  const f = v.format;
  const allowed = f.kind === 'league' || f.kind === 'group' ? [f.kind, 'knockout'] : [f.kind];
  if (!stages.some(s => s.kind === f.kind) || stages.some(s => !allowed.includes(s.kind))) return 'definition format stages';
  if ((f.kind === 'league' || f.kind === 'group') && (stages[0]!.kind !== f.kind || stages.filter(s => s.kind === f.kind).length !== 1)) return 'definition stage order';
  const knockoutRounds = stages.filter(s => s.kind === 'knockout').reduce((n, s) => n + s.rounds, 0);
  if (f.kind === 'league' && (f.finalsSize > v.minEntrants || knockoutRounds !== (f.finalsSize ? Math.log2(f.finalsSize) : 0))) return 'definition league finals';
  if (f.kind === 'knockout' && knockoutRounds !== Math.ceil(Math.log2(v.maxEntrants))) return 'definition knockout rounds';
  if (f.kind === 'group' && (v.minEntrants % f.groupSize !== 0 || v.maxEntrants % f.groupSize !== 0
    || !powerOfTwo(v.maxEntrants / f.groupSize * f.qualifiersPerGroup)
    || knockoutRounds !== Math.log2(v.maxEntrants / f.groupSize * f.qualifiersPerGroup))) return 'definition groups';
  if ((f.kind === 'series' || f.kind === 'exhibition') && (v.minEntrants !== 2 || v.maxEntrants !== 2 || stages.length !== 1
    || stages[0]!.rounds !== (f.kind === 'series' ? f.winsRequired * 2 - 1 : 1))) return 'definition two-club format';
  if (!matchRules(v.matchRules) || typeof v.drawnKnockout !== 'string' || !['higher-seed', 'seeded-draw'].includes(v.drawnKnockout)) return 'definition match rules';
  if (!lineupAndEligibility(v.lineup, v.eligibility)) return 'definition eligibility';
  if (!record(v.venues) || !keys(v.venues, ['rounds', 'final']) || typeof v.venues.rounds !== 'string'
    || !['home-away', 'drawn-home', 'higher-seed', 'neutral', 'alternating'].includes(v.venues.rounds)
    || (v.venues.final !== 'neutral' && v.venues.final !== 'same-as-rounds')) return 'definition venues';
  if ((f.kind === 'league' || f.kind === 'group') ? !standings(v.standings) : v.standings !== undefined) return 'definition standings';
  if (!Array.isArray(v.rewards) || !v.rewards.every(r => reward(r, stages)) || !unique(v.rewards.map(r => (r as CompetitionRewardPolicy).id))) return 'definition rewards';
  return null;
}

/** Stable IDs take only immutable source identity, season and saved ordinals. */
export function competitionInstanceId(definitionId: string, season: number, ordinal: number): string {
  if (!text(definitionId) || !integer(season, 1) || !integer(ordinal)) throw new Error('Invalid competition identity');
  return `${definitionId}:s${season}:i${ordinal}`;
}
export function competitionFixtureId(instanceId: string, ordinal: number): string {
  if (!text(instanceId) || !integer(ordinal)) throw new Error('Invalid fixture identity');
  return `${instanceId}:f${ordinal}`;
}
export function createCompetitionInstance(definition: CompetitionDefinition, season: number, ordinal: number, entrantIds: readonly string[]): CompetitionInstance {
  const problem = validateCompetitionDefinition(definition);
  if (problem || !unique(entrantIds) || !entrantIds.every(text) || !validFieldSize(definition, entrantIds.length)) throw new Error(`Invalid competition instance: ${problem ?? 'entrants'}`);
  return {
    id: competitionInstanceId(definition.id, season, ordinal), season,
    definition: JSON.parse(JSON.stringify(definition)) as CompetitionDefinition,
    entrantIds: [...entrantIds], tieOrder: [...entrantIds], status: 'entered', stageId: null, fixtures: [],
  };
}

function validFieldSize(definition: CompetitionDefinition, count: number): boolean {
  return count >= definition.minEntrants && count <= definition.maxEntrants
    && (definition.format.kind !== 'group' || count % definition.format.groupSize === 0);
}

function validResult(v: unknown, f: CompetitionFixture, stage: CompetitionStageDefinition, policy: CompetitionDefinition['drawnKnockout'], tieOrder: readonly string[]): boolean {
  if (!record(v) || !keys(v, ['homeScore', 'awayScore', 'winnerId', 'decider']) || !integer(v.homeScore) || !integer(v.awayScore)) return false;
  if (v.homeScore !== v.awayScore) return (v.decider === 'score' || v.decider === 'forfeit') && v.winnerId === (v.homeScore > v.awayScore ? f.homeId : f.awayId);
  if (v.decider === 'draw') return v.winnerId === undefined && ['league', 'group', 'exhibition'].includes(stage.kind);
  return (stage.kind === 'knockout' || stage.kind === 'series') && v.decider === policy
    && v.winnerId === (tieOrder.indexOf(f.homeId) < tieOrder.indexOf(f.awayId) ? f.homeId : f.awayId);
}

/** Boundary proof from saved sporting facts. Split whole tied cohorts rather
 * than using a non-transitive pairwise head-to-head sort comparator. */
export function standingsOrder(clubs: readonly string[], fixtures: readonly CompetitionFixture[], policy: CompetitionStandingsPolicy, frozen: readonly string[]): string[] {
  const rows = new Map(clubs.map(id => [id, { points: 0, difference: 0, scored: 0 }]));
  const points = (score: number, against: number): number => score > against ? policy.win : score < against ? policy.loss : policy.draw;
  for (const f of fixtures) {
    const r = f.result!;
    for (const [id, scored, against] of [[f.homeId, r.homeScore, r.awayScore], [f.awayId, r.awayScore, r.homeScore]] as const) {
      const row = rows.get(id); if (!row) continue;
      row.points += points(scored, against); row.difference += scored - against; row.scored += scored;
    }
  }
  let cohorts = [[...clubs]];
  for (const criterion of ['points', ...policy.tieBreakers]) {
    cohorts = cohorts.flatMap(cohort => {
      const group = new Set(cohort);
      const metric = (id: string): number => {
        const row = rows.get(id)!;
        if (criterion === 'points') return row.points;
        if (criterion === 'points-difference') return row.difference;
        if (criterion === 'points-for') return row.scored;
        if (criterion === 'frozen-order') return -frozen.indexOf(id);
        return fixtures.reduce((total, f) => {
          if (!group.has(f.homeId) || !group.has(f.awayId)) return total;
          const r = f.result!;
          return total + (f.homeId === id ? points(r.homeScore, r.awayScore) : f.awayId === id ? points(r.awayScore, r.homeScore) : 0);
        }, 0);
      };
      const buckets = new Map<number, string[]>();
      for (const id of cohort) { const n = metric(id); buckets.set(n, [...(buckets.get(n) ?? []), id]); }
      return [...buckets].sort(([a], [b]) => b - a).map(([, ids]) => ids);
    });
  }
  return cohorts.flat();
}

export function completedCompetition(instance: CompetitionInstance): string | null {
  const { definition: def, fixtures, entrantIds, winnerId } = instance;
  const played = fixtures.filter(f => f.status === 'completed');
  if (played.length === 0 || fixtures.some(f => f.status !== 'completed' && f.status !== 'cancelled')) return 'competition completion';
  if (def.format.kind === 'exhibition') return played.length === 1 && played[0]!.result!.winnerId === winnerId ? null : 'competition exhibition result';
  if (!winnerId) return 'competition winner';
  if (def.format.kind === 'series') {
    const wins = new Map<string, number>();
    const ordered = [...played].sort((a, b) => a.round - b.round);
    for (const [index, f] of ordered.entries()) {
      if (f.round !== index + 1) return 'competition series sequence';
      const winner = f.result!.winnerId!;
      const n = (wins.get(winner) ?? 0) + 1; wins.set(winner, n);
      if (n === def.format.winsRequired && (index !== ordered.length - 1 || winner !== winnerId)) return 'competition series clinch';
    }
    return wins.get(winnerId) === def.format.winsRequired ? null : 'competition series wins';
  }
  const knockout = played.filter(f => def.stages.find(s => s.id === f.stageId)!.kind === 'knockout');
  const knockoutField = def.format.kind === 'league' ? def.format.finalsSize
    : def.format.kind === 'group' ? entrantIds.length / def.format.groupSize * def.format.qualifiersPerGroup : entrantIds.length;
  if (knockout.length !== Math.max(0, knockoutField - 1)) return 'competition elimination count';
  if (knockoutField > 1) {
    const lastStage = [...def.stages].reverse().find(s => s.kind === 'knockout')!;
    const final = knockout.filter(f => f.stageId === lastStage.id && f.round === lastStage.rounds);
    if (final.length !== 1 || final[0]!.result!.winnerId !== winnerId) return 'competition final winner';
  }
  if (def.format.kind === 'league') {
    const expected = Math.floor(entrantIds.length / 2) * def.stages.filter(s => s.kind === 'league').reduce((n, s) => n + s.rounds, 0);
    if (played.length - knockout.length !== expected) return 'competition league completion';
    const ranked = standingsOrder(entrantIds, played.filter(f => def.stages.find(s => s.id === f.stageId)!.kind === 'league'), def.standings!, instance.tieOrder);
    if (def.format.finalsSize === 0 && winnerId !== ranked[0]) return 'competition league champion';
    const qualifiers = new Set(ranked.slice(0, def.format.finalsSize));
    if (knockout.some(f => !qualifiers.has(f.homeId) || !qualifiers.has(f.awayId))) return 'competition finals qualifiers';
  }
  if (def.format.kind === 'group') {
    const groupMatches = played.filter(f => def.stages.find(s => s.id === f.stageId)!.kind === 'group');
    if (groupMatches.length !== entrantIds.length * (def.format.groupSize - 1) / 2) return 'competition group completion';
    const neighbours = new Map(entrantIds.map(id => [id, new Set<string>()]));
    for (const f of groupMatches) {
      if (neighbours.get(f.homeId)!.has(f.awayId)) return 'competition repeated group pair';
      neighbours.get(f.homeId)!.add(f.awayId); neighbours.get(f.awayId)!.add(f.homeId);
    }
    for (const [club, opponents] of neighbours) {
      if (opponents.size !== def.format.groupSize - 1) return 'competition group field';
      if ([...opponents].some(id => [...neighbours.get(id)!].some(other => other !== club && !opponents.has(other)))) return 'competition group membership';
    }
    const qualifiers = new Set<string>(); const assigned = new Set<string>();
    for (const club of entrantIds) {
      if (assigned.has(club)) continue;
      const group = [club, ...neighbours.get(club)!]; group.forEach(id => assigned.add(id));
      const selected = new Set(group);
      const groupFixtures = groupMatches.filter(f => selected.has(f.homeId) && selected.has(f.awayId));
      standingsOrder(group, groupFixtures, def.standings!, instance.tieOrder).slice(0, def.format.qualifiersPerGroup).forEach(id => qualifiers.add(id));
    }
    if (knockout.some(f => !qualifiers.has(f.homeId) || !qualifiers.has(f.awayId)) || !qualifiers.has(winnerId)) return 'competition group qualifiers';
  }
  return null;
}

/** Returns the first invalid field; callers retain the entire rejected input. */
export function validateCompetitions(v: unknown, context: { pack: string; season: number; week?: number; clubIds: readonly string[] }): string | null {
  if (!record(v) || !keys(v, ['schemaVersion', 'instances', 'calendar', 'world']) || v.schemaVersion !== 1 || !Array.isArray(v.instances)) return 'competitions';
  const clubIds = new Set(context.clubIds);
  const instanceIds = new Set<string>();
  const fixtureIds = new Set<string>();
  const slots = new Set<string>();
  for (const raw of v.instances) {
    if (!record(raw) || !keys(raw, ['id', 'season', 'definition', 'entrantIds', 'tieOrder', 'status', 'stageId', 'fixtures', 'winnerId'])
      || !text(raw.id) || instanceIds.has(raw.id) || !integer(raw.season, 1, context.season)
      || !STATUSES.includes(raw.status as CompetitionStatus)) return 'competition instance';
    instanceIds.add(raw.id);
    const problem = validateCompetitionDefinition(raw.definition);
    if (problem) return problem;
    const def = raw.definition as CompetitionDefinition;
    if (def.pack !== context.pack) return 'competition pack';
    if (!Array.isArray(raw.entrantIds) || !raw.entrantIds.every(id => text(id) && clubIds.has(id)) || !unique(raw.entrantIds)
      || raw.entrantIds.length > def.maxEntrants) return 'competition entrants';
    const entrantIds = raw.entrantIds as string[];
    if (!Array.isArray(raw.tieOrder) || raw.tieOrder.length !== entrantIds.length || !unique(raw.tieOrder)
      || !raw.tieOrder.every(id => text(id) && entrantIds.includes(id))) return 'competition frozen order';
    const tieOrder = raw.tieOrder as string[];
    const noEntry = raw.status === 'offered' || raw.status === 'declined' || raw.status === 'qualified';
    if (!noEntry && !validFieldSize(def, entrantIds.length)) return 'competition entrant count';
    if (raw.stageId !== null && !def.stages.some(s => s.id === raw.stageId)) return 'competition stage';
    if (!Array.isArray(raw.fixtures) || (noEntry && raw.fixtures.length > 0)) return 'competition fixtures';
    const roundClubs = new Set<string>();
    for (const value of raw.fixtures) {
      if (!record(value) || !keys(value, ['id', 'competitionId', 'stageId', 'round', 'slot', 'homeId', 'awayId', 'neutral', 'status', 'result'])
        || !text(value.id) || fixtureIds.has(value.id) || value.competitionId !== raw.id || !text(value.stageId)
        || !integer(value.round, 1) || !text(value.homeId) || !text(value.awayId) || !entrantIds.includes(value.homeId) || !entrantIds.includes(value.awayId)
        || value.homeId === value.awayId || typeof value.neutral !== 'boolean'
        || typeof value.status !== 'string' || !['pending', 'scheduled', 'completed', 'cancelled'].includes(value.status)) return 'competition fixture';
      fixtureIds.add(value.id);
      const f = value as unknown as CompetitionFixture;
      const stage = def.stages.find(s => s.id === f.stageId);
      if (!stage || f.round > stage.rounds || (f.slot !== undefined && !integer(f.slot, 1, def.slotCount))) return 'competition fixture stage/slot';
      if (f.slot !== undefined && stage.slotIds && f.slot !== stage.slotIds[f.round - 1]) return 'competition fixture date';
      if ((f.status === 'scheduled' || f.status === 'completed') && f.slot === undefined) return 'competition fixture missing slot';
      const isFinal = stage.kind === 'knockout' && stage === def.stages[def.stages.length - 1] && f.round === stage.rounds;
      if (f.neutral !== (def.venues.rounds === 'neutral' || (isFinal && def.venues.final === 'neutral'))) return 'competition fixture venue';
      if ((f.status === 'completed') !== (f.result !== undefined) || (f.result !== undefined && !validResult(f.result, f, stage, def.drawnKnockout, tieOrder))) return 'competition fixture result';
      if (f.status !== 'cancelled') for (const clubId of [f.homeId, f.awayId]) {
        const roundKey = JSON.stringify([f.stageId, f.round, clubId]);
        if (roundClubs.has(roundKey)) return 'competition round booking';
        roundClubs.add(roundKey);
        if (f.slot !== undefined) {
          const slotKey = JSON.stringify([raw.season, f.slot, clubId]);
          if (slots.has(slotKey)) return 'competition slot booking';
          slots.add(slotKey);
        }
      }
    }
    const fixtures = raw.fixtures as CompetitionFixture[];
    const dates = new Map<number, number[]>();
    for (const f of fixtures) if (f.slot !== undefined && f.status !== 'cancelled') {
      const position = def.stages.findIndex(s => s.id === f.stageId) * (def.slotCount + 1) + f.round;
      dates.set(position, [...(dates.get(position) ?? []), f.slot]);
    }
    let previous = 0;
    for (const [, assigned] of [...dates].sort(([a], [b]) => a - b)) {
      if (Math.min(...assigned) <= previous) return 'competition fixture chronology';
      previous = Math.max(...assigned);
    }
    const knockout = fixtures.filter(f => f.status !== 'cancelled' && def.stages.find(s => s.id === f.stageId)!.kind === 'knockout');
    const eliminated = new Map<string, number>();
    const order = (f: CompetitionFixture): number => def.stages.findIndex(s => s.id === f.stageId) * (def.slotCount + 1) + f.round;
    for (const f of [...knockout].sort((a, b) => order(a) - order(b))) {
      if (eliminated.has(f.homeId) || eliminated.has(f.awayId)) return 'competition eliminated entrant';
      if (f.result?.winnerId) eliminated.set(f.result.winnerId === f.homeId ? f.awayId : f.homeId, order(f));
    }
    if (raw.winnerId !== undefined && (!text(raw.winnerId) || !entrantIds.includes(raw.winnerId) || raw.status !== 'completed')) return 'competition winner';
    if (raw.status === 'completed') {
      const completion = completedCompetition(raw as unknown as CompetitionInstance);
      if (completion) return completion;
    }
  }
  if (v.calendar !== undefined) {
    const calendar = validateCompetitionCalendar(v.calendar, v.instances as CompetitionInstance[], context.season, context.week);
    if (calendar) return calendar;
  }
  if (v.world !== undefined) {
    if (!record(v.calendar) || v.calendar.mode !== 'structural') return 'division world calendar';
    const world = validateCompetitionWorld(v.world, v.instances as CompetitionInstance[], { ...context, season: v.calendar.season as number, slots: (v.calendar as unknown as CompetitionCalendar).slots });
    if (world) return world;
  }
  return null;
}
