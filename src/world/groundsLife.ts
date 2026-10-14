// src/world/groundsLife.ts — who is doing what on the grounds (GitHub #23).
//
// Pure and Phaser-free: given the squad, the placed facilities, the week and a
// walkability grid, planLife() returns a seeded cast of players, staff and (in
// match week) fans, each with a looping itinerary of stops. Presentation only —
// nothing here reads or writes game state beyond what the caller passes in.
// Deterministic per (season, week): the same inputs give the same plan.
import { makeRng, type Rng } from '../utils/rng';
import type { FacilityDefId } from '../data/facility';
import { FACILITY_CATALOG } from '../data/facility';
import type { WalkGrid } from './path';

export type Dir = 'n' | 'e' | 's' | 'w';
export type Role = 'player' | 'coach' | 'physio' | 'groundskeeper' | 'fan';
export type Activity = 'lift' | 'drill' | 'sit' | 'treat' | 'video' | 'meet' | 'stroll' | 'rest' | 'cheer';
export type Emote = 'cloud' | 'cross' | null;

/** Hard cap on characters on screen (phone-friendly). */
export const MAX_AGENTS = 28;
export const MAX_FANS = 8;

export interface Cell {
  x: number;
  y: number;
}

export interface Stop {
  kind: Activity;
  facilityId?: string;
  /** Walkable cell to stand on (never inside a footprint). */
  cell: Cell;
  /** Facing while busy — toward the building. */
  face: Dir;
  /** Seconds spent here. */
  dwell: number;
}

export interface Mood {
  /** Multiplier on walking speed. */
  speedMul: number;
  /** Px of spring in the step. */
  bounce: number;
  slump: boolean;
  limp: boolean;
  emote: Emote;
}

/** How morale and injury show in movement. */
export function moodFor(morale: number, injured: boolean): Mood {
  if (injured) return { speedMul: 0.5, bounce: 0, slump: false, limp: true, emote: 'cross' };
  if (morale < 40) return { speedMul: 0.75, bounce: 0, slump: true, limp: false, emote: 'cloud' };
  if (morale >= 75) return { speedMul: 1.15, bounce: 2, slump: false, limp: false, emote: null };
  return { speedMul: 1, bounce: 0, slump: false, limp: false, emote: null };
}

export interface LifeAgent {
  id: string;
  role: Role;
  /** Key for the look: player id/name, or a stable staff/fan key. */
  lookKey: string;
  morale: number;
  injured: boolean;
  mood: Mood;
  /** Looping itinerary; the agent starts at stops[0]. */
  stops: Stop[];
  /** 0..1 — how far through stops[0]'s dwell the agent starts. */
  phase: number;
}

export interface LifeFacility {
  id: string;
  defId: FacilityDefId;
  x: number;
  y: number;
}

export interface LifePlayer {
  id: string;
  name: string;
  morale: number;
  injuredWeeks: number;
}

export interface LifeInput {
  season: number;
  week: number;
  grid: WalkGrid;
  facilities: readonly LifeFacility[];
  squad: readonly LifePlayer[];
  matchWeek: boolean;
  reputation?: number;
  /** Cell fans fall back to when there is no grandstand (the front gate). */
  gate?: Cell;
}

interface ActivityRule {
  activity: Activity;
  /** Only staff (and match-week fans) use it; players don't. */
  staffOnly: boolean;
  dwell: [number, number];
}

/** Facility type → what people do there (issue #23 table, plus the rest). */
export const ACTIVITY_RULES: Record<FacilityDefId, ActivityRule> = {
  weightsRoom: { activity: 'lift', staffOnly: false, dwell: [8, 14] },
  teamGym: { activity: 'lift', staffOnly: false, dwell: [8, 14] },
  trainingPaddock: { activity: 'drill', staffOnly: false, dwell: [2, 4] },
  canteen: { activity: 'sit', staffOnly: false, dwell: [10, 18] },
  physioCentre: { activity: 'treat', staffOnly: false, dwell: [12, 20] },
  videoRoom: { activity: 'video', staffOnly: false, dwell: [10, 16] },
  medicalBay: { activity: 'meet', staffOnly: true, dwell: [8, 14] }, // injured players 'treat' here
  grandstand: { activity: 'meet', staffOnly: true, dwell: [6, 10] },
  coachsOffice: { activity: 'meet', staffOnly: true, dwell: [6, 10] },
  academy: { activity: 'meet', staffOnly: true, dwell: [6, 10] },
  scoutOffice: { activity: 'meet', staffOnly: true, dwell: [6, 10] },
  sponsorBoard: { activity: 'meet', staffOnly: true, dwell: [5, 9] },
};

const TREAT_DWELL: [number, number] = [14, 22];

/** Seed for a week — same (season, week) always gives the same plan. */
export function weekSeed(season: number, week: number): number {
  return (Math.imul(season, 7919) ^ Math.imul(week, 104729) ^ 0x9e3779b9) >>> 0;
}

function stepDir(dx: number, dy: number): Dir {
  if (dx > 0) return 'e';
  if (dx < 0) return 'w';
  if (dy > 0) return 's';
  return 'n';
}

/** Cells of the largest connected walkable region — everywhere a person can actually go. */
export function reachableCells(grid: WalkGrid): Cell[] {
  const seen = new Uint8Array(grid.width * grid.height);
  let best: Cell[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (seen[y * grid.width + x] || !grid.isWalkable(x, y)) continue;
      const comp: Cell[] = [];
      const queue: Cell[] = [{ x, y }];
      seen[y * grid.width + x] = 1;
      for (let i = 0; i < queue.length; i++) {
        const c = queue[i]!;
        comp.push(c);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = c.x + dx;
          const ny = c.y + dy;
          if (!grid.isWalkable(nx, ny) || seen[ny * grid.width + nx]) continue;
          seen[ny * grid.width + nx] = 1;
          queue.push({ x: nx, y: ny });
        }
      }
      if (comp.length > best.length) best = comp;
    }
  }
  return best;
}

/**
 * Standing spots around a facility: reachable walkable cells edge-adjacent to
 * its footprint, front of the building first (they read best on screen), each
 * facing the building.
 */
export function facilitySpots(
  f: LifeFacility,
  reach: ReadonlySet<string>,
): { cell: Cell; face: Dir }[] {
  const { w, h } = FACILITY_CATALOG[f.defId].footprint;
  const out: { cell: Cell; face: Dir }[] = [];
  for (let x = f.x; x < f.x + w; x++) {
    out.push({ cell: { x, y: f.y - 1 }, face: 's' }, { cell: { x, y: f.y + h }, face: 'n' });
  }
  for (let y = f.y; y < f.y + h; y++) {
    out.push({ cell: { x: f.x - 1, y }, face: 'e' }, { cell: { x: f.x + w, y }, face: 'w' });
  }
  return out
    .filter((s) => reach.has(`${s.cell.x},${s.cell.y}`))
    .sort((a, b) => b.cell.x + b.cell.y - (a.cell.x + a.cell.y) || a.cell.y - b.cell.y || a.cell.x - b.cell.x);
}

const range = (rng: Rng, [lo, hi]: [number, number]): number => lo + rng.next() * (hi - lo);

interface Ctx {
  rng: Rng;
  reach: Cell[];
  spots: Map<string, { cell: Cell; face: Dir }[]>;
  used: Map<string, number>;
}

/** Next standing spot at a facility, rotating so people spread round the building. */
function takeSpot(ctx: Ctx, f: LifeFacility): { cell: Cell; face: Dir } | undefined {
  const spots = ctx.spots.get(f.id);
  if (!spots || spots.length === 0) return undefined;
  const n = ctx.used.get(f.id) ?? 0;
  ctx.used.set(f.id, n + 1);
  return spots[n % spots.length];
}

function facilityStops(ctx: Ctx, f: LifeFacility, kind: Activity, dwell: [number, number]): Stop[] {
  // The paddock is drills and sprints: several short stops round the ring.
  const count = kind === 'drill' ? 3 : 1;
  const stops: Stop[] = [];
  for (let i = 0; i < count; i++) {
    const s = takeSpot(ctx, f);
    if (!s) break;
    stops.push({ kind, facilityId: f.id, cell: s.cell, face: s.face, dwell: range(ctx.rng, dwell) });
  }
  return stops;
}

function stroll(ctx: Ctx): Stop {
  const c = ctx.rng.pick(ctx.reach);
  return {
    kind: 'stroll',
    cell: c,
    face: stepDir(ctx.rng.int(-1, 1) || 1, ctx.rng.int(-1, 1)),
    dwell: range(ctx.rng, [1, 3]),
  };
}

function mood(role: Role, morale: number, injured: boolean): Mood {
  return role === 'fan' ? { speedMul: 1, bounce: 2, slump: false, limp: false, emote: null } : moodFor(morale, injured);
}

/**
 * Plan the grounds' cast for a week. Count scales with squad size and facility
 * count and is capped at MAX_AGENTS. Injured players always make the cast and
 * head to the medical bay (or physio centre). Every usable facility gets a
 * regular before any gets a second.
 */
export function planLife(input: LifeInput): LifeAgent[] {
  const rng = makeRng(weekSeed(input.season, input.week));
  const reach = reachableCells(input.grid);
  if (reach.length === 0) return [];
  const reachSet = new Set(reach.map((c) => `${c.x},${c.y}`));

  const facilities = [...input.facilities].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const spots = new Map<string, { cell: Cell; face: Dir }[]>();
  for (const f of facilities) spots.set(f.id, facilitySpots(f, reachSet));
  const usable = facilities.filter((f) => (spots.get(f.id)?.length ?? 0) > 0);
  const ctx: Ctx = { rng, reach, spots, used: new Map() };

  const ofType = (...ids: FacilityDefId[]) => usable.filter((f) => ids.includes(f.defId));
  const playerFacilities = usable.filter((f) => !ACTIVITY_RULES[f.defId].staffOnly);
  // Injured players use the medical bay; the physio centre only if there is no bay.
  const bays = ofType('medicalBay');
  const medical = bays.length > 0 ? bays : ofType('physioCentre');

  // ── Headcount ──
  const hasStaffSpots = usable.length > 0;
  const staffRoles: Role[] = ['groundskeeper'];
  if (hasStaffSpots) staffRoles.push('coach');
  if (usable.length >= 3) staffRoles.push('physio');
  const fanCount = input.matchWeek ? Math.min(MAX_FANS, 4 + Math.floor((input.reputation ?? 40) / 20)) : 0;
  const playerBudget = Math.max(0, MAX_AGENTS - staffRoles.length - fanCount);
  const injured = input.squad.filter((p) => p.injuredWeeks > 0).sort((a, b) => (a.id < b.id ? -1 : 1));
  const fit = rng.shuffle(input.squad.filter((p) => p.injuredWeeks <= 0).sort((a, b) => (a.id < b.id ? -1 : 1)));
  const wanted = Math.min(input.squad.length, 2 * usable.length + 2);
  const cast = [...injured, ...fit].slice(0, Math.min(playerBudget, Math.max(wanted, injured.length)));

  const agents: LifeAgent[] = [];
  const push = (a: Omit<LifeAgent, 'phase'>) => agents.push({ ...a, phase: rng.next() });

  // ── Players ──
  let fitIdx = 0;
  for (const p of cast) {
    const key = p.id || p.name;
    const isInjured = p.injuredWeeks > 0;
    let stops: Stop[] = [];
    if (isInjured && medical.length > 0) {
      // Limp to the medical bay, then a slow wander, then back for more treatment.
      const bay = medical[agents.length % medical.length]!;
      stops = [
        ...facilityStops(ctx, bay, 'treat', TREAT_DWELL),
        stroll(ctx),
        ...facilityStops(ctx, bay, 'treat', TREAT_DWELL),
      ];
    } else if (isInjured || playerFacilities.length === 0) {
      stops = [{ ...stroll(ctx), kind: 'rest', dwell: range(rng, [8, 12]) }, stroll(ctx)];
    } else {
      // Anchor on a facility in round-robin order so every facility gets a regular.
      let prev = playerFacilities[fitIdx++ % playerFacilities.length]!;
      stops = facilityStops(ctx, prev, ACTIVITY_RULES[prev.defId].activity, ACTIVITY_RULES[prev.defId].dwell);
      for (let i = 0; i < 2; i++) {
        const options = playerFacilities.length > 1 ? playerFacilities.filter((f) => f.id !== prev.id) : playerFacilities;
        prev = rng.pick(options);
        stops.push(...facilityStops(ctx, prev, ACTIVITY_RULES[prev.defId].activity, ACTIVITY_RULES[prev.defId].dwell));
      }
    }
    if (stops.length === 0) stops = [stroll(ctx)];
    push({ id: `p-${key}`, role: 'player', lookKey: key, morale: p.morale, injured: isInjured, mood: mood('player', p.morale, isInjured), stops });
  }

  // ── Staff ──
  const meetStops = (pref: FacilityDefId[], fallback: LifeFacility[]): Stop[] => {
    const pool = ofType(...pref);
    const places = pool.length > 0 ? pool : fallback;
    const out: Stop[] = [];
    for (let i = 0; i < Math.min(3, Math.max(1, places.length)); i++) {
      const f = places[(i + rng.int(0, places.length - 1)) % places.length];
      if (f) out.push(...facilityStops(ctx, f, 'meet', ACTIVITY_RULES[f.defId].dwell));
    }
    return out;
  };
  for (const role of staffRoles) {
    let stops: Stop[];
    if (role === 'coach') stops = meetStops(['coachsOffice', 'trainingPaddock', 'videoRoom', 'academy'], usable);
    else if (role === 'physio') stops = meetStops(['medicalBay', 'physioCentre'], usable);
    else stops = [stroll(ctx), ...meetStops(['trainingPaddock', 'grandstand'], []), stroll(ctx)];
    if (stops.length === 0) stops = [stroll(ctx), stroll(ctx)];
    push({ id: `s-${role}`, role, lookKey: role, morale: 70, injured: false, mood: mood(role, 70, false), stops });
  }

  // ── Fans (match week): gather at the grandstand gate, else the front gate ──
  if (fanCount > 0) {
    const stand = ofType('grandstand')[0];
    let gather: { cell: Cell; face: Dir }[] = stand ? (spots.get(stand.id) ?? []) : [];
    if (gather.length === 0) {
      const gate = input.gate ?? { x: Math.floor(input.grid.width / 2), y: 1 };
      gather = [...reach]
        .sort((a, b) => Math.abs(a.x - gate.x) + Math.abs(a.y - gate.y) - (Math.abs(b.x - gate.x) + Math.abs(b.y - gate.y)) || a.y - b.y || a.x - b.x)
        .slice(0, 10)
        .map((cell) => ({ cell, face: 's' as Dir }));
    }
    // Cells right at the gate first; a crowd mills about them.
    const crowd = gather.slice(0, Math.max(4, Math.min(gather.length, 6)));
    for (let i = 0; i < fanCount; i++) {
      const at = (k: number) => crowd[(i + k) % crowd.length]!;
      const stops: Stop[] = [0, 1, 3].map((k) => ({
        kind: 'cheer' as Activity,
        facilityId: stand?.id,
        cell: at(k).cell,
        face: at(k).face,
        dwell: range(rng, [8, 16]),
      }));
      push({ id: `f-${i}`, role: 'fan', lookKey: `fan-${i}`, morale: 90, injured: false, mood: mood('fan', 90, false), stops });
    }
  }

  return agents.slice(0, MAX_AGENTS);
}

/** Agents that start at, and spend their time going between, facility stops. */
export function busyAgents(agents: readonly LifeAgent[]): LifeAgent[] {
  return agents.filter((a) => a.stops[0] !== undefined && a.stops[0].kind !== 'stroll' && a.stops[0].kind !== 'rest');
}
