// State-derived discovery and deadline rules. Entry remains owned by each event's
// existing preview/commit operations; this module never chooses or saves an entry.
import type { GameState } from '../core/state';
import { CHALLENGE_EDITIONS, type ChallengeEditionId } from '../data/individualChallengeRules';
import { challengeFixture } from '../data/individualChallenges';
import { CAMP_RULES, openingCampFixture, supportedCampCalendar } from '../data/playerAssignments';
import { currentSkillsCamp } from './playerAssignments';
import { challengeQualified, currentIndividualChallenge } from './individualChallenges';

export type OpportunityId = ChallengeEditionId | 'skills-camp' | 'open-cup';
export type OpportunityStatus = 'available' | 'upcoming' | 'locked' | 'registered' | 'declined' | 'completed' | 'missed' | 'closed';
export interface EventOpportunity {
  id: OpportunityId;
  key: string;
  name: string;
  status: OpportunityStatus;
  detail: string;
  closesWeek: number;
}
const deadline = (week: number, closes: number): string => week === closes ? 'Closes this week' : `Enter by Week ${closes}`;

export function eventOpportunities(state: GameState): EventOpportunity[] {
  const c = state.competitions;
  if (!c?.leagueCareer || c.leagueCareer.phase === 'initial-choice') return [];
  const active = !state.sacked && c.leagueCareer.phase === 'active';
  const supported = supportedCampCalendar(c, state.pack ?? 'au');
  const rows: EventOpportunity[] = [];
  const add = (id: OpportunityId, name: string, status: OpportunityStatus, detail: string, closesWeek: number): void => {
    rows.push({id, key: `${state.season}:${state.clubId}:${id}`, name, status, detail, closesWeek});
  };
  const camp = currentSkillsCamp(state);
  if (camp || (supported && openingCampFixture(c, state.season, state.clubId))) {
    const rules = camp?.rules ?? CAMP_RULES;
    const status = camp?.status;
    if (status === 'booked' || status === 'away') add('skills-camp', rules.title, 'registered', `${status === 'away' ? 'Away now' : `Registered · Away Week ${rules.departureWeek}`} · Back Week ${rules.returnWeek}`, rules.closesWeek);
    else if (status === 'completed') add('skills-camp', rules.title, 'completed', 'Completed · Player returned', rules.closesWeek);
    else if (status === 'cancelled') add('skills-camp', rules.title, 'closed', 'Cancelled · Returns next season', rules.closesWeek);
    else if (active && status === 'available' && state.week <= rules.closesWeek) add('skills-camp', rules.title, 'available', `${deadline(state.week, rules.closesWeek)} · Away Week ${rules.departureWeek}`, rules.closesWeek);
    else add('skills-camp', rules.title, 'missed', 'Booking closed · Opens next season', rules.closesWeek);
  }
  for (const ed of Object.values(CHALLENGE_EDITIONS)) {
    const record = currentIndividualChallenge(state, ed.id);
    if (!record && !supported) continue;
    let status: OpportunityStatus;
    let detail: string;
    if (record && record.status !== 'cancelled') {
      status = record.status === 'completed' || record.status === 'interrupted' ? 'completed' : 'registered';
      detail = record.status === 'booked' ? `Registered · Away Week ${ed.eventWeek}`
        : record.status === 'coaching' ? 'Contest in progress · Resume coaching'
        : record.status === 'ready-for-interval' ? `Contest complete · Back Week ${ed.returnWeek}`
        : record.status === 'interrupted' ? 'Interrupted · Player returned' : 'Completed · View report';
    } else if (ed.requiresFirstTitle && !challengeQualified(state)) {
      status = 'locked'; detail = 'Win Break the Line to unlock entry';
    } else if (!active || state.week > ed.bookingEndWeek) {
      status = 'missed'; detail = 'Registration closed · Returns next season';
    } else if (state.week < ed.bookingStartWeek) {
      status = 'upcoming'; detail = `Opens Week ${ed.bookingStartWeek} · Enter by Week ${ed.bookingEndWeek}`;
    } else if (challengeFixture(c, state.season, state.clubId, ed.id)?.fixture.status === 'scheduled') {
      status = 'available'; detail = `${deadline(state.week, ed.bookingEndWeek)} · Away Week ${ed.eventWeek}`;
    } else {
      status = 'closed'; detail = 'No scheduled fixture for this event';
    }
    add(ed.id, ed.name, status, detail, ed.bookingEndWeek);
  }
  const offer = c.openCupEntry?.current;
  if (offer?.season === state.season) {
    let status: OpportunityStatus;
    let detail: string;
    const cup = c.instances.find(i => i.id === offer.instanceId);
    if (offer.withdrawal) {
      status = 'closed'; detail = offer.withdrawal.fulfilled ? 'Withdrawn' : 'Withdrawal queued';
    } else if (offer.choice === 'decline' || offer.resolution === 'declined') {
      status = 'declined'; detail = 'Declined · Optional entry';
    } else if (offer.choice === 'enter' || offer.resolution === 'legacy-cup') {
      status = cup?.status === 'completed' ? 'completed' : 'registered';
      detail = status === 'completed' ? 'Completed · View cup report' : 'Entered · View cup details';
    } else if (active && offer.lifecycle === 'open' && state.week < offer.deadline) {
      status = 'available'; detail = `${deadline(state.week, offer.deadline - 1)} · Free club entry`;
    } else {
      status = 'missed'; detail = 'Entry closed · New offer next season';
    }
    add('open-cup', offer.definition.name, status, detail, offer.deadline - 1);
  }
  // Ready entries lead the home summary; otherwise show what can be managed next.
  const priority = (e: EventOpportunity): number => e.status === 'available' ? 0 : e.status === 'registered' ? 1 : e.status === 'upcoming' ? 2 : 3;
  return rows.sort((a, b) => priority(a) - priority(b) || a.closesWeek - b.closesWeek);
}

/** Only currently open opportunities: a run checks again before each later tick. */
export function closingEventOpportunities(state: GameState, span: number, acknowledged: ReadonlySet<string> = new Set()): EventOpportunity[] {
  if (span <= 0) return [];
  return eventOpportunities(state).filter(e => e.status === 'available' && state.week + span > e.closesWeek && !acknowledged.has(e.key));
}
