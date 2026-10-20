// src/ui/tacticsBlurbs.ts — one line on what each preset does (N11), from
// BAK-208 §5's tables in plain words, for the Lineup screen's tactic chips and
// the Guide. Data only: the numbers live in match/league/presets.ts.
import type { AttackPreset, DefencePreset } from '../match/league/presets';

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
