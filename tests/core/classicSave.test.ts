import { describe, expect, it } from 'vitest';
import { isClassicSave, isLeagueCareerCalendar } from '../../src/core/classicSave';
import { createNewGame } from '../../src/core/state';

describe('isClassicSave', () => {
  it('recognises a Classic career: a versioned save with no League career and no structural calendar', () => {
    const classic = createNewGame('Cavehole Crushers', 4);
    expect(classic.competitions).toBeUndefined();
    expect(isClassicSave(classic)).toBe(true);
    expect(isClassicSave(JSON.stringify(classic))).toBe(true);
    expect(isClassicSave({ version: 35, clubName: 'Old', season: 3, week: 8 })).toBe(true);
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
