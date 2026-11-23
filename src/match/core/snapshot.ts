// src/match/core/snapshot.ts — what the renderer draws: a plain-data picture of
// one tick (BAK-207 §3.1). The view keeps the last two and interpolates between
// them, so drawing never touches live sim state and frame rate can't change an
// outcome. `pose` is a sprite animation name owned by the sport layer.
export type Side = 'home' | 'away';

/** Exact contact participants, in arrival order. Nearby defenders are not joiners. */
export interface ContactPlayer { side: Side; slot: number; who: string }
export interface AttackShapeSnap {
  kind: 'spread' | 'pod' | 'edge' | 'back-door'; side: Side; dir: 1 | -1; edge: 1 | -1; startedTick: number; linkSlot?: 4 | 5;
  backDoor?: { caller: ContactPlayer; lead: ContactPlayer; support: ContactPlayer; originY: number };
}
export interface ContactSnap {
  startedTick: number;
  carrier: ContactPlayer;
  defenders: ContactPlayer[];
  /** Self-contained timing so seeking and fast playback do not lose a join or result. */
  joinedTicks?: number[];
  outcome?: 'tackle' | 'big-hit' | 'break-tackle' | 'strip' | 'offload';
  resolvedTick?: number;
  phaseTick?: number;
  releaseTick?: number;
  /** The flight that actually left this contact, including a lane intercept. */
  offload?: { to: BallFlightSnap['to']; arrivesTick: number };
}

/** A successful open-play step, timed to the jink or the beaten defender's lock. */
export type StepSnap = {
  startedTick: number;
  untilTick: number;
} & ({
  role: 'carrier';
  /** The carrier's across-field jink, in metres. */
  lateral: number;
} | {
  role: 'defender';
  /** Direction from the defender to the carrier before the jink, in field metres. */
  reachX: number;
  reachY: number;
});

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
  step?: StepSnap;
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
  /** Jogging toward the touchline on spent legs to be interchanged. */
  interchanging?: boolean;
}

/** Ticks a reaction stays on the snapshot (#667): the view holds it for less, once he is free to show it. */
export const REACT_SNAP_TICKS = 40;

/** Current engine flight, already launched. Receiver follows the actual flight, including interceptions. */
export interface BallFlightSnap {
  via: 'pass' | 'kick' | 'roll' | 'bounce';
  from: { x: number; y: number };
  to: { x: number; y: number };
  startedTick: number;
  arrivesTick: number;
  fromLift: number;
  receiver?: ContactPlayer;
  /** Written only for an actual pass launch, never used by match decisions. */
  source?: { player: ContactPlayer; headX: number; headY: number; speed: number; odometer: number; legs: number; blown: boolean };
}

export interface BallSnap {
  flight?: BallFlightSnap;
  x: number;
  y: number;
  /** Height above the ground, metres. */
  lift: number;
  /** Who holds it, if anyone. */
  holder: { side: Side; slot: number } | null;
}

/** Presentation timing around the tick an open-play bomb comes down (20 Hz). */
export const BOMB_PLANT_TICKS = 5;
export const BOMB_TAKEOFF_LEAD = 3;
export const BOMB_RECOVERY_TICKS = 6;

export interface BombContestSnap {
  at: { x: number; y: number };
  plantTick: number;
  arrivesTick: number;
  /** The chaser and catcher at the plant, with their feet on that step. */
  players: [ContactPlayer & { x: number; y: number }, ContactPlayer & { x: number; y: number }];
  /** One of the players left reach before the ball came down. */
  releasedTick?: number;
}

/** A player has taken a loose ball in open play. These positions only align the picture. */
export interface GroundPickupSnap {
  tick: number;
  at: { x: number; y: number };
  player: ContactPlayer;
  feet: { x: number; y: number };
}

/** A try's conversion at the end it attacks. The outcome appears only on the official decision tick. */
export interface ConversionSnap {
  readonly toward: 1 | -1;
  readonly spot: Readonly<{ x: number; y: number }>;
  readonly decision?: Readonly<{ tick: number; good: boolean }>;
}

/** Keep the cue through the last interpolation into the ordinary carry. */
export const GROUND_PICKUP_TICKS = 6;

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

/** The outgoing player's feet at the handoff, for the bench picture. */
export interface InterchangeExit {
  side: Side;
  who: string;
  from: { x: number; y: number };
  tick: number;
  tired: 0 | 1 | 2;
}

export const INTERCHANGE_EXIT_TICKS = 230;

export interface Snapshot {
  /** Recently replaced players taking their seats off the field. */
  interchangeExits?: InterchangeExit[];
  /** Actual structure prepared during contact (or a standalone PTB); renderers still use real positions. */
  attackShape?: AttackShapeSnap;
  /** The ordinary dummy-half's committed intended recipient, before release. Interceptions/spills can prevent the catch. */
  passCall?: { from: ContactPlayer; to: ContactPlayer; startedTick: number; releasesTick: number };
  tick: number;
  /** Side currently attacking, including passes/kicks in flight and loose balls. View context only. */
  attacking?: Side;
  players: PlayerSnap[];
  ball: BallSnap;
  /** Short visual reach and landing around a contested bomb. Possession comes from the ball. */
  bombContest?: BombContestSnap;
  groundPickup?: GroundPickupSnap;
  conversion?: ConversionSnap;
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
  /**
   * The phase of play and the tick it began (#675), so the view can time the whistle's pictures
   * (the walk-off, the huddle before golden point) against it; `golden` once golden point is on.
   * Presentation only: the sim never reads it back.
   */
  phase?: { kind: string; since: number; golden?: boolean };
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
