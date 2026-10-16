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
  text: string;
  side?: Side;
  slot?: number;
}

export interface Snapshot {
  tick: number;
  players: PlayerSnap[];
  ball: BallSnap;
  /** Short state label for the lab readout (phase, set, tackle count...). */
  label: string;
  /** Events emitted on this tick. */
  events: SimEvent[];
}
