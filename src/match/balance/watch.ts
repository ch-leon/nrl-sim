// src/match/balance/watch.ts — what makes a match worth watching, counted from
// the events the sim already emits (#648): lead changes and late margins from
// the scoring, how each try came about, and what the play on a last tackle was.
// Nothing here reads a random number or changes the sim: the harness only
// looks (events, plus the ball's x and who holds it, read off the sim). The
// attribution rules are written up in balance/README.md ("Watchability").
import type { Side, SimEvent } from '../core/snapshot';
import { PLAYS } from '../league/plays';
import { PLAYERS } from '../league/roles';

/** Per match: lead changes (a count), whether it was close with a minute to play, whether the last minute decided it, and the winner's biggest deficit. */
export const FLOW = ['leadChanges', 'closeLate', 'decidedLate', 'comeback'] as const;
export type FlowKey = (typeof FLOW)[number];

/** How a try came about, in the order the rules try them (first that fits wins; 'other' is the rest). */
export const ORIGINS = ['kick', 'setPlay', 'offload', 'break', 'drive', 'other'] as const;
export type OriginKey = (typeof ORIGINS)[number];

/** What the play on a set's last tackle was. */
export const LAST_TACKLES = ['kick', 'run', 'pass'] as const;
export type LastTackleKey = (typeof LAST_TACKLES)[number];

/** Who took the dummy-half's ball (#649): how often the same man took it on the same tackle of the set (%), and how many slots took it (a side's mean). */
export const RECEIVERS = ['sameMan', 'slots'] as const;
export type ReceiverKey = (typeof RECEIVERS)[number];

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

/**
 * The first receiver at each play-the-ball (#649): the first man of the
 * attacking side, other than the one who had it at the ruck, to hold the ball
 * in the play that follows. A dart, a tackle or a turnover before anyone else
 * holds it counts nobody. Slots come off the holder's index (home 0..8, away
 * after), so nothing here needs more of the sim than `TickView` gives.
 */
export class FirstReceivers {
  /** Per side, per tackle count at the ruck: how many times each slot took it. */
  private readonly seen: Record<Side, Map<number, Map<number, number>>> = { home: new Map(), away: new Map() };
  private ruck: { side: Side; holder: number; tackle: number } | null = null;

  /** One tick, after the step: the view, and the tackle count the set is on. */
  tick(view: TickView, tackle: number): void {
    if (view.phase === 'ruck') {
      if (view.holder >= 0 && sideOf(view.holder) === view.attacking) this.ruck = { side: view.attacking, holder: view.holder, tackle };
      return;
    }
    const r = this.ruck;
    if (!r) return;
    if (view.phase !== 'play') {
      this.ruck = null;
      return;
    }
    if (view.holder < 0 || view.holder === r.holder) return;
    if (sideOf(view.holder) === r.side) {
      const byTackle = this.seen[r.side];
      const slots = byTackle.get(r.tackle) ?? new Map<number, number>();
      const slot = view.holder % PLAYERS;
      slots.set(slot, (slots.get(slot) ?? 0) + 1);
      byTackle.set(r.tackle, slots);
    }
    this.ruck = null;
  }

  /**
   * The match's numbers. `sameMan`: the chance that two first passes on the
   * same tackle of a set (same side, this match) found the same slot, as a
   * percentage: Σ n(n−1) over slots / Σ N(N−1) over tackles, which small
   * samples do not inflate the way "the most-used man's share" would (0 with
   * no pair to compare). `slots`: how many slots took one, a side's mean.
   */
  result(): Record<ReceiverKey, number> {
    let same = 0;
    let pairs = 0;
    let slots = 0;
    for (const side of ['home', 'away'] as const) {
      const used = new Set<number>();
      for (const bySlot of this.seen[side].values()) {
        let all = 0;
        for (const [slot, n] of bySlot) {
          used.add(slot);
          same += n * (n - 1);
          all += n;
        }
        pairs += all * (all - 1);
      }
      slots += used.size;
    }
    return { sameMan: pairs > 0 ? (100 * same) / pairs : 0, slots: slots / 2 };
  }
}

const sideOf = (holder: number): Side => (holder < PLAYERS ? 'home' : 'away');

/** Attack shapes formed as the ball leaves the ruck (#649 step 2): per shape, the shaped play-the-balls, the ones formed, and the summed mean distance short. */
export const SHAPES_FORMED = ['podN', 'podFormed', 'podShort', 'edgeN', 'edgeFormed', 'edgeShort', 'backDoorN', 'backDoorFormed', 'backDoorShort'] as const;
export type ShapeFormedKey = (typeof SHAPES_FORMED)[number];
/** A man this close to his spot (metres) is in the shape; a shape is formed when every man it places is. */
export const SHAPE_FORMED_M = 2;

/**
 * Whether the attack shape was formed as the ball left the ruck (#649 step 2). The
 * sim notes, at each shaped ball-out, how far each man the shape places was from his
 * spot (`shapeBallOut`, a view channel); this counts them per shape: formed when every
 * one is within SHAPE_FORMED_M, and the mean distance short.
 */
export class ShapesFormed {
  private readonly n: Record<ShapeFormedKey, number> = Object.fromEntries(SHAPES_FORMED.map((k) => [k, 0])) as Record<ShapeFormedKey, number>;
  private last = -1;

  /** One tick, after the step: the sim's latest shaped ball-out (or null). */
  tick(out: { tick: number; name: string; shorts: readonly number[] } | null): void {
    if (!out || out.tick === this.last || out.name === 'spread') return;
    this.last = out.tick;
    const k = out.name as 'pod' | 'edge' | 'backDoor';
    this.n[`${k}N`]++;
    if (out.shorts.every((d) => d <= SHAPE_FORMED_M)) this.n[`${k}Formed`]++;
    this.n[`${k}Short`] += out.shorts.reduce((a, d) => a + d, 0) / out.shorts.length;
  }

  result(): Record<ShapeFormedKey, number> {
    return { ...this.n };
  }
}
