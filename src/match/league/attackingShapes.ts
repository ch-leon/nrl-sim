// Ordinary PTB structures (#649). Real movement targets, never decoy/receiver predictions.
import { FIELD_WIDTH } from '../core/field';
import { clamp, type Vec } from '../core/vec';
import { formationTarget, ROLES } from './roles';
import type { AttackPreset } from './presets';
import type { Side } from '../core/snapshot';

export type ShapeKind = 'spread' | 'pod' | 'edge';
export interface AttackingShape { kind: ShapeKind; side: Side; dir: 1 | -1; edge: 1 | -1; startedTick: number; linkSlot?: 4 | 5 }
/** Weights/multipliers and authored metres; exposed to the harness as shapes.*. */
export const SHAPES = {
  on: 1,
  weights: {
    grind: { spread: 2, pod: 5, edge: 1 }, balanced: { spread: 3, pod: 3, edge: 2 },
    expansive: { spread: 2, pod: 1, edge: 5 }, 'kick-chase': { spread: 4, pod: 3, edge: 1 }, 'all-out': { spread: 2, pod: 3, edge: 4 },
  } as Record<AttackPreset, Record<ShapeKind, number>>,
  earlyTackle: 2, earlyPod: 1.8, lateTackle: 3, lateEdge: 1.5,
  deepM: 60, deepPod: 1.4, redM: 25, redEdge: 1.3,
  marginM: 1.5, edgeRoomM: 18, setupReachM: 7, contactReachM: 12,
  pod: { propDepth: 3.5, propWidth: -3, rowDepth: 4.5, rowWidth: 4, linkDepth: 7, linkWidth: 2 },
  edge: { halfDepth: 4, halfWidth: 6, linkDepth: 5.5, linkWidth: 12, wingDepth: 7, wingWidth: 18 },
};
export function shapeWeights(preset: AttackPreset, tackle: number, toLine: number, y: number): Record<ShapeKind, number> {
  const w = { ...SHAPES.weights[preset] };
  if (tackle <= SHAPES.earlyTackle) w.pod *= SHAPES.earlyPod;
  if (tackle >= SHAPES.lateTackle) w.edge *= SHAPES.lateEdge;
  if (toLine >= SHAPES.deepM) w.pod *= SHAPES.deepPod;
  if (toLine <= SHAPES.redM) w.edge *= SHAPES.redEdge;
  // A far-side packet cannot cross the field during the short PTB.
  if (Math.min(y, FIELD_WIDTH - y) < SHAPES.edgeRoomM + SHAPES.marginM) w.edge = 0;
  return w;
}
export function shapeEdge(kind: ShapeKind, y: number, dir: 1 | -1, tackle: number): 1 | -1 {
  const near: 1 | -1 = y < FIELD_WIDTH / 2 ? -1 : y > FIELD_WIDTH / 2 ? 1 : tackle % 2 === 0 ? dir : dir === 1 ? -1 : 1;
  return kind === 'pod' ? (near === -1 ? 1 : -1) : near;
}
export const packetSlots = (kind: ShapeKind, edge: 1 | -1, linkSlot?: 4 | 5): readonly number[] => kind === 'pod' ? [7, 8, linkSlot ?? (edge > 0 ? 4 : 5)] : kind === 'edge' ? (edge < 0 ? [4, 3, 1] : [5, 8, 2]) : [];
export function chooseShape(preset: AttackPreset, tackle: number, toLine: number, y: number, roll: number, dir: 1 | -1 = 1, feasible: { pod: boolean; edge: boolean } = { pod: true, edge: true }): Pick<AttackingShape, 'kind' | 'edge'> {
  const weights = shapeWeights(preset, tackle, toLine, y), order: ShapeKind[] = ['spread', 'pod', 'edge'];
  if (!feasible.pod) weights.pod = 0;
  if (!feasible.edge) weights.edge = 0;
  let pick = roll * order.reduce((sum, k) => sum + Math.max(0, weights[k]), 0);
  let kind: ShapeKind = 'spread';
  for (const k of order) { pick -= Math.max(0, weights[k]); if (pick < 0) { kind = k; break; } }
  return { kind, edge: shapeEdge(kind, y, dir, tackle) };
}
/** Unassigned roles keep the existing fan. The edge packet keeps its own half/link/wing. */
export function shapeTarget(shape: AttackingShape, slot: number, ball: Vec): Vec {
  const spot = formationTarget(ROLES[slot]!, ball, shape.dir, true), { edge, dir } = shape;
  let depth: number, width: number;
  if (shape.kind === 'pod') {
    const p = SHAPES.pod;
    if (slot === 7) { depth = p.propDepth; width = p.propWidth; }
    else if (slot === 8) { depth = p.rowDepth; width = p.rowWidth; }
    else if (slot === (shape.linkSlot ?? (edge > 0 ? 4 : 5))) { depth = p.linkDepth; width = p.linkWidth; }
    else return spot;
  } else if (shape.kind === 'edge') {
    const p = SHAPES.edge;
    if (slot === (edge < 0 ? 4 : 5)) { depth = p.halfDepth; width = p.halfWidth; }
    else if (slot === (edge < 0 ? 3 : 8)) { depth = p.linkDepth; width = p.linkWidth; }
    else if (slot === (edge < 0 ? 1 : 2)) { depth = p.wingDepth; width = p.wingWidth; }
    else return spot;
  } else return spot;
  // Hold ordered lanes when the ball subsequently reaches the same touchline.
  const maxWidth = shape.kind === 'edge' ? SHAPES.edge.wingWidth : Math.max(Math.abs(SHAPES.pod.propWidth),SHAPES.pod.rowWidth);
  const y = shape.kind === 'pod' ? clamp(ball.y, SHAPES.marginM+maxWidth,FIELD_WIDTH-SHAPES.marginM-maxWidth)
    : edge > 0 ? Math.min(ball.y, FIELD_WIDTH - SHAPES.marginM - maxWidth) : Math.max(ball.y, SHAPES.marginM + maxWidth);
  return { x: ball.x - dir * depth, y: clamp(y + edge * width, SHAPES.marginM, FIELD_WIDTH - SHAPES.marginM) };
}
