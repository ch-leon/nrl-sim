import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';
import type { GameState } from '../../src/core/state';

let opening: Promise<GameState> | null = null;

/** One League career, cloned so a title test can fill a slot without starting Classic. */
export function leagueSlotState(clubName = 'League FC'): Promise<GameState> {
  opening ??= prepareLeagueCareer({
    clubName: 'League FC', seed: 819, home: { town: 'Brisbane', country: 'AU' },
  });
  return opening.then((state) => {
    const copy = structuredClone(state);
    copy.clubName = clubName;
    const club = copy.league.clubs.find((c) => c.id === copy.clubId);
    if (club) club.name = clubName;
    return copy;
  });
}
