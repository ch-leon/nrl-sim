// src/match/league/contest.ts — the tackle contest (BAK-207 §3.4). When a
// defender reaches the carrier, stats decide what the contact becomes. Pure:
// odds from the two players' stats, outcome from one rng roll, so it is
// deterministic and unit-testable.

export type ContestOutcome = 'held' | 'big-hit' | 'broken' | 'fend' | 'offload';

export interface ContestStats {
  strength: number;
  speed: number;
  skill: number;
  footyIQ: number;
}

export const AVERAGE: ContestStats = { strength: 50, speed: 50, skill: 50, footyIQ: 50 };

/** The carrier's edge in the contact, 0..1 (0.5 = even). */
export function carrierEdge(atk: ContestStats, def: ContestStats): number {
  const a = atk.strength * 0.5 + atk.speed * 0.3 + atk.skill * 0.2;
  const d = def.strength * 0.6 + def.footyIQ * 0.2 + def.speed * 0.2;
  return 1 / (1 + Math.exp(-(a - d) / 22));
}

/** Probability of each outcome; `offloadOption` = a support runner is close enough to take one. */
export function contestOdds(edge: number, offloadOption: boolean): Record<ContestOutcome, number> {
  const e = Math.max(0, Math.min(1, edge));
  const broken = 0.04 + 0.16 * e;
  const fend = 0.03 + 0.09 * e;
  const offload = offloadOption ? 0.04 + 0.1 * e : 0;
  const bigHit = 0.03 + 0.14 * (1 - e);
  const held = Math.max(0, 1 - broken - fend - offload - bigHit);
  return { held, 'big-hit': bigHit, broken, fend, offload };
}

const ORDER: readonly ContestOutcome[] = ['broken', 'fend', 'offload', 'big-hit', 'held'];

/** Resolve a contact from a single roll in [0, 1). */
export function resolveContest(atk: ContestStats, def: ContestStats, roll: number, offloadOption: boolean): ContestOutcome {
  const odds = contestOdds(carrierEdge(atk, def), offloadOption);
  let acc = 0;
  for (const k of ORDER) {
    acc += odds[k];
    if (roll < acc) return k;
  }
  return 'held';
}
