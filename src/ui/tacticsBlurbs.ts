// src/ui/tacticsBlurbs.ts — one line on what each preset does (N11), from
// BAK-208 §5's tables in plain words, for the Lineup screen's tactic chips and
// the Guide. Data only: the numbers live in match/league/presets.ts.
import { planWhenBehind } from '../match/league/breaks';
import { PRESET_LABEL, type AttackPreset, type DefencePreset, type TeamTactics } from '../match/league/presets';

export const TACTIC_BLURB: Readonly<Record<AttackPreset | DefencePreset, string>> = {
  grind: 'Forwards take it up, few passes, no offloads; kick for territory from deep.',
  balanced: 'A bit of everything: the halves first, the forwards early in the set.',
  expansive: 'More passes and offloads, out to the edges and the cut-out ball.',
  'kick-chase': 'Kick early and often: bombs and grubbers to chase, fewer offloads.',
  'all-out': 'Throw it around: the most offloads and width, chips and cross-field kicks.',
  slide: 'A steady line that slides across with the ball.',
  rush: 'Up fast for big hits, but more line busts conceded and more offside calls.',
  compressed: 'Narrow and patient: fewer busts and offloads, the edges left open.',
};

/** Three letters for a preset, for the ladder's style tag (N11). */
export const TACTIC_SHORT: Readonly<Record<AttackPreset | DefencePreset, string>> = {
  grind: 'GRD',
  balanced: 'BAL',
  expansive: 'EXP',
  'kick-chase': 'KCK',
  'all-out': 'ALL',
  slide: 'SLD',
  rush: 'RSH',
  compressed: 'CMP',
};

/** "Expansive · Rush": how a side plays, in words. */
export function styleLine(t: TeamTactics): string {
  return `${PRESET_LABEL[t.attack]} · ${PRESET_LABEL[t.defence]}`;
}

/**
 * What the Analyst adds: the plan a side steps to when it goes more open.
 * Null when that step would not change the plan (already All-out and Rush).
 */
export function whenBehindLine(plan: TeamTactics): string | null {
  const next = planWhenBehind(plan);
  if (next.attack === plan.attack && next.defence === plan.defence) return null;
  return styleLine(next);
}
