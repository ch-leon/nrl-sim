// src/match/league/shapes.ts — attack shapes at the play-the-ball (#649 step 2,
// BAK-208 §4.2). Without a set play every set used to look alike: each role
// held its lane (roles.ts) and only the carrier and his two supports left it.
// Now, as a ruck forms, the side in possession picks a shape and its men run
// to that shape's spots: a forward pod off the ruck, an edge shift, a back-door
// ball, or the plain spread of the base lanes. The shape only says where the
// attackers stand, and so who the pass options are; the receiver (tactics.ts)
// still picks among them. Pure data and sums here; the one roll is the live
// sim's (live/play.ts), and the spots are steered to in live/positioning.ts.
import { FIELD_WIDTH } from '../core/field';
import { clamp, type Vec } from '../core/vec';
import type { AttackPreset, Zone } from './presets';

export type ShapeName = 'spread' | 'pod' | 'edge' | 'backDoor';
export const SHAPE_NAMES: readonly ShapeName[] = ['spread', 'pod', 'edge', 'backDoor'];

/** What the view may say of a shape (presentation only). */
export const SHAPE_LABEL: Readonly<Record<ShapeName, string>> = {
  spread: 'Spread',
  pod: 'Forward pod',
  edge: 'Edge shift',
  backDoor: 'Back door',
};

/**
 * Who a spot is for, with the shape played toward +y (the right edge as the
 * lanes are laid out in roles.ts); toward −y the near and far men swap. `prop`
 * and `backrow` are the two forwards whichever way it goes.
 */
export type ShapeMan = 'fullback' | 'prop' | 'backrow' | 'nearHalf' | 'farHalf' | 'nearEdge' | 'farEdge' | 'nearWing' | 'farWing';

const SLOT_RIGHT: Readonly<Record<ShapeMan, number>> = { fullback: 0, prop: 7, backrow: 8, nearHalf: 5, farHalf: 4, nearEdge: 8, farEdge: 3, nearWing: 2, farWing: 1 };
const SLOT_LEFT: Readonly<Record<ShapeMan, number>> = { fullback: 0, prop: 7, backrow: 8, nearHalf: 4, farHalf: 5, nearEdge: 3, farEdge: 8, nearWing: 1, farWing: 2 };

/** A man's spot: `dy` across from the ruck toward the shape's side (metres, or a share of the room to touch when the shape's `room` is 1), `depth` metres behind the ball. */
export interface ShapeSpot { dy: number; depth: number }

/**
 * The shape knobs (tuning reference §5). Overridable by name in balance
 * experiments (tuning.ts, group `shapes`): `shapes.on`, `shapes.weights.grind.pod`,
 * `shapes.zones.redZone.edge`, `shapes.spots.edge.nearWing.dy` and so on.
 */
export const SHAPES = {
  /** 1 = a side picks a shape at each play-the-ball (one roll); 0 = off: no roll, every man holds his lane, every seed as before. */
  on: 1,
  /** The shape holds this many ticks (20 Hz) after the ball is played, so the first receiver's outside men are still in it; then the base lanes. */
  holdTicks: 30,
  /** Inside this many metres of the line the `line` row replaces the red zone's. */
  lineM: 10,
  /** The edge shift goes to the short side this share of the time (the same roll), when the short side is at least `shortSideM` wide. */
  shortShare: 0.3,
  shortSideM: 20,
  /** How much a preset wants each shape (relative weights). */
  weights: {
    grind: { spread: 0.8, pod: 2.5, edge: 0.5, backDoor: 0.7 },
    balanced: { spread: 1, pod: 1, edge: 1, backDoor: 1 },
    expansive: { spread: 0.8, pod: 0.5, edge: 2, backDoor: 1.5 },
    'kick-chase': { spread: 1, pod: 1.2, edge: 0.8, backDoor: 0.8 },
    'all-out': { spread: 0.6, pod: 0.7, edge: 1.6, backDoor: 1.6 },
  } as Record<AttackPreset, Record<ShapeName, number>>,
  /** Field position, by the mark's zone: multipliers on the preset's weights. */
  zones: {
    own20: { spread: 1, pod: 1.6, edge: 0.5, backDoor: 0.6 },
    ownHalf: { spread: 1, pod: 1.2, edge: 0.8, backDoor: 0.8 },
    midfield: { spread: 1, pod: 1, edge: 1, backDoor: 1 },
    attackingHalf: { spread: 1, pod: 0.9, edge: 1.2, backDoor: 1.2 },
    redZone: { spread: 1, pod: 1.1, edge: 1.3, backDoor: 1.2 },
    /** Inside `lineM`: the drive and the shift; no room in front for the back door's depth to pay. */
    line: { spread: 1, pod: 2, edge: 1, backDoor: 0 },
  } as Record<Zone | 'line', Record<ShapeName, number>>,
  /** Tackle count at the ruck: multipliers. Early is the first two plays, late the second-last; the last tackle takes no shape (it is the kicker's). */
  tackles: {
    early: { spread: 1, pod: 1.5, edge: 0.7, backDoor: 0.8 },
    middle: { spread: 1, pod: 1, edge: 1, backDoor: 1 },
    late: { spread: 1, pod: 0.7, edge: 1.3, backDoor: 1.2 },
  },
  /**
   * The spots. A man a shape does not list holds his base lane. `room` 1: `dy`
   * is a share of the width from the ruck to that touchline (less 3 m), so the
   * edge shift fills the open side wherever the ruck is.
   */
  spots: {
    /**
     * Two forwards flat and close off the ruck: a hit-up shape. The halves stand
     * off it, wider than the dummy-half's pass (12 m) either side, for the next phase.
     */
    pod: { room: 0, prop: { dy: 3, depth: 3 }, backrow: { dy: 6.5, depth: 3.5 }, nearHalf: { dy: 14, depth: 6 }, farHalf: { dy: -14, depth: 6 } },
    /**
     * Everyone but the far winger stacked across one side: the far half, the far
     * edge man and the fullback swing over. The prop stands up flat beside the
     * ruck, level with the dummy-half: no pass option, so the ball goes to the
     * halves and out.
     */
    edge: {
      room: 1,
      prop: { dy: 0.04, depth: 1.5 },
      nearHalf: { dy: 0.12, depth: 4 },
      farHalf: { dy: 0.28, depth: 6 },
      farEdge: { dy: 0.45, depth: 6 },
      fullback: { dy: 0.6, depth: 9 },
      nearEdge: { dy: 0.78, depth: 6 },
      nearWing: { dy: 0.94, depth: 7 },
    },
    /** A lead runner flat at the line, the playmaker deeper behind him, a man outside and the fullback in the line. */
    backDoor: { room: 0, prop: { dy: 4, depth: 3 }, nearHalf: { dy: 6, depth: 8 }, nearEdge: { dy: 12, depth: 6 }, fullback: { dy: 10, depth: 11 } },
  } as Record<Exclude<ShapeName, 'spread'>, { room: number } & Partial<Record<ShapeMan, ShapeSpot>>>,
};

/** The shape a side is in: which, and toward which side of the ruck (+1 toward y = 68). */
export interface ShapeCall {
  side: 'home' | 'away';
  name: ShapeName;
  sign: 1 | -1;
  /** Its spots by slot (null: he holds his lane), and whether `dy` is a share of the room to touch: read off the table once, at the pick. */
  bySlot: readonly (ShapeSpot | null)[];
  room: boolean;
}

/** A shape call for `side`, its spots resolved by slot for the way it is played. */
export function shapeCall(side: 'home' | 'away', name: ShapeName, sign: 1 | -1): ShapeCall {
  const bySlot: (ShapeSpot | null)[] = [null, null, null, null, null, null, null, null, null];
  if (name === 'spread') return { side, name, sign, bySlot, room: false };
  const def = SHAPES.spots[name];
  const map = sign > 0 ? SLOT_RIGHT : SLOT_LEFT;
  for (const man of Object.keys(map) as ShapeMan[]) {
    const spot = def[man];
    if (spot && bySlot[map[man]] === null) bySlot[map[man]] = { dy: spot.dy, depth: spot.depth };
  }
  return { side, name, sign, bySlot, room: def.room > 0 };
}

export type TackleBucket = keyof typeof SHAPES.tackles;

/** The tackle bucket for a ruck after `made` tackles of a set of `set`; null on the last (no shape). */
export function tackleBucket(made: number, set: number): TackleBucket | null {
  if (made >= set - 1) return null;
  if (made <= 1) return 'early';
  return made >= set - 2 ? 'late' : 'middle';
}

/** Each shape's weight for a preset, a zone row and a tackle bucket. */
export function shapeWeights(preset: AttackPreset, zone: Zone | 'line', bucket: TackleBucket): Record<ShapeName, number> {
  const w = SHAPES.weights[preset];
  const z = SHAPES.zones[zone];
  const t = SHAPES.tackles[bucket];
  const out = {} as Record<ShapeName, number>;
  for (const n of SHAPE_NAMES) out[n] = Math.max(0, w[n] * z[n] * t[n]);
  return out;
}

/**
 * The shape for one roll in [0, 1): the weights' cumulative pick. The open side
 * is the wider one; the edge shift goes short when the roll falls in the last
 * `shortShare` of its band and the short side is `shortSideM` wide or more.
 */
export function pickShape(weights: Readonly<Record<ShapeName, number>>, roll: number, markY: number): { name: ShapeName; sign: 1 | -1 } {
  const open: 1 | -1 = markY <= FIELD_WIDTH / 2 ? 1 : -1;
  const total = SHAPE_NAMES.reduce((a, n) => a + weights[n], 0);
  if (total <= 0) return { name: 'spread', sign: open };
  let left = roll * total;
  for (const n of SHAPE_NAMES) {
    const w = weights[n];
    if (w <= 0) continue;
    if (left < w) {
      const shortRoom = open > 0 ? markY : FIELD_WIDTH - markY;
      const short = n === 'edge' && shortRoom >= SHAPES.shortSideM && left / w >= 1 - SHAPES.shortShare;
      return { name: n, sign: short ? (-open as 1 | -1) : open };
    }
    left -= w;
  }
  return { name: 'spread', sign: open };
}

/** The slot a shape man is, played toward `sign`. */
export const shapeSlot = (man: ShapeMan, sign: 1 | -1): number => (sign > 0 ? SLOT_RIGHT : SLOT_LEFT)[man];

/**
 * Where `slot` stands in the shape, off a ruck at `markY` with the ball at
 * `ballX` (the carrier's x once it is out), going `dir`: the spot and its depth,
 * or null when the shape leaves him in his lane.
 */
export function shapeSpot(call: ShapeCall, slot: number, markY: number, ballX: number, dir: 1 | -1): { pos: Vec; depth: number } | null {
  const s = call.bySlot[slot];
  if (!s) return null;
  const dy = call.room ? s.dy * Math.max(0, (call.sign > 0 ? FIELD_WIDTH - markY : markY) - 3) : s.dy;
  return { pos: { x: ballX - dir * s.depth, y: clamp(markY + call.sign * dy, 1.5, FIELD_WIDTH - 1.5) }, depth: s.depth };
}
