// src/match/view/stripHold.ts — how long an important commentary line stays on the strip.
//
// The strip shows one line. A try call must not be replaced by "makes the tackle"
// before it is read, so a line that matters (commentary.ts: isImportantKey) is held
// for STRIP_HOLD_MS of real time. A routine line that comes in meanwhile never
// replaces it (and is not waited for: it is old news by then); an important one
// waits its turn, so a try and the line after it (a second try, a lead change) are
// each read. A protected read and the duel that follows it wait as one entry,
// with a read's worth of time per line. The overlay logs every line either way.
// Real time, because the point is what a person can read; the sim is never told.

/** How long an important line holds the strip, ms. A line of 56 characters reads in about this at a glance. */
export const STRIP_HOLD_MS = 1200;

/** Important lines waiting for the hold to end; the oldest goes if more pile up (a burst while Skip catches up). */
const QUEUE_MAX = 2;

export type CommentWeight = 'routine' | 'important' | 'now';

export class StripHold {
  private until = 0;
  private readonly queue: string[][] = [];
  private following: string[] = [];

  /** A line has come in: the line for the strip now, or null (held, queued or dropped). */
  offer(line: string, weight: CommentWeight, now: number): string | null {
    if (weight === 'now') {
      this.queue.length = 0;
      this.following.length = 0;
      this.until = 0;
      return line;
    }
    if (weight === 'important') return this.offerRun([line], now);
    return now >= this.until && this.nextAt() === null ? line : null;
  }

  /** A read and the lines that explain it occupy one queue spot and are shown in order. */
  offerRun(lines: readonly string[], now: number): string | null {
    if (lines.length === 0) return null;
    const run = [...lines];
    if (now >= this.until && this.nextAt() === null) return this.start(run, now);
    this.queue.push(run);
    if (this.queue.length > QUEUE_MAX) this.queue.shift();
    return null;
  }

  /** The held line's time is up: show its follow-up first, or start the next run. */
  release(now: number): string | null {
    if (now < this.until) return null;
    return this.start(this.following.length ? this.following : this.queue.shift() ?? [], now);
  }

  /** Real time the next release is due, or null when nothing waits. */
  nextAt(): number | null {
    return this.following.length > 0 || this.queue.length > 0 ? this.until : null;
  }

  private start(run: string[], now: number): string | null {
    const next = run.shift() ?? null;
    if (next !== null) {
      this.following = run;
      this.until = now + STRIP_HOLD_MS;
    }
    return next;
  }
}
