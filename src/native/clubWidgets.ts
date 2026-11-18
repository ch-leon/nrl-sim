// src/native/clubWidgets.ts — keeps the iPhone's club widgets up to date (docs/specs/ios.md
// §3 (b) and (c), Phase 5). iPhone app only: src/native/ios.ts starts it, and main.ts loads
// that behind the build-time platform flag, so the web and Android bundles never contain it.
//
// The widgets read a snapshot (clubSnapshot.ts) from the App Group; this writes a new one
// when the game says something changed: a career loaded or started, the week advanced, a
// match committed, points spent, an injury picked up or healed. Every one of those goes
// through the store, so 'state:changed' covers them all; 'week:advanced' and
// 'match:committed' are listened to as well, by name. Nothing is timed or polled.
//
// One state change is often several setState calls in a row (an advance runs every weekly
// hook), so a burst is folded into one write, after it: a microtask, not a timer. A write is
// skipped when the snapshot is the one last written. With no career there is nothing to
// write, and the widget keeps asking you to open the game.

import type { Events } from '../core/events';
import type { GameState } from '../core/state';
import { clubSnapshot } from './clubSnapshot';

/** The Swift plugin's methods (ios/App/App/LiveActivity/ClubWidgetsPlugin.swift). */
export interface ClubWidgetsNative {
  /** Stores the snapshot (JSON) for the widgets and asks WidgetKit to redraw them. */
  writeSnapshot(o: { json: string }): Promise<{ written: boolean }>;
}

/** The slice of the bus this listens on. */
export interface ClubWidgetsBus {
  on<K extends 'state:changed' | 'week:advanced' | 'match:committed'>(k: K, fn: (p: Events[K]) => void): () => void;
}

export interface ClubWidgetsDeps {
  bus: ClubWidgetsBus;
  native: ClubWidgetsNative;
  /** The career in play, or null before there is one. */
  read: () => GameState | null;
}

/** Start listening, and write the career already loaded, if any. Returns a stop function (tests). */
export function installClubWidgets(deps: ClubWidgetsDeps): () => void {
  let last: string | null = null;
  let scheduled = false;
  let stopped = false;

  const write = (): void => {
    scheduled = false;
    if (stopped) return;
    let json: string;
    try {
      const snap = clubSnapshot(deps.read());
      if (!snap) return;
      json = JSON.stringify(snap);
    } catch {
      return; // A half-built career mid-load: the next change writes it.
    }
    if (json === last) return;
    last = json;
    deps.native.writeSnapshot({ json }).catch(() => {
      // Not written (no App Group on this install): try again on the next change.
      if (last === json) last = null;
    });
  };
  const schedule = (): void => {
    if (scheduled || stopped) return;
    scheduled = true;
    queueMicrotask(write);
  };

  const offs = [
    deps.bus.on('state:changed', schedule),
    deps.bus.on('week:advanced', schedule),
    deps.bus.on('match:committed', schedule),
  ];
  schedule();
  return () => {
    stopped = true;
    for (const off of offs) off();
  };
}
