// src/data/facility.ts — static facility definitions + catalog + pure helpers.
// See BAK-168 (this spec is authoritative for all numbers). Runtime placed
// instances use PlacedFacility from ../core/state. No mutable state, no Phaser.

import type { PlayerStats } from '../core/state';

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
  trains: Partial<PlayerStats>; // per-week stat gain at level 1 (pre-scaling)
  special?: FacilitySpecial; // non-training effect (magnitude read by systems)
  /** Income/gate facilities earn from one copy only, so placement blocks a second (#38). */
  unique?: boolean;
  adjacency?: { near: FacilityDefId; bonusMult: number }; // mult on this
  //                                        facility's trains when adjacent
}

export const FACILITY_CATALOG: Record<FacilityDefId, FacilityDef> = {
  trainingPaddock: {
    id: 'trainingPaddock',
    name: 'Training Paddock',
    cost: 8000,
    upkeep: 80,
    footprint: { w: 2, h: 2 },
    trains: { speed: 1.5, stamina: 1.0 },
  },
  weightsRoom: {
    id: 'weightsRoom',
    name: 'Weights Room',
    cost: 15000,
    upkeep: 150,
    footprint: { w: 2, h: 2 },
    trains: { strength: 2.0 },
    adjacency: { near: 'trainingPaddock', bonusMult: 1.25 },
  },
  videoRoom: {
    id: 'videoRoom',
    name: 'Video Room',
    cost: 18000,
    upkeep: 180,
    footprint: { w: 2, h: 2 },
    trains: { footyIQ: 2.0 },
    adjacency: { near: 'coachsOffice', bonusMult: 1.25 },
  },
  physioCentre: {
    id: 'physioCentre',
    name: 'Physio Centre',
    cost: 22000,
    upkeep: 220,
    footprint: { w: 2, h: 2 },
    trains: { stamina: 1.5 },
    special: 'injuryRecovery',
    adjacency: { near: 'medicalBay', bonusMult: 1.25 },
  },
  canteen: {
    id: 'canteen',
    name: 'Canteen',
    cost: 12000,
    upkeep: 120,
    footprint: { w: 2, h: 2 },
    trains: {},
    special: 'morale',
  },
  sponsorBoard: {
    id: 'sponsorBoard',
    name: 'Sponsor Board',
    cost: 10000,
    upkeep: 100,
    footprint: { w: 2, h: 1 },
    trains: {},
    special: 'income',
    unique: true,
  },
  grandstand: {
    id: 'grandstand',
    name: 'Grandstand',
    cost: 120000,
    upkeep: 1200,
    footprint: { w: 3, h: 3 },
    trains: {},
    special: 'gate',
    unique: true,
  },
  academy: {
    id: 'academy',
    name: 'Academy',
    cost: 60000,
    upkeep: 600,
    footprint: { w: 3, h: 3 },
    trains: { skill: 1.0, footyIQ: 1.0 },
    special: 'recruitQuality',
    adjacency: { near: 'coachsOffice', bonusMult: 1.25 },
  },
  coachsOffice: {
    id: 'coachsOffice',
    name: "Coach's Office",
    cost: 30000,
    upkeep: 300,
    footprint: { w: 2, h: 2 },
    trains: { footyIQ: 1.0, skill: 1.0 },
    special: 'morale',
  },
  scoutOffice: {
    id: 'scoutOffice',
    name: 'Scout Office',
    cost: 25000,
    upkeep: 250,
    footprint: { w: 2, h: 2 },
    trains: {},
    special: 'recruitQuality',
  },
  medicalBay: {
    id: 'medicalBay',
    name: 'Medical Bay',
    cost: 35000,
    upkeep: 350,
    footprint: { w: 2, h: 2 },
    trains: {},
    special: 'injuryRecovery',
  },
  teamGym: {
    id: 'teamGym',
    name: 'Team Gym',
    cost: 40000,
    upkeep: 400,
    footprint: { w: 3, h: 3 },
    trains: { strength: 1.5, speed: 1.0, stamina: 1.5 },
    adjacency: { near: 'weightsRoom', bonusMult: 1.2 },
  },
};

/**
 * Base special-effect magnitudes (before levelMult) that systems read.
 * See BAK-168. Units documented per key.
 */
export const SPECIAL_MAGNITUDE: Record<FacilitySpecial, number> = {
  income: 1500, // +$/week per Sponsor Board
  gate: 4000, // +$/week attendance uplift per Grandstand
  recruitQuality: 0.1, // +free-agent quality bias per Academy level (Scout Office uses 0.12; freeagency.ts)
  injuryRecovery: -0.5, // injuredWeeks decay accel per Physio/Medical
  morale: 1, // +morale/week per level of Canteen/Coach's Office (systems/morale.ts)
};

/** Level scaling multiplier applied to `trains` (and special magnitude). */
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

/** Round to 1 decimal place, avoiding negative-zero and float drift. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Effective per-week trains for a placed facility at a level. Adjacency is
 * decided by the caller (training system); when active AND the def has an
 * adjacency rule, that facility's trains are additionally multiplied by the
 * adjacency bonus. Each result rounded to 1 dp. Facilities with no trains
 * return {}.
 */
export function effectiveTrains(
  def: FacilityDef,
  level: 1 | 2 | 3,
  adjacencyActive: boolean,
): Partial<PlayerStats> {
  const lm = levelMult(level);
  const adjMult = adjacencyActive && def.adjacency ? def.adjacency.bonusMult : 1;
  const out: Partial<PlayerStats> = {};
  for (const [stat, base] of Object.entries(def.trains) as [
    keyof PlayerStats,
    number,
  ][]) {
    out[stat] = round1(base * lm * adjMult);
  }
  return out;
}
