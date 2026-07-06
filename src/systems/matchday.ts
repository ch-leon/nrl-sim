// Orchestrator-owned: simulates the PLAYER's match of the round (rival-vs-rival
// matches are handled by fixtures.ts's own hook). Emits 'match:started' so the
// presentation layer (MatchScene playback, wave 4) can replay the result; state
// is already fully applied before the event fires — playback is view-only.
import { bus } from '../core/events';
import { getState, setState } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
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

export function registerPlayerMatchSystem(): void {
  registerTickHook('matchday-player', TICK_ORDER.match, (ctx) => {
    const state = getState();
    const fixture = getCurrentFixture(state, PLAYER_ID);
    if (!fixture || fixture.result) return;
    if (state.squad.filter((p) => p.injuredWeeks <= 0).length === 0) {
      bus.emit('ui:notify', {
        text: 'No fit players — this round’s match was forfeited.',
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
    bus.emit('ui:notify', {
      text: `Round ${fixture.round}: ${verdict} ${us}–${them}`,
      kind: us > them ? 'success' : us < them ? 'danger' : 'info',
    });

    if (!ctx.fastForward) {
      bus.emit('match:started', { fixture, sim, home, away });
    }
  });
}
