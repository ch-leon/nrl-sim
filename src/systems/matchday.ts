// Orchestrator-owned: simulates the PLAYER's match of the round (rival-vs-rival
// matches are handled by fixtures.ts's own hook). Emits 'match:started' so the
// presentation layer (MatchScene playback, wave 4) can replay the result; state
// is already fully applied before the event fires — playback is view-only.
import { bus } from '../core/events';
import { getState, setState } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { FORFEIT_SCORE, SQUAD_MIN } from '../config';
import { applyResult, getCurrentFixture, PLAYER_ID } from './fixtures';
import { simulateMatch, teamSheetFromRival, teamSheetFromSquad } from '../sim/engine';
import type { TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';

function sheetFor(clubId: string): TeamSheet {
  const state = getState();
  if (clubId === PLAYER_ID) {
    const entry = state.league.clubs.find((c) => c.id === PLAYER_ID);
    return teamSheetFromSquad(
      state.squad,
      PLAYER_ID,
      state.clubName,
      entry?.colors ?? ['#f4d03f', '#1a1a2e'],
    );
  }
  const rival = state.league.clubs.find((c) => c.id === clubId);
  if (!rival) throw new Error(`unknown club ${clubId}`);
  return teamSheetFromRival(rival);
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
      state.weather ? { seed, weather: state.weather } : { seed },
    );
    // Finals draws still stamp as-is; knockoutWinner favours home (higher seed).
    const applied = applyResult(getState(), fixture, {
      homeScore: sim.homeScore,
      awayScore: sim.awayScore,
    });
    setState({ league: applied.league });

    const playerHome = fixture.homeId === PLAYER_ID;
    const [us, them] = playerHome
      ? [sim.homeScore, sim.awayScore]
      : [sim.awayScore, sim.homeScore];
    const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
    const notifyResult = (): void => {
      bus.emit('ui:notify', {
        text: `${roundLabel(fixture.round)}: ${verdict} ${us}–${them}`,
        kind: us > them ? 'success' : us < them ? 'danger' : 'info',
      });
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
