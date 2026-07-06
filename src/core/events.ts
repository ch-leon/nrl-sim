// src/core/events.ts — tiny typed event bus. See ARCHITECTURE §5. No Phaser.
// Systems publish; scenes/UI subscribe. This is the only cross-system channel.

import type {
  GameState, PlacedFacility, Player, Fixture,
} from './state';

// MatchResult / MatchEvent live in src/sim (WU-6), which is not yet built.
// Declare the event payloads as `unknown` placeholders so this module compiles
// standalone; tighten once the sim types land.
// TODO(WU-6): tighten once sim types land
type MatchResult = unknown;
// TODO(WU-6): tighten once sim types land
type MatchEvent = unknown;

/** Event name -> payload type map (verbatim from ARCHITECTURE §5). */
export interface Events {
  'state:changed': GameState;
  'week:advanced': { week: number; season: number };
  'season:ended': { season: number; ladderPosition: number; premiership: boolean };
  'money:changed': { delta: number; reason: string; balance: number };
  'facility:placed': PlacedFacility;
  'player:signed': Player;
  'match:started': { fixture: Fixture; sim: MatchResult };
  'match:event': MatchEvent; // re-emitted during playback pacing
  'match:finished': { fixture: Fixture; result: MatchResult };
  'bankruptcy:warning': { balance: number };
  'ui:notify': { text: string; kind: 'info' | 'success' | 'danger' };
}

export type EventName = keyof Events;

type Handler<K extends EventName> = (payload: Events[K]) => void;

export class EventEmitter {
  private listeners = new Map<EventName, Set<Handler<EventName>>>();

  /** Subscribe; returns an unsubscribe closure. */
  on<K extends EventName>(k: K, fn: Handler<K>): () => void {
    let set = this.listeners.get(k);
    if (!set) {
      set = new Set();
      this.listeners.set(k, set);
    }
    set.add(fn as Handler<EventName>);
    return () => this.off(k, fn);
  }

  off<K extends EventName>(k: K, fn: Handler<K>): void {
    const set = this.listeners.get(k);
    if (set) set.delete(fn as Handler<EventName>);
  }

  /** Dispatch to a snapshot of listeners so handlers may off() themselves. */
  emit<K extends EventName>(k: K, payload: Events[K]): void {
    const set = this.listeners.get(k);
    if (!set) return;
    for (const fn of [...set]) {
      (fn as Handler<K>)(payload);
    }
  }

  /** Test helper: remove all listeners. */
  clear(): void {
    this.listeners.clear();
  }
}

export const bus = new EventEmitter();
