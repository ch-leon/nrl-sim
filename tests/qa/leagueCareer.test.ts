import type { GameState } from '../../src/core/state';
import { describe, expect, it } from 'vitest';
import { generateLeagueCareerUIFixtures, runLeagueCareerQA } from '../../src/qa/leagueCareer';

describe('production League career QA', () => {
  it.each(['au', 'uk'] as const)('%s plays and reloads real years one and two before entering year three', async pack => {
    const result = await runLeagueCareerQA({ pack, seed: 573, seasons: 2 });
    expect(result.problems).toEqual([]);
    expect(result.namespace).toBeNull();
    expect(result.initialUnsigned).toBe(12);
    expect(result.seasons.map(s => s.season)).toEqual([1, 2]);
    expect(result.finalSeason).toBe(3);
    expect(result.roundTrips).toBeGreaterThanOrEqual(6);
    expect(result.intervals).toBe(50);
    expect(result.matches).toBeGreaterThan(0);
    expect(result.seasons.every(s => s.receipts > 0 && s.annualSurvivors > 0)).toBe(true);
    expect(result.seasons.every(s => s.leagueId === result.initialLeagueId)).toBe(true);
  }, 180_000);
});

// Synthetic sporting scores only: these assertions do not claim real season wins.
it('creates normal annual UI saves for earned access, staying, moving down and returning after a losing year', async () => {
  const snapshots = new Map<string, GameState>();
  const result = await generateLeagueCareerUIFixtures({ pack: 'au', seed: 573,
    snapshot: (name, state) => { snapshots.set(name, state); } });
  expect(result.problems).toEqual([]);
  expect(result.evidence).toBe('controlled-sporting-results');
  expect(result.finalSeason).toBe(5);
  expect(result.seasons.map(s => s.premiership)).toEqual([true, true, true, false]);
  const beforeFinal = snapshots.get('season-1-before-final')!;
  expect(beforeFinal).toBeDefined();
  expect(beforeFinal.week).toBe(beforeFinal.competitions!.calendar!.slots.length);
  expect(beforeFinal.competitions!.leagueCareer!.phase).toBe('active');
  expect(beforeFinal.history).toHaveLength(0);
  const final = beforeFinal.competitions!.instances.flatMap(i => i.fixtures).find(f => f.slot === beforeFinal.week
    && (f.homeId === beforeFinal.clubId || f.awayId === beforeFinal.clubId));
  expect(final?.status).toBe('scheduled');
  expect(final?.result).toBeUndefined();
  const lost = snapshots.get('season-4-closed')!;
  expect(lost.history[3]).toMatchObject({ wins: 0, losses: 14, premiership: false });
  expect(lost.competitions!.leagueCareer!.access.map(a => a.leagueId)).toContain('au-championship');
  expect(snapshots.get('season-4-accepted')!.capAccount.tier).toBe('championship');
  expect(snapshots.get('season-5-accepted')!.competitions!.leagueCareer!.accepted!.leagueId).toBe('au-championship');
}, 180_000);
