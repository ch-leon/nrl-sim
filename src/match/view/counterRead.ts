// Presentation only (#468): the approved matrix's approximate win-share points,
// qualified by kickoff fits. These are a read, never live contest probabilities.
import { COUNTERS } from '../league/counters';
import { COUNTER_MATRIX } from '../league/counterMatrix';
import { styleFit } from '../league/fit';
import type { AttackPreset, DefencePreset, TeamTactics } from '../league/presets';
import type { TeamSheet } from '../../sim/events';

export { COUNTER_MATRIX } from '../league/counterMatrix';

export function expectedCounterSwing(us: TeamSheet, them: TeamSheet, you: TeamTactics, they: TeamTactics): number {
  const ours = styleFit(us.roster ?? []), theirs = styleFit(them.roster ?? []);
  const cell = (attack: AttackPreset, defence: DefencePreset, a: number, d: number): number =>
    COUNTERS[defence].on === 1 ? 5 * COUNTER_MATRIX[attack][defence] * a * d : 0;
  return cell(you.attack, they.defence, ours[you.attack], theirs[they.defence])
    - cell(they.attack, you.defence, theirs[they.attack], ours[you.defence]);
}
