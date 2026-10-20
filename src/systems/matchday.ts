// Orchestrator-owned: the PLAYER's match of the round (rival-vs-rival matches
// are handled by fixtures.ts's own hook). The match is played on the live sim
// (BAK-207): the week holds at kick-off, 'match:started' hands the Match scene
// the seed, and the result — what the player watched and called — lands with
// the rest of the week at 'match:finished'. Fast-forward plays it headless.
import { bus } from '../core/events';
import { getState, setState, type Fixture, type RivalClub } from '../core/state';
import { registerTickHook, resumeWeek, TICK_ORDER } from '../core/time';
import { clearLiveMatch, readLiveMatch, writeLiveMatch, type LiveMatchRecord } from './liveMatchRecord';
import { DEFAULT_PLAYER_COLORS, FORFEIT_SCORE, type Difficulty, SQUAD_MIN, difficultyMultipliers } from '../config';
import { applyResult, getCurrentFixture, isFinalsRound, PLAYER_ID } from './fixtures';
import { teamSheetFromRival, teamSheetFromSquad } from '../match/league/sheets';
import type { MatchInjury, MatchResult, TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';
import { runMatch } from '../match/league/match';
import { applyMatchStats } from './stats';
import { injureRivalPlayers } from './rivals';
import { ON_FIELD } from '../config';
import { autoPick, describeFills, resolveLineup } from './lineup';

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

/** Difficulty scales the strength of the rivals the player faces (clamped to the league bounds). */
export function scaleRivalStrength(rival: RivalClub, difficulty: Difficulty | undefined): RivalClub {
  const mult = difficultyMultipliers(difficulty).rivalStrength;
  if (mult === 1) return rival;
  return { ...rival, strength: Math.round(Math.min(100, Math.max(1, rival.strength * mult))) };
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
    if (picked.fills.length > 0) bus.emit('ui:notify', { text: describeFills(picked.fills), kind: 'info' });
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
  // Rivals with a squad (#74) field their own players through the same sheet
  // builder as the player's club: their coach auto-picks his nine by slot with
  // the same positional fit (#69), so both sides pay for a man out of position.
  // Difficulty scales the aggregates. Too few fit players (or an old rival with
  // none) falls back to the strength-based sheet.
  const fit = (rival.squad ?? []).filter((p) => p.injuredWeeks <= 0);
  if (fit.length >= ON_FIELD) {
    return scaleSheet(teamSheetFromSquad(fit, rival.id, rival.name, rival.colors, resolveLineup(autoPick(fit), fit)), state.settings.difficulty);
  }
  return teamSheetFromRival(scaleRivalStrength(rival, state.settings.difficulty));
}

/** Scale a squad-built rival sheet's aggregates by the difficulty's rival multiplier. */
export function scaleSheet(sheet: TeamSheet, difficulty: Difficulty | undefined): TeamSheet {
  const mult = difficultyMultipliers(difficulty).rivalStrength;
  if (mult === 1) return sheet;
  const scale = (n: number): number => Math.round(Math.min(100, Math.max(1, n * mult)));
  return {
    ...sheet,
    attack: scale(sheet.attack), defense: scale(sheet.defense), kicking: scale(sheet.kicking), fitness: scale(sheet.fitness),
  };
}

/** Fit (non-injured) squad size. */
export function fitSquadCount(injuredWeeks: readonly { injuredWeeks: number }[]): number {
  return injuredWeeks.filter((p) => p.injuredWeeks <= 0).length;
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
  // A drawn final is decided on seeding (home = higher seed advances), so say
  // which way it went rather than leaving the player guessing.
  const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
  const seedingNote = us === them && isFinalsRound(fixture.round)
    ? (playerHome ? ' — through on seeding' : ' — out on seeding')
    : '';
  return (): void => {
    bus.emit('ui:notify', {
      text: `${roundLabel(fixture.round)}: ${verdict} ${us}–${them}${seedingNote}`,
      kind: us > them ? 'success' : us < them ? 'danger' : 'info',
    });
    for (const text of injuryToasts) bus.emit('ui:notify', { text, kind: 'danger' });
  };
}

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
    const matchOpts = {
      seed,
      injuryRate: difficultyMultipliers(state.settings.difficulty).injuryRate,
      ...(state.weather ? { weather: state.weather } : {}),
    };
    // A live match the app was closed in the middle of (#73): this is the same match.
    const prior = readLiveMatch();
    const resumed =
      prior && prior.season === state.season && prior.week === state.week && prior.round === fixture.round && prior.homeId === fixture.homeId && prior.seed === seed ? prior : null;
    // The match on screen is the match (BAK-207; coach calls #73). The week
    // holds here; the result and the rest of the week come at full time, from
    // what the player watched (and called).
    if (!ctx.fastForward && ctx.hold) {
      ctx.hold();
      const record: LiveMatchRecord = { season: state.season, week: state.week, round: fixture.round, homeId: fixture.homeId, awayId: fixture.awayId, seed, calls: resumed ? [...resumed.calls] : [], tick: resumed?.tick ?? 0 };
      writeLiveMatch(record);
      const off = bus.on('match:finished', ({ fixture: done, result }) => {
        if (done.round !== fixture.round || done.homeId !== fixture.homeId) return;
        off();
        clearLiveMatch();
        applyPlayerResult(fixture, home, away, result)();
        resumeWeek();
      });
      bus.emit('match:started', {
        fixture,
        home,
        away,
        live: {
          seed,
          weather: state.weather ?? 'clear',
          injuryRate: matchOpts.injuryRate,
          calls: record.calls,
          ...(record.tick > 0 ? { resumeAt: record.tick } : {}),
          onProgress: (calls, tick) => writeLiveMatch({ ...record, calls: [...calls], tick }),
          ...(state.settings.coachCalls !== false ? { coachSide: fixture.homeId === PLAYER_ID ? ('home' as const) : ('away' as const) } : {}),
        },
      });
      return;
    }
    // Fast-forward: the same match, headless.
    applyPlayerResult(fixture, home, away, runMatch(home, away, matchOpts))();
  });
}
