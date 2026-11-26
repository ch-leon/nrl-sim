import { describe, expect, it } from 'vitest';
import { CLASSIC_CLUB_COUNT, UK_CLASSIC_CLUB_COUNT, isClassicSave, isLeagueCareerCalendar } from '../../src/core/classicSave';
import { preparePack, selectPack } from '../../src/content';
import { createNewGame, SAVE_VERSION, type GameState } from '../../src/core/state';
import { initLeague } from '../../src/systems/fixtures';
import { prepareLeagueCareer } from '../../src/systems/leagueCareerSetup';

function classicCareer(name: string, seed: number): GameState {
  const state = createNewGame(name, seed);
  state.league = initLeague(state);
  return state;
}

describe('isClassicSave', () => {
  it('recognises a Classic career: a versioned save with no League career and no structural calendar', () => {
    const classic = classicCareer('Cavehole Crushers', 4);
    expect(classic.competitions).toBeUndefined();
    expect(classic.league.clubs).toHaveLength(CLASSIC_CLUB_COUNT);
    expect(isClassicSave(classic)).toBe(true);
    expect(isClassicSave(JSON.stringify(classic))).toBe(true);
    expect(isClassicSave({ version: 35, clubName: 'Old', season: 3, week: 8 })).toBe(false);
  });

  it('recognises a UK Classic career, whose single table had 12 clubs', async () => {
    await preparePack('uk');
    try {
      const uk = createNewGame('Ashcombe Old Boys', 7, { home: { town: 'Ashcombe', country: 'GB' } });
      uk.league = initLeague(uk);
      expect(uk.pack).toBe('uk');
      expect(uk.league.clubs).toHaveLength(UK_CLASSIC_CLUB_COUNT);
      expect(isClassicSave(uk)).toBe(true);
      expect(isClassicSave(JSON.stringify(uk))).toBe(true);
      // Neither count alone is enough without the rest of the evidence.
      expect(isClassicSave({ ...uk, competitions: { leagueCareer: { phase: 'active' } } })).toBe(false);
      expect(isClassicSave({ ...uk, league: { ...uk.league, clubs: uk.league.clubs.slice(0, 8) } })).toBe(false);
    } finally { selectPack('au'); }
  });

  it('never classes a real League career, or a save newer than this game, as Classic', async () => {
    const career = await prepareLeagueCareer({ clubName: 'Local', seed: 4 });
    expect(isClassicSave(career)).toBe(false);
    expect(isClassicSave(JSON.stringify(career))).toBe(false);
    const future = classicCareer('Newer', 4);
    expect(isClassicSave({ ...future, version: SAVE_VERSION + 1 })).toBe(false);
  });

  it('leaves a League career, including one whose calendar is structural', () => {
    const league = {
      version: 35,
      clubName: 'Local',
      competitions: { leagueCareer: { phase: 'active' }, calendar: { mode: 'structural' } },
    };
    expect(isLeagueCareerCalendar(league.competitions)).toBe(true);
    expect(isClassicSave(league)).toBe(false);
    expect(isClassicSave({ version: 35, competitions: { leagueCareer: { phase: 'initial-choice' } } })).toBe(false);
  });

  it('leaves an isolated developer calendar that is not a Classic season', () => {
    const prototype = { version: 32, competitions: { calendar: { mode: 'structural', status: 'active' }, instances: [] } };
    expect(isClassicSave(prototype)).toBe(false);
    expect(isClassicSave(JSON.stringify(prototype))).toBe(false);
  });

  it('does not treat corrupt or non-save payloads as Classic', () => {
    expect(isClassicSave('not json')).toBe(false);
    expect(isClassicSave('{')).toBe(false);
    expect(isClassicSave(null)).toBe(false);
    expect(isClassicSave([])).toBe(false);
    expect(isClassicSave({ clubName: 'No version' })).toBe(false);
    expect(isClassicSave({ version: '35' })).toBe(false);
  });
});
