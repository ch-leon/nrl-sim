// src/match/balance/watch.ts — what makes a match worth watching, counted from
// the events the sim already emits (#648): lead changes and late margins from
// the scoring, how each try came about, and what the play on a last tackle was.
// Nothing here reads a random number or changes the sim: the harness only
// looks (events, plus the ball's x and who holds it, read off the sim). The
// attribution rules are written up in balance/README.md ("Watchability").
import type { Side, SimEvent } from '../core/snapshot';
import { PLAYS } from '../league/plays';

/** Per match: lead changes (a count), whether it was close with a minute to play, whether the last minute decided it, and the winner's biggest deficit. */
export const FLOW = ['leadChanges', 'closeLate', 'decidedLate', 'comeback'] as const;
export type FlowKey = (typeof FLOW)[number];

/** How a try came about, in the order the rules try them (first that fits wins; 'other' is the rest). */
export const ORIGINS = ['kick', 'setPlay', 'offload', 'break', 'drive', 'other'] as const;
export type OriginKey = (typeof ORIGINS)[number];

/** What the play on a set's last tackle was. */
export const LAST_TACKLES = ['kick', 'run', 'pass'] as const;
export type LastTackleKey = (typeof LAST_TACKLES)[number];

/** A try this soon after its side's kick came from it (12 s, as `kickTries`). */
const KICK_TRY_TICKS = 240;
/** The line break must carry the scorer this far (metres) to count as a break try. */
export const BREAK_TRY_M = 20;
/** A play-the-ball this close to the line (metres) makes the try a drive. */
export const DRIVE_M = 5;
/** The kicks a try can come from (a long kick is territory, not a try's origin). */
const ORIGIN_KICKS: ReadonlySet<string> = new Set(['bomb', 'grubber', 'chip', 'cross-field']);
/** Events after which the play (set play, offload, break, play-the-ball spot) is over; a kick survives them unless they are the kicker's own loss. */
const STOPPAGES: ReadonlySet<string> = new Set(['handover', 'intercept', 'strip', 'penalty', 'dead-ball', 'touch', 'on-full', 'drop-out', 'kickoff', 'half-time', 'full-time', 'conversion', 'field-goal', 'penalty-goal']);
/** Losing the ball: ends the kick link only when it is the kicking side that lost it. */
const SPILLS: ReadonlySet<string> = new Set(['error', 'drop', 'loose']);

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const zero = <K extends string>(keys: readonly K[]): Record<K, number> => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

/**
 * The score as the match goes: lead changes, the score a minute out, and the
 * winner's biggest deficit. `endS` is the match clock at full time (a stretch's
 * last second); a lead change is a side taking the lead from the side that
 * last held it (going level and then ahead again is not one).
 */
export class ScoreLine {
  readonly pts: Record<Side, number> = { home: 0, away: 0 };
  leadChanges = 0;
  private leader: Side | null = null;
  private readonly worst: Record<Side, number> = { home: 0, away: 0 };
  private late: Record<Side, number> | null = null;
  constructor(private readonly endS: number) {}

  /** A scoring event at match clock `matchS`. */
  note(matchS: number, side: Side, points: number): void {
    // Everything from the last minute on (a conversion taken after the siren, golden point) is "in the last minute".
    if (!this.late && matchS >= this.endS - 60) this.late = { ...this.pts };
    this.pts[side] += points;
    const lead = this.pts.home - this.pts.away;
    if (lead === 0) return;
    const ahead: Side = lead > 0 ? 'home' : 'away';
    if (this.leader !== null && this.leader !== ahead) this.leadChanges++;
    this.leader = ahead;
    const behind = other(ahead);
    this.worst[behind] = Math.max(this.worst[behind], Math.abs(lead));
  }

  /** The per-match numbers once the match is over. */
  result(): Record<FlowKey, number> {
    const late = this.late ?? this.pts;
    const diff = this.pts.home - this.pts.away;
    const winner: Side | null = diff > 0 ? 'home' : diff < 0 ? 'away' : null;
    return {
      leadChanges: this.leadChanges,
      closeLate: Math.abs(late.home - late.away) <= 6 ? 1 : 0,
      // Decided in the last minute: the winner was not in front a minute out.
      decidedLate: winner && (late[winner] <= late[other(winner)]) ? 1 : 0,
      comeback: winner ? this.worst[winner] : 0,
    };
  }
}

/** What the watcher reads off the sim each tick, after the step. */
export interface TickView {
  /** The phase kind ('play', 'tackle', 'ruck'…). */
  phase: string;
  /** The play now (or about to be) the one on the last tackle of the set. */
  lastPlay: boolean;
  /** Who is attacking. */
  attacking: Side;
  /** Index of the man holding the ball, -1 when it is loose or in the air. */
  holder: number;
  /** The ball's x, read only for the few events that need it. */
  x: () => number;
}

/** Try origins and last-tackle plays over one match. */
export class PlayWatch {
  readonly origins = zero(ORIGINS);
  readonly lastTackles = zero(LAST_TACKLES);
  private kick: { side: Side; tick: number } | null = null;
  private setPlay: { side: Side; tick: number } | null = null;
  private offload: Side | null = null;
  private broke: { side: Side; x: number } | null = null;
  /** Where the side with the ball was last tackled: the play-the-ball the try came off. */
  private contact: { side: Side; x: number } | null = null;
  private prevPhase = '';
  private last: { side: Side; kicked: boolean; holders: Set<number> } | null = null;

  /** One tick: its events (in order) and the view of the sim after it. */
  tick(es: readonly SimEvent[], view: TickView): void {
    if (view.phase === 'play' && this.prevPhase !== 'play' && view.lastPlay && !this.last) {
      this.last = { side: view.attacking, kicked: false, holders: new Set() };
    }
    for (const e of es) this.event(e, view);
    const w = this.last;
    if (w) {
      if (view.holder >= 0) w.holders.add(view.holder);
      if (w.kicked || view.phase !== 'play' || !view.lastPlay) {
        this.lastTackles[w.kicked ? 'kick' : w.holders.size >= 2 ? 'pass' : 'run']++;
        this.last = null;
      }
    }
    this.prevPhase = view.phase;
  }

  /** The match is over: a last-tackle play still open is counted as it stands. */
  finish(): void {
    const w = this.last;
    if (!w) return;
    this.lastTackles[w.kicked ? 'kick' : w.holders.size >= 2 ? 'pass' : 'run']++;
    this.last = null;
  }

  private endPlay(): void {
    this.setPlay = null;
    this.offload = null;
    this.broke = null;
    this.contact = null;
  }

  private event(e: SimEvent, view: TickView): void {
    const side = e.side;
    switch (e.kind) {
      case 'kick':
        if (this.last && side === this.last.side) this.last.kicked = true;
        this.endPlay();
        this.kick = side && e.detail && ORIGIN_KICKS.has(e.detail) ? { side, tick: e.tick } : null;
        break;
      case 'drop-goal':
        if (this.last && side === this.last.side) this.last.kicked = true;
        this.endPlay();
        this.kick = null;
        break;
      case 'tackle':
      case 'big-hit':
        // The carrier is the side that is not the tackler's.
        this.kick = null;
        this.setPlay = null;
        this.offload = null;
        this.broke = null;
        this.contact = side ? { side: other(side), x: view.x() } : null;
        break;
      case 'set-play':
        if (side) this.setPlay = { side, tick: e.tick };
        break;
      case 'play-breaks-down':
        this.setPlay = null;
        break;
      case 'offload':
        if (side) this.offload = side;
        break;
      case 'line-break':
        if (side) this.broke = { side, x: view.x() };
        break;
      case 'set-start':
      case 'regather':
        // The other side coming up with the ball ends the kick; the kicker's own regather does not.
        if (this.kick && side !== this.kick.side) this.kick = null;
        if (e.kind === 'set-start') this.endPlay();
        break;
      case 'try':
        if (side) this.origins[this.originOf(side, e.tick, view.x())]++;
        this.kick = null;
        this.endPlay();
        break;
      default:
        if (SPILLS.has(e.kind)) {
          if (this.kick && side === this.kick.side) this.kick = null;
          this.endPlay();
        } else if (STOPPAGES.has(e.kind)) {
          this.kick = null;
          this.endPlay();
        }
        break;
    }
  }

  /** The try's origin, by the first rule that fits (balance/README.md). */
  private originOf(side: Side, tick: number, x: number): OriginKey {
    if (this.kick && this.kick.side === side && tick - this.kick.tick <= KICK_TRY_TICKS) return 'kick';
    if (this.setPlay && this.setPlay.side === side && tick - this.setPlay.tick <= PLAYS.scriptTicks) return 'setPlay';
    if (this.offload === side) return 'offload';
    // Distances are along the pitch to the end the try was scored at.
    const dir = x > 50 ? 1 : -1;
    const endX = x > 50 ? 100 : 0;
    if (this.broke && this.broke.side === side && (x - this.broke.x) * dir >= BREAK_TRY_M) return 'break';
    if (this.contact && this.contact.side === side && Math.abs(endX - this.contact.x) <= DRIVE_M) return 'drive';
    return 'other';
  }
}
