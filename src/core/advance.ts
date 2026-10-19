// src/core/advance.ts — multi-week advance with stop-early (#44).
//
// Runs one tick at a time under fast-forward (matches auto-resolve exactly as in
// advanceWeeks) and asks the pure rules in ./advanceRules.ts after each week
// whether to keep going. Stop-early reasons are reported as a ui:notify toast.

import { bus } from './events';
import { getState, type GameState } from './state';
import { advanceWeek, withFastForward } from './time';
import { getCurrentFixture, PLAYER_ID } from '../systems/fixtures';
import { fitSquadCount } from '../systems/matchday';
import { overallRating } from '../data/player';
import { cardById } from '../data/events';
import {
  type AdvanceTarget, type StopReason, MAX_RUN_WEEKS,
  contractAlerts, forfeitRisk, newlyInjuredStarters, postWeekStop,
  targetLabel, targetReached,
} from './advanceRules';

/** Outcome of one multi-advance. `stop.kind === 'target'` means it finished normally. */
export interface AdvanceRun {
  weeksPlayed: number;
  stop: StopReason;
}

function playerFixturePending(): boolean {
  const fixture = getCurrentFixture(getState(), PLAYER_ID);
  return fixture !== undefined && !fixture.result;
}

/** Titles of event cards that appeared during the week (#75). */
function newCards(before: GameState, after: GameState): string[] {
  const had = new Set(before.eventDeck.pending.map((e) => e.id));
  return after.eventDeck.pending
    .filter((e) => !had.has(e.id))
    .map((e) => cardById(e.cardId)?.title ?? 'club event');
}

/**
 * Advance until the target is met or something needs attention, then toast the
 * outcome. Synchronous, like advanceWeek; no hook can observe a half-run tick.
 */
export function advanceUntil(target: AdvanceTarget): AdvanceRun {
  if (getState().sacked) return { weeksPlayed: 0, stop: { kind: 'target', text: 'The board has sacked you.' } };
  const run = runUntil(target);
  if (run.stop.kind === 'target') {
    bus.emit('ui:notify', { text: `Advanced ${targetLabel(target)}.`, kind: 'info' });
  } else {
    const weeks = run.weeksPlayed === 1 ? '1 week' : `${run.weeksPlayed} weeks`;
    bus.emit('ui:notify', {
      text: `Stopped after ${weeks}: ${run.stop.text}`,
      kind: 'danger',
    });
  }
  return run;
}

function runUntil(target: AdvanceTarget): AdvanceRun {
  if (target.kind === 'weeks' && target.weeks <= 0) {
    return { weeksPlayed: 0, stop: { kind: 'target', text: `Advanced ${targetLabel(target)}.` } };
  }
  const startSeason = getState().season;
  let weeksPlayed = 0;
  let bankruptcyWarned = false;

  // bankruptcy:warning is emitted from inside the economy tick; latch it for the
  // week it fires in.
  const offBankrupt = bus.on('bankruptcy:warning', () => { bankruptcyWarned = true; });
  try {
    return withFastForward((): AdvanceRun => {
      for (let guard = 0; guard < MAX_RUN_WEEKS; guard++) {
        const before = getState();

        // Forfeit risk is checked before the tick, the only point it can be avoided.
        const pre = forfeitRisk({
          fitCount: fitSquadCount(before.squad),
          playerFixturePending: playerFixturePending(),
        });
        if (pre) return { weeksPlayed, stop: pre };

        bankruptcyWarned = false;
        advanceWeek();
        weeksPlayed++;

        const after = getState();
        if (after.sacked) return { weeksPlayed, stop: { kind: 'target', text: 'The board has sacked you.' } };
        const post = postWeekStop({
          injuredStarters: newlyInjuredStarters(before.squad, after.squad, overallRating),
          contractAlerts: contractAlerts(before.squad, after.squad),
          bankruptcyWarned,
          newDecisions: newCards(before, after),
        });
        if (post) return { weeksPlayed, stop: post };

        if (targetReached(target, {
          weeksPlayed,
          week: after.week,
          startSeason,
          season: after.season,
        })) {
          return { weeksPlayed, stop: { kind: 'target', text: `Advanced ${targetLabel(target)}.` } };
        }
      }
      // Unreachable for the three fixed targets; guards against a future target that never ends.
      return { weeksPlayed, stop: { kind: 'target', text: 'Advance limit reached.' } };
    });
  } finally {
    offBankrupt();
  }
}
