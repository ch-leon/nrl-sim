// src/systems/staff.ts — three hires the facilities don't cover (N14.5).
//
// The Welfare Manager halves the odds of the players' grievance cards and takes a
// tenth off renewal asks. The Assistant Coach (the player's plan changed at the
// break when a match is fast-forwarded, by the rivals' rule) and the Analyst (the
// rival's plan and its switch on the next-match card) need the break rule (N13.5,
// N14.1): they can be hired and are paid now, and act once it lands. Each is hired and released from the Staff panel under
// the board's objectives (Finance), is paid a wage a week with the running costs
// (economy.weeklyOverhead, the `overhead` line), and never leaves on his own.
import { bus } from '../core/events';
import { getState, setState, type GameState, type StaffMember, type StaffRole } from '../core/state';
import { randomName } from '../data/names';
import { makeRng } from '../utils/rng';
import { difficultyMultipliers } from '../config';

export interface StaffDef {
  title: string;
  /** A week, before the difficulty's wage multiplier. Assumed (needs Leon). */
  wage: number;
  blurb: string;
}

export const STAFF: Record<StaffRole, StaffDef> = {
  assistantCoach: {
    title: 'Assistant Coach', wage: 800,
    blurb: 'Will change the plan at the break when you fast-forward a match, as the rival coaches do (coming in a later update).',
  },
  analyst: {
    title: 'Analyst', wage: 600,
    blurb: 'Will say what the next rival plays and what it switches to when behind (coming in a later update).',
  },
  welfare: {
    title: 'Welfare Manager', wage: 700,
    blurb: 'Halves the odds of a player’s grievance card and takes a tenth off renewal asks.',
  },
};

/** The roles in the order the panel lists them (and the soak's manager hires them). */
export const STAFF_ROLES: readonly StaffRole[] = ['assistantCoach', 'analyst', 'welfare'];

/** Grievance cards the Welfare Manager makes half as likely (data/events.ts ids). */
export const WELFARE_CARDS: ReadonlySet<string> = new Set(['unhappyTalk', 'starPayRise', 'homesick']);
/** What the Welfare Manager takes off a renewal ask. Assumed (needs Leon). */
export const WELFARE_RENEWAL_CUT = 0.1;

export function hasStaff(state: Partial<Pick<GameState, 'staff'>>, role: StaffRole): boolean {
  return (state.staff ?? []).some((m) => m.role === role);
}

/** A role's wage a week as paid (difficulty-scaled, like the players'). */
export function staffWage(state: Pick<GameState, 'settings'>, role: StaffRole): number {
  return Math.round(STAFF[role].wage * difficultyMultipliers(state.settings.difficulty).wages);
}

/** Every hire's wage a week. */
export function staffWages(state: Pick<GameState, 'staff'>): number {
  return state.staff.reduce((t, m) => t + m.wage, 0);
}

/** Hire `role` (no fee; the wage starts with the next week). False if already on staff. */
export function hireStaff(role: StaffRole): StaffMember | null {
  const s = getState();
  if (hasStaff(s, role)) return null;
  const rng = makeRng(s.rngSeed);
  const member: StaffMember = { role, name: randomName(rng), wage: staffWage(s, role), hiredSeason: s.season };
  setState({ staff: [...s.staff, member], rngSeed: rng.state() });
  bus.emit('ui:notify', { text: `${member.name} joins as ${STAFF[role].title}.`, kind: 'success' });
  return member;
}

/** Let `role` go (no payout). False if nobody holds it. */
export function releaseStaff(role: StaffRole): boolean {
  const s = getState();
  const member = s.staff.find((m) => m.role === role);
  if (!member) return false;
  setState({ staff: s.staff.filter((m) => m !== member) });
  bus.emit('ui:notify', { text: `${member.name} has left the ${STAFF[role].title} job.`, kind: 'info' });
  return true;
}
