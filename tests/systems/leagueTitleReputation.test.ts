// Stepping down a league (#833): a title below the club's highest unlocked
// league is worth half the usual reputation.
import { describe, expect, it } from 'vitest';
import { leagueTitleReputation } from '../../src/systems/leagueCareer';
import { PREMIERSHIP_REP_BONUS, recordSeasonHonours } from '../../src/systems/fixtures';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';

describe('League title reputation (#833)', () => {
  it('pays the full bonus in the highest unlocked league and half below it', async () => {
    const s = await prepareLeagueCareer({ clubName: 'Step Down FC', seed: 575 });
    const world = s.competitions!.world!;
    const [local, championship, premier] = [...world.divisions].sort((a, b) => a.rank - b.rank).map(d => d.id) as [string, string, string];
    const access = (...ids: string[]) => ids.map(leagueId => ({ leagueId }));
    expect(leagueTitleReputation(world, access(local), local)).toBe(PREMIERSHIP_REP_BONUS);
    expect(leagueTitleReputation(world, access(local, championship), championship)).toBe(PREMIERSHIP_REP_BONUS);
    expect(leagueTitleReputation(world, access(local, championship), local)).toBe(Math.floor(PREMIERSHIP_REP_BONUS / 2));
    expect(leagueTitleReputation(world, access(local, championship, premier), championship)).toBe(Math.floor(PREMIERSHIP_REP_BONUS / 2));
    expect(leagueTitleReputation(world, access(local, championship, premier), premier)).toBe(PREMIERSHIP_REP_BONUS);
  });

  it('adds the reputation it is given for a title, and the full bonus by default', async () => {
    const s = { ...(await prepareLeagueCareer({ clubName: 'Step Down FC', seed: 575 })), reputation: 40 };
    const facts = { season: 1, clubId: s.clubId, ladderPosition: 1, championId: s.clubId };
    expect(recordSeasonHonours(s, facts).reputation).toBe(40 + PREMIERSHIP_REP_BONUS);
    expect(recordSeasonHonours(s, { ...facts, titleReputation: 7 }).reputation).toBe(47);
    expect(recordSeasonHonours(s, { ...facts, championId: 'someone-else', titleReputation: 7 }).reputation).toBe(40);
  });
});
