// src/match/view/momentum.ts — the momentum line in the score bug (#366). The
// engine already keeps momentum (MatchRecorder, match.ts): a try or a big hit
// toward the side that made it, an error against it, 10% back toward even at
// every new set. The overlay folds the events it has seen by the same rules
// (sim/weather.ts) and draws the last few match-minutes as a sparkline. View
// only: no sim internals, no new events. Pure, so it is unit-tested.
import type { MatchEvent } from '../../sim/events';
import { applyMomentumEvent, decayMomentum, MOMENTUM_MAX, MOMENTUM_MIN } from '../../sim/weather';

/** How far back the line looks, in match-minutes (a Nines match is 14). */
export const MOMENTUM_WINDOW_MIN = 5;
/** One reading every this many match-minutes (10 s): 31 across the window. */
export const MOMENTUM_STEP_MIN = 1 / 6;

/** An event the overlay has seen, at the match-minute it saw it (finer than the event's whole minute when the live clock is running). */
export interface MomentumEvent {
  at: number;
  kind: MatchEvent['kind'];
  teamId: string;
}

/** A reading: match-minute and momentum, −100 (away) … +100 (home). */
export interface MomentumSample {
  t: number;
  value: number;
}

/** One event folded in, as MatchRecorder.add does: try / big hit / error move it, a new set decays it. */
export function foldMomentum(m: number, kind: MatchEvent['kind'], actorIsHome: boolean): number {
  if (kind === 'try' || kind === 'big-hit' || kind === 'error') return applyMomentumEvent(m, kind, actorIsHome);
  if (kind === 'set-start') return decayMomentum(m);
  return m;
}

/**
 * The last `windowMin` match-minutes up to `now`, a reading every
 * MOMENTUM_STEP_MIN, oldest first: each the momentum after every event seen by
 * then. Before kick-off it is even. `events` are in the order seen.
 */
export function momentumWindow(events: readonly MomentumEvent[], homeId: string, now: number, windowMin = MOMENTUM_WINDOW_MIN): MomentumSample[] {
  const steps = Math.max(1, Math.round(windowMin / MOMENTUM_STEP_MIN));
  const from = now - windowMin;
  const out: MomentumSample[] = [];
  let m = 0;
  let i = 0;
  for (let k = 0; k <= steps; k++) {
    const t = k === steps ? now : from + k * MOMENTUM_STEP_MIN;
    while (i < events.length && events[i]!.at <= t) {
      const ev = events[i++]!;
      m = foldMomentum(m, ev.kind, ev.teamId === homeId);
    }
    out.push({ t, value: Math.max(MOMENTUM_MIN, Math.min(MOMENTUM_MAX, m)) });
  }
  return out;
}

/** Below this either way it reads as even. */
const EVEN_BELOW = 8;
/** A change across the window smaller than this is holding, not building or fading. */
const TREND_MIN = 5;

/** The line's label for a screen reader: "Momentum: Larrikins, building", "Momentum: even". */
export function momentumLabel(samples: readonly MomentumSample[], names: { home: string; away: string }): string {
  const last = samples[samples.length - 1]?.value ?? 0;
  if (Math.abs(last) < EVEN_BELOW) return 'Momentum: even';
  const first = samples[0]?.value ?? 0;
  const side = last > 0 ? names.home : names.away;
  // Toward the side that has it: more of it is building.
  const swing = (last - first) * Math.sign(last);
  const trend = swing >= TREND_MIN ? 'building' : swing <= -TREND_MIN ? 'fading' : 'holding';
  return `Momentum: ${side}, ${trend}`;
}

/** Momentum that fills the line's half-height: a try's worth or two is most of a match, and a few px show ±100 as a sliver. */
export const MOMENTUM_DRAW_FULL = 50;

/** The sparkline's two filled shapes, in a `width` × `height` box with even across the middle: home's above, away's below (SVG points). */
export function momentumShapes(samples: readonly MomentumSample[], width: number, height: number): { home: string; away: string } {
  const mid = height / 2;
  const n = samples.length;
  const x = (k: number): number => (n <= 1 ? width : (k / (n - 1)) * width);
  const y = (v: number): number => mid - (Math.max(-1, Math.min(1, v / MOMENTUM_DRAW_FULL))) * mid;
  const shape = (pick: (v: number) => number): string => {
    const pts = samples.map((s, k) => `${round(x(k))},${round(y(pick(s.value)))}`);
    return [`0,${round(mid)}`, ...pts, `${round(width)},${round(mid)}`].join(' ');
  };
  return { home: shape((v) => Math.max(0, v)), away: shape((v) => Math.min(0, v)) };
}

const round = (n: number): number => Math.round(n * 10) / 10;
