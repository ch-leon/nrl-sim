// Orchestrator-owned: the PLAYER's match of the round (rival-vs-rival matches
// are handled by fixtures.ts's own hook). The match is played on the live sim
// (BAK-207): the week holds at kick-off, 'match:started' hands the Match scene
// the seed, and the result — what the player watched and called — lands with
// the rest of the week at 'match:finished'. Fast-forward plays it headless.
import { bus, type LiveMatchData } from '../core/events';
import { getState, setState, type Fixture, type GameState, type RivalClub } from '../core/state';
import { registerTickHook, resumeWeek, weekHeld, TICK_ORDER } from '../core/time';
import { clearLiveMatch, liveMatchSameRules, readLiveMatch, writeLiveMatch, type LiveMatchRecord } from './liveMatchRecord';
import { NINES } from '../match/league/rules';
import { DEFAULT_PLAYER_COLORS, FORFEIT_SCORE, SQUAD_MIN, difficultyMultipliers } from '../config';
import { applyResult, getCurrentFixture, isFinalsRound, PLAYER_ID } from './fixtures';
import { teamSheetFromRival, teamSheetFromSquad, withRivalStyle } from '../match/league/sheets';
import type { MatchInjury, MatchResult, TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';
import { runMatch } from '../match/league/match';
import { rivalEdge } from '../match/league/spread';
import { canUseWorker, playMatchesInWorker } from './matchJobs';
import { aiCoachSides, unlockedCalls } from '../match/league/calls';
import { hasStaff } from './staff';
import { applyMatchStats } from './stats';
import { injureRivalPlayers } from './rivals';
import { ON_FIELD } from '../config';
import { autoPick, isFieldable, describeFills, resolveLineup } from './lineup';

/**
 * Who changes plan at the breaks. The rival always. The player's side too when
 * an Assistant Coach is hired and the match is fast-forwarded (N14). A watched
 * match, and Skip from it, stay on the plan the player set.
 */
export function breakRuleSidesFor(
  state: Pick<GameState, 'staff'>,
  rivalSide: 'home' | 'away',
  fastForward: boolean,
): ('home' | 'away')[] {
  const sides: ('home' | 'away')[] = [rivalSide];
  if (fastForward && hasStaff(state, 'assistantCoach')) sides.push(rivalSide === 'home' ? 'away' : 'home');
  return sides;
}

/**
 * The live match the player left with Save & exit (or is watching). The week
 * is already held; resuming re-emits match:started and does not hold again.
 */
interface ParkedMatch {
  fixture: Fixture;
  home: TeamSheet;
  away: TeamSheet;
  live: LiveMatchData;
}
let parked: ParkedMatch | null = null;

/**
 * True while this week's live match is still on: the club's Advance Week resumes it.
 * The in-memory match is enough. A missing or corrupt record must not hide Resume
 * and leave the held week with nothing that will release it.
 */
export function playerMatchPending(): boolean {
  return parked !== null && weekHeld();
}

/** Said once when a mid-match save from the old halves cannot be carried on. */
export const MATCH_RESTARTED_TEXT = 'This match restarted under the new rules.';

/**
 * Back at the club with the match still on: start the Match scene again from
 * the record. The week stays held (one hold, from kick-off), so the result
 * still lands once, at full time. Returns false when there is nothing to resume.
 * A record from the old halves starts again at the kick-off.
 */
export function resumePlayerMatch(): boolean {
  if (!parked || !weekHeld()) return false;
  const rec = readLiveMatch();
  const live = parked.live;
  // Prefer the stored record (a kill, or a write newer than this page). A missing
  // or other match's record keeps the calls and tick already on the parked match.
  if (rec && rec.seed === live.seed) {
    if (rec.tick > 0 && !liveMatchSameRules(rec)) {
      live.calls = [];
      live.plans = [];
      delete live.controls;
      delete live.resumeAt;
      const restarted = { ...rec, calls: [], plans: [], tick: 0, halfMinutes: NINES.halfMinutes };
      delete restarted.controls;
      writeLiveMatch(restarted);
      bus.emit('ui:notify', { text: MATCH_RESTARTED_TEXT, kind: 'info', match: true });
    } else {
      live.calls = [...rec.calls];
      live.plans = rec.plans ? [...rec.plans] : [];
      if (rec.controls?.length) live.controls = [...rec.controls];
      else delete live.controls;
      if (rec.tick > 0) live.resumeAt = rec.tick;
      else delete live.resumeAt;
    }
  }
  bus.emit('match:started', { fixture: parked.fixture, home: parked.home, away: parked.away, live });
  return true;
}

/**
 * Apply sim-emitted injuries onto the player squad (by id, then name) and
 * return the toast lines to announce. Only the player's own side is applied —
 * rivals have no GameState Player rows. The caller emits the toasts so they can
 * be held until playback reaches full-time (same no-spoiler rule as the result).
 * Does not touch forfeit / SQUAD_MIN / bankruptcy flows.
 */
function applyMatchInjuries(injuries: readonly MatchInjury[]): string[] {
  const own = injuries.filter((inj) => inj.teamId === PLAYER_ID);
  if (own.length === 0) return [];
  let squad = getState().squad;
  const toasts: string[] = [];
  for (const inj of own) {
    const idx = squad.findIndex((p) =>
      inj.playerId !== undefined ? p.id === inj.playerId : p.name === inj.playerName,
    );
    if (idx < 0) continue;
    const cur = squad[idx]!;
    const weeks = Math.max(cur.injuredWeeks, inj.weeks);
    if (weeks === cur.injuredWeeks) continue;
    squad = squad.map((p, i) => (i === idx ? { ...p, injuredWeeks: weeks } : p));
    toasts.push(`${cur.name} injured — out ${weeks}w`);
  }
  if (toasts.length > 0) setState({ squad });
  return toasts;
}

function sheetFor(clubId: string): TeamSheet {
  const state = getState();
  if (clubId === PLAYER_ID) {
    const entry = state.league.clubs.find((c) => c.id === PLAYER_ID);
    // The coach's lineup (#69), resolved for today: an injured starter is covered
    // for this match and the news says by whom; a man who has left the club is
    // replaced in the saved lineup as well.
    const picked = resolveLineup(state.lineup ?? autoPick(state.squad), state.squad);
    if (picked.changed) setState({ lineup: picked.lineup });
    if (picked.fills.length > 0) bus.emit('ui:notify', { text: describeFills(picked.fills), kind: 'info', match: true });
    return teamSheetFromSquad(
      state.squad,
      PLAYER_ID,
      state.clubName,
      entry?.colors ?? DEFAULT_PLAYER_COLORS,
      picked,
    );
  }
  const rival = state.league.clubs.find((c) => c.id === clubId);
  if (!rival) throw new Error(`unknown club ${clubId}`);
  return rivalMatchSheet(rival);
}

/**
 * The sheet a rival plays the player's club with. Rivals with a squad (#74) field
 * their own players through the same sheet builder as the player's club: their coach
 * auto-picks his nine by slot with the same positional fit (#69), so both sides pay
 * for a man out of position. Too few fit players (or an old rival with none) falls
 * back to the strength-based sheet. Either way the style is the one the screens show
 * (`rivalStyle`, N11): read from the nine, or from the club's own strength. The sheet
 * is the rival as he is on every difficulty: the difficulty plays in the match, as
 * his edge after the rating spread (N12.2, `rivalEdge`).
 */
export function rivalMatchSheet(rival: RivalClub): TeamSheet {
  const fit = (rival.squad ?? []).filter(isFieldable);
  if (fit.length >= ON_FIELD) {
    return withRivalStyle(teamSheetFromSquad(fit, rival.id, rival.name, rival.colors, resolveLineup(autoPick(fit), fit)), rival);
  }
  return teamSheetFromRival(rival);
}

/** Fit (non-injured) squad size. */
export function fitSquadCount(squad: readonly { injuredWeeks: number; suspendedWeeks?: number }[]): number {
  return squad.filter((p) => p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0).length;
}

/**
 * Forfeit result when the player cannot field SQUAD_MIN fit players.
 * Opponent is awarded FORFEIT_SCORE; player scores 0.
 */
export function forfeitResult(
  fixture: { homeId: string; awayId: string },
  playerId: string = PLAYER_ID,
): { homeScore: number; awayScore: number } {
  const playerHome = fixture.homeId === playerId;
  return playerHome
    ? { homeScore: 0, awayScore: FORFEIT_SCORE }
    : { homeScore: FORFEIT_SCORE, awayScore: 0 };
}

/** The best Coach's Office built (0 = none): it unlocks the coach's calls (N9.6). */
export function coachsOfficeLevel(state: { facilities: readonly { defId: string; level: number }[] }): number {
  return state.facilities.reduce((m, f) => (f.defId === 'coachsOffice' ? Math.max(m, f.level) : m), 0);
}

export function roundLabel(round: number): string {
  if (round === 25) return 'Qualifying Final';
  if (round === 26) return 'Semi Final';
  if (round === 27) return 'Grand Final';
  return `Round ${round}`;
}

/**
 * Apply the player's match result: ladder, player stats, injuries (ours and the
 * rival's). Returns the toast to show when the player sees the final score.
 */
function applyPlayerResult(fixture: Fixture, home: TeamSheet, away: TeamSheet, sim: MatchResult): () => void {
  // Finals draws still stamp as-is; knockoutWinner favours home (higher seed).
  const ownSheet = fixture.homeId === PLAYER_ID ? home : away;
  const playedIds = (ownSheet.roster ?? []).flatMap((r) => (r.id ? [r.id] : []));
  const applied = applyResult(getState(), fixture, {
    homeScore: sim.homeScore,
    awayScore: sim.awayScore,
  });
  setState({
    league: applied.league,
    squad: applyMatchStats(getState().squad, sim.events, PLAYER_ID, playedIds, getState().season),
  });

  // GitHub #7: engine emits injuries; matchday owns squad mutation + notify.
  const injuryToasts = applyMatchInjuries(sim.injuries);
  // The rival's injuries land on its own squad (#74), silently.
  const rivalHurt = sim.injuries.filter((i) => i.teamId !== PLAYER_ID && i.playerId);
  if (rivalHurt.length > 0) {
    const lg = getState().league;
    setState({ league: { ...lg, clubs: injureRivalPlayers(lg.clubs, rivalHurt) } });
  }

  const playerHome = fixture.homeId === PLAYER_ID;
  const [us, them] = playerHome
    ? [sim.homeScore, sim.awayScore]
    : [sim.awayScore, sim.homeScore];
  // A final level at full time goes to golden point (N9.4); still level after it, it is decided on
  // seeding (home = higher seed advances), so say
  // which way it went rather than leaving the player guessing.
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const goldenPoint = sim.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const seedingNote = us === them && isFinalsRound(fixture.round)
    ? (playerHome ? ' — through on seeding' : ' — out on seeding')
    : goldenPoint ? ' in golden point' : '';
  return (): void => {
    bus.emit('ui:notify', {
      text: `${roundLabel(fixture.round)}: ${verdict} ${us}–${them}${seedingNote}`,
      // A loss is news, not a problem (#339): red is kept for injuries, debt and errors.
      kind: us > them ? 'success' : 'info',
    });
    for (const text of injuryToasts) bus.emit('ui:notify', { text, kind: 'danger' });
  };
}

/** How long the Worker gets for the player's fast-forwarded match before it is played here (ms): about 1–2 s on a phone, so this only catches one that has hung. */
export const PLAYER_WORKER_TIMEOUT_MS = 30_000;

export function registerPlayerMatchSystem(): void {
  registerTickHook('matchday-player', TICK_ORDER.match, (ctx) => {
    const state = getState();
    const fixture = getCurrentFixture(state, PLAYER_ID);
    if (!fixture || fixture.result) return;

    const fit = fitSquadCount(state.squad);
    if (fit < SQUAD_MIN) {
      const result = forfeitResult(fixture);
      const applied = applyResult(getState(), fixture, result);
      setState({ league: applied.league });
      bus.emit('ui:notify', {
        text:
          fit === 0
            ? `No fit players — ${roundLabel(fixture.round)} forfeited (${result.homeScore}–${result.awayScore}).`
            : `Only ${fit} fit (need ${SQUAD_MIN}) — ${roundLabel(fixture.round)} forfeited (${result.homeScore}–${result.awayScore}).`,
        kind: 'danger',
      });
      return;
    }

    const rng = makeRng(state.rngSeed);
    const seed = rng.int(1, 2 ** 31);
    setState({ rngSeed: rng.state() });

    const home = sheetFor(fixture.homeId);
    const away = sheetFor(fixture.awayId);
    const rivalSide = fixture.homeId === PLAYER_ID ? 'away' as const : 'home' as const;
    // The difficulty's edge to the rival, after the rating spread (N12.2); none on Normal.
    const edge = rivalEdge(rivalSide, state.settings.difficulty);
    // The rival changes plan at the breaks (N13.5, N14.1), on every difficulty.
    // An Assistant Coach adds the player's side, and only on a fast-forward.
    // Hard's rival also has an AI coach (Assumed: the break rule alone won 50.2%,
    // not the 8 points N12.2 used). Normal and Easy stay off. The global knob stays 0.
    const matchOpts = {
      seed,
      injuryRate: difficultyMultipliers(state.settings.difficulty).injuryRate,
      ...(edge ? { difficultyEdge: edge } : {}),
      ...(state.weather ? { weather: state.weather } : {}),
      aiCoach: aiCoachSides([rivalSide], state.settings.difficulty === 'hard'),
      breakRuleSides: breakRuleSidesFor(state, rivalSide, !!ctx.fastForward),
      // A drawn final goes to golden point (N9.4).
      ...(isFinalsRound(fixture.round) ? { goldenPoint: true } : {}),
    };
    // A live match the app was closed in the middle of (#73): this is the same match.
    const prior = readLiveMatch();
    const sameMatch =
      prior && prior.season === state.season && prior.week === state.week && prior.round === fixture.round && prior.homeId === fixture.homeId && prior.seed === seed ? prior : null;
    // A v19 mid-match save has no half length. Re-simming that tick under 7:00
    // rules is a different match, so it starts again from the kick-off.
    const stale = sameMatch && sameMatch.tick > 0 && !liveMatchSameRules(sameMatch);
    if (stale) bus.emit('ui:notify', { text: MATCH_RESTARTED_TEXT, kind: 'info', match: true });
    const resumed = stale ? null : sameMatch;
    // The match on screen is the match (BAK-207; coach calls #73). The week
    // holds here; the result and the rest of the week come at full time, from
    // what the player watched (and called).
    if (!ctx.fastForward && ctx.hold) {
      ctx.hold();
      const record: LiveMatchRecord = { season: state.season, week: state.week, round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, seed, calls: resumed ? [...resumed.calls] : [], ...(resumed?.controls?.length ? { controls: [...resumed.controls] } : {}), plans: resumed?.plans ? [...resumed.plans] : [], tick: resumed?.tick ?? 0, halfMinutes: NINES.halfMinutes };
      writeLiveMatch(record);
      const off = bus.on('match:finished', ({ fixture: done, result }) => {
        if (done.round !== fixture.round || done.homeId !== fixture.homeId) return;
        off();
        parked = null;
        clearLiveMatch();
        applyPlayerResult(fixture, home, away, result)();
        resumeWeek();
      });
      const live: LiveMatchData = {
        seed,
        weather: state.weather ?? 'clear',
        injuryRate: matchOpts.injuryRate,
        ...(matchOpts.difficultyEdge ? { difficultyEdge: matchOpts.difficultyEdge } : {}),
        ...(matchOpts.goldenPoint ? { goldenPoint: true } : {}),
        calls: record.calls,
        plans: record.plans ?? [],
        ...(record.controls?.length ? { controls: record.controls } : {}),
        ...(record.tick > 0 ? { resumeAt: record.tick } : {}),
        planSide: fixture.homeId === PLAYER_ID ? ('home' as const) : ('away' as const),
        ...(state.settings.coachCalls !== false ? { coachSide: fixture.homeId === PLAYER_ID ? ('home' as const) : ('away' as const), unlockedCalls: unlockedCalls(coachsOfficeLevel(state)) } : {}),
        ...(matchOpts.aiCoach.length ? { aiCoach: matchOpts.aiCoach } : {}),
        breakRuleSides: matchOpts.breakRuleSides,
      };
      // Keep the tick on the parked match too, so Resume still has it if the
      // stored record is later missing or unreadable.
      live.onProgress = (calls, tick, plans, controls = []) => {
        const progress = { ...record, calls: [...calls], plans: [...plans], tick };
        if (controls.length) {
          progress.controls = [...controls];
          live.controls = progress.controls; // Keep parked inputs even if storage becomes unavailable.
        } else {
          delete progress.controls;
          delete live.controls;
        }
        const wrote = writeLiveMatch(progress);
        if (wrote && tick > 0) live.resumeAt = tick;
        return wrote;
      };
      parked = { fixture, home, away, live };
      bus.emit('match:started', { fixture, home, away, live });
      return;
    }
    // Fast-forward in a browser, inside the async advance (N10.3): the same match,
    // headless, in the Worker; the week waits for it, so the page keeps painting.
    if (ctx.fastForward && ctx.hold && canUseWorker()) {
      ctx.hold();
      void playMatchesInWorker([{ home, away, opts: matchOpts }], PLAYER_WORKER_TIMEOUT_MS)
        .then(([result]) => applyPlayerResult(fixture, home, away, result ?? runMatch(home, away, matchOpts))())
        .catch((err: unknown) => console.error('the fast-forwarded match failed to land', err))
        .finally(resumeWeek);
      return;
    }
    // Fast-forward elsewhere (the soak, the tests, advanceWeeks): the same match, headless, here.
    applyPlayerResult(fixture, home, away, runMatch(home, away, matchOpts))();
  });
}
