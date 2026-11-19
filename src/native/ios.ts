// src/native/ios.ts — what only the iPhone app runs (docs/specs/ios.md). main.ts imports
// this behind `__NRL_PLATFORM__ === 'ios'`, which the build folds to false for the web
// and Android, so the whole module (and @capacitor/core with it) stays out of their bundles.

import { bus } from '../core/events';
import { getState } from '../core/state';
import { NINES } from '../match/league/rules';
import { installClubWidgets, type ClubWidgetsNative } from './clubWidgets';
import { ClubWidgets } from './clubWidgetsPlugin';
import { installLiveMatch, type LiveMatchNative } from './liveMatch';
import { LiveMatch } from './liveMatchPlugin';

/** Phaser.Scenes.Events.SHUTDOWN, without loading Phaser here. */
const SCENE_SHUTDOWN = 'shutdown';

/** The slice of Phaser.Game this needs: the Match scene's own events. */
export interface IosGame {
  scene: { getScene(key: string): { events: { once(event: string, fn: () => void): unknown } } | null | undefined };
}

/** The career in play, or null before there is one (a fresh install at the title screen). */
function career() {
  try {
    return getState();
  } catch {
    return null;
  }
}

/**
 * The lock screen's match ticker (Phase 3) and the club widgets (Phase 5). Returns a
 * stop function (tests).
 */
export function startIosNative(game: IosGame, native: LiveMatchNative = LiveMatch, widgets: ClubWidgetsNative = ClubWidgets): () => void {
  const stopTicker = installLiveMatch({
    bus,
    native,
    halfMinutes: () => NINES.halfMinutes,
    // Back to club, Save & exit and any other way out all shut the Match scene down.
    onMatchLeft: (fn) => {
      const scene = game.scene.getScene('Match');
      if (!scene) {
        // No scene to watch: the activity could never end, so end it now rather than strand it.
        console.warn('nrl-sim: no Match scene to watch; ending the Live Activity');
        fn();
        return;
      }
      scene.events.once(SCENE_SHUTDOWN, fn);
    },
  });
  const stopWidgets = installClubWidgets({ bus, native: widgets, read: career });
  return () => {
    stopTicker();
    stopWidgets();
  };
}
