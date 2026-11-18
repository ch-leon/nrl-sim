// Durable League selection/close facts. Normal admission remains separately gated.
import { completedCompetition, standingsOrder, type CompetitionCareerState, type CompetitionInstance, type CompetitionResult } from './competition';
import { allocateLeagueFields } from './leagueAllocation';
import type { LeagueFields } from './divisions';
import type { CompetitionWorldMetadata } from './competitionDivisions';
import type { GameState } from '../core/state';
import { BOARD } from '../config';
import { validEntrySnapshots, type EntryQuote, type AnnualEntryChanges } from './leagueEntryReceipt';

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
  startInterval: number;
  endingInterval: number;
  leagues: Array<{
    leagueId: string; instanceId: string;
    standings: Array<{ clubId: string; position: number }>;
    championId?: string; finalFixtureId?: string; minorPremierId?: string;
  }>;
}
export interface LeagueMovement { clubId: string; fromLeagueId: string; toLeagueId: string }
export interface LeagueEntryReceipt {
  season: number; startInterval: number; leagueId: string; receiptId: string; allocationPolicy: 'adjacent-vacancy-v1'; movements: LeagueMovement[];
  quote: EntryQuote; annualChanges: AnnualEntryChanges | null;
}
/** Historical format and official honours survive pruning of source fixtures. */
export interface LeagueHistoryFacts {
  closeId: string; leagueId: string; instanceId: string;
  startInterval: number; endingInterval: number; slotCount: number;
  fieldSize: number; regularRounds: number; finalsSize: number;
  minorPremierId?: string; championId?: string;
  final?: { fixtureId: string; homeId: string; awayId: string; result: CompetitionResult };
  lastPlayerFinal?: {fixtureId: string; stageId: string; stageName: string; round: number; slot: number;
    homeId: string; awayId: string; result: CompetitionResult};
}
export interface LeagueProgress {
  version: 1;
  scheduleSeed: number;
  /** Frozen authored membership captured once by fresh-world construction. */
  initialFields: LeagueFields;
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
export function leagueCloseFacts(world: CompetitionWorldMetadata, instances: readonly CompetitionInstance[], season: number,
  startInterval?: number): LeagueCloseFacts {
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
  const slotCount = instances.find(i => i.id === leagues[0]!.instanceId)!.definition.slotCount;
  const start = startInterval ?? (season - 1) * slotCount;
  return { id: leagueCloseId(world.profile.id, season), season, startInterval: start, endingInterval: start + slotCount, leagues };
}

export function leagueHistoryFacts(close: LeagueCloseFacts, instance: CompetitionInstance, leagueId: string, clubId = 'player'): LeagueHistoryFacts {
  const fact = close.leagues.find(l => l.leagueId === leagueId)!;
  const final = completedLeagueFinal(instance);
  const last = instance.fixtures.filter(f => f.status === 'completed' && f.result
    && instance.definition.stages.find(s => s.id === f.stageId)?.kind === 'knockout' && (f.homeId === clubId || f.awayId === clubId))
    .sort((a,b) => b.slot! - a.slot!)[0];
  return {closeId: close.id, leagueId, instanceId: instance.id, startInterval: close.startInterval, endingInterval: close.endingInterval,
    slotCount: instance.definition.slotCount, fieldSize: instance.entrantIds.length,
    regularRounds: instance.definition.stages.find(s => s.kind === 'league')!.rounds,
    finalsSize: instance.definition.format.kind === 'league' ? instance.definition.format.finalsSize : 0,
    ...(fact.minorPremierId ? {minorPremierId: fact.minorPremierId} : {}), ...(fact.championId ? {championId: fact.championId} : {}),
    ...(final?.result ? {final: {fixtureId: final.id, homeId: final.homeId, awayId: final.awayId, result: {...final.result}}} : {}),
    ...(last?.result ? {lastPlayerFinal: {fixtureId: last.id, stageId: last.stageId,
      stageName: instance.definition.stages.find(s => s.id === last.stageId)!.name, round: last.round, slot: last.slot!,
      homeId: last.homeId, awayId: last.awayId, result: {...last.result}}} : {})};
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(v).every(k => allowed.includes(k));
const integer = (v: unknown, min = 1): v is number => Number.isSafeInteger(v) && (v as number) >= min;
const canonical = (v: unknown): unknown => Array.isArray(v) ? v.map(canonical) : record(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
export const canonicalLeagueJson = (v: unknown): string => JSON.stringify(canonical(v));
const equal = (a: unknown, b: unknown): boolean => canonicalLeagueJson(a) === canonicalLeagueJson(b);

export function validateLeagueCareer(v: unknown, competitions: CompetitionCareerState,
  context: { pack: string; season: number; week?: number; clubIds: readonly string[]; clubId?: string }): string | null {
  const { world, calendar, instances } = competitions;
  if (!record(v) || !keys(v, ['version', 'scheduleSeed', 'initialFields', 'clubId', 'phase', 'access', 'close', 'accepted']) || v.version !== 1
    || !integer(v.scheduleSeed, 0) || v.scheduleSeed > 0xffffffff
    || v.clubId !== (context.clubId ?? 'player') || !context.clubIds.includes(v.clubId as string)
    || !['initial-choice', 'active', 'next-season-choice'].includes(String(v.phase)) || !world || world.profile.pack !== context.pack
    || calendar?.mode !== 'structural' || calendar.season !== context.season) return 'league career identity';
  if (instances.some(i => i.season < context.season - 1 || i.season > context.season)) return 'league career retained seasons';
  const divisions = [...world.divisions].sort((a, b) => a.rank - b.rank);
  for (let year = Math.max(1, context.season - 1); year <= context.season; year++) {
    for (const division of divisions) {
      const matches = instances.filter(i => i.season === year && i.definition.id === `${world.profile.id}:${division.id}`);
      if (matches.length !== 1 || matches[0]!.id !== `${world.profile.id}:${division.id}:s${year}:i0`) return 'league career retained division instances';
    }
    if (instances.some(i => i.season === year && i.definition.format.kind === 'league'
      && !divisions.some(d => i.definition.id === `${world.profile.id}:${d.id}`))) return 'league career unknown division instance';
  }
  for (const division of divisions) {
    const instance = instances.find(i => i.id === division.instanceId);
    if (!instance || instance.season !== context.season || instance.definition.id !== `${world.profile.id}:${division.id}`)
      return 'league career league identity';
  }
  const initial = v.initialFields;
  if (!record(initial) || Object.keys(initial).length !== divisions.length || Object.keys(initial).some(id => !divisions.some(d => d.id === id))
    || divisions.some(d => !Array.isArray(initial[d.id]) || (initial[d.id] as unknown[]).length !== instances.find(i => i.id === d.instanceId)!.entrantIds.length
      || !(initial[d.id] as unknown[]).every(id => typeof id === 'string' && context.clubIds.includes(id)))) return 'league career initial fields';
  const initialIds = Object.values(initial).flat();
  if (initialIds.length !== context.clubIds.length || new Set(initialIds).size !== initialIds.length
    || !(initial[world.profile.startingDivisionId] as string[]).includes(v.clubId as string)) return 'league career initial fields';
  const fieldSets = (fields: LeagueFields): unknown => Object.fromEntries(divisions.map(d => [d.id, [...fields[d.id]!].sort()]));
  const currentFields = Object.fromEntries(divisions.map(d => [d.id, instances.find(i => i.id === d.instanceId)!.entrantIds]));
  if (context.season === 1 && !equal(fieldSets(initial as LeagueFields), fieldSets(currentFields))) return 'league career initial fields';
  const retainedInitial = instances.filter(i => i.season === 1);
  if (retainedInitial.length && divisions.some(d => !equal([...(initial[d.id] as string[])].sort(),
    [...retainedInitial.find(i => i.definition.id === `${world.profile.id}:${d.id}`)!.entrantIds].sort()))) return 'league career initial fields';
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
    if ((instance && (instance.definition.id !== `${world.profile.id}:${previous.id}` || instance.season !== source.season))
      || (!instance && source.season >= Math.max(1, context.season - 1))
      || (instance && !equal(source, leagueTitleEvidence(instance, previous.id, division.id)))) return 'league career title source';
  }
  if (!accessible.has(divisions[0]!.id) || divisions.some(d => accessible.has(d.id) && d.rank > 0 && !accessible.has(divisions[d.rank - 1]!.id))) return 'league career access chain';
  if (v.phase === 'initial-choice') {
    return context.season === 1 && (context.week === undefined || context.week === 1) && calendar.status === 'active'
      && calendar.elapsedIntervals === 0 && v.close === undefined && v.accepted === undefined && v.access.length === 1
      && instances.filter(i => i.season === 1).every(i => i.fixtures.every(f => f.result === undefined)) ? null : 'league career initial phase';
  }
  if (v.phase === 'active' ? calendar.status !== 'active'
    : calendar.status !== 'awaiting-next-season'
    || (context.week !== undefined && context.week !== calendar.slots.length)
    || !instances.filter(i => i.season === context.season).every(i => ['completed', 'withdrawn', 'declined'].includes(i.status))) return 'league career phase';
  const accepted = v.accepted;
  if (!record(accepted) || !keys(accepted, ['season', 'startInterval', 'leagueId', 'receiptId', 'allocationPolicy', 'movements', 'quote', 'annualChanges']) || accepted.season !== context.season
    || !integer(accepted.startInterval, 0) || (context.season === 1 && accepted.startInterval !== 0)
    || accepted.allocationPolicy !== 'adjacent-vacancy-v1' || !Array.isArray(accepted.movements)
    || new Set(accepted.movements.map(m => record(m) ? m.clubId : undefined)).size !== accepted.movements.length
    || !accepted.movements.every(m => record(m) && keys(m, ['clubId', 'fromLeagueId', 'toLeagueId'])
      && typeof m.clubId === 'string' && context.clubIds.includes(m.clubId) && m.fromLeagueId !== m.toLeagueId
      && divisions.some(d => d.id === m.fromLeagueId) && divisions.some(d => d.id === m.toLeagueId))
    || typeof accepted.leagueId !== 'string' || !accessible.has(accepted.leagueId)
    || accepted.receiptId !== leagueEntryReceiptId(world.profile.id, context.season, v.clubId as string, accepted.leagueId)) return 'league career acceptance';
  const settled = calendar.elapsedIntervals - accepted.startInterval;
  if (v.phase === 'active' ? settled < 0 || settled >= calendar.slots.length || (context.week !== undefined && settled !== context.week - 1)
    : settled !== calendar.slots.length) return 'league career phase';
  const current = divisions.find(d => d.id === accepted.leagueId);
  if (!instances.find(i => i.id === current?.instanceId)?.entrantIds.includes(v.clubId as string)) return 'league career accepted field';
  try {
    if (context.season === 1) {
      if (accepted.movements.length !== 0) return 'league career allocation';
    } else {
      const previousClose = leagueCloseFacts(world, instances, context.season - 1, (v.close as LeagueCloseFacts | undefined)?.startInterval);
      const allocation = allocateLeagueFields(world, previousClose, v.clubId as string, accepted.leagueId, instances);
      if (!equal(allocation.movements, accepted.movements) || !equal(fieldSets(allocation.fields), fieldSets(currentFields)))
        return 'league career allocation';
    }
  } catch { return 'league career allocation source'; }
  if (!validEntrySnapshots(accepted as unknown as LeagueEntryReceipt, world, instances, v.clubId as string)) return 'league career entry quote';
  if (v.close !== undefined) {
    const close = v.close;
    if (!record(close) || !keys(close, ['id', 'season', 'startInterval', 'endingInterval', 'leagues']) || !integer(close.season)
      || !integer(close.startInterval, 0) || !integer(close.endingInterval, 1)
      || close.endingInterval !== close.startInterval + calendar.slots.length
      || (v.phase === 'active' ? accepted.startInterval !== close.endingInterval : accepted.startInterval !== close.startInterval)
      || close.season !== context.season - (v.phase === 'active' ? 1 : 0) || !Array.isArray(close.leagues)) return 'league career close';
    try { if (!equal(close, leagueCloseFacts(world, instances, close.season, close.startInterval))) return 'league career close facts'; }
    catch { return 'league career close source'; }
  } else if (v.phase === 'next-season-choice' || context.season > 1) return 'league career missing close';
  return null;
}

const finite = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
/** New-format history owns its shape rather than inheriting legacy record[] permissiveness. */
function validLeagueReview(v: unknown): boolean {
  if (!record(v) || !keys(v, ['potm', 'board', 'money', 'retired', 'juniors', 'movers', 'reputation', 'finals'])
    || !record(v.reputation) || !keys(v.reputation, ['from', 'to']) || !finite(v.reputation.from, 0, 100) || !finite(v.reputation.to, 0, 100)) return false;
  if (v.money !== undefined && (!record(v.money) || !keys(v.money, ['in', 'out']) || !integer(v.money.in, 0) || !integer(v.money.out, 0))) return false;
  if (v.finals !== undefined && (!record(v.finals) || !keys(v.finals, ['round', 'won']) || !integer(v.finals.round) || typeof v.finals.won !== 'boolean')) return false;
  if (v.board !== undefined) {
    const b = v.board;
    if (!record(b) || !keys(b, ['met', 'missed', 'patience', 'sacked', 'objectives']) || !integer(b.met, 0) || !integer(b.missed, 0)
      || !integer(b.patience, 0) || b.patience > BOARD.MAX_PATIENCE || typeof b.sacked !== 'boolean' || !Array.isArray(b.objectives)
      || b.objectives.length !== b.met + b.missed || !b.objectives.every(o => record(o) && keys(o, ['text', 'met']) && text(o.text) && typeof o.met === 'boolean')
      || b.objectives.filter(o => o.met).length !== b.met) return false;
  }
  if (v.potm !== undefined && (!record(v.potm) || !keys(v.potm, ['total', 'best']) || !integer(v.potm.total)
    || (v.potm.best !== undefined && (!record(v.potm.best) || !keys(v.potm.best, ['name', 'count']) || !text(v.potm.best.name)
      || !integer(v.potm.best.count) || v.potm.best.count > v.potm.total)))) return false;
  if (v.retired !== undefined && (!Array.isArray(v.retired) || !v.retired.every(p => record(p) && keys(p, ['name', 'age']) && text(p.name) && integer(p.age)))) return false;
  if (v.juniors !== undefined && !integer(v.juniors, 0)) return false;
  if (v.movers !== undefined && (!Array.isArray(v.movers) || v.movers.length > 3 || !v.movers.every(c => record(c) && keys(c, ['name', 'from', 'to']) && text(c.name) && finite(c.from, 1, 100) && finite(c.to, 1, 100)))) return false;
  return true;
}

/** Cross-check retained sporting sources and the continuous accepted/closed interval chain. */
export function validateLeagueHistory(state: GameState): string | null {
  const c = state.competitions; const p = c?.leagueCareer;
  if (!p) return null;
  if (!c?.world || !Array.isArray(state.history) || !Array.isArray(state.finance) || !Array.isArray(state.objectives)) return 'league career history';
  const expectedCount = state.season - (p.phase === 'next-season-choice' ? 0 : 1);
  if (state.history.length !== expectedCount) return 'league career history count';
  let endingInterval = 0;
  for (const [index, row] of state.history.entries()) {
    if (!record(row)) return 'league career history facts';
    const h = row.league;
    if (!record(row) || !keys(row, ['season', 'ladderPosition', 'premiership', 'wins', 'losses', 'draws', 'pointsFor', 'pointsAgainst', 'topScorer', 'review', 'league'])
      || row.season !== index + 1 || typeof row.premiership !== 'boolean' || !integer(row.ladderPosition)
      || !record(h) || !keys(h, ['closeId', 'leagueId', 'instanceId', 'startInterval', 'endingInterval', 'slotCount', 'fieldSize', 'regularRounds', 'finalsSize', 'minorPremierId', 'championId', 'final', 'lastPlayerFinal'])
      || h.closeId !== leagueCloseId(c.world.profile.id, row.season) || !c.world.divisions.some(d => d.id === h.leagueId)
      || h.instanceId !== `${c.world.profile.id}:${h.leagueId}:s${row.season}:i0`
      || h.startInterval !== endingInterval || !integer(h.slotCount) || h.endingInterval !== endingInterval + h.slotCount
      || !integer(h.fieldSize, 2) || h.fieldSize !== p.initialFields[h.leagueId]?.length
      || !integer(h.regularRounds) || !integer(h.finalsSize, 0) || h.finalsSize > h.fieldSize || row.ladderPosition > h.fieldSize
      || !validLeagueReview(row.review)) return 'league career history facts';
    if (row.review!.finals !== undefined) return 'league career legacy finals review';
    for (const key of ['wins', 'losses', 'draws', 'pointsFor', 'pointsAgainst'] as const) if (!integer(row[key], 0)) return 'league career history record';
    if (row.topScorer !== undefined && (!record(row.topScorer) || !keys(row.topScorer, ['name', 'tries']) || !text(row.topScorer.name) || !integer(row.topScorer.tries))) return 'league career history scorer';
    if ((h.championId !== undefined && !state.league.clubs.some(club => club.id === h.championId))
      || (h.minorPremierId !== undefined && !state.league.clubs.some(club => club.id === h.minorPremierId))
      || row.premiership !== (h.championId === state.clubId) || (h.championId !== undefined) !== (h.final !== undefined)) return 'league career history honour';
    if (h.final !== undefined) {
      const f = h.final;
      if (!record(f) || !keys(f, ['fixtureId', 'homeId', 'awayId', 'result']) || !text(f.fixtureId) || !f.fixtureId.startsWith(`${h.instanceId}:f`)
        || !/^\d+$/.test(f.fixtureId.slice(h.instanceId.length + 2))
        || !text(f.homeId) || !text(f.awayId) || f.homeId === f.awayId || !record(f.result) || !keys(f.result, ['homeScore', 'awayScore', 'winnerId', 'decider'])
        || ![f.homeId,f.awayId].every(id => state.league.clubs.some(club => club.id === id))
        || !integer(f.result.homeScore, 0) || !integer(f.result.awayScore, 0) || f.result.winnerId !== h.championId
        || ![f.homeId, f.awayId].includes(String(f.result.winnerId))
        || (f.result.homeScore !== f.result.awayScore ? !['score', 'forfeit'].includes(String(f.result.decider))
          || f.result.winnerId !== (f.result.homeScore > f.result.awayScore ? f.homeId : f.awayId) : !['seeded-draw', 'higher-seed'].includes(String(f.result.decider)))) return 'league career history final';
    }
    if (h.lastPlayerFinal !== undefined) {
      const f = h.lastPlayerFinal;
      if (!record(f) || !keys(f, ['fixtureId', 'stageId', 'stageName', 'round', 'slot', 'homeId', 'awayId', 'result'])
        || !text(f.fixtureId) || !f.fixtureId.startsWith(`${h.instanceId}:f`) || !text(f.stageId) || !text(f.stageName)
        || !/^\d+$/.test(f.fixtureId.slice(h.instanceId.length + 2))
        || !integer(f.round) || !integer(f.slot) || f.slot > h.slotCount || !text(f.homeId) || !text(f.awayId) || f.homeId === f.awayId
        || ![f.homeId,f.awayId].every(id => state.league.clubs.some(club => club.id === id))
        || ![f.homeId, f.awayId].includes(state.clubId) || !record(f.result) || !keys(f.result, ['homeScore', 'awayScore', 'winnerId', 'decider'])
        || !integer(f.result.homeScore, 0) || !integer(f.result.awayScore, 0) || ![f.homeId, f.awayId].includes(String(f.result.winnerId))
        || (f.result.homeScore !== f.result.awayScore ? !['score', 'forfeit'].includes(String(f.result.decider))
          || f.result.winnerId !== (f.result.homeScore > f.result.awayScore ? f.homeId : f.awayId) : !['seeded-draw', 'higher-seed'].includes(String(f.result.decider)))) return 'league career history last final';
    }
    const source = c.instances.find(i => i.id === h.instanceId);
    if (source) {
      let close: LeagueCloseFacts;
      try {close = leagueCloseFacts(c.world, c.instances, row.season, h.startInterval);} catch {return 'league career history source';}
      const fact = close.leagues.find(l => l.instanceId === source.id)!;
      if (!source.entrantIds.includes(state.clubId) || !equal(h, leagueHistoryFacts(close, source, h.leagueId, state.clubId))
        || row.ladderPosition !== fact.standings.find(r => r.clubId === state.clubId)?.position) return 'league career history source facts';
      const fixtures = source.fixtures.filter(f => f.status === 'completed' && source.definition.stages.find(s => s.id === f.stageId)?.kind === 'league'
        && (f.homeId === state.clubId || f.awayId === state.clubId));
      const scores = fixtures.map(f => f.homeId === state.clubId ? [f.result!.homeScore, f.result!.awayScore] : [f.result!.awayScore, f.result!.homeScore]);
      if (row.wins !== scores.filter(([a,b]) => a! > b!).length || row.losses !== scores.filter(([a,b]) => a! < b!).length
        || row.draws !== scores.filter(([a,b]) => a === b).length || row.pointsFor !== scores.reduce((n,[a]) => n + a!, 0)
        || row.pointsAgainst !== scores.reduce((n,[,b]) => n + b!, 0)) return 'league career history standings';
    } else if (row.season >= state.season - 1) return 'league career history missing source';
    endingInterval = h.endingInterval;
  }
  if (p.phase === 'next-season-choice') {
    const row = state.history[state.history.length - 1]!;
    if (row.league!.endingInterval !== p.close?.endingInterval || row.league!.startInterval !== p.accepted?.startInterval) return 'league career history close clock';
    const review = row.review!;
    const books = state.finance.find(f => f.season === state.season);
    if (books) {
      const values = Object.entries(books).filter(([key]) => key !== 'season').map(([,n]) => n);
      if (!equal(review.money, {in: Math.round(values.reduce((n,v) => n + Math.max(0, v), 0)), out: Math.round(values.reduce((n,v) => n - Math.min(0, v), 0))})) return 'league career frozen books';
    } else if (review.money !== undefined) return 'league career frozen books';
    const reviewed = state.objectives.filter(o => o.status !== 'pending');
    const met = reviewed.filter(o => o.status === 'met').length;
    const board = reviewed.length ? {met, missed: reviewed.length - met, patience: state.boardPatience,
      sacked: state.sacked?.season === state.season, objectives: reviewed.map(o => ({text: o.text, met: o.status === 'met'}))} : undefined;
    if (reviewed.length !== state.objectives.length || !equal(review.board, board)) return 'league career frozen board';
  } else if (p.accepted && p.accepted.startInterval !== endingInterval) return 'league career history acceptance clock';
  return null;
}
