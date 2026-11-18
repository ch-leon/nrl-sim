import type { GameState } from '../core/state';
import type { Events } from '../core/events';
import type { CompetitionDefinition } from '../data/competition';
import type { CompetitionCalendarSlot } from '../data/competitionCalendar';
import type { EntryQuote } from '../data/leagueEntryReceipt';

import { canonicalLeagueJson, leagueEntryReceiptId, type LeagueEntryReceipt, type LeagueTitleEvidence, type LeagueMovement } from '../data/leagueCareer';
import { allocateLeagueFields } from './leagueSelection';
import { divisionForClub } from '../data/competitionDivisions';
import type { LeagueFields } from '../data/divisions';
import { savedTrialDefinitions } from '../data/leagueSchedule';
import { leagueCareerStateProblem } from './leagueEntryValidation';
import { entryQuote } from './leagueEntryQuote';
import { createOpenCupOffer } from './openCupEntry';
import { annualLeagueEntry } from './leagueAnnualEntry';
import { generateLeagueObjectives } from './board';
import { activePack } from '../content';

export interface LeagueEntrySelection { leagueId: string; previewKey: string; }
export interface LeagueEntryPreview extends LeagueEntrySelection {
  phase: 'initial-choice' | 'next-season-choice';
  eligible: boolean;
  sourceSeason: number;
  targetSeason: number;
  sourceCloseId: string | null;
  currentLeagueId: string;
  leagueName: string;
  rank: number;
  requirement: { leagueId: string; leagueName: string; } | null;
  evidence: LeagueTitleEvidence | null;
  fieldIds: string[];
  movements: LeagueMovement[];
  definition: CompetitionDefinition;
  slots: CompetitionCalendarSlot[];
  trialSlots: number[];
  strength: { min: number; mean: number; max: number; };
  quote: EntryQuote;
}
export interface LeagueEntryRefusal {
  ok: false;
  reason: 'unavailable' | 'invalid' | 'unsupported' | 'locked' | 'stale' | 'annual-failure';
  message: string;
}
export type LeaguePreviewResult = { ok: true; preview: LeagueEntryPreview; } | LeagueEntryRefusal;
export type LeagueEntryResult = { ok: true; state: GameState; notices: Events['ui:notify'][]; } | LeagueEntryRefusal;

function refusal(reason: LeagueEntryRefusal['reason'], message: string): LeagueEntryRefusal {
  return { ok: false, reason, message };
}

function drawFields(state: GameState, leagueId: string) {
  const c = state.competitions!;
  if (c.leagueCareer!.phase === 'next-season-choice')
    return allocateLeagueFields(c.world!, c.leagueCareer!.close!, state.clubId, leagueId, c.instances);
  const fields = Object.fromEntries(c.world!.divisions.map(d => [d.id, c.instances.find(i => i.id === d.instanceId)!.entrantIds]));
  return { policy: 'adjacent-vacancy-v1' as const, fields, movements: [] };
}

export function previewLeagueEntry(state: GameState, leagueId: string): LeaguePreviewResult {
  const c = state.competitions;
  const progress = c?.leagueCareer;
  if (state.sacked) return refusal('unavailable', 'League choice ended when the board dismissed you.');
  if (progress?.phase === 'active') return refusal('unavailable', 'This season already has a confirmed league.');
  if (!progress) return refusal('unavailable', 'A league choice is unavailable for this career.');
  try {
    const problem = leagueCareerStateProblem(state);
    if (problem) return refusal(problem.reason, problem.message);
    if (!c.world) return refusal('invalid', 'Missing League career world.');
    if (state.matchIncome.some(r => !r.receipt)) return refusal('invalid', 'A fixture payment is still unresolved.');
    const league = c.world.divisions.find(d => d.id === leagueId);
    if (!league) return refusal('unavailable', 'This league is unavailable in the saved region.');
    const current = divisionForClub(c.world, c.instances, state.clubId)!;
    const leagues = c.world.divisions.map(d => c.instances.find(i => i.id === d.instanceId)!);
    const currentInstances = c.instances.filter(i => i.season === state.season);
    const trials = savedTrialDefinitions(c.world.profile.id, leagues, currentInstances, c.calendar!.slots)[league.rank]!;
    const { fields, movements } = drawFields(state, leagueId);
    const targetSeason = progress.phase === 'initial-choice' ? state.season : state.season + 1;
    const access = progress.access.find(a => a.leagueId === leagueId);
    const requirement = c.world.divisions.find(d => d.rank === league.rank - 1);
    const quote = entryQuote(state, targetSeason, leagueId, fields, movements);
    const strengths = quote.opponents.map(o => o.strength);
    const preview: LeagueEntryPreview = {
      leagueId, previewKey: canonicalLeagueJson(['league-entry-v1', leagueId, state]), phase: progress.phase, eligible: !!access,
      sourceSeason: state.season, targetSeason, sourceCloseId: progress.close?.id ?? null, currentLeagueId: current.division.id,
      leagueName: league.name, rank: league.rank, requirement: requirement ? { leagueId: requirement.id, leagueName: requirement.name } : null,
      evidence: access?.earnedFrom ?? null, fieldIds: [...fields[leagueId]!], movements, definition: leagues[league.rank]!.definition,
      slots: c.calendar!.slots, trialSlots: trials.map(d => d.stages[0]!.slotIds![0]!),
      strength: { min: Math.min(...strengths), max: Math.max(...strengths), mean: strengths.reduce((n, v) => n + v, 0) / strengths.length }, quote
    };
    return { ok: true, preview: structuredClone(preview) };
  } catch (error) {
    return refusal('invalid', error instanceof Error ? error.message : 'Invalid League entry source.');
  }
}

export function acceptLeagueEntry(state: GameState, selection: LeagueEntrySelection): LeagueEntryResult {
  const result = previewLeagueEntry(state, selection.leagueId);
  if (!result.ok) return result;
  const p = result.preview;
  if (p.previewKey !== selection.previewKey) return refusal('stale', 'The career changed. Check the updated league preview.');
  if (!p.eligible) return refusal('locked', 'Win the required league title to unlock this league.');
  if (p.phase === 'next-season-choice' && activePack().id !== state.competitions!.world!.profile.pack)
    return refusal('unsupported', 'Load the saved regional content before annual entry.');
  try {
    const source = structuredClone(state);
    const c = source.competitions!;
    const progress = c.leagueCareer!;
    const fields: LeagueFields = drawFields(source, p.leagueId).fields;
    const accepted: LeagueEntryReceipt = {
      season: p.targetSeason, leagueId: p.leagueId, quote: p.quote, movements: p.movements,
      receiptId: leagueEntryReceiptId(c.world!.profile.id, p.targetSeason, source.clubId, p.leagueId),
      allocationPolicy: 'adjacent-vacancy-v1', startInterval: c.calendar!.elapsedIntervals, annualChanges: null
    };
    const entry = p.phase === 'initial-choice'
      ? { state: { ...source, competitions: { ...c, leagueCareer: { ...progress, phase: 'active' as const, accepted } } }, notices: [] }
      : annualLeagueEntry(source, fields, accepted);
    const candidate = createOpenCupOffer({ ...entry.state, objectives: generateLeagueObjectives(entry.state, p.fieldIds) });
    const problem = leagueCareerStateProblem(candidate);
    if (problem) return refusal(problem.reason, problem.message);
    return { ok: true, state: candidate, notices: entry.notices };
  } catch (error) {
    return refusal('annual-failure', error instanceof Error ? error.message : 'The league entry could not be prepared.');
  }
}
