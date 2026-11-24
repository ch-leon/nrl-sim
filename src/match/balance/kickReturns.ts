import type { Side, SimEvent } from '../core/snapshot';
import { PLAYERS } from '../league/roles';
import type { Stat } from './measure';
import type { TickView } from './watch';

const END_RETURN = new Set([
  'tackle', 'big-hit', 'try', 'held-up', 'kick', 'drop-goal', 'drop', 'loose', 'error', 'strip', 'intercept',
  'penalty', 'touch', 'on-full', 'dead-ball', 'handover', 'set-start', 'regather', 'kickoff', 'drop-out',
  'half-time', 'full-time',
]);

type KickKind = 'long' | 'bomb';
type ReturnTotals = { count: number; metres: number };
type MatchReturns = Record<KickKind, ReturnTotals>;
export type KickReturnStats = Record<KickKind, { count: number; metres: Stat }>;

/** Net field position from a direct catch to the end of the receiving team's first play. */
export class KickReturns {
  private readonly totals: MatchReturns = { long: { count: 0, metres: 0 }, bomb: { count: 0, metres: 0 } };
  private pending: { kind: KickKind; kicker: Side } | null = null;
  private active: { kind: KickKind; side: Side; from: number; last: number; dir: number } | null = null;

  tick(events: readonly SimEvent[], view: TickView, aimedKick: boolean, directCatch: boolean, dir: () => number): void {
    const active = this.active;
    if (active && view.holder >= 0 && (view.holder < PLAYERS ? 'home' : 'away') === active.side) active.last = view.x();
    for (const e of events) {
      if (END_RETURN.has(e.kind)) this.finish();
      if (e.kind === 'kick' && e.side && (e.detail === 'long' || e.detail === 'bomb') && !aimedKick) {
        this.pending = { kind: e.detail, kicker: e.side };
      } else if (e.kind === 'set-start') {
        if (this.pending && e.detail === 'caught' && directCatch && e.side && e.side !== this.pending.kicker) {
          const x = view.x();
          this.active = { kind: this.pending.kind, side: e.side, from: x, last: x, dir: dir() };
        }
        this.pending = null;
      } else if (END_RETURN.has(e.kind)) {
        this.pending = null;
      }
    }
  }

  private finish(): void {
    if (!this.active) return;
    const { kind, from, last, dir } = this.active;
    this.totals[kind].count++;
    this.totals[kind].metres += (last - from) * dir;
    this.active = null;
  }

  result(): MatchReturns {
    this.finish();
    return this.totals;
  }
}

/** Pool catches, with the standard error of the ratio estimated over matches. */
export function kickReturnStats(matches: MatchReturns[]): KickReturnStats {
  const summarize = (kind: KickKind): KickReturnStats[KickKind] => {
    const count = matches.reduce((a, m) => a + m[kind].count, 0);
    const sum = matches.reduce((a, m) => a + m[kind].metres, 0);
    const mean = count > 0 ? sum / count : 0;
    const residuals = matches.reduce((a, m) => a + (m[kind].metres - mean * m[kind].count) ** 2, 0);
    const se = count > 0 && matches.length > 1 ? Math.sqrt(residuals * matches.length / (matches.length - 1)) / count : 0;
    return { count, metres: { mean, se } };
  };
  return { long: summarize('long'), bomb: summarize('bomb') };
}
