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
// #362: in the demo the run stops cleanly before the first week past the demo's
// last (commercial flag on only); the demo's end has its own event, not the toast.

import { bus } from './events';
import { pendingLeagueSaveProblem, retryPendingLeagueSave } from './save';
import { getState, stateInstallation, type GameState } from './state';
import { advanceWeek, failedIntervalProblem, weekHeld, withFastForward } from './time';
import { challengeAdvanceProblem } from '../systems/individualChallengeCommit';
import { awayPlayerIds, projectCampDeparture } from '../systems/playerAssignments';
import { isPlayableLeagueCareer, structuralAdvanceProblem } from '../systems/competitionCalendar';
import { getCurrentFixture, PLAYER_ID } from '../systems/fixtures';
import { fitSquadCount, playerMatchPending } from '../systems/matchday';
import { overallRating } from '../data/player';
import { contractActionView } from '../systems/cap';
import { cardById } from '../data/events';
import { DEMO_ENDED_TEXT, demoBlocked } from '../commercial/demo';
import {
  type AdvanceTarget, type StopReason, MAX_RUN_WEEKS,
  contractAlerts, forfeitRisk, newlyInjuredStarters, postWeekStop,
  stopToastKind, targetLabel, targetReached,
} from './advanceRules';

/** Outcome of one multi-advance. `stop.kind === 'target'` means it finished normally. */
export interface AdvanceRun {
  weeksPlayed: number;
  /**
   * A rule's stop; 'stopped' when the player tapped Stop, 'busy' when a run was already
   * under way (N10.2), 'demo' at the demo's last week (#362).
   */
  stop: StopReason | { kind: 'stopped' | 'busy' | 'demo'; text: string };
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
  const state = getState();
  const failed = failedIntervalProblem() ?? retryPendingLeagueSave();
  if (failed) return { weeksPlayed: 0, stop: { kind: 'stopped', text: failed } };
  if (state.sacked) return { weeksPlayed: 0, stop: { kind: 'target', text: 'The board has sacked you.' } };
  const blocked = structuralAdvanceProblem(state);
  if (blocked) return { weeksPlayed: 0, stop: { kind: choiceRequired(state) ? 'choice-required' : 'stopped', text: blocked } };
  const decision = challengeAdvanceProblem(state);
  if (decision) return {weeksPlayed:0,stop:{kind:'challenge-decision',text:decision}};
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
  const installation = stateInstallation();
  running = true;
  stopAsked = false;
  let run: AdvanceRun;
  try {
    run = await runUntil(target, frame);
  } finally {
    running = false;
    stopAsked = false;
    // A last state:changed, so the HUD drops its progress line.
    const current = (): boolean => stateInstallation() === installation;
    if (state.competitions?.leagueCareer) {
      bus.emitSettled('state:changed', getState(), current);
    } else {
      bus.emit('state:changed', getState());
    }
  }
  if (state.competitions?.leagueCareer && installation !== stateInstallation()) return run;
  if (run.stop.kind === 'target') {
    bus.emit('ui:notify', { text: `Advanced ${targetLabel(target)}.`, kind: 'info' });
  } else if (run.stop.kind === 'demo') {
    const { season, week } = getState();
    bus.emit('commercial:demoEnded', { season, week });
  } else {
    const weeks = run.weeksPlayed === 1 ? '1 week' : `${run.weeksPlayed} weeks`;
    bus.emit('ui:notify', {
      text: `Stopped after ${weeks}: ${run.stop.text}`,
      kind: stopToastKind(run.stop.kind),
    });
  }
  return run;
}

function choiceRequired(state: GameState): boolean {
  return isPlayableLeagueCareer(state) && state.competitions!.leagueCareer!.phase !== 'active';
}

async function runUntil(target: AdvanceTarget, frame: () => Promise<void>): Promise<AdvanceRun> {
  if (target.kind === 'weeks' && target.weeks <= 0) {
    return { weeksPlayed: 0, stop: { kind: 'target', text: `Advanced ${targetLabel(target)}.` } };
  }
  const startSeason = getState().season;
  const installation = stateInstallation();
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
      if (installation !== stateInstallation()) return {weeksPlayed, stop: {kind: 'stopped', text: 'The career changed during advance.'}};
      const unavailable = failedIntervalProblem() ?? retryPendingLeagueSave() ?? structuralAdvanceProblem(before);
      if (unavailable) return { weeksPlayed, stop: { kind: choiceRequired(before) ? 'choice-required' : 'stopped', text: unavailable } };
      const decision = challengeAdvanceProblem(before);
      if (decision) return {weeksPlayed,stop:{kind:'challenge-decision',text:decision}};
      // The demo ends here: stop before the week, not inside it (#362).
      if (demoBlocked(before)) return { weeksPlayed, stop: { kind: 'demo', text: DEMO_ENDED_TEXT } };

      // Forfeit risk is checked before the tick, the only point it can be avoided.
      const camp = before.competitions?.assignments?.find(r => r.season === before.season && r.clubId === before.clubId && r.status === 'booked' && r.rules.departureWeek === before.week);
      const absent = awayPlayerIds(before);
      const pre = forfeitRisk({
        fitCount: camp?.booking ? projectCampDeparture(before,camp.booking).fitCount : fitSquadCount(before.squad.filter(p=>!absent.has(p.id))),
        playerFixturePending: playerFixturePending(),
      });
      if (pre) return { weeksPlayed, stop: pre };

      forcedSales = [];
      // A held week (N10.3: the player's match in the Worker) finishes later: wait for its end.
      let blockedReason: string | undefined;
      let advanced = false;
      const weekDone = new Promise<void>((resolve) => {
        const finish = (): void => {off(); offBlocked(); offState(); resolve();};
        const off = bus.on('week:advanced', () => { advanced = true; finish(); });
        const offBlocked = bus.on('week:blocked', ({reason}) => { blockedReason = reason; finish(); });
        const offState = bus.on('state:changed', () => {if (installation !== stateInstallation()) finish();});
        try {
          if (!withFastForward(() => { advanceWeek(); return weekHeld(); }, { holds: true })) finish();
        } catch (err) {
          off(); offBlocked(); offState();
          throw err;
        }
      });
      await weekDone;
      if (installation !== stateInstallation()) return {weeksPlayed, stop: {kind:'stopped',text:'The career changed during advance.'}};
      const failure = failedIntervalProblem() ?? blockedReason;
      if (failure) return {weeksPlayed, stop: {kind:'stopped',text:failure}};
      if (!advanced)
        return {weeksPlayed,stop:{kind:'stopped',text:'The club week did not advance.'}};
      weeksPlayed++;
      const pending = pendingLeagueSaveProblem();
      if (pending) return {weeksPlayed, stop: {kind: 'stopped', text:pending}};

      const after = getState();
      const nextDecision = challengeAdvanceProblem(after);
      if (nextDecision) return {weeksPlayed,stop:{kind:'challenge-decision',text:nextDecision}};
      if (after.sacked) return { weeksPlayed, stop: { kind: 'target', text: 'The board has sacked you.' } };
      if (choiceRequired(after)) {
        if (targetReached(target, {weeksPlayed, week: after.week, startSeason, season: after.season, seasonClosed: true}))
          return {weeksPlayed, stop: {kind: 'target', text: `Advanced ${targetLabel(target)}.`}};
        return {weeksPlayed, stop: {kind: 'choice-required', text: 'Choose a league for next season before advancing.'}};
      }
      const post = postWeekStop({
        injuredStarters: newlyInjuredStarters(before.squad, after.squad, overallRating, new Set(before.lineup.starters.filter((id): id is string => id !== null))),
        contractAlerts: contractAlerts(before.squad.map(p => contractActionView(before, p)), after.squad.map(p => contractActionView(after, p))),
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
