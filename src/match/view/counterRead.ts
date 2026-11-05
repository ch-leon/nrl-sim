// Presentation only (#468): the approved matrix's approximate win-share points,
// qualified by kickoff fits. These are a read, never live contest probabilities.
import { COUNTERS } from '../league/counters';
import { styleFit } from '../league/fit';
import type { AttackPreset, DefencePreset, TeamTactics } from '../league/presets';
import type { TeamSheet } from '../../sim/events';

export const COUNTER_MATRIX: Readonly<Record<AttackPreset, Readonly<Record<DefencePreset, number>>>> = {
  grind: { slide: 1, rush: 0, compressed: -1 },
  balanced: { slide: 0, rush: 0, compressed: 0 },
  expansive: { slide: -1, rush: 0, compressed: 1 },
  'kick-chase': { slide: -1, rush: 1, compressed: 0 },
  'all-out': { slide: 1, rush: -1, compressed: 0 },
};

export function expectedCounterSwing(us: TeamSheet, them: TeamSheet, you: TeamTactics, they: TeamTactics): number {
  const ours = styleFit(us.roster ?? []), theirs = styleFit(them.roster ?? []);
  const cell = (attack: AttackPreset, defence: DefencePreset, a: number, d: number): number =>
    COUNTERS[defence].on === 1 ? 5 * COUNTER_MATRIX[attack][defence] * a * d : 0;
  return cell(you.attack, they.defence, ours[you.attack], theirs[they.defence])
    - cell(they.attack, you.defence, theirs[they.attack], ours[you.defence]);
}
