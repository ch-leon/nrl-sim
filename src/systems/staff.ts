import { awaitingCampReplay } from './parkedLeagueFixture';
// Staff appointments are one-off cash investments; salaries never drain cash.
import { bus } from '../core/events';
import { getState, setState, type AttackCoachSpeciality, type GameState, type StaffMember, type StaffRole } from '../core/state';
import { PLAYS } from '../match/league/plays';
import { randomName } from '../data/names';
import { makeRng } from '../utils/rng';
import { difficultyMultipliers } from '../config';
import { STAFF_APPOINTMENT_PRICES } from '../data/financeRules';
import { weekHeld } from '../core/time';
export { STAFF_APPOINTMENT_PRICES } from '../data/financeRules';

export interface StaffDef {
  title: string;
  /** A week, before the difficulty's wage multiplier. Assumed (needs Leon). */
  wage: number;
  blurb: string;
}

/** The roles hired as they are: every one but the attack coach, who is hired by speciality (hireAttackCoach). */
export type HireRole = Exclude<StaffRole, 'attackCoach'>;

export const STAFF: Record<HireRole, StaffDef> = {
  assistantCoach: {
    title: 'Assistant Coach', wage: 800,
    blurb: 'Changes your plan at the break when you fast-forward a match, the same way a rival’s does.',
  },
  analyst: {
    title: 'Analyst', wage: 600,
    blurb: 'On the next-match card and the rival’s squad page, says what they switch to when they are behind.',
  },
  welfare: {
    title: 'Welfare Manager', wage: 700,
    blurb: 'Halves the odds of a player’s grievance card, halves the chance a risky night out or trip goes wrong, and reduces new salary demands by up to 3%.',
  },
};

/** The roles in the order the panel lists them (and the soak's manager hires them); the attack coach's row comes after. */
export const STAFF_ROLES: readonly HireRole[] = ['assistantCoach', 'analyst', 'welfare'];

/** The attack coaches (#326, plan §2.2): a week's wage before the difficulty's multiplier, and what each opens. */
export const ATTACK_COACHES: Record<AttackCoachSpeciality, StaffDef & { short: string }> = {
  direct: {
    title: 'Attack Coach (direct play)', short: 'Direct', wage: 800,
    blurb: 'Block plays, short balls and the blind side: plays for a side that goes through the middle.',
  },
  width: {
    title: 'Attack Coach (shift and width)', short: 'Width', wage: 950,
    blurb: 'Shifts, second-man plays and the cut-out ball: plays that need smart halves.',
  },
  kicking: {
    title: 'Attack Coach (kicking game)', short: 'Kicking', wage: 900,
    blurb: 'Kicks you call: the cross-field for the corner and the chip over the line.',
  },
  razzle: {
    title: 'Attack Coach (razzle)', short: 'Razzle', wage: 1250,
    blurb: 'Risky plays off a tap (and a scrum, when they come). Big when they work; needs reputation 50.',
  },
};

/** The specialities in the order the panel offers them. */
export const ATTACK_SPECIALITIES: readonly AttackCoachSpeciality[] = ['direct', 'width', 'kicking', 'razzle'];

/** Grievance cards the Welfare Manager makes half as likely (data/events.ts ids). */
export const WELFARE_CARDS: ReadonlySet<string> = new Set(['unhappyTalk', 'starPayRise', 'homesick']);
/** What the Welfare Manager takes off a renewal ask. Assumed (needs Leon). */
export const WELFARE_RENEWAL_CUT = 0.1;

export function hasStaff(state: Partial<Pick<GameState, 'staff'>>, role: StaffRole): boolean {
  return (state.staff ?? []).some((m) => m.role === role);
}

/** A role's wage a week as paid (difficulty-scaled, like the players'). */
export function staffWage(state: Pick<GameState, 'settings'>, role: HireRole): number {
  return Math.round(STAFF[role].wage * difficultyMultipliers(state.settings.difficulty).wages);
}

/** An attack coach's wage a week as paid (difficulty-scaled, like the other staff). */
export function attackCoachWage(state: Pick<GameState, 'settings'>, speciality: AttackCoachSpeciality): number {
  return Math.round(ATTACK_COACHES[speciality].wage * difficultyMultipliers(state.settings.difficulty).wages);
}

/** The club's attack coach, if it has one. */
export function attackCoach(state: Partial<Pick<GameState, 'staff'>>): StaffMember | null {
  return (state.staff ?? []).find((m) => m.role === 'attackCoach') ?? null;
}

/** The job's title on a card: the role's, or the attack coach's with his speciality. */
export function staffTitle(member: Pick<StaffMember, 'role' | 'speciality'>): string {
  if (member.role === 'attackCoach') return member.speciality ? ATTACK_COACHES[member.speciality].title : 'Attack Coach';
  return STAFF[member.role].title;
}

/** Why the club can't hire this attack coach now, or null: one at a time, and the Razzle coach needs reputation. */
export function attackCoachRefusal(state: Pick<GameState, 'staff' | 'reputation'>, speciality: AttackCoachSpeciality): string | null {
  if (attackCoach(state)) return 'You already have an attack coach';
  if (speciality === 'razzle' && state.reputation < PLAYS.razzleRep) return `Needs reputation ${PLAYS.razzleRep}`;
  return null;
}

/** Every hire's wage a week. */
export function staffWages(state: Pick<GameState, 'staff'>): number {
  return state.staff.reduce((t, m) => t + m.wage, 0);
}

/** Hire `role` for its upfront fee. Refuses duplicate or unaffordable appointments. */
export function hireStaff(role: HireRole): StaffMember | null {
  const s = getState();
  if (awaitingCampReplay(s) || weekHeld() || hasStaff(s, role) || !(role in STAFF) || s.money < STAFF_APPOINTMENT_PRICES[role]) return null;
  const rng = makeRng(s.rngSeed);
  const member: StaffMember = { role, name: randomName(rng), wage: staffWage(s, role), hiredSeason: s.season };
  const fee = STAFF_APPOINTMENT_PRICES[role];
  const balance = s.money - fee;
  setState({ staff: [...s.staff, member], rngSeed: rng.state(), money: balance });
  bus.emit('money:changed', { delta: -fee, reason: `staff:${role}`, balance });
  bus.emit('ui:notify', { text: `${member.name} joins as ${STAFF[role].title}.`, kind: 'success' });
  return member;
}

/**
 * Hire an attack coach of `speciality` for its upfront appointment fee: one at a time, and the Razzle coach only at reputation
 * PLAYS.razzleRep. Null when refused (attackCoachRefusal says why).
 */
export function hireAttackCoach(speciality: AttackCoachSpeciality): StaffMember | null {
  const s = getState();
  if (awaitingCampReplay(s) || weekHeld() || !(speciality in ATTACK_COACHES) || attackCoachRefusal(s, speciality) !== null || s.money < STAFF_APPOINTMENT_PRICES[speciality]) return null;
  const rng = makeRng(s.rngSeed);
  const member: StaffMember = { role: 'attackCoach', name: randomName(rng), wage: attackCoachWage(s, speciality), hiredSeason: s.season, speciality };
  const fee = STAFF_APPOINTMENT_PRICES[speciality];
  const balance = s.money - fee;
  setState({ staff: [...s.staff, member], rngSeed: rng.state(), money: balance });
  bus.emit('money:changed', { delta: -fee, reason: `staff:${speciality}`, balance });
  bus.emit('ui:notify', { text: `${member.name} joins as ${ATTACK_COACHES[speciality].title}.`, kind: 'success' });
  return member;
}

/** Let `role` go (no payout). False if nobody holds it. An attack coach's plays stay bought (#326). */
export function releaseStaff(role: StaffRole): boolean {
  const s = getState();
  const member = s.staff.find((m) => m.role === role);
  if (awaitingCampReplay(s) || weekHeld() || !member) return false;
  setState({ staff: s.staff.filter((m) => m !== member) });
  bus.emit('ui:notify', { text: `${member.name} has left the ${staffTitle(member)} job.`, kind: 'info' });
  return true;
}
