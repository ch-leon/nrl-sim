import { describe, it, expect, beforeEach } from 'vitest';
import {
  objectiveRisk, worstObjective, ladderStanding, RISK_WORD, RISK_ROUNDS_LEFT, BUILD_RISK_WEEKS, BUILD_OFF_WEEKS,
} from '../../src/systems/board';
import { initLeague, PLAYER_ID } from '../../src/systems/fixtures';
import { createNewGame, getState, type Fixture, type GameState, type LadderRow, type Objective } from '../../src/core/state';
import { bus } from '../../src/core/events';
import { WEEKS_PER_SEASON } from '../../src/config';

beforeEach(() => bus.clear());

const base = (): GameState => {
  createNewGame('Test FC', 7);
  initLeague(getState());
  return getState();
};

const row = (clubId: string, points: number): LadderRow => ({
  clubId, played: 1, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, points,
});

/**
 * The club on `mine` points with the rivals on `theirs` (best first, the rest on 0),
 * `roundsLeft` regular-season rounds still to play.
 */
const onLadder = (s: GameState, mine: number, theirs: number[], roundsLeft: number): GameState => {
  const rivals = s.league.clubs.filter((c) => c.id !== PLAYER_ID);
  const ladder = [row(PLAYER_ID, mine), ...rivals.map((c, i) => row(c.id, theirs[i] ?? 0))];
  const fixtures: Fixture[] = Array.from({ length: 24 }, (_, i) => ({
    round: i + 1, homeId: PLAYER_ID, awayId: rivals[i % rivals.length]!.id,
    ...(i < 24 - roundsLeft ? { result: { homeScore: 0, awayScore: 0 } } : {}),
  }));
  return { ...s, week: 25 - roundsLeft, league: { ...s.league, ladder, fixtures } };
};

const finals = (target: number): Objective => ({ id: 'f', kind: 'finals', text: `Finish in the top ${target}`, target, status: 'pending' });
const solvent = (target: number): Objective => ({ id: 's', kind: 'solvent', text: 'Stay solvent', target, status: 'pending' });
const build = (target: number): Objective => ({ id: 'b', kind: 'build', text: `Have ${target} facilities built`, target, status: 'pending' });
const rival = (rivalId: string): Objective => ({ id: 'r', kind: 'beatRival', text: 'Finish above them', target: 0, rivalId, status: 'pending' });

/** Ten rivals on 20 points, the rest on 0: the club on `mine` is 11th when under 20. */
const TEN_ON_20 = Array.from({ length: 10 }, () => 20);

describe('ladderStanding', () => {
  it('reads the club\'s place, points and regular-season rounds left', () => {
    const s = onLadder(base(), 14, TEN_ON_20, 6);
    const me = ladderStanding(s);
    expect(me.rank).toBe(11);
    expect(me.points).toBe(14);
    expect(me.pointsAt(8)).toBe(20);
    expect(me.roundsLeft).toBe(6);
  });

  it('has no place before a round is in', () => {
    expect(ladderStanding(base()).rank).toBe(0);
  });
});

describe('objectiveRisk: finals (#368)', () => {
  it('on track inside the target, or before a round is in', () => {
    expect(objectiveRisk(finals(8), onLadder(base(), 30, TEN_ON_20, 4))).toBe('on-track');
    expect(objectiveRisk(finals(8), base())).toBe('on-track');
  });

  it('below the target with plenty of rounds and a small gap: still on track', () => {
    // 11th, 6 points behind 8th, 16 rounds left: more than RISK_ROUNDS_LEFT, and 6 ≤ 16.
    expect(objectiveRisk(finals(8), onLadder(base(), 14, TEN_ON_20, 16))).toBe('on-track');
  });

  it('below the target with few rounds left: at risk', () => {
    expect(objectiveRisk(finals(8), onLadder(base(), 14, TEN_ON_20, RISK_ROUNDS_LEFT))).toBe('at-risk');
    expect(objectiveRisk(finals(8), onLadder(base(), 14, TEN_ON_20, RISK_ROUNDS_LEFT + 1))).toBe('on-track');
  });

  it('a gap bigger than the rounds left is at risk however early', () => {
    // 12 points behind with 11 rounds left: needs more than every other win.
    expect(objectiveRisk(finals(8), onLadder(base(), 8, TEN_ON_20, 11))).toBe('at-risk');
  });

  it('off track once the rounds left cannot close the gap (2 points a win)', () => {
    expect(objectiveRisk(finals(8), onLadder(base(), 14, TEN_ON_20, 3))).toBe('at-risk'); // 6 = 3 × 2
    expect(objectiveRisk(finals(8), onLadder(base(), 13, TEN_ON_20, 3))).toBe('off-track'); // 7 > 6
    expect(objectiveRisk(finals(8), onLadder(base(), 18, TEN_ON_20, 0))).toBe('off-track');
  });

  it('a judged objective is on track', () => {
    expect(objectiveRisk({ ...finals(8), status: 'missed' }, onLadder(base(), 0, TEN_ON_20, 0))).toBe('on-track');
  });
});

describe('objectiveRisk: beatRival (#368)', () => {
  it('on track above the rival; at risk or off track below by the points left', () => {
    const s0 = base();
    const top = s0.league.clubs.find((c) => c.id !== PLAYER_ID)!.id; // the first rival, on theirs[0]
    expect(objectiveRisk(rival(top), onLadder(s0, 30, [20], 10))).toBe('on-track');
    expect(objectiveRisk(rival(top), onLadder(base(), 16, [20], 10))).toBe('on-track'); // 4 behind, 10 left
    expect(objectiveRisk(rival(top), onLadder(base(), 16, [20], 3))).toBe('at-risk');
    expect(objectiveRisk(rival(top), onLadder(base(), 10, [20], 4))).toBe('off-track'); // 10 > 8
  });

  it('level on points but below him still counts against', () => {
    const s0 = base();
    const top = s0.league.clubs.find((c) => c.id !== PLAYER_ID)!.id;
    const s = onLadder(s0, 20, [20], 2);
    const ladder = s.league.ladder.map((r) => (r.clubId === top ? { ...r, pointsFor: 10 } : r));
    expect(objectiveRisk(rival(top), { ...s, league: { ...s.league, ladder } })).toBe('at-risk');
  });
});

describe('objectiveRisk: solvent (#368)', () => {
  const at = (money: number, week = 10): GameState => ({ ...base(), money, week });

  it('not losing money: on track above the floor, at risk under it', () => {
    expect(objectiveRisk(solvent(20_000), at(50_000), null)).toBe('on-track');
    expect(objectiveRisk(solvent(20_000), at(10_000), null)).toBe('at-risk');
  });

  it('losing money under the floor: off track', () => {
    expect(objectiveRisk(solvent(20_000), at(10_000), 5)).toBe('off-track');
  });

  it('above the floor: at risk when the runway reaches it before the season is judged', () => {
    // Week 10 of 27: 18 weeks to go. $50k at $2.5k a week (runway 20) ends at $5k.
    const weeksLeft = WEEKS_PER_SEASON - 10 + 1;
    expect(weeksLeft).toBe(18);
    expect(objectiveRisk(solvent(0), at(50_000), 20)).toBe('on-track');
    expect(objectiveRisk(solvent(20_000), at(50_000), 20)).toBe('at-risk');
    // Late in the season the same burn is fine.
    expect(objectiveRisk(solvent(20_000), at(50_000, 25), 20)).toBe('on-track');
  });
});

describe('objectiveRisk: build (#368)', () => {
  const withFacilities = (n: number, week: number): GameState => {
    const s = base();
    const one = s.facilities[0] ?? { id: 'x', defId: 'trainingPaddock' as const, level: 1 as const, x: 0, y: 0 };
    return { ...s, week, facilities: Array.from({ length: n }, (_, i) => ({ ...one, id: `f${i}` })) };
  };
  const weekWithLeft = (left: number): number => WEEKS_PER_SEASON - left + 1;

  it('met is on track; short is on track early, at risk late, off track at the end', () => {
    expect(objectiveRisk(build(3), withFacilities(3, weekWithLeft(2)))).toBe('on-track');
    expect(objectiveRisk(build(3), withFacilities(2, weekWithLeft(BUILD_RISK_WEEKS + 1)))).toBe('on-track');
    expect(objectiveRisk(build(3), withFacilities(2, weekWithLeft(BUILD_RISK_WEEKS)))).toBe('at-risk');
    expect(objectiveRisk(build(3), withFacilities(2, weekWithLeft(BUILD_OFF_WEEKS + 1)))).toBe('at-risk');
    expect(objectiveRisk(build(3), withFacilities(2, weekWithLeft(BUILD_OFF_WEEKS)))).toBe('off-track');
  });
});

describe('worstObjective (#368)', () => {
  it('picks the worst at risk or worse, the earlier on a tie; null when all are on track', () => {
    const s = onLadder(base(), 14, TEN_ON_20, 4); // finals at risk (6 behind, 4 left)
    const money = { ...s, money: 5_000 };
    expect(worstObjective({ ...money, objectives: [finals(12), solvent(0)] }, null)).toBeNull();
    expect(worstObjective({ ...money, objectives: [finals(12), finals(8)] }, null)?.objective.target).toBe(8);
    const both = { ...money, objectives: [finals(8), solvent(20_000)] };
    expect(worstObjective(both, null)).toEqual({ objective: finals(8), risk: 'at-risk' });
    expect(worstObjective(both, 3)).toEqual({ objective: solvent(20_000), risk: 'off-track' });
    expect(RISK_WORD).toEqual({ 'on-track': 'On track', 'at-risk': 'At risk', 'off-track': 'Off track' });
  });
});
