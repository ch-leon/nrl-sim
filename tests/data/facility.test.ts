import { describe, it, expect } from 'vitest';
import {
  FACILITY_CATALOG,
  LEVEL_MULT,
  SPECIAL_MAGNITUDE,
  levelMult,
  upgradeCost,
  effectiveTrains,
  type FacilityDefId,
} from '../../src/data/facility';

const IDS: FacilityDefId[] = [
  'trainingPaddock', 'weightsRoom', 'videoRoom', 'physioCentre',
  'canteen', 'sponsorBoard', 'grandstand', 'academy',
  'coachsOffice', 'scoutOffice', 'medicalBay', 'teamGym',
];

describe('FACILITY_CATALOG', () => {
  it('contains exactly the 12 listed ids', () => {
    expect(Object.keys(FACILITY_CATALOG).sort()).toEqual([...IDS].sort());
    expect(Object.keys(FACILITY_CATALOG)).toHaveLength(12);
  });

  it('each entry key matches its id', () => {
    for (const id of IDS) expect(FACILITY_CATALOG[id].id).toBe(id);
  });

  it('is JSON round-trippable with no data loss', () => {
    const rt = JSON.parse(JSON.stringify(FACILITY_CATALOG));
    expect(rt).toEqual(FACILITY_CATALOG);
  });

  it('has the exact spec numbers', () => {
    expect(FACILITY_CATALOG.trainingPaddock).toMatchObject({
      cost: 8000, footprint: { w: 2, h: 2 }, trains: { speed: 1.5, stamina: 1.0 },
    });
    expect(FACILITY_CATALOG.weightsRoom).toMatchObject({
      cost: 15000, trains: { strength: 2.0 },
      adjacency: { near: 'trainingPaddock', bonusMult: 1.25 },
    });
    expect(FACILITY_CATALOG.videoRoom).toMatchObject({
      cost: 18000, trains: { footyIQ: 2.0 },
      adjacency: { near: 'coachsOffice', bonusMult: 1.25 },
    });
    expect(FACILITY_CATALOG.physioCentre).toMatchObject({
      cost: 22000, trains: { stamina: 1.5 }, special: 'injuryRecovery',
      adjacency: { near: 'medicalBay', bonusMult: 1.25 },
    });
    expect(FACILITY_CATALOG.canteen).toMatchObject({ cost: 12000, special: 'morale' });
    expect(FACILITY_CATALOG.sponsorBoard).toMatchObject({
      cost: 10000, footprint: { w: 2, h: 1 }, special: 'income',
    });
    expect(FACILITY_CATALOG.grandstand).toMatchObject({
      cost: 120000, footprint: { w: 3, h: 3 }, special: 'gate',
    });
    expect(FACILITY_CATALOG.academy).toMatchObject({
      cost: 60000, footprint: { w: 3, h: 3 }, trains: { skill: 1.0, footyIQ: 1.0 },
      special: 'recruitQuality', adjacency: { near: 'coachsOffice', bonusMult: 1.25 },
    });
    expect(FACILITY_CATALOG.coachsOffice).toMatchObject({
      cost: 30000, trains: { footyIQ: 1.0, skill: 1.0 }, special: 'morale',
    });
    expect(FACILITY_CATALOG.scoutOffice).toMatchObject({ cost: 25000, special: 'recruitQuality' });
    expect(FACILITY_CATALOG.medicalBay).toMatchObject({ cost: 35000, special: 'injuryRecovery' });
    expect(FACILITY_CATALOG.teamGym).toMatchObject({
      cost: 40000, footprint: { w: 3, h: 3 },
      trains: { strength: 1.5, speed: 1.0, stamina: 1.5 },
      adjacency: { near: 'weightsRoom', bonusMult: 1.2 },
    });
  });

  it('Grandstand is the most expensive; min cost is 8000', () => {
    const costs = IDS.map((id) => FACILITY_CATALOG[id].cost);
    expect(Math.max(...costs)).toBe(FACILITY_CATALOG.grandstand.cost);
    expect(Math.max(...costs)).toBe(120000);
    expect(Math.min(...costs)).toBe(8000);
  });
});

describe('SPECIAL_MAGNITUDE', () => {
  it('exports the documented base magnitudes', () => {
    expect(SPECIAL_MAGNITUDE).toEqual({
      income: 1500, gate: 4000, recruitQuality: 0.1, injuryRecovery: -0.5, morale: 1,
    });
  });
});

describe('levelMult / LEVEL_MULT', () => {
  it('LEVEL_MULT is [1, 1.6, 2.2]', () => {
    expect(LEVEL_MULT).toEqual([1, 1.6, 2.2]);
  });
  it('levelMult returns 1, 1.6, 2.2 for 1,2,3', () => {
    expect(levelMult(1)).toBe(1);
    expect(levelMult(2)).toBe(1.6);
    expect(levelMult(3)).toBe(2.2);
  });
});

describe('upgradeCost', () => {
  it('equals def.cost * level', () => {
    const def = FACILITY_CATALOG.weightsRoom;
    expect(upgradeCost(def, 1)).toBe(15000);
    expect(upgradeCost(def, 2)).toBe(30000);
    expect(upgradeCost(def, 3)).toBe(45000);
  });
});

describe('effectiveTrains', () => {
  it('scales trains by level multiplier', () => {
    const def = FACILITY_CATALOG.weightsRoom; // strength 2.0
    expect(effectiveTrains(def, 1, false)).toEqual({ strength: 2.0 });
    expect(effectiveTrains(def, 2, false)).toEqual({ strength: 3.2 });
    expect(effectiveTrains(def, 3, false)).toEqual({ strength: 4.4 });
  });

  it('applies adjacency multiplier only when active', () => {
    const def = FACILITY_CATALOG.weightsRoom; // strength 2.0, adj x1.25
    expect(effectiveTrains(def, 1, true)).toEqual({ strength: 2.5 });
    // level 2 x1.6 x1.25 = 4.0
    expect(effectiveTrains(def, 2, true)).toEqual({ strength: 4.0 });
  });

  it('ignores adjacency for facilities without an adjacency rule', () => {
    const def = FACILITY_CATALOG.trainingPaddock; // no adjacency
    expect(effectiveTrains(def, 1, true)).toEqual(effectiveTrains(def, 1, false));
  });

  it('returns {} for facilities with no trains', () => {
    expect(effectiveTrains(FACILITY_CATALOG.grandstand, 3, true)).toEqual({});
    expect(effectiveTrains(FACILITY_CATALOG.canteen, 2, true)).toEqual({});
  });

  it('rounds each result to 1 decimal place', () => {
    const def = FACILITY_CATALOG.trainingPaddock; // speed 1.5, stamina 1.0
    // level 3 x2.2: speed 3.3, stamina 2.2
    expect(effectiveTrains(def, 3, false)).toEqual({ speed: 3.3, stamina: 2.2 });
  });
});
