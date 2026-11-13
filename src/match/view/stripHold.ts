// src/match/view/stripHold.ts — how long an important commentary line stays on the strip.
//
// The strip shows one line. A try call must not be replaced by "makes the tackle"
// before it is read, so a line that matters (commentary.ts: isImportantKey) is held
// for STRIP_HOLD_MS of real time. A routine line that comes in meanwhile never
// replaces it (and is not waited for: it is old news by then); an important one
// waits its turn, so a try and the line after it (a second try, a lead change) are
// each read. The full log is the overlay's own: it takes every line either way.
// Real time, because the point is what a person can read; the sim is never told.

/** How long an important line holds the strip, ms. A line of 56 characters reads in about this at a glance. */
export const STRIP_HOLD_MS = 1200;

/** Important lines waiting for the hold to end; the oldest goes if more pile up (a burst while Skip catches up). */
const QUEUE_MAX = 2;

export type CommentWeight = 'routine' | 'important' | 'now';

export class StripHold {
  private until = 0;
  private readonly queue: string[] = [];

  /** A line has come in: the line for the strip now, or null (held, queued or dropped). */
  offer(line: string, weight: CommentWeight, now: number): string | null {
    if (weight === 'now') {
      this.queue.length = 0;
      this.until = 0;
      return line;
    }
    if (now >= this.until && this.queue.length === 0) {
      if (weight === 'important') this.until = now + STRIP_HOLD_MS;
      return line;
    }
    if (weight === 'important') {
      this.queue.push(line);
      if (this.queue.length > QUEUE_MAX) this.queue.shift();
    }
    return null;
  }

  /** The held line's time is up: the next queued line for the strip (held in turn), or null. */
  release(now: number): string | null {
    if (now < this.until) return null;
    const next = this.queue.shift() ?? null;
    if (next !== null) this.until = now + STRIP_HOLD_MS;
    return next;
  }

  /** Real time the next release is due, or null when nothing waits. */
  nextAt(): number | null {
    return this.queue.length > 0 ? this.until : null;
  }
}
