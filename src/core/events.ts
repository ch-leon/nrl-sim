// src/core/events.ts — tiny typed event bus. See ARCHITECTURE §5. No Phaser.
// Systems publish; scenes/UI subscribe. This is the only cross-system channel.

import type {
  GameState, PlacedFacility, Player, Fixture,
} from './state';

// MatchResult / MatchEvent are the canonical match-sim contract types, exported
// from src/sim/events.ts (WU-6, ARCHITECTURE §6).
import type { MatchResult, MatchEvent, TeamSheet, WeatherKind } from '../sim/events';
import type { CallInput, CoachCall } from '../match/league/calls';
import type { PlanInput } from '../match/league/live';
import type { DifficultyEdge } from '../match/league/spread';

/** The match handed to the Match scene (BAK-207, coach calls #73). */
export interface LiveMatchData {
  seed: number;
  weather: WeatherKind;
  injuryRate?: number;
  /** Calls already made (a resumed match), and where it was. */
  calls?: CallInput[];
  /** Plan changes already made at the breaks (N11). */
  plans?: PlanInput[];
  resumeAt?: number;
  /**
   * Keep the resume record: on each call or plan change, every couple of seconds of
   * match time, on Save & exit, and when the app goes to the background.
   * False when the write did not land (storage full or blocked).
   */
  onProgress?: (calls: readonly CallInput[], tick: number, plans: readonly PlanInput[]) => boolean;
  /** The player's side: he may change the plan at the breaks (N11). */
  planSide?: 'home' | 'away';
  /** The player's side, when he has the coach-call chips (#73; the Coach calls setting). */
  coachSide?: 'home' | 'away';
  /** The chips his Coach's Office has unlocked (N9.6). */
  unlockedCalls?: CoachCall[];
  /** The rival's AI coach (N9.6), when the game gives rivals one. Hard's rival has one (N14.1). */
  aiCoach?: ('home' | 'away')[];
  /**
   * Sides whose plan changes at the breaks (N13.5). The rival, in every match
   * the player plays (N14.1). A list, so a resume and a Skip replay the same match.
   */
  breakRuleSides?: ('home' | 'away')[];
  /** A final (N9.4): golden point if level at full time. */
  goldenPoint?: boolean;
  /** The difficulty's edge to the rival, after the rating spread (N12.2); absent on Normal. */
  difficultyEdge?: DifficultyEdge;
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
  /** Save & exit left a live match parked: the week stays held and the club's Advance Week resumes it. */
  'match:parked': { tick: number };
  'board:sacked': { season: number; reason: string };
  // forcedSales (N12.5): who the week's forced sales let go, so a multi-week advance
  // can stop on a sale; the economy emits the warning after the sales.
  'bankruptcy:warning': { balance: number; forcedSales?: string[] };
  /**
   * A message for the player. `quiet` (N14): it is already on screen elsewhere (the
   * season review shows the rollover's retirements, juniors, verdict, prize and
   * movers), so the news inbox keeps it but no toast pops. `match`: about the match on
   * screen; any other toast waits while a live match plays and shows back at the club (#339).
   * `kind` is what it means (#339): `danger` only for a real problem (an error, an injury or
   * ban that keeps a man out, money in the red), `success` for good news, `info` for the
   * rest. `ms`: how long its toast stays in view, when not the default for its length.
   */
  'ui:notify': { text: string; kind: 'info' | 'success' | 'danger'; quiet?: boolean; match?: boolean; ms?: number };
  /** The demo stopped an advance at the week the club is on (#362; commercial flag on only). Task 05 opens the paywall on it. */
  'commercial:demoEnded': { season: number; week: number };
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
