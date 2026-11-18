// src/core/time.ts — week/season tick system (BAK-176, WU-4).
//
// Owns ORDERING and COUNTERS only. The real per-system work (training, injuries,
// economy, match, ladder, free agency, autosave) lives in hook functions that
// each system registers via registerTickHook / registerSeasonHook. time.ts never
// knows their internals. See ARCHITECTURE §5 (fixed week-tick pipeline order).
//
// Pure TypeScript, no Phaser. Execution is synchronous and sequential — no
// await, no setTimeout — so pipeline order is exact and no hook can observe a
// later hook's mutation.

import { getState, setState, resetForNewSeason, stateInstallation, type GameState } from './state';
import { bus } from './events';
import { WEEKS_PER_SEASON } from '../config';
import { inTrials } from './season';
import { demoStops } from '../commercial/demo';
import { hasStructuralCalendar, isPlayableLeagueCareer, settleStructuralCalendar, structuralAdvanceProblem, structuralSeasonResolved } from '../systems/competitionCalendar';
import { closeLeagueSeason } from '../systems/leagueCareer';
import { hasExecutableCupRewards, commitMatchState } from '../systems/matchIncome';
import { DEV_TEST_PREFIX } from './storageKeys';
import { careerNamespace } from './storage/local';
import { getActiveSlot, saveIfChanged, saveSettledLeagueMatch, retryPendingLeagueSave } from './save';

// ── Public hook contracts ──────────────────────────────────────────────────

/** A weekly tick hook. Synchronous by contract — never block the tick. */
export type TickHook = (ctx: TickContext) => void;
export interface WeekRelease {
  (afterSaved?: () => void): void;
  current(): boolean;
  applyResult(work: () => void): void;
  /** Checkpointed intervals quarantine partially applied work. A retired token is a no-op. */
  fail?: (error: unknown) => void;
}

export interface TickContext {
  week: number;
  season: number;
  /** true inside advanceWeeks() — hooks auto-sim and skip scene playback. */
  fastForward: boolean;
  /**
   * Hold the week here (a live match the player is watching decides its own
   * result, coach calls #73; a rival round played off the main thread, N9.2):
   * the hooks of the same order still run, then the later hooks and the week's
   * end wait for one resumeWeek() per hold. Absent where a week can't be held:
   * under fast-forward unless the caller allows it (the async advance, N10.3,
   * which plays the player's match in the Worker and waits for the week).
   */
  hold?: () => WeekRelease;
}

/** A season-rollover hook. Runs only at rollover, after counters are bumped. */
export type SeasonHook = (ctx: { season: number; completedSeason?: Readonly<import('./state').GameState> }) => void;

/**
 * Fixed order constants for the §5 pipeline. Ascending `order` = execution
 * order. Systems register with these so the sequence is stable regardless of
 * registration timing.
 */
export const TICK_ORDER = {
  weekStart: 0, // the autosave's save of a change made since the last save (QA finding 21)
  training: 10,
  injuries: 20,
  economy: 30,
  match: 40,
  ladder: 50,
  morale: 55,
  freeagents: 60,
  autosave: 90,
} as const;

// ── Registries ─────────────────────────────────────────────────────────────
//
// Each entry keeps `order` (primary sort key), `seq` (monotonic insertion
// counter for stable tie-breaking) and the fn. Keyed by `name` so re-registering
// a name replaces its prior entry (prevents double-apply after hot-reload).

interface TickEntry {
  name: string;
  order: number;
  seq: number;
  fn: TickHook;
  trials: boolean;
}

interface SeasonEntry {
  name: string;
  order: number;
  seq: number;
  fn: SeasonHook;
}

const tickHooks = new Map<string, TickEntry>();
const seasonHooks = new Map<string, SeasonEntry>();

/**
 * Monotonic insertion counter for stable tie-breaking. A single shared counter
 * keeps `seq` unique and strictly increasing across every registration call;
 * each registry still sorts by its own entries' seq.
 */
let seqCounter = 0;

/**
 * Module flag consulted by advanceWeek() to fill ctx.fastForward. advanceWeeks()
 * sets it before its loop and restores it after (try/finally) so a thrown hook
 * cannot leave fast-forward stuck on.
 */
let fastForwardFlag = false;
/** Whether a fast-forwarded week may be held (withFastForward's `holds`, N10.3). */
let fastForwardHolds = false;

// ── Tick hook registry API ─────────────────────────────────────────────────

/**
 * Register (or replace) a weekly hook. Ascending `order` is execution order;
 * ties break by insertion order. Re-registering an existing `name` replaces it.
 * Trial weeks run only hooks that opt in; round-based events/unlocks stay paused.
 */
export function registerTickHook(name: string, order: number, fn: TickHook, options: { trials?: boolean } = {}): void {
  tickHooks.set(name, { name, order, seq: seqCounter++, fn, trials: options.trials === true });
}

export function unregisterTickHook(name: string): void {
  tickHooks.delete(name);
}

/** Test helper: drop all tick hooks. */
export function clearTickHooks(): void {
  tickHooks.clear();
}

// ── Season hook registry API ───────────────────────────────────────────────

/**
 * Register (or replace) a season-rollover hook. Ascending `order`, insertion
 * order for ties. Re-registering an existing `name` replaces it.
 */
export function registerSeasonHook(name: string, order: number, fn: SeasonHook): void {
  seasonHooks.set(name, { name, order, seq: seqCounter++, fn });
}

export function unregisterSeasonHook(name: string): void {
  seasonHooks.delete(name);
}

/** Test helper: drop all season hooks. */
export function clearSeasonHooks(): void {
  seasonHooks.clear();
}

// ── Ordering ───────────────────────────────────────────────────────────────

/** Sort by ascending order, then ascending insertion seq (stable tie-break). */
function sortedEntries<T extends { order: number; seq: number }>(m: Map<string, T>): T[] {
  return [...m.values()].sort((a, b) => (a.order - b.order) || (a.seq - b.seq));
}

// ── Advancing time ─────────────────────────────────────────────────────────

export interface IntervalCheckpoint {
  source: GameState;
  slot: number;
  namespace: string | null;
}

interface LeagueInterval extends IntervalCheckpoint {
  kind: 'league' | 'paid-cup-dev';
  installation: number;
  published: boolean;
  afterSaved?: () => void;
}

let leagueInterval: LeagueInterval | undefined;

function ownsInterval(interval: LeagueInterval): boolean {
  return leagueInterval === interval && interval.installation === stateInstallation();
}

export function leagueIntervalInProgress(): boolean {
  return !!leagueInterval && ownsInterval(leagueInterval);
}

function verifiedCupInterval(interval: LeagueInterval): boolean {
  return interval.kind === 'paid-cup-dev' || !!interval.source.competitions?.openCupEntry;
}

/** A hook that changes the state before settlement must never displace its checkpoint. */
export function leagueIntervalSaveHeld(): boolean {
  return !!leagueInterval && ownsInterval(leagueInterval) && !leagueInterval.published && getState() !== leagueInterval.source;
}

/** Export the original paid interval even while synchronous hooks are still running. */
export function activePaidCupCheckpoint(): IntervalCheckpoint | undefined {
  return leagueInterval && verifiedCupInterval(leagueInterval) && ownsInterval(leagueInterval) && !leagueInterval.published ? leagueInterval : undefined;
}

function failLeagueInterval(interval: LeagueInterval, reason: string, error?: unknown): void {
  if (!ownsInterval(interval) || interval.published) return;
  if (error) console.error('nrl-sim: career interval failed', error);
  held = null;
  leagueInterval = undefined;
  blockInterval(reason, interval);
}

function runIntervalWork(interval: LeagueInterval | undefined, work: () => void): void {
  if (!interval) { work(); return; }
  if (!ownsInterval(interval)) return;
  try { bus.runLeagueWork(() => interval.installation === stateInstallation(), work); }
  catch (error) { failLeagueInterval(interval, INVALID_SETTLED_INTERVAL, error); }
}

/**
 * Advance a single (interactive) week.
 *
 * 1. Read {week, season} from state.
 * 2. Run every tick hook in ascending order (insertion order for ties),
 *    synchronously, with ctx.fastForward = fastForwardFlag.
 * 3. Compute nextWeek. If it exceeds WEEKS_PER_SEASON, roll the season over;
 *    otherwise persist the new week.
 * 4. Emit 'week:advanced' LAST with the post-tick counters (§5 step 8) so
 *    subscribers read fully-settled state.
 */
export function advanceWeek(): void {
  if (retryPendingLeagueSave()) return;
  if (getState().sacked) return; // game over (#47): the save stays, time stops
  if (failedIntervalProblem()) return;
  if (weekHeld() || (leagueInterval && ownsInterval(leagueInterval))) return;
  // Also refuse inactive or malformed League markers before any interval work.
  if (structuralAdvanceProblem(getState())) return;
  if (demoStops()) return; // the demo's last week is played (#362; never with the commercial flag off)
  const { week, season, competitions } = getState();
  const installation = stateInstallation();
  const checkpoint = {source: getState(), slot: getActiveSlot(), namespace: careerNamespace()};
  const kind = competitions?.leagueCareer ? 'league'
    : checkpoint.namespace === DEV_TEST_PREFIX && hasStructuralCalendar(checkpoint.source) && hasExecutableCupRewards(checkpoint.source)
      ? 'paid-cup-dev' : undefined;
  const interval: LeagueInterval | undefined = kind ? {...checkpoint, kind, installation, published: false} : undefined;
  leagueInterval = interval;
  if (interval && verifiedCupInterval(interval)) {
    let saved = false;
    try { saved = saveIfChanged(checkpoint.source, true); }
    catch (error) { console.error('nrl-sim: could not confirm the interval checkpoint', error); }
    if (!ownsInterval(interval)) return;
    if (!saved || getState() !== checkpoint.source || getActiveSlot() !== checkpoint.slot || careerNamespace() !== checkpoint.namespace) {
      leagueInterval = undefined;
      bus.emitSettled('week:blocked', {week, season, reason: 'The start of the week could not be confirmed in its save slot. Retry the advance.'},
        () => installation === stateInstallation());
      return;
    }
  }
  const tokens = new Set<WeekRelease>();
  const identity = {};
  function hold(): WeekRelease {
    const ownsToken = (): boolean => held?.identity === identity && tokens.has(release) && stateInstallation() === installation;
    const sameCursor = (): boolean => getState().season === season && getState().week === week;
    const release: WeekRelease = Object.assign((afterSaved?: () => void) => {
      if (!ownsToken()) return;
      if (!sameCursor()) {
        if (interval) failLeagueInterval(interval, INVALID_SETTLED_INTERVAL);
        return;
      }
      runIntervalWork(interval, () => {
        const problem = structuralAdvanceProblem(getState());
        if (problem) {
          if (interval) failLeagueInterval(interval, problem);
          else { held = null; blockInterval(problem, checkpoint); }
          return;
        }
        if (interval && afterSaved) interval.afterSaved = afterSaved;
        tokens.delete(release);
        if (tokens.size > 0) return;
        const h = held!;
        held = null;
        for (const entry of h.rest) {
          if (interval && !ownsInterval(interval)) return;
          entry.fn(h.ctx);
        }
        if (!interval || ownsInterval(interval)) finishWeek(week, interval);
      });
    }, {
      current: () => ownsToken() && sameCursor() && !structuralAdvanceProblem(getState()),
      applyResult: (work: () => void) => {
        if (!release.current()) return;
        if (interval) bus.runLeagueWork(() => ownsToken() && sameCursor(), work);
        else work();
      },
      ...(interval ? {fail: (error: unknown) => {
        if (ownsToken()) failLeagueInterval(interval, INVALID_SETTLED_INTERVAL, error);
      }} : {}),
    });
    tokens.add(release);
    return release;
  }
  const canHold = !fastForwardFlag || fastForwardHolds;
  const ctx: TickContext = {week, season, fastForward: fastForwardFlag, ...(canHold ? {hold} : {})};

  runIntervalWork(interval, () => {
    const entries = sortedEntries(tickHooks).filter((entry) => !inTrials(getState()) || entry.trials);
    for (let i = 0; i < entries.length; i++) {
      entries[i]!.fn(ctx);
      if (interval && !ownsInterval(interval)) return;
      // Held: finish this order's hooks (the player's match and the rival round
      // run side by side), then wait for every hold to be released.
      if (tokens.size > 0 && entries[i + 1]?.order !== entries[i]!.order) {
        held = { ctx: { week, season, fastForward: fastForwardFlag }, rest: entries.slice(i + 1), tokens, identity, installation };
        return;
      }
    }
    finishWeek(week, interval);
  });
}

/** A held week (coach calls #73; N9.2): the hooks still to run, and how many holds are still out. */
let held: { ctx: TickContext; rest: TickEntry[]; tokens: Set<WeekRelease>; identity: object; installation: number } | null = null;
let failedInterval: {installation: number; reason: string; checkpoint: IntervalCheckpoint} | null = null;

/** Unexpected post-hook failure is quarantined until a full career reload. */
export function failedIntervalProblem(): string | null {
  return failedInterval?.installation === stateInstallation() ? failedInterval.reason : null;
}

export function failedIntervalCheckpoint(): IntervalCheckpoint | undefined {
  return failedInterval?.installation === stateInstallation() ? failedInterval.checkpoint : undefined;
}

function blockInterval(reason: string, checkpoint: IntervalCheckpoint | LeagueInterval): void {
  failedInterval = {installation: stateInstallation(), reason, checkpoint};
  if ('installation' in checkpoint) {
    bus.emitSettled('week:blocked', {week: checkpoint.source.week, season: checkpoint.source.season, reason},
      () => checkpoint.installation === stateInstallation());
  } else {
    const s = getState(); bus.emit('week:blocked', {week: s.week, season: s.season, reason});
  }
}

/** True while a week is held, waiting for its live match to finish. */
export function weekHeld(): boolean {
  if (held && held.installation !== stateInstallation()) held = null;
  return held !== null;
}

/**
 * Release one hold. With the last one released, finish the week: the hooks
 * after the ones that held it, then the week's end, as advanceWeek would have.
 */
export function resumeWeek(): void {
  if (leagueInterval && ownsInterval(leagueInterval)) return;
  if (getState().competitions && 'leagueCareer' in getState().competitions!) return;
  if (structuralAdvanceProblem(getState())) return;
  held?.tokens.values().next().value?.();
}

/** Test helper: forget a held week. */
export function clearHeldWeek(): void {
  leagueInterval = undefined;
  held = null;
  failedInterval = null;
}

const INVALID_SETTLED_INTERVAL = 'The settled interval is invalid. Reload the saved interval to recover.';

function finishLeagueInterval(interval: LeagueInterval, settled: GameState): void {
  const week = interval.source.week;
  const competitions = settled.competitions!;
  const calendar = competitions.calendar!;
  const final = week >= calendar.slots.length;
  const next = final ? closeLeagueSeason(settled) : {...settled, week: week + 1,
    competitions: {...competitions, calendar: {...calendar, elapsedIntervals: calendar.elapsedIntervals + 1}}};
  if (final && next === settled) {
    failLeagueInterval(interval, 'The settled final interval could not be closed. Reload the saved interval to recover.');
    return;
  }
  if (!final && (competitions.leagueCareer?.phase !== 'active' || !isPlayableLeagueCareer(next))) {
    failLeagueInterval(interval, INVALID_SETTLED_INTERVAL);
    return;
  }
  if (!ownsInterval(interval)) return;
  setState(next);
  if (!ownsInterval(interval)) return;
  // Once published, a failed storage write leaves the old checkpoint and its match together.
  interval.published = true;
  const current = (): boolean => ownsInterval(interval);
  if (final || interval.afterSaved || verifiedCupInterval(interval)) {
    try {
      if (interval.afterSaved || verifiedCupInterval(interval)) saveSettledLeagueMatch(getState(), interval, interval.afterSaved ?? (() => {}));
      else saveIfChanged(getState());
    } catch (error) {
      console.error('nrl-sim: could not persist the settled League interval', error);
    }
  }
  try {
    if (final && current()) {
      if (!settled.sacked && next.sacked) bus.emitSettled('board:sacked', next.sacked, current);
      if (current()) bus.emitSettled('season:ended', {season: settled.season, ...readSeasonOutcome()}, current);
    }
  } finally {
    if (current()) {
      const post = getState();
      bus.emitSettled('week:advanced', {week: post.week, season: post.season}, current);
      if (current()) leagueInterval = undefined;
    }
  }
}

function finishWeek(week: number, interval: LeagueInterval | undefined): void {
  const s = getState();
  if (hasStructuralCalendar(s)) {
    // A result that never landed, or a competition that can never finish, is closed
    // and logged. The interval still ends, so a later advance is not held forever.
    const settled = settleStructuralCalendar(s, week);
    if (interval?.kind === 'league') {
      finishLeagueInterval(interval, settled);
      return;
    }
    if (settled !== s) {
      if (interval) commitMatchState(settled);
      else setState(settled);
    }
    const now = getState();
    const currentCalendar = now.competitions!.calendar!;
    setState({ competitions: { ...now.competitions!, calendar: { ...currentCalendar, elapsedIntervals: currentCalendar.elapsedIntervals + 1 } } });
    if (week >= currentCalendar.slots.length || structuralSeasonResolved(getState())) rollSeasonOver();
    else setState({ week: week + 1 });
    const post = getState();
    if (interval) {
      if (!ownsInterval(interval)) return;
      interval.published = true;
      try { saveSettledLeagueMatch(post, interval, interval.afterSaved ?? (() => {})); }
      catch (error) { console.error('nrl-sim: could not persist the settled Open Cup interval', error); }
      bus.emitSettled('week:advanced', { week: post.week, season: post.season }, () => ownsInterval(interval));
      if (ownsInterval(interval)) leagueInterval = undefined;
    } else {
      bus.emit('week:advanced', { week: post.week, season: post.season });
    }
    return;
  }
  if (interval) { failLeagueInterval(interval, INVALID_SETTLED_INTERVAL); return; }
  if (inTrials(s)) {
    setState({ preseason: s.preseason === 1 ? 2 : 0 });
    bus.emit('week:advanced', { week: s.week, season: s.season });
    return;
  }
  const nextWeek = week + 1;
  if (nextWeek > WEEKS_PER_SEASON) {
    rollSeasonOver();
  } else {
    setState({ week: nextWeek });
  }

  // Re-read post-tick / post-rollover counters for the event payload.
  const post = getState();
  bus.emit('week:advanced', { week: post.week, season: post.season });
}

/**
 * Season rollover. Invoked when advancing past the final week.
 * - resetForNewSeason() bumps season (+1) and sets week = 1.
 * - Season hooks run in ascending order with the NEW season (they own the real
 *   work: ageing, contract decrement, new fixtures, history push).
 * - 'season:ended' is emitted with the ENDED season (new - 1) plus final ladder
 *   position / premiership (defaults 0 / false until WU-7 populates the league).
 */
function rollSeasonOver(): void {
  const structural = hasStructuralCalendar(getState());
  // Detached/frozen sporting state is available to #574's existing season hook.
  const completed = structural ? JSON.parse(JSON.stringify(getState())) as import('./state').GameState : undefined;
  if (completed) {
    const freeze = (value: unknown): void => {
      if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    };
    freeze(completed);
  }
  resetForNewSeason();
  if (structural) setState({ competitions: { ...getState().competitions!, calendar: { ...getState().competitions!.calendar!, status: 'awaiting-next-season' } } });
  const { season } = getState(); // new season

  for (const entry of sortedEntries(seasonHooks)) {
    entry.fn({ season, ...(completed ? { completedSeason: completed } : {}) });
  }

  const endedSeason = season - 1;
  const { ladderPosition, premiership } = readSeasonOutcome();
  bus.emit('season:ended', { season: endedSeason, ladderPosition, premiership });
}

/**
 * Derive the just-ended season's outcome from the (post-rollover) history if a
 * season hook pushed one; otherwise default. Until WU-7 populates the league &
 * WU-registered hooks push history, this returns { 0, false }.
 */
function readSeasonOutcome(): { ladderPosition: number; premiership: boolean } {
  const { history } = getState();
  const last = history.length > 0 ? history[history.length - 1] : undefined;
  if (last) {
    return { ladderPosition: last.ladderPosition, premiership: last.premiership };
  }
  return { ladderPosition: 0, premiership: false };
}

/**
 * Fast-forward exactly n weeks, auto-simulating (fastForward:true in ctx so the
 * match hook auto-sims instead of handing off to MatchScene). n <= 0 is a no-op.
 * The flag is restored in finally so a thrown hook never leaves it stuck.
 */
export function advanceWeeks(n: number): void {
  if (n <= 0 || retryPendingLeagueSave() || structuralAdvanceProblem(getState())) return;
  withFastForward(() => {
    for (let i = 0; i < n; i++) {
      if (retryPendingLeagueSave() || failedIntervalProblem() || structuralAdvanceProblem(getState()) || getState().sacked || weekHeld()) return;
      if (demoStops()) return; // once, not once per week left (#362)
      advanceWeek();
    }
  });
}

/**
 * Run fn with fastForward set, restoring the previous value afterwards (even on
 * throw). Lets callers that need per-week checks (see ./advance.ts) auto-sim
 * matches exactly like advanceWeeks does. With `holds`, a hook may hold the
 * week (ctx.hold) even so: the caller must then wait for it (weekHeld()).
 */
export function withFastForward<T>(fn: () => T, opts: { holds?: boolean } = {}): T {
  const prev = fastForwardFlag;
  const prevHolds = fastForwardHolds;
  fastForwardFlag = true;
  fastForwardHolds = opts.holds === true;
  try {
    return fn();
  } finally {
    fastForwardFlag = prev;
    fastForwardHolds = prevHolds;
  }
}
