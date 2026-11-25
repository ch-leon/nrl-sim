// #824: the match-day ground follows the save. Home uses the buildings and the
// gate; away uses the home club's league. The same save draws the same ground.
import { describe, expect, it } from 'vitest';
import { buildNewGameState, type Fixture, type GameState } from '../../../src/core/state';
import { awayGround, groundForMatch } from '../../../src/art/match/ground';
import { homeGate } from '../../../src/systems/economy';
import { ECON } from '../../../src/config';

const home: Fixture = { round: 1, homeId: 'player', awayId: 'rival-reapers' };
const away: Fixture = { round: 1, homeId: 'rival-reapers', awayId: 'player' };

function withLeague(state: GameState, hostId: string, rank: 0 | 1 | 2, neutralId?: string): GameState {
  const fixtures = neutralId ? [{ id: neutralId, neutral: true }] : [];
  return {
    ...state,
    competitions: {
      schemaVersion: 1,
      instances: [{ id: 'div-i', entrantIds: [hostId], fixtures }],
      world: {
        profile: { id: 't', version: 1, pack: 'au', startingDivisionId: 'div' },
        divisions: [{ id: 'div', name: 'League', rank, ratingMean: 50, instanceId: 'div-i' }],
      },
    },
  } as GameState;
}

describe('the match-day ground (#824)', () => {
  it('a home hill fills in proportion to the gate, and a stand, board and canteen show on the ground', () => {
    const state = buildNewGameState('Hill FC', 4);
    const bare = groundForMatch(state, home);
    const gate = homeGate(state, home);
    expect(bare).toMatchObject({ stand: 0, sponsor: 0, canteen: 0 });
    expect(gate.capacity).toBe(ECON.CAPACITY[0]);
    expect(bare.fill).toBeCloseTo(gate.attendance / gate.capacity, 5);
    expect(bare.fill).toBeGreaterThan(0);
    expect(bare.fill).toBeLessThan(1);

    const built: GameState = {
      ...state,
      facilities: [
        { id: 'g', defId: 'grandstand', level: 3, x: 0, y: 0 },
        { id: 's', defId: 'sponsorBoard', level: 2, x: 2, y: 0 },
        { id: 'c', defId: 'canteen', level: 1, x: 4, y: 0 },
      ],
    };
    const stand = groundForMatch(built, home);
    const bigger = homeGate(built, home);
    expect(stand).toMatchObject({ stand: 3, sponsor: 2, canteen: 1 });
    expect(bigger.capacity).toBe(ECON.CAPACITY[3]);
    expect(stand.fill).toBeCloseTo(bigger.attendance / bigger.capacity, 5);
    expect(stand.fill).toBeLessThan(bare.fill);
    const reloaded = groundForMatch(JSON.parse(JSON.stringify(built)) as GameState, home);
    expect(reloaded).toEqual(stand);
  });

  it('an away ground follows the home club’s league, not what the player has built', () => {
    const state = buildNewGameState('Travellers', 9);
    state.facilities = [{ id: 'g', defId: 'grandstand', level: 1, x: 0, y: 0 }];
    expect(groundForMatch(state, away)).toEqual(awayGround('premier'));
    expect(groundForMatch(withLeague(state, 'rival-local', 0), { ...away, homeId: 'rival-local' })).toEqual(awayGround('local'));
    expect(groundForMatch(withLeague(state, 'rival-champ', 1), { ...away, homeId: 'rival-champ' })).toEqual(awayGround('championship'));
    expect(awayGround('local').stand).toBeLessThan(awayGround('championship').stand);
    expect(awayGround('championship').stand).toBeLessThan(awayGround('premier').stand);
  });

  it('a neutral venue does not wear the player’s grandstand', () => {
    const state = buildNewGameState('Neutrals', 3);
    state.facilities = [
      { id: 'g', defId: 'grandstand', level: 3, x: 0, y: 0 },
      { id: 'c', defId: 'canteen', level: 3, x: 2, y: 0 },
    ];
    const fixture: Fixture = { id: 'final', competitionId: 'div-i', round: 20, homeId: 'player', awayId: 'rival-reapers' };
    const ground = groundForMatch(withLeague(state, 'player', 0, 'final'), fixture);
    expect(ground).toEqual(awayGround('local'));
  });
});
