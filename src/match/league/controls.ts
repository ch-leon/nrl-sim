// Labs: match controls (Leon, 30 Oct). Timed, serialisable player decisions.
import type { Side } from '../core/snapshot';
import type { Vec } from '../core/vec';
import { clamp } from '../core/vec';
import { pickReceiver, type Candidate } from './tactics';

export type ControlKind = 'pass-left' | 'pass-right' | 'step-up' | 'step-down' | 'kick';
export interface ControlInput { tick: number; side: Side; kind: ControlKind; aim?: Vec }
export const CONTROL_KINDS: readonly string[] = ['pass-left', 'pass-right', 'step-up', 'step-down', 'kick'];
export function isControlInput(x: unknown): x is ControlInput {
  if (!x || typeof x !== 'object') return false;
  const c = x as Partial<ControlInput>;
  return Number.isInteger(c.tick) && c.tick! >= 0 && (c.side === 'home' || c.side === 'away')
    && CONTROL_KINDS.includes(c.kind ?? '')
    && (c.aim === undefined || !!c.aim && Number.isFinite(c.aim.x) && Number.isFinite(c.aim.y));
}
export function roundedAim(aim: Vec): Vec { return { x: Math.round(aim.x * 10) / 10, y: Math.round(aim.y * 10) / 10 }; }
/** Intent directions here are pitch lateral axes; the view converts screen gestures. */
export function controlReceiver(at: Vec, dir: 1 | -1, candidates: readonly Candidate[], kind: ControlKind): number | null {
  const sign = kind === 'pass-left' ? -1 : 1;
  return pickReceiver(at, dir, candidates.filter((c) => (c.pos.y - at.y) * sign > 0));
}
export function controlKickBand(length: number, chipFrom: number, bombFrom: number): 'grubber' | 'chip' | 'bomb' {
  return length < chipFrom ? 'grubber' : length < bombFrom ? 'chip' : 'bomb';
}
/** Nudge within the normal target envelope, including its ground clamps. */
export function controlAim(target: Vec, aim: Vec | undefined, low: Vec, high: Vec): Vec {
  if (!aim) return target;
  return {
    x: clamp(target.x + (aim.x - target.x) * 0.5, Math.min(low.x, high.x), Math.max(low.x, high.x)),
    y: clamp(target.y + (aim.y - target.y) * 0.5, Math.min(low.y, high.y), Math.max(low.y, high.y)),
  };
}
