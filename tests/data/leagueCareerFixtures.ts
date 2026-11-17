import { AU_PACK } from '../../src/content/au';
import { AU_CAREER_PROFILE } from '../../src/content/career/au';
import { buildDivisionSchedule, type RegionalCareerProfile } from '../../src/data/divisions';
import { competitionFixtureId, standingsOrder, type CompetitionCareerState } from '../../src/data/competition';
import type { LeagueProgress } from '../../src/data/leagueCareer';

const ids = ['player', ...AU_CAREER_PROFILE.clubs.slice(0, 5).map(c => c.id)];
export const profile: RegionalCareerProfile = { ...AU_CAREER_PROFILE, clubs: AU_CAREER_PROFILE.clubs.slice(0, 5),
  slotCount: 5, calendarSlots: Array.from({length: 5}, (_, i) => ({ id: i + 1, kind: i < 2 ? 'preseason' : 'competition' })), trialSlots: [1, 2],
  divisions: AU_CAREER_PROFILE.divisions.map((d, i) => ({ ...d, regularRounds: 2, regularSlots: [3, 4], finalsSlots: [5], finalsSize: 2,
    entrants: ids.slice(i * 2, i * 2 + 2).map(clubId => ({clubId, strength: 44})) })) };
export const fields = Object.fromEntries(profile.divisions.map(d => [d.id, d.entrants.map(e => e.clubId)]));
export const clubIds = ids;
export function competitions(season = 1, complete = true): CompetitionCareerState {
  const schedule = buildDivisionSchedule(profile, AU_PACK, season, fields, 573);
  if (complete) for (const league of schedule.instances) {
    for (const f of league.fixtures) { f.status = 'completed'; f.result = { homeScore: 12, awayScore: 0, winnerId: f.homeId, decider: 'score' }; }
    const ranked = standingsOrder(league.entrantIds, league.fixtures, league.definition.standings!, league.tieOrder);
    league.fixtures.push({ id: competitionFixtureId(league.id, 2), competitionId: league.id, stageId: 'finals', round: 1, slot: 5,
      homeId: ranked[0]!, awayId: ranked[1]!, neutral: true, status: 'completed', result: { homeScore: 12, awayScore: 0, winnerId: ranked[0]!, decider: 'score' } });
    // Player wins the title even if the frozen regular tie went to his opponent.
    if (league.entrantIds.includes('player')) { const f = league.fixtures[2]!; f.result = { homeScore: f.homeId === 'player' ? 12 : 0, awayScore: f.awayId === 'player' ? 12 : 0, winnerId: 'player', decider: 'score' }; }
    league.status = 'completed'; league.winnerId = league.fixtures[2]!.result!.winnerId!;
  }
  return { schemaVersion: 1, instances: schedule.instances, world: { profile: schedule.profile, divisions: schedule.divisions },
    calendar: { mode: 'structural', status: complete ? 'awaiting-next-season' : 'active', season, elapsedIntervals: complete ? 5 : 0, slots: profile.calendarSlots.map(s => ({...s})) } };
}
export function progress(): LeagueProgress {
  return { version: 1, scheduleSeed: 573, clubId: 'player', phase: 'initial-choice', access: [{leagueId: profile.startingDivisionId}] };
}
