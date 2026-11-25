// src/art/match/ground.ts — which ground a fixture is played on (#824).
//
// Home matches use the club's saved buildings and that fixture's gate
// (economy.homeGate, read only). Away matches use the home club's league:
// a small stand in Local, the full ground in the Premier League. A save with
// no league ladder (Classic) treats every away ground as Premier, the one
// league that mode has. The art worker never imports this: it receives the
// plain GroundLook.
import { divisionForClub } from '../../data/competitionDivisions';
import { tierForRank, type FinanceTier } from '../../data/financeRules';
import type { Fixture, GameState } from '../../core/state';
import { homeGate } from '../../systems/economy';
import { CLASSIC_GROUND, type GroundLevel, type GroundLook } from './stadium';

/** How an away ground reads, by the home club's league. Fill is the picture, not the gate. */
const AWAY_GROUND: Record<FinanceTier, GroundLook> = {
  local: { stand: 1, sponsor: 1, canteen: 1, fill: 0.72 },
  championship: { stand: 2, sponsor: 2, canteen: 2, fill: 0.86 },
  premier: { stand: 3, sponsor: 3, canteen: 3, fill: 1 },
};

function builtLevel(state: GameState, defId: 'grandstand' | 'sponsorBoard' | 'canteen'): GroundLevel {
  const n = state.facilities.reduce((m, f) => (f.defId === defId ? Math.max(m, f.level) : m), 0);
  return n >= 3 ? 3 : n === 2 ? 2 : n === 1 ? 1 : 0;
}

function hostTier(state: GameState, hostId: string): FinanceTier {
  const world = state.competitions?.world;
  const instances = state.competitions?.instances;
  if (!world || !instances) return 'premier';
  const found = divisionForClub(world, instances, hostId);
  const rank = found?.division.rank;
  return rank === 0 || rank === 1 || rank === 2 ? tierForRank(rank) : 'premier';
}

function isNeutral(state: GameState, fixture: Fixture): boolean {
  if (!fixture.competitionId || !fixture.id) return false;
  const instance = state.competitions?.instances.find((i) => i.id === fixture.competitionId);
  return instance?.fixtures.find((f) => f.id === fixture.id)?.neutral === true;
}

/** The ground drawn for `fixture` from the saved club. The same save draws the same ground. */
export function groundForMatch(state: GameState, fixture: Fixture | undefined): GroundLook {
  if (!fixture) return CLASSIC_GROUND;
  const home = fixture.homeId === state.clubId && !isNeutral(state, fixture);
  if (!home) return AWAY_GROUND[hostTier(state, fixture.homeId)];
  const gate = homeGate(state, fixture);
  const fill = gate.capacity > 0 ? gate.attendance / gate.capacity : 0;
  return {
    stand: builtLevel(state, 'grandstand'),
    sponsor: builtLevel(state, 'sponsorBoard'),
    canteen: builtLevel(state, 'canteen'),
    fill,
  };
}

/** The away picture for a tier, for tests that do not build a whole career. */
export function awayGround(tier: FinanceTier): GroundLook {
  return AWAY_GROUND[tier];
}
