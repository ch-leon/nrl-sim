import type { PlayerStats, TraitInstance, TrainingFocus } from '../core/state';
import { INITIAL_CALENDAR, INITIAL_REGULAR_SLOTS } from '../content/career/calendar';
import { PROGRESSION } from '../config';
import type { CompetitionCareerState } from './competition';
import { canonicalLeagueJson } from './leagueCareer';
import type { CampAwardReceipt } from '../systems/assignmentTraining';

export const CAMP_RULES = {
  definitionId: 'skills-camp',
  version: 1,
  title: 'Skills Camp',
  opensWeek: 1,
  closesWeek: 4,
  departureWeek: 5,
  returnWeek: 6,
  minSquad: 13,
  onField: 9,
  bench: 4,
  baseXp: 70,
  fee: 0,
  eligibility: 'owned-fit-unbanned',
  substitution: 'replace-weekly-xp',
  facilities: 'none',
  spending: 'mode-at-return',
  cancellation: 'before-departure'
} as const;
export interface CampBooking {
  participantId: string;
  participantName: string;
  bookedWeek: number;
  focus: TrainingFocus | null;
}
export type CampStatus = 'available' | 'booked' | 'away' | 'cancelled' | 'completed';
export interface CampAwardBasis {
  age: number;
  xpTraits: TraitInstance[];
  stats: Partial<PlayerStats>;
  clubFocus: TrainingFocus;
}
export interface CampRecord {
  id: string;
  season: number;
  clubId: string;
  pack: string;
  instanceId: string;
  fixtureId: string;
  opponentId: string;
  rules: typeof CAMP_RULES;
  revision: number;
  status: CampStatus;
  booking: CampBooking | null;
  reason: string | null;
  award: CampAwardReceipt | null;
  awardBasis: CampAwardBasis | null;
}
/** Evidence from the clock's verified Week 5 checkpoint, never from a save being admitted. */
export interface RunningCamp {
  record: CampRecord;
}
export const COACH_CANCELLED = 'Cancelled by the coach before departure.';
export const campId = (season: number, club: string): string => `skills-camp:s${season}:${club}`;
const same = (a: unknown, b: unknown) => canonicalLeagueJson(a) === canonicalLeagueJson(b);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const fields = (v: unknown, keys: string[]): boolean =>
  object(v) && keys.length === Object.keys(v).length && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));
const integer = (v: number, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const statKeys = ['speed', 'strength', 'stamina', 'handling', 'kicking', 'footyIQ'];
const focus = (v: unknown) => v === 'balanced' || statKeys.includes(v as string);

export function openingCampFixture(c: CompetitionCareerState, season: number, clubId: string) {
  const league = c.instances.find(
    (i) => i.season === season && i.definition.format.kind === 'league' && i.entrantIds.includes(clubId)
  );
  if (!league) return null;
  const d = league.definition;
  if (
    d.slotCount !== 25 ||
    d.lineup.minSquad !== CAMP_RULES.minSquad ||
    d.lineup.onField !== CAMP_RULES.onField ||
    d.lineup.benchSize !== CAMP_RULES.bench ||
    !same(d.stages[0]?.slotIds, INITIAL_REGULAR_SLOTS)
  )
    return null;
  const fixture = league.fixtures.find(
    (f) =>
      f.stageId === d.stages[0]!.id &&
      f.round === 1 &&
      f.slot === CAMP_RULES.departureWeek &&
      (f.homeId === clubId || f.awayId === clubId)
  );
  return fixture ? { league, fixture } : null;
}

export function supportedCampCalendar(c: CompetitionCareerState, pack: string) {
  return (
    (pack === 'au' || pack === 'uk') &&
    c.world?.profile.id === pack + '-career-3x8' &&
    c.world.profile.version === 1 &&
    same(c.calendar?.slots, INITIAL_CALENDAR) &&
    !!c.openCupEntry &&
    same(c.openCupEntry.current.dates, [7, 10, 13, 16, 19])
  );
}
function validAward(a: CampAwardReceipt): boolean {
  if (
    !fields(a, [
      'effectiveXp',
      'xpBefore',
      'xpAfter',
      'levelsGained',
      'newPoints',
      'bankedBefore',
      'bankedAfter',
      'pointsSpent',
      'priorPointsSpent',
      'statGains',
      'mode',
      'focus'
    ]) ||
    ![a.levelsGained, a.newPoints, a.bankedBefore, a.bankedAfter, a.pointsSpent, a.priorPointsSpent].every((n) =>
      integer(n)
    ) ||
    ![a.xpBefore, a.xpAfter].every((n) => Number.isFinite(n) && n >= 0 && n < PROGRESSION.XP_PER_LEVEL) ||
    !Number.isFinite(a.effectiveXp) ||
    a.effectiveXp <= 0 ||
    a.effectiveXp > 210 ||
    Math.abs(a.effectiveXp - (a.levelsGained * PROGRESSION.XP_PER_LEVEL + a.xpAfter - a.xpBefore)) > 1e-8 ||
    a.newPoints !== a.levelsGained * PROGRESSION.POINTS_PER_LEVEL ||
    a.bankedAfter !== a.bankedBefore + a.newPoints - a.pointsSpent ||
    a.priorPointsSpent !== Math.min(a.bankedBefore, a.pointsSpent) ||
    !object(a.statGains)
  )
    return false;
  if (a.mode === 'manual' ? a.focus !== null || a.pointsSpent !== 0 : a.mode !== 'auto' || !focus(a.focus)) return false;
  return (
    Object.entries(a.statGains).every(([k, n]) => statKeys.includes(k) && typeof n === 'number' && n > 0 && n <= 100) &&
    Object.values(a.statGains).reduce((sum, n) => sum + Math.ceil(n - 1e-10), 0) === a.pointsSpent
  );
}

function validBasis(b: CampAwardBasis | null): boolean {
  if (
    !b ||
    !fields(b, ['age', 'xpTraits', 'stats', 'clubFocus']) ||
    !integer(b.age, 1) ||
    !focus(b.clubFocus) ||
    !Array.isArray(b.xpTraits) ||
    b.xpTraits.length > 2 ||
    !object(b.stats)
  )
    return false;
  return (
    new Set(b.xpTraits.map((t) => t?.id)).size === b.xpTraits.length &&
    b.xpTraits.every(
      (t) => fields(t, ['id', 'level']) && (t.id === 'youngGun' || t.id === 'workhorse') && integer(t.level, 1, 3)
    ) &&
    Object.keys(b.stats).length === 4 &&
    Object.entries(b.stats).every(([k, n]) => statKeys.includes(k) && Number.isFinite(n) && n >= 1 && n <= 100)
  );
}

type Context = {
  pack: string;
  season: number;
  week?: number;
  clubId?: string;
  clubIds: readonly string[];
  runningCamp?: RunningCamp;
};
export function validateAssignments(value: unknown, c: CompetitionCareerState, ctx: Context): string | null {
  if (value === undefined) return ctx.runningCamp ? 'missing running assignment' : null;
  if (
    !Array.isArray(value) ||
    !c.leagueCareer ||
    !supportedCampCalendar(c, ctx.pack) ||
    c.leagueCareer.phase === 'initial-choice'
  )
    return 'assignment calendar';
  const expected = ctx.runningCamp?.record;
  if (expected && !value.some((r) => same(expected, r))) return 'the running assignment differs from the verified departure';
  const seen = new Set<string>();
  for (const entry of value) {
    const r = entry as CampRecord;
    if (
      !fields(r, [
        'id',
        'season',
        'clubId',
        'pack',
        'instanceId',
        'fixtureId',
        'opponentId',
        'rules',
        'revision',
        'status',
        'booking',
        'reason',
        'award',
        'awardBasis'
      ]) ||
      !integer(r.season, 1, ctx.season) ||
      r.clubId !== c.leagueCareer.clubId ||
      r.id !== campId(r.season, r.clubId) ||
      seen.has(r.id) ||
      r.pack !== ctx.pack ||
      !same(r.rules, CAMP_RULES) ||
      !integer(r.revision, 1) ||
      !text(r.instanceId) ||
      !text(r.fixtureId) ||
      !r.fixtureId.startsWith(r.instanceId + ':f') ||
      !ctx.clubIds.includes(r.opponentId) ||
      r.opponentId === r.clubId
    )
      return 'assignment terms';
    if (r.status === 'completed' ? !validBasis(r.awardBasis) : r.awardBasis !== null) return 'assignment development inputs';
    seen.add(r.id);
    const hasSeason = c.instances.some((i) => i.season === r.season);
    const opening = openingCampFixture(c, r.season, r.clubId);
    if (
      hasSeason &&
      (!opening ||
        opening.league.id !== r.instanceId ||
        opening.fixture.id !== r.fixtureId ||
        ![opening.fixture.homeId, opening.fixture.awayId].includes(r.opponentId))
    )
      return 'assignment fixture';
    const week = r.season === ctx.season ? ctx.week : 25;
    if (r.status === 'available') {
      if (r.revision % 2 || r.booking !== null || r.reason !== null || r.award !== null) return 'assignment availability';
      continue;
    }
    const b = r.booking;
    if (
      !b ||
      !fields(b, ['participantId', 'participantName', 'bookedWeek', 'focus']) ||
      !text(b.participantId) ||
      !text(b.participantName) ||
      !integer(b.bookedWeek, 1, Math.min(4, week ?? 4)) ||
      (b.focus !== null && !focus(b.focus))
    )
      return 'assignment booking';
    if (r.status === 'booked') {
      if (
        r.revision % 2 !== 1 ||
        r.season !== ctx.season ||
        (week !== undefined && week > 5) ||
        r.reason !== null ||
        r.award !== null ||
        opening?.fixture.status !== 'scheduled'
      )
        return 'assignment reservation';
    } else if (r.status === 'away') {
      if (r.revision % 2 !== 0 || week !== 5 || expected?.id !== r.id || r.reason !== null || r.award !== null)
        return 'assignment outside its owned interval';
    } else if (r.status === 'completed') {
      if (
        r.revision < 3 ||
        r.revision % 2 !== 1 ||
        (week !== undefined && week < 6) ||
        r.reason !== null ||
        !r.award ||
        !validAward(r.award) ||
        (opening && !['completed', 'cancelled'].includes(opening.fixture.status))
      )
        return 'assignment completion';
    } else if (
      r.status !== 'cancelled' ||
      r.revision % 2 !== 0 ||
      (week !== undefined && week < 5) ||
      !text(r.reason) ||
      r.award !== null ||
      (week === 5 && r.reason !== COACH_CANCELLED && expected?.id !== r.id)
    )
      return 'assignment cancellation';
  }
  return null;
}
