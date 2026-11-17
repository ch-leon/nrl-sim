// Durable selection facts only. This marker grants no runtime capability.
import { completedCompetition, standingsOrder, type CompetitionCareerState, type CompetitionInstance, type CompetitionResult } from './competition';
import type { CompetitionWorldMetadata } from './competitionDivisions';

export interface LeagueTitleEvidence {
  season: number; leagueId: string; targetLeagueId: string; instanceId: string; finalFixtureId: string;
  homeId: string; awayId: string; result: CompetitionResult;
}
export interface LeagueAccess {
  leagueId: string;
  earnedFrom?: LeagueTitleEvidence;
}
export interface LeagueCloseFacts {
  id: string;
  season: number;
  leagues: Array<{
    leagueId: string; instanceId: string;
    standings: Array<{ clubId: string; position: number }>;
    championId?: string; finalFixtureId?: string; minorPremierId?: string;
  }>;
}
export interface LeagueMovement { clubId: string; fromLeagueId: string; toLeagueId: string }
export interface LeagueEntryReceipt {
  season: number; leagueId: string; receiptId: string; allocationPolicy: 'adjacent-vacancy-v1'; movements: LeagueMovement[];
}
export interface LeagueProgress {
  version: 1;
  scheduleSeed: number;
  clubId: string;
  phase: 'initial-choice' | 'active' | 'next-season-choice';
  access: LeagueAccess[];
  close?: LeagueCloseFacts;
  accepted?: LeagueEntryReceipt;
}
export const leagueCloseId = (profileId: string, season: number): string => `${profileId}:close:s${season}`;
export const leagueEntryReceiptId = (profileId: string, season: number, clubId: string, leagueId: string): string => `${profileId}:entry:s${season}:${clubId}:${leagueId}`;

/** Only a completed last knockout fixture is a title source. */
export function completedLeagueFinal(instance: CompetitionInstance): CompetitionInstance['fixtures'][number] | undefined {
  if (instance.definition.format.kind !== 'league' || !instance.definition.format.finalsSize || instance.status !== 'completed'
    || completedCompetition(instance)) return undefined;
  const last = [...instance.definition.stages].reverse().find(s => s.kind === 'knockout');
  return instance.fixtures.find(f => f.stageId === last?.id && f.round === last.rounds && f.status === 'completed'
    && f.result?.winnerId === instance.winnerId);
}

/** Self-contained permanent receipt; old source fixtures can later be pruned. */
export function leagueTitleEvidence(instance: CompetitionInstance, leagueId: string, targetLeagueId: string): LeagueTitleEvidence | undefined {
  const final = completedLeagueFinal(instance);
  return final?.result ? {season: instance.season, leagueId, targetLeagueId, instanceId: instance.id,
    finalFixtureId: final.id, homeId: final.homeId, awayId: final.awayId, result: {...final.result}} : undefined;
}

/** Freeze factual regular standings separately from the finals champion. */
export function leagueCloseFacts(world: CompetitionWorldMetadata, instances: readonly CompetitionInstance[], season: number): LeagueCloseFacts {
  const leagues = world.divisions.map(d => {
    // Historical close reconstruction must use stable league identity, not a later instance pointer.
    const instance = instances.find(i => i.season === season && i.definition.id === `${world.profile.id}:${d.id}`);
    if (!instance || !['completed', 'withdrawn'].includes(instance.status) || (instance.status === 'completed' && completedCompetition(instance))) throw new Error('Unresolved league close');
    const regular = instance.fixtures.filter(f => f.status === 'completed' && instance.definition.stages.find(s => s.id === f.stageId)?.kind === 'league');
    const ranked = standingsOrder(instance.entrantIds, regular, instance.definition.standings!, instance.tieOrder);
    const final = completedLeagueFinal(instance);
    return { leagueId: d.id, instanceId: instance.id, standings: ranked.map((clubId, index) => ({ clubId, position: index + 1 })),
      ...(regular.length === instance.entrantIds.length / 2 * instance.definition.stages.find(s => s.kind === 'league')!.rounds ? {minorPremierId: ranked[0]!} : {}), ...(final ? { championId: instance.winnerId!, finalFixtureId: final.id } : {}) };
  });
  return { id: leagueCloseId(world.profile.id, season), season, leagues };
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(k => allowed.includes(k));
const integer = (v: unknown, min = 1): v is number => Number.isSafeInteger(v) && (v as number) >= min;
const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : record(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const equal = (a: unknown, b: unknown): boolean => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function validateLeagueCareer(v: unknown, competitions: CompetitionCareerState,
  context: { pack: string; season: number; week?: number; clubIds: readonly string[]; clubId?: string }): string | null {
  const { world, calendar, instances } = competitions;
  if (!record(v) || !keys(v, ['version', 'scheduleSeed', 'clubId', 'phase', 'access', 'close', 'accepted']) || v.version !== 1
    || !integer(v.scheduleSeed, 0) || v.scheduleSeed > 0xffffffff
    || v.clubId !== (context.clubId ?? 'player') || !context.clubIds.includes(v.clubId as string)
    || !['initial-choice', 'active', 'next-season-choice'].includes(String(v.phase)) || !world || world.profile.pack !== context.pack
    || calendar?.mode !== 'structural' || calendar.season !== context.season) return 'league career identity';
  if (instances.some(i => i.season < context.season - 1)) return 'league career retained seasons';
  const divisions = [...world.divisions].sort((a, b) => a.rank - b.rank);
  if (!Array.isArray(v.access) || v.access.length === 0 || new Set(v.access.map(a => record(a) ? a.leagueId : undefined)).size !== v.access.length) return 'league career access';
  const accessible = new Set<string>();
  for (const a of v.access) {
    if (!record(a) || !keys(a, ['leagueId', 'earnedFrom'])) return 'league career access';
    const division = divisions.find(d => d.id === a.leagueId);
    if (!division) return 'league career access league';
    accessible.add(division.id);
    if (division.rank === 0) { if (a.earnedFrom !== undefined) return 'league career starting access'; continue; }
    const source = a.earnedFrom;
    if (!record(source) || !keys(source, ['season', 'leagueId', 'targetLeagueId', 'instanceId', 'finalFixtureId', 'homeId', 'awayId', 'result']) || !integer(source.season)
      || source.season > context.season - (v.phase === 'next-season-choice' ? 0 : 1)) return 'league career access source';
    const previous = divisions.find(d => d.rank === division.rank - 1)!;
    const instancePrefix = `${world.profile.id}:${previous.id}:s${source.season}:i`;
    if (source.leagueId !== previous.id || source.targetLeagueId !== division.id || typeof source.instanceId !== 'string'
      || !source.instanceId.startsWith(instancePrefix) || !/^\d+$/.test(source.instanceId.slice(instancePrefix.length))
      || typeof source.finalFixtureId !== 'string' || !source.finalFixtureId.startsWith(`${source.instanceId}:f`)
      || !/^\d+$/.test(source.finalFixtureId.slice(source.instanceId.length + 2))
      || typeof source.homeId !== 'string' || typeof source.awayId !== 'string' || source.homeId === source.awayId
      || !context.clubIds.includes(source.homeId) || !context.clubIds.includes(source.awayId)) return 'league career title identity';
    const result = source.result;
    if (!record(result) || !keys(result, ['homeScore', 'awayScore', 'winnerId', 'decider']) || !integer(result.homeScore, 0) || !integer(result.awayScore, 0)
      || result.winnerId !== v.clubId || (result.winnerId !== source.homeId && result.winnerId !== source.awayId)
      || (result.homeScore !== result.awayScore ? !['score', 'forfeit'].includes(String(result.decider))
        || result.winnerId !== (result.homeScore > result.awayScore ? source.homeId : source.awayId)
        : !['seeded-draw', 'higher-seed'].includes(String(result.decider)))) return 'league career title result';
    const instance = instances.find(i => i.id === source.instanceId);
    // A missing source can be compacted only after its whole season ages out
    // of the required current/previous-year retention window.
    if ((!instance && source.season >= Math.max(1, context.season - 1))
      || (instance && !equal(source, leagueTitleEvidence(instance, previous.id, division.id)))) return 'league career title source';
  }
  if (!accessible.has(divisions[0]!.id) || divisions.some(d => accessible.has(d.id) && d.rank > 0 && !accessible.has(divisions[d.rank - 1]!.id))) return 'league career access chain';
  if (v.phase === 'initial-choice') {
    return context.season === 1 && (context.week === undefined || context.week === 1) && calendar.status === 'active'
      && calendar.elapsedIntervals === 0 && v.close === undefined && v.accepted === undefined && v.access.length === 1
      && instances.filter(i => i.season === 1).every(i => i.fixtures.every(f => f.result === undefined)) ? null : 'league career initial phase';
  }
  if (v.phase === 'active' ? calendar.status !== 'active'
    || (context.week !== undefined && calendar.elapsedIntervals < context.week - 1)
    : calendar.status !== 'awaiting-next-season' || calendar.elapsedIntervals < calendar.slots.length
    || (context.week !== undefined && context.week !== calendar.slots.length)
    || !instances.filter(i => i.season === context.season).every(i => ['completed', 'withdrawn', 'declined'].includes(i.status))) return 'league career phase';
  const accepted = v.accepted;
  if (!record(accepted) || !keys(accepted, ['season', 'leagueId', 'receiptId', 'allocationPolicy', 'movements']) || accepted.season !== context.season
    || accepted.allocationPolicy !== 'adjacent-vacancy-v1' || !Array.isArray(accepted.movements)
    || new Set(accepted.movements.map(m => record(m) ? m.clubId : undefined)).size !== accepted.movements.length
    || !accepted.movements.every(m => record(m) && keys(m, ['clubId', 'fromLeagueId', 'toLeagueId'])
      && typeof m.clubId === 'string' && context.clubIds.includes(m.clubId) && m.fromLeagueId !== m.toLeagueId
      && divisions.some(d => d.id === m.fromLeagueId) && divisions.some(d => d.id === m.toLeagueId))
    || typeof accepted.leagueId !== 'string' || !accessible.has(accepted.leagueId)
    || accepted.receiptId !== leagueEntryReceiptId(world.profile.id, context.season, v.clubId as string, accepted.leagueId)) return 'league career acceptance';
  const current = divisions.find(d => d.id === accepted.leagueId);
  if (!instances.find(i => i.id === current?.instanceId)?.entrantIds.includes(v.clubId as string)) return 'league career accepted field';
  if (v.close !== undefined) {
    const close = v.close;
    if (!record(close) || !keys(close, ['id', 'season', 'leagues']) || !integer(close.season)
      || close.season !== context.season - (v.phase === 'active' ? 1 : 0) || !Array.isArray(close.leagues)) return 'league career close';
    try { if (!equal(close, leagueCloseFacts(world, instances, close.season))) return 'league career close facts'; }
    catch { return 'league career close source'; }
  } else if (v.phase === 'next-season-choice' || context.season > 1) return 'league career missing close';
  return null;
}
