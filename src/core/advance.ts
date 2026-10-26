// src/core/advance.ts — multi-week advance with stop-early (#44).
//
// Runs one tick at a time under fast-forward (matches auto-resolve exactly as in
// advanceWeeks) and asks the pure rules in ./advanceRules.ts after each week
// whether to keep going. Stop-early reasons are reported as a ui:notify toast.
//
// N10.2: the run yields a frame between weeks, so the page paints and takes taps
// (the HUD shows "Week n of 27…" and a Stop button). Each week is still one
// synchronous advanceWeek(): no hook can observe a half-run week.
// N10.3: in a browser the week may hold while the player's match plays in the
// Worker (matchday); the run waits for the week's end before asking the rules.

import { bus } from './events';
import { getState, type GameState } from './state';
import { advanceWeek, weekHeld, withFastForward } from './time';
import { getCurrentFixture, PLAYER_ID } from '../systems/fixtures';
import { fitSquadCount, playerMatchPending } from '../systems/matchday';
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
  /** A rule's stop; 'stopped' when the player tapped Stop, 'busy' when a run was already under way (N10.2). */
  stop: StopReason | { kind: 'stopped' | 'busy'; text: string };
}

/** What a Stop tap reports, in the same toast as a rule stop. */
export const STOPPED_BY_YOU = 'you stopped the advance.';

/** Resolves after the next paint (a frame, then a task); in place where there is no page. */
export function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame === 'undefined') return Promise.resolve();
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

let running = false;
let stopAsked = false;

/** True while a multi-week advance is under way (the HUD shows progress and Stop). */
export function advanceInProgress(): boolean {
  return running;
}

/** Stop the run after the week in hand (the HUD's Stop). A no-op when none is running. */
export function stopAdvance(): void {
  if (running) stopAsked = true;
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
 * Advance until the target is met, something needs attention or Stop is tapped,
 * then toast the outcome. Each week is one synchronous advanceWeek() (no hook can
 * observe a half-run tick); between weeks the run awaits `frame` (the next paint
 * by default). A second call while one is running does nothing.
 */
export async function advanceUntil(target: AdvanceTarget, frame: () => Promise<void> = nextFrame): Promise<AdvanceRun> {
  if (getState().sacked) return { weeksPlayed: 0, stop: { kind: 'target', text: 'The board has sacked you.' } };
  if (running) return { weeksPlayed: 0, stop: { kind: 'busy', text: 'An advance is already running.' } };
  // A week already held (Save & exit, or the rival round) must not be waited on here:
  // advanceWeek returns immediately, week:advanced never fires, and this run would
  // sit forever with Advance Week disabled. The HUD refuses the tap too.
  if (weekHeld()) {
    const text = playerMatchPending()
      ? 'Your match is still on. Tap Resume match to carry on.'
      : 'The other matches are still being played; the week ends when they are in.';
    bus.emit('ui:notify', { text, kind: 'info' });
    return { weeksPlayed: 0, stop: { kind: 'stopped', text } };
  }
  running = true;
  stopAsked = false;
  let run: AdvanceRun;
  try {
    run = await runUntil(target, frame);
  } finally {
    running = false;
    stopAsked = false;
    // A last state:changed, so the HUD drops its progress line.
    bus.emit('state:changed', getState());
  }
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

async function runUntil(target: AdvanceTarget, frame: () => Promise<void>): Promise<AdvanceRun> {
  if (target.kind === 'weeks' && target.weeks <= 0) {
    return { weeksPlayed: 0, stop: { kind: 'target', text: `Advanced ${targetLabel(target)}.` } };
  }
  const startSeason = getState().season;
  let weeksPlayed = 0;
  let forcedSales: string[] = [];

  // bankruptcy:warning is emitted from inside the economy tick, after its forced
  // sales, and names them (a sale pays nothing, so the balance can't show it); keep
  // them for the week they happen in. N12.5: debt stops on a sale or a crossing
  // (the balance before and after the week), not on every week's warning.
  const offBankrupt = bus.on('bankruptcy:warning', (w) => { forcedSales.push(...(w.forcedSales ?? [])); });
  try {
    for (let guard = 0; guard < MAX_RUN_WEEKS; guard++) {
      // Paint and take taps between weeks (never before the first: the tap that
      // started the run gets its answer as soon as the week is in).
      if (guard > 0) {
        await frame();
        if (stopAsked) return { weeksPlayed, stop: { kind: 'stopped', text: STOPPED_BY_YOU } };
      }
      const before = getState();

      // Forfeit risk is checked before the tick, the only point it can be avoided.
      const pre = forfeitRisk({
        fitCount: fitSquadCount(before.squad),
        playerFixturePending: playerFixturePending(),
      });
      if (pre) return { weeksPlayed, stop: pre };

      forcedSales = [];
      // A held week (N10.3: the player's match in the Worker) finishes later: wait for its end.
      const weekDone = new Promise<void>((resolve) => {
        const off = bus.on('week:advanced', () => { off(); resolve(); });
        try {
          if (!withFastForward(() => { advanceWeek(); return weekHeld(); }, { holds: true })) { off(); resolve(); }
        } catch (err) {
          off();
          throw err;
        }
      });
      await weekDone;
      weeksPlayed++;

      const after = getState();
      if (after.sacked) return { weeksPlayed, stop: { kind: 'target', text: 'The board has sacked you.' } };
      const post = postWeekStop({
        injuredStarters: newlyInjuredStarters(before.squad, after.squad, overallRating, new Set(before.lineup.starters.filter((id): id is string => id !== null))),
        contractAlerts: contractAlerts(before.squad, after.squad),
        moneyBefore: before.money,
        moneyAfter: after.money,
        forcedSales,
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
  } finally {
    offBankrupt();
  }
}
