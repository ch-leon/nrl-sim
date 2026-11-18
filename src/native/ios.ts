// src/native/ios.ts — what only the iPhone app runs (docs/specs/ios.md). main.ts imports
// this behind `__NRL_PLATFORM__ === 'ios'`, which the build folds to false for the web
// and Android, so the whole module (and @capacitor/core with it) stays out of their bundles.

import Phaser from 'phaser';
import { bus } from '../core/events';
import { getState } from '../core/state';
import { NINES } from '../match/league/rules';
import { installClubWidgets } from './clubWidgets';
import { ClubWidgets } from './clubWidgetsPlugin';
import { installLiveMatch } from './liveMatch';
import { LiveMatch } from './liveMatchPlugin';

/** The lock screen's match ticker (Phase 3) and the club widgets (Phase 5). */
export function startIosNative(game: Phaser.Game): void {
  installLiveMatch({
    bus,
    native: LiveMatch,
    halfMinutes: () => NINES.halfMinutes,
    // Back to club, Save & exit and any other way out all shut the Match scene down.
    onMatchLeft: (fn) => game.scene.getScene('Match')?.events.once(Phaser.Scenes.Events.SHUTDOWN, fn),
  });
  installClubWidgets({
    bus,
    native: ClubWidgets,
    read: () => {
      try {
        return getState();
      } catch {
        return null; // No career yet (a fresh install at the title screen).
      }
    },
  });
}
