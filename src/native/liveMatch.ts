// src/native/liveMatch.ts — drives the iPhone's Live Activity from the event bus
// (docs/specs/ios.md §3 (a), "The bridge"; Phase 3). iPhone app only: main.ts loads it
// behind the build-time platform flag, so the web and Android bundles never contain it
// (nor @capacitor/core, which only src/native/liveMatchPlugin.ts imports).
//
// Kick-off of a match the player is in starts the activity; tries, goals, big hits, sin
// bins, half-time and full-time update it; leaving the match (Back to club, Save & exit,
// the scene torn down) ends it at once. Nothing here is timed: an update is sent when
// the game says something happened, never on a clock (§6).
//
// Events that arrive together (one tick, or Skip to full time and a resumed match's
// catch-up, which arrive in one go) are folded into one update, sent once the burst is
// over: a microtask, not a timer, so the burst is exactly the synchronous run of emits.
//
// The plugin copes with Live Activities being off or refused: every call resolves, and
// a failure is swallowed here too. Once a start comes back not started, nothing more is
// sent for that match. Paused is the plugin's own (it is set natively when
// the app goes to the background, when this JavaScript may already be stopped).

import type { Events } from '../core/events';
import type { MatchEvent } from '../sim/events';
import { finishTicker, foldBurst, startTicker, type Ticker, type TickerAlert, type TickerAttributes, type TickerContent } from './liveMatchTicker';

/** The Swift plugin's methods (LiveMatchPlugin.swift). */
export interface LiveMatchNative {
  isAvailable(): Promise<{ available: boolean }>;
  startMatch(o: { attributes: TickerAttributes; content: TickerContent }): Promise<{ started: boolean }>;
  updateMatch(o: { content: TickerContent; alert?: TickerAlert }): Promise<void>;
  endMatch(): Promise<void>;
}

/** The slice of the bus this listens on. */
export interface LiveMatchBus {
  on<K extends 'match:started' | 'match:event' | 'match:finished' | 'match:parked'>(k: K, fn: (p: Events[K]) => void): () => void;
}

export interface LiveMatchDeps {
  bus: LiveMatchBus;
  native: LiveMatchNative;
  /** Minutes in a half (NINES.halfMinutes), read at each kick-off. */
  halfMinutes: () => number;
  /** Calls `fn` once when the match on screen is left (the Match scene shuts down). */
  onMatchLeft: (fn: () => void) => void;
}

/** Start listening. Returns a stop function (tests; the app never stops it). */
export function installLiveMatch(deps: LiveMatchDeps): () => void {
  const { native } = deps;
  let ticker: Ticker | null = null;
  let pending: MatchEvent[] = [];
  let scheduled = false;
  /** Bumped when a match ends, so a left-over flush or leave hook does nothing to the next one. */
  let match = 0;

  const quiet = (p: Promise<unknown>): void => {
    p.catch(() => {});
  };
  const send = (content: TickerContent, alert: TickerAlert | null): void => {
    quiet(native.updateMatch(alert ? { content, alert } : { content }));
  };
  const flush = (): void => {
    scheduled = false;
    if (!ticker || pending.length === 0) return;
    const r = foldBurst(ticker, pending);
    pending = [];
    ticker = r.ticker;
    if (r.update) send(r.update.content, r.update.alert);
  };
  const end = (): void => {
    match++;
    if (!ticker) return;
    ticker = null;
    pending = [];
    quiet(native.endMatch());
  };

  const offs = [
    deps.bus.on('match:started', ({ home, away, live }) => {
      end();
      const t = startTicker({ home, away, mine: live.coachSide ?? live.planSide }, deps.halfMinutes());
      if (!t) return;
      ticker = t;
      const id = match;
      // Refused (Live Activities off, or the system said no): send nothing more for this match.
      const notStarted = (): void => {
        if (id !== match) return;
        ticker = null;
        pending = [];
      };
      native.startMatch({ attributes: t.attributes, content: t.content }).then((r) => {
        if (!r.started) notStarted();
      }, notStarted);
      deps.onMatchLeft(() => {
        if (id === match) end();
      });
    }),
    deps.bus.on('match:event', (ev) => {
      if (!ticker) return;
      pending.push(ev);
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(flush);
    }),
    deps.bus.on('match:finished', ({ result }) => {
      if (!ticker) return;
      // The whistle's own event is usually still in the burst: fold it first.
      flush();
      if (!ticker) return;
      const r = finishTicker(ticker, result);
      ticker = r.ticker;
      if (r.update) send(r.update.content, r.update.alert);
    }),
    // Save & exit: the match is parked and the club is back on screen.
    deps.bus.on('match:parked', () => end()),
  ];
  return () => {
    end();
    for (const off of offs) off();
  };
}
