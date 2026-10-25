// src/systems/lineup.ts — the coach's team selection (GitHub #69): nine
// starters by formation slot, an interchange bench, and how hard the bench is
// rotated (BAK-207 2b). A man out of position plays below his rating: the same
// position keeps all of it, a related one (centre and winger, the two halves,
// prop and second-row) ×0.92, anything else (a prop at halfback) ×0.8. The
// saved lineup is the coach's intent; `resolveLineup` turns it into the side
// that actually runs out on the day, filling a slot whose man is injured or has
// left the club. Pure: the lineup screen, matchday and the save migration
// call these. No Phaser, no state access, no dice.
import type { Lineup, Player, PlayerStats, Position } from '../core/state';
import { overallRating } from '../data/player';
import { BENCH, DEFAULT_ROTATION, isRotation, type Rotation } from '../match/league/bench';
import { DEFAULT_TACTICS, isAttackPreset, isDefencePreset, type TeamTactics } from '../match/league/presets';

/**
 * The nine formation slots in order. The live sim's roles (match/league/roles.ts)
 * share this order, so a sheet built in it puts each man in the slot the coach
 * picked him for.
 */
export const LINEUP_SLOTS: readonly Position[] = ['fullback', 'winger', 'winger', 'centre', 'five-eighth', 'halfback', 'hooker', 'prop', 'second-row'];

/** Two-letter position labels for tiles and badges. */
export const POSITION_SHORT: Readonly<Record<Position, string>> = {
  fullback: 'FB', winger: 'WG', centre: 'CE', 'five-eighth': 'FE', halfback: 'HB', hooker: 'HK', prop: 'PR', 'second-row': 'SR', lock: 'LK',
};

/** Positional fit (#69, tuning reference §21): the share of his rating a man keeps in a slot. */
export const FIT = {
  same: 1,
  related: 0.92,
  unrelated: 0.8,
};

/**
 * Positions near enough that a man moves between them at the small cost
 * (symmetric): the outside backs; the halves, and a ball-playing fullback at
 * five-eighth; dummy-half and halfback; the pack; a lock anywhere in the middle.
 */
const RELATED: readonly (readonly [Position, Position])[] = [
  ['fullback', 'winger'], ['fullback', 'centre'], ['winger', 'centre'],
  ['five-eighth', 'halfback'], ['five-eighth', 'fullback'],
  ['halfback', 'hooker'],
  ['prop', 'second-row'], ['prop', 'lock'], ['second-row', 'lock'], ['hooker', 'lock'],
];

/** How much of his rating a `natural` player keeps playing `slot`. */
export function positionFit(natural: Position, slot: Position): number {
  if (natural === slot) return FIT.same;
  return RELATED.some(([a, b]) => (a === natural && b === slot) || (a === slot && b === natural)) ? FIT.related : FIT.unrelated;
}

/** His rating as he plays `slot`: overall × fit, never below 1. */
export function effectiveRating(p: Pick<Player, 'stats' | 'position'>, slot: Position): number {
  return Math.max(1, Math.round(overallRating(p) * positionFit(p.position, slot)));
}

/** His stats as he plays `slot`, each scaled by his fit there, so the sim sees the lesser player he is out of position. */
export function statsAt(p: Pick<Player, 'stats' | 'position'>, slot: Position): PlayerStats {
  const f = positionFit(p.position, slot);
  if (f === 1) return { ...p.stats };
  const scale = (n: number): number => Math.max(1, Math.round(n * f));
  return { speed: scale(p.stats.speed), strength: scale(p.stats.strength), stamina: scale(p.stats.stamina), skill: scale(p.stats.skill), footyIQ: scale(p.stats.footyIQ) };
}

/** Fit to play: not injured and not banned (#324). A missing ban field is 0. */
export function isFieldable(p: { injuredWeeks: number; suspendedWeeks?: number }): boolean {
  return p.injuredWeeks <= 0 && (p.suspendedWeeks ?? 0) <= 0;
}

const isFit = (p: Player): boolean => isFieldable(p);
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const byOverall = (a: Player, b: Player): number => overallRating(b) - overallRating(a) || cmp(a.id, b.id);

/** The best man in `pool` for `slot` by effective rating (then overall, then id, so it is deterministic). */
function bestFor(pool: readonly Player[], slot: number): Player | undefined {
  const pos = LINEUP_SLOTS[slot]!;
  return [...pool].sort((a, b) => effectiveRating(b, pos) - effectiveRating(a, pos) || byOverall(a, b))[0];
}

/**
 * Today's best side: every fit man is tried in every slot, and the pairings
 * are taken best effective rating first until the nine are filled, so a
 * natural halfback gets his slot before a centre is moved there. The bench is
 * the next best fit players by overall. Old saves and the Auto pick button.
 */
export function autoPick(squad: readonly Player[], rotation: Rotation = DEFAULT_ROTATION, tactics: TeamTactics = DEFAULT_TACTICS): Lineup {
  const fit = squad.filter(isFit);
  const starters: (string | null)[] = LINEUP_SLOTS.map(() => null);
  const used = new Set<string>();
  const pairs = fit.flatMap((p) => LINEUP_SLOTS.map((pos, slot) => ({ p, slot, eff: effectiveRating(p, pos) })));
  pairs.sort((a, b) => b.eff - a.eff || byOverall(a.p, b.p) || a.slot - b.slot);
  for (const { p, slot } of pairs) {
    if (starters[slot] !== null || used.has(p.id)) continue;
    starters[slot] = p.id;
    used.add(p.id);
  }
  const bench = fit.filter((p) => !used.has(p.id)).sort(byOverall).slice(0, BENCH.size).map((p) => p.id);
  return { starters, bench, rotation, tactics: { ...tactics }, kicker: null, captain: null };
}

/** Why a slot had to be filled on the day. */
export type FillReason = 'injured' | 'suspended' | 'gone' | 'empty';

export interface Fill {
  slot: number;
  position: Position;
  /** The man who fills it. */
  player: Player;
  /** The man picked for it, when he is still at the club (injured). */
  out: string | null;
  why: FillReason;
}

/** The side that runs out: players by slot (null only when the squad is short), the bench, and the rotation. */
export interface Selection {
  starters: (Player | null)[];
  bench: Player[];
  rotation: Rotation;
  /** The coach's presets (N11): what the side plays. */
  tactics?: TeamTactics;
  /** The goal-kicker and captain he picked (N11, player ids); the sheet takes the default when null or not in the nine. */
  kicker?: string | null;
  captain?: string | null;
}

export interface Resolved extends Selection {
  /** Slots filled on the day, in slot order. */
  fills: Fill[];
  /** The saved lineup with men who have left the club replaced and the bench topped up; the same object when nothing needed cleaning. */
  lineup: Lineup;
  /** `lineup` differs from the one given: write it back. */
  changed: boolean;
}

/**
 * The side for today from the saved lineup and the squad as it stands. A
 * starter who is injured is replaced for this match only (he keeps his slot);
 * one who has left the club is replaced in the saved lineup too. A slot is
 * filled by the best man for it from the bench, then from the rest of the
 * squad. The bench is the coach's men who are fit and not now starting,
 * topped up from the rest by overall.
 */
export function resolveLineup(lineup: Lineup, squad: readonly Player[]): Resolved {
  const byId = new Map(squad.map((p) => [p.id, p] as const));
  const used = new Set<string>();
  const starters: (Player | null)[] = [];
  const empties: { slot: number; why: FillReason; out: string | null }[] = [];
  const clean: (string | null)[] = LINEUP_SLOTS.map((_, i) => lineup.starters[i] ?? null);
  LINEUP_SLOTS.forEach((_, slot) => {
    const id = clean[slot];
    const p = id ? byId.get(id) : undefined;
    if (p && !used.has(p.id) && isFit(p)) {
      starters[slot] = p;
      used.add(p.id);
      return;
    }
    starters[slot] = null;
    if (p && !used.has(p.id)) {
      // Hurt or banned: his slot is kept for him.
      empties.push({ slot, why: p.injuredWeeks > 0 ? 'injured' : 'suspended', out: p.name });
      used.add(p.id);
      return;
    }
    // Nobody picked, or a man who has left the club (or is listed twice): the slot is open.
    clean[slot] = null;
    empties.push({ slot, why: id === null ? 'empty' : 'gone', out: null });
  });
  // The coach's bench: men still at the club, listed once, never also a starter.
  let cleanBench: string[] = [];
  for (const id of lineup.bench) if (byId.has(id) && !clean.includes(id) && !cleanBench.includes(id)) cleanBench.push(id);
  const benchPool = cleanBench.map((id) => byId.get(id)!).filter((p) => isFit(p) && !used.has(p.id));
  const fills: Fill[] = [];
  for (const e of empties) {
    const free = (p: Player): boolean => isFit(p) && !used.has(p.id);
    const pick = bestFor(benchPool.filter(free), e.slot) ?? bestFor(squad.filter(free), e.slot);
    if (!pick) continue;
    used.add(pick.id);
    starters[e.slot] = pick;
    fills.push({ slot: e.slot, position: LINEUP_SLOTS[e.slot]!, player: pick, out: e.out, why: e.why });
    if (e.why === 'gone' || e.why === 'empty') {
      clean[e.slot] = pick.id;
      cleanBench = cleanBench.filter((id) => id !== pick.id);
    }
  }
  const bench: Player[] = benchPool.filter((p) => !used.has(p.id)).slice(0, BENCH.size);
  for (const p of bench) used.add(p.id);
  for (const p of squad.filter((p) => isFit(p) && !used.has(p.id)).sort(byOverall)) {
    if (bench.length >= BENCH.size) break;
    bench.push(p);
    used.add(p.id);
  }
  // A short bench is topped up in the saved lineup too (injured bench men keep their place).
  for (const p of bench) {
    if (cleanBench.length >= BENCH.size) break;
    if (!cleanBench.includes(p.id)) cleanBench.push(p.id);
  }
  const rotation = isRotation(lineup.rotation) ? lineup.rotation : DEFAULT_ROTATION;
  const tactics = validTactics(lineup.tactics);
  // The kicker and captain (N11) stay picked while they are at the club; a man who has left goes back to the default.
  const kicker = lineup.kicker && byId.has(lineup.kicker) ? lineup.kicker : null;
  const captain = lineup.captain && byId.has(lineup.captain) ? lineup.captain : null;
  const same =
    clean.every((id, i) => id === (lineup.starters[i] ?? null)) && lineup.starters.length === LINEUP_SLOTS.length && cleanBench.length === lineup.bench.length && cleanBench.every((id, i) => id === lineup.bench[i]) && rotation === lineup.rotation && tactics === lineup.tactics &&
    kicker === lineup.kicker && captain === lineup.captain;
  return {
    starters, bench, rotation, tactics, kicker, captain, fills,
    lineup: same ? lineup : { starters: clean, bench: cleanBench, rotation, tactics, kicker, captain },
    changed: !same,
  };
}

/** The lineup's presets if they are real ones, else Balanced / Slide (N11). */
export function validTactics(t: Partial<TeamTactics> | undefined): TeamTactics {
  if (t && isAttackPreset(t.attack) && isDefencePreset(t.defence)) return t as TeamTactics;
  return { ...DEFAULT_TACTICS };
}

/** The coach picks an attack or a defence preset (N11); the other half of the plan stays. */
export function setTactics(lineup: Lineup, pick: Partial<TeamTactics>): Lineup {
  const next = validTactics({ ...lineup.tactics, ...pick });
  return next.attack === lineup.tactics?.attack && next.defence === lineup.tactics?.defence ? lineup : { ...lineup, tactics: next };
}

/** The coach makes a man the goal-kicker or the captain (N11); picking the one already chosen goes back to the default. */
export function setKicker(lineup: Lineup, id: string): Lineup {
  return { ...lineup, kicker: lineup.kicker === id ? null : id };
}
export function setCaptain(lineup: Lineup, id: string): Lineup {
  return { ...lineup, captain: lineup.captain === id ? null : id };
}

/** One line for the news: who filled in where, and why. */
export function describeFills(fills: readonly Fill[]): string {
  const parts = fills.map((f) => {
    const at = f.position;
    if (f.why === 'injured' && f.out) return `${f.player.name} fills in at ${at} for the injured ${f.out}`;
    if (f.why === 'suspended' && f.out) return `${f.player.name} fills in at ${at} for ${f.out}, who is suspended`;
    return `${f.player.name} comes in at ${at}`;
  });
  return `Lineup: ${parts.join('; ')}.`;
}

/** Mean effective rating of the nine picked (0 with nobody picked). */
export function lineupAverage(lineup: Lineup, squad: readonly Player[]): number {
  const byId = new Map(squad.map((p) => [p.id, p] as const));
  const picked = LINEUP_SLOTS.flatMap((pos, i) => {
    const p = lineup.starters[i] ? byId.get(lineup.starters[i]!) : undefined;
    return p ? [effectiveRating(p, pos)] : [];
  });
  return picked.length ? Math.round(picked.reduce((a, b) => a + b, 0) / picked.length) : 0;
}

// ── The screen's taps ────────────────────────────────────────────────────────

/** A place in the lineup: a starting slot or a bench seat (0..BENCH.size−1). */
export type Spot = { kind: 'starter'; slot: number } | { kind: 'bench'; index: number };

export function sameSpot(a: Spot | null, b: Spot | null): boolean {
  if (a === null || b === null) return false;
  if (a.kind === 'starter' && b.kind === 'starter') return a.slot === b.slot;
  if (a.kind === 'bench' && b.kind === 'bench') return a.index === b.index;
  return false;
}

/** Where a player is in the lineup, or null when he is not in the thirteen. */
export function spotOf(lineup: Lineup, id: string): Spot | null {
  const slot = lineup.starters.indexOf(id);
  if (slot >= 0) return { kind: 'starter', slot };
  const index = lineup.bench.indexOf(id);
  return index >= 0 ? { kind: 'bench', index } : null;
}

/** Who is at a spot (null for an empty slot or seat). */
export function occupant(lineup: Lineup, spot: Spot): string | null {
  return spot.kind === 'starter' ? (lineup.starters[spot.slot] ?? null) : (lineup.bench[spot.index] ?? null);
}

/** The bench as BENCH.size seats, empty ones null. */
function seatsOf(lineup: Lineup): (string | null)[] {
  const seats: (string | null)[] = lineup.bench.slice(0, BENCH.size);
  while (seats.length < BENCH.size) seats.push(null);
  return seats;
}

function fromSeats(lineup: Lineup, starters: (string | null)[], seats: readonly (string | null)[]): Lineup {
  return { ...lineup, starters, bench: seats.filter((s): s is string => s !== null).slice(0, BENCH.size) };
}

/** Swap whoever is at two spots (a tap on a second slot or seat); into an empty one is a move. */
export function swapSpots(lineup: Lineup, a: Spot, b: Spot): Lineup {
  if (sameSpot(a, b)) return lineup;
  const pa = occupant(lineup, a);
  const pb = occupant(lineup, b);
  if (pa === null && pb === null) return lineup;
  const starters = LINEUP_SLOTS.map((_, i) => lineup.starters[i] ?? null);
  const seats = seatsOf(lineup);
  const set = (s: Spot, id: string | null): void => {
    if (s.kind === 'starter') starters[s.slot] = id;
    else seats[s.index] = id;
  };
  set(a, pb);
  set(b, pa);
  return fromSeats(lineup, starters, seats);
}

/**
 * Put `id` at `spot` (a tap on a player with a spot picked). A man already in
 * the thirteen swaps places with whoever is there; a newcomer from the rest of
 * the squad takes the spot, and the man he replaces goes to the bench if a
 * seat is free (a starter), else out of the thirteen.
 */
export function placeAt(lineup: Lineup, spot: Spot, id: string): Lineup {
  const from = spotOf(lineup, id);
  if (from) return swapSpots(lineup, from, spot);
  const out = occupant(lineup, spot);
  const starters = LINEUP_SLOTS.map((_, i) => lineup.starters[i] ?? null);
  const seats = seatsOf(lineup);
  if (spot.kind === 'starter') starters[spot.slot] = id;
  else seats[spot.index] = id;
  if (out !== null && spot.kind === 'starter') {
    const free = seats.indexOf(null);
    if (free >= 0) seats[free] = out;
  }
  return fromSeats(lineup, starters, seats);
}
