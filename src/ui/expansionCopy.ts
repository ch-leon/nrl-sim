// Expansion wording is kept together for future content packs. No simulation rules.
import type { GameState, Objective } from '../core/state';
import { fmtMoney } from '../utils/money';

export const EXPANSION_COPY = {
  title: 'Welcome to the league',
  admitted: (club: string): string => `The league has admitted ${club}. You are the club's first coach.`,
  bank: (money: number): string => `There is ${fmtMoney(money)} in the bank. Keep enough aside for the weekly bills.`,
  objectives: (goals: readonly Objective[], address?: string): string => `${address ? `${address}, the` : 'The'} board's objectives for our first season in the league: ${goals.map((o) => o.text).join(' · ')}.`,
  work: "Let's get to work",
  skip: 'Skip intro',
  review: 'Our first season in the league is in the books.',
} as const;

export function expansionIntroLines(state: GameState, objectives: readonly Objective[]): string[] {
  return [EXPANSION_COPY.admitted(state.clubName), EXPANSION_COPY.bank(state.money), EXPANSION_COPY.objectives(objectives)];
}
