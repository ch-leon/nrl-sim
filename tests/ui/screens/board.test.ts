// tests/ui/screens/board.test.ts — Staff & Board (3k): how each board objective
// stands, read the way the board will at the season's end. Pure; no DOM.
import { describe, it, expect } from 'vitest';
import { objectiveStatus, OBJECTIVE_STATUS_LABEL } from '../../../src/ui/screens/board';
import type { GameState, LadderRow, Objective } from '../../../src/core/state';

const row = (clubId: string, played = 2): LadderRow => ({ clubId, played, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points: 0 });
const club = (ids: string[], played = 2): Pick<GameState, 'money' | 'facilities' | 'league' | 'clubId'> =>
  ({ money: 50000, facilities: [{}, {}], clubId: 'player', league: { ladder: ids.map((id) => row(id, played)) } } as never);
const obj = (kind: Objective['kind'], target: number, extra: Partial<Objective> = {}): Objective => ({ id: kind, kind, text: kind, target, status: 'pending', ...extra });

describe('objectiveStatus (3k)', () => {
  it('a reviewed objective is MET or FAILED', () => {
    expect(objectiveStatus(obj('finals', 8, { status: 'met' }), club(['player']))).toBe('met');
    expect(objectiveStatus(obj('finals', 8, { status: 'missed' }), club(['player']))).toBe('failed');
  });

  it('the finals target: on track inside it, at risk outside, pending before a ball is kicked', () => {
    expect(objectiveStatus(obj('finals', 2), club(['a', 'player', 'b']))).toBe('on-track');
    expect(objectiveStatus(obj('finals', 1), club(['a', 'player', 'b']))).toBe('at-risk');
    expect(objectiveStatus(obj('finals', 1), club(['player', 'a'], 0))).toBe('pending');
  });

  it('the bank, the facilities and the rival, as they stand today', () => {
    expect(objectiveStatus(obj('solvent', 50000), club(['player']))).toBe('on-track');
    expect(objectiveStatus(obj('solvent', 60000), club(['player']))).toBe('at-risk');
    expect(objectiveStatus(obj('build', 2), club(['player']))).toBe('on-track');
    expect(objectiveStatus(obj('build', 3), club(['player']))).toBe('at-risk');
    expect(objectiveStatus(obj('beatRival', 0, { rivalId: 'r' }), club(['player', 'r']))).toBe('on-track');
    expect(objectiveStatus(obj('beatRival', 0, { rivalId: 'r' }), club(['r', 'player']))).toBe('at-risk');
  });

  it('every status has its chip', () => {
    expect(Object.values(OBJECTIVE_STATUS_LABEL)).toEqual(['On track', 'At risk', 'Pending', 'Met', 'Failed', 'Off track']);
  });
});
