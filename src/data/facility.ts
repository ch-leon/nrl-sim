// src/data/facility.ts — static facility definitions + catalog + pure helpers.
// See BAK-168 (this spec is authoritative for all numbers). Runtime placed
// instances use PlacedFacility from ../core/state. No mutable state, no Phaser.

export type FacilityDefId =
  | 'trainingPaddock' | 'weightsRoom' | 'videoRoom' | 'physioCentre'
  | 'canteen' | 'sponsorBoard' | 'grandstand' | 'academy'
  | 'coachsOffice' | 'scoutOffice' | 'medicalBay' | 'teamGym';

export type FacilitySpecial =
  | 'income' | 'gate' | 'recruitQuality' | 'injuryRecovery' | 'morale';

export interface FacilityDef {
  id: FacilityDefId;
  name: string;
  cost: number; // build cost at level 1
  /**
   * Weekly running cost at level 1 (N6, #164): about 1% of the build
   * cost, paid by the economy tick; UPKEEP_LEVEL_MULT scales it per level.
   */
  upkeep: number;
  footprint: { w: number; h: number };
  training?: boolean; // generic XP bonus, configured in PROGRESSION
  special?: FacilitySpecial; // non-training effect (magnitude read by systems)
  /** Income/gate facilities earn from one copy only, so placement blocks a second (#38). */
  unique?: boolean;
}

export const FACILITY_CATALOG: Record<FacilityDefId, FacilityDef> = {
  trainingPaddock: {
    id: 'trainingPaddock',
    name: 'Training Paddock',
    cost: 8000,
    upkeep: 80,
    footprint: { w: 2, h: 2 },
    training: true,
  },
  weightsRoom: {
    id: 'weightsRoom',
    name: 'Weights Room',
    cost: 15000,
    upkeep: 150,
    footprint: { w: 2, h: 2 },
    training: true,
  },
  videoRoom: {
    id: 'videoRoom',
    name: 'Video Room',
    cost: 18000,
    upkeep: 180,
    footprint: { w: 2, h: 2 },
    training: true,
  },
  physioCentre: {
    id: 'physioCentre',
    name: 'Physio Centre',
    cost: 22000,
    upkeep: 220,
    footprint: { w: 2, h: 2 },
    training: true,
    special: 'injuryRecovery',
  },
  canteen: {
    id: 'canteen',
    name: 'Canteen',
    cost: 12000,
    upkeep: 120,
    footprint: { w: 2, h: 2 },
    special: 'morale',
  },
  sponsorBoard: {
    id: 'sponsorBoard',
    name: 'Sponsor Board',
    cost: 10000,
    upkeep: 100,
    footprint: { w: 2, h: 1 },
    special: 'income',
    unique: true,
  },
  grandstand: {
    id: 'grandstand',
    name: 'Grandstand',
    cost: 120000,
    upkeep: 1200,
    footprint: { w: 3, h: 3 },
    special: 'gate',
    unique: true,
  },
  academy: {
    id: 'academy',
    name: 'Academy',
    cost: 60000,
    upkeep: 600,
    footprint: { w: 3, h: 3 },
    training: true,
    special: 'recruitQuality',
  },
  coachsOffice: {
    id: 'coachsOffice',
    name: "Coach's Office",
    cost: 30000,
    upkeep: 300,
    footprint: { w: 2, h: 2 },
    training: true,
    special: 'morale',
  },
  scoutOffice: {
    id: 'scoutOffice',
    name: 'Scout Office',
    cost: 25000,
    upkeep: 250,
    footprint: { w: 2, h: 2 },
    special: 'recruitQuality',
  },
  medicalBay: {
    id: 'medicalBay',
    name: 'Medical Bay',
    cost: 35000,
    upkeep: 350,
    footprint: { w: 2, h: 2 },
    special: 'injuryRecovery',
  },
  teamGym: {
    id: 'teamGym',
    name: 'Team Gym',
    cost: 40000,
    upkeep: 400,
    footprint: { w: 3, h: 3 },
    training: true,
  },
};

/**
 * Base special-effect magnitudes (before levelMult) that systems read.
 * See BAK-168. Units documented per key.
 */
export const SPECIAL_MAGNITUDE: Record<FacilitySpecial, number> = {
  income: 1500, // not read: the Sponsor Board's return is ECON.SPONSOR_* by reputation (economy.sponsorReturn, N12)
  gate: 4000, // +$/week attendance uplift per Grandstand
  recruitQuality: 0.1, // +free-agent quality bias per Academy level (Scout Office uses 0.12; freeagency.ts)
  injuryRecovery: -0.5, // injuredWeeks decay accel per Physio/Medical
  morale: 1, // +morale/week per level of Canteen/Coach's Office (systems/morale.ts)
};

/** Level scaling multiplier applied to the XP bonus and special magnitude. */
export const LEVEL_MULT: readonly [number, number, number] = [1, 1.6, 2.2];

export function levelMult(level: 1 | 2 | 3): number {
  return LEVEL_MULT[level - 1];
}

/** Cost to build/upgrade INTO `level`: def.cost * level. */
export function upgradeCost(def: FacilityDef, level: 1 | 2 | 3): number {
  return def.cost * level;
}

/** Upkeep multiplier by level (N6, #164): a bigger building costs more to run. */
export const UPKEEP_LEVEL_MULT: readonly [number, number, number] = [1, 1.5, 2];

/** Weekly running cost of a facility at `level`: def.upkeep × UPKEEP_LEVEL_MULT. */
export function facilityUpkeep(def: FacilityDef, level: 1 | 2 | 3): number {
  return Math.round(def.upkeep * UPKEEP_LEVEL_MULT[level - 1]);
}
