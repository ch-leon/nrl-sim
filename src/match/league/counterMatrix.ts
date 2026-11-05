// Approved attack/defence directions shared by rival choices and presentation.
import type { AttackPreset, DefencePreset } from './presets';

export const COUNTER_MATRIX: Readonly<Record<AttackPreset, Readonly<Record<DefencePreset, number>>>> = {
  grind: { slide: 1, rush: 0, compressed: -1 }, balanced: { slide: 0, rush: 0, compressed: 0 },
  expansive: { slide: -1, rush: 0, compressed: 1 }, 'kick-chase': { slide: -1, rush: 1, compressed: 0 },
  'all-out': { slide: 1, rush: -1, compressed: 0 },
};
