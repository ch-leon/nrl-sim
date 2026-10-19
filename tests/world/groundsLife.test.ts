import { describe, it, expect } from 'vitest';
import { WalkGrid, findPath } from '../../src/world/path';
import {
  planLife,
  moodFor,
  busyAgents,
  weekSeed,
  facilitySpots,
  reachableCells,
  MAX_AGENTS,
  MAX_FANS,
  type LifeFacility,
  type LifeInput,
  type LifePlayer,
} from '../../src/world/groundsLife';
import { FACILITY_CATALOG, type FacilityDefId } from '../../src/data/facility';

const W = 20;
const H = 20;

function squad(n: number, injured: number[] = [], morale = 60): LifePlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `pl-${String(i).padStart(2, '0')}`,
    name: `Player ${i}`,
    morale,
    injuredWeeks: injured.includes(i) ? 3 : 0,
  }));
}

/** Facilities laid out on a spaced diagonal so every one has open walkable edges. */
function layout(ids: FacilityDefId[]): { grid: WalkGrid; facilities: LifeFacility[] } {
  const grid = new WalkGrid(W, H);
  const facilities: LifeFacility[] = ids.map((defId, i) => ({
    id: `f${String(i).padStart(2, '0')}`,
    defId,
    x: 1 + (i % 4) * 5,
    y: 1 + Math.floor(i / 4) * 5,
  }));
  for (const f of facilities) {
    const { w, h } = FACILITY_CATALOG[f.defId].footprint;
    for (let x = f.x; x < f.x + w; x++) for (let y = f.y; y < f.y + h; y++) grid.setBlocked(x, y, true);
  }
  return { grid, facilities };
}

const SIX: FacilityDefId[] = ['trainingPaddock', 'weightsRoom', 'canteen', 'physioCentre', 'videoRoom', 'medicalBay'];

function input(over: Partial<LifeInput> = {}, ids: FacilityDefId[] = SIX): LifeInput {
  const { grid, facilities } = layout(ids);
  return { season: 1, week: 3, grid, facilities, squad: squad(24), matchWeek: false, ...over };
}

describe('planLife', () => {
  it('is deterministic for the same week and differs between weeks', () => {
    const a = planLife(input());
    expect(planLife(input())).toEqual(a);
    expect(planLife(input({ week: 4 }))).not.toEqual(a);
    expect(weekSeed(1, 3)).toBe(weekSeed(1, 3));
    expect(weekSeed(1, 3)).not.toBe(weekSeed(2, 3));
  });

  it('has at least 6 busy characters with 6+ facilities', () => {
    const agents = planLife(input());
    expect(busyAgents(agents).length).toBeGreaterThanOrEqual(6);
    // ...and every one of them starts at a facility stop with a facility id.
    for (const a of busyAgents(agents)) expect(a.stops[0]!.facilityId).toBeDefined();
  });

  it('gives every player-usable facility a regular before repeating', () => {
    const agents = planLife(input());
    const firstAt = new Set(agents.filter((a) => a.role === 'player').map((a) => a.stops[0]!.facilityId));
    for (const f of ['f00', 'f01', 'f02', 'f03', 'f04']) expect(firstAt.has(f)).toBe(true);
  });

  it('respects the cap, even with a huge squad, every facility and fans', () => {
    const all = Object.keys(FACILITY_CATALOG) as FacilityDefId[];
    const agents = planLife(input({ squad: squad(80, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), matchWeek: true }, all));
    expect(agents.length).toBeLessThanOrEqual(MAX_AGENTS);
    expect(agents.filter((a) => a.role === 'fan').length).toBeLessThanOrEqual(MAX_FANS);
  });

  it('scales with squad size and facility count', () => {
    const none = planLife(input({ squad: squad(24) }, []));
    const some = planLife(input({ squad: squad(24) }, SIX.slice(0, 2)));
    const many = planLife(input({ squad: squad(24) }, SIX));
    expect(none.length).toBeLessThan(some.length);
    expect(some.length).toBeLessThan(many.length);
    expect(planLife(input({ squad: squad(3) })).filter((a) => a.role === 'player')).toHaveLength(3);
  });

  it('only targets walkable, reachable cells outside every footprint, with a path from the spawn', () => {
    const inp = input({ matchWeek: true, squad: squad(24, [2, 5]) });
    const reach = new Set(reachableCells(inp.grid).map((c) => `${c.x},${c.y}`));
    for (const a of planLife(inp)) {
      for (const s of a.stops) {
        expect(inp.grid.isWalkable(s.cell.x, s.cell.y)).toBe(true);
        expect(reach.has(`${s.cell.x},${s.cell.y}`)).toBe(true);
      }
      const [first, ...rest] = a.stops;
      for (const s of rest) {
        if (s.cell.x === first!.cell.x && s.cell.y === first!.cell.y) continue;
        expect(findPath(inp.grid, first!.cell, s.cell).length).toBeGreaterThan(0);
      }
    }
  });

  it('never picks a walled-in pocket as a target', () => {
    const grid = new WalkGrid(W, H);
    // Wall off the cell (10,10) completely.
    for (const [x, y] of [[9, 10], [11, 10], [10, 9], [10, 11]] as const) grid.setBlocked(x, y, true);
    const agents = planLife({ season: 1, week: 1, grid, facilities: [], squad: squad(10), matchWeek: false });
    for (const a of agents) for (const s of a.stops) expect(`${s.cell.x},${s.cell.y}`).not.toBe('10,10');
  });

  it('sends injured players to the medical bay and keeps them in the cast', () => {
    const inp = input({ squad: squad(40, [1, 7, 30]) });
    const agents = planLife(inp);
    const bay = inp.facilities.find((f) => f.defId === 'medicalBay')!;
    for (const id of ['pl-01', 'pl-07', 'pl-30']) {
      const a = agents.find((x) => x.lookKey === id)!;
      expect(a, id).toBeDefined();
      expect(a.injured).toBe(true);
      expect(a.mood.limp).toBe(true);
      expect(a.stops[0]!.kind).toBe('treat');
      expect(a.stops[0]!.facilityId).toBe(bay.id);
    }
  });

  it('falls back to the physio centre, then a slow wander, when there is no medical bay', () => {
    const withPhysio = planLife(input({ squad: squad(10, [0]) }, ['physioCentre', 'canteen']));
    expect(withPhysio.find((a) => a.lookKey === 'pl-00')!.stops[0]!.kind).toBe('treat');
    const neither = planLife(input({ squad: squad(10, [0]) }, ['canteen']));
    const a = neither.find((x) => x.lookKey === 'pl-00')!;
    expect(a.injured).toBe(true);
    expect(a.stops[0]!.kind).toBe('rest');
  });

  it('assigns the activity for each facility type', () => {
    const expected: [FacilityDefId, string][] = [
      ['weightsRoom', 'lift'],
      ['trainingPaddock', 'drill'],
      ['canteen', 'sit'],
      ['physioCentre', 'treat'],
      ['videoRoom', 'video'],
    ];
    for (const [def, kind] of expected) {
      const agents = planLife(input({ squad: squad(8) }, [def]));
      const player = agents.find((a) => a.role === 'player')!;
      expect(player.stops[0]!.kind).toBe(kind);
    }
  });

  it('puts fans at the grandstand in match week only', () => {
    const ids: FacilityDefId[] = ['grandstand', 'canteen', 'weightsRoom'];
    expect(planLife(input({ matchWeek: false }, ids)).some((a) => a.role === 'fan')).toBe(false);
    const inp = input({ matchWeek: true }, ids);
    const fans = planLife(inp).filter((a) => a.role === 'fan');
    expect(fans.length).toBeGreaterThanOrEqual(4);
    const stand = inp.facilities.find((f) => f.defId === 'grandstand')!;
    const ring = new Set(facilitySpots(stand, new Set(reachableCells(inp.grid).map((c) => `${c.x},${c.y}`))).map((s) => `${s.cell.x},${s.cell.y}`));
    for (const f of fans) for (const s of f.stops) expect(ring.has(`${s.cell.x},${s.cell.y}`)).toBe(true);
  });

  it('gathers fans by the gate when there is no grandstand', () => {
    const fans = planLife(input({ matchWeek: true, gate: { x: 10, y: 1 } }, ['canteen'])).filter((a) => a.role === 'fan');
    expect(fans.length).toBeGreaterThan(0);
    for (const f of fans) for (const s of f.stops) expect(Math.abs(s.cell.x - 10) + Math.abs(s.cell.y - 1)).toBeLessThanOrEqual(5);
  });

  it('does not mutate its input', () => {
    const inp = input({ squad: squad(12, [3]) });
    const before = JSON.stringify({ f: inp.facilities, s: inp.squad });
    planLife(inp);
    expect(JSON.stringify({ f: inp.facilities, s: inp.squad })).toBe(before);
  });
});

describe('moodFor', () => {
  it('limps and slows when injured', () => {
    const m = moodFor(90, true);
    expect(m.limp).toBe(true);
    expect(m.speedMul).toBeLessThan(0.7);
    expect(m.emote).toBe('cross');
  });
  it('slumps with a rain cloud at low morale and springs at high morale', () => {
    const low = moodFor(20, false);
    const high = moodFor(90, false);
    const mid = moodFor(60, false);
    expect(low.slump).toBe(true);
    expect(low.emote).toBe('cloud');
    expect(low.speedMul).toBeLessThan(mid.speedMul);
    expect(high.bounce).toBeGreaterThan(mid.bounce);
    expect(high.speedMul).toBeGreaterThan(mid.speedMul);
  });
});

describe('after a facility moves (#78)', () => {
  it('re-plans around the new footprint and can use the freed tiles', () => {
    const base = input();
    const moved = base.facilities.map((f) => (f.id === 'f01' ? { ...f, x: 12, y: 14 } : f));
    // Same rule as GroundsScene.syncWalkGrid: exactly the tiles under facilities are blocked.
    const grid = new WalkGrid(W, H);
    for (const f of moved) {
      const { w, h } = FACILITY_CATALOG[f.defId].footprint;
      for (let x = f.x; x < f.x + w; x++) for (let y = f.y; y < f.y + h; y++) grid.setBlocked(x, y, true);
    }
    const old = base.facilities.find((f) => f.id === 'f01')!;
    expect(grid.isWalkable(old.x, old.y)).toBe(true);
    const { w, h } = FACILITY_CATALOG[old.defId].footprint;
    for (const a of planLife({ ...base, grid, facilities: moved })) {
      for (const s of a.stops) {
        expect(grid.isWalkable(s.cell.x, s.cell.y)).toBe(true);
        const inside = s.cell.x >= 12 && s.cell.x < 12 + w && s.cell.y >= 14 && s.cell.y < 14 + h;
        expect(inside).toBe(false);
      }
    }
  });
});
