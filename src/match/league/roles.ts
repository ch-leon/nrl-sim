// src/match/league/roles.ts — the nine on-field roles and where each stands
// relative to the ball (BAK-207 §3.4). Lanes are metres across the 68 m field;
// depths are metres behind the ball in attack and in front of it in defence
// (the line stands 10 m back from the ruck). Supersedes world/formation's SLOTS
// for the live sim.
import { FIELD_WIDTH, FIELD_LENGTH, IN_GOAL, MID_Y } from '../core/field';
import { clamp, type Vec } from '../core/vec';
import type { Position } from '../../core/state';

export interface Role {
  name: Position;
  /** Base lane across the field, metres (0 = left touchline). */
  lane: number;
  /** Metres behind the ball when attacking. */
  atk: number;
  /** Metres in front of the ball when defending. */
  def: number;
  /** How strongly the lane slides toward the ball's side (0..1). */
  pull: number;
  /** Defensive pull when it differs (the hooker tracks the ball in attack, not in the line). */
  defPull?: number;
}

/**
 * Seven in the line spaced evenly across 68 m (the fullback sweeps behind, the
 * hooker lives at the ruck): a left edge (winger, centre), a left half, the
 * middle (prop), a right half, and a right edge (second-row, winger). Pull
 * grows toward the middle so the edges stay wide and the middles track the ball.
 */
export const ROLES: readonly Role[] = [
  { name: 'fullback', lane: 34, atk: 14, def: 26, pull: 0.45 },
  { name: 'winger', lane: 5, atk: 8, def: 11, pull: 0.1 },
  { name: 'winger', lane: 63, atk: 8, def: 11, pull: 0.1 },
  { name: 'centre', lane: 15, atk: 6, def: 10, pull: 0.2 },
  { name: 'five-eighth', lane: 25, atk: 5, def: 10, pull: 0.35 },
  { name: 'halfback', lane: 43, atk: 4, def: 10, pull: 0.35 },
  { name: 'hooker', lane: 38, atk: 1.5, def: 1.5, pull: 0.9, defPull: 0.4 },
  { name: 'prop', lane: 31, atk: 3, def: 2, pull: 0.5 },
  { name: 'second-row', lane: 53, atk: 4, def: 10, pull: 0.3 },
];

export const PLAYERS = ROLES.length;
export const FULLBACK = 0;
export const KICKER = 5;
export const HOOKER = 6;

/** Defensive line distance from the ruck. */
export const ONSIDE_M = 10;

/**
 * Where a role stands for a ball at `ball`, for a side attacking in `dir`
 * (+1 toward x = 100). Attackers sit behind the ball, defenders in front.
 */
export function formationTarget(role: Role, ball: Vec, dir: 1 | -1, attacking: boolean): Vec {
  const y = clamp(role.lane + (ball.y - MID_Y) * role.pull, 1.5, FIELD_WIDTH - 1.5);
  const x = attacking ? ball.x - dir * role.atk : ball.x + dir * role.def;
  return { x: clamp(x, -IN_GOAL + 1, FIELD_LENGTH + IN_GOAL - 1), y };
}
