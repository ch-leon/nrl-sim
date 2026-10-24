// src/match/view/replay.ts — instant replay of a try (N15.5).
// Eight seconds of the match, from the try's tick back, re-simulated from the
// seed. Nothing is stored: the record already has the seed and the ticks. The
// numbers here are the view's; the sim does not read them.
import { TICK_MS } from '../core/engine';
import type { Frame } from './kickLayer';

/** How much of the build-up a replay shows, and how long the button stays up. */
export const REPLAY_SECONDS = 8;
/** The Replay button offers for this long of real time, then goes. */
export const REPLAY_OFFER_MS = REPLAY_SECONDS * 1000;
/** Ticks in that window (the sim steps every 50 ms). */
export const REPLAY_TICKS = Math.round((REPLAY_SECONDS * 1000) / TICK_MS);
/** Wider than the match's zoom of 2: the same floor a kick's framing uses. */
export const REPLAY_ZOOM = 1;
/** The re-sim may block the main thread this long when no Worker is there. */
export const REPLAY_BLOCK_MS = 300;
/** A Worker that stays silent this long is given up; the re-sim runs here. */
export const REPLAY_WORKER_MS = 8000;

/** The tick a replay starts at: eight seconds before the try, never before kick-off. */
export function replayFrom(tryTick: number): number {
  return Math.max(0, Math.floor(tryTick) - REPLAY_TICKS);
}

/** Whether the Replay button is still on offer `ageMs` after the try. */
export function offerOpen(ageMs: number): boolean {
  return ageMs >= 0 && ageMs < REPLAY_OFFER_MS;
}

/**
 * The replay's camera: centred on the ball, at the wide zoom. The picture is
 * the whole eight seconds, not one kick, so it does not frame a landing.
 */
export function replayFrame(ball: { x: number; y: number }): Frame {
  return { cx: ball.x, cy: ball.y, zoom: REPLAY_ZOOM };
}
