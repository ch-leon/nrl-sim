import { withLastMatch } from './cardWeek';
import { cardSheetBonuses } from './cardBonuses';
import { leagueFixtureView } from './leagueSeasonView';
import { freezeMatchEffects, matchIncomePatch, commitMatchState, reconcileMatchEffects } from './matchIncome';
// Orchestrator-owned: the PLAYER's match of the round (rival-vs-rival matches
// are handled by fixtures.ts's own hook). The match is played on the live sim
// (BAK-207): the week holds at kick-off, 'match:started' hands the Match scene
// the seed, and the result — what the player watched and called — lands with
// the rest of the week at 'match:finished'. Fast-forward plays it headless.
import { applyMatchXp } from './training';
import { DEFAULT_TACTICS } from '../match/league/presets';
import type { RivalPlanContext } from '../match/league/ai';
import { bus, type LiveMatchData } from '../core/events';
import { getState, setState, stateInstallation, type Fixture, type GameState, type Player, type RivalClub } from '../core/state';
import { registerTickHook, weekHeld, TICK_ORDER, type WeekRelease } from '../core/time';
import { belongsToFixture, clearLiveMatch, liveMatchSameRules, readLiveMatch, writeLiveMatch, type LiveMatchRecord } from './liveMatchRecord';
import { matchEngineIdentity } from './matchEngineIdentity';
import { NINES } from '../match/league/rules';
import { DEFAULT_PLAYER_COLORS, FORFEIT_SCORE, SQUAD_MIN, SEASON_ROUNDS, STAT_MAX, difficultyMultipliers } from '../config';
import { applyResult, getCurrentFixture, isFinalsRound, PLAYER_ID } from './fixtures';
import { teamSheetFromSquad } from '../match/league/sheets';
import { validPlays } from './playbook';
import type { MatchInjury, MatchResult, TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';
import { runMatch } from '../match/league/match';
import { rivalEdge } from '../match/league/spread';
import { canUseWorker, playMatchesInWorker } from './matchJobs';
import { aiCoachSides, unlockedCalls } from '../match/league/calls';
import { hasStaff } from './staff';
import { applyMatchStats, recordMatchAward } from './stats';
import { injureRivalPlayers } from './rivals';
import { playerRivalContext, rivalSheet } from './rivalRound';
import { awayPlayerIds } from './playerAssignments';
import { autoPick, describeFills, resolveLineup } from './lineup';
import { calendarFixtureContext, calendarKnockout, finaliseCalendarFixture, hasStructuralCalendar, sameFixtureIdentity } from './competitionCalendar';

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
  release: WeekRelease;
  fixture: Fixture;
  home: TeamSheet;
  away: TeamSheet;
  live: LiveMatchData;
  record: LiveMatchRecord;
  restartExplained: boolean;
}
let parked: ParkedMatch | null = null;

/**
 * True while this week's live match is still on: the club's Advance Week resumes it.
 * The in-memory match is enough. A missing or corrupt record must not hide Resume
 * and leave the held week with nothing that will release it.
 */
export function playerMatchPending(): boolean {
  return parked !== null && weekHeld() && parked.release.current();
}

/** Said once per incompatible fixture, through the existing match toast lane. */
export const MATCH_RESTARTED_TEXT = 'An update requires this match to restart from kick-off. Your career is safe. Progress in this fixture, including coach calls and plan changes, has been reset; this can lose nearly the whole watched match.';

function explainRestart(): void {
  bus.emit('ui:notify', { text: MATCH_RESTARTED_TEXT, kind: 'info', match: true, ms: 16000 });
}

/**
 * Back at the club with the match still on: start the Match scene again from
 * the record. The week stays held (one hold, from kick-off), so the result
 * still lands once, at full time. Returns false when there is nothing to resume.
 * An incompatible record starts again at kick-off.
 */
export function resumePlayerMatch(): boolean {
  if (!parked || !weekHeld() || !parked.release.current()) return false;
  const rec = readLiveMatch();
  const live = parked.live;
  // Prefer the stored record (a kill, or a write newer than this page). A missing
  // or other match's record keeps the calls and tick already on the parked match.
  if (rec && rec.season === parked.record.season && rec.week === parked.record.week
    && rec.round === parked.fixture.round && rec.homeId === parked.fixture.homeId
    && rec.awayId === parked.fixture.awayId && rec.seed === live.seed
    && rec.competitionId === parked.record.competitionId && rec.fixtureId === parked.record.fixtureId && rec.slot === parked.record.slot) {
    if (!liveMatchSameRules(rec)) {
      live.calls = [];
      live.plans = [];
      delete live.controls;
      delete live.resumeAt;
      const restarted = { ...rec, calls: [], plans: [], tick: 0, halfMinutes: NINES.halfMinutes, engineId: matchEngineIdentity() };
      delete restarted.controls;
      // The held week and its sheets/options already exist; no week hook reruns.
      Object.assign(parked.record, restarted);
      delete parked.record.controls;
      writeLiveMatch(restarted);
      if (!parked.restartExplained) explainRestart();
      parked.restartExplained = true;
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
function applyMatchInjuries(injuries: readonly MatchInjury[], participantIds: ReadonlySet<string>): string[] {
  const own = injuries.filter((inj) => inj.teamId === PLAYER_ID);
  if (own.length === 0) return [];
  let squad = getState().squad;
  const toasts: string[] = [];
  for (const inj of own) {
    const idx = squad.findIndex((p) =>
      participantIds.has(p.id) && (inj.playerId !== undefined ? p.id === inj.playerId : p.name === inj.playerName),
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

function sheetFor(clubId: string, fixture: Fixture): TeamSheet {
  const state = getState();
  if (clubId === PLAYER_ID) {
    const entry = state.league.clubs.find((c) => c.id === PLAYER_ID);
    // The coach's lineup (#69), resolved for today: an injured starter is covered
    // for this match and the news says by whom; a man who has left the club is
    // replaced in the saved lineup as well.
    const away = awayPlayerIds(state);
    const picked = resolveLineup(state.lineup ?? autoPick(state.squad), state.squad,away);
    if (picked.changed) setState({ lineup: picked.lineup });
    if (picked.fills.length > 0) bus.emit('ui:notify', { text: describeFills(picked.fills), kind: 'info', match: true });
    // The set plays he takes in (#326): only ones the club owns, at most three, in his order.
    const plays = validPlays(picked.lineup.plays, state.playbook?.owned);
    const bonus = state.cardWeek ? cardSheetBonuses(state, fixture, { ...picked, plays }) : undefined;
    const selection = plays.length > 0 ? { ...picked, plays: bonus?.plays ?? plays } : picked;
    const adjustStats = bonus && (bonus.ratingByPlayer.size || bonus.strengthByPlayer.size) ? (p: Player) => {
      const rating = bonus.ratingByPlayer.get(p.id) ?? 0;
      const strength = bonus.strengthByPlayer.get(p.id) ?? 0;
      const stats = { ...p.stats };
      for (const key of Object.keys(stats) as (keyof Player['stats'])[]) stats[key] = Math.min(STAT_MAX, stats[key] + rating);
      stats.strength = Math.min(STAT_MAX, stats.strength + strength);
      return stats;
    } : undefined;
    const sheet = teamSheetFromSquad(
      state.squad,
      PLAYER_ID,
      state.clubName,
      entry?.colors ?? DEFAULT_PLAYER_COLORS,
      selection, away, adjustStats,
    );
    if (bonus?.attack) {
      sheet.attack = Math.min(STAT_MAX, sheet.attack + bonus.attack);
      // The live sim reads roster stats. Bake the attack bonus into the three
      // stats that make up the attack aggregate for starters and interchange.
      for (const entry of [...(sheet.roster ?? []), ...(sheet.bench ?? [])]) {
        if (!entry.stats) continue;
        for (const stat of ['speed', 'handling', 'footyIQ'] as const) {
          entry.stats[stat] = Math.min(STAT_MAX, entry.stats[stat] + bonus.attack);
        }
      }
    }
    return sheet;
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
 * back to the strength-based sheet. Player-match callers and previews pass the same
 * habit context; omitted context retains rival-v-rival styles. The difficulty
 * edge is applied after the rating spread (N12.2, `rivalEdge`).
 */
export function rivalMatchSheet(rival: RivalClub, context?: RivalPlanContext): TeamSheet {
  return rivalSheet(rival, context);
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
  if (round <= 0) return `Pre-season trial ${round + 2}`;
  if (round === SEASON_ROUNDS + 1) return 'Qualifying Final';
  if (round === SEASON_ROUNDS + 2) return 'Semi Final';
  if (round === SEASON_ROUNDS + 3) return 'Grand Final';
  return `Round ${round}`;
}

/** Saved stage/date label for League notices; legacy and DEV labels stay unchanged. */
function fixtureNoticeLabel(state: GameState, fixture: Fixture): string {
  const context = state.competitions?.leagueCareer ? calendarFixtureContext(state, fixture) : null;
  if (!context) return roundLabel(fixture.round);
  const view = leagueFixtureView(context.instance, context.fixture);
  return `${view.dateLabel} · ${view.stageLabel}`;
}

/**
 * Apply the player's match result: ladder, player stats, injuries (ours and the
 * rival's). Returns the toast to show when the player sees the final score.
 */
function applyPlayerResult(fixture: Fixture, home: TeamSheet, away: TeamSheet, sim: MatchResult, presentation = false): () => void {
  // Finals draws still stamp as-is; knockoutWinner favours home (higher seed).
  const ownSheet = fixture.homeId === PLAYER_ID ? home : away;
  const playedIds = (ownSheet.roster ?? []).flatMap((r) => (r.id ? [r.id] : []));
  const participantIds = new Set([...playedIds, ...(ownSheet.bench ?? []).flatMap((r) => (r.id ? [r.id] : []))]);
  const before = getState();
  const accepted = fixture.competitionId
    ? before.competitions?.instances.find(i => i.id === fixture.competitionId)?.fixtures.find(f => f.id === fixture.id)?.result
    : before.league.fixtures.find(f => sameFixtureIdentity(f, fixture))?.result;
  if (accepted) { commitMatchState(reconcileMatchEffects(before)); return () => {}; }
  const structural = hasStructuralCalendar(before);
  const knockout = structural ? calendarKnockout(before, fixture) : isFinalsRound(fixture.round);
  const context = structural ? calendarFixtureContext(before, fixture) : undefined;
  const applied = applyResult(before, fixture, {
    homeScore: sim.homeScore,
    awayScore: sim.awayScore,
  });
  if (applied === before) return () => {};
  commitMatchState(applied, {
    ...((structural ? context?.instance.definition.stages.find(s => s.id === fixture.stageId)?.kind === 'league' : fixture.round > 0) ? { recentPlans: [{ ...(ownSheet.tactics ?? DEFAULT_TACTICS) }, ...getState().recentPlans].slice(0, 3) } : {}),
    squad: applyMatchXp(applyMatchStats(getState().squad, sim.events, PLAYER_ID, playedIds, getState().season, participantIds),
      ownSheet, sim, fixture.homeId, fixture.awayId, getState().facilities, getState().training.focus, getState().settings.spendPointsMyself === true),
  });
  // Card week (#846): the last match's lines for the pick screen. A career without one is untouched.
  if (getState().cardWeek) {
    setState({ cardWeek: withLastMatch(getState(), fixture, sim.events, playedIds, participantIds, { season: before.season, week: before.week }).cardWeek! });
  }

  // GitHub #7: engine emits injuries; matchday owns squad mutation + notify.
  const injuryToasts = applyMatchInjuries(sim.injuries, participantIds);
  // The rival's injuries land on its own squad (#74), silently.
  const rivalHurt = sim.injuries.filter((i) => i.teamId !== PLAYER_ID && i.playerId);
  if (rivalHurt.length > 0) {
    const lg = getState().league;
    setState({ league: { ...lg, clubs: injureRivalPlayers(lg.clubs, rivalHurt) } });
  }
  if (structural) {
    recordMatchAward(sim, fixture.homeId, fixture.awayId);
    if (presentation) bus.emit('match:committed', { fixture, result: sim });
  }

  const playerHome = fixture.homeId === PLAYER_ID;
  const [us, them] = playerHome
    ? [sim.homeScore, sim.awayScore]
    : [sim.awayScore, sim.homeScore];
  // A final level at full time goes to golden point (N9.4); still level after it, it is decided on
  // seeding (home = higher seed advances), so say
  // which way it went rather than leaving the player guessing.
  const savedResult = before.competitions?.leagueCareer ? applied.competitions!.instances.find(i => i.id === fixture.competitionId)!.fixtures.find(f => f.id === fixture.id)!.result : undefined;
  const verdict = savedResult?.winnerId ? savedResult.winnerId === PLAYER_ID ? 'WIN' : 'LOSS' : us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const goldenPoint = sim.events.some((e) => e.kind === 'full-time' && e.detail === 'golden-point');
  const decidedWinner = structural ? applied.competitions!.instances.find(i => i.id === fixture.competitionId)!.fixtures.find(f => f.id === fixture.id)!.result!.winnerId : undefined;
  const seedingNote = us === them && knockout
    ? (savedResult ? ` — ${savedResult.winnerId === PLAYER_ID ? 'through' : 'out'} on ${savedResult.decider.replace(/-/g, ' ')}` : structural ? (decidedWinner === PLAYER_ID ? ' — through on the published tie draw' : ' — out on the published tie draw') : playerHome ? ' — through on seeding' : ' — out on seeding')
    : goldenPoint ? ' in golden point' : '';
  return (): void => {
    bus.emit('ui:notify', {
      text: `${before.competitions?.leagueCareer ? fixtureNoticeLabel(before, fixture) : context ? `${context.instance.definition.name}, ${context.fixture.round}` : roundLabel(fixture.round)}: ${verdict} ${us}–${them}${seedingNote}`,
      // A loss is news, not a problem (#339): red is kept for injuries, debt and errors.
      kind: verdict === 'WIN' ? 'success' : 'info',
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

    const absent = awayPlayerIds(state);
    const fit = fitSquadCount(state.squad.filter(p => !absent.has(p.id)));
    if (fit < SQUAD_MIN) {
      const result = forfeitResult(fixture);
      const applied = hasStructuralCalendar(state) ? finaliseCalendarFixture(getState(), fixture, result, true) : applyResult(getState(), { ...fixture, unplayed: true }, result);
      commitMatchState(applied);
      bus.emit('ui:notify', {
        text:
          fit === 0
            ? `No fit players — ${fixtureNoticeLabel(state, fixture)} forfeited (${result.homeScore}–${result.awayScore}).`
            : `Only ${fit} fit (need ${SQUAD_MIN}) — ${fixtureNoticeLabel(state, fixture)} forfeited (${result.homeScore}–${result.awayScore}).`,
        kind: 'danger',
      });
      return;
    }

    if (hasStructuralCalendar(state)) {
      const context = calendarFixtureContext(state, fixture)!;
      const rivalId = fixture.homeId === PLAYER_ID ? fixture.awayId : fixture.homeId;
      const rival = state.league.clubs.find(c => c.id === rivalId)!;
      if (fitSquadCount(rival.squad ?? []) < context.instance.definition.lineup.minSquad) {
        const score = forfeitResult(fixture, rivalId);
        const next = finaliseCalendarFixture(state, fixture, score, true);
        commitMatchState(next);
        bus.emit('ui:notify', { text: `${rival.name} cannot field a legal squad. The fixture is a walkover; no match XP or income is awarded.`, kind: 'info' });
        return;
      }
    }

    setState(matchIncomePatch(freezeMatchEffects(getState(), fixture)));
    const rng = makeRng(state.rngSeed);
    const seed = rng.int(1, 2 ** 31);
    setState({ rngSeed: rng.state() });

    const player = sheetFor(PLAYER_ID, fixture);
    const rivalId = fixture.homeId === PLAYER_ID ? fixture.awayId : fixture.homeId;
    const rival = state.league.clubs.find(c => c.id === rivalId)!;
    const opponent = rivalMatchSheet(rival, playerRivalContext(state, player.roster ?? []));
    const home = fixture.homeId === PLAYER_ID ? player : opponent;
    const away = fixture.awayId === PLAYER_ID ? player : opponent;
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
      aiRival: { side: rivalSide, difficulty: state.settings.difficulty },
      breakRuleSides: breakRuleSidesFor(state, rivalSide, !!ctx.fastForward),
      // A drawn final goes to golden point (N9.4).
      ...((hasStructuralCalendar(state) ? calendarKnockout(state, fixture) : isFinalsRound(fixture.round)) ? { goldenPoint: true } : {}),
    };
    // A live match the app was closed in the middle of (#73): this is the same match.
    const prior = readLiveMatch();
    const sameFixture = prior && belongsToFixture(prior,state,fixture) ? prior : null;
    // Never replay incompatible inputs, even a call queued at tick zero.
    const stale = !!sameFixture && (!liveMatchSameRules(sameFixture) || sameFixture.seed !== seed);
    const resumed = stale ? null : sameFixture;
    // The match on screen is the match (BAK-207; coach calls #73). The week
    // holds here; the result and the rest of the week come at full time, from
    // what the player watched (and called).
    if (!ctx.fastForward && ctx.hold) {
      const release = ctx.hold();
      const record: LiveMatchRecord = { season: state.season, week: state.week, round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, seed, calls: resumed ? [...resumed.calls] : [], ...(resumed?.controls?.length ? { controls: [...resumed.controls] } : {}), plans: resumed?.plans ? [...resumed.plans] : [], tick: resumed?.tick ?? 0, halfMinutes: NINES.halfMinutes, engineId: matchEngineIdentity() };
      if (fixture.id) { record.fixtureId = fixture.id; record.competitionId = fixture.competitionId!; record.slot = fixture.slot!; }
      if (release.fail) {
        const installation = stateInstallation();
        bus.bindLeaguePlayback(fixture, () => stateInstallation() === installation);
      }
      const off = bus.on('match:finished', ({ fixture: done, result }) => {
        if (!release.current()) {off(); release(); return;}
        // This is an in-process playback handoff: echo the actual kick-off
        // object. Durable IDs can repeat after a fresh same-profile career.
        if (done !== fixture || !sameFixtureIdentity(done, fixture) || getState().season !== state.season || getState().week !== state.week) return;
        off();
        parked = null;
        if (release.fail) {
          try { release.applyResult(() => applyPlayerResult(fixture, home, away, result, true)()); }
          catch (error) { release.fail(error); return; }
          // A grouped rival hold may still fail. Retire the match only after the
          // complete interval for this installation reaches durable storage.
          release(() => clearLiveMatch());
        } else {
          clearLiveMatch();
          applyPlayerResult(fixture, home, away, result, true)();
          release();
        }
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
        aiRival: matchOpts.aiRival,
      };
      // Keep the tick on the parked match too, so Resume still has it if the
      // stored record is later missing or unreadable.
      live.onProgress = (calls, tick, plans, controls = []) => {
        if (!release.current()) return false;
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
      parked = { release, fixture, home, away, live, record, restartExplained: stale };
      writeLiveMatch(record);
      // Replacing the sidecar is safe only after construction and the hold above.
      if (stale) explainRestart();
      bus.emit('match:started', { fixture, home, away, live });
      return;
    }
    // Fast-forward in a browser, inside the async advance (N10.3): the same match,
    // headless, in the Worker; the week waits for it, so the page keeps painting.
    if (ctx.fastForward && ctx.hold && canUseWorker()) {
      const release = ctx.hold();
      void playMatchesInWorker([{ home, away, opts: matchOpts }], PLAYER_WORKER_TIMEOUT_MS)
        .then(([result]) => release.applyResult(() => applyPlayerResult(fixture, home, away, result ?? runMatch(home, away, matchOpts))()))
        .catch((err: unknown) => {
          if (release.fail) release.fail(err);
          else console.error('the fast-forwarded match failed to land', err);
        })
        .finally(release);
      return;
    }
    // Fast-forward elsewhere (the soak, the tests, advanceWeeks): the same match, headless, here.
    applyPlayerResult(fixture, home, away, runMatch(home, away, matchOpts))();
  }, { trials: true });
}
