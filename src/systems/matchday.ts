// Orchestrator-owned: simulates the PLAYER's match of the round (rival-vs-rival
// matches are handled by fixtures.ts's own hook). Emits 'match:started' so the
// presentation layer (MatchScene playback, wave 4) can replay the result; state
// is already fully applied before the event fires — playback is view-only.
import { bus } from '../core/events';
import { getState, setState } from '../core/state';
import { registerTickHook, TICK_ORDER } from '../core/time';
import { applyResult, getCurrentFixture, PLAYER_ID } from './fixtures';
import { simulateMatch, teamSheetFromRival, teamSheetFromSquad } from '../sim/engine';
import type { MatchInjury, TeamSheet } from '../sim/events';
import { makeRng } from '../utils/rng';

/**
 * Apply sim-emitted injuries onto the player squad (by id, then name).
 * Rival injuries are ignored — they have no GameState Player rows.
 * Does not touch forfeit / SQUAD_MIN / bankruptcy flows.
 */
function applyMatchInjuries(injuries: readonly MatchInjury[]): void {
  if (injuries.length === 0) return;
  const state = getState();
  let squad = state.squad;
  let changed = false;
  for (const inj of injuries) {
    // Only mutate real squad rows; rival/synthetic injuries have no Player id.
    if (inj.playerId === undefined && inj.teamId !== PLAYER_ID) continue;
    const idx = squad.findIndex(
      (p) =>
        (inj.playerId !== undefined && p.id === inj.playerId) ||
        (inj.playerId === undefined && p.name === inj.playerName),
    );
    if (idx < 0) continue;
    const cur = squad[idx]!;
    const weeks = Math.max(cur.injuredWeeks, inj.weeks);
    if (weeks === cur.injuredWeeks) continue;
    squad = squad.map((p, i) => (i === idx ? { ...p, injuredWeeks: weeks } : p));
    changed = true;
    bus.emit('ui:notify', {
      text: `${cur.name} injured — out ${weeks}w`,
      kind: 'danger',
    });
  }
  if (changed) setState({ squad });
}

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

    // GitHub #7: engine emits injuries; matchday owns squad mutation + notify.
    applyMatchInjuries(sim.injuries);

    const playerHome = fixture.homeId === PLAYER_ID;
    const [us, them] = playerHome
      ? [sim.homeScore, sim.awayScore]
      : [sim.awayScore, sim.homeScore];
    const verdict = us > them ? 'WIN' : us < them ? 'LOSS' : 'DRAW';
    const notifyResult = (): void => {
      bus.emit('ui:notify', {
        text: `Round ${fixture.round}: ${verdict} ${us}–${them}`,
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
