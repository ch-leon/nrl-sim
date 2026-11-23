import { clamp } from '../core/vec';

/** A fullback's last-ditch low cover tackle (#652, BAK-208 §8.1). */
export const CORNER_COVER = {
  on: 1,
  readFromM: 28,
  fromM: 10,
  touchM: 15,
  reachM: 2.7,
  frontCos: 0.8,
  base: 0.53,
  perMs: 0.055,
  reachCost: 0.2,
};

/** Pace helps the fullback finish the dive, and the end of his reach is a stretch. */
export function cornerCoverChance(distance: number, coverSpeed: number, carrySpeed: number): number {
  return clamp(CORNER_COVER.base + (coverSpeed - carrySpeed) * CORNER_COVER.perMs
    - CORNER_COVER.reachCost * distance / CORNER_COVER.reachM, 0, 1);
}
