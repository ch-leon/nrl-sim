// src/match/core/snapshot.ts — what the renderer draws: a plain-data picture of
// one tick (BAK-207 §3.1). The view keeps the last two and interpolates between
// them, so drawing never touches live sim state and frame rate can't change an
// outcome. `pose` is a sprite animation name owned by the sport layer.
export type Side = 'home' | 'away';

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
  /** Ground speed m/s (drives run-cycle rate). */
  speed: number;
  /** Sprint and gas (BAK-208 §8.2): going flat out this tick, ran his gas dry, gas left 0..1. */
  sprint?: boolean;
  blown?: boolean;
  gas?: number;
}

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
}

export interface WrestleSnap {
  side: Side;
  slot: number;
  fight: number;
  men: number;
}
