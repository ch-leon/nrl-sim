// Geography only: no RNG, saved derby flag, or online lookup.
import { getState, type GameState, type Fixture } from '../core/state';
import { bus } from '../core/events';
import { registerTickHook, registerSeasonHook, TICK_ORDER } from '../core/time';

type DerbyState = Pick<GameState, 'home' | 'league' | 'clubId'>;
type Coordinates = { lat?: number; lon?: number };
function hasCoordinates(home: Coordinates | undefined): home is { lat: number; lon: number } {
  return home !== undefined && Number.isFinite(home.lat) && Number.isFinite(home.lon)
    && Math.abs(home.lat!) <= 90 && Math.abs(home.lon!) <= 180;
}

/** Nearest rival by great-circle distance; exact ties go to the lower id. */
export function derbyRival(state: DerbyState): string | null {
  if (!hasCoordinates(state.home)) return null;
  const rad = Math.PI / 180;
  const home = state.home;
  let nearest: string | null = null;
  let distance = Infinity;
  for (const club of state.league.clubs) {
    if (club.id === state.clubId || !hasCoordinates(club.home)) continue;
    // Haversine's a is monotonic in great-circle distance (no radius needed).
    const a = Math.sin((club.home.lat - home.lat) * rad / 2) ** 2
      + Math.cos(home.lat * rad) * Math.cos(club.home.lat * rad)
      * Math.sin((club.home.lon - home.lon) * rad / 2) ** 2;
    const d = Math.max(0, Math.min(1, a));
    if (d < distance || (d === distance && (nearest === null || club.id < nearest))) {
      distance = d;
      nearest = club.id;
    }
  }
  return nearest;
}

export function isDerbyFixture(state: DerbyState, fixture: Fixture): boolean {
  const rival = derbyRival(state);
  return rival !== null && ((fixture.homeId === state.clubId && fixture.awayId === rival)
    || (fixture.awayId === state.clubId && fixture.homeId === rival));
}

/** Preview the coming week, including opening week when a game is started/loaded. */
function announceDerby(week: number): void {
  const s = getState();
  if (!s.league.fixtures.some((f) => f.round === week && !f.result && isDerbyFixture(s, f))) return;
  const rival = s.league.clubs.find((c) => c.id === derbyRival(s))!;
  bus.emit('ui:notify', {
    text: `Derby week against ${rival.name}. These are the neighbours. Give our supporters something to talk about.`,
    kind: 'info', from: 'coach', quiet: true,
  });
}

/** Runs after results and next week's finals ties land; works for watched and skipped games. */
export function registerDerbySystem(): void {
  announceDerby(getState().week);
  registerTickHook('derby-news', TICK_ORDER.ladder + 2, ({ week }) => {
    const s = getState();
    for (const f of s.league.fixtures) {
      if (f.round !== week || !f.result || !isDerbyFixture(s, f)) continue;
      const rival = s.league.clubs.find((c) => c.id === derbyRival(s))!;
      const home = f.homeId === s.clubId;
      const ours = home ? f.result.homeScore : f.result.awayScore;
      const theirs = home ? f.result.awayScore : f.result.homeScore;
      bus.emit('ui:notify', {
        text: ours > theirs ? `Derby win over ${rival.name}, ${ours}–${theirs}.`
          : ours < theirs ? `Derby loss to ${rival.name}, ${ours}–${theirs}.`
            : `Derby draw with ${rival.name}, ${ours}–${theirs}.`,
        kind: ours > theirs ? 'success' : ours < theirs ? 'danger' : 'info', quiet: true,
      });
    }
    announceDerby(week + 1);
  });
  registerSeasonHook('derby-season', 21, () => announceDerby(1));
}
