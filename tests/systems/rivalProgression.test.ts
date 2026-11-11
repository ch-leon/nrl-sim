import { describe, expect, it } from 'vitest';
import { RIVAL_CLUBS } from '../../src/data/league';
import { shownStats } from '../../src/data/player';
import { WEEKS_PER_SEASON } from '../../src/config';
import { makeRng } from '../../src/utils/rng';
import { developRivalsWeek, rivalMeanStrength, rolloverRivals, withRivalSquads, RIVAL_LEAGUE_MEAN } from '../../src/systems/rivals';

describe('rival progression across seasons (#542)', () => {
  it.each([1, 542, 2026])('holds the league anchor through ten seasons and repeats exactly for seed %i', seed => {
    const run = () => {
      let clubs = withRivalSquads(RIVAL_CLUBS, seed);
      const rng = makeRng(seed);
      const means: number[] = [];
      for (let year = 0; year < 10; year++) {
        for (let week = 0; week < WEEKS_PER_SEASON; week++) {
          clubs = developRivalsWeek(clubs, rng);
          for (const p of clubs.flatMap(c => c.squad!)) {
            for (const key of shownStats(p.position)) expect(p.stats[key]).toBeLessThanOrEqual(p.ceilings[key]!);
          }
        }
        means.push(rivalMeanStrength(clubs));
        expect(Math.abs(means[means.length - 1]! - RIVAL_LEAGUE_MEAN)).toBeLessThanOrEqual(2);
        clubs = rolloverRivals(clubs, rng).clubs;
      }
      return { clubs, means, seed: rng.state() };
    };
    expect(run()).toEqual(run());
  });

  it('preserves the main rollover draw order and ceilings for a fixed roster', () => {
    const clubs = withRivalSquads(RIVAL_CLUBS, 542);
    const rng = makeRng(542);
    const result = rolloverRivals(clubs, rng);
    expect({ seed: rng.state(), retired: result.retired, juniors: result.juniors }).toEqual({ seed: 1000330794, retired: 16, juniors: 2 });
    const before = new Map(clubs.flatMap(c => c.squad!).map(p => [p.id, p]));
    for (const p of result.clubs.flatMap(c => c.squad!)) {
      const previous = before.get(p.id);
      if (previous) {
        expect(p.stats).toEqual(previous.stats);
        expect(p.ceilings).toEqual(previous.ceilings);
      }
    }
  });
});
