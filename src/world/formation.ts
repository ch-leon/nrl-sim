// src/world/formation.ts — anchored formation model for match playback.
//
// Every player owns a formation SLOT (a lane across the width + a depth behind
// or in front of the ball). For each event the two teams' targets are computed
// FRESH from those slots and the ball position — never from where sprites
// currently stand — so nothing can compound over hundreds of events. (The old
// model eased each dot 25% toward the ball every event; after a few hundred
// events all 26 converged on one x and the field collapsed into a vertical line.)
//
// Field coords follow the engine contract: fx 0..100 is ABSOLUTE length (home's
// own try-line at 0, home always attacks toward 100), fy 0..100 is the width.
// Pure + Phaser-free; unit-tested in tests/world/formation.test.ts.
import { noise2 } from '../art/pixel';

export type Side = 'home' | 'away';

export interface FieldPt {
  fx: number;
  fy: number;
}

/**
 * Shape the teams take:
 *  open      — attackers behind the ball, defence 10m upfield.
 *  break     — line broken: defenders chasing from behind the ball.
 *  kickoff   — kicking side on halfway, receivers deep (also half/full-time reset).
 *  goal-kick — kicker behind the ball, his team back, defenders in their in-goal.
 */
export type Phase = 'open' | 'break' | 'kickoff' | 'goal-kick';

interface Slot {
  role: string;
  /** Base lane across the field (fy). */
  lane: number;
  /** Metres behind the ball when attacking. */
  atk: number;
  /** Metres in front of the ball when defending (markers stand at the ruck). */
  def: number;
  /** How strongly the lane slides toward the ball's side (0..1). */
  pull: number;
}

export const SLOTS: readonly Slot[] = [
  { role: 'fullback', lane: 50, atk: 14, def: 26, pull: 0.45 },
  { role: 'winger', lane: 6, atk: 9, def: 12, pull: 0.12 },
  { role: 'winger', lane: 94, atk: 9, def: 12, pull: 0.12 },
  { role: 'centre', lane: 22, atk: 7, def: 10, pull: 0.22 },
  { role: 'centre', lane: 78, atk: 7, def: 10, pull: 0.22 },
  { role: 'five-eighth', lane: 38, atk: 5, def: 10, pull: 0.32 },
  { role: 'halfback', lane: 62, atk: 4, def: 10, pull: 0.32 },
  { role: 'hooker', lane: 50, atk: 1.5, def: 1.5, pull: 0.9 },
  { role: 'prop', lane: 44, atk: 3, def: 1.8, pull: 0.55 },
  { role: 'prop', lane: 56, atk: 3, def: 10, pull: 0.5 },
  { role: 'second-row', lane: 30, atk: 4, def: 10, pull: 0.38 },
  { role: 'second-row', lane: 70, atk: 4, def: 10, pull: 0.38 },
  { role: 'lock', lane: 50, atk: 3, def: 10, pull: 0.5 },
];

export const PLAYERS = SLOTS.length;
/** The goal kicker / kick-off taker. */
export const KICKER_SLOT = 6;
/** Dummy-half: first receiver at every play-the-ball. */
export const HOOKER_SLOT = 7;
export const FULLBACK_SLOT = 0;

/** Direction a side attacks along fx (home → 100, away → 0). */
export function attackDir(side: Side): 1 | -1 {
  return side === 'home' ? 1 : -1;
}

export function otherSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

// In-goal extends ~12.5 field units beyond each try-line.
const FX_MIN = -11;
const FX_MAX = 111;
const FY_MIN = 4;
const FY_MAX = 96;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Small deterministic per-slot wobble so lines aren't ruler-straight. */
function jitter(side: Side, slot: number, seed: number, axis: number): number {
  return noise2(slot + (side === 'home' ? 0 : 50), seed, 1000 + axis) - 0.5;
}

function laneToward(slot: Slot, by: number): number {
  return slot.lane + (by - 50) * slot.pull;
}

export interface FormationInput {
  /** Side in possession (attacking). For kickoff: the side kicking off. */
  attacking: Side;
  ball: FieldPt;
  phase: Phase;
  /** Per-event seed for jitter (e.g. the event index). */
  seed: number;
}

/**
 * Targets for all 26 players. Each side's array is indexed by slot. Pure: the
 * same input always yields the same output, and it never reads sprite state.
 */
export function formationTargets(input: FormationInput): Record<Side, FieldPt[]> {
  const { attacking, ball, phase, seed } = input;
  const defending = otherSide(attacking);
  const dir = attackDir(attacking);
  const bx = clamp(ball.fx, FX_MIN, FX_MAX);
  const by = clamp(ball.fy, FY_MIN, FY_MAX);
  const out: Record<Side, FieldPt[]> = { home: [], away: [] };

  const place = (side: Side, slot: number, fx: number, fy: number): void => {
    out[side][slot] = {
      fx: clamp(fx + jitter(side, slot, seed, 0) * 2.4, FX_MIN, FX_MAX),
      fy: clamp(fy + jitter(side, slot, seed, 1) * 3, FY_MIN, FY_MAX),
    };
  };

  if (phase === 'kickoff') {
    // Kicking side spread along their side of halfway; kicker at the ball.
    SLOTS.forEach((s, i) => {
      if (i === KICKER_SLOT) place(attacking, i, 50 - dir * 2, 50);
      else place(attacking, i, 50 - dir * (2 + (i % 3)), s.lane);
      // Receivers deep in their own half: forwards up, backs deep.
      const depth = i === FULLBACK_SLOT ? 38 : s.atk >= 7 ? 28 : 14 + (i % 3) * 2;
      place(defending, i, 50 + dir * depth, s.lane);
    });
    return out;
  }

  if (phase === 'goal-kick') {
    const goal = dir > 0 ? 100 : 0;
    SLOTS.forEach((s, i) => {
      if (i === KICKER_SLOT) place(attacking, i, bx - dir * 2, by);
      else place(attacking, i, bx - dir * (12 + (i % 4) * 2), 20 + s.lane * 0.6);
      // Defenders wait in their in-goal, under and around the posts.
      place(defending, i, goal + dir * (2 + (i % 3) * 2), 26 + s.lane * 0.48);
    });
    return out;
  }

  SLOTS.forEach((s, i) => {
    // Attack: behind the ball, shape sliding toward the ball side.
    const afx = bx - dir * s.atk;
    place(attacking, i, clamp(afx, FX_MIN, FX_MAX), laneToward(s, by));

    // Defence.
    const goalLine = dir > 0 ? 100 : 0;
    let dfx: number;
    let dfy = laneToward(s, by);
    if (phase === 'break') {
      // Beaten: line players chase from behind the ball; fullback is last line.
      dfx = i === FULLBACK_SLOT ? bx + dir * 9 : bx - dir * (2 + (i % 4) * 1.6);
    } else if (s.def < 5) {
      // Markers stand at the play-the-ball.
      dfx = bx + dir * s.def;
      dfy = by + (i === HOOKER_SLOT ? -3 : 3);
    } else {
      dfx = bx + dir * s.def;
    }
    // Defenders never retreat past their own in-goal; the line holds the try-line.
    const lineCap = i === FULLBACK_SLOT ? goalLine + dir * 5 : goalLine + dir * 1.5;
    dfx = dir > 0 ? Math.min(dfx, lineCap) : Math.max(dfx, lineCap);
    place(defending, i, dfx, dfy);
  });
  return out;
}

/** Index of the point nearest to `p` (optionally skipping some indices). */
export function nearestIndex(pts: readonly FieldPt[], p: FieldPt, skip: readonly number[] = []): number {
  let best = -1;
  let bestD = Infinity;
  pts.forEach((q, i) => {
    if (skip.includes(i)) return;
    const d = (q.fx - p.fx) ** 2 + ((q.fy - p.fy) * 0.7) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * Pick a ball runner for a run/break: one of the attackers closest to the ball
 * (never the dummy-half), varied deterministically by the event seed so hit-ups
 * rotate between players instead of one man carrying all game.
 */
export function pickRunner(attack: readonly FieldPt[], ball: FieldPt, seed: number): number {
  const order = attack
    .map((q, i) => ({ i, d: (q.fx - ball.fx) ** 2 + ((q.fy - ball.fy) * 0.7) ** 2 }))
    .filter((e) => e.i !== HOOKER_SLOT)
    .sort((a, b) => a.d - b.d);
  const pick = Math.floor(noise2(seed, 3, 777) * Math.min(4, order.length));
  return order[pick]?.i ?? 0;
}
