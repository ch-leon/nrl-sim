import { describe, it, expect } from 'vitest';
import {
  forfeitRisk, newlyInjuredStarters, regularStarterIds, contractAlerts,
  postWeekStop, targetReached, targetLabel, FINALS_START_WEEK,
  type SquadMember,
} from '../../src/core/advanceRules';
import { ON_FIELD, SEASON_ROUNDS, SQUAD_MIN, WEEKS_PER_SEASON } from '../../src/config';

interface Mem extends SquadMember { rating: number }

function mem(id: string, rating: number, over: Partial<SquadMember> = {}): Mem {
  return { id, name: `P${id}`, rating, injuredWeeks: 0, contractWeeks: 52, ...over };
}
const byRating = (p: Mem) => p.rating;

/** Twenty fit players, rated 100 down to 81, so ids '1'..'9' are the starters. */
function squad(): Mem[] {
  return Array.from({ length: 20 }, (_, i) => mem(String(i + 1), 100 - i));
}

describe('forfeitRisk', () => {
  it('stops when the next player fixture would be forfeited (fit < SQUAD_MIN)', () => {
    const r = forfeitRisk({ fitCount: SQUAD_MIN - 1, playerFixturePending: true });
    expect(r?.kind).toBe('forfeit');
    expect(r?.text).toContain(`need ${SQUAD_MIN}`);
  });

  it('does not stop at exactly SQUAD_MIN fit players', () => {
    expect(forfeitRisk({ fitCount: SQUAD_MIN, playerFixturePending: true })).toBeNull();
  });

  it('does not stop when there is no pending player fixture', () => {
    expect(forfeitRisk({ fitCount: 0, playerFixturePending: false })).toBeNull();
  });
});

describe('regularStarterIds', () => {
  it('takes the best ON_FIELD fit players by rating', () => {
    const ids = regularStarterIds(squad(), byRating);
    expect(ids.size).toBe(ON_FIELD);
    for (let i = 1; i <= ON_FIELD; i++) expect(ids.has(String(i))).toBe(true);
  });

  it('skips injured players when choosing starters', () => {
    const s = squad();
    s[0] = { ...s[0]!, injuredWeeks: 2 };
    const ids = regularStarterIds(s, byRating);
    expect(ids.has('1')).toBe(false);
    expect(ids.has(String(ON_FIELD + 1))).toBe(true);
  });
});

describe('newlyInjuredStarters', () => {
  it('reports a starter who became injured during the week', () => {
    const before = squad();
    const after = before.map((p) => (p.id === '2' ? { ...p, injuredWeeks: 3 } : p));
    expect(newlyInjuredStarters(before, after, byRating)).toEqual(['P2']);
  });

  it('ignores injuries to non-starters', () => {
    const before = squad();
    const after = before.map((p) => (p.id === '15' ? { ...p, injuredWeeks: 3 } : p));
    expect(newlyInjuredStarters(before, after, byRating)).toEqual([]);
  });

  it('ignores a starter already injured before the week', () => {
    const before = squad().map((p) => (p.id === '2' ? { ...p, injuredWeeks: 1 } : p));
    const after = before.map((p) => (p.id === '2' ? { ...p, injuredWeeks: 0 } : p));
    expect(newlyInjuredStarters(before, after, byRating)).toEqual([]);
  });

  it('is empty when nobody is injured', () => {
    expect(newlyInjuredStarters(squad(), squad(), byRating)).toEqual([]);
  });
});

describe('contractAlerts', () => {
  const EXP = 8; // MORALE.EXPIRING_WEEKS

  it('fires when a settled contract crosses into the expiring window', () => {
    const before = [mem('1', 50, { contractWeeks: EXP + 1 })];
    const after = [mem('1', 50, { contractWeeks: EXP })];
    expect(contractAlerts(before, after)).toEqual([`P1's contract is up in ${EXP} weeks.`]);
  });

  it('uses the singular for one week left', () => {
    const crossing = contractAlerts(
      [mem('1', 50, { contractWeeks: EXP + 1 })],
      [mem('1', 50, { contractWeeks: 1 })],
    );
    expect(crossing).toEqual(["P1's contract is up in 1 week."]);
  });

  it('does not repeat for a player who was already unsettled at the start', () => {
    const before = [mem('1', 50, { contractWeeks: 5 })];
    const after = [mem('1', 50, { contractWeeks: 4 })];
    expect(contractAlerts(before, after)).toEqual([]);
  });

  it('fires when an unsettled player leaves the squad at expiry', () => {
    const before = [mem('1', 50, { contractWeeks: 1 })];
    expect(contractAlerts(before, [])).toEqual(['P1 left the club (contract expired).']);
  });

  it('does not fire for a player who retires (contract still long)', () => {
    const before = [mem('1', 50, { contractWeeks: 30 })];
    expect(contractAlerts(before, [])).toEqual([]);
  });

  it('does not fire when an expiring contract is renewed (52 weeks)', () => {
    const before = [mem('1', 50, { contractWeeks: 1 })];
    const after = [mem('1', 50, { contractWeeks: 52 })];
    expect(contractAlerts(before, after)).toEqual([]);
  });
});

describe('postWeekStop', () => {
  const quiet = { injuredStarters: [], contractAlerts: [], bankruptcyWarned: false };

  it('returns null when nothing needs attention', () => {
    expect(postWeekStop(quiet)).toBeNull();
  });

  it('stops for a new event card, after every other reason (#75)', () => {
    expect(postWeekStop({ ...quiet, newDecisions: ['Fan day'] })).toEqual({ kind: 'decision', text: 'Decision needed: Fan day.' });
    expect(postWeekStop({ ...quiet, newDecisions: ['Fan day'], contractAlerts: ['x'] })?.kind).toBe('contract');
    expect(postWeekStop({ ...quiet, newDecisions: [] })).toBeNull();
  });

  it('stops on a bankruptcy warning', () => {
    expect(postWeekStop({ ...quiet, bankruptcyWarned: true })?.kind).toBe('bankruptcy');
  });

  it('stops on an injury to a regular starter and names them', () => {
    const r = postWeekStop({ ...quiet, injuredStarters: ['Smith', 'Jones'] });
    expect(r?.kind).toBe('injury');
    expect(r?.text).toContain('Smith, Jones');
  });

  it('stops on a contract alert', () => {
    const r = postWeekStop({ ...quiet, contractAlerts: ["Smith's contract is up in 8 weeks."] });
    expect(r?.kind).toBe('contract');
    expect(r?.text).toBe("Smith's contract is up in 8 weeks.");
  });

  it('reports the highest-priority event when several fire in one week', () => {
    const r = postWeekStop({
      injuredStarters: ['Smith'],
      contractAlerts: ['Jones left'],
      bankruptcyWarned: true,
    });
    expect(r?.kind).toBe('bankruptcy');
    expect(postWeekStop({ ...quiet, injuredStarters: ['Smith'], contractAlerts: ['x'] })?.kind).toBe('injury');
  });
});

describe('targetReached', () => {
  const base = { weeksPlayed: 0, week: 1, startSeason: 1, season: 1 };

  it('weeks: met after exactly n weeks', () => {
    const t = { kind: 'weeks', weeks: 4 } as const;
    expect(targetReached(t, { ...base, weeksPlayed: 3 })).toBe(false);
    expect(targetReached(t, { ...base, weeksPlayed: 4 })).toBe(true);
  });

  it('finals: met on reaching the first finals week, not before', () => {
    expect(FINALS_START_WEEK).toBe(SEASON_ROUNDS + 1);
    expect(targetReached({ kind: 'finals' }, { ...base, weeksPlayed: 5, week: FINALS_START_WEEK - 1 })).toBe(false);
    expect(targetReached({ kind: 'finals' }, { ...base, weeksPlayed: 24, week: FINALS_START_WEEK })).toBe(true);
  });

  it('finals: does not count as met before any week is played', () => {
    expect(targetReached({ kind: 'finals' }, { ...base, weeksPlayed: 0, week: FINALS_START_WEEK })).toBe(false);
  });

  it('seasonEnd: met on rollover (season changes), not mid-season', () => {
    expect(targetReached({ kind: 'seasonEnd' }, { ...base, weeksPlayed: WEEKS_PER_SEASON - 1, week: WEEKS_PER_SEASON })).toBe(false);
    expect(targetReached({ kind: 'seasonEnd' }, { ...base, weeksPlayed: WEEKS_PER_SEASON, week: 1, season: 2 })).toBe(true);
  });
});

describe('targetLabel', () => {
  it('labels each target for the completion toast', () => {
    expect(targetLabel({ kind: 'weeks', weeks: 4 })).toBe('4 weeks');
    expect(targetLabel({ kind: 'finals' })).toBe('to finals');
    expect(targetLabel({ kind: 'seasonEnd' })).toBe('to season end');
  });
});
