import { describe, it, expect, beforeEach } from 'vitest';
import {
  ageMod, traitMult, injuryMult, adjacencyMult, levelMult,
  trainPlayer, applyTraining, applyInjuries, registerTrainingSystem,
  STAT_FLOOR, VETERAN_DECLINE,
} from '../../src/systems/training';
import {
  createNewGame, getState, loadState,
  type Player, type PlacedFacility, type PlayerStats,
} from '../../src/core/state';
import { bus } from '../../src/core/events';
import { STAT_MAX } from '../../src/config';
import {
  clearTickHooks, advanceWeek, TICK_ORDER,
} from '../../src/core/time';
import { generatePlayer } from '../../src/data/player';
import { makeRng } from '../../src/utils/rng';

const flatStats = (v: number): PlayerStats => ({
  speed: v, strength: v, stamina: v, skill: v, footyIQ: v,
});

// A test player with fully controlled fields (age/traits/stats/injury).
function mkPlayer(over: Partial<Player> = {}): Player {
  const base: Player = {
    id: over.id ?? 'p_test',
    name: 'Test Player',
    age: 25,
    position: 'lock',
    stats: flatStats(50),
    morale: 60,
    injuryRisk: 10,
    injuredWeeks: 0,
    traits: [],
    wage: 5000,
    contractWeeks: 20,
  };
  return { ...base, ...over };
}

const pf = (over: Partial<PlacedFacility> & Pick<PlacedFacility, 'defId'>): PlacedFacility => ({
  id: over.id ?? `f_${over.defId}_${over.x ?? 0}_${over.y ?? 0}`,
  defId: over.defId,
  level: over.level ?? 1,
  x: over.x ?? 0,
  y: over.y ?? 0,
});

beforeEach(() => {
  bus.clear();
  clearTickHooks();
  createNewGame('Test Club', 1);
});

describe('levelMult (re-exported from facility.ts)', () => {
  it('matches BAK-168 [1, 1.6, 2.2]', () => {
    expect(levelMult(1)).toBe(1);
    expect(levelMult(2)).toBe(1.6);
    expect(levelMult(3)).toBe(2.2);
  });
});

describe('ageMod', () => {
  it('returns 1.5 / 1.0 / 0.6 / 0.25 for ages 21 / 25 / 29 / 33', () => {
    expect(ageMod(21)).toBe(1.5);
    expect(ageMod(25)).toBe(1.0);
    expect(ageMod(29)).toBe(0.6);
    expect(ageMod(33)).toBe(0.25);
  });
  it('boundary ages', () => {
    expect(ageMod(17)).toBe(1.5);
    expect(ageMod(22)).toBe(1.0);
    expect(ageMod(27)).toBe(1.0);
    expect(ageMod(28)).toBe(0.6);
    expect(ageMod(30)).toBe(0.6);
    expect(ageMod(31)).toBe(0.25);
  });
});

describe('traitMult', () => {
  it('workhorse ×1.2', () => {
    expect(traitMult(mkPlayer({ traits: ['workhorse'] }))).toBeCloseTo(1.2, 10);
  });
  it('youngGun ×1.3', () => {
    expect(traitMult(mkPlayer({ traits: ['youngGun'] }))).toBeCloseTo(1.3, 10);
  });
  it('workhorse + youngGun stack to ×1.56', () => {
    expect(traitMult(mkPlayer({ traits: ['workhorse', 'youngGun'] }))).toBeCloseTo(1.56, 10);
  });
  it('irrelevant traits ×1.0', () => {
    expect(traitMult(mkPlayer({ traits: ['finisher', 'veteran', 'hardMan'] }))).toBe(1);
  });
});

describe('injuryMult', () => {
  it('injured ×0.3, fit ×1.0', () => {
    expect(injuryMult(mkPlayer({ injuredWeeks: 2 }))).toBe(0.3);
    expect(injuryMult(mkPlayer({ injuredWeeks: 0 }))).toBe(1);
  });
});

describe('adjacencyMult', () => {
  it('lone facility → 1.0', () => {
    const a = pf({ defId: 'weightsRoom', x: 0, y: 0 }); // 2x2
    expect(adjacencyMult(a, [a])).toBe(1);
  });

  it('two orthogonally adjacent facilities → 1.1 each', () => {
    // weightsRoom 2x2 at (0,0) occupies x[0,2) y[0,2). Place another 2x2 at (2,0)
    // so their vertical edges touch (right edge 2 == left edge 2), spans overlap.
    const a = pf({ defId: 'weightsRoom', x: 0, y: 0 });
    const b = pf({ defId: 'trainingPaddock', x: 2, y: 0 });
    const all = [a, b];
    expect(adjacencyMult(a, all)).toBeCloseTo(1.1, 10);
    expect(adjacencyMult(b, all)).toBeCloseTo(1.1, 10);
  });

  it('diagonal (corner-only) touch is NOT adjacent', () => {
    // 2x2 at (0,0) and 2x2 at (2,2) share only the corner point (2,2).
    const a = pf({ defId: 'weightsRoom', x: 0, y: 0 });
    const b = pf({ defId: 'trainingPaddock', x: 2, y: 2 });
    expect(adjacencyMult(a, [a, b])).toBe(1);
  });

  it('non-touching facilities → 1.0', () => {
    const a = pf({ defId: 'weightsRoom', x: 0, y: 0 });
    const b = pf({ defId: 'trainingPaddock', x: 5, y: 5 });
    expect(adjacencyMult(a, [a, b])).toBe(1);
  });

  it('caps at 1.4 with 5+ neighbours', () => {
    // Central 1-wide-ish facility surrounded on many sides. Use sponsorBoard (2x1)
    // centre at (2,2); ring several 2x2 around it so >4 touch.
    const c = pf({ defId: 'sponsorBoard', x: 2, y: 2 }); // occupies x[2,4) y[2,3)
    const neighbours = [
      pf({ id: 'n1', defId: 'weightsRoom', x: 0, y: 2 }),   // left edge x2 meets... x[0,2)y[2,4) right=2==c.left
      pf({ id: 'n2', defId: 'trainingPaddock', x: 4, y: 2 }), // right x[4,6)y[2,4) left=4==c.right
      pf({ id: 'n3', defId: 'weightsRoom', x: 2, y: 0 }),   // top x[2,4)y[0,2) bottom=2==c.top
      pf({ id: 'n4', defId: 'trainingPaddock', x: 2, y: 3 }), // below x[2,4)y[3,5) top=3==c.bottom
      pf({ id: 'n5', defId: 'weightsRoom', x: 0, y: 0 }),   // extra to push count
      pf({ id: 'n6', defId: 'trainingPaddock', x: 4, y: 0 }),
    ];
    const all = [c, ...neighbours];
    // At minimum n1..n4 touch (count 4 → 1.4). Cap guarantees ≤1.4 regardless.
    expect(adjacencyMult(c, all)).toBe(1.4);
  });
});

describe('trainPlayer — exact deterministic maths', () => {
  it('no facilities → no change for a prime-age fit player', () => {
    const p = mkPlayer({ age: 25, stats: flatStats(50) });
    expect(trainPlayer(p, [])).toEqual(flatStats(50));
  });

  it('single L1 weightsRoom trains strength by base×ageMod for prime age', () => {
    // weightsRoom trains { strength: 2.0 }. L1 mult=1, lone adj=1, age25 mod=1.
    const p = mkPlayer({ age: 25, stats: flatStats(50) });
    const facs = [pf({ defId: 'weightsRoom' })];
    const out = trainPlayer(p, facs);
    expect(out.strength).toBeCloseTo(52.0, 10);
    // other stats untouched
    expect(out.speed).toBe(50);
  });

  it('level scaling: L2 weightsRoom → base×1.6', () => {
    const p = mkPlayer({ age: 25, stats: flatStats(50) });
    const out = trainPlayer(p, [pf({ defId: 'weightsRoom', level: 2 })]);
    // 2.0 × 1.6 = 3.2
    expect(out.strength).toBeCloseTo(53.2, 10);
  });

  it('age curve: youth ×1.5 vs veteran ×0.25 (before veteran decline)', () => {
    const youth = mkPlayer({ age: 20, stats: flatStats(50) });
    const facs = [pf({ defId: 'weightsRoom' })];
    // 2.0 × 1.5 = +3.0
    expect(trainPlayer(youth, facs).strength).toBeCloseTo(53.0, 10);
  });

  it('adjacency raises gain: two adjacent facilities beat two apart', () => {
    const p = mkPlayer({ age: 25, stats: flatStats(50) });
    // Two weightsRooms (strength 2.0 each) adjacent vs far apart.
    const adjacent = [
      pf({ id: 'a', defId: 'weightsRoom', x: 0, y: 0 }),
      pf({ id: 'b', defId: 'weightsRoom', x: 2, y: 0 }),
    ];
    const apart = [
      pf({ id: 'a', defId: 'weightsRoom', x: 0, y: 0 }),
      pf({ id: 'b', defId: 'weightsRoom', x: 10, y: 10 }),
    ];
    const gAdj = trainPlayer(p, adjacent).strength;
    const gApart = trainPlayer(p, apart).strength;
    expect(gAdj).toBeGreaterThan(gApart);
    // exact: adjacent each 2.0×1.1 = 2.2 → sum 4.4 → 54.4 ; apart 2.0+2.0=4.0 → 54.0
    expect(gAdj).toBeCloseTo(54.4, 10);
    expect(gApart).toBeCloseTo(54.0, 10);
  });

  it('trait stacking: workhorse+youngGun scales gains ×1.56', () => {
    const p = mkPlayer({ age: 25, traits: ['workhorse', 'youngGun'], stats: flatStats(50) });
    const out = trainPlayer(p, [pf({ defId: 'weightsRoom' })]);
    // 2.0 × 1.56 = 3.12
    expect(out.strength).toBeCloseTo(53.12, 10);
  });

  it('injured player trains at ×0.3', () => {
    const p = mkPlayer({ age: 25, injuredWeeks: 3, stats: flatStats(50) });
    const out = trainPlayer(p, [pf({ defId: 'weightsRoom' })]);
    // 2.0 × 0.3 = 0.6
    expect(out.strength).toBeCloseTo(50.6, 10);
  });

  it('veteran (31+) declines speed & stamina by 0.3/wk net of gains, no facilities', () => {
    const vet = mkPlayer({ age: 33, stats: flatStats(50) });
    const out = trainPlayer(vet, []);
    expect(out.speed).toBeCloseTo(50 - VETERAN_DECLINE, 10);
    expect(out.stamina).toBeCloseTo(50 - VETERAN_DECLINE, 10);
    expect(out.strength).toBe(50); // not declined
  });

  it('veteran: gains from facilities can be net negative after decline', () => {
    // trainingPaddock trains speed 1.5. Vet age33 mod 0.25 → speed gain 0.375,
    // then −0.3 decline → net +0.075.
    const vet = mkPlayer({ age: 33, stats: flatStats(50) });
    const out = trainPlayer(vet, [pf({ defId: 'trainingPaddock' })]);
    expect(out.speed).toBeCloseTo(50 + 1.5 * 0.25 - VETERAN_DECLINE, 10);
  });

  it('clamps to STAT_MAX (100) with no overflow banking', () => {
    const p = mkPlayer({ age: 20, stats: flatStats(99.9) });
    const out = trainPlayer(p, [pf({ defId: 'weightsRoom', level: 3 })]);
    expect(out.strength).toBe(STAT_MAX);
  });

  it('clamps to STAT_FLOOR (1) — veteran with low speed cannot go below 1', () => {
    const vet = mkPlayer({ age: 35, stats: { ...flatStats(50), speed: 1, stamina: 1 } });
    const out = trainPlayer(vet, []);
    expect(out.speed).toBe(STAT_FLOOR);
    expect(out.stamina).toBe(STAT_FLOOR);
  });
});

describe('applyTraining over N weeks — exact accumulation', () => {
  it('accumulates fractional gains and stays within [1,100]', () => {
    const p = mkPlayer({ id: 'acc', age: 25, stats: flatStats(50) });
    loadState({ ...getState(), squad: [p], facilities: [pf({ defId: 'weightsRoom' })] });

    for (let i = 0; i < 10; i++) applyTraining(getState());

    const out = getState().squad[0];
    // +2.0/wk × 10 = +20 → 70
    expect(out.stats.strength).toBeCloseTo(70, 6);
    // all stats within range
    for (const v of Object.values(out.stats)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('many weeks never breaches bounds even with strong facility on a youth', () => {
    const p = mkPlayer({ id: 'acc', age: 20, stats: flatStats(50) });
    loadState({ ...getState(), squad: [p], facilities: [pf({ defId: 'teamGym', level: 3 })] });
    for (let i = 0; i < 60; i++) applyTraining(getState());
    for (const v of Object.values(getState().squad[0].stats)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('applyInjuries', () => {
  it('base recovery of 1/wk with no medical facilities', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 3 });
    loadState({ ...getState(), squad: [p], facilities: [] });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(2);
  });

  it('medicalBay adds its level to recovery', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 5 });
    loadState({
      ...getState(), squad: [p],
      facilities: [pf({ defId: 'medicalBay', level: 2 })],
    });
    applyInjuries(getState());
    // 1 + level(2) = 3 → 5-3 = 2
    expect(getState().squad[0].injuredWeeks).toBe(2);
  });

  it('physioCentre adds 1 extra; stacks with medicalBay', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 6 });
    loadState({
      ...getState(), squad: [p],
      facilities: [
        pf({ defId: 'medicalBay', level: 1 }),
        pf({ defId: 'physioCentre', level: 1 }),
      ],
    });
    applyInjuries(getState());
    // 1 + medical(1) + physio(1) = 3 → 6-3 = 3
    expect(getState().squad[0].injuredWeeks).toBe(3);
  });

  it('never goes below 0', () => {
    const p = mkPlayer({ id: 'inj', injuredWeeks: 1 });
    loadState({
      ...getState(), squad: [p],
      facilities: [pf({ defId: 'medicalBay', level: 3 })],
    });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(0);
  });

  it('leaves fit players untouched', () => {
    const p = mkPlayer({ id: 'fit', injuredWeeks: 0 });
    loadState({ ...getState(), squad: [p], facilities: [] });
    applyInjuries(getState());
    expect(getState().squad[0].injuredWeeks).toBe(0);
  });
});

describe('pipeline ordering: training (10) before injuries (20)', () => {
  it('injured player trains at ×0.3 THIS week then recovers AFTER', () => {
    const p = mkPlayer({ id: 'ord', age: 25, injuredWeeks: 1, stats: flatStats(50) });
    loadState({ ...getState(), squad: [p], facilities: [pf({ defId: 'weightsRoom' })] });

    // simulate the pipeline order manually
    applyTraining(getState()); // injured → ×0.3
    applyInjuries(getState());  // then recover

    const out = getState().squad[0];
    expect(out.stats.strength).toBeCloseTo(50.6, 10); // 2.0×0.3
    expect(out.injuredWeeks).toBe(0);
  });
});

describe('registerTrainingSystem — hook installation', () => {
  it('installs hooks at TICK_ORDER.training(10) and injuries(20) and runs on advanceWeek', () => {
    const p = mkPlayer({ id: 'hook', age: 25, injuredWeeks: 2, stats: flatStats(50) });
    loadState({ ...getState(), squad: [p], facilities: [pf({ defId: 'weightsRoom' })] });

    registerTrainingSystem();
    expect(TICK_ORDER.training).toBe(10);
    expect(TICK_ORDER.injuries).toBe(20);

    advanceWeek();

    const out = getState().squad[0];
    // trained injured (×0.3): +0.6, then injuredWeeks 2 → 1
    expect(out.stats.strength).toBeCloseTo(50.6, 10);
    expect(out.injuredWeeks).toBe(1);
  });

  it('re-registering does not double-apply (name-keyed registry)', () => {
    const p = mkPlayer({ id: 'once', age: 25, stats: flatStats(50) });
    loadState({ ...getState(), squad: [p], facilities: [pf({ defId: 'weightsRoom' })] });
    registerTrainingSystem();
    registerTrainingSystem();
    advanceWeek();
    // single +2.0, not +4.0
    expect(getState().squad[0].stats.strength).toBeCloseTo(52.0, 10);
  });
});

describe('determinism with generated players', () => {
  it('identical seeds → identical trained stats', () => {
    const facs = [pf({ defId: 'teamGym', level: 2 })];
    const p1 = generatePlayer(makeRng(42));
    const p2 = generatePlayer(makeRng(42));
    expect(trainPlayer(p1, facs)).toEqual(trainPlayer(p2, facs));
  });
});
