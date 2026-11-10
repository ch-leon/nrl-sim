import { describe, it, expect } from 'vitest';
import {
  FACILITY_CATALOG,
  LEVEL_MULT,
  SPECIAL_MAGNITUDE,
  UPKEEP_LEVEL_MULT,
  levelMult,
  upgradeCost,
  facilityUpkeep,
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
      cost: 8000, footprint: { w: 2, h: 2 }, training: true,
    });
    expect(FACILITY_CATALOG.weightsRoom).toMatchObject({
      cost: 15000, training: true,
    });
    expect(FACILITY_CATALOG.videoRoom).toMatchObject({
      cost: 18000, training: true,
    });
    expect(FACILITY_CATALOG.physioCentre).toMatchObject({
      cost: 22000, training: true, special: 'injuryRecovery',
    });
    expect(FACILITY_CATALOG.canteen).toMatchObject({ cost: 12000, special: 'morale' });
    expect(FACILITY_CATALOG.sponsorBoard).toMatchObject({
      cost: 10000, footprint: { w: 2, h: 1 }, special: 'income',
    });
    expect(FACILITY_CATALOG.grandstand).toMatchObject({
      cost: 120000, footprint: { w: 3, h: 3 }, special: 'gate',
    });
    expect(FACILITY_CATALOG.academy).toMatchObject({
      cost: 60000, footprint: { w: 3, h: 3 }, training: true,
      special: 'recruitQuality',
    });
    expect(FACILITY_CATALOG.coachsOffice).toMatchObject({
      cost: 30000, training: true, special: 'morale',
    });
    expect(FACILITY_CATALOG.scoutOffice).toMatchObject({ cost: 25000, special: 'recruitQuality' });
    expect(FACILITY_CATALOG.medicalBay).toMatchObject({ cost: 35000, special: 'injuryRecovery' });
    expect(FACILITY_CATALOG.teamGym).toMatchObject({
      cost: 40000, footprint: { w: 3, h: 3 },
      training: true,
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

describe('upkeep (N6, #164)', () => {
  it('every facility has a weekly upkeep of about 1% of its build cost', () => {
    for (const id of IDS) {
      const def = FACILITY_CATALOG[id];
      expect(def.upkeep, id).toBeGreaterThan(0);
      expect(def.upkeep / def.cost, id).toBeGreaterThanOrEqual(0.0099);
      expect(def.upkeep / def.cost, id).toBeLessThanOrEqual(0.0101);
    }
    expect(FACILITY_CATALOG.grandstand.upkeep).toBe(1200);
    expect(FACILITY_CATALOG.trainingPaddock.upkeep).toBe(80);
  });

  it('scales ×1.5 at L2 and ×2 at L3', () => {
    expect(UPKEEP_LEVEL_MULT).toEqual([1, 1.5, 2]);
    const g = FACILITY_CATALOG.grandstand;
    expect(facilityUpkeep(g, 1)).toBe(1200);
    expect(facilityUpkeep(g, 2)).toBe(1800);
    expect(facilityUpkeep(g, 3)).toBe(2400);
    expect(facilityUpkeep(FACILITY_CATALOG.weightsRoom, 2)).toBe(225);
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

describe('generic training buildings', () => {
  it('has no per-stat gains or adjacency effects', () => {
    for (const def of Object.values(FACILITY_CATALOG)) {
      expect(def).not.toHaveProperty('trains');
      expect(def).not.toHaveProperty('adjacency');
    }
  });
});
