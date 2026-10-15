// Orchestrator-owned: simulates the PLAYER's match of the round (rival-vs-rival
// matches are handled by fixtures.ts's own hook). Emits 'match:started' so the
// presentation layer (MatchScene playback, wave 4) can replay the result; state
// is already fully applied before the event fires — playback is view-only.
import { bus } from '../core/events';
import { getState, setState, type RivalClub } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { DEFAULT_PLAYER_COLORS, FORFEIT_SCORE, type Difficulty, SQUAD_MIN, difficultyMultipliers } from '../config';
import { applyResult, getCurrentFixture, isFinalsRound, PLAYER_ID } from './fixtures';
import { simulateMatch, teamSheetFromRival, teamSheetFromSquad } from '../sim/engine';
import type { MatchInjury, TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';
import { applyMatchStats } from './stats';

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
    return teamSheetFromSquad(
      state.squad,
      PLAYER_ID,
      state.clubName,
      entry?.colors ?? DEFAULT_PLAYER_COLORS,
    );
  }
  const rival = state.league.clubs.find((c) => c.id === clubId);
  if (!rival) throw new Error(`unknown club ${clubId}`);
  return teamSheetFromRival(scaleRivalStrength(rival, state.settings.difficulty));
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

function roundLabel(round: number): string {
  if (round === 25) return 'Qualifying Final';
  if (round === 26) return 'Semi Final';
  if (round === 27) return 'Grand Final';
  return `Round ${round}`;
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
    const sim = simulateMatch(
      home,
      away,
      {
        seed,
        injuryRate: difficultyMultipliers(state.settings.difficulty).injuryRate,
        ...(state.weather ? { weather: state.weather } : {}),
      },
    );
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
    const notifyResult = (): void => {
      bus.emit('ui:notify', {
        text: `${roundLabel(fixture.round)}: ${verdict} ${us}–${them}${seedingNote}`,
        kind: us > them ? 'success' : us < them ? 'danger' : 'info',
      });
      for (const text of injuryToasts) bus.emit('ui:notify', { text, kind: 'danger' });
    };

    if (ctx.fastForward) {
      notifyResult();
      return;
    }
    // Hold the result toast until playback reaches full-time (or is skipped) —
    // announcing it at kick-off spoils the match.
    const off = bus.on('match:finished', ({ fixture: done }) => {
      if (done.round !== fixture.round || done.homeId !== fixture.homeId) return;
      off();
      notifyResult();
    });
    bus.emit('match:started', { fixture, sim, home, away });
  });
}
