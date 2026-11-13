// src/match/core/snapshot.ts — what the renderer draws: a plain-data picture of
// one tick (BAK-207 §3.1). The view keeps the last two and interpolates between
// them, so drawing never touches live sim state and frame rate can't change an
// outcome. `pose` is a sprite animation name owned by the sport layer.
export type Side = 'home' | 'away';

/** Exact contact participants, in arrival order. Nearby defenders are not joiners. */
export interface ContactPlayer { side: Side; slot: number; who: string }
export interface ContactSnap {
  startedTick: number;
  carrier: ContactPlayer;
  defenders: ContactPlayer[];
  /** Self-contained timing so seeking and fast playback do not lose a join or result. */
  joinedTicks?: number[];
  outcome?: 'tackle' | 'big-hit' | 'break-tackle' | 'strip';
  resolvedTick?: number;
  phaseTick?: number;
  releaseTick?: number;
}

export interface PlayerSnap {
  side: Side;
  slot: number;
  /** Field metres (see field.ts). */
  x: number;
  y: number;
  /** Animation to show (the view maps it onto its sprite set). */
  pose: string;
  /** Unit heading x component: faces screen-left or -right from this. */
  headX: number;
  headY?: number;
  /** Ground speed m/s. */
  speed: number;
  /** Metres run so far (#630): the view takes the stride from it, so feet advance with distance. Presentation only; the sim never reads it back. */
  odometer?: number;
  /** Who is in this slot (squad id or name), when the sim can swap players: the look he wears. */
  who?: string;
  poseUntil?: number;
  caughtTick?: number;
  /** Presentation facts only; deadlines and outcomes still belong to the sim. */
  kick?: { startedTick: number; strikeTick: number; untilTick: number; kind: 'punt' | 'grubber' | 'drop' };
  /**
   * A shot at goal (#669), on the kicker from the tick he is on his spot (`readyTick`) to the end of the
   * conversion: the tick the boot meets the ball (the kick's `startedTick` and `strikeTick`) and the way
   * the posts are along the field (+1 toward x = 100). The view plays his routine between the two. Presentation only.
   */
  goalKick?: { readyTick: number; strikeTick: number; toward: 1 | -1 };
  aerialCatchTick?: number;
  tryTick?: number;
  celebrationTick?: number;
  /** His error (knock-on, spill, stripped), missed goal or sin bin, for a short reaction (#667): reported for REACT_SNAP_TICKS after it. Presentation only. */
  reactTick?: number;
  react?: 'error' | 'miss' | 'bin';
  /** Sprint and gas (BAK-208 §8.2): going flat out this tick, ran his gas dry, gas left 0..1. */
  sprint?: boolean;
  blown?: boolean;
  gas?: number;
  /** Legs left 0..1 (BAK-208 §8): the whole-match fatigue the gas bar sits on top of. */
  legs?: number;
  /** In the sin bin (#71): standing on the touchline, out of the play. */
  binned?: boolean;
}

/** Ticks a reaction stays on the snapshot (#667): the view holds it for less, once he is free to show it. */
export const REACT_SNAP_TICKS = 40;

export interface BallSnap {
  x: number;
  y: number;
  /** Height above the ground, metres. */
  lift: number;
  /** Who holds it, if anyone. */
  holder: { side: Side; slot: number } | null;
}

/** Something that happened on this tick, for the lab log / commentary. */
export interface SimEvent {
  tick: number;
  kind: string;
  /** Commentary line. */
  text: string;
  /** The player the event is about (the tackler for a tackle, the carrier for a bust). */
  side?: Side;
  slot?: number;
  player?: string;
  /** A special skill that made the difference, named for the pop-up ("Dancing Feet II"). */
  trait?: string;
  /** Flavour of the kind (a kick's type: long, bomb, grubber, chip, cross-field). */
  detail?: string;
  /** The receiver's slot, when a cut-out names the man it was thrown to (N15.4). The view draws the line; the sim does not read it. */
  toSlot?: number;
  /** Read-only animation context for this contact outcome. */
  contact?: ContactSnap;
}

export interface Snapshot {
  tick: number;
  players: PlayerSnap[];
  ball: BallSnap;
  /** Short state label for the lab readout (phase, set, tackle count...). */
  label: string;
  /** Events emitted on this tick. */
  events: SimEvent[];
  /** A wrestle in progress (BAK-208 §8.1): the carrier, the fight left in him (1 → 0) and how many men are on him. */
  wrestle?: WrestleSnap;
  /** Participants in the current contact, including their persistent appearances. */
  contact?: ContactSnap;
  /** The match clock, when the sim keeps one. */
  clock?: ClockSnap;
  /** Points, when the sim keeps score. */
  score?: Record<Side, number>;
}

export interface ClockSnap {
  half: number;
  /** Seconds gone in this half. */
  seconds: number;
  /** Match minute from the kick-off (the second half carries on from the first). */
  minute: number;
  /** Time is up: play on until the ball is dead. */
  siren: boolean;
  /** The match is over. */
  finished: boolean;
}

export interface WrestleSnap {
  side: Side;
  slot: number;
  fight: number;
  men: number;
}
