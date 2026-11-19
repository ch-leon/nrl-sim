import { PROGRESSION } from '../config';
import type { Player, PlayerStats, TrainingFocus } from '../core/state';
import { shownStats } from '../data/player';
import { awardXp, spendByFocus, type LevelPointSpendMode } from './training';

import { CAMP_RULES } from '../data/playerAssignments';
export const CAMP_BASE_XP = CAMP_RULES.baseXp;

export interface CampAwardReceipt {
  effectiveXp: number;
  xpBefore: number;
  xpAfter: number;
  levelsGained: number;
  newPoints: number;
  bankedBefore: number;
  bankedAfter: number;
  pointsSpent: number;
  priorPointsSpent: number;
  statGains: Partial<PlayerStats>;
  mode: LevelPointSpendMode;
  focus: TrainingFocus | null;
}

interface CampAwardOptions {
  campFocus?: TrainingFocus;
  clubFocus: TrainingFocus;
  mode: LevelPointSpendMode;
}

/** The camp can focus on the player's shown stats with room for improvement. */
export function campTrainingFoci(player: Pick<Player, 'position' | 'stats' | 'ceilings'>): TrainingFocus[] {
  return ['balanced', ...shownStats(player.position).filter(stat =>
    player.stats[stat] < (player.ceilings[stat] ?? player.stats[stat]))];
}

/** Award a completed camp after the weekly decline, using the mode at return. */
type CampAthlete = Pick<Player,'age'|'traits'|'position'|'stats'|'ceilings'|'xp'|'level'|'unspentPoints'>;
export function applyCampAward<P extends CampAthlete>(player: P, { campFocus, clubFocus, mode }: CampAwardOptions):
  { player: P; receipt: CampAwardReceipt } {
  const awarded = awardXp(player, CAMP_BASE_XP, []);
  const focus = mode === 'auto' ? (campFocus ?? clubFocus) : null;
  const returned = focus === null ? awarded : spendByFocus(awarded, focus);
  const xpBefore = player.xp ?? 0;
  const xpAfter = awarded.xp ?? 0;
  const levelsGained = (awarded.level ?? 1) - (player.level ?? 1);
  const bankedBefore = player.unspentPoints ?? 0;
  const bankedAtAward = awarded.unspentPoints ?? 0;
  const bankedAfter = returned.unspentPoints ?? 0;
  const pointsSpent = bankedAtAward - bankedAfter;
  const statGains: Partial<PlayerStats> = {};
  for (const stat of shownStats(player.position)) {
    const gain = returned.stats[stat] - player.stats[stat];
    if (gain > 0) statGains[stat] = gain;
  }

  return {
    player: returned,
    receipt: {
      effectiveXp: levelsGained * PROGRESSION.XP_PER_LEVEL + xpAfter - xpBefore,
      xpBefore,
      xpAfter,
      levelsGained,
      newPoints: bankedAtAward - bankedBefore,
      bankedBefore,
      bankedAfter,
      pointsSpent,
      // Points share a bank. Attribute spending to the previous balance first.
      priorPointsSpent: Math.min(bankedBefore, pointsSpent),
      statGains,
      mode,
      focus,
    },
  };
}
