// src/core/events.ts — tiny typed event bus. See ARCHITECTURE §5. No Phaser.
// Systems publish; scenes/UI subscribe. This is the only cross-system channel.

import type {
  GameState, PlacedFacility, Player, Fixture,
} from './state';

// MatchResult / MatchEvent are the canonical match-sim contract types, exported
// from src/sim/events.ts (WU-6, ARCHITECTURE §6).
import type { MatchResult, MatchEvent, TeamSheet, WeatherKind } from '../sim/events';
import type { CallInput } from '../match/league/calls';

/** The match handed to the Match scene (BAK-207, coach calls #73). */
export interface LiveMatchData {
  seed: number;
  weather: WeatherKind;
  injuryRate?: number;
  /** Calls already made (a resumed match), and where it was. */
  calls?: CallInput[];
  resumeAt?: number;
  /** Keep the resume record: on each call, and when the app goes to the background. */
  onProgress?: (calls: readonly CallInput[], tick: number) => void;
  /** The player's side, when he has the coach-call chips (#73; the Coach calls setting). */
  coachSide?: 'home' | 'away';
}

/** Event name -> payload type map (verbatim from ARCHITECTURE §5). */
export interface Events {
  'state:changed': GameState;
  'week:advanced': { week: number; season: number };
  'season:ended': { season: number; ladderPosition: number; premiership: boolean };
  'money:changed': { delta: number; reason: string; balance: number };
  'facility:placed': PlacedFacility;
  'player:signed': Player;
  // home/away sheets ride along so the Match scene can render kits/names
  // without re-deriving them (wave-4 integration extension).
  // `live` (BAK-207, coach calls #73): no result yet — the Match scene plays the
  // live sim on this seed and the result comes with 'match:finished'.
  'match:started': { fixture: Fixture; home: TeamSheet; away: TeamSheet; live: LiveMatchData };
  'match:event': MatchEvent; // re-emitted during playback pacing
  'match:finished': { fixture: Fixture; result: MatchResult };
  'board:sacked': { season: number; reason: string };
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
